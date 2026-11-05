import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { jwtFalso } from './jwt-falso';

const API = environment.apiUrl;

describe('AuthService', () => {
  const montar = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: '**', children: [] }])],
    });
    return { auth: TestBed.inject(AuthService), http: TestBed.inject(HttpTestingController) };
  };

  beforeEach(() => sessionStorage.clear());

  it('o login guarda os tokens e deduz o papel', () => {
    const { auth, http } = montar();
    expect(auth.autenticado()).toBe(false);

    auth.login('admin@secretaria.example', '2307').subscribe();
    const req = http.expectOne(`${API}/auth/login`);
    expect(req.request.body).toEqual({ email: 'admin@secretaria.example', password: '2307' });
    req.flush({ accessToken: jwtFalso('ADMIN', '7'), refreshToken: 'r1' });

    expect(auth.autenticado()).toBe(true);
    expect(auth.role()).toBe('ADMIN');
    expect(auth.sessao()?.userId).toBe(7);
    expect(sessionStorage.getItem('secretaria.tokens')).toContain('r1');
  });

  it('o logout zera a sessão e limpa o armazenamento', () => {
    const { auth, http } = montar();
    auth.login('a@b.c', 'x').subscribe();
    http.expectOne(`${API}/auth/login`).flush({ accessToken: jwtFalso('ADMIN'), refreshToken: 'r1' });

    auth.logout();

    expect(auth.autenticado()).toBe(false);
    expect(auth.role()).toBeNull();
    expect(sessionStorage.getItem('secretaria.tokens')).toBeNull();
  });

  it('restaura a sessão guardada ao ser criado', () => {
    sessionStorage.setItem(
      'secretaria.tokens',
      JSON.stringify({ accessToken: jwtFalso('PROFESSOR'), refreshToken: 'r1' }),
    );
    const { auth } = montar();

    expect(auth.autenticado()).toBe(true);
    expect(auth.role()).toBe('PROFESSOR');
  });

  it('ignora um armazenamento corrompido', () => {
    sessionStorage.setItem('secretaria.tokens', '{nao-e-json');
    const { auth } = montar();

    expect(auth.autenticado()).toBe(false);
  });
});
