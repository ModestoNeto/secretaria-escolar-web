import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CabecalhoPagina } from '../../../shared/cabecalho-pagina';
import { LinhaChamada } from '../attendance.models';
import { AttendanceService } from '../attendance.service';

// data local, não UTC (toISOString erra o dia à noite no Brasil)
const hoje = (): string => {
  const d = new Date();
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
};

// Chamada de uma aula: o professor titular marca presente ou falta por aluno (em lote, tudo ou nada; regravar a data
// atualiza); a gestão só vê. A API recusa data futura, por isso o campo tem máximo em hoje. Só vão as linhas marcadas.
@Component({
  selector: 'app-chamada',
  imports: [CabecalhoPagina, RouterLink, MatButtonModule],
  template: `
    <app-cabecalho-pagina titulo="Chamada" subtitulo="Presença por aula. Escolha a data e marque cada aluno.">
      <a nota class="link-tinta" [routerLink]="['/turmas', classId]">← Voltar para a turma</a>
    </app-cabecalho-pagina>

    <label class="data">
      <span>Data da aula</span>
      <input type="date" [value]="data()" [max]="limite" (change)="trocarData($any($event.target))" />
    </label>

    @if (erro()) {
      <p class="aviso" role="alert">Não foi possível carregar a chamada.</p>
    } @else if (linhas(); as lista) {
      @if (lista.length === 0) {
        <p class="aviso" role="status">Nenhum aluno matriculado nesta turma</p>
      } @else {
        @if (professor()) {
          <div class="atalho">
            <button mat-stroked-button type="button" (click)="todosPresentes()">Marcar todos presentes</button>
          </div>
        }
        <form (submit)="$event.preventDefault(); salvar()" novalidate>
          <ul class="chamada">
            @for (l of lista; track l.enrollmentId) {
              <li>
                <span class="nome">{{ l.studentName }}</span>
                <span class="registro mono">{{ l.registrationNumber }}</span>
                <a class="link-tinta" [routerLink]="['/boletim', l.studentId]" [attr.aria-label]="'Boletim de ' + l.studentName">Boletim</a>
                <span class="opcoes" role="radiogroup" [attr.aria-label]="'Presença de ' + l.studentName">
                  <label>
                    <input type="radio" [name]="'p' + l.enrollmentId" [checked]="marcas()[l.enrollmentId] === true"
                           [disabled]="!professor()" (change)="marcar(l.enrollmentId, true)" />
                    Presente
                  </label>
                  <label>
                    <input type="radio" [name]="'p' + l.enrollmentId" [checked]="marcas()[l.enrollmentId] === false"
                           [disabled]="!professor()" (change)="marcar(l.enrollmentId, false)" />
                    Falta
                  </label>
                </span>
              </li>
            }
          </ul>
          @if (professor()) {
            <div class="rodape">
              <button mat-flat-button type="submit" [disabled]="enviando()">{{ enviando() ? 'Salvando...' : 'Salvar chamada' }}</button>
            </div>
          }
        </form>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .data { display: inline-flex; flex-direction: column; gap: 4px; margin-bottom: 18px; }
    .data input { padding: 6px 8px; font: inherit; border: 1px solid var(--tinta); background: var(--papel); }
    .aviso { padding: 20px; text-align: center; background: var(--papel); }
    .atalho { display: flex; justify-content: flex-end; padding-bottom: 10px; }
    .chamada { list-style: none; margin: 0; padding: 0; background: var(--papel); border-top: 2px solid var(--tinta); border-bottom: 2px solid var(--tinta); }
    .chamada li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 20px; padding: 10px 8px; border-bottom: 1px solid var(--tinta); }
    .chamada li:last-child { border-bottom: 0; }
    .nome { flex: 1 1 220px; font-size: 18px; font-weight: 600; }
    .registro { flex: 0 0 110px; color: var(--suave); }
    .opcoes { display: flex; gap: 16px; }
    .opcoes label { display: inline-flex; align-items: center; gap: 6px; }
    .rodape { display: flex; justify-content: flex-end; padding-top: 18px; }
  `,
})
export class Chamada {
  private readonly service = inject(AttendanceService);
  private readonly auth = inject(AuthService);
  private readonly aviso = inject(MatSnackBar);

  private readonly rota = inject(ActivatedRoute).snapshot.paramMap;
  protected readonly classId = Number(this.rota.get('id'));
  protected readonly subjectId = Number(this.rota.get('subjectId'));

  protected readonly limite = hoje();
  protected readonly professor = computed(() => this.auth.role() === 'PROFESSOR');
  protected readonly data = signal(hoje());
  protected readonly linhas = signal<LinhaChamada[] | null>(null);
  protected readonly marcas = signal<Record<number, boolean | null>>({});
  protected readonly erro = signal(false);
  protected readonly enviando = signal(false);

  constructor() {
    this.carregar();
  }

  protected trocarData(campo: HTMLInputElement): void {
    // campo limpo ou data futura (a API recusa): volta o campo para a data anterior, para a tela não mostrar uma data e gravar outra
    if (!campo.value || campo.value > this.limite) {
      campo.value = this.data();
      return;
    }
    this.data.set(campo.value);
    this.carregar();
  }

  protected marcar(enrollmentId: number, presente: boolean): void {
    this.marcas.update((m) => ({ ...m, [enrollmentId]: presente }));
  }

  protected todosPresentes(): void {
    const todas: Record<number, boolean | null> = {};
    (this.linhas() ?? []).forEach((l) => (todas[l.enrollmentId] = true));
    this.marcas.set(todas);
  }

  private carregar(): void {
    this.linhas.set(null);
    this.service.chamada(this.classId, this.subjectId, this.data()).subscribe({
      next: (lista) => {
        const m: Record<number, boolean | null> = {};
        lista.forEach((l) => (m[l.enrollmentId] = l.present));
        this.marcas.set(m);
        this.erro.set(false);
        this.linhas.set(lista);
      },
      error: () => this.erro.set(true),
    });
  }

  protected salvar(): void {
    const records = (this.linhas() ?? [])
      .map((l) => ({ enrollmentId: l.enrollmentId, present: this.marcas()[l.enrollmentId] }))
      .filter((r): r is { enrollmentId: number; present: boolean } => r.present !== null && r.present !== undefined);
    if (records.length === 0) {
      this.aviso.open('Marque a presença de ao menos um aluno', 'OK', { duration: 3000 });
      return;
    }
    this.enviando.set(true);
    this.service.registrar(this.classId, this.subjectId, this.data(), records).subscribe({
      next: () => {
        this.enviando.set(false);
        this.aviso.open('Chamada salva', 'OK', { duration: 3000 });
        this.carregar();
      },
      error: () => this.enviando.set(false), // 400/404/409 viram aviso no erroInterceptor
    });
  }
}
