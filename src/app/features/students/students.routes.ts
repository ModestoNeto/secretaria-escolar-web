import { Routes } from '@angular/router';

export const STUDENT_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./lista/lista').then((m) => m.Lista) },
];
