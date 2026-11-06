import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h1>{{ id ? 'Editar aluno' : 'Novo aluno' }}</h1>
    @if (matricula(); as m) {
      <p>Matrícula {{ m }}</p>
    }
    <form [formGroup]="form" (ngSubmit)="salvar()" novalidate>
      <mat-form-field appearance="outline">
        <mat-label>Nome completo</mat-label>
        <input matInput formControlName="fullName" autocomplete="off" required />
        <mat-error>Informe o nome (até 160 caracteres)</mat-error>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Data de nascimento</mat-label>
        <input matInput type="date" formControlName="birthDate" [max]="maxima" required />
        <mat-error>Informe uma data anterior a hoje</mat-error>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Responsável</mat-label>
        <input matInput formControlName="guardianName" autocomplete="off" required />
        <mat-error>Informe o responsável (até 160 caracteres)</mat-error>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Telefone do responsável</mat-label>
        <input matInput type="tel" formControlName="guardianPhone" autocomplete="off" required />
        <mat-hint>Só números, com DDD</mat-hint>
        <mat-error>Informe 10 ou 11 dígitos, só números</mat-error>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>E-mail (opcional)</mat-label>
        <input matInput type="email" formControlName="email" autocomplete="off" />
        <mat-error>E-mail inválido</mat-error>
      </mat-form-field>
      <a mat-button routerLink="/alunos">Cancelar</a>
      <button mat-flat-button type="submit" [disabled]="enviando()">
        {{ enviando() ? 'Salvando...' : 'Salvar' }}
      </button>
    </form>
  `,
  styles: `
    :host { display: block; padding: 16px; max-width: 560px; }
    form { display: flex; flex-direction: column; gap: 4px; }
  `,
})
export class Formulario {
  private readonly service = inject(StudentService);
  private readonly router = inject(Router);
  private readonly aviso = inject(MatSnackBar);

  protected readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  protected readonly maxima = ontem();
  protected readonly enviando = signal(false);
  protected readonly matricula = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', texto],
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
          this.form.patchValue({ ...s, email: s.email ?? '' });
        },
        error: () => this.router.navigateByUrl('/alunos'),
      });
    }
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input: StudentInput = {
      fullName: v.fullName.trim(),
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
      error: () => this.enviando.set(false),
    });
  }
}
