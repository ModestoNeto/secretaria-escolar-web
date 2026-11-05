import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Role, Sessao, Tokens } from './auth.models';

const CHAVE = 'secretaria.tokens';

/** Só lê as claims para montar a interface; quem valida o token é a API. */
function decodificar(token: string): Sessao | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(payload));
    return { userId: Number(claims.sub), role: claims.role as Role };
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private renovacao?: Observable<Tokens>;

  private readonly tokens = signal<Tokens | null>(this.ler());

  readonly accessToken = computed(() => this.tokens()?.accessToken ?? null);
  readonly refreshToken = computed(() => this.tokens()?.refreshToken ?? null);
  readonly sessao = computed(() => {
    const t = this.tokens();
    return t ? decodificar(t.accessToken) : null;
  });
  readonly autenticado = computed(() => this.tokens() !== null);
  readonly role = computed(() => this.sessao()?.role ?? null);

  login(email: string, password: string): Observable<Tokens> {
    return this.http
      .post<Tokens>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((t) => this.guardar(t)));
  }

  /** Várias requisições com 401 ao mesmo tempo compartilham um único refresh. */
  renovar(): Observable<Tokens> {
    this.renovacao ??= this.http
      .post<Tokens>(`${environment.apiUrl}/auth/refresh`, { refreshToken: this.refreshToken() })
      .pipe(
        tap((t) => this.guardar(t)),
        finalize(() => (this.renovacao = undefined)),
        shareReplay(1),
      );
    return this.renovacao;
  }

  logout(): void {
    this.guardar(null);
    this.router.navigate(['/entrar']);
  }

  private guardar(t: Tokens | null): void {
    this.tokens.set(t);
    try {
      if (t) sessionStorage.setItem(CHAVE, JSON.stringify(t));
      else sessionStorage.removeItem(CHAVE);
    } catch {
      /* armazenamento indisponível: a sessão vale só em memória */
    }
  }

  private ler(): Tokens | null {
    try {
      const bruto = sessionStorage.getItem(CHAVE);
      return bruto ? (JSON.parse(bruto) as Tokens) : null;
    } catch {
      return null;
    }
  }
}
