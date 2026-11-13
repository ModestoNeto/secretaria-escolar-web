export type Resultado = 'APPROVED' | 'RECOVERY' | 'FAILED' | 'IN_PROGRESS';

export const ROTULO_RESULTADO: Record<Resultado, string> = {
  APPROVED: 'Aprovado',
  RECOVERY: 'Recuperação',
  FAILED: 'Reprovado',
  IN_PROGRESS: 'Em andamento',
};

export interface MediaBimestre {
  term: number;
  average: number;
}

// average é nula sem nota lançada; terms traz só os bimestres que têm nota; attendance é percentual (0 a 100)
export interface DisciplinaBoletim {
  subjectId: number;
  subjectName: string;
  terms: MediaBimestre[];
  average: number | null;
  lessons: number;
  presences: number;
  attendance: number;
  result: Resultado;
}

export interface Boletim {
  enrollmentId: number;
  studentId: number;
  studentName: string;
  registrationNumber: string;
  classId: number;
  className: string;
  schoolYear: number;
  result: Resultado;
  subjects: DisciplinaBoletim[];
}
