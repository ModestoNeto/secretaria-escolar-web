import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CabecalhoPagina } from '../../../shared/cabecalho-pagina';
import { cpfValidator, mascararCpf, somenteDigitos } from '../cpf';
import { StudentInput } from '../student.models';
import { StudentService } from '../student.service';

// @Past da API recusa hoje; data local, não UTC (toISOString erra o dia à noite no Brasil)
const ontem = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
};

const texto = [Validators.required, Validators.pattern(/\S/), Validators.maxLength(160)];

@Component({
  selector: 'app-formulario',
  imports: [CabecalhoPagina, ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <app-cabecalho-pagina [titulo]="id ? 'Editar aluno' : 'Nova ficha de aluno'" [subtitulo]="subtitulo()">
      <a nota class="link-tinta" routerLink="/alunos">← Voltar para alunos</a>
    </app-cabecalho-pagina>
    <form [formGroup]="form" (ngSubmit)="salvar()" novalidate>
      <mat-form-field>
        <mat-label>Nome completo</mat-label>
        <input matInput formControlName="fullName" autocomplete="off" required />
        <mat-error>Informe o nome (até 160 caracteres)</mat-error>
      </mat-form-field>
      <mat-form-field>
        <mat-label>CPF</mat-label>
        <input matInput formControlName="cpf" inputmode="numeric" maxlength="14" autocomplete="off" required (input)="mascarar($event)" />
        <mat-hint>Só números; a máscara é automática</mat-hint>
        <mat-error>
          @if (form.controls.cpf.hasError('required')) {
            Informe o CPF
          } @else if (form.controls.cpf.hasError('cpf')) {
            CPF inválido
          } @else {
            {{ form.controls.cpf.getError('servidor') }}
          }
        </mat-error>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Data de nascimento</mat-label>
        <input matInput type="date" formControlName="birthDate" [max]="maxima" required />
        <mat-error>Informe uma data anterior a hoje</mat-error>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Responsável</mat-label>
        <input matInput formControlName="guardianName" autocomplete="off" required />
        <mat-error>Informe o responsável (até 160 caracteres)</mat-error>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Telefone do responsável</mat-label>
        <input matInput type="tel" formControlName="guardianPhone" autocomplete="off" required />
        <mat-hint>Só números, com DDD</mat-hint>
        <mat-error>Informe 10 ou 11 dígitos, só números</mat-error>
      </mat-form-field>
      <mat-form-field>
        <mat-label>E-mail (opcional)</mat-label>
        <input matInput type="email" formControlName="email" autocomplete="off" />
        <mat-error>E-mail inválido</mat-error>
      </mat-form-field>
      <div class="rodape">
        <a class="link-tinta" routerLink="/alunos">Cancelar</a>
        <button mat-flat-button type="submit" [disabled]="enviando()">
          {{ enviando() ? 'Salvando...' : 'Salvar ficha' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    :host { display: block; }
    form { display: flex; flex-direction: column; gap: 8px; max-width: 680px; }
    .rodape { display: flex; align-items: center; justify-content: flex-end; gap: 24px; padding-top: 18px; border-top: 1px solid var(--tinta); }
  `,
})
export class Formulario {
  private readonly service = inject(StudentService);
  private readonly router = inject(Router);
  private readonly aviso = inject(MatSnackBar);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  protected readonly maxima = ontem();
  protected readonly enviando = signal(false);
  protected readonly matricula = signal<string | null>(null);
  protected readonly subtitulo = computed(() =>
    !this.id ? 'O número de matrícula é gerado ao salvar.' : this.matricula() ? `Matrícula ${this.matricula()}` : 'Carregando a ficha...',
  );

  protected readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', texto],
    cpf: ['', [Validators.required, cpfValidator]],
    birthDate: ['', Validators.required],
    guardianName: ['', texto],
    guardianPhone: ['', [Validators.required, Validators.pattern(/^\d{10,11}$/)]],
    email: ['', [Validators.email, Validators.maxLength(160)]],
  });

  constructor() {
    if (this.id) {
      // 404 volta para a lista (o aviso vem do erroInterceptor)
      this.service.get(this.id).subscribe({
        next: (s) => {
          this.matricula.set(s.registrationNumber);
          // aluno antigo sem CPF abre com o campo vazio: o required obriga a informar para salvar
          this.form.patchValue({ ...s, email: s.email ?? '', cpf: s.cpf ?? '' });
        },
        error: () => this.router.navigateByUrl('/alunos'),
      });
    }
  }

  protected mascarar(evento: Event): void {
    const controle = this.form.controls.cpf;
    const mascarado = mascararCpf((evento.target as HTMLInputElement).value);
    if (mascarado !== controle.value) controle.setValue(mascarado);
  }

  private focarPrimeiroInvalido(): void {
    const controles = this.form.controls;
    const nome = (Object.keys(controles) as (keyof typeof controles)[]).find((k) => controles[k].invalid);
    this.host.nativeElement.querySelector<HTMLElement>(`[formcontrolname=${nome}]`)?.focus();
  }

  // Erros de CPF que só o servidor sabe (já cadastrado, inválido) aparecem no próprio campo.
  private mostrarErroDoCpf(e: HttpErrorResponse): void {
    const mensagem: unknown = e.error?.message;
    if (typeof mensagem !== 'string' || !/cpf/i.test(mensagem)) return;
    const cpf = this.form.controls.cpf;
    cpf.setErrors({ servidor: mensagem });
    cpf.markAsTouched();
    this.focarPrimeiroInvalido();
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focarPrimeiroInvalido();
      return;
    }
    const v = this.form.getRawValue();
    const input: StudentInput = {
      fullName: v.fullName.trim(),
      cpf: somenteDigitos(v.cpf),
      birthDate: v.birthDate,
      guardianName: v.guardianName.trim(),
      guardianPhone: v.guardianPhone,
      email: v.email.trim() || null,
    };
    this.enviando.set(true);
    (this.id ? this.service.update(this.id, input) : this.service.create(input)).subscribe({
      next: () => {
        this.aviso.open(this.id ? 'Aluno atualizado' : 'Aluno cadastrado', 'OK', { duration: 3000 });
        this.router.navigateByUrl('/alunos');
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.mostrarErroDoCpf(e);
      },
    });
  }
}
