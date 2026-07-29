# Auditoria arquitetural — áreas de comportamento do Estúdio

> **Estado após implementação:** os achados F-01 a F-10 foram corrigidos. Este
> documento preserva o retrato anterior às correções; o fechamento e as
> evidências atuais estão em
> [`behavior-lifecycle-review/fixes-report.md`](behavior-lifecycle-review/fixes-report.md).

**Data:** 2026-07-19T18:12:05-03:00  
**Escopo:** divisão de Comportamento em **Ao iniciar**, **Quando acontecer — Eventos** e **Enquanto estiver rodando — Loops**; categorias centrais; cinco extensões oficiais; exemplos; migração; execução; documentação e cobertura automatizada.  
**Modo:** análise somente. Nenhum arquivo de produto foi alterado por esta auditoria.

## Resumo executivo

**Veredito: a divisão visual e o IR V2 estão implantados, mas o contrato semântico ainda não está pronto para servir de base estável aos cursos.**

- O projeto novo nasce vazio e oferece as cinco áreas opcionais.
- Os 67 exemplos reais da galeria já usam IR V2: todos têm conteúdo em `start`, 46 usam `events`, 55 usam `loops` e nenhum conserva nó legado de lifecycle.
- A ordem gerada é correta: início, eventos, loops e boot automático.
- Porém, as travas de contexto não são completas, blocos antigos inválidos continuam na paleta, a migração parcial pode mudar o programa, excluir uma área pode apagar seu conteúdo e o Composer de Mundo 3D ainda procura a moldura antiga.
- A documentação operacional e os contextos de IA continuam ensinando o modelo antigo.
- Os testes focais de lifecycle ficam verdes mesmo com essas reproduções, mostrando lacunas de cobertura. A suíte global está vermelha por mudanças concorrentes de SVG/NamePicker, e o E2E canônico está instável.

### Inventário auditado

| Superfície | Definições de bloco | Exemplos | Resultado direto de raiz |
|---|---:|---:|---|
| Núcleo | 383 | 8 | Um drift confirmado: `sz_js_on_event_named` |
| Jogo 2D | 190 | 14 | Válido, exceto wrapper legado ainda visível |
| Jogo 2D Avançado | 337 | 19 | Válido, exceto boot/wrapper legados ainda visíveis |
| Jogo 3D | 118 | 8 | Válido nos roots não legados auditados |
| Jogo 3D Avançado | 130 | 6 | Válido; boot legado já está oculto |
| Mundo 3D | 136 | 12 | Válido, exceto boot legado e Composer antigo |
| **Total** | **1.294** | **67** | **Só 7 definições declaram `placement` explicitamente** |

Das 1.294 definições, 919 são statements de comportamento. A varredura incluiu todas as definições registradas, seus toolboxes, geração de IR e aceitação pelo `SZIRV2Schema`.

## O que está correto

