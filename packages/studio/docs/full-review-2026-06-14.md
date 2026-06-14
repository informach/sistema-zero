# Studio — feature "guardar/ler" persistente + 4º full review (2026-06-14)

## Contexto

Pedido: "incluir o bloco de guardar e ler — o programa rodando não guarda o
próprio estado ao recarregar; o bicho lembra da fome enquanto está rodando, mas
se der reload, zera" + um full review do pacote.

## Diagnóstico

Os blocos **já existiam e estavam 100% conectados** no pipeline (IR `storageGet`/
`storageSet`, gerador, parser, `buildIR`, `workspaceState`, `valueSockets`) desde
o commit inicial — e aparecem na paleta no perfil completo (categorias JavaScript
e Valores). O que faltava era eles **FUNCIONAREM**:

- O preview roda num iframe `sandbox="allow-scripts allow-modals"` → **origem
  opaca**. Numa origem opaca o navegador **lança `SecurityError`** ao só tocar em
  `localStorage`/`sessionStorage`. Logo, os blocos travavam o programa do aluno.
- Mesmo que não lançassem, cada "Atualizar"/rerender reconstrói o srcdoc do zero →
  estado em memória zera. Não havia ponte de persistência. Por isso o bicho
  esquecia a fome ao recarregar.

## O que foi implementado (feature)

Ponte de armazenamento que mantém o **código gerado sagrado** (continua
`localStorage.setItem/getItem` reais) e o faz funcionar + persistir:

- **`src/preview/storageBridge.ts`** (novo): runtime injetado no `<head>` antes de
  qualquer script (extensão/aluno) que **shima** `localStorage`/`sessionStorage`
  via `Object.defineProperty(window, …)` (atributos de interface do global são
  `configurable:true` — a redefinição vence o getter que lançaria, sem nunca lê-lo).
  `local` é semeado no boot e espelha cada mutação ao parent por `postMessage`;
  `session` é efêmero no sandbox.
- **`src/state/gameStorage.ts`** (novo): persistência durável POR PROJETO no
  IndexedDB (`sz:game-storage:<id>`), à prova de ambiente sem IndexedDB. Limpa no
  `deleteProject`. É o "armazenamento do app que o aluno criou", separado da fonte
  do projeto.
- **`PreviewIframe.tsx`**: hidrata um mirror por projeto, semeia no doc a cada
  build (lido de ref — uma escrita NÃO reconstrói o doc), processa `storageWrite`
  (sanitiza + persiste com throttle), gate `storageReady` antes do 1º build.
- **`types.ts`/`bootstrap.ts`**: protocolo `storageWrite` validado + clamp
  (`sanitizePreviewStorageData`), injeção do bridge + snapshot no doc.

Resultado: `local` sobrevive a "Atualizar", Play/Parar, edição de código e ao
recarregar a IDE inteira (F5); `session` zera a cada execução. Contraste didático
preservado.

## 4º full review — metodologia

4 revisores paralelos (feature nova; preview/sandbox; state/persistência;
pipeline Blocos↔IR↔Código), cada achado re-verificado adversarialmente contra a
fonte (default-to-refute). Baseline no início: typecheck/biome limpos, 837 testes.

## Achados confirmados e RESOLVIDOS

### HIGH — corrupção cross-project na troca de projeto
`PreviewIframe.tsx` (handler de `storageWrite`). O `contentWindow` do iframe é
estável; na janela entre `projectId` virar B e o iframe recarregar com o doc de B,
o programa AINDA VIVO de A podia postar uma escrita que o parent atribuía a B
(gravando dado de A na chave de B / sujando o mirror recém-hidratado de B). A auth
por `ev.source` passava (mesmo Window), e não havia como saber de QUAL projeto a
mensagem veio.
**Fix:** o bridge carimba o `projectId` do doc em cada `storageWrite`; o parent
DESCARTA mensagens cujo `projectId` não casa com o projeto atual.

### MEDIUM — amplificação de postMessage / starvation da persistência
`storageBridge.ts` + `PreviewIframe.tsx`. O bridge posta o store inteiro a cada
mutação; um programa escrevendo em laço **assíncrono** (fora do loopGuard) spammava
o parent, que re-sanitizava na main-thread e **resetava o debounce pra sempre** →
nunca persistia.
**Fix:** o parent virou um **throttle com último-valor** (borda de subida + no
máx. 1×/500ms, sempre processando o payload MAIS RECENTE) — limita o custo de
sanitização e garante progresso da persistência, preservando a última escrita.
Flush explícito em "Atualizar"/Play para o seed sair fresco.

