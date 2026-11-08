import { ValidatorFn } from '@angular/forms';

// Mesma regra da API (domínio `Cpf`): 11 dígitos, dígitos verificadores e nenhuma sequência repetida.
const SO_DIGITOS_E_MASCARA = /^[\d.\-\s]+$/;

export const somenteDigitos = (valor: string): string => valor.replace(/\D/g, '');

const verificador = (digitos: string, tamanho: number): number => {
  let soma = 0;
  for (let i = 0; i < tamanho; i++) {
    soma += Number(digitos[i]) * (tamanho + 1 - i);
  }
  return ((soma * 10) % 11) % 10;
};

/** Aceita com ou sem máscara. */
export function cpfValido(valor: string): boolean {
  if (!SO_DIGITOS_E_MASCARA.test(valor)) return false;
  const d = somenteDigitos(valor);
  return (
    d.length === 11 &&
    !/^(\d)\1{10}$/.test(d) &&
    verificador(d, 9) === Number(d[9]) &&
    verificador(d, 10) === Number(d[10])
  );
}

/** Máscara progressiva para a digitação: 123 → 123, 1234 → 123.4, 12345678909 → 123.456.789-09. */
export function mascararCpf(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Vazio passa (o `required` cuida disso); preenchido e inválido dá o erro `cpf`. */
export const cpfValidator: ValidatorFn = (controle) =>
  !controle.value || cpfValido(String(controle.value)) ? null : { cpf: true };
