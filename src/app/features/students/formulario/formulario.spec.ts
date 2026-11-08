import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Student } from '../student.models';
import { Formulario } from './formulario';

const URL = `${environment.apiUrl}/students`;
const ALUNO: Student = {
  id: 7,
  registrationNumber: '2026000007',
  fullName: 'Ana Souza',
  birthDate: '2010-05-04',
  guardianName: 'Bia Souza',
  guardianPhone: '11999998888',
  email: null,
  active: true,
  cpf: '111.444.777-35',
};

describe('Formulário de aluno', () => {
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
  const preencherTudo = () => {
    preencher('fullName', '  José Açaí ');
    preencher('cpf', '111.444.777-35');
    preencher('birthDate', '2010-05-04');
    preencher('guardianName', ' Bia ');
    preencher('guardianPhone', '11999998888');
    preencher('email', '   ');
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

  it('inválido não chama a API e mostra os erros', () => {
    criar();

    submeter();

    http.expectNone(URL);
    expect(html().querySelectorAll('mat-error').length).toBeGreaterThanOrEqual(4);
  });

  it('telefone com máscara é recusado (só dígitos)', () => {
    criar();
    preencherTudo();
    preencher('guardianPhone', '(11) 99999-8888');

    submeter();

    http.expectNone(URL);
  });

  it('válido faz POST com textos aparados e e-mail nulo, e volta para a lista', () => {
    criar();
    preencherTudo();

    submeter();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      fullName: 'José Açaí',
      birthDate: '2010-05-04',
      guardianName: 'Bia',
      guardianPhone: '11999998888',
      email: null,
      cpf: '11144477735', // vai só com os dígitos
    });
    expect(html().querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);
    req.flush({ ...ALUNO, id: 8 });
    expect(navegar).toHaveBeenCalledWith('/alunos');
  });

  it('erro do servidor reabilita o botão e não navega', () => {
    criar();
    preencherTudo();
    submeter();

    http.expectOne(URL).flush({ message: 'x' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(html().querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('edição carrega o aluno, mostra a matrícula e faz PUT', () => {
    criar('7');
    http.expectOne(`${URL}/7`).flush(ALUNO);
    fixture.detectChanges();
    expect(html().textContent).toContain('2026000007');
    expect(html().querySelector<HTMLInputElement>('[formcontrolname=fullName]')!.value).toBe('Ana Souza');

    submeter();

    const req = http.expectOne(`${URL}/7`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.email).toBeNull();
    expect(req.request.body.cpf).toBe('11144477735');
    req.flush(ALUNO);
    expect(navegar).toHaveBeenCalledWith('/alunos');
  });

  // ---------- CPF ----------

  const cpfInput = () => html().querySelector<HTMLInputElement>('[formcontrolname=cpf]')!;
  const erroDo = (campo: string) =>
    html()
      .querySelector(`[formcontrolname=${campo}]`)!
      .closest('mat-form-field')!
      .querySelector('mat-error')
      ?.textContent?.trim();

  it('mascara o CPF enquanto digita', () => {
    criar();

    preencher('cpf', '11144477735');
    expect(cpfInput().value).toBe('111.444.777-35');

    preencher('cpf', '1114');
    expect(cpfInput().value).toBe('111.4');
  });

  it('CPF inválido: não chama a API, mostra "CPF inválido" ao lado do campo e leva o foco até ele', () => {
    criar();
    preencherTudo();
    preencher('cpf', '111.444.777-36');

    submeter();

    http.expectNone(URL);
    expect(erroDo('cpf')).toBe('CPF inválido');
    expect(document.activeElement).toBe(cpfInput());
  });

  it('o erro aparece ao sair do campo, antes de tentar salvar', () => {
    criar();
    preencher('cpf', '111.444.777-36');

    cpfInput().dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(erroDo('cpf')).toBe('CPF inválido');
    http.expectNone(URL);
  });

  it('CPF vazio pede para informar', () => {
    criar();

    submeter();

    expect(erroDo('cpf')).toBe('Informe o CPF');
  });

  it('CPF repetido (409 do servidor) aparece no campo e reabilita o botão', () => {
    criar();
    preencherTudo();
    submeter();

    http.expectOne(URL).flush({ message: 'CPF já cadastrado' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(erroDo('cpf')).toBe('CPF já cadastrado');
    expect(document.activeElement).toBe(cpfInput());
    expect(html().querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('CPF recusado pelo servidor (400) também aparece no campo', () => {
    criar();
    preencherTudo();
    submeter();

    http.expectOne(URL).flush({ message: 'CPF inválido' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(erroDo('cpf')).toBe('CPF inválido');
  });

  it('o erro do servidor some quando o CPF é editado', () => {
    criar();
    preencherTudo();
    submeter();
    http.expectOne(URL).flush({ message: 'CPF já cadastrado' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    preencher('cpf', '529.982.247-25');
    fixture.detectChanges();

    expect(erroDo('cpf')).toBeUndefined();
  });

  it('erro de outro campo do servidor não marca o CPF', () => {
    criar();
    preencherTudo();
    submeter();

    http.expectOne(URL).flush({ message: 'fullName: não deve estar em branco' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(erroDo('cpf')).toBeUndefined();
  });

  it('aluno antigo sem CPF abre com o campo vazio e só salva depois de informar', () => {
    criar('7');
    http.expectOne(`${URL}/7`).flush({ ...ALUNO, cpf: null });
    fixture.detectChanges();
    expect(cpfInput().value).toBe('');

    submeter();
    http.expectNone(`${URL}/7`);
    expect(erroDo('cpf')).toBe('Informe o CPF');

    preencher('cpf', '52998224725');
    submeter();
    expect(http.expectOne(`${URL}/7`).request.body.cpf).toBe('52998224725');
  });

  it('aluno inexistente (404) volta para a lista', () => {
    criar('99');

    http.expectOne(`${URL}/99`).flush({}, { status: 404, statusText: 'Not Found' });

    expect(navegar).toHaveBeenCalledWith('/alunos');
  });
});
