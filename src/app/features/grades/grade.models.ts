export interface Avaliacao {
  id: number;
  name: string;
  term: number; // bimestre, de 1 a 4
  weight: number;
  maxScore: number;
}

export type AvaliacaoInput = Omit<Avaliacao, 'id'>;

// score é nulo enquanto a nota do aluno não foi lançada
export interface LinhaPauta {
  enrollmentId: number;
  studentId: number;
  studentName: string;
  registrationNumber: string;
  score: number | null;
}

export interface NotaInput {
  enrollmentId: number;
  score: number;
}

export const BIMESTRES = [1, 2, 3, 4];
