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
- **harness/** = app Vite que monta `<StudioEditor>` e expõe `window.__aulas`
  (automação Blockly + cursor visível). JSX/browser; fora do typecheck do CI
  (`tsconfig.app.json`, compilado pelo Vite).
- **remotion/** = compositor ("Premiere em código"). Também fora do typecheck do
  CI; renderizado pelo Remotion CLI. Importa TIPOS de `src/steps/07-montagem/plano`.

## Como a tela é gravada (etapa 4) — o ponto delicado

`src/steps/04-tela/index.ts` (driver Playwright) sobe o harness Vite (porta 5273),
abre o Chromium com `recordVideo`, e para cada cena de PRÁTICA chama a API do
harness via `page.evaluate`. O harness (`harness/automation.ts`):
- pega o workspace por `Blockly.getMainWorkspace()` (mesma cópia de Blockly,
  deduplicada pelo Vite — por isso o alias do config aponta pro SOURCE do studio);
- **encaixe CONFIÁVEL** (não drag físico): `Blockly.serialization.blocks.append`
  + conecta na boca de statement do frame (padrão de `studio/.../blockClipboard.ts`);
- desenha um **cursor grande** animado (WAAPI) — é o que dá o "arrastar" didático;
- mede coordenadas de bloco/campo (`getOriginOffsetInPixels`, `field.getScaledBBox`)
  pros balões.
O driver escreve `out/tela/timeline.json` (faixas de cena + balões com px e tempo),
consumido pela montagem.

⚠️ **Precisa de navegador real pra calibrar**: `bun test` (happy-dom) NÃO renderiza
Blockly nem estrangula rAF. Nomes de campo (NAME/COLOR) e a conexão nos frames
podem variar; a automação é DEFENSIVA (try/catch + avisos) pra degradar sem
derrubar a gravação. Ao evoluir, rode `aula:tela dia-1-a-nave-ganha-vida` e olhe o
webm.

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
2. **Blockly single-instance**: o harness importa `blockly/core` e o alias do Vite
   aponta o studio pro SOURCE — se o Blockly duplicar, `getMainWorkspace()` não vê
   o workspace do editor. Não troque o alias por resolução via node_modules sem
   conferir a deduplicação.
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
- `bun run harness` — Estúdio no harness (127.0.0.1:5273)
- `bun run remotion` — Remotion Studio (preview)
- `bun run typecheck` / `bun run test` / `bun run check`

## Backlog

- Preencher soquetes de valor numéricos (x/y) na etapa de tela (hoje só campos).
- Calibrar o sincronismo balão×fala com timestamps de palavra do ElevenLabs.
- Chroma-key real (ou HeyGen transparente) no `Avatar`.
- Integrar geração de roteiro ao Pensa.
