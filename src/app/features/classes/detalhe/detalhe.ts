import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Observable, catchError, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CabecalhoPagina } from '../../../shared/cabecalho-pagina';
import { ConfirmarDialogo } from '../../../shared/confirmar-dialogo';
import { Disciplina, Professor, Turma, Vinculo, rotuloTurno } from '../class.models';
import { ClassService } from '../class.service';
import { Matriculas } from '../matriculas/matriculas';

@Component({
  selector: 'app-turma-detalhe',
  imports: [CabecalhoPagina, Matriculas, ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <app-cabecalho-pagina [titulo]="turma()?.name ?? 'Turma'" [subtitulo]="resumo()">
      <a nota class="link-tinta" routerLink="/turmas">← Voltar para turmas</a>
      <div acoes>
        @if (gestao() && turma()) {
          <a mat-stroked-button [routerLink]="['/turmas', turma()!.id, 'editar']">Editar turma</a>
        }
      </div>
    </app-cabecalho-pagina>

    <h2>Disciplinas</h2>
    @if (erroVinculos()) {
      <p class="aviso" role="alert">Não foi possível carregar as disciplinas da turma.</p>
    } @else if (vinculos(); as lista) {
      @if (!gestao()) {
        <p class="aviso" role="status">Você leciona {{ lista.length }} disciplina(s) nesta turma.</p>
      } @else if (lista.length === 0) {
        <p class="aviso" role="status">Nenhuma disciplina vinculada ainda</p>
      } @else {
        <ul class="vinculos">
          @for (v of lista; track v.id) {
            <li>
              <span class="nome">{{ nomeDisciplina(v.subjectId) }}</span>
              <span class="professor">{{ nomeProfessor(v.teacherUserId) }}</span>
              <button class="remover" type="button" (click)="desvincular(v)" [attr.aria-label]="'Desvincular ' + nomeDisciplina(v.subjectId)">
                Desvincular
              </button>
            </li>
          }
        </ul>
      }
    }

    @if (gestao()) {
      <h2>Vincular disciplina</h2>
      <form [formGroup]="form" (ngSubmit)="vincular()" novalidate>
        <mat-form-field>
          <mat-label>Disciplina</mat-label>
          <select matNativeControl formControlName="subjectId" required>
            <option value="" disabled>Escolha a disciplina</option>
            @for (d of disciplinas(); track d.id) {
              <option [value]="d.id">{{ d.name }}</option>
            }
          </select>
          <mat-error>Escolha a disciplina</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Professor</mat-label>
          <select matNativeControl formControlName="teacherUserId" required>
            <option value="" disabled>Escolha o professor</option>
            @for (p of professores(); track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>
          <mat-error>Escolha o professor</mat-error>
        </mat-form-field>
        <button mat-flat-button type="submit" [disabled]="enviando()">Vincular</button>
      </form>

      @if (turma(); as t) {
        <app-turma-matriculas [turmaId]="id" [capacidade]="t.capacity" />
      }
    }
  `,
  styles: `
    :host { display: block; }
    h2 { font-size: 26px; font-weight: 600; margin: 28px 0 12px; }
    .aviso { padding: 20px; text-align: center; background: var(--papel); }
    .vinculos { list-style: none; margin: 0; padding: 0; background: var(--papel); border-top: 2px solid var(--tinta); border-bottom: 2px solid var(--tinta); }
    .vinculos li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 24px; padding: 12px 8px; border-bottom: 1px solid var(--tinta); }
    .vinculos li:last-child { border-bottom: 0; }
    .nome { flex: 1 1 200px; font-size: 18px; font-weight: 600; }
    .professor { flex: 1 1 200px; color: var(--suave); }
    .remover { border: 0; background: transparent; color: var(--carimbo); font: inherit; font-weight: 600; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
    form { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px 20px; }
    mat-form-field { flex: 1 1 220px; max-width: 320px; }
  `,
})
export class Detalhe {
  private readonly service = inject(ClassService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);

  protected readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  protected readonly gestao = computed(() => ['ADMIN', 'SECRETARIA'].includes(this.auth.role() ?? ''));

  protected readonly turma = signal<Turma | null>(null);
  protected readonly resumo = computed(() => {
    const t = this.turma();
    return t ? `${t.gradeLevel}º ano · ${rotuloTurno(t.shift)} · ${t.schoolYear} · ${t.capacity} vagas` : 'Carregando a turma...';
  });

  protected readonly vinculos = signal<Vinculo[] | null>(null);
  protected readonly erroVinculos = signal(false);
  protected readonly enviando = signal(false);

  // só a gestão pode ler estas listas (a API devolve 403 ao professor)
  protected readonly disciplinas = toSignal(this.lerListaDaGestao<Disciplina>(() => this.service.disciplinas()), { initialValue: [] });
  protected readonly professores = toSignal(this.lerListaDaGestao<Professor>(() => this.service.professores()), { initialValue: [] });

  private readonly formDirective = viewChild(FormGroupDirective);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    subjectId: ['', Validators.required],
    teacherUserId: ['', Validators.required],
  });

  constructor() {
    // 404 (turma inexistente ou, para o professor, de outro) volta para a lista
    this.service.get(this.id).subscribe({
      next: (t) => this.turma.set(t),
      error: () => this.router.navigateByUrl('/turmas'),
    });
    this.carregarVinculos();
  }

  private lerListaDaGestao<T>(ler: () => Observable<T[]>) {
    return this.gestao() ? ler().pipe(catchError(() => of([] as T[]))) : of([] as T[]);
  }

  private carregarVinculos(): void {
    this.service.vinculos(this.id).subscribe({
      next: (v) => this.vinculos.set(v),
      error: () => this.erroVinculos.set(true),
    });
  }

  protected nomeDisciplina(id: number): string {
    return this.disciplinas().find((d) => d.id === id)?.name ?? `Disciplina ${id}`;
  }

  protected nomeProfessor(id: number): string {
    return this.professores().find((p) => p.id === id)?.name ?? `Professor ${id}`;
  }

  protected vincular(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { subjectId, teacherUserId } = this.form.getRawValue();
    this.enviando.set(true);
    // o 409 (disciplina repetida) e o 400 (professor inválido) viram aviso no erroInterceptor
    this.service.vincular(this.id, Number(subjectId), Number(teacherUserId)).subscribe({
      next: () => {
        this.enviando.set(false);
        // resetForm (e não form.reset) também limpa o estado "enviado", que deixaria os campos vermelhos
        this.formDirective()?.resetForm();
        this.aviso.open('Disciplina vinculada', 'OK', { duration: 3000 });
        this.carregarVinculos();
      },
      error: () => this.enviando.set(false),
    });
  }

  protected desvincular(v: Vinculo): void {
    this.dialogo
      .open(ConfirmarDialogo, {
        data: { titulo: 'Desvincular disciplina', mensagem: `Desvincular ${this.nomeDisciplina(v.subjectId)} desta turma?` },
      })
      .afterClosed()
      .pipe(
        switchMap((ok) => (ok ? this.service.desvincular(this.id, v.subjectId) : EMPTY)),
        catchError(() => EMPTY),
      )
      .subscribe(() => {
        this.aviso.open('Disciplina desvinculada', 'OK', { duration: 3000 });
        this.carregarVinculos();
      });
  }
}
