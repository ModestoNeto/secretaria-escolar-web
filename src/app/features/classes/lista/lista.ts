import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CabecalhoPagina } from '../../../shared/cabecalho-pagina';
import { rotuloTurno } from '../class.models';
import { ClassService } from '../class.service';

@Component({
  selector: 'app-turmas-lista',
  imports: [CabecalhoPagina, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, MatTableModule, RouterLink],
  template: `
    <app-cabecalho-pagina
      titulo="Turmas"
      [subtitulo]="gestao() ? 'Séries, turnos, vagas e as disciplinas de cada turma.' : 'As turmas em que você leciona.'"
    >
      <div acoes>
        @if (gestao()) {
          <a mat-flat-button routerLink="/turmas/nova">Nova turma</a>
        }
      </div>
    </app-cabecalho-pagina>

    <div class="barra">
      <mat-form-field class="ano">
        <mat-label>Ano letivo</mat-label>
        <select matNativeControl (change)="mudarAno($any($event.target).value)">
          @for (a of anos; track a) {
            <option [value]="a" [selected]="a === ano()">{{ a }}</option>
          }
          <option value="" [selected]="ano() === null">Todos os anos</option>
        </select>
      </mat-form-field>
      @if (turmas(); as t) {
        <span class="total mono" role="status">{{ t.length }} {{ t.length === 1 ? 'turma' : 'turmas' }}</span>
      }
    </div>

    @if (carregando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Carregando turmas" />
    }

    @if (erro()) {
      <div class="aviso" role="alert">
        <p>Não foi possível carregar as turmas.</p>
        <button mat-stroked-button type="button" (click)="tentarDeNovo()">Tentar de novo</button>
      </div>
    } @else if (turmas(); as t) {
      @if (t.length === 0) {
        <p class="aviso" role="status">Nenhuma turma encontrada</p>
      } @else {
        <div class="tabela">
          <table mat-table [dataSource]="t">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Turma</th>
              <td mat-cell *matCellDef="let c" class="nome">{{ c.name }}</td>
            </ng-container>
            <ng-container matColumnDef="gradeLevel">
              <th mat-header-cell *matHeaderCellDef>Série</th>
              <td mat-cell *matCellDef="let c" class="mono">{{ c.gradeLevel }}º ano</td>
            </ng-container>
            <ng-container matColumnDef="shift">
              <th mat-header-cell *matHeaderCellDef>Turno</th>
              <td mat-cell *matCellDef="let c">{{ turno(c.shift) }}</td>
            </ng-container>
            <ng-container matColumnDef="schoolYear">
              <th mat-header-cell *matHeaderCellDef>Ano</th>
              <td mat-cell *matCellDef="let c" class="mono">{{ c.schoolYear }}</td>
            </ng-container>
            <ng-container matColumnDef="capacity">
              <th mat-header-cell *matHeaderCellDef>Vagas</th>
              <td mat-cell *matCellDef="let c" class="mono">{{ c.capacity }}</td>
            </ng-container>
            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef>Ações</th>
              <td mat-cell *matCellDef="let c" class="acoes">
                <a class="link-tinta" [routerLink]="['/turmas', c.id]" [attr.aria-label]="'Abrir turma ' + c.name">Abrir</a>
                @if (gestao()) {
                  <a class="link-tinta" [routerLink]="['/turmas', c.id, 'editar']" [attr.aria-label]="'Editar turma ' + c.name">Editar</a>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="colunas"></tr>
            <tr mat-row *matRowDef="let row; columns: colunas"></tr>
          </table>
        </div>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .barra { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 32px; margin-bottom: 20px; }
    .ano { width: 200px; }
    .total { color: var(--suave); }
    .tabela { overflow-x: auto; background: var(--papel); border-top: 2px solid var(--tinta); border-bottom: 2px solid var(--tinta); }
    table { width: 100%; min-width: 560px; }
    .nome { font-size: 18px; font-weight: 600; }
    .acoes { white-space: nowrap; }
    .acoes a + a { margin-left: 14px; }
    .aviso { padding: 24px; text-align: center; background: var(--papel); }
  `,
})
export class Lista {
  private readonly service = inject(ClassService);
  private readonly auth = inject(AuthService);
  protected readonly gestao = computed(() => ['ADMIN', 'SECRETARIA'].includes(this.auth.role() ?? ''));

  protected readonly colunas = ['name', 'gradeLevel', 'shift', 'schoolYear', 'capacity', 'acoes'];
  private readonly anoAtual = new Date().getFullYear();
  protected readonly anos = [this.anoAtual - 1, this.anoAtual, this.anoAtual + 1];
  protected readonly turno = rotuloTurno;

  protected readonly ano = signal<number | null>(this.anoAtual);
  private readonly recarregar = signal(0);
  protected readonly carregando = signal(false);
  protected readonly erro = signal(false);

  // o switchMap cancela a requisição anterior: resposta velha nunca sobrescreve a nova
  protected readonly turmas = toSignal(
    toObservable(computed(() => ({ ano: this.ano(), recarregar: this.recarregar() }))).pipe(
      tap(() => {
        this.carregando.set(true);
        this.erro.set(false);
      }),
      switchMap(({ ano }) =>
        this.service.list(ano).pipe(
          catchError(() => {
            this.erro.set(true);
            return of(null);
          }),
        ),
      ),
      tap(() => this.carregando.set(false)),
    ),
    { initialValue: null },
  );

  protected mudarAno(valor: string): void {
    this.ano.set(valor ? Number(valor) : null);
  }

  protected tentarDeNovo(): void {
    this.recarregar.update((n) => n + 1);
  }
}
