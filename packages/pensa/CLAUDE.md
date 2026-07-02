# CLAUDE.md — @sistemazero/pensa

> Sempre consulte o Context7 (docs atualizadas) antes de mexer em lib/framework, e use
> Octocode para pesquisa/exploração de código no GitHub.

App de **planejamento guiado (metodologia ZERO)** — a criança pensa/organiza o jogo ANTES de
construir no Estúdio. Biblioteca INTERNA do monorepo, consumida como **TS source** (modelo do
`@sistemazero/studio`): sem build; os apps usam `transpilePackages` + `@source
"../../../pensa/src"` + `@import "../../../pensa/src/styles/pensa.css"` no globals.css (MESMO
gotcha do Studio — sem o @import as utilitárias `pz-*` são no-op e os modais saem washed-out).

**⚠️ CONTRATO entre camadas** (nomes/rotas/shapes EXATOS de members/gateway/member-shell/este
pacote): `C:\Users\tocha\.claude\plans\pensa-contract.md` — ler ANTES de mudar qualquer view/rota.

## O que é

Projeto → ciclos ("Versão N", 1 = MVP) → etapas **z→e→r→o→done**:
- **Z — Zerar a Bagunça**: chat com o Zappy (SSE via host) pelas 5 perguntas; estrelas acendem
  pelo `state` do evaluator (servidor); Carta da Ideia (artefato `idea`) → validar → advance.
  Quando `ready`, o CTA "Criar a Carta da Ideia" aparece nas DUAS pontas: banner do topo E um
  convite no FIM do log do chat (prop `footer` do ChatPanel — a criança termina a conversa lá
  embaixo e não pode ter que rolar; travado em teste).
- **E — Enxergar o Jogo**: spec amigável (tirinhas Entrada→Processamento→Saída + wireframes
  DESENHADOS do JSON `screens`) com aprovação por seção + funil de identidade (nome → paleta →
  ícone SVG; o save AUTO-valida e o pacote renomeia o projeto via PATCH).
- **R — Rodar as Missões**: kanban (Missões/Fazendo agora/Hora de testar/Prontas; máx 1 em
  "Fazendo agora"; botões movem, não drag) de missões que a CRIANÇA executa no Estúdio; **Modo
  Missão** split (≥1024px + `renderStudio` do host) com a missão à esquerda e o editor à direita;
  semeadura LAZY via `createStudioProject` do host + PATCH `studioProjectId`.
  **O ESTÚDIO EMBUTIDO É OPCIONAL (buildEnv, 07/2026)**: com `detail.buildEnv === null` a etapa R
  abre o CHOOSER "Onde você vai construir?" (3 cartões — `BuildEnvChooser`): `embedded` = split
  (comportamento clássico, Recomendado), `studio` = semeia igual mas missão SEMPRE em painel com
  "Abrir o Estúdio" primário, `external` = SEM semeadura, missão como guia puro (VS Code etc.).
  Trocável pelo chip "Trocar" no header (preserva o quadro). Persistido no projeto
  (PATCH `{buildEnv}` → `projectStore.setBuildEnv`).
- **O — O Grande Lançamento**: checklist (Caça aos Bugs/Teste do Convidado/Toque de
  Brilho/Publicar no Mural/Mostrar; `required` trava o advance) → festa (confete finito +
  carta carimbada + delta de XP) → "Criar a Versão N+1".

## API pública (`src/index.ts` — TUDO fora dela é interno)

`<PensaApp adapter={PensaHostAdapter}>` + tipos (`PensaTransport`, views, `PensaApiError`).
- **`PensaTransport.request(path, init)`** — paths RELATIVOS ('/projects', `/cycles/:id/...`);
  o HOST prefixa `/api/pensa`. Erros HTTP → `PensaApiError`-shape `{status, code}` (o pacote
  DUCK-TYPA — a classe não atravessa o dynamic import do host).
- **`PensaTransport.streamChat(input, handlers)`** — SSE do chat (delta/state/done/error);
  devolve fn de ABORT (abortar = o BFF não persiste o turno).
