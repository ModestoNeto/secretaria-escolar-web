import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Boletim as BoletimModelo } from '../report.models';
import { Boletim } from './boletim';

const URL = `${environment.apiUrl}/students/7/report-card`;

const BOLETIM: BoletimModelo = {
  enrollmentId: 1,
  studentId: 7,
  studentName: 'Ana Souza',
  registrationNumber: '2026000007',
  classId: 3,
  className: '6º A',
  schoolYear: 2026,
  result: 'FAILED',
  subjects: [
    {
      subjectId: 1,
      subjectName: 'Matemática',
      terms: [{ term: 1, average: 5 }, { term: 3, average: 9 }],
      average: 6.33,
      lessons: 4,
      presences: 4,
      attendance: 100,
      result: 'APPROVED',
    },
    {
      subjectId: 2,
      subjectName: 'História',
      terms: [],
      average: null,
      lessons: 10,
      presences: 5,
      attendance: 50,
      result: 'FAILED',
    },
  ],
};

describe('Boletim', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Boletim>;

  const html = () => fixture.nativeElement as HTMLElement;
  const linhas = () =>
    Array.from(html().querySelectorAll('tbody tr')).map((tr) =>
      Array.from(tr.children).map((c) => c.textContent!.replace(/\s+/g, ' ').trim()).join(' | '),
    );

  const criar = () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ studentId: '7' }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Boletim);
    fixture.detectChanges();
  };

  afterEach(() => http.verify());

  it('abre sem ano (a API usa o atual) e mostra aluno, turma, ano e resultado geral', () => {
    criar();
    const req = http.expectOne(URL);
    expect(req.request.params.has('schoolYear')).toBe(false);
    req.flush(BOLETIM);
    fixture.detectChanges();

    expect(html().querySelector('h1')!.textContent).toContain('Ana Souza');
    expect(html().textContent).toContain('2026000007 · turma 6º A · 2026');
    expect(html().querySelector('.geral')!.textContent).toContain('Reprovado');
    expect(html().querySelector<HTMLInputElement>('.ano input')!.value).toBe('2026');
  });

  it('mostra a média por bimestre só onde há nota, a média final, a frequência e o resultado por disciplina', () => {
    criar();
    http.expectOne(URL).flush(BOLETIM);
    fixture.detectChanges();

    const [mat, hist] = linhas();
    expect(mat).toBe('Matemática | 5.00 | — | 9.00 | — | 6.33 | 100.0% (4/4) | Aprovado');
    expect(hist).toBe('História | — | — | — | — | — | 50.0% (5/10) | Reprovado');
  });

  it('trocar o ano busca o boletim daquele ano', () => {
    criar();
    http.expectOne(URL).flush(BOLETIM);
    fixture.detectChanges();
    const campo = html().querySelector<HTMLInputElement>('.ano input')!;

    campo.value = '2025';
    campo.dispatchEvent(new Event('input'));
    html().querySelector('form')!.dispatchEvent(new Event('submit'));

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('schoolYear')).toBe('2025');
    req.flush({ ...BOLETIM, schoolYear: 2025, subjects: [] });
    fixture.detectChanges();

    expect(html().textContent).toContain('A turma ainda não tem disciplinas vinculadas');
  });

  it('404 (sem matrícula no ano ou sem acesso) mostra a mensagem e esconde a tabela', () => {
    criar();
    http.expectOne(URL).flush({ message: 'Aluno sem matrícula ativa em 2026' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(html().querySelector('[role=alert]')!.textContent).toContain('Boletim indisponível');
    expect(html().querySelector('table')).toBeNull();
  });
});
