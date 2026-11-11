import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CabecalhoPagina } from '../../../shared/cabecalho-pagina';
import { ConfirmarDialogo } from '../../../shared/confirmar-dialogo';
import { Avaliacao, BIMESTRES } from '../grade.models';
import { GradeService } from '../grade.service';

// Avaliações de uma disciplina em uma turma. Quem cria, edita e apaga é o professor titular; a gestão só consulta.
// Os 409 (nome repetido no bimestre, nota máxima abaixo de nota lançada, avaliação com notas) viram aviso no erroInterceptor.
@Component({
  selector: 'app-avaliacoes',
  imports: [CabecalhoPagina, ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <app-cabecalho-pagina titulo="Avaliações" subtitulo="Provas e trabalhos da disciplina, por bimestre.">
      <a nota class="link-tinta" [routerLink]="['/turmas', classId]">← Voltar para a turma</a>
    </app-cabecalho-pagina>

    @if (erro()) {
      <p class="aviso" role="alert">Não foi possível carregar as avaliações.</p>
    } @else if (avaliacoes(); as lista) {
      @if (lista.length === 0) {
        <p class="aviso" role="status">Nenhuma avaliação cadastrada ainda</p>
      } @else {
        <ul class="lista">
          @for (a of lista; track a.id) {
            <li>
              <span class="bimestre mono">{{ a.term }}º bim.</span>
              <span class="nome">{{ a.name }}</span>
              <span class="detalhe mono">peso {{ a.weight }} · máx. {{ a.maxScore }}</span>
              <span class="acoes">
                <a class="link-tinta" [routerLink]="['/turmas', classId, 'disciplinas', subjectId, 'avaliacoes', a.id, 'notas']"
                   [attr.aria-label]="(professor() ? 'Lançar notas de ' : 'Ver notas de ') + a.name">
                  {{ professor() ? 'Lançar notas' : 'Ver notas' }}
                </a>
                @if (professor()) {
                  <button class="link" type="button" (click)="editar(a)" [attr.aria-label]="'Editar ' + a.name">Editar</button>
                  <button class="link remover" type="button" (click)="apagar(a)" [attr.aria-label]="'Apagar ' + a.name">Apagar</button>
                }
              </span>
            </li>
          }
        </ul>
      }
    }

    @if (professor()) {
      <h2>{{ editando() ? 'Editar avaliação' : 'Nova avaliação' }}</h2>
      <form [formGroup]="form" (ngSubmit)="salvar()" novalidate>
        <mat-form-field>
          <mat-label>Nome</mat-label>
          <input matInput formControlName="name" maxlength="80" autocomplete="off" required />
          <mat-error>Informe o nome (até 80 caracteres)</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Bimestre</mat-label>
          <select matNativeControl formControlName="term" required>
            @for (b of bimestres; track b) {
              <option [value]="b">{{ b }}º bimestre</option>
            }
          </select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Peso</mat-label>
          <input matInput type="number" formControlName="weight" min="0.01" max="999.99" step="0.01" required />
          <mat-error>Informe um peso maior que 0, com até 2 casas</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Nota máxima</mat-label>
          <input matInput type="number" formControlName="maxScore" min="0.01" max="999.99" step="0.01" required />
          <mat-error>Informe uma nota máxima maior que 0, com até 2 casas</mat-error>
        </mat-form-field>
        <div class="botoes">
          @if (editando()) {
            <button mat-button type="button" (click)="cancelarEdicao()">Cancelar edição</button>
          }
          <button mat-flat-button type="submit" [disabled]="enviando()">{{ editando() ? 'Salvar' : 'Criar avaliação' }}</button>
        </div>
      </form>
    }
  `,
  styles: `
    :host { display: block; }
    h2 { font-size: 26px; font-weight: 600; margin: 28px 0 12px; }
    .aviso { padding: 20px; text-align: center; background: var(--papel); }
    .lista { list-style: none; margin: 0; padding: 0; background: var(--papel); border-top: 2px solid var(--tinta); border-bottom: 2px solid var(--tinta); }
    .lista li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 20px; padding: 12px 8px; border-bottom: 1px solid var(--tinta); }
    .lista li:last-child { border-bottom: 0; }
    .bimestre { flex: 0 0 72px; }
    .nome { flex: 1 1 200px; font-size: 18px; font-weight: 600; }
    .detalhe { flex: 1 1 160px; color: var(--suave); }
    .acoes { display: flex; gap: 18px; }
    .link { border: 0; background: transparent; color: var(--tinta); font: inherit; font-weight: 600; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
    .remover { color: var(--carimbo); }
    form { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px 20px; }
    mat-form-field { flex: 1 1 180px; max-width: 280px; }
    .botoes { flex: 1 1 100%; display: flex; gap: 12px; }
  `,
})
export class Avaliacoes {
  private readonly service = inject(GradeService);
  private readonly auth = inject(AuthService);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);

  private readonly rota = inject(ActivatedRoute).snapshot.paramMap;
  protected readonly classId = Number(this.rota.get('id'));
  protected readonly subjectId = Number(this.rota.get('subjectId'));

  protected readonly professor = computed(() => this.auth.role() === 'PROFESSOR');
  protected readonly bimestres = BIMESTRES;

  protected readonly avaliacoes = signal<Avaliacao[] | null>(null);
  protected readonly erro = signal(false);
  protected readonly enviando = signal(false);
  protected readonly editando = signal<Avaliacao | null>(null);

  private readonly formDirective = viewChild(FormGroupDirective);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    term: [1, Validators.required],
    weight: [1, [Validators.required, Validators.min(0.01), Validators.max(999.99)]],
    maxScore: [10, [Validators.required, Validators.min(0.01), Validators.max(999.99)]],
  });

  constructor() {
    this.carregar();
  }

  private carregar(): void {
    this.service.avaliacoes(this.classId, this.subjectId).subscribe({
      next: (l) => {
        this.erro.set(false);
        this.avaliacoes.set(l);
      },
      error: () => this.erro.set(true), // 404: professor sem esta disciplina; o aviso do interceptor explica
    });
  }

  protected editar(a: Avaliacao): void {
    this.editando.set(a);
    this.form.setValue({ name: a.name, term: a.term, weight: a.weight, maxScore: a.maxScore });
  }

  protected cancelarEdicao(): void {
    this.editando.set(null);
    this.limpar();
  }

  private limpar(): void {
    this.formDirective()?.resetForm({ name: '', term: 1, weight: 1, maxScore: 10 });
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input = { name: v.name.trim(), term: Number(v.term), weight: Number(v.weight), maxScore: Number(v.maxScore) };
    const atual = this.editando();
    this.enviando.set(true);
    const chamada = atual ? this.service.editar(atual.id, input) : this.service.criar(this.classId, this.subjectId, input);
    chamada.subscribe({
      next: () => {
        this.enviando.set(false);
        this.editando.set(null);
        this.limpar();
        this.aviso.open(atual ? 'Avaliação salva' : 'Avaliação criada', 'OK', { duration: 3000 });
        this.carregar();
      },
      error: () => this.enviando.set(false),
    });
  }

  protected apagar(a: Avaliacao): void {
    this.dialogo
      .open(ConfirmarDialogo, { data: { titulo: 'Apagar avaliação', mensagem: `Apagar a avaliação "${a.name}"? Só é possível se ela não tiver notas.` } })
      .afterClosed()
      .pipe(
        switchMap((ok) => (ok ? this.service.apagar(a.id) : EMPTY)),
        catchError(() => EMPTY),
      )
      .subscribe(() => {
        this.aviso.open('Avaliação apagada', 'OK', { duration: 3000 });
        this.carregar();
      });
  }
}
