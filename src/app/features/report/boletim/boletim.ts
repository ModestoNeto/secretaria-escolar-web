import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CabecalhoPagina } from '../../../shared/cabecalho-pagina';
import { Boletim as BoletimModelo, ROTULO_RESULTADO, Resultado } from '../report.models';
import { ReportService } from '../report.service';

// Boletim de um aluno em um ano letivo (a matrícula ativa do ano). A API dá 404 ao aluno sem matrícula ativa no ano e ao
// professor que não é titular da turma dele; o erroInterceptor mostra o aviso e a tela fica com a mensagem fixa.
@Component({
  selector: 'app-boletim',
  imports: [CabecalhoPagina, DecimalPipe, ReactiveFormsModule, RouterLink, MatButtonModule],
  template: `
    <app-cabecalho-pagina [titulo]="boletim()?.studentName ?? 'Boletim'" [subtitulo]="resumo()">
      <a nota class="link-tinta" routerLink="/boletim">← Outro aluno</a>
      <div acoes>
        <form class="ano" (submit)="$event.preventDefault(); buscar()">
          <label>
            <span>Ano letivo</span>
            <input type="number" min="2000" max="2100" [formControl]="ano" />
          </label>
          <button mat-stroked-button type="submit">Ver</button>
        </form>
      </div>
    </app-cabecalho-pagina>

    @if (erro()) {
      <p class="aviso" role="alert">Boletim indisponível: aluno sem matrícula ativa neste ano, ou sem acesso a ele.</p>
    } @else if (boletim(); as b) {
      <p class="geral">
        Resultado geral:
        <span class="carimbo" [class.reprovado]="b.result === 'FAILED'" [class.inativo]="semDestaque(b.result)">{{ rotulo(b.result) }}</span>
      </p>
      @if (b.subjects.length === 0) {
        <p class="aviso" role="status">A turma ainda não tem disciplinas vinculadas</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th scope="col">Disciplina</th>
              @for (t of bimestres; track t) {
                <th scope="col" class="num">{{ t }}º bim.</th>
              }
              <th scope="col" class="num">Média</th>
              <th scope="col" class="num">Frequência</th>
              <th scope="col">Resultado</th>
            </tr>
          </thead>
          <tbody>
            @for (d of b.subjects; track d.subjectId) {
              <tr>
                <th scope="row">{{ d.subjectName }}</th>
                @for (t of bimestres; track t) {
                  <td class="num mono">{{ media(d, t) }}</td>
                }
                <td class="num mono">{{ d.average === null ? '—' : (d.average | number: '1.2-2') }}</td>
                <td class="num mono">
                  {{ d.attendance | number: '1.1-1' }}%
                  <span class="aulas">({{ d.presences }}/{{ d.lessons }})</span>
                </td>
                <td>
                  <span class="carimbo" [class.reprovado]="d.result === 'FAILED'" [class.inativo]="semDestaque(d.result)">{{ rotulo(d.result) }}</span>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <p class="regra">Aprovado: média 6,0 ou mais e frequência de 75% ou mais. Frequência abaixo de 75% reprova.</p>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .ano { display: flex; align-items: flex-end; gap: 10px; }
    .ano label { display: flex; flex-direction: column; gap: 2px; }
    .ano input { width: 96px; padding: 6px 8px; font: inherit; border: 1px solid var(--tinta); background: var(--papel); }
    .aviso { padding: 20px; text-align: center; background: var(--papel); }
    .geral { font-size: 20px; margin: 0 0 18px; }
    table { width: 100%; border-collapse: collapse; background: var(--papel); border-top: 2px solid var(--tinta); border-bottom: 2px solid var(--tinta); }
    th, td { padding: 10px 8px; border-bottom: 1px solid var(--tinta); text-align: left; }
    thead th { font-size: 14px; color: var(--suave); }
    tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
    tbody th { font-size: 18px; font-weight: 600; }
    .num { text-align: right; }
    .aulas { color: var(--suave); font-size: 13px; }
    .carimbo.reprovado { border-color: var(--carimbo); color: var(--carimbo); }
    .regra { margin: 14px 0 0; color: var(--suave); font-size: 14px; }
  `,
})
export class Boletim {
  private readonly service = inject(ReportService);
  private readonly studentId = Number(inject(ActivatedRoute).snapshot.paramMap.get('studentId'));

  protected readonly bimestres = [1, 2, 3, 4];
  protected readonly ano = new FormControl<number | null>(null);
  protected readonly boletim = signal<BoletimModelo | null>(null);
  protected readonly erro = signal(false);
  protected readonly resumo = signal('Carregando o boletim...');

  constructor() {
    this.buscar();
  }

  protected rotulo(r: Resultado): string {
    return ROTULO_RESULTADO[r];
  }

  // só reprovação ganha o carimbo vermelho; aprovado fica verde; recuperação e em andamento ficam tracejados
  protected semDestaque(r: Resultado): boolean {
    return r === 'RECOVERY' || r === 'IN_PROGRESS';
  }

  protected media(d: BoletimModelo['subjects'][number], bimestre: number): string {
    const m = d.terms.find((t) => t.term === bimestre)?.average;
    return m === undefined ? '—' : m.toFixed(2);
  }

  protected buscar(): void {
    this.service.boletim(this.studentId, this.ano.value).subscribe({
      next: (b) => {
        this.boletim.set(b);
        this.erro.set(false);
        this.ano.setValue(b.schoolYear, { emitEvent: false });
        this.resumo.set(`Matrícula ${b.registrationNumber} · turma ${b.className} · ${b.schoolYear}`);
      },
      error: () => {
        this.boletim.set(null);
        this.erro.set(true);
        this.resumo.set('');
      },
    });
  }
}