### MEDIUM — IR→Blocos transformava statement não-representável em JSON quebrado
`workspaceState.ts:rawJSBlock`. Para um statement não estruturável (ex.:
`storageSet`/`storageGet` com chave NÃO-literal, mas também ~28 outros sites:
`querySelector`/`fetchJson` dinâmicos etc.), o bloco "código avançado" recebia
`JSON.stringify(nó-do-IR)` — que o gerador re-emitia VERBATIM como objeto literal
quebrado, **descartando a chamada real** (`localStorage.setItem(variavel, x)` sumia
ao passar pela visão de Blocos).
**Fix (raiz, cobre os ~28 sites):** o fallback agora **compila o statement para
JS válido** (`compileStatements([stmt], 0)`), mantendo o trecho re-parseável; cai
para o nó comentado só num erro inalcançável.

### LOW — chave literal `__proto__` descartada do snapshot persistido
`types.ts:sanitizePreviewStorageData` e `storageBridge.ts`. `out = {}` +
`out["__proto__"] = …` caía no setter de `Object.prototype` (chave perdida); e o
SEED como objeto literal `{ "__proto__": … }` definiria o protótipo.
**Fix:** `Object.create(null)` no `out` de sanitize e no espelho do bridge; SEED
embutido como STRING JSON + `JSON.parse` em runtime (cria chave própria). Sem risco
de poluição de protótipo (valores são sempre strings; nenhuma atribuição aninhada).

### LOW — limitações documentadas (aceitas)
- `location.reload()` DENTRO do programa re-semeia do snapshot do build (perde
  escritas da sessão não persistidas); "Atualizar"/recarregar a IDE re-semeia do
  estado salvo. Niche (aluno chamando reload manualmente).
- O shim suporta só a API de MÉTODOS; acesso por propriedade (`localStorage.x = …`)
  não persiste. Os blocos só emitem métodos. (Ver `docs/EXTENSIONS.md`.)

## Achados REFUTADOS (verificados e descartados)
- `Object.defineProperty(window,'localStorage',…)` é confiável (WebIDL
  `configurable:true`); `clear()` reatribuindo `data` propaga a `length`/`key`/
  `getItem` via escopo léxico — confirmado executando o runtime real.
- Escape do SEED via `escapeScriptContent`/JSON é seguro (round-trip byte-idêntico;
  sem breakout de `</script>`).
- Gate `storageReady` fecha a corrida do 1º run; flush no unmount/pagehide/troca de
  projeto sem vazamentos de timer/listener.
- `loadGameStorage` nunca pendura nem lança (bail sem IndexedDB; try/catch → `{}`).
- `duplicateProject`/`import`/`create`/`rename` não copiam o save (o duplicado
  "nasce com fome") — comportamento correto, não surpresa.
- `deleteGameStorage` exportado mas não chamado em produção: a limpeza real está no
  `delMany` do `deleteProject` (não é leak); mantido por simetria/API.

## Ajustes pós-review (decisões de produto)

- **Blocos guardar/ler → nível `iniciante`** (eram `intermediario`): salvar o
  estado do bichinho é acessível desde o começo.
- **Extensões nunca aparecem no nível iniciante.** `game-2d` ganhou
  `minLevel: 'intermediario'` (`game-3d` já era `'avancado'`), e o DEFAULT de
  `minLevel` para extensões sem declaração virou `'intermediario'` (era
  `'iniciante'` em `BlocklyPanel.tsx`) — divulgação progressiva à prova de
  esquecimento.

## Smoke real (navegador, Chromium via Playwright)

Verificado com o `buildPreviewDoc` REAL num iframe sandbox de origem opaca:
- `localStorage` NATIVO **lança** no sandbox (premissa confirmada — o shim é
  necessário);
- com a ponte, `setItem`/`getItem` funcionam e o `storageWrite` chega carimbado
  com o `projectId`;
- um doc semeado com `{contador:'1'}` (reload simulado) lê o seed e incrementa
  para `2` → **o estado sobrevive ao recarregar**.

## Status (2026-06-14)

Gates verdes no pacote inteiro:
**biome `bun run check` 0 erros/0 warnings · `tsc --noEmit` limpo · `bun test src`
865 pass / 0 fail** (baseline era 837; +28 testes: bridge, sanitize/guard,
gameStorage round-trip, projectId stamp, `__proto__`, fallback de código avançado,
integração do bootstrap e gating de nível do game-2d).
