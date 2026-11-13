import { Routes } from '@angular/router';

// a API decide o acesso: a gestão vê qualquer aluno e o professor só os das turmas dele (404 para os outros)
export const REPORT_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./busca/busca').then((m) => m.BoletimBusca) },
  { path: ':studentId', loadComponent: () => import('./boletim/boletim').then((m) => m.Boletim) },
];
