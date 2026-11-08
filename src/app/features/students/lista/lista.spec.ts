import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Page } from '../../../shared/page';
import { Student } from '../student.models';
import { Lista } from './lista';

const URL = `${environment.apiUrl}/students`;

const aluno = (id: number, extra: Partial<Student> = {}): Student => ({
  id,
  registrationNumber: `2026${String(id).padStart(6, '0')}`,
  fullName: `Aluno ${id}`,
  birthDate: '2010-01-01',
  guardianName: 'Responsável',
  guardianPhone: '11999998888',
  email: null,
  active: true,
  cpf: '111.444.777-35',
  ...extra,
});

const pagina = (content: Student[], total = content.length, page = 0): Page<Student> => ({
  content,
  page,
  size: 20,
  totalElements: total,
  totalPages: Math.ceil(total / 20),
});

describe('Lista de alunos', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Lista>;
  let confirmar: boolean;

  const html = () => fixture.nativeElement as HTMLElement;
  const pendentes = () => http.match((r) => r.url === URL);
  const proxima = (): TestRequest => {
    fixture.detectChanges();
    return http.expectOne((r) => r.url === URL);
  };
  const responder = (req: TestRequest, corpo: Page<Student>) => {
    req.flush(corpo);
    fixture.detectChanges();
  };

  const criar = () => {
    fixture = TestBed.createComponent(Lista);
    return proxima();
  };

  beforeEach(() => {
    confirmar = true;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(confirmar) }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('pede a primeira página ordenada por nome e mostra as linhas', () => {
    const req = criar();
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('sort')).toBe('fullName,asc');
    expect(req.request.params.get('includeInactive')).toBe('false');

    responder(req, pagina([aluno(1), aluno(2)]));

    expect(html().querySelectorAll('tr.mat-mdc-row')).toHaveLength(2);
    expect(html().textContent).toContain('01/01/2010');
    expect(html().textContent).toContain('Aluno 1');
  });

  it('mostra o CPF como a API devolve (com máscara) e um traço no aluno antigo sem CPF', () => {
    responder(criar(), pagina([aluno(1), aluno(2, { cpf: null })]));

    const celulas = [...html().querySelectorAll('tr.mat-mdc-row')].map((l) => l.textContent);
    expect(celulas[0]).toContain('111.444.777-35');
    expect(celulas[1]).toContain('—');
    expect(html().textContent).toContain('CPF');
  });

  it('buscar por CPF envia o texto digitado em q, com ou sem máscara', () => {
    vi.useFakeTimers();
    responder(criar(), pagina([aluno(1)]));
    const input = html().querySelector<HTMLInputElement>('input[type=search]')!;

    input.value = '111.444';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    const req = proxima();

    expect(req.request.params.get('q')).toBe('111.444');
    expect(req.request.params.get('page')).toBe('0');
    req.flush(pagina([]));
  });

  it('lista vazia mostra o estado vazio', () => {
    responder(criar(), pagina([]));

    expect(html().textContent).toContain('Nenhum aluno encontrado');
  });

  it('erro mostra o estado de falha e tentar de novo repete a consulta', () => {
    criar().flush('x', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(html().textContent).toContain('Não foi possível carregar');

    html().querySelector<HTMLButtonElement>('.falha button')!.click();
    responder(proxima(), pagina([aluno(1)]));

    expect(html().textContent).not.toContain('Não foi possível carregar');
    expect(html().textContent).toContain('Aluno 1');
  });

  it('digitar várias letras gera uma só requisição após 300 ms, na página 0', () => {
    vi.useFakeTimers();
    responder(criar(), pagina([aluno(1)]));
    const input = html().querySelector<HTMLInputElement>('input[type=search]')!;

    for (const texto of ['j', 'jo', 'jos']) {
      input.value = texto;
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(100);
    }
    fixture.detectChanges();
    expect(pendentes()).toHaveLength(0);

    vi.advanceTimersByTime(300);
    const req = proxima();
    expect(req.request.params.get('q')).toBe('jos');
    expect(req.request.params.get('page')).toBe('0');
    req.flush(pagina([]));
  });

  it('ordenar pelo cabeçalho inverte a direção', () => {
    responder(criar(), pagina([aluno(1)]));

    html().querySelectorAll<HTMLElement>('.mat-sort-header')[1].click(); // Nome
    const req = proxima();

    expect(req.request.params.get('sort')).toBe('fullName,desc');
    responder(req, pagina([aluno(1)]));
  });

  it('próxima página pede page=1', () => {
    responder(criar(), pagina([aluno(1)], 45));

    html().querySelector<HTMLElement>('.mat-mdc-paginator-navigation-next')!.click();
    const req = proxima();

    expect(req.request.params.get('page')).toBe('1');
    responder(req, pagina([aluno(21)], 45, 1));
  });

  it('o toggle de inativos pede includeInactive=true', () => {
    responder(criar(), pagina([aluno(1)]));

    html().querySelector<HTMLElement>('mat-slide-toggle button')!.click();
    const req = proxima();

    expect(req.request.params.get('includeInactive')).toBe('true');
    responder(req, pagina([aluno(1), aluno(2, { active: false })]));
    expect(html().textContent).toContain('Inativo');
  });

  it('desativar: cancelar não chama a API', () => {
    confirmar = false;
    responder(criar(), pagina([aluno(1)]));

    html().querySelector<HTMLElement>('td button')!.click();
    fixture.detectChanges();

    http.expectNone(`${URL}/1`);
    expect(pendentes()).toHaveLength(0);
  });

  it('desativar: confirmar chama DELETE e recarrega a lista', () => {
    responder(criar(), pagina([aluno(1), aluno(2)]));

    html().querySelector<HTMLElement>('td button')!.click();
    const del = http.expectOne(`${URL}/1`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });

    responder(proxima(), pagina([aluno(2)]));
    expect(html().textContent).not.toContain('Aluno 1');
  });

  it('desativar o único item de uma página que não é a primeira recua uma página', () => {
    responder(criar(), pagina([aluno(1)], 21));
    html().querySelector<HTMLElement>('.mat-mdc-paginator-navigation-next')!.click();
    responder(proxima(), pagina([aluno(21)], 21, 1));

    html().querySelector<HTMLElement>('td button')!.click();
    http.expectOne(`${URL}/21`).flush(null, { status: 204, statusText: 'No Content' });

    const req = proxima();
    expect(req.request.params.get('page')).toBe('0');
    responder(req, pagina([aluno(1)], 20));
  });
});
