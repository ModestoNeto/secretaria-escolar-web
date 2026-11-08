export type Turno = 'MORNING' | 'AFTERNOON' | 'EVENING';

export const TURNOS: { valor: Turno; rotulo: string }[] = [
  { valor: 'MORNING', rotulo: 'Manhã' },
  { valor: 'AFTERNOON', rotulo: 'Tarde' },
  { valor: 'EVENING', rotulo: 'Noite' },
];

export const rotuloTurno = (t: Turno): string => TURNOS.find((x) => x.valor === t)?.rotulo ?? t;

export interface Turma {
  id: number;
  name: string;
  gradeLevel: number;
  shift: Turno;
  schoolYear: number;
  capacity: number;
}

export type TurmaInput = Omit<Turma, 'id'>;

export interface Disciplina {
  id: number;
  name: string;
}

export interface Vinculo {
  id: number;
  classId: number;
  subjectId: number;
  teacherUserId: number;
}

export interface Professor {
  id: number;
  name: string;
  email: string;
}
