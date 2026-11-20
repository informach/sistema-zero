# Molda — Cenários 3D

## A oficina na plataforma (reforma em andamento, 16/11/2026)

A ferramenta está sendo refeita em lotes (plano aprovado em 16/11/2026). O que já existe no código:

- **Onde abre**: `/molda/cenarios` no Kids e na comunidade adulta. Quem pode abrir é o `members`
  que decide (`CENARIOS_MODO`: `desligado`, `equipe`, `lista` ou `aberto`); hoje, só a equipe. A
  página `/molda/cenarios` do Admin virou um atalho para ela.
- **Como se organiza**: espaço (o da conta, ou o da Equipe Sistema Zero) → bibliotecas de modelos
  (com licença: livre, própria ou restrita) → mundos → cenários. Tudo guardado na conta; os
  arquivos (`.glb`, retratos e capas) ficam no armazenamento, por conteúdo, dentro do espaço.
- **Pacotes**: `molda-cenarios-core` (`/v2`: documento, comandos em lote, desfazer), `molda-cenarios-motor`
  (palco 3D), `molda-cenarios` (`/oficina`: telas e o cliente HTTP), módulo `cenarios` do `members`,
  rotas `members-cenarios-*` no gateway e o BFF `/api/cenarios` do `member-shell`.
- **Ver sem a plataforma**: `bun run dev:oficina` em `packages/molda-cenarios` (porta 4541), com
  dados em memória.

### Agentes (CLI e MCP) na oficina nova

O agente faz o mesmo caminho da mão (as mesmas rotas, os mesmos lotes e o mesmo desfazer), sem
aba aberta. O guia completo, com o acesso, as unidades, as ferramentas e as receitas, está em
[`molda-cenarios-agentes.md`](molda-cenarios-agentes.md): `bun run cli <ferramenta> '<JSON>'` e
`bun run mcp` dentro de `packages/molda-cenarios-agente`.

## O acervo da equipe

`bun run arte:cenarios` (na raiz) prepara o acervo licenciado a partir do repositório privado
`../artes-3d`: confere o commit, o SHA-256 e o formato de cada GLB
(`scripts/molda-cenarios-arte.ts`) e grava em `output/molda-cenarios/acervo`, fora do Git. O envio
para a biblioteca da equipe é `scripts/molda-cenarios-publicar-acervo.mjs`, pela oficina nova.

## O piloto (removido em 20/11/2026)

O primeiro editor (preso ao Arquipélago, com runtime local, sessões e as rotas
`/arquipelago/admin/cenarios`) saiu no lote 10 da reforma: o código no `arquipelago-api`, no
gateway, no Admin (`CENARIOS_RUNTIME_URL`, proxy `api/molda-cenarios`), em `arquipelago/src/cenarios`,
o editor antigo do `molda-cenarios`, o cliente antigo do agente e `projetos`/`sessoes`/`runtime` do
núcleo. As tabelas `arquipelago.cenario_*` saem pela migração gerada `0030` do `arquipelago-api`.
Em 20/11/2026 elas não existiam em staging nem em produção (as migrações 0027 a 0029 nunca tinham
rodado lá); mesmo assim a leitura, só de leitura, ficou guardada no bucket privado de cada
ambiente em `backups/arquipelago-cenarios-piloto/`. O conversor
dos cenários antigos (`arquipelago/src/molda/converter-v1.ts`) continua: é ele que traz a Faísca
para o formato novo.
