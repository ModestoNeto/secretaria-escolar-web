import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Role } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { BoletimBusca } from './busca';

const aluno = (id: number, fullName: string) => ({ id, fullName, registrationNumber: `2026${id}` });
const pagina = (content: unknown[]) => ({ content, page: 0, size: 10, totalElements: content.length, totalPages: 1 });

describe('Busca de aluno para o boletim', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<BoletimBusca>;

  const html = () => fixture.nativeElement as HTMLElement;

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
    fixture = TestBed.createComponent(BoletimBusca);
    fixture.detectChanges();
  };

  const digitar = (texto: string) => {
    const campo = html().querySelector<HTMLInputElement>('input[type=search]')!;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
  };

  afterEach(() => http.verify());

  it('a gestão busca por nome e cada resultado leva ao boletim do aluno', async () => {
    vi.useFakeTimers();
    criar('SECRETARIA');

    digitar('ana');
    vi.advanceTimersByTime(300);
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/students`);
    expect(req.request.params.get('q')).toBe('ana');
    expect(req.request.params.get('size')).toBe('10');
    req.flush(pagina([aluno(7, 'Ana Souza')]));
    fixture.detectChanges();
    vi.useRealTimers();

    const link = html().querySelector<HTMLAnchorElement>('.alunos a')!;
    expect(html().textContent).toContain('Ana Souza');
    expect(link.getAttribute('href')).toBe('/boletim/7');
  });

  it('busca sem resultado avisa', () => {
    vi.useFakeTimers();
    criar('ADMIN');

    digitar('zzz');
    vi.advanceTimersByTime(300);
    http.expectOne((r) => r.url === `${environment.apiUrl}/students`).flush(pagina([]));
    fixture.detectChanges();
    vi.useRealTimers();

    expect(html().textContent).toContain('Nenhum aluno encontrado');
  });

  it('o professor não busca alunos: vê a orientação e nenhuma chamada à API é feita', () => {
    criar('PROFESSOR');

    expect(html().querySelector('input[type=search]')).toBeNull();
    expect(html().textContent).toContain('chamada');
    http.expectNone(() => true);
  });
});
