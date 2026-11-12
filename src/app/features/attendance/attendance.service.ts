import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { LinhaChamada, PresencaInput } from './attendance.models';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  chamada(classId: number, subjectId: number, data: string) {
    return this.http.get<LinhaChamada[]>(`${this.api}/classes/${classId}/subjects/${subjectId}/attendance/${data}`);
  }

  registrar(classId: number, subjectId: number, data: string, records: PresencaInput[]) {
    return this.http.put<LinhaChamada[]>(`${this.api}/classes/${classId}/subjects/${subjectId}/attendance/${data}`, { records });
  }
}
