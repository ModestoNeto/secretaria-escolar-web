import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Formulario } from './formulario';

const URL = `${environment.apiUrl}/classes`;

describe('Formulário de turma', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Formulario>;
  let navegar: ReturnType<typeof vi.fn>;

  const html = () => fixture.nativeElement as HTMLElement;
  const submeter = () => {
    html().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const preencher = (nome: string, valor: string) => {
    const el = html().querySelector<HTMLInputElement>(`[formcontrolname=${nome}]`)!;
    el.value = valor;
    el.dispatchEvent(new Event('input'));
  };

  const criar = (id?: string) => {
    navegar = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigateByUrl: navegar } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Formulario);
    fixture.detectChanges();
  };

  afterEach(() => http.verify());

  it('nome em branco não chama a API e mostra o erro', () => {
    criar();
    preencher('name', '   ');

    submeter();

    http.expectNone(URL);
    expect(html().querySelector('mat-error')?.textContent).toContain('Informe o nome');
  });

  it('valores fora dos limites não chamam a API', () => {
    criar();
    preencher('name', '5º C');
    preencher('gradeLevel', '13');
    preencher('capacity', '61');

    submeter();

    http.expectNone(URL);
  });

  it('cria com o nome aparado e volta para a lista', () => {
    criar();
    preencher('name', '  5º C ');
    preencher('gradeLevel', '5');
    preencher('schoolYear', '2026');
    preencher('capacity', '28');

    submeter();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: '5º C', gradeLevel: 5, shift: 'MORNING', schoolYear: 2026, capacity: 28 });
    req.flush({ id: 1 });
    expect(navegar).toHaveBeenCalledWith('/turmas');
  });

  it('409 mantém o formulário aberto e libera o botão', () => {
    criar();
    preencher('name', '5º C');

    submeter();
    http.expectOne(URL).flush({ message: 'Já existe' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(navegar).not.toHaveBeenCalled();
    expect(html().querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
  });

  it('edição carrega a turma, preenche o formulário e envia PUT', () => {
    criar('7');
    http.expectOne(`${URL}/7`).flush({ id: 7, name: '6º A', gradeLevel: 6, shift: 'EVENING', schoolYear: 2026, capacity: 25 });
    fixture.detectChanges();
    expect(html().querySelector<HTMLInputElement>('[formcontrolname=name]')!.value).toBe('6º A');

    submeter();

    const req = http.expectOne(`${URL}/7`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: '6º A', gradeLevel: 6, shift: 'EVENING', schoolYear: 2026, capacity: 25 });
    req.flush({});
  });
});
