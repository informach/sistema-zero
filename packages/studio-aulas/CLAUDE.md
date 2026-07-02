# @sistemazero/studio-aulas

> Sempre consulte o Context7 (docs atualizadas) antes de mexer em qualquer lib/framework (Remotion, Playwright, ElevenLabs, HeyGen).

Pipeline de produção das aulas do curso infantil: roteiro → voz → avatar → tela
do Estúdio → balões/teoria → vídeo. Pacote de FERRAMENTA (não é serviço nem app
deployado). **Regra de ouro: NÃO modificar nenhum outro package.** O Estúdio é só
CONSUMIDO (`@sistemazero/studio`, API pública) no harness de gravação.

## Fonte da verdade

`aulas/<slug>/roteiro.yaml` (schema Zod em `src/roteiro/schema.ts`). Toda etapa lê
esse arquivo. A skill `.claude/skills/aula-roteiro` gera roteiros válidos na voz
das aulas reais.

## Arquitetura por etapa

- **src/** = pipeline Node (Bun). É o ÚNICO que o CI typecheck-a (`tsconfig.json`
  inclui só `src`). `cli.ts` orquestra (`voz|avatar|tela|plano|render|all|validar`).
- **harness/automation.ts** = módulo de automação (cursor visível + Blockly)
  INJETADO no playground REAL do Estúdio via `/@fs/` do Vite (não é app próprio);
  expõe `window.__aulas`. JSX/browser; fora do typecheck do CI.
- **remotion/** = compositor ("Premiere em código"). Também fora do typecheck do
  CI; renderizado pelo Remotion CLI. Importa TIPOS de `src/steps/07-montagem/plano`.

## Como a tela é gravada (etapa 4) — o ponto delicado

`src/steps/04-tela/index.ts` (driver Playwright, roda sob **Node** — Playwright não
conecta o pipe de debug sob Bun) sobe o **playground REAL do Estúdio**
(`bun run --filter @sistemazero/studio dev`) e **captura a porta real do stdout do
Vite** (auto-incrementa se 5173 ocupada — NÃO assumir 5173). No browser (headful):
1. abre o playground, INJETA `harness/automation.ts` via `import('/@fs/<abs>')` — o
   Vite transforma o módulo, então `blockly/core` e `@sistemazero/studio` resolvem
   para a MESMA instância do editor (`getMainWorkspace()` enxerga o workspace real);
2. `criarProjetoAula` semeia um projeto vazio + extensões (API pública
   `createEmptyProject` + `createLocalPersistenceAdapter`), navega p/ `/editor/<id>`,
   re-injeta;
3. **esconde o preview** (`esconderPreview` clica o toggle do Topbar) → os blocos
   ocupam a tela toda (senão o preview cobre o bloco e o balão aponta pra trás dele);
4. por cena de PRÁTICA: **arrasto REAL** (bloco desliza do flyout à conexão + snap
   determinístico via `serialization.blocks.append`), **zoom que faz o bloco caber**
   (`ajustarZoomAoBloco`), **destaque forte** (anel + duplo pulso de clique), e
   `medirAncora` devolve o retângulo **+ a escala** (balão proporcional na montagem).
O driver escreve `out/tela/timeline.json` (faixas de cena + balões com px/escala/tempo).

⚠️ **Precisa de navegador real pra calibrar**: `bun test` (happy-dom) NÃO renderiza
Blockly. A automação é DEFENSIVA (try/catch) pra degradar sem derrubar a gravação.
Soquetes de VALOR (x/y) não têm campo → a âncora cai no bloco inteiro. Ao evoluir,
rode `aula:tela dia-1-a-nave-ganha-vida` e olhe o webm.

## Montagem (etapa 7)

`src/steps/07-montagem/plano.ts` (Node) resolve TUDO antes do Remotion: durações
(ffprobe, com fallback por contagem de palavras), faixas de tela por cena, balões
em segundos relativos à cena. Escreve `out/montagem.json`. O `render` roda
`remotion render` com `--public-dir=out` (mídias via `staticFile`) e `--props=out/montagem.json`.
A composição (`remotion/Root.tsx` → `AulaComposition`) é dirigida 100% pelo plano;
`calculateMetadata` (Node) só soma as durações. Composição em 1280×720 (mesma
resolução da gravação → coordenadas de balão batem 1:1).

## Gotchas / não-negociáveis

1. **Isolamento**: nada de editar outros packages. Precisa de algo interno do
   Estúdio? Ou usa a API pública, ou o dado viaja pelo `initialProject`
   (ex.: extensões via `installedExtensions`, não há `installExtension` público).
2. **Blockly single-instance**: a automação é servida pelo Vite do PLAYGROUND (via
   `/@fs/`), então `blockly/core` e `@sistemazero/studio` resolvem para a mesma
   instância do editor e `getMainWorkspace()` funciona. Se um dia o `/@fs/` for
   bloqueado (fs.allow), o Vite precisa enxergar a raiz do monorepo (tem workspaces
   + bun.lock + .git → detectada por padrão).
3. **CI leve**: só `src/` typecheck-a e o `test` roda `parse.test.ts`. NÃO puxe
   Remotion/React pra dentro de `src/` (só TIPOS de `plano.ts`). Assim os tipos
   pesados de vídeo não podem quebrar o pipeline do monorepo.
4. **Segredos**: `.env` (Zod, fail-fast por etapa em `src/config/env.ts`), nunca no
   código; `.env` e `aulas/**/out/` no `.gitignore`.
5. **Sem legenda** no mp4 (vai pro Vimeo, que gera). Não adicionar camada de
   legenda no Remotion.
6. **Chroma do avatar**: default = fundo verde do HeyGen mascarado pelo cantinho.
   Acabamento = HeyGen transparente (webm alpha) → `Avatar` compõe direto.

## Comandos

- `bun run src/cli.ts <cmd> <slug>` (ou `aula:<cmd>` pelos scripts)
- `aula:tela <slug>` sobe o playground do Estúdio sozinho (porta capturada do Vite)
- `bun run remotion` — Remotion Studio (preview)
- `bun run typecheck` / `bun run test` / `bun run check`

## Backlog

- Preencher soquetes de valor numéricos (x/y) na etapa de tela (hoje só campos).
- Calibrar o sincronismo balão×fala com timestamps de palavra do ElevenLabs.
- Chroma-key real (ou HeyGen transparente) no `Avatar`.
- Integrar geração de roteiro ao Pensa.
