import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Role } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { Pauta } from './pauta';

const API = environment.apiUrl;
const PROVA = { id: 5, name: 'Prova 1', term: 2, weight: 2.5, maxScore: 10 };
const linha = (enrollmentId: number, studentName: string, score: number | null) => ({
  enrollmentId,
  studentId: enrollmentId + 100,
  studentName,
  registrationNumber: `2026${enrollmentId}`,
  score,
});
const PAUTA = [linha(1, 'Ana Souza', 7.5), linha(2, 'Bruno Lima', null)];

describe('Pauta de notas', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Pauta>;

  const html = () => fixture.nativeElement as HTMLElement;
  const campos = () => Array.from(html().querySelectorAll<HTMLInputElement>('input[type=number]'));

  const criar = (role: Role, pauta: unknown[] = PAUTA) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
        { provide: AuthService, useValue: { role: signal(role) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '3', subjectId: '1', assessmentId: '5' }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Pauta);
    fixture.detectChanges();
    http.expectOne(`${API}/classes/3/subjects/1/assessments`).flush([PROVA]);
    http.expectOne(`${API}/assessments/5/grades`).flush(pauta);
    fixture.detectChanges();
  };

  const digitar = (i: number, valor: string) => {
    campos()[i].value = valor;
    campos()[i].dispatchEvent(new Event('input'));
  };
  const enviar = () => html().querySelector('form')!.dispatchEvent(new Event('submit'));

  afterEach(() => http.verify());

  it('mostra aluno, matrícula e a nota já lançada; a nota vazia fica em branco', () => {
    criar('PROFESSOR');

    expect(html().textContent).toContain('Ana Souza');
    expect(html().textContent).toContain('20261');
    expect(html().textContent).toContain('2º bimestre · peso 2.5 · nota máxima 10');
    expect(campos().map((c) => c.value)).toEqual(['7.5', '']);
  });

  it('salvar envia só as linhas preenchidas, com números, e recarrega a pauta', () => {
    criar('PROFESSOR');
    digitar(1, '9.25');

    enviar();

    const put = http.expectOne((r) => r.method === 'PUT' && r.url === `${API}/assessments/5/grades`);
    expect(put.request.body).toEqual({ grades: [{ enrollmentId: 1, score: 7.5 }, { enrollmentId: 2, score: 9.25 }] });
    put.flush(PAUTA);
    http.expectOne(`${API}/classes/3/subjects/1/assessments`).flush([PROVA]);
    http.expectOne(`${API}/assessments/5/grades`).flush(PAUTA);
  });

  it('linha em branco não vai para a API', () => {
    criar('PROFESSOR');

    enviar();

    const put = http.expectOne((r) => r.method === 'PUT');
    expect(put.request.body.grades).toHaveLength(1);
    put.flush(PAUTA);
    http.expectOne(`${API}/classes/3/subjects/1/assessments`).flush([PROVA]);
    http.expectOne(`${API}/assessments/5/grades`).flush(PAUTA);
  });

  it('nota acima do máximo, negativa ou com 3 casas é recusada sem chamar a API', () => {
    criar('PROFESSOR');

    for (const ruim of ['10.5', '-1', '5.123']) {
      digitar(1, ruim);
      enviar();
      fixture.detectChanges();
      http.expectNone((r) => r.method === 'PUT');
      expect(html().textContent).toContain('Nota de 0 a 10');
    }
  });

  it('pauta vazia não mostra o botão de salvar e avisa', () => {
    criar('PROFESSOR', []);

    expect(html().textContent).toContain('Nenhum aluno matriculado nesta turma');
    expect(html().querySelector('button[type=submit]')).toBeNull();
  });

  it('a gestão só vê: campos desabilitados e sem botão de salvar', () => {
    criar('SECRETARIA');

    expect(campos().every((c) => c.disabled)).toBe(true);
    expect(html().querySelector('button[type=submit]')).toBeNull();
  });

  it('avaliação que não está na lista da disciplina mostra erro', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { role: signal('PROFESSOR') } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '3', subjectId: '1', assessmentId: '99' }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Pauta);
    fixture.detectChanges();
    http.expectOne(`${API}/classes/3/subjects/1/assessments`).flush([PROVA]);
    http.expectOne(`${API}/assessments/99/grades`).flush([]);
    fixture.detectChanges();

    expect(html().querySelector('[role=alert]')?.textContent).toContain('Não foi possível carregar a pauta');
  });
});
