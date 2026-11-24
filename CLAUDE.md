# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Monorepo Bun + TypeScript (ESM) do Sistema Zero. Visão geral, portas e tabela de pacotes: `README.md`.
Cada pacote tem o seu `CLAUDE.md` (alguns com milhares de linhas): ele é a fonte do "como funciona
por dentro" e das armadilhas daquele pacote. Leia o do pacote antes de editar nele. A documentação e
o texto de tela são em português; a copy segue os guias de cada app.

## Comandos

```bash
bun install                                   # workspace inteiro (packages/*)
bun run check | check:fix                     # Biome (lint + format) no monorepo
bun run ci                                    # biome ci . (o que o CI roda)
bun run --filter @sistemazero/<pacote> test   # testes de um pacote
bun run --filter @sistemazero/<pacote> typecheck
cd packages/<pacote> && bun test caminho/do/arquivo.test.ts -t "nome do teste"   # um teste só
bun run dev:up [servicos...] | dev:status | dev:logs <svc> | dev:down   # orquestrador local (scripts/dev.ts)
bun run --filter @sistemazero/<servico> db:generate | db:migrate         # Drizzle por serviço
```

- Não use `bun x tsc` (baixa um TypeScript global errado): use o script `typecheck` do pacote.
- O CI usa **Bun 1.3.11**. Vários arquivos gerados (runtimes do Estúdio, bundles do studio-runtime)
  só batem byte a byte quando gerados nessa versão.
- As suítes passam **sem nenhum `.env`** (fakes). Teste novo não pode depender de env local.
- Testes de banco real (`tests/db/`) são opt-in: rodam só com a variável `*_TEST_DATABASE_URL` do
  pacote apontando para um banco local descartável e se pulam calados sem ela. Pulado não qualifica SQL.
- `bun test` multi-arquivo pode travar sob o sandbox do agente: rode com o sandbox desligado.

## CI (`.github/workflows/ci.yml`)

Roda em push na `staging` e em PR para a `main`: `biome ci`, `bun test` e `typecheck` de todos os
pacotes, mais e2e Playwright (Kids, Estúdio em Chromium/Firefox/WebKit, Molda Cenários e outros).
`scripts/ci/test-service-packages.mjs` roda as suítes de dois em dois pacotes; Estúdio, Molda,
`agent-runtime` e `marketing-desktop` têm passos próprios. Conferências de arquivos gerados
reprovam o CI quando alguém esquece de regenerar, por exemplo:

```bash
bun run --cwd packages/studio-runtime check:validation-profile   # muda com qualquer arquivo de runtime/, src/ ou core/src/studio
bun run --cwd packages/studio check:scene3d-runtime
bun run --cwd packages/studio check:pinta-region-runtime
bun run --cwd packages/molda-cenarios conferir:runtime
bun run --cwd packages/pinta check:region-phaser
```

## Arquitetura

- **Borda única:** frontends (funnel em Astro; admin, community, community-kids, marketing-app e
  helpdesk-app em Next.js 16) nunca chamam serviços direto. Os Next.js são **BFFs**: as rotas
  `/api/*` chamam o `@sistemazero/api-gateway`, que autentica (HMAC entre serviços, JWT de usuário),
  aplica RBAC por rota, remove `X-Auth-*` de entrada e repassa a identidade confiável ao upstream.
  Rota nova num serviço só existe na borda se entrar em `packages/api-gateway/gateway.config.ts`
  (config declarativa validada por Zod no boot); o `kids-access-policy.ts` decide o que o perfil
  infantil alcança.
- **Serviços** (Elysia, DDD/hexagonal: `domain` → `application` → `infrastructure` → `interfaces`,
  com um `composition-root.ts`): payments, auth (IdP), catalog, members (matrícula + cursos/aulas +
  gamificação + Estúdio/Pinta/Molda do lado servidor), messaging, fiscal, hub, marketing, helpdesk,
  referrals, arquipelago-api. Os serviços exigem um `x-internal-token` injetado pelo gateway.
