import { FormControl } from '@angular/forms';
import { cpfValidator, cpfValido, mascararCpf, somenteDigitos } from './cpf';

describe('cpfValido', () => {
  // 111.444.777-35 e 529.982.247-25 são os CPFs de exemplo mais usados em documentação
  it.each(['11144477735', '111.444.777-35', ' 111.444.777-35 ', '529.982.247-25', '52998224725'])(
    'aceita %s',
    (cpf) => expect(cpfValido(cpf)).toBe(true),
  );

  it.each([
    ['dígito verificador errado', '11144477736'],
    ['outro dígito errado', '11144477745'],
    ['sequência repetida (zeros)', '00000000000'],
    ['sequência repetida (uns)', '111.111.111-11'],
    ['curto', '1114447773'],
    ['longo', '111444777355'],
    ['com letra', '111.444.777-3x'],
    ['máscara estranha', '111/444/777-35'],
    ['vazio', ''],
  ])('recusa %s', (_motivo, cpf) => expect(cpfValido(cpf)).toBe(false));
});

describe('mascararCpf', () => {
  it.each([
    ['', ''],
    ['123', '123'],
    ['1234', '123.4'],
    ['123456', '123.456'],
    ['1234567', '123.456.7'],
    ['123456789', '123.456.789'],
    ['1234567890', '123.456.789-0'],
    ['12345678909', '123.456.789-09'],
    ['123.456.789-09', '123.456.789-09'],
    ['123456789091234', '123.456.789-09'], // passou de 11 dígitos: corta
    ['12a34', '123.4'], // letras somem
  ])('%s vira %s', (entrada, saida) => expect(mascararCpf(entrada)).toBe(saida));
});

describe('somenteDigitos', () => {
  it('tira a máscara', () => expect(somenteDigitos('111.444.777-35')).toBe('11144477735'));
});

describe('cpfValidator', () => {
  const erro = (valor: string) => cpfValidator(new FormControl(valor));

  it('vazio passa (o required cuida)', () => expect(erro('')).toBeNull());
  it('válido passa', () => expect(erro('111.444.777-35')).toBeNull());
  it('inválido dá o erro cpf', () => expect(erro('111.444.777-36')).toEqual({ cpf: true }));
});
