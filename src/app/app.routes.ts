import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth/guards';

const provisoria = () => import('./features/provisoria/provisoria').then((m) => m.Provisoria);
const todos = roleGuard('ADMIN', 'SECRETARIA', 'PROFESSOR');
const gestao = roleGuard('ADMIN', 'SECRETARIA');
const admin = roleGuard('ADMIN');

export const routes: Routes = [
  {
    path: 'entrar',
    loadComponent: () => import('./features/auth/entrar/entrar').then((m) => m.Entrar),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'painel' },
      { path: 'painel', loadComponent: provisoria, data: { titulo: 'Painel' }, canActivate: [todos] },
      {
        path: 'alunos',
        canActivate: [gestao],
        loadChildren: () => import('./features/students/students.routes').then((m) => m.STUDENT_ROUTES),
      },
      {
        path: 'turmas',
        canActivate: [todos],
        loadChildren: () => import('./features/classes/classes.routes').then((m) => m.CLASS_ROUTES),
      },
      { path: 'matriculas', loadComponent: provisoria, data: { titulo: 'Matrículas' }, canActivate: [gestao] },
      { path: 'notas', loadComponent: provisoria, data: { titulo: 'Notas e frequência' }, canActivate: [todos] },
      {
        path: 'boletim',
        canActivate: [todos],
        loadChildren: () => import('./features/report/report.routes').then((m) => m.REPORT_ROUTES),
      },
      { path: 'usuarios', loadComponent: provisoria, data: { titulo: 'Usuários' }, canActivate: [admin] },
      { path: 'auditoria', loadComponent: provisoria, data: { titulo: 'Auditoria' }, canActivate: [admin] },
      { path: 'acesso-negado', loadComponent: provisoria, data: { titulo: 'Acesso negado' } },
    ],
  },
  { path: '**', redirectTo: '' },
];
