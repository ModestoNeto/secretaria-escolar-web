import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/guards';

const gestao = roleGuard('ADMIN', 'SECRETARIA');

// a lista e o detalhe também servem ao professor (a API filtra as turmas dele); criar e editar são da gestão
export const CLASS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./lista/lista').then((m) => m.Lista) },
  { path: 'nova', canActivate: [gestao], loadComponent: () => import('./formulario/formulario').then((m) => m.Formulario) },
  { path: ':id', loadComponent: () => import('./detalhe/detalhe').then((m) => m.Detalhe) },
  // avaliações e notas: o professor lança, a gestão só consulta (a API decide e dá 404 ao professor de outra disciplina)
  { path: ':id/disciplinas/:subjectId/avaliacoes', loadComponent: () => import('../grades/avaliacoes/avaliacoes').then((m) => m.Avaliacoes) },
  { path: ':id/disciplinas/:subjectId/avaliacoes/:assessmentId/notas', loadComponent: () => import('../grades/pauta/pauta').then((m) => m.Pauta) },
  // chamada: o professor titular registra, a gestão só consulta (a API dá 404 ao professor de outra disciplina)
  { path: ':id/disciplinas/:subjectId/chamada', loadComponent: () => import('../attendance/chamada/chamada').then((m) => m.Chamada) },
  { path: ':id/editar', canActivate: [gestao], loadComponent: () => import('./formulario/formulario').then((m) => m.Formulario) },
];
