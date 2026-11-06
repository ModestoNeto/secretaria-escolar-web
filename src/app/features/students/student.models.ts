export interface Student {
  id: number;
  registrationNumber: string;
  fullName: string;
  birthDate: string; // yyyy-MM-dd
  guardianName: string;
  guardianPhone: string;
  email: string | null;
  active: boolean;
}

export type StudentInput = Omit<Student, 'id' | 'registrationNumber' | 'active'>;

export type SortField = 'fullName' | 'registrationNumber' | 'birthDate';

export interface StudentQuery {
  q: string;
  page: number;
  size: number;
  sort: SortField;
  direction: 'asc' | 'desc';
  includeInactive: boolean;
}
