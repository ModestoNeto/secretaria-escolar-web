import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../../shared/page';
import { Student, StudentInput, StudentQuery } from './student.models';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/students`;

  list(q: StudentQuery): Observable<Page<Student>> {
    const params = new HttpParams()
      .set('q', q.q)
      .set('page', q.page)
      .set('size', q.size)
      .set('sort', `${q.sort},${q.direction}`)
      .set('includeInactive', q.includeInactive);
    return this.http.get<Page<Student>>(this.url, { params });
  }

  get(id: number) {
    return this.http.get<Student>(`${this.url}/${id}`);
  }

  create(input: StudentInput) {
    return this.http.post<Student>(this.url, input);
  }

  update(id: number, input: StudentInput) {
    return this.http.put<Student>(`${this.url}/${id}`, input);
  }

  deactivate(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
