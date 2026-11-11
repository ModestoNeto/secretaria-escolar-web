import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Avaliacao, AvaliacaoInput, LinhaPauta, NotaInput } from './grade.models';

@Injectable({ providedIn: 'root' })
export class GradeService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  avaliacoes(classId: number, subjectId: number) {
    return this.http.get<Avaliacao[]>(`${this.api}/classes/${classId}/subjects/${subjectId}/assessments`);
  }

  criar(classId: number, subjectId: number, input: AvaliacaoInput) {
    return this.http.post<Avaliacao>(`${this.api}/classes/${classId}/subjects/${subjectId}/assessments`, input);
  }

  editar(id: number, input: AvaliacaoInput) {
    return this.http.put<Avaliacao>(`${this.api}/assessments/${id}`, input);
  }

  apagar(id: number) {
    return this.http.delete<void>(`${this.api}/assessments/${id}`);
  }

  pauta(assessmentId: number) {
    return this.http.get<LinhaPauta[]>(`${this.api}/assessments/${assessmentId}/grades`);
  }

  lancar(assessmentId: number, grades: NotaInput[]) {
    return this.http.put<LinhaPauta[]>(`${this.api}/assessments/${assessmentId}/grades`, { grades });
  }
}
