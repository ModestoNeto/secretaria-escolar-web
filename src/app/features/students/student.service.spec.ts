import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { StudentInput, StudentQuery } from './student.models';
import { StudentService } from './student.service';

const URL = `${environment.apiUrl}/students`;
const BASE: StudentQuery = { q: '', page: 0, size: 20, sort: 'fullName', direction: 'asc', includeInactive: false };
const INPUT: StudentInput = {
  fullName: 'Ana',
  birthDate: '2010-01-01',
  guardianName: 'Bia',
  guardianPhone: '11999998888',
  email: null,
};

describe('StudentService', () => {
  let service: StudentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(StudentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list envia q, page, size, sort e includeInactive', () => {
    service.list({ ...BASE, q: 'ana', page: 2, size: 50, sort: 'birthDate', direction: 'desc', includeInactive: true }).subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('ana');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('50');
    expect(req.request.params.get('sort')).toBe('birthDate,desc');
    expect(req.request.params.get('includeInactive')).toBe('true');
    req.flush({ content: [], page: 2, size: 50, totalElements: 0, totalPages: 0 });
  });

  it('q com acento vai codificado em UTF-8 na URL', () => {
    service.list({ ...BASE, q: 'José' }).subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.urlWithParams).toContain('q=Jos%C3%A9');
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('get, create, update e deactivate usam método e URL certos', () => {
    service.get(7).subscribe();
    expect(http.expectOne(`${URL}/7`).request.method).toBe('GET');

    service.create(INPUT).subscribe();
    const post = http.expectOne(URL);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(INPUT);

    service.update(7, INPUT).subscribe();
    const put = http.expectOne(`${URL}/7`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual(INPUT);

    service.deactivate(7).subscribe();
    expect(http.expectOne(`${URL}/7`).request.method).toBe('DELETE');
  });
});
