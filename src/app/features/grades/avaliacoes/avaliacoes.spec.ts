import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Role } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { Avaliacoes } from './avaliacoes';

const API = environment.apiUrl;
const URL = `${API}/classes/3/subjects/1/assessments`;
const PROVA = { id: 5, name: 'Prova 1', term: 2, weight: 2.5, maxScore: 10 };

describe('Avaliações da disciplina', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Avaliacoes>;
  let confirmar: boolean;

  const html = () => fixture.nativeElement as HTMLElement;

  const criar = (role: Role, lista: unknown[] = [PROVA]) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
        { provide: AuthService, useValue: { role: signal(role) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '3', subjectId: '1' }) } } },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(confirmar) }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Avaliacoes);
    fixture.detectChanges();
    http.expectOne(URL).flush(lista);
    fixture.detectChanges();
  };

  const preencher = (nome: string, termo = '1', peso = '1', maximo = '10') => {
    const set = (el: HTMLInputElement | HTMLSelectElement, v: string, evento: string) => {
      el.value = v;
      el.dispatchEvent(new Event(evento));
    };
    const campos = html().querySelectorAll<HTMLInputElement>('form input');
    set(campos[0], nome, 'input');
    set(html().querySelector<HTMLSelectElement>('form select')!, termo, 'change');
    set(campos[1], peso, 'input');
    set(campos[2], maximo, 'input');
  };
  const enviar = () => html().querySelector('form')!.dispatchEvent(new Event('submit'));

  beforeEach(() => (confirmar = true));
  afterEach(() => http.verify());

  it('lista bimestre, nome, peso e nota máxima', () => {
    criar('PROFESSOR');

    expect(html().textContent).toContain('2º bim.');
    expect(html().textContent).toContain('Prova 1');
    expect(html().textContent).toContain('peso 2.5');
    expect(html().textContent).toContain('máx. 10');
  });

  it('sem avaliações mostra o estado vazio', () => {
    criar('PROFESSOR', []);

    expect(html().textContent).toContain('Nenhuma avaliação cadastrada ainda');
  });

  it('a gestão só consulta: sem formulário, sem editar e sem apagar', () => {
    criar('SECRETARIA');

    expect(html().querySelector('form')).toBeNull();
    expect(html().textContent).toContain('Ver notas');
    expect(html().textContent).not.toContain('Editar');
    expect(html().textContent).not.toContain('Apagar');
  });

  it('professor tem o formulário e o link para lançar notas', () => {
    criar('PROFESSOR');

    expect(html().querySelector('form')).not.toBeNull();
    const link = html().querySelector<HTMLAnchorElement>('a[href*="/notas"]')!;
    expect(link.getAttribute('href')).toBe('/turmas/3/disciplinas/1/avaliacoes/5/notas');
    expect(link.textContent).toContain('Lançar notas');
  });

  it('criar sem nome não chama a API', () => {
    criar('PROFESSOR');

    enviar();

    http.expectNone((r) => r.method === 'POST');
  });

  it('criar envia números e recarrega a lista', () => {
    criar('PROFESSOR');
    preencher('  Trabalho  ', '3', '1.5', '8');

    enviar();

    const post = http.expectOne((r) => r.method === 'POST' && r.url === URL);
    expect(post.request.body).toEqual({ name: 'Trabalho', term: 3, weight: 1.5, maxScore: 8 });
    post.flush({ ...PROVA, id: 6 });
    http.expectOne((r) => r.method === 'GET' && r.url === URL).flush([PROVA]);
  });

  it('editar preenche o formulário e salva com PUT', () => {
    criar('PROFESSOR');

    html().querySelector<HTMLButtonElement>('button[aria-label="Editar Prova 1"]')!.click();
    fixture.detectChanges();
    expect(html().querySelector<HTMLInputElement>('form input')!.value).toBe('Prova 1');
    expect(html().textContent).toContain('Editar avaliação');
    preencher('Prova 1 revisada', '2', '2.5', '9');
    enviar();

    const put = http.expectOne((r) => r.method === 'PUT' && r.url === `${API}/assessments/5`);
    expect(put.request.body).toEqual({ name: 'Prova 1 revisada', term: 2, weight: 2.5, maxScore: 9 });
    put.flush(PROVA);
    http.expectOne((r) => r.method === 'GET' && r.url === URL).flush([PROVA]);
  });

  it('apagar confirma, chama DELETE e recarrega', () => {
    criar('PROFESSOR');

    html().querySelector<HTMLButtonElement>('button[aria-label="Apagar Prova 1"]')!.click();

    http.expectOne((r) => r.method === 'DELETE' && r.url === `${API}/assessments/5`).flush(null);
    http.expectOne((r) => r.method === 'GET' && r.url === URL).flush([]);
  });

  it('apagar dispensado não chama a API', () => {
    confirmar = false;
    criar('PROFESSOR');

    html().querySelector<HTMLButtonElement>('button[aria-label="Apagar Prova 1"]')!.click();

    http.expectNone((r) => r.method === 'DELETE');
  });

  it('falha ao carregar mostra aviso de erro', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { role: signal('PROFESSOR') } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '3', subjectId: '1' }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Avaliacoes);
    fixture.detectChanges();
    http.expectOne(URL).flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(html().querySelector('[role=alert]')?.textContent).toContain('Não foi possível carregar');
  });
});
