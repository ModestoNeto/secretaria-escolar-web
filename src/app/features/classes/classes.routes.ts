import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/guards';

const gestao = roleGuard('ADMIN', 'SECRETARIA');

// a lista e o detalhe também servem ao professor (a API filtra as turmas dele); criar e editar são da gestão
export const CLASS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./lista/lista').then((m) => m.Lista) },
  { path: 'nova', canActivate: [gestao], loadComponent: () => import('./formulario/formulario').then((m) => m.Formulario) },
  { path: ':id', loadComponent: () => import('./detalhe/detalhe').then((m) => m.Detalhe) },
  { path: ':id/editar', canActivate: [gestao], loadComponent: () => import('./formulario/formulario').then((m) => m.Formulario) },
];
