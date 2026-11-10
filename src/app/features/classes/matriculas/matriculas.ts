import { Component, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY, catchError, debounceTime, distinctUntilChanged, map, merge, of, switchMap } from 'rxjs';
import { ConfirmarDialogo } from '../../../shared/confirmar-dialogo';
import { Student } from '../../students/student.models';
import { StudentService } from '../../students/student.service';
import { Matricula } from '../class.models';
import { ClassService } from '../class.service';

// Matrículas da turma (só a gestão vê). Os erros 409 (sem vagas, aluno já matriculado no ano) viram aviso no erroInterceptor.
@Component({
  selector: 'app-turma-matriculas',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2>Alunos matriculados</h2>
    @if (erro()) {
      <p class="aviso" role="alert">Não foi possível carregar os alunos da turma.</p>
    } @else if (matriculas(); as lista) {
      <p class="vagas" role="status">{{ lista.length }} de {{ capacidade() }} vagas ocupadas</p>
      @if (lista.length === 0) {
        <p class="aviso" role="status">Nenhum aluno matriculado ainda</p>
      } @else {
        <ul class="matriculas">
          @for (m of lista; track m.id) {
            <li>
              <span class="nome">{{ m.studentName }}</span>
              <span class="registro">{{ m.registrationNumber }}</span>
              <button class="remover" type="button" (click)="cancelar(m)" [attr.aria-label]="'Cancelar matrícula de ' + m.studentName">
                Cancelar matrícula
              </button>
            </li>
          }
        </ul>
      }
    }

    <h2>Matricular aluno</h2>
    <form [formGroup]="form" (ngSubmit)="matricular()" novalidate>
      <mat-form-field>
        <mat-label>Buscar aluno</mat-label>
        <input matInput type="search" formControlName="busca" autocomplete="off" />
      </mat-form-field>
      <mat-form-field>
        <mat-label>Aluno</mat-label>
        <select matNativeControl formControlName="studentId" required>
          <option value="" disabled>Escolha o aluno</option>
          @for (a of disponiveis(); track a.id) {
            <option [value]="a.id">{{ a.fullName }} · {{ a.registrationNumber }}</option>
          }
        </select>
        <mat-error>Escolha o aluno</mat-error>
      </mat-form-field>
      <button mat-flat-button type="submit" [disabled]="enviando()">Matricular</button>
    </form>
  `,
  styles: `
    :host { display: block; }
    h2 { font-size: 26px; font-weight: 600; margin: 28px 0 12px; }
    .aviso { padding: 20px; text-align: center; background: var(--papel); }
    .vagas { margin: 0 0 8px; color: var(--suave); }
    .matriculas { list-style: none; margin: 0; padding: 0; background: var(--papel); border-top: 2px solid var(--tinta); border-bottom: 2px solid var(--tinta); }
    .matriculas li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 24px; padding: 12px 8px; border-bottom: 1px solid var(--tinta); }
    .matriculas li:last-child { border-bottom: 0; }
    .nome { flex: 1 1 200px; font-size: 18px; font-weight: 600; }
    .registro { flex: 1 1 120px; color: var(--suave); }
    .remover { border: 0; background: transparent; color: var(--carimbo); font: inherit; font-weight: 600; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
    form { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px 20px; }
    mat-form-field { flex: 1 1 220px; max-width: 320px; }
  `,
})
export class Matriculas implements OnInit {
  readonly turmaId = input.required<number>();
  readonly capacidade = input<number | null>(null);

  private readonly service = inject(ClassService);
  private readonly students = inject(StudentService);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);

  protected readonly matriculas = signal<Matricula[] | null>(null);
  protected readonly erro = signal(false);
  protected readonly enviando = signal(false);

  // shortcut: o seletor mostra só os 50 primeiros alunos ativos da busca; quem não aparece se acha digitando o nome
  private readonly alunos = signal<Student[]>([]);
  protected readonly disponiveis = computed(() => {
    const ja = new Set((this.matriculas() ?? []).map((m) => m.studentId));
    return this.alunos().filter((a) => !ja.has(a.id));
  });

  private readonly formDirective = viewChild(FormGroupDirective);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    busca: [''],
    studentId: ['', Validators.required],
  });

  constructor() {
    merge(of(''), this.form.controls.busca.valueChanges.pipe(debounceTime(300)))
      .pipe(
        map((q) => q.trim()),
        distinctUntilChanged(),
        switchMap((q) =>
          this.students.list({ q, page: 0, size: 50, sort: 'fullName', direction: 'asc', includeInactive: false }).pipe(
            map((p) => p.content),
            catchError(() => of([] as Student[])),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((lista) => this.alunos.set(lista));
  }

  ngOnInit(): void {
    this.carregar(); // os inputs só existem a partir daqui
  }

  private carregar(): void {
    this.service.matriculas(this.turmaId()).subscribe({
      next: (m) => {
        this.erro.set(false);
        this.matriculas.set(m);
      },
      error: () => this.erro.set(true),
    });
  }

  protected matricular(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.service.matricular(this.turmaId(), Number(this.form.getRawValue().studentId)).subscribe({
      next: () => {
        this.enviando.set(false);
        this.formDirective()?.resetForm();
        this.aviso.open('Aluno matriculado', 'OK', { duration: 3000 });
        this.carregar();
      },
      error: () => {
        this.enviando.set(false);
        this.carregar(); // o 409 pode vir de lista desatualizada (outra pessoa matriculou antes)
      },
    });
  }

  protected cancelar(m: Matricula): void {
    this.dialogo
      .open(ConfirmarDialogo, {
        data: { titulo: 'Cancelar matrícula', mensagem: `Cancelar a matrícula de ${m.studentName} nesta turma?` },
      })
      .afterClosed()
      .pipe(
        switchMap((ok) => (ok ? this.service.cancelarMatricula(m.id) : EMPTY)),
        catchError(() => EMPTY),
      )
      .subscribe(() => {
        this.aviso.open('Matrícula cancelada', 'OK', { duration: 3000 });
        this.carregar();
      });
  }
}
