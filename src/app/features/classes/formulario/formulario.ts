import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CabecalhoPagina } from '../../../shared/cabecalho-pagina';
import { TURNOS, TurmaInput } from '../class.models';
import { ClassService } from '../class.service';

@Component({
  selector: 'app-turma-formulario',
  imports: [CabecalhoPagina, ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <app-cabecalho-pagina [titulo]="id ? 'Editar turma' : 'Nova turma'" [subtitulo]="subtitulo()">
      <a nota class="link-tinta" routerLink="/turmas">← Voltar para turmas</a>
    </app-cabecalho-pagina>
    <form [formGroup]="form" (ngSubmit)="salvar()" novalidate>
      <mat-form-field>
        <mat-label>Nome da turma</mat-label>
        <input matInput formControlName="name" autocomplete="off" maxlength="60" required />
        <mat-hint>Único dentro do ano letivo</mat-hint>
        <mat-error>Informe o nome (até 60 caracteres)</mat-error>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Série (1 a 12)</mat-label>
        <input matInput type="number" formControlName="gradeLevel" min="1" max="12" required />
        <mat-error>Informe um número de 1 a 12</mat-error>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Turno</mat-label>
        <select matNativeControl formControlName="shift" required>
          @for (t of turnos; track t.valor) {
            <option [value]="t.valor">{{ t.rotulo }}</option>
          }
        </select>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Ano letivo</mat-label>
        <input matInput type="number" formControlName="schoolYear" min="2000" max="2100" required />
        <mat-error>Informe um ano entre 2000 e 2100</mat-error>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Vagas (1 a 60)</mat-label>
        <input matInput type="number" formControlName="capacity" min="1" max="60" required />
        <mat-error>Informe de 1 a 60 vagas</mat-error>
      </mat-form-field>
      <div class="rodape">
        <a class="link-tinta" routerLink="/turmas">Cancelar</a>
        <button mat-flat-button type="submit" [disabled]="enviando()">
          {{ enviando() ? 'Salvando...' : 'Salvar turma' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    :host { display: block; }
    form { display: flex; flex-direction: column; gap: 8px; max-width: 480px; }
    .rodape { display: flex; align-items: center; justify-content: flex-end; gap: 24px; padding-top: 18px; border-top: 1px solid var(--tinta); }
  `,
})
export class Formulario {
  private readonly service = inject(ClassService);
  private readonly router = inject(Router);
  private readonly aviso = inject(MatSnackBar);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  protected readonly turnos = TURNOS;
  protected readonly enviando = signal(false);
  private readonly carregada = signal(false);
  protected readonly subtitulo = computed(() =>
    this.id && !this.carregada() ? 'Carregando a turma...' : 'Os dados da turma no ano letivo.',
  );

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(60)]],
    gradeLevel: [5, [Validators.required, Validators.min(1), Validators.max(12)]],
    shift: ['MORNING' as TurmaInput['shift'], Validators.required],
    schoolYear: [new Date().getFullYear(), [Validators.required, Validators.min(2000), Validators.max(2100)]],
    capacity: [30, [Validators.required, Validators.min(1), Validators.max(60)]],
  });

  constructor() {
    if (this.id) {
      // 404 volta para a lista (o aviso vem do erroInterceptor)
      this.service.get(this.id).subscribe({
        next: ({ id: _, ...turma }) => {
          this.form.patchValue(turma);
          this.carregada.set(true);
        },
        error: () => this.router.navigateByUrl('/turmas'),
      });
    }
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const controles = this.form.controls;
      const nome = (Object.keys(controles) as (keyof typeof controles)[]).find((k) => controles[k].invalid);
      this.host.nativeElement.querySelector<HTMLElement>(`[formcontrolname=${nome}]`)?.focus();
      return;
    }
    const v = this.form.getRawValue();
    const input: TurmaInput = { ...v, name: v.name.trim() };
    this.enviando.set(true);
    (this.id ? this.service.update(this.id, input) : this.service.create(input)).subscribe({
      next: () => {
        this.aviso.open(this.id ? 'Turma atualizada' : 'Turma criada', 'OK', { duration: 3000 });
        this.router.navigateByUrl('/turmas');
      },
      // o 409 (nome repetido no ano) já vira aviso no erroInterceptor
      error: () => this.enviando.set(false),
    });
  }
}
