import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Disciplina, Matricula, Professor, Turma, TurmaInput, Vinculo } from './class.models';

@Injectable({ providedIn: 'root' })
export class ClassService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/classes`;

  list(schoolYear: number | null) {
    const params = schoolYear ? new HttpParams().set('schoolYear', schoolYear) : undefined;
    return this.http.get<Turma[]>(this.url, { params });
  }

  get(id: number) {
    return this.http.get<Turma>(`${this.url}/${id}`);
  }

  create(input: TurmaInput) {
    return this.http.post<Turma>(this.url, input);
  }

  update(id: number, input: TurmaInput) {
    return this.http.put<Turma>(`${this.url}/${id}`, input);
  }

  vinculos(classId: number) {
    return this.http.get<Vinculo[]>(`${this.url}/${classId}/subjects`);
  }

  vincular(classId: number, subjectId: number, teacherUserId: number) {
    return this.http.post<Vinculo>(`${this.url}/${classId}/subjects`, { subjectId, teacherUserId });
  }

  desvincular(classId: number, subjectId: number) {
    return this.http.delete<void>(`${this.url}/${classId}/subjects/${subjectId}`);
  }

  disciplinas() {
    return this.http.get<Disciplina[]>(`${environment.apiUrl}/subjects`);
  }

  professores() {
    return this.http.get<Professor[]>(`${environment.apiUrl}/users`, { params: { role: 'PROFESSOR' } });
  }

  matriculas(classId: number) {
    return this.http.get<Matricula[]>(`${this.url}/${classId}/enrollments`);
  }

  matricular(classId: number, studentId: number) {
    return this.http.post<unknown>(`${environment.apiUrl}/enrollments`, { studentId, classId });
  }

  cancelarMatricula(id: number) {
    return this.http.delete<void>(`${environment.apiUrl}/enrollments/${id}`);
  }
}
