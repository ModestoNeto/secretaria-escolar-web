import { itensPara } from './menu';

const rotas = (role: Parameters<typeof itensPara>[0]) => itensPara(role).map((i) => i.rota);

describe('menu por papel', () => {
  it('ADMIN vê tudo', () => {
    expect(itensPara('ADMIN')).toHaveLength(8);
    expect(rotas('ADMIN')).toContain('/usuarios');
    expect(rotas('ADMIN')).toContain('/auditoria');
  });

  it('SECRETARIA vê matrículas, mas não usuários nem auditoria', () => {
    expect(rotas('SECRETARIA')).toContain('/matriculas');
    expect(rotas('SECRETARIA')).not.toContain('/usuarios');
    expect(rotas('SECRETARIA')).not.toContain('/auditoria');
  });

  it('PROFESSOR não vê matrículas, usuários nem auditoria', () => {
    expect(rotas('PROFESSOR')).toEqual(['/painel', '/turmas', '/notas', '/boletim']);
  });

  it('sem papel o menu é vazio', () => {
    expect(itensPara(null)).toEqual([]);
  });
});
