# Secretaria Escolar: Web

Front-end em Angular da Secretaria Escolar (alunos, turmas, matrículas, notas, frequência e boletim).
Consome a API de `secretaria-escolar-api`. Projeto de estudo, apenas com dados fictícios.

## Como rodar

1. Suba a API (MySQL e Spring Boot na porta 3039): veja o README de `secretaria-escolar-api`.
2. `yarn` (instala as dependências; o projeto usa Yarn com `nodeLinker: node-modules`)
3. `yarn start` (aplicação em http://localhost:4200)

Outros comandos: `yarn test` (Vitest) e `yarn build`.

## Estrutura

`src/app/core` (autenticação, interceptors, guards), `src/app/shared` (componentes comuns) e
`src/app/features` (uma pasta por área). Componentes standalone, *signals* e Angular Material.
