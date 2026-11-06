import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { EMPTY, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { ConfirmarDialogo } from '../../../shared/confirmar-dialogo';
import { SortField, Student } from '../student.models';
import { StudentService } from '../student.service';

@Component({
  selector: 'app-lista',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    MatSortModule,
    MatTableModule,
    RouterLink,
  ],
  templateUrl: './lista.html',
  styleUrl: './lista.scss',
})
export class Lista {
  private readonly service = inject(StudentService);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);

  protected readonly colunas = ['registrationNumber', 'fullName', 'birthDate', 'guardianName', 'situacao', 'acoes'];
  protected readonly busca = new FormControl('', { nonNullable: true });

  private readonly q = signal('');
  protected readonly page = signal(0);
  protected readonly size = signal(20);
  protected readonly sort = signal<SortField>('fullName');
  protected readonly direction = signal<'asc' | 'desc'>('asc');
  protected readonly includeInactive = signal(false);
  private readonly recarregar = signal(0);

  protected readonly carregando = signal(false);
  protected readonly erro = signal(false);

  private readonly consulta = computed(() => ({
    q: this.q(),
    page: this.page(),
    size: this.size(),
    sort: this.sort(),
    direction: this.direction(),
    includeInactive: this.includeInactive(),
    recarregar: this.recarregar(),
  }));

  // o switchMap cancela a requisição anterior: resposta velha nunca sobrescreve a nova
  protected readonly pagina = toSignal(
    toObservable(this.consulta).pipe(
      tap(() => {
        this.carregando.set(true);
        this.erro.set(false);
      }),
      switchMap(({ recarregar: _, ...c }) =>
        this.service.list(c).pipe(
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

  constructor() {
    this.busca.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((v) => {
        this.q.set(v.trim());
        this.page.set(0);
      });
  }

  protected ordenar(e: Sort): void {
    if (e.direction) {
      this.sort.set(e.active as SortField);
      this.direction.set(e.direction);
    } else {
      this.sort.set('fullName');
      this.direction.set('asc');
    }
    this.page.set(0);
  }

  protected paginar(e: PageEvent): void {
    this.page.set(e.pageIndex);
    this.size.set(e.pageSize);
  }

  protected alternarInativos(valor: boolean): void {
    this.includeInactive.set(valor);
    this.page.set(0);
  }

  protected tentarDeNovo(): void {
    this.recarregar.update((n) => n + 1);
  }

  protected desativar(aluno: Student): void {
    this.dialogo
      .open(ConfirmarDialogo, {
        data: { titulo: 'Desativar aluno', mensagem: `Desativar ${aluno.fullName}?` },
      })
      .afterClosed()
      .pipe(
        switchMap((ok) => (ok ? this.service.deactivate(aluno.id) : EMPTY)),
        // o erro HTTP já vira aviso no erroInterceptor
        catchError(() => EMPTY),
      )
      .subscribe(() => this.depoisDeDesativar());
  }

  private depoisDeDesativar(): void {
    this.aviso.open('Aluno desativado', 'OK', { duration: 3000 });
    // desativar o último item da página volta uma página, senão a tela fica vazia
    if (this.page() > 0 && this.pagina()?.content.length === 1 && !this.includeInactive()) {
      this.page.update((p) => p - 1);
    } else {
      this.tentarDeNovo();
    }
  }
}
