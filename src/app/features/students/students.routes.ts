import { Routes } from '@angular/router';

export const STUDENT_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./lista/lista').then((m) => m.Lista) },
  { path: 'novo', loadComponent: () => import('./formulario/formulario').then((m) => m.Formulario) },
  { path: ':id/editar', loadComponent: () => import('./formulario/formulario').then((m) => m.Formulario) },
];
