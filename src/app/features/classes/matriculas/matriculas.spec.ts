import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Matriculas } from './matriculas';

const API = environment.apiUrl;
const aluno = (id: number, fullName: string) => ({ id, fullName, registrationNumber: `2026${id}`, active: true });
const MATRICULA = { id: 7, studentId: 1, studentName: 'Ana Souza', registrationNumber: '20261', status: 'ACTIVE', enrolledAt: '2026-02-01T10:00:00Z' };

@Component({ imports: [Matriculas], template: '<app-turma-matriculas [turmaId]="3" [capacidade]="2" />' })
class Hospedeiro {}

describe('Matrículas da turma', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Hospedeiro>;
  let confirmar: boolean;

  const html = () => fixture.nativeElement as HTMLElement;
  const listaAlunos = () => http.expectOne((r) => r.url === `${API}/students`);

  const criar = (matriculas: unknown[] = [MATRICULA], alunos = [aluno(1, 'Ana Souza'), aluno(2, 'Bruno Lima')]) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(confirmar) }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    http.expectOne(`${API}/classes/3/enrollments`).flush(matriculas);
    listaAlunos().flush({ content: alunos, page: 0, size: 50, totalElements: alunos.length, totalPages: 1 });
    fixture.detectChanges();
  };

  const escolher = (valor: string) => {
    const select = html().querySelector<HTMLSelectElement>('select')!;
    select.value = valor;
    select.dispatchEvent(new Event('change'));
  };
  const enviar = () => html().querySelector('form')!.dispatchEvent(new Event('submit'));
  const recarga = (): TestRequest => http.expectOne((r) => r.method === 'GET' && r.url === `${API}/classes/3/enrollments`);

  beforeEach(() => (confirmar = true));
  afterEach(() => http.verify());

  it('mostra nome, matrícula e a contagem de vagas', () => {
    criar();

    expect(html().textContent).toContain('Ana Souza');
    expect(html().textContent).toContain('20261');
    expect(html().textContent).toContain('1 de 2 vagas ocupadas');
  });

  it('busca só alunos ativos, por nome', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    http.expectOne(`${API}/classes/3/enrollments`).flush([]);
    const req = listaAlunos();

    expect(req.request.params.get('includeInactive')).toBe('false');
    expect(req.request.params.get('sort')).toBe('fullName,asc');
    req.flush({ content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 });
  });

  it('não oferece quem já está matriculado', () => {
    criar();

    const opcoes = Array.from(html().querySelectorAll('select option')).map((o) => o.textContent);
    expect(opcoes.join('|')).not.toContain('Ana Souza ·');
    expect(opcoes.join('|')).toContain('Bruno Lima');
  });

  it('turma sem matrículas mostra o estado vazio', () => {
    criar([]);

    expect(html().textContent).toContain('Nenhum aluno matriculado ainda');
    expect(html().textContent).toContain('0 de 2 vagas ocupadas');
  });

  it('matricular sem escolher o aluno não chama a API', () => {
    criar();

    enviar();

    http.expectNone((r) => r.method === 'POST');
  });

  it('matricular envia ids numéricos, recarrega a lista e limpa o formulário', () => {
    criar();
    escolher('2');

    enviar();

    const post = http.expectOne((r) => r.method === 'POST' && r.url === `${API}/enrollments`);
    expect(post.request.body).toEqual({ studentId: 2, classId: 3 });
    post.flush({ id: 8 });
    recarga().flush([MATRICULA, { ...MATRICULA, id: 8, studentId: 2, studentName: 'Bruno Lima' }]);
    fixture.detectChanges();

    expect(html().textContent).toContain('2 de 2 vagas ocupadas');
    expect(html().querySelector<HTMLSelectElement>('select')!.value).toBe('');
    expect(html().querySelectorAll('mat-error')).toHaveLength(0);
  });

  it('409 (sem vagas) recarrega a lista e libera o botão', () => {
    criar();
    escolher('2');
    enviar();

    http.expectOne((r) => r.method === 'POST').flush({ message: 'Turma sem vagas' }, { status: 409, statusText: 'Conflict' });
    recarga().flush([MATRICULA]);
    fixture.detectChanges();

    expect(html().querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
  });

  it('cancelar confirma, chama DELETE e recarrega', () => {
    criar();

    html().querySelector<HTMLButtonElement>('.remover')!.click();

    http.expectOne((r) => r.method === 'DELETE' && r.url === `${API}/enrollments/7`).flush(null);
    recarga().flush([]);
  });

  it('cancelar dispensado não chama a API', () => {
    confirmar = false;
    criar();

    html().querySelector<HTMLButtonElement>('.remover')!.click();

    http.expectNone((r) => r.method === 'DELETE');
  });

  it('falha ao carregar mostra aviso de erro', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    http.expectOne(`${API}/classes/3/enrollments`).flush({}, { status: 500, statusText: 'Erro' });
    listaAlunos().flush({ content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();

    expect(html().querySelector('[role=alert]')?.textContent).toContain('Não foi possível carregar');
  });
});
