import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { Role } from '../../../core/auth/auth.models';
import { Turma } from '../class.models';
import { Lista } from './lista';

const URL = `${environment.apiUrl}/classes`;
const turma = (id: number): Turma => ({ id, name: `Turma ${id}`, gradeLevel: 5, shift: 'MORNING', schoolYear: 2026, capacity: 30 });

describe('Lista de turmas', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Lista>;

  const html = () => fixture.nativeElement as HTMLElement;
  const proxima = (): TestRequest => {
    fixture.detectChanges();
    return http.expectOne((r) => r.url === URL);
  };
  const criar = (role: Role) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
        { provide: AuthService, useValue: { role: signal(role) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Lista);
    return proxima();
  };

  afterEach(() => http.verify());

  it('pede as turmas do ano atual e mostra as linhas com turno em português', () => {
    const req = criar('ADMIN');
    expect(req.request.params.get('schoolYear')).toBe(String(new Date().getFullYear()));

    req.flush([turma(1), turma(2)]);
    fixture.detectChanges();

    expect(html().querySelectorAll('tr.mat-mdc-row')).toHaveLength(2);
    expect(html().textContent).toContain('Manhã');
    expect(html().textContent).toContain('5º ano');
  });

  it('"Todos os anos" consulta sem o filtro de ano', () => {
    criar('ADMIN').flush([turma(1)]);
    fixture.detectChanges();

    const select = html().querySelector<HTMLSelectElement>('select')!;
    select.value = '';
    select.dispatchEvent(new Event('change'));
    const req = proxima();

    expect(req.request.params.has('schoolYear')).toBe(false);
    req.flush([]);
  });

  it('gestão vê "Nova turma" e "Editar"; professor não', () => {
    criar('SECRETARIA').flush([turma(1)]);
    fixture.detectChanges();
    expect(html().textContent).toContain('Nova turma');
    expect(html().textContent).toContain('Editar');
  });

  it('professor não vê as ações de gestão', () => {
    criar('PROFESSOR').flush([turma(1)]);
    fixture.detectChanges();
    expect(html().textContent).not.toContain('Nova turma');
    expect(html().textContent).not.toContain('Editar');
    expect(html().textContent).toContain('Abrir');
  });

  it('lista vazia mostra o estado vazio', () => {
    criar('ADMIN').flush([]);
    fixture.detectChanges();
    expect(html().textContent).toContain('Nenhuma turma encontrada');
  });

  it('erro mostra a falha e tentar de novo repete a consulta', () => {
    criar('ADMIN').flush('x', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(html().textContent).toContain('Não foi possível carregar');

    html().querySelector<HTMLButtonElement>('.aviso button')!.click();
    proxima().flush([turma(1)]);
    fixture.detectChanges();

    expect(html().textContent).toContain('Turma 1');
  });
});
