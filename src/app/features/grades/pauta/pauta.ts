import { Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CabecalhoPagina } from '../../../shared/cabecalho-pagina';
import { Avaliacao, LinhaPauta } from '../grade.models';
import { GradeService } from '../grade.service';

// Pauta de uma avaliação: um campo de nota por aluno com matrícula ativa. O professor titular lança (em lote, tudo ou nada);
// a gestão só vê. Só vão para a API as linhas preenchidas.
@Component({
  selector: 'app-pauta',
  imports: [CabecalhoPagina, ReactiveFormsModule, RouterLink, MatButtonModule],
  template: `
    <app-cabecalho-pagina [titulo]="avaliacao()?.name ?? 'Notas'" [subtitulo]="resumo()">
      <a nota class="link-tinta" [routerLink]="['/turmas', classId, 'disciplinas', subjectId, 'avaliacoes']">← Voltar para as avaliações</a>
    </app-cabecalho-pagina>

    @if (erro()) {
      <p class="aviso" role="alert">Não foi possível carregar a pauta.</p>
    } @else if (linhas(); as lista) {
      @if (lista.length === 0) {
        <p class="aviso" role="status">Nenhum aluno matriculado nesta turma</p>
      } @else {
        <form [formGroup]="grupo" (ngSubmit)="salvar()" novalidate>
          <ul class="pauta">
            @for (l of lista; track l.enrollmentId; let i = $index) {
              <li>
                <span class="nome">{{ l.studentName }}</span>
                <span class="registro mono">{{ l.registrationNumber }}</span>
                <a class="link-tinta" [routerLink]="['/boletim', l.studentId]" [attr.aria-label]="'Boletim de ' + l.studentName">Boletim</a>
                <label class="nota">
                  <span class="visualmente-oculto">Nota de {{ l.studentName }}</span>
                  <input type="number" step="0.01" min="0" [max]="avaliacao()?.maxScore ?? 999.99" inputmode="decimal"
                         [formControl]="notas.at(i)" [attr.aria-invalid]="notas.at(i).invalid" />
                </label>
                @if (notas.at(i).invalid && notas.at(i).touched) {
                  <span class="erro" role="alert">Nota de 0 a {{ avaliacao()?.maxScore }}, com até 2 casas</span>
                }
              </li>
            }
          </ul>
          @if (professor()) {
            <div class="rodape">
              <button mat-flat-button type="submit" [disabled]="enviando()">{{ enviando() ? 'Salvando...' : 'Salvar notas' }}</button>
            </div>
          }
        </form>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .aviso { padding: 20px; text-align: center; background: var(--papel); }
    .pauta { list-style: none; margin: 0; padding: 0; background: var(--papel); border-top: 2px solid var(--tinta); border-bottom: 2px solid var(--tinta); }
    .pauta li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 20px; padding: 10px 8px; border-bottom: 1px solid var(--tinta); }
    .pauta li:last-child { border-bottom: 0; }
    .nome { flex: 1 1 220px; font-size: 18px; font-weight: 600; }
    .registro { flex: 0 0 110px; color: var(--suave); }
    .nota input { width: 96px; padding: 6px 8px; font: inherit; text-align: right; border: 1px solid var(--tinta); background: var(--papel); }
    .nota input[aria-invalid='true'] { border-color: var(--carimbo); }
    .erro { flex: 1 1 100%; color: var(--carimbo); font-size: 14px; }
    .rodape { display: flex; justify-content: flex-end; padding-top: 18px; }
    .visualmente-oculto { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  `,
})
export class Pauta {
  private readonly service = inject(GradeService);
  private readonly auth = inject(AuthService);
  private readonly aviso = inject(MatSnackBar);

  private readonly rota = inject(ActivatedRoute).snapshot.paramMap;
  protected readonly classId = Number(this.rota.get('id'));
  protected readonly subjectId = Number(this.rota.get('subjectId'));
  private readonly assessmentId = Number(this.rota.get('assessmentId'));

  protected readonly professor = computed(() => this.auth.role() === 'PROFESSOR');
  protected readonly avaliacao = signal<Avaliacao | null>(null);
  protected readonly linhas = signal<LinhaPauta[] | null>(null);
  protected readonly erro = signal(false);
  protected readonly enviando = signal(false);
  protected readonly resumo = computed(() => {
    const a = this.avaliacao();
    return a ? `${a.term}º bimestre · peso ${a.weight} · nota máxima ${a.maxScore}` : 'Carregando a avaliação...';
  });

  // um campo por linha da pauta, na mesma ordem; vazio = nota ainda não lançada
  protected readonly notas = new FormArray<FormControl<number | null>>([]);
  protected readonly grupo = new FormGroup({ notas: this.notas });

  constructor() {
    this.carregar();
  }

  private novoCampo(valor: number | null, maximo: number): FormControl<number | null> {
    const campo = new FormControl<number | null>(valor, [
      Validators.min(0),
      Validators.max(maximo),
      // no máximo 2 casas decimais (a API recusa mais que isso)
      (c) => (c.value === null || Math.abs(c.value * 100 - Math.round(c.value * 100)) < 1e-6 ? null : { casas: true }),
    ]);
    if (!this.professor()) {
      campo.disable();
    }
    return campo;
  }

  private carregar(): void {
    // a pauta não traz a nota máxima: ela vem da lista de avaliações da disciplina
    forkJoin({
      avaliacoes: this.service.avaliacoes(this.classId, this.subjectId),
      pauta: this.service.pauta(this.assessmentId),
    }).subscribe({
      next: ({ avaliacoes, pauta }) => {
        const a = avaliacoes.find((x) => x.id === this.assessmentId) ?? null;
        if (!a) {
          this.erro.set(true);
          return;
        }
        this.avaliacao.set(a);
        this.erro.set(false);
        this.notas.clear();
        pauta.forEach((l) => this.notas.push(this.novoCampo(l.score, a.maxScore)));
        this.linhas.set(pauta);
      },
      error: () => this.erro.set(true),
    });
  }

  protected salvar(): void {
    this.notas.markAllAsTouched();
    if (this.notas.invalid) {
      return;
    }
    const linhas = this.linhas() ?? [];
    const grades = linhas
      .map((l, i) => ({ enrollmentId: l.enrollmentId, score: this.notas.at(i).value }))
      .filter((g): g is { enrollmentId: number; score: number } => g.score !== null);
    if (grades.length === 0) {
      this.aviso.open('Preencha ao menos uma nota', 'OK', { duration: 3000 });
      return;
    }
    this.enviando.set(true);
    this.service.lancar(this.assessmentId, grades).subscribe({
      next: () => {
        this.enviando.set(false);
        this.aviso.open('Notas salvas', 'OK', { duration: 3000 });
        this.carregar();
      },
      error: () => this.enviando.set(false), // 400/404/409 viram aviso no erroInterceptor
    });
  }
}
