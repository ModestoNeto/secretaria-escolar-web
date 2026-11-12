// present é nulo enquanto a chamada do aluno naquela aula não foi registrada
export interface LinhaChamada {
  enrollmentId: number;
  studentId: number;
  studentName: string;
  registrationNumber: string;
  present: boolean | null;
}

export interface PresencaInput {
  enrollmentId: number;
  present: boolean;
}
