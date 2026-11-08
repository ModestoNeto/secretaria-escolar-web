export interface Student {
  id: number;
  registrationNumber: string;
  fullName: string;
  birthDate: string; // yyyy-MM-dd
  guardianName: string;
  guardianPhone: string;
  email: string | null;
  active: boolean;
  cpf: string | null; // a API devolve com máscara; nulo nos alunos de antes do CPF existir
}

// o CPF enviado vai só com os dígitos (a API aceita os dois formatos)
export type StudentInput = Omit<Student, 'id' | 'registrationNumber' | 'active' | 'cpf'> & { cpf: string };

export type SortField = 'fullName' | 'registrationNumber' | 'birthDate';

export interface StudentQuery {
  q: string;
  page: number;
  size: number;
  sort: SortField;
  direction: 'asc' | 'desc';
  includeInactive: boolean;
}
