# Studio — 5º full review (2026-06-14)

## Contexto

Pedido: "faça um full review no package studio". Quinta rodada de revisão completa
do `@sistemazero/studio`. As quatro anteriores já corrigiram muito de round-trip
Blocos⇄Código (perda de dados), concorrência/multi-instância e segurança do
preview (CSP/loopGuard/permissionGuard). Esta rodada cobriu o pacote inteiro com
ênfase no trabalho mais recente/menos revisado (feature "guardar/ler", modo
profissional/WebContainer) e nas lacunas anotadas no round anterior (ciclo de vida
do worker reverse-parse, Monaco multi-instância, a11y sistemática, robustez do
IndexedDB sob quota/falha).

## Metodologia (multi-agente)

Workflow de orquestração determinística: **10 dimensões de revisão** (segurança do
preview · geradores · parsers/IR · Blockly · persistência/IndexedDB · stores &
lifecycle · pro/WebContainer · export · extensões/jogos · IA/UI/a11y), rodadas em
**4 ondas de 3** (após a 1ª tentativa com as 10 simultâneas bater num rate limit
transitório do servidor). Cada achado foi **re-verificado adversarialmente**
(default-to-refute) por um agente independente que leu a fonte real antes de
confirmar.

Resultado bruto: **19 achados → 14 confirmados** (0 incertos, **5 rejeitados** na
verificação). A verificação inclusive **corrigiu severidades**: o vazamento de FS
no modo pro caiu de `high`→`medium` (refutou a alcançabilidade via "terminal
clássico", impossível porque `modesForKind('classic')` nunca inclui `'code'`); o
furo do loopGuard em `<script>` inline caiu de `medium`→`low` (mesma classe de
congelamento já aceita/documentada para trabalho síncrono não-laço).

**0 críticos · 1 ALTO · 7 MÉDIOS · 6 BAIXOS.**

Baseline no início: typecheck limpo, biome limpo, 958 testes. Gate final: **tsc 0 ·
biome 0 · 973 testes pass / 0 fail** (+15 testes de regressão).

## Achados confirmados e RESOLVIDOS

### ALTO

**#1 — Export: extra `script.ts/.jsx/.mjs/.cjs` sobrescreve o `public/script.js`
do aluno (perda de dados).** `export/fileMap.ts`. `isReservedProjectFileName` só
barra os nomes EXATOS (`script.js`), mas um extra `script.ts` não é reservado, vira
`script.js` no rewrite de extensão e SOBRESCREVIA o JS canônico do aluno — o site
publicado passava a rodar o conteúdo do extra, com perda silenciosa do código
principal. `utils.ts` + `utils.js` também colidiam. O mesmo caminho é reusado por
`convertClassicToProTree` ("Virar profissional"). **Fix:** detectar colisão pelo
NOME DE SAÍDA (`public/${jsName}`) — se já existe em `files`, pular + emitir aviso
em vez de sobrescrever. Cobre canônico×extra e extra×extra. Testes de regressão em
`export/__tests__/fileMap.test.ts`.

### MÉDIOS

**#2 — `parseDeclarations` não mascarava comentário no NOME da prop.**
`parsers/css.ts`. Divergia de `parseDeclarationsWithSpans` (que mascara): para
`.box { /* nota */ color: red }` a chave do IR virava `"/* nota */ color"` e o span
`"color"` — o realce bloco↔código da Ponte caía para TODA declaração precedida de
comentário. **Fix:** helper compartilhado `maskPropComments` usado pelos DOIS
parsers (nunca divergem).

**#3 — Declaração CSS duplicada some no round-trip.** `parsers/css.ts`. O Record do
IR colapsa propriedades repetidas (última vence), perdendo o fallback de
progressive enhancement (`display: flex; display: grid`) ao regenerar por edição de
bloco. **Fix:** regra com prop duplicada vira `rawCSS advanced` (verbatim), honrando
"código é sagrado" sem mudar o schema (`hasDuplicateDeclKeys`).

**#4 — Busca de blocos vazava Funções/Classes acima do nível.**
`blockly/searchCategory.ts` + `paramsFlyout.ts`. A busca indexa os tipos dinâmicos
(Funções/Classes) globalmente, sem perfil — um aluno em perfil restrito os achava
digitando o nome, contornando a divulgação progressiva. **Fix:** `BlocklyPanel`
publica o perfil POR WORKSPACE (WeakMap) e o `matchBlocks` filtra a oferta
(`blockedDynamicSearchTypes`), espelhando EXATAMENTE o gate da paleta (`pushCustom`
gateia por `isCategoryAllowed`). Testes em `blockly/__tests__/searchLevels.test.ts`.

**#5 — Renomear projeto só-legado era no-op silencioso.** `state/persistence.ts`.
`renameProjectMeta` retornava sem gravar quando não havia partição de meta — mas
projetos no formato legado (`sz:project:<id>`, nunca abertos) são suportados para
leitura/listagem, então a UI revertia o nome ao reler o disco. **Fix:** fallback
para a chave legada (regrava nome+updatedAt no doc legado) dentro do mesmo
`runSerializedWrite`.

**#6 — 1º mount do sync pro nunca resetava o FS singleton.**
`modes/pro/useWebContainerSync.ts`. `wc.mount` MESCLA na árvore atual; como o reset
só rodava em troca de projeto na mesma instância, uma 2ª instância pro montava por
cima dos arquivos+`node_modules` que outra instância pro deixou no singleton
(deps incompatíveis no install). **Fix:** resetar sempre que o montado não for este
projeto (`mountedProjectRef.current !== projectId`), incluindo o 1º mount; passa o
`templateId` para preservar `node_modules` só quando o template casa.

**#7 — `npm run dev` que morre na largada travava o preview pro em "starting".**
`modes/pro/ProPreview.tsx`. Só o `npm install` tinha checagem de saída; o
`dev.exit` era ignorado, então um vite.config inválido / porta ocupada / script
inexistente deixava a fase presa para sempre (sem `server-ready`). **Fix:** correr
`dev.exit` contra o `server-ready` (flag `serverReady`) — se o exit resolve antes
do pronto, vai para `error` com o código (sem timeout no processo de longa duração).

**#8 — Checkbox "Salvar chave neste navegador" persistia a chave da store, não o
rascunho.** `components/settings/SettingsDrawer.tsx`. Marcar a caixa antes de clicar
"Salvar" gravava a chave antiga/vazia; o que o aluno digitou (só em `draftKey`)
virava no-op silencioso e rebaixava para o provider mock no reload. **Fix:** o
toggle comita o rascunho via `setAIApiKey(draftKey, { storage })`.

### BAIXOS

**#9 — loopGuard não instrumentava `<script>` inline do HTML.**
`preview/bootstrap.ts`. `<script>while(true){}</script>` colado no index.html
escapava a Camada A do loopGuard (que só instrumentava o JS canônico) e congelava a
aba. **Fix:** `instrumentInlineScripts` extrai os `<script>` inline executáveis
(sem `src`, clássico/module) de `headInner`/`bodyInner`/extras HTML e os
externaliza para `data:` URL instrumentada (mesmo tratamento do JS canônico —
instrumenta os loops e evita a corrupção do `escapeScriptContent`). Testes em
`bootstrap.test.ts`.

**#10 — Comentários entre regras e regras vazias somem no round-trip.**
`parsers/css.ts`. Diferente de HTML/JS (que preservam comentários verbatim). **Fix:**
comentário solto entre regras vira `rawCSS advanced`; regra vazia/placeholder
preservada verbatim. Testes em `parsers/__tests__/cssRoundtrip.test.ts`.

**#11 — `document.classList`/`dataset` virava sentinela `__document__`.**
`parsers/js.ts`. `extractTarget` devolvia `{ id: '__document__' }` para `document`
cru, e o gerador reescrevia como `getElementById("__document__")` (alvo
inexistente → no-op) no round-trip. **Fix:** retorna `null` para `document` cru → o
statement cai em `rawJS` verbatim. O caminho de evento global
(`document.addEventListener`) já é tratado antes em `tryMatchEventListener`.

**#12 — `ensureMounted` não liberava a posse do FS quando o mount falhava.**
`modes/pro/useWebContainerSync.ts`. Uma falha de boot/colisão de árvore deixava o
FS singleton preso a uma instância que não montou nada (irmão fica 'busy' para
sempre). **Fix:** no `catch`, liberar a posse quando `!webcontainerRef.current`
(nunca materializou container), espelhando o teardown em erro do Terminal clássico.

**#13 — Padrão ARIA de abas incompleto no BottomPanel.**
`components/layout/BottomPanel.tsx`. `role="tablist"`/`tab` sem `tabpanel`,
`aria-controls`, `aria-labelledby` nem foco itinerante. **Fix:** `role="tabpanel"` +
ids estáveis por instância (`useId`) + `aria-controls`/`aria-labelledby` + roving
`tabIndex` com navegação por setas/Home/End nas abas.

**#14 — Transcript de IA sem região aria-live.** `components/ai/AIPanel.tsx`. A
resposta em streaming não era anunciada a leitores de tela. **Fix:** `role="log"
aria-live="polite" aria-relevant="additions text"` no contêiner do transcript.

## Áreas auditadas que saíram LIMPAS

A camada de concorrência/persistência mais recente — cerca de exclusão dupla
(`fenceGameStorageDelete` + a do `PersistenceService`) com janela de graça e poda
lazy, mutex por id (`runSerializedWrite`/`runSerialized`), guard cross-project do
`storageWrite` no PreviewIframe, dedupe de flush no unload — foi auditada a fundo e
está bem fundamentada (os 5 achados rejeitados concentraram-se aqui, em alarmes
falsos). A CSP, o `__szLoopTick` travado e o `storageBridge` (targetOrigin nunca
`'*'`, JSON.parse anti-`__proto__`) seguem corretos.

## Gate final

- `tsc --noEmit` — limpo
- `biome check .` — limpo
- `bun test src` — **973 pass / 0 fail** (109 arquivos; baseline 958 + 15 testes de
  regressão)
