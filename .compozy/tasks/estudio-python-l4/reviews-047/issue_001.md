---
status: resolved
file: packages/members/src/application/live/live-workspace.service.ts
line: 371
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Professora pode retirar o contexto e a curadoria da ajuda

## Review Comment

`runtimeContext` aceita `sessionId:null` e `blockId:null` para uma professora que é escritora durante ajuda ativa. `assertWriter` pede `requireRoom`, e `existingAccess` encontra a sala a partir de `workspace.assistance.sessionId`, portanto a autorização passa. Entretanto a consulta não busca o binding e `AuthorizeLiveRuntimeService` devolve `baselineId:null` e `curation:{}`. A mesma professora consegue assim retirar a curadoria original simplesmente omitindo o encontro/bloco, embora a biblioteca seja reservada à criança proprietária (`listOwned` já retorna vazio para staff).

Reprodução independente: `bun .cache/studio-python-l0/review047-teacher-library.ts`, exit 0. Usa os serviços Live, workspace, autorização e policy reais com os repositórios de memória existentes; a criança aceita a ajuda pelo fluxo normal e a professora anexa seu dispositivo. O pedido explícito retorna a baseline original e `pythonLevel:2`; o mesmo ator/dispositivo/epoch com contexto nulo recebe `execute`, baseline nula e curadoria vazia, sem consulta ao produto. A biblioteca da professora continua vazia. Não houve execução de navegador, SQL ou alteração de produção.

Restringir o contexto de biblioteca ao proprietário não docente, conferindo tanto identidade do perfil quanto conta antes de resolver autoria. A professora deve informar o encontro/bloco efetivo da ajuda, conservando as verificações existentes de sala, presença, writer e curadoria. Manter a continuação legítima da criança pela biblioteca e cobrir a recusa da professora mesmo com uma ajuda ativa válida.

## Triage

- Decision: `FIXED`
- Notes: Implementador confirmou que a biblioteca sem curadoria é somente da criança proprietária e acrescentou a guarda em `runtimeContext`: contexto nulo exige ator não staff, ID do proprietário e mesma conta. A professora conserva somente o contexto explícito do bloco/ajuda. O revisor não alterou produção.

## Revalidation

- `bun .cache/studio-python-l0/review047-revalidate.ts` — exit 0. Refaz aceitação/attach reais e confirma autorização da professora no contexto explícito com baseline/curadoria. As três operações (`execute`, `analyze`, `python-repl`) com contexto nulo são recusadas, sem alterar o workspace nem consultar produto. Também devolve a autoria pelo fluxo real: a professora antiga é recusada, a criança retoma e usa legitimamente sua biblioteca; staff e perfil/conta alheios são recusados.
- `bun test tests/unit/studio-live-runtime.test.ts tests/integration/studio-live-runtime.test.ts`, em Members — 8 pass, 0 fail, 58 verificações, exit 0. Preservadas as negativas de dispositivo/epoch/revisão/bloco/conta, lease expirado, revogação, corpo adulterado e releitura do escritor após consulta de continuação.
- `bun test tests/live-route-policy.test.ts tests/live-routes.test.ts`, em member-shell — 12 pass, 0 fail, 81 verificações, exit 0. `bun test tests/unit/config.test.ts -t 'live execution resolves'`, em api-gateway — 1 pass, 0 fail, 1 verificação, exit 0; rota exata vence o wildcard e mantém JWT/status/teto.
- Sem navegador, TSC, build ou SQL executados pelo revisor nesta rodada. Log SQL existente `.cache/studio-python-l0/l6-live-runtime-sql-4.log` foi inspecionado: 6 pass, 0 fail, 35 verificações, incluindo projeção sem mídia/escrita e leitura durante lock de save. A revisão cobre a fronteira servidora; hosts, handoff de duas pessoas no navegador e desempenho permanecem qualificações separadas.
