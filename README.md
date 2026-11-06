# Secretaria Escolar: Web

Front-end em Angular da Secretaria Escolar (alunos, turmas, matrículas, notas, frequência e boletim).
Consome a API de `secretaria-escolar-api`. Projeto de estudo, apenas com dados fictícios.

## Como rodar

1. Suba a API (MySQL e Spring Boot na porta 3039): veja o README de `secretaria-escolar-api`.
2. `yarn` (instala as dependências; o projeto usa Yarn com `nodeLinker: node-modules`)
3. `yarn start` (aplicação em http://localhost:4200)

Outros comandos: `yarn test` (Vitest) e `yarn build`.

## Autenticação

A URL da API fica em `src/environments` (`http://localhost:3039`). O login guarda os tokens no
`sessionStorage` (somem ao fechar a aba); o interceptor envia o `Bearer` e, em 401, renova pelo
refresh uma única vez (requisições simultâneas compartilham o mesmo refresh). O menu e os guards
mostram só o que o papel do usuário pode usar, mas quem protege os dados é a API.

## Alunos

Só ADMIN e SECRETARIA acessam (a API responde 403 ao PROFESSOR, então o menu e a rota também o
escondem). A lista tem busca por nome com *debounce* de 300 ms, ordenação pelas três colunas que a
API aceita (`fullName`, `registrationNumber`, `birthDate`) e paginação de 10, 20 ou 50. O estado da
consulta fica em *signals* e um `switchMap` cancela a requisição anterior, então uma resposta lenta
nunca sobrescreve a mais nova. Buscar, ordenar ou filtrar volta para a primeira página. Desativar
pede confirmação; a API não tem rota para reativar.

## Estrutura

`src/app/core` (autenticação, interceptors, guards), `src/app/shared` (componentes comuns) e
`src/app/features` (uma pasta por área). Componentes standalone, *signals* e Angular Material.
