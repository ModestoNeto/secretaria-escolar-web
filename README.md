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

O formulário (`/alunos/novo` e `/alunos/:id/editar`) repete as regras da API: nome e responsável
até 160 caracteres, telefone só com 10 ou 11 dígitos, e-mail opcional (vazio vai como `null`). A
data aceita até ontem, porque a API recusa hoje. Erros que só o servidor detecta (por exemplo, uma
data futura digitada à mão) aparecem no aviso, não ao lado do campo, com uma exceção: o CPF.

### CPF

O CPF é obrigatório e a chave de busca principal. No formulário ele recebe a **máscara enquanto se
digita** (`000.000.000-00`) e é validado com a mesma regra da API (`features/students/cpf.ts`): 11
dígitos, dígitos verificadores e nenhuma sequência repetida. Se estiver errado, aparece "CPF inválido"
**ao lado do campo** (ao sair dele e ao tentar salvar), o envio é bloqueado e o foco vai para ele; a
mensagem não repete o número digitado. O CPF vai para a API só com os dígitos, e o que ela devolve já
vem com máscara. Erros que só o servidor sabe (`409 CPF já cadastrado` e `400 CPF inválido`) também
aparecem no campo e somem quando o CPF é editado. Aluno antigo, cadastrado antes do CPF existir, abre com o
campo vazio e só salva depois de informá-lo; na lista ele aparece como "—". A busca da lista aceita
nome ou CPF (com ou sem máscara, inteiro ou o começo dele).

## Tema e componentes compartilhados

O visual é "papel e tinta": mesa bege, folha creme com pauta, margem vermelha, tinta azul, carimbos
no lugar de etiquetas e anotações à mão (Newsreader, IBM Plex Mono e Caveat). As cores e as fontes
ficam em variáveis CSS no `src/styles.scss` (`--tinta`, `--papel`, `--caneta`...), que também
sobrescrevem os tokens do Angular Material; nenhum componente define cor própria. Tudo que é
enfeite (grão, furos, fita, carimbo redondo, anotações) é `aria-hidden` e não interfere no foco.

Em `src/app/shared`: `Folha` (a folha de papel com as camadas decorativas, conteúdo por projeção) e
`CabecalhoPagina` (título, subtítulo e ações), usado em todas as páginas. No celular o menu vira uma
gaveta aberta pelo botão "Menu".

## Estrutura

`src/app/core` (autenticação, interceptors, guards), `src/app/shared` (componentes comuns) e
`src/app/features` (uma pasta por área). Componentes standalone, *signals* e Angular Material.
