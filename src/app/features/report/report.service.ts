import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Boletim } from './report.models';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);

  // sem ano, a API usa o ano atual
  boletim(studentId: number, schoolYear: number | null) {
    const params = schoolYear ? new HttpParams().set('schoolYear', schoolYear) : undefined;
    return this.http.get<Boletim>(`${environment.apiUrl}/students/${studentId}/report-card`, { params });
  }
}
