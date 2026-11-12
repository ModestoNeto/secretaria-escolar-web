import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Role } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { Chamada } from './chamada';

const API = environment.apiUrl;
const linha = (enrollmentId: number, studentName: string, present: boolean | null) => ({
  enrollmentId,
  studentId: enrollmentId + 100,
  studentName,
  registrationNumber: `2026${enrollmentId}`,
  present,
});
const FOLHA = [linha(1, 'Ana Souza', true), linha(2, 'Bruno Lima', null)];

const local = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
const HOJE = local(new Date());
const URL_HOJE = `${API}/classes/3/subjects/1/attendance/${HOJE}`;

describe('Chamada', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Chamada>;

  const html = () => fixture.nativeElement as HTMLElement;
  const radios = () => Array.from(html().querySelectorAll<HTMLInputElement>('input[type=radio]'));
  const enviar = () => html().querySelector('form')!.dispatchEvent(new Event('submit'));

  const configurar = (role: Role) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
        { provide: AuthService, useValue: { role: signal(role) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '3', subjectId: '1' }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Chamada);
    fixture.detectChanges();
  };

  const criar = (role: Role, folha: unknown[] = FOLHA) => {
    configurar(role);
    http.expectOne(URL_HOJE).flush(folha);
    fixture.detectChanges();
  };

  afterEach(() => http.verify());

  it('abre na data de hoje, com aluno, matrícula e a presença já registrada; quem não foi chamado fica sem marca', () => {
    criar('PROFESSOR');

    expect(html().textContent).toContain('Ana Souza');
    expect(html().textContent).toContain('20261');
    expect(html().querySelector<HTMLInputElement>('input[type=date]')!.value).toBe(HOJE);
    // Ana: presente marcado; Bruno: nenhum
    expect(radios().map((r) => r.checked)).toEqual([true, false, false, false]);
  });

  it('salvar envia só os alunos marcados e recarrega a chamada', () => {
    criar('PROFESSOR');
    radios()[3].click(); // Bruno: falta
    radios()[1].click(); // Ana: falta

    enviar();

    const put = http.expectOne((r) => r.method === 'PUT' && r.url === URL_HOJE);
    expect(put.request.body).toEqual({
      records: [{ enrollmentId: 1, present: false }, { enrollmentId: 2, present: false }],
    });
    put.flush(FOLHA);
    http.expectOne(URL_HOJE).flush(FOLHA);
  });

  it('aluno sem marca não vai para a API', () => {
    criar('PROFESSOR');

    enviar();

    const put = http.expectOne((r) => r.method === 'PUT');
    expect(put.request.body.records).toEqual([{ enrollmentId: 1, present: true }]);
    put.flush(FOLHA);
    http.expectOne(URL_HOJE).flush(FOLHA);
  });

  it('sem nenhuma marca não chama a API', () => {
    criar('PROFESSOR', [linha(1, 'Ana Souza', null)]);

    enviar();

    http.expectNone((r) => r.method === 'PUT');
  });

  it('marcar todos presentes preenche a lista inteira', () => {
    criar('PROFESSOR');

    html().querySelector<HTMLButtonElement>('.atalho button')!.click();
    fixture.detectChanges();

    expect(radios().map((r) => r.checked)).toEqual([true, false, true, false]);
  });

  it('trocar a data busca a chamada daquele dia', () => {
    criar('PROFESSOR');
    const campo = html().querySelector<HTMLInputElement>('input[type=date]')!;

    campo.value = '2026-03-10';
    campo.dispatchEvent(new Event('change'));

    http.expectOne(`${API}/classes/3/subjects/1/attendance/2026-03-10`).flush([]);
  });

  it('data futura é ignorada e não chama a API', () => {
    criar('PROFESSOR');
    const campo = html().querySelector<HTMLInputElement>('input[type=date]')!;

    campo.value = '2999-01-01';
    campo.dispatchEvent(new Event('change'));

    http.expectNone((r) => r.url.includes('2999'));
    expect(campo.value).toBe(HOJE);
  });

  it('turma sem alunos avisa e não mostra o botão de salvar', () => {
    criar('PROFESSOR', []);

    expect(html().textContent).toContain('Nenhum aluno matriculado nesta turma');
    expect(html().querySelector('button[type=submit]')).toBeNull();
  });

  it('a gestão só vê: opções desabilitadas e sem botão de salvar', () => {
    criar('SECRETARIA');

    expect(radios().every((r) => r.disabled)).toBe(true);
    expect(html().querySelector('button[type=submit]')).toBeNull();
  });

  it('erro ao carregar mostra aviso', () => {
    configurar('PROFESSOR');
    http.expectOne(URL_HOJE).flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(html().querySelector('[role=alert]')?.textContent).toContain('Não foi possível carregar a chamada');
  });
});