- **`PensaHostAdapter`**: `mode` ('kids'|'adult' — troca a COPY inteira), `projectKind`,
  `theme` (host fixa), **`mascotImages`** (URLs do Zappy por pose happy/thinking/celebrating/
  sleeping — o kids passa `/zappy/*.webp`; ausente → emoji de fallback; consumo SEMPRE via
  `components/common/ZappyImage.tsx`), e as capabilities OPCIONAIS do Estúdio: `createStudioProject(name)`
  (semeia no IndexedDB do perfil, id charset `[A-Za-z0-9_-]`),
  `renderStudio(studioProjectId, pensaProjectId)` (editor embarcado do Modo Missão),
  `onOpenStudio(seed)` e **`syncStudioSnapshot({pensaProjectId, studioProjectId})`** (fire-and-
  forget: o pacote chama ao abrir o ProjectView quando há projeto semeado e buildEnv ∈
  {embedded, studio}; o HOST sobe o snapshot local mais novo OU restaura no IndexedDB o que
  faltar — backup do jogo na nuvem, rotas `/api/pensa/projects/:id/studio-snapshot`) —
  ausentes = degrade com orientação textual.

## Arquitetura

- **Stores zustand POR INSTÂNCIA** (factories `create*Store(transport)`, nunca singleton):
  `projectStore` (lista/detalhe/criar/renomear/arquivar/`absorbDetail`/`createCycle`),
  `chatStore` (z), `stageEStore`, `stageRStore`, `stageOStore`. Mutações OTIMISTAS com rollback
  (kanban/checklist); erros viram mensagem gentil (`friendlyErrorMessage`).
- **Navegação por ESTADO** (sem router): lista ⇄ projeto ⇄ etapa. O host não roteia.
- **Copy centralizada** em `src/core/copy.ts` por `mode` (kids: sem travessão, sem jargão —
  nunca "PRD/MVP"). Nomes kids das etapas: Zerar a Bagunça / Enxergar o Jogo / Rodar as
  Missões / O Grande Lançamento; ciclos = "Versão N".
- **CHIPS do chat**: toda resposta do agente termina com a linha `SUGESTÕES: a | b | c` — o
  pacote a OCULTA da bolha (`core/chips.ts`) e renderiza como chips clicáveis; clicar ENVIA o
  texto (escolher também é responder — regra anti-inferência). Mensagens ficam CRUAS no estado.
- **Stage view traz o estado VIVO**: `tasks` + `checklist` do CICLO vêm em TODA etapa — o
  reload re-hidrata o quadro sem re-gerar o plano (regenerar = REPLACE, zera as colunas).
- **SVG do ícone SEMPRE via `<img src="data:image/svg+xml...">`** — NUNCA
  dangerouslySetInnerHTML (defesa em profundidade; o BFF já sanitiza por allowlist). Testado.
- **CSS**: tokens `--color-pz-*` em `@theme` sob `[data-pensa-theme]` (light default, dark).
  SEM `@import "tailwindcss"`, SEM `@source`, SEM regras globais. Portalados usam
  `PensaThemeScope`. Animações respeitam `prefers-reduced-motion`; confete é FINITO.
- **a11y**: alvos ≥44px, foco/Esc/trap nos overlays (Dialog interno + MissionMode), aria-live
  nos toasts/celebrações, tracker com aria-label.

## Comandos

`bun run typecheck` · `bun test src` (154 testes, happy-dom via bunfig/test-setup) ·
`bun run check[:fix]`. Testes usam `src/testing/fakeTransport.ts` (transport roteirizável +
factories `make*` + `chatScript` de eventos SSE + adapter fake com as capabilities do Estúdio).

## Consumo (host de referência: community-kids)

`packages/community-kids/src/components/kids/pensa-client.tsx` — import dinâmico `ssr:false`,
transport fetch+SSE p/ `/api/pensa/*`, tema do next-themes, `createStudioProject`/`renderStudio`
sobre `@sistemazero/studio` (namespace `setStudioStorageNamespace(viewerId)` — MESMO do
/estudio, então o jogo semeado aparece lá também). Página gateada por produto (ref `pensa`).

## Backlog

- Modo adulto (`mode:'adult'` tem copy mas sem fluxos próprios: pesquisa de mercado, stack
  técnica, prompts copiáveis, ASCII art).
- "Bug vira card de conserto" na etapa O (hoje a Caça aos Bugs orienta sem materializar card —
  precisaria de POST de task avulsa no contrato).
- Checks locais do "Ficou pronto quando..." não persistem (só o estado da coluna persiste).
- QA em browser real (tokens/tailwind só materializam no pipeline do host).
