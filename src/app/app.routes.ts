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
      { path: 'alunos', loadComponent: provisoria, data: { titulo: 'Alunos' }, canActivate: [todos] },
      { path: 'turmas', loadComponent: provisoria, data: { titulo: 'Turmas' }, canActivate: [todos] },
      { path: 'matriculas', loadComponent: provisoria, data: { titulo: 'Matrículas' }, canActivate: [gestao] },
      { path: 'notas', loadComponent: provisoria, data: { titulo: 'Notas e frequência' }, canActivate: [todos] },
      { path: 'boletim', loadComponent: provisoria, data: { titulo: 'Boletim' }, canActivate: [todos] },
      { path: 'usuarios', loadComponent: provisoria, data: { titulo: 'Usuários' }, canActivate: [admin] },
      { path: 'auditoria', loadComponent: provisoria, data: { titulo: 'Auditoria' }, canActivate: [admin] },
      { path: 'acesso-negado', loadComponent: provisoria, data: { titulo: 'Acesso negado' } },
    ],
  },
  { path: '**', redirectTo: '' },
];