- **Um Postgres, um schema por serviço** (`pgSchema` no Drizzle) e um journal de migrations próprio
  por pacote. O carimbo `when` da migration é **relógio, não numeração**: migration com `when`
  abaixo da maior já aplicada é **pulada em silêncio** (`db:migrate` verde e coluna ausente em
  runtime). Nunca escreva `when` à mão no futuro. Detalhes e incidentes: `packages/members/CLAUDE.md`.
- **Bibliotecas consumidas como TS source** (sem build, via `exports` + `transpilePackages`):
  - `core`: base framework-free, importada por todos e que **não importa nenhum pacote de
    serviço/app**; use os subpaths (`@sistemazero/core/security`, `/learning`, ...);
  - `member-shell`: route handlers, proxy anti-CSRF e componentes de aula compartilhados por
    community e community-kids. Os `route.ts` dos apps são atalhos de 1 a 3 linhas
    (`export const { POST } = shell.routes.x`);
  - `ui`: componentes e temas;
  - os editores infantis `studio` (IDE de blocos/código), `pinta` (arte 2D), `molda` (modelos 3D),
    `pensa` (planejamento) e `molda-cenarios`.

  Os apps precisam do `@source`/`@import` do CSS de cada lib no `globals.css` (sem isso as
  utilitárias somem). Detalhes nos `CLAUDE.md` de cada lib.
- **`studio-runtime`**: Worker Cloudflare com Cloudflare Containers (`@cloudflare/sandbox`). Compila
  projetos Pro, roda os objetivos de aula num Chromium sem internet (`/v1/check`) e serve as
  distribuições do motor Python. O deploy não passa pelo Railway (`bun run deploy:staging` no
  pacote, que monta a imagem com o Docker). A política do catálogo de autoria fica no members
  (`STUDIO_AUTHORING_POLICY_SHA256`); ver `docs/operations/studio-authoring-catalog.md`.
- **Arquipélago:** o jogo 3D é um pacote compilado à parte (`arquipelago`), carregado pela página
  da plataforma; a única dependência que a plataforma pode importar dele é
  `arquipelago-contracts`.

## Ambientes e entrega

- `staging` é a branch de integração e publica no ambiente `staging` do Railway. A `main` é
  protegida: só entra por PR com os checks verdes, sempre com **merge commit**. Produção sai pelo
  workflow `deploy-production.yml` depois do merge. Fluxo completo e URLs:
  `docs/ambientes-e-fluxo.md`.
- **Cursos:** publicar um curso (Kids de staging com vídeo provisório → vídeos finais com capa e
  base do Zappy → adulto → produção) e trocar vídeos: `docs/operations/cursos-passo-a-passo.md`.
  A troca de vídeos é `bun scripts/cursos/trocar-videos.ts` e a base do Zappy (caderno do aluno,
  transcrições), sem navegador, é `bun scripts/cursos/base-do-zappy.ts`. Leia antes de pesquisar o código.
- Configuração do Railway em `.railway/` (Dockerfile, preDeploy e healthcheck por serviço em
  `services/*.json`). Variável nova criada no painel precisa entrar em `.railway/variables.ts`.
  O preDeploy do serviço roda `db:migrate`.

## Armadilhas que valem para vários pacotes

- Testes de componente usam happy-dom. Dentro de `waitFor`, não passe elemento do DOM para um
  `expect` que pode falhar (`expect(el).toBeNull()`): para escrever a falha o Bun formata o elemento
  com o documento inteiro (segundos e gigabytes por checagem). Compare com `null` e afirme o booleano.
- `canvas`/`getContext` e `createImageBitmap` não funcionam no happy-dom: o que depende de pixel é
  conferido em navegador de verdade (Playwright), não no `bun test`.
- Arquivos Python e fixtures gerados no Windows saem com CRLF: os arquivos da galeria e os gerados
  são LF.
