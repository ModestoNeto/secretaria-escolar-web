import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { jwtFalso } from './jwt-falso';

const API = environment.apiUrl;
const NAO_AUTORIZADO = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let auth: AuthService;

  beforeEach(() => {
    sessionStorage.setItem(
      'secretaria.tokens',
      JSON.stringify({ accessToken: jwtFalso('ADMIN'), refreshToken: 'refresh-1' }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => sessionStorage.clear());

  it('envia o Bearer para a API', () => {
    client.get(`${API}/x`).subscribe();
    const req = http.expectOne(`${API}/x`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${auth.accessToken()}`);
    req.flush({});
  });

  it('não envia o Bearer para o login nem para outras origens', () => {
    client.post(`${API}/auth/login`, {}).subscribe();
    client.get('https://outro.example/x').subscribe();
    expect(http.expectOne(`${API}/auth/login`).request.headers.has('Authorization')).toBe(false);
    expect(http.expectOne('https://outro.example/x').request.headers.has('Authorization')).toBe(false);
  });

  it('em 401 renova o token e repete a requisição', () => {
    let resposta: unknown;
    client.get(`${API}/x`).subscribe((r) => (resposta = r));
    http.expectOne(`${API}/x`).flush({}, NAO_AUTORIZADO);

    const refresh = http.expectOne(`${API}/auth/refresh`);
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-1' });
    const novoAcesso = jwtFalso('SECRETARIA');
    refresh.flush({ accessToken: novoAcesso, refreshToken: 'refresh-2' });

    const repetida = http.expectOne(`${API}/x`);
    expect(repetida.request.headers.get('Authorization')).toBe(`Bearer ${novoAcesso}`);
    repetida.flush({ ok: true });
    expect(resposta).toEqual({ ok: true });
    expect(auth.role()).toBe('SECRETARIA');
  });

  it('duas requisições com 401 ao mesmo tempo geram um único refresh', () => {
    client.get(`${API}/a`).subscribe();
    client.get(`${API}/b`).subscribe();
    http.expectOne(`${API}/a`).flush({}, NAO_AUTORIZADO);
    http.expectOne(`${API}/b`).flush({}, NAO_AUTORIZADO);

    http.expectOne(`${API}/auth/refresh`).flush({ accessToken: jwtFalso('ADMIN'), refreshToken: 'refresh-2' });

    expect(http.match(`${API}/a`)).toHaveLength(1);
    expect(http.match(`${API}/b`)).toHaveLength(1);
  });

  it('se o refresh falha, faz logout e propaga o erro', () => {
    let status = 0;
    client.get(`${API}/x`).subscribe({ error: (e) => (status = e.status) });
    http.expectOne(`${API}/x`).flush({}, NAO_AUTORIZADO);
    http.expectOne(`${API}/auth/refresh`).flush({}, NAO_AUTORIZADO);

    expect(status).toBe(401);
    expect(auth.autenticado()).toBe(false);
  });

  it('erros que não são 401 passam direto, sem refresh', () => {
    let status = 0;
    client.get(`${API}/x`).subscribe({ error: (e) => (status = e.status) });
    http.expectOne(`${API}/x`).flush({}, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
    http.expectNone(`${API}/auth/refresh`);
  });
});
