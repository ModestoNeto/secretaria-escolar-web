import { Role } from './auth/auth.models';

export interface ItemMenu {
  rotulo: string;
  rota: string;
  papeis: Role[];
}

const TODOS: Role[] = ['ADMIN', 'SECRETARIA', 'PROFESSOR'];
const GESTAO: Role[] = ['ADMIN', 'SECRETARIA'];

export const ITENS_MENU: ItemMenu[] = [
  { rotulo: 'Painel', rota: '/painel', papeis: TODOS },
  { rotulo: 'Alunos', rota: '/alunos', papeis: GESTAO },
  { rotulo: 'Turmas', rota: '/turmas', papeis: TODOS },
  { rotulo: 'Matrículas', rota: '/matriculas', papeis: GESTAO },
  { rotulo: 'Notas e frequência', rota: '/notas', papeis: TODOS },
  { rotulo: 'Boletim', rota: '/boletim', papeis: TODOS },
  { rotulo: 'Usuários', rota: '/usuarios', papeis: ['ADMIN'] },
  { rotulo: 'Auditoria', rota: '/auditoria', papeis: ['ADMIN'] },
];

export const itensPara = (role: Role | null): ItemMenu[] =>
  role ? ITENS_MENU.filter((i) => i.papeis.includes(role)) : [];
