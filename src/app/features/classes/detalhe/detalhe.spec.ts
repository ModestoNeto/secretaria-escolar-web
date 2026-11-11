import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Role } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { Matriculas } from '../matriculas/matriculas';
import { Detalhe } from './detalhe';

@Component({ selector: 'app-turma-matriculas', template: '' })
class MatriculasFalso {
  readonly turmaId = input.required<number>();
  readonly capacidade = input<number | null>(null);
}

const API = environment.apiUrl;
const TURMA = { id: 3, name: '5º A', gradeLevel: 5, shift: 'MORNING', schoolYear: 2026, capacity: 30 };
const VINCULO = { id: 10, classId: 3, subjectId: 1, subjectName: 'Matemática', teacherUserId: 20 };

describe('Detalhe da turma', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Detalhe>;
  let confirmar: boolean;

  const html = () => fixture.nativeElement as HTMLElement;

  const criar = (role: Role) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
        { provide: AuthService, useValue: { role: signal(role) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '3' }) } } },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(confirmar) }) } },
      ],
    });
    // as matrículas têm spec próprio; aqui só se confere que a gestão (e só ela) as vê
    TestBed.overrideComponent(Detalhe, { remove: { imports: [Matriculas] }, add: { imports: [MatriculasFalso] } });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Detalhe);
    fixture.detectChanges();
  };

  const responderGestao = () => {
    http.expectOne(`${API}/classes/3`).flush(TURMA);
    http.expectOne(`${API}/classes/3/subjects`).flush([VINCULO]);
    http.expectOne(`${API}/subjects`).flush([{ id: 1, name: 'Matemática' }, { id: 2, name: 'Ciências' }]);
    http.expectOne((r) => r.url === `${API}/users`).flush([{ id: 20, name: 'Prof. Ana', email: 'a@x' }]);
    fixture.detectChanges();
  };

  beforeEach(() => (confirmar = true));
  afterEach(() => http.verify());

  it('gestão vê a turma e os vínculos com nomes de disciplina e professor', () => {
    criar('SECRETARIA');
    responderGestao();

    expect(html().textContent).toContain('5º A');
    expect(html().textContent).toContain('Matemática');
    expect(html().textContent).toContain('Prof. Ana');
  });

  it('pede só professores: users?role=PROFESSOR', () => {
    criar('ADMIN');
    http.expectOne(`${API}/classes/3`).flush(TURMA);
    http.expectOne(`${API}/classes/3/subjects`).flush([]);
    http.expectOne(`${API}/subjects`).flush([]);
    const req = http.expectOne((r) => r.url === `${API}/users`);
    expect(req.request.params.get('role')).toBe('PROFESSOR');
    req.flush([]);
  });

  it('professor não consulta disciplinas nem usuários e vê só a contagem', () => {
    criar('PROFESSOR');
    http.expectOne(`${API}/classes/3`).flush(TURMA);
    http.expectOne(`${API}/classes/3/subjects`).flush([VINCULO]);
    http.expectNone(`${API}/subjects`);
    http.expectNone((r) => r.url === `${API}/users`);
    fixture.detectChanges();

    expect(html().textContent).toContain('Você leciona 1 disciplina(s)');
    // o nome vem no vínculo, já que o professor não lê /subjects
    expect(html().querySelector('.nome')?.textContent).toBe('Matemática');
    expect(html().textContent).not.toContain('Vincular disciplina');
    expect(html().querySelector('app-turma-matriculas')).toBeNull();
    // o professor chega às avaliações da disciplina dele, sem ver nome de professor nem botão de desvincular
    expect(html().querySelector('a[href="/turmas/3/disciplinas/1/avaliacoes"]')).not.toBeNull();
    expect(html().querySelector('.professor')).toBeNull();
    expect(html().querySelector('.remover')).toBeNull();
  });

  it('gestão vê as matrículas da turma', () => {
    criar('SECRETARIA');
    responderGestao();

    expect(html().querySelector('app-turma-matriculas')).not.toBeNull();
  });

  it('vincular sem escolher não chama a API', () => {
    criar('ADMIN');
    responderGestao();

    html().querySelector('form')!.dispatchEvent(new Event('submit'));

    http.expectNone(`${API}/classes/3/subjects`);
  });

  it('vincular envia ids numéricos e recarrega os vínculos', () => {
    criar('ADMIN');
    responderGestao();
    const selects = html().querySelectorAll<HTMLSelectElement>('select');
    selects[0].value = '2';
    selects[0].dispatchEvent(new Event('change'));
    selects[1].value = '20';
    selects[1].dispatchEvent(new Event('change'));

    html().querySelector('form')!.dispatchEvent(new Event('submit'));

    const post = http.expectOne((r) => r.method === 'POST');
    expect(post.request.body).toEqual({ subjectId: 2, teacherUserId: 20 });
    post.flush({ ...VINCULO, id: 11, subjectId: 2 });
    http.expectOne((r) => r.method === 'GET' && r.url === `${API}/classes/3/subjects`).flush([VINCULO]);
    fixture.detectChanges();

    // depois de vincular, o formulário volta limpo e sem erros vermelhos
    expect(selects[0].value).toBe('');
    expect(html().querySelectorAll('mat-error')).toHaveLength(0);
  });

  it('desvincular confirma, chama DELETE e recarrega', () => {
    criar('ADMIN');
    responderGestao();

    html().querySelector<HTMLButtonElement>('.remover')!.click();

    http.expectOne((r) => r.method === 'DELETE' && r.url === `${API}/classes/3/subjects/1`).flush(null);
    http.expectOne((r) => r.method === 'GET' && r.url === `${API}/classes/3/subjects`).flush([]);
  });

  it('desvincular cancelado não chama a API', () => {
    confirmar = false;
    criar('ADMIN');
    responderGestao();

    html().querySelector<HTMLButtonElement>('.remover')!.click();

    http.expectNone((r) => r.method === 'DELETE');
  });

  it('turma inexistente (404) volta para a lista', () => {
    const navegar = vi.fn();
    criar('ADMIN');
    TestBed.inject(Router).navigateByUrl = navegar;
    http.expectOne(`${API}/classes/3`).flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });
    http.expectOne(`${API}/classes/3/subjects`).flush([]);
    http.expectOne(`${API}/subjects`).flush([]);
    http.expectOne((r) => r.url === `${API}/users`).flush([]);

    expect(navegar).toHaveBeenCalledWith('/turmas');
  });
});
