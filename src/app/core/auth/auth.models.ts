export type Role = 'ADMIN' | 'SECRETARIA' | 'PROFESSOR';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface Sessao {
  userId: number;
  role: Role;
}