1. Os cinco frames existem e são oferecidos na caixa de ferramentas; o teste de navegador confirma projeto novo sem nenhuma área ([`smoke.spec.ts:155`](../packages/studio/e2e/smoke.spec.ts#L155)).
2. `buildIRFromWorkspace` separa as três listas ([`buildIR.ts:61`](../packages/studio/src/blockly/buildIR.ts#L61)) e o schema V2 valida raízes por área ([`schema.ts:10361`](../packages/studio/src/ir/schema.ts#L10361)).
3. O gerador usa o mesmo escopo lexical e emite início → eventos → loops ([`js.ts:341`](../packages/studio/src/generators/js.ts#L341), [`js.ts:363`](../packages/studio/src/generators/js.ts#L363)).
4. Duplicatas de uma mesma área são removidas e seu filho é preservado como rascunho ([`projectAreaGuard.ts:31`](../packages/studio/src/blockly/projectAreaGuard.ts#L31)).
5. O organizador já possui cobertura para duas linhas (`src/blockly/__tests__/organize.test.ts`).
6. Todos os 67 exemplos da galeria validam no IR V2 e não dependem mais de wrappers ou boots manuais.
7. A separação de RPG entre criar mapa, escolher mapa inicial e reagir à entrada está presente e os testes isolados da Vila do Dragão passam.
8. Durante esta auditoria, alterações concorrentes do Jogo 3D Avançado já ocultaram seu boot legado e atualizaram manifest/contexto de IA para o início automático.

## Achados

### F-01 — HIGH — As travas de contexto não são efetivas

**Confiança:** alta. **Impacto:** todas as categorias e extensões.

O contrato aprovado exige `placement` por definição e uma única fonte consumida pelo Blockly e pelo IR. Hoje `placement` continua opcional ([`blocks/types.ts:61`](../packages/studio/src/blockly/blocks/types.ts#L61)) e só 7 das 1.294 definições o declaram; as demais dependem de nomes e listas ([`blockContracts.ts:137`](../packages/studio/src/blockly/blockContracts.ts#L137), [`blockContracts.ts:237`](../packages/studio/src/blockly/blockContracts.ts#L237)).

Uma alteração concorrente passou a materializar contextos diferentes quando o input já tem `check: 'JSStmt'`, mas a maioria dos inputs de corpo não declara check. A validação nova também cobre comandos dependentes de contexto, não roots genéricos de eventos e loops. Assim, o Blockly ainda aceita conexões que deveria recusar.

Reproduções headless confirmadas:

- `sz_js_on_click` dentro do corpo de um `if`;
- `sz_canvas_anim_loop` dentro do corpo de um evento;
- evento dentro do corpo de um loop.

As três árvores também passam no `SZIRV2Schema`, porque a validação geral verifica apenas roots ([`schema.ts:10361`](../packages/studio/src/ir/schema.ts#L10361)); as poucas validações aninhadas são específicas de motores.

**Correção recomendada:** tornar `placement` obrigatório para statements oficiais, materializar checks distintos em cada input de corpo e repetir a mesma gramática recursivamente no schema. Remover as listas/regex paralelas depois da migração do catálogo.

### F-02 — HIGH — Blocos legados inválidos continuam disponíveis para projetos novos

**Confiança:** alta. **Impacto:** núcleo, Jogo 2D, Jogo 2D Avançado e Mundo 3D.

Continuam visíveis:

- `sz_js_on_load` ([`dom.ts:224`](../packages/studio/src/blockly/blocks/dom.ts#L224), [`toolbox.ts:53`](../packages/studio/src/blockly/toolbox.ts#L53));
- `sz_g2d_on_start` ([`game-2d/blocks.ts:98`](../packages/studio/src/official-extensions/game-2d/blocks.ts#L98));
- `sz_gk_start` e `sz_gk_on_game_start` ([`game-2d-advanced/blocks.ts:42`](../packages/studio/src/official-extensions/game-2d-advanced/blocks.ts#L42), [`blocks.ts:200`](../packages/studio/src/official-extensions/game-2d-advanced/blocks.ts#L200));
- `sz_w3d_start` ([`world-3d/blocks.ts:99`](../packages/studio/src/official-extensions/world-3d/blocks.ts#L99)).

Todos esses blocos ainda encaixam fisicamente em **Ao iniciar**, geram nós legados e depois são rejeitados pelo V2 em `isLifecycleRootAllowed` ([`ir/lifecycle.ts:87`](../packages/studio/src/ir/lifecycle.ts#L87)). A criança consegue, portanto, montar pela paleta um projeto que o próprio Estúdio considera inválido. `sz_g3k_start` já foi corrigido durante a auditoria: permanece registrado com `hidden: true` e o gerador o trata apenas como compatibilidade.

Os block audits filtram tudo cujo contrato de migração não seja `keep` (por exemplo [`game-2d/blockAudit.test.ts:167`](../packages/studio/src/official-extensions/game-2d/__tests__/blockAudit.test.ts#L167)), ocultando esse conflito.

**Correção recomendada:** registrar esses blocos como `hidden: true`, conservando desserialização/migração, e adicionar guarda que proíba qualquer bloco visível com migração `unwrap-*` ou `remove-engine-boot`.

### F-03 — HIGH — Há drift real entre o catálogo Blockly e o classificador do IR

**Confiança:** alta. **Impacto:** categoria central de eventos.

`sz_js_on_event_named` é inferido como evento pelo prefixo `sz_js_on_` e conecta em Eventos ([`dom.ts:112`](../packages/studio/src/blockly/blocks/dom.ts#L112), [`blockContracts.ts:124`](../packages/studio/src/blockly/blockContracts.ts#L124)). O builder produz `eventHandler` ([`buildIR.ts:2699`](../packages/studio/src/blockly/buildIR.ts#L2699)), mas `CORE_EVENT_TYPES` não contém esse nó ([`ir/lifecycle.ts:43`](../packages/studio/src/ir/lifecycle.ts#L43)). Resultado: o bloco correto, na área correta, é rejeitado pelo V2.

Esse é o exemplo concreto do risco criado pelas fontes paralelas.

**Correção recomendada:** derivar a classificação do IR do mesmo contrato explícito da definição e adicionar uma guarda exaustiva definição → bloco → IR → área.

### F-04 — HIGH — A migração transparente falha em projetos parcialmente framados

**Confiança:** alta. **Impacto:** compatibilidade de projetos antigos.

Depois de migrar a moldura antiga, `normalizeBlocksStateToFrames` retorna assim que encontra qualquer frame atual ([`normalizeFrames.ts:187`](../packages/studio/src/blockly/normalizeFrames.ts#L187)). Um projeto com, por exemplo, `Estrutura` já criada e statements JS legados soltos deixa esses statements como rascunho; antes eles executavam, depois deixam de executar.

Reprodução confirmada: IR plana antes da normalização contém `consoleLog`; o mesmo estado com `sz_frame_structure` permanece inalterado e a IR framada termina com comportamento vazio.

**Correção recomendada:** migrar por área, não por presença global de qualquer frame; preservar IDs, roots já organizados e pilhas antigas ainda representáveis; adicionar matriz de estados planos, mistos e parcialmente migrados.

### F-05 — HIGH — Excluir uma área real pode apagar o código filho

**Confiança:** alta. **Impacto:** perda de trabalho da criança.

O guard só solta filhos quando remove uma **duplicata** ([`projectAreaGuard.ts:36`](../packages/studio/src/blockly/projectAreaGuard.ts#L36)). Não existe interceptação equivalente para a exclusão normal de uma área. Em workspace headless, `frame.dispose(true)` remove também o bloco filho; ele não vira rascunho.

O teste atual comprova apenas o caso de duplicata ([`projectAreaGuard.test.ts:10`](../packages/studio/src/blockly/__tests__/projectAreaGuard.test.ts#L10)).

**Correção recomendada:** tratar o evento de exclusão da moldura, desconectar a pilha antes do descarte dentro do mesmo grupo de undo e cobrir lixeira, menu, teclado e desfazer.

### F-06 — MEDIUM — O Blockly ganhou travas de contexto, mas o schema ainda aceita IR sintaticamente impossível

**Confiança:** alta. **Impacto:** núcleo e qualquer extensão que compartilhe corpos JS.

Uma alteração concorrente adicionou placements especializados a `break`, `continue`, `return`, `await` e `super` ([`js.ts:237`](../packages/studio/src/blockly/blocks/js.ts#L237), [`oop.ts:76`](../packages/studio/src/blockly/blocks/oop.ts#L76)) e um connection checker que valida a árvore ao ancorá-la numa área ([`htmlConnectionChecker.ts:34`](../packages/studio/src/blockly/htmlConnectionChecker.ts#L34)). Esse caminho da interface agora recusa os casos simples e possui testes próprios.

Porém, o `SZIRV2Schema` continua aceitando diretamente em `behavior.start`:

- `{type: 'break'}` e `{type: 'continue'}`;
- `{type: 'superCall', args: []}`;
- `{type: 'return'}`.

Os três primeiros geram JavaScript inválido fora do contexto; `return` pode abortar o restante do lifecycle. Isso ainda alcança projetos importados, Bridge/IR e qualquer workspace que não use o checker da UI.

**Correção recomendada:** conservar as novas travas físicas e adicionar a mesma validação recursiva ao schema/IR, incluindo função assíncrona, construtor derivado, método derivado e valores dependentes de evento/parâmetro.

### F-07 — HIGH — O Composer de Mundo 3D ainda depende exclusivamente da moldura legada

**Confiança:** alta. **Impacto:** Mundo 3D em projetos novos.

`appendWorldComposerBlock` procura somente `FRAME_BEHAVIOR`, alias legado de `sz_frame_behavior` ([`worldComposerModel.ts:2`](../packages/studio/src/components/blocks/worldComposerModel.ts#L2), [`worldComposerModel.ts:148`](../packages/studio/src/components/blocks/worldComposerModel.ts#L148)).

Projetos novos não têm essa moldura; mesmo depois de a criança criar **Ao iniciar**, a ação retorna `null` e não adiciona o bloco. O teste do modelo não cobre `appendWorldComposerBlock` e não existe E2E do Composer.

**Correção recomendada:** escolher/criar explicitamente a área compatível segundo o contrato do bloco, sem reintroduzir área automática; se a área não existir, mostrar instrução para a criança criá-la.

### F-08 — MEDIUM — O ciclo de vida universal ainda é uma coleção de adapters implícitos

**Confiança:** alta. **Impacto:** reinício, erro e limpeza entre motores.

Não existe `LifecycleAdapter`/`ProjectRunContext` no contrato de extensão ([`extensions/types.ts:75`](../packages/studio/src/extensions/types.ts#L75)). O gerador escolhe envelopes por `switch` ([`generators/js.ts:452`](../packages/studio/src/generators/js.ts#L452)) e cada runtime implementa `runProject`, reinício e limpeza de modo próprio.

Game 2D, GameKit 2D e GameKit 3D já têm mecanismos úteis de fábrica/reinício. Game 3D e Mundo 3D apenas executam a função inicial uma vez ([`game-3d/runtime.ts:2267`](../packages/studio/src/official-extensions/game-3d/runtime.ts#L2267), [`world-3d/runtime.ts:7847`](../packages/studio/src/official-extensions/world-3d/runtime.ts#L7847)). Não há sinal de cancelamento, registro universal de recursos ou política comum de erro/pausa.

**Correção recomendada:** concluir o contrato universal antes de congelar a API pedagógica; fazer cada motor implementar prepare/register/boot/restart/dispose com a mesma semântica observável.

### F-09 — HIGH — A documentação operacional não está atualizada

**Confiança:** alta. **Impacto:** curso, IA e autores de extensão.

Problemas confirmados:

- `packages/studio/CLAUDE.md` ainda ensina três frames, `sz_frame_behavior`, `ir.js`, projeto novo já semeado e layout em uma linha ([`CLAUDE.md:274`](../packages/studio/CLAUDE.md#L274)).
- O guia de extensões ainda exige exemplos contra `SZIRSchema`, sem contrato V2/placement/lifecycle ([`EXTENSIONS.md:55`](../packages/studio/docs/EXTENSIONS.md#L55)).
- Jogo 2D manda usar `Quando o jogo começar`/`onStart` ([`manifest.ts:39`](../packages/studio/src/official-extensions/game-2d/manifest.ts#L39), [`aiSummary.ts:3`](../packages/studio/src/official-extensions/game-2d/aiSummary.ts#L3)).
- Jogo 2D Avançado manda usar `onGameStart` e `start()` manual ([`ai.ts:21`](../packages/studio/src/official-extensions/game-2d-advanced/ai.ts#L21), [`manifest.ts:77`](../packages/studio/src/official-extensions/game-2d-advanced/manifest.ts#L77)).
- Mundo 3D manda terminar com `SZWorld3D.start()` ([`ai.ts:21`](../packages/studio/src/official-extensions/world-3d/ai.ts#L21)).
- A auditoria da galeria afirma que conexões erradas são recusadas, exclusão preserva rascunhos e reinício limpa tudo universalmente ([`example-gallery-audit-2026-07-19.md:18`](../packages/studio/docs/example-gallery-audit-2026-07-19.md#L18)); as reproduções desta revisão contradizem essas afirmações.
- Comentários em `frames.ts`, `buildIR.ts`, `normalizeFrames.ts`, `workspaceState.ts`, `setup.ts` e `toolbox.ts` ainda falam no modelo antigo.

O documento de desenho correto existe em [`2026-07-19-project-behavior-lifecycle-design.md:27`](../docs/plans/2026-07-19-project-behavior-lifecycle-design.md#L27), mas ainda descreve a intenção, não o estado efetivamente entregue.

O Jogo 3D Avançado é a exceção positiva no snapshot final auditado: manifest e contexto de IA já explicam o boot automático ([`manifest.ts:55`](../packages/studio/src/official-extensions/game-3d-advanced/manifest.ts#L55), [`ai.ts:9`](../packages/studio/src/official-extensions/game-3d-advanced/ai.ts#L9)).

**Correção recomendada:** corrigir primeiro os contratos e depois atualizar, na mesma mudança, guia interno, guia de extensões, manifests, contextos de IA, tooltips, comentários e auditoria da galeria. Marcar a pesquisa MakeCode/Scratch como histórica.

### F-10 — MEDIUM — A cobertura E2E não protege os contratos centrais e o gate está instável

**Confiança:** alta.

O smoke atual verifica apenas workspace vazio e presença textual das cinco áreas ([`smoke.spec.ts:155`](../packages/studio/e2e/smoke.spec.ts#L155)). Não cobre:

- criar cada área e impedir duplicatas;
- recusar evento/loop aninhado ou na área errada;
- exclusão segura com rascunho e undo;
- migração parcial;
- blocos legados ausentes da paleta;
- Composer de Mundo 3D;
- navegação por teclado das áreas e disposição em duas linhas.

O E2E canônico terminou uma vez após 52 aprovações porque o servidor Vite saiu com código 255. Em uma execução por arquivos, 74 de 76 passaram e dois cenários falharam sob carga (`Defesa da Torre` não navegou e a Vila do Dragão voltou ao menu); ambos passaram imediatamente isolados. Os outros 21 cenários passaram. Assim, todos os 97 testes foram observados passando, mas o gate canônico não está deterministicamente verde.

**Correção recomendada:** adicionar specs focadas no lifecycle e estabilizar isolamento/limpeza da longa suíte da galeria; manter Vila do Dragão como cenário P0 e investigar vazamento de estado/recursos entre cartões.

## Cobertura por categoria e extensão

| Área | Situação | Observação |
|---|---|---|
| HTML / Estrutura | Correta na divisão | Sem regressão específica encontrada |
| CSS / Aparência | Correta na divisão | Sem regressão específica encontrada |
| Núcleo JS | Parcial | Drift de `eventHandler`; contextos de controle sem trava; `on_load` visível |
| Jogo 2D | Parcial | Roots novos coerentes; wrapper antigo e docs antigas |
| Jogo 2D Avançado | Parcial | Exemplos/RPG V2 corretos; start/onGameStart visíveis e docs antigas |
| Jogo 3D | Melhor situação | Roots coerentes; falta aderir ao adapter universal |
| Jogo 3D Avançado | Parcial | Roots coerentes e boot oculto; ainda usa lifecycle próprio |
| Mundo 3D | Defeito funcional | Roots coerentes; boot manual visível; Composer ainda legado |

## Verificação executada

| Comando/cenário | Resultado |
|---|---|
| `bun run typecheck` | FAIL no snapshot final — 3 erros novos em testes de SVG/NamePicker concorrentes; havia passado antes dessas mudanças |
| `bun test src` | FAIL no snapshot final — 3.957 passaram, 15 falharam, 30.485 expectativas, 271 arquivos; falhas novas concentradas em SVG/FieldNamePicker |
| Testes atuais alterados de Game 3D Advanced | PASS — 66 testes, 610 expectativas |
| Conjunto focal lifecycle + 67 contratos | 116 PASS, 1 FAIL paralelo sobre oferta de `innerHTML` |
| `bunx vite build --config playground/vite.config.ts` | PASS — 1.407 módulos; avisos de chunks grandes |
| `bun run check` | FAIL — 612 arquivos; 8 erros de formatação/imports e 1 warning nas mudanças concorrentes |
| `bun run e2e` | FAIL/FLAKY — 52 passaram antes da saída 255 do servidor |
| E2E em partições + reruns isolados | Todos os 97 cenários foram observados passando; 2 falharam uma vez sob carga |
| E2E focal no snapshot final | PASS — 9/9: áreas vazias, Vila do Dragão, 6 exemplos G3D Advanced e narrow |

Detalhes completos: [`verification-report.md`](behavior-lifecycle-review/qa/verification-report.md).

## Ordem recomendada de correção

1. Tornar o catálogo de placement explícito e único; materializar/validar contextos recursivamente.
2. Esconder wrappers/boots legados e corrigir `eventHandler`.
3. Garantir migração por área e exclusão segura com undo/rascunho.
4. Corrigir o Composer de Mundo 3D.
5. Concluir o contrato universal de lifecycle e recursos.
6. Adicionar os E2Es ausentes e estabilizar a galeria longa.
7. Atualizar toda a documentação e os contextos de IA contra o comportamento final.

## Critério de aceite sugerido

Não considerar a divisão congelada para gravação dos cursos enquanto F-01, F-02, F-04, F-05, F-06, F-07 e F-09 permanecerem abertas e enquanto `check` + E2E canônico não passarem em uma execução limpa.
