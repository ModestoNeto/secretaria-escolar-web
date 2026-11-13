import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CabecalhoPagina } from '../../../shared/cabecalho-pagina';
import { Student } from '../../students/student.models';
import { StudentService } from '../../students/student.service';

// Escolha do aluno para o boletim. A gestão busca por nome, matrícula ou CPF. O professor não lista alunos (a API não deixa):
// chega ao boletim pelos links da chamada e da pauta de notas, que só trazem alunos das disciplinas dele.
@Component({
  selector: 'app-boletim-busca',
  imports: [CabecalhoPagina, ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule],
  template: `
    <app-cabecalho-pagina titulo="Boletim" subtitulo="Escolha o aluno para ver as médias, a frequência e o resultado." />

    @if (gestao()) {
      <mat-form-field>
        <mat-label>Buscar aluno</mat-label>
        <input matInput type="search" [formControl]="busca" autocomplete="off" />
      </mat-form-field>
      @if (erro()) {
        <p class="aviso" role="alert">Não foi possível buscar os alunos.</p>
      } @else if (busca.value.trim().length > 0 && alunos().length === 0) {
        <p class="aviso" role="status">Nenhum aluno encontrado</p>
      } @else {
        <ul class="alunos">
          @for (a of alunos(); track a.id) {
            <li>
              <span class="nome">{{ a.fullName }}</span>
              <span class="registro mono">{{ a.registrationNumber }}</span>
              <a class="link-tinta" [routerLink]="['/boletim', a.id]" [attr.aria-label]="'Boletim de ' + a.fullName">Boletim</a>
            </li>
          }
        </ul>
      }
    } @else {
      <p class="aviso" role="status">
        Abra o boletim pelo link "Boletim" ao lado de cada aluno, na chamada ou nas notas das suas disciplinas.
      </p>
    }
  `,
  styles: `
    :host { display: block; }
    mat-form-field { width: 100%; max-width: 420px; }
    .aviso { padding: 20px; text-align: center; background: var(--papel); }
    .alunos { list-style: none; margin: 0; padding: 0; background: var(--papel); border-top: 2px solid var(--tinta); border-bottom: 2px solid var(--tinta); }
    .alunos:empty { display: none; }
    .alunos li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 20px; padding: 10px 8px; border-bottom: 1px solid var(--tinta); }
    .alunos li:last-child { border-bottom: 0; }
    .nome { flex: 1 1 220px; font-size: 18px; font-weight: 600; }
    .registro { flex: 0 0 110px; color: var(--suave); }
  `,
})
export class BoletimBusca {
  private readonly students = inject(StudentService);
  private readonly auth = inject(AuthService);

  protected readonly gestao = computed(() => this.auth.role() !== 'PROFESSOR');
  protected readonly busca = new FormControl('', { nonNullable: true });
  protected readonly erro = signal(false);

  // até 10 resultados: o boletim é aberto de um aluno por vez, a busca refina
  protected readonly alunos = toSignal(
    this.busca.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) =>
        q.trim().length === 0
          ? of<Student[]>([])
          : this.students.list({ q: q.trim(), page: 0, size: 10, sort: 'fullName', direction: 'asc', includeInactive: false }).pipe(
              switchMap((p) => {
                this.erro.set(false);
                return of(p.content);
              }),
              catchError(() => {
                this.erro.set(true);
                return of<Student[]>([]);
              }),
            ),
      ),
    ),
    { initialValue: [] as Student[] },
  );
}
