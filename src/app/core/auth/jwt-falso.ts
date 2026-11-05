/** JWT só para testes: o front não valida a assinatura (quem valida é a API). */
export const jwtFalso = (role: string, sub = '1') =>
  `x.${btoa(JSON.stringify({ sub, role, type: 'access' }))}.y`;
