# Revisão completa: sprites de texto e números

Data: 13/09/2026. Escopo: implementação do Jogo 2D 0.80.0, incluindo runtime,
blocos, Blocos ⇄ IR ⇄ Código, migração, exemplos, testes e documentação.

**Estado atual: os seis achados foram corrigidos e verificados.** A seção final
registra as mudanças e as evidências. A revisão original encontrou cinco P2 e um
P3; não identificou P0 ou P1. Os cenários e números de linha abaixo preservam o
estado anterior às correções.

P2 indica defeito funcional que merece correção; P3 indica uma regressão de menor
prioridade, dependente de manipulação específica no modo Código. Confiança alta
em todos os achados: os cenários abaixo foram reproduzidos.

## 1. [P2] A Ponte transforma declarações mutáveis em constantes

Local: `packages/studio/src/official-extensions/game-2d/textCodec.ts:155–158`,
integração em `packages/studio/src/parsers/js.ts:4705`.

O reconhecimento de `createTextSprite` e `spawnTextInGroup` não recebe o tipo da
declaração original. A IR especializada também não o guarda, e o gerador sempre
emite `const`. Assim, código válido que substitui a referência de um sprite deixa
de funcionar depois de passar pela Ponte.

Reprodução com o parser e o gerador reais:

```js
let resposta = SZGame2D.createTextSprite('A', 10, 10);
resposta = SZGame2D.createTextSprite('B', 20, 20);
```

Antes: a referência aponta para B. Depois de `compileStatements(parseJS(source))`:
a primeira linha vira `const resposta = ...`; a segunda lança erro de atribuição
a constante. A execução em Bun retornou `Attempted to assign to readonly property.`

Correção recomendada: conservar a espécie da declaração em todas as conversões,
ou reconhecer o bloco especializado apenas quando ele representar fielmente a
declaração, preservando as demais pela representação genérica existente. Testar
`let`, `var`, reatribuição e criação dentro de laços, incluindo `spawnTextInGroup`.

## 2. [P2] Reutilizar um callback faz outro sprite perder o clique

Local: `packages/studio/src/official-extensions/game-2d/runtime/textSprites.ts:194–195`;
o registro de grupos usa o mesmo padrão em `204–212`.

O identificador padrão vem de `_stableHandlerId`, cuja identidade depende da
função, sem incluir o alvo. Duas inscrições da mesma função para sprites
diferentes produzem a mesma chave no registro compartilhado de ponteiro. A
segunda substitui silenciosamente a primeira.

```js
const a = SZGame2D.createTextSprite('A', 10, 10);
const b = SZGame2D.createTextSprite('B', 210, 10);
let cliques = 0;
const responder = () => cliques++;
SZGame2D.onSpriteClick(a, responder);
SZGame2D.onSpriteClick(b, responder);
```

Depois de desenhar os dois sprites, a reprodução no Chromium teve zero chamadas
ao clicar em A e uma ao clicar em B. Não depende de sobreposição. A mesma causa
se aplica a grupos diferentes que reutilizem a função. Os exemplos atuais usam
funções distintas e não revelam essa falha.

Correção recomendada: a identidade implícita deve considerar tipo do evento,
objeto de destino e callback. Manter a substituição intencional por ID explícito
e a limpeza no reinício. Testar dois alvos com uma função e o registro repetido
da mesma combinação, para evitar tanto perda quanto duplicação de eventos.

## 3. [P2] A Ponte descarta IDs explícitos e duplica ações

Local: `packages/studio/src/official-extensions/game-2d/textCodec.ts:393–405`.

O parser aceita o terceiro argumento de `onSpriteClick`/`onGroupClick`, verifica
que seja texto, mas não o inclui na IR. O gerador cria IDs distintos. Isso muda
a regra documentada do runtime: repetir um ID substitui a inscrição anterior.

```js
const a = SZGame2D.createTextSprite('A', 10, 10);
SZGame2D.onSpriteClick(a, function () { console.log('primeiro'); }, 'mesmo');
SZGame2D.onSpriteClick(a, function () { console.log('segundo'); }, 'mesmo');
```

Antes, apenas `segundo` permanece registrado. Depois da conversão real, os IDs
viram `cliqueSprite` e `cliqueSprite_2`. A reprodução com um registro por ID,
equivalente ao contrato do runtime, executou `primeiro` e `segundo`. Em um jogo,
isso pode somar pontos ou avançar duas vezes depois de editar pela Ponte.

Correção recomendada: preservar o ID como dado semântico, ou conservar como
código os formatos que a IR não representa. Não usar simplesmente o ID Blockly
para representar IDs explícitos repetidos: blocos distintos precisam manter
identidades próprias. Testar equivalência de comportamento, além de estabilidade
textual da segunda geração.

## 4. [P2] Converter para texto deixa o estado da animação automática obsoleto

Local: `packages/studio/src/official-extensions/game-2d/runtime/textSprites.ts:100–105`.

`setSpriteText` limpa `image` e `anim`, mas mantém `_animState`. `autoAnimate`
retorna cedo quando o estado resolvido coincide com esse marcador. O sprite fica
como texto mesmo quando o programa volta a chamar “Animar sozinho” no mesmo
estado. `setImage` e `setShape` já limpam esse marcador na transição equivalente.

Reprodução no Chromium: configurar a animação `parado`, chamar `autoAnimate`,
converter para texto e chamar `autoAnimate` novamente. Resultado: havia animação
antes; depois, `anim` continua nulo e `skin.kind` continua `text`. Na mesma
instância, passar por `setImage` permite à chamada seguinte restaurar a animação.

Correção recomendada: invalidar o estado da animação de maneira consistente nas
transições de aparência. Acrescentar teste animação → texto → animação mantendo
o mesmo estado físico, sem depender de movimento para destravar o sprite.

## 5. [P2] O quiz entregue não permite responder pelo teclado ou ler as opções com tecnologia assistiva

Local: `packages/studio/src/official-extensions/game-2d/__gen_textGames.ts:76–110`;
desenho de texto em `runtime/textSprites.ts`, função `_drawTextSprite`.

Responder e avançar dependem exclusivamente dos callbacks de ponteiro. O único
tratamento de Enter só funciona na cena final. Os textos das alternativas são
desenhados no canvas, sem representação acessível; o HUD acessível recebe a
pergunta e o feedback, mas não as opções nem a ação de avançar.

Reprodução com o JS do exemplo gerado e o runtime reais no Chromium: Tab, Enter,
1, 2, 3, Espaço e setas não alteraram a primeira pergunta. A árvore de
acessibilidade continha apenas a descrição do jogo e `Quanto é 3 + 5?`, sem as
alternativas 6, 8 e 9. Um clique na segunda opção produziu `Acertou!` normalmente.
Não foram emitidos erros de página.

Correção recomendada: oferecer controles de seleção e avanço pelo teclado,
indicar esses controles e disponibilizar opções, seleção e feedback na camada
acessível. Compartilhar a lógica de resposta entre os meios de entrada para
preservar a proteção contra pontuação repetida. Testar uma partida inteira sem
ponteiro e inspecionar os nomes e estados acessíveis.

## 6. [P3] O ajuste de tipagem tornou removíveis os accessors de grupos

Local: `packages/studio/src/official-extensions/game-2d/runtime/worldGroups.ts:145–149`
e `runtime/enemies.ts:120–123`.

Adicionar `items: []` ao objeto antes de `Object.defineProperty` altera o
descritor final. A propriedade do literal começa com `configurable: true`; a
conversão para accessor omite essa opção e conserva o valor. Antes, a propriedade
não existia e o mesmo `defineProperty` a criava com `configurable: false`.

```js
const grupo = SZGame2D.createGroup();
Object.defineProperty(grupo, 'items', { value: [], writable: true });
```

No Chromium, a redefinição agora funciona e remove o accessor. Com o inicializador
anterior, ela falha e o descritor continua não configurável. Atribuições e
mutações posteriores nessa lista deixam de passar pelo rastreamento de revisões,
limites e descarte. O grupo que espelha todos os inimigos sofreu a mesma mudança.

É uma regressão de contrato, não uma alegação de vulnerabilidade: exige código
que remova ou redefina a propriedade. Correção recomendada: declarar
`configurable: false` explicitamente nos dois accessors ou tipar os objetos sem
alterar seus descritores. Testar o contrato dos descritores junto às mutações
suportadas de `items`.

## Arquitetura e cobertura da análise

Examinei os 49 arquivos da implementação no Studio (40 modificados e nove novos)
e o documento de proposta. Alterações simultâneas em outros pacotes e aulas não
integram esta revisão. Os arquivos gerados foram verificados pelos seus dados,
fontes canônicas, referências e testes de round-trip.

| Área | Arquivos examinados |
| --- | --- |
| Modelo, medição e interação | `runtime/textSprites.ts`, `runtime/sprites.ts`, `runtime/stage.ts`, `runtime.ts`, `runtimeContract.ts` |
| Ajustes no runtime existente | `runtime/worldGroups.ts`, `runtime/enemies.ts`, `runtime/worldSystems.ts`, `runtime/classicPlatformer.ts`, `runtime/casualKitsStick.ts` |
| Definição e conversão dos blocos | `textIR.ts`, `textCodec.ts`, `blockCatalogText.ts`, `blockCatalog.ts`, `blockCatalogGroups.ts`, `blocks.ts` |
| Integração com o núcleo | `blockly/buildIR.ts`, `blockly/workspaceState.ts`, `blockly/fields/FieldSpritePicker.ts`, `blockly/migrateValueFields.ts`, `generators/expr.ts`, `generators/js.ts`, `parsers/js.ts` |
| Semântica, escopo e curadoria | `ir/schema.ts`, `ir/lifecycle.ts`, `ir/programmingExecution.ts`, `ir/programmingReferences.ts`, `career/blockProfiles.ts` |
| Exemplos e catálogo | `__gen_textGames.ts`, `examples/textGames.ts`, `exampleCatalog.ts`, `examples.ts`, `scripts/gen-text-games.ts`, `src/examples/qaContracts.ts`, `src/examples/__gen_serverExamplesIndex.ts` |
| Documentação e registro | `ai.ts`, `aiSummary.ts`, `docs.ts`, `index.ts`, `manifest.ts`, `CLAUDE.md`, `docs/game-2d-audit-2026-07-20.md`, proposta em `docs/plans/2026-09-13-studio-text-sprites-design.md` |
| Testes da mudança | `__tests__/textGames.test.ts`, `__tests__/bundle.test.ts`, `__tests__/docDrift.test.ts`, `__tests__/examples.test.ts`, `__tests__/runtimeTypecheck.test.ts`, `blockly/__tests__/valueFieldsMigration.test.ts`, `e2e/text-sprites.spec.ts` |

Caminhos sem prefixo de camada na tabela são relativos à extensão
`packages/studio/src/official-extensions/game-2d`; os demais indicam a camada
correspondente no Studio ou na raiz. Também inspecionei os consumidores existentes
de eventos, animação, grupos, HUD acessível e execução de callbacks.

A separação em runtime, schemas e codec da extensão é adequada. Não identifiquei
novos exports sem consumidor nem nova duplicação de domínio que justifique
remoção no escopo revisado. A integração de escopos e referências inclui os novos
sprites e parâmetros locais dos eventos. Os dados por sprite preservam número,
zero, falso e propriedades especiais. A migração do texto antigo do HUD tem
cobertura específica. Os achados funcionais não exigem reescrever a arquitetura.

Os testes de round-trip atuais demonstram estabilidade dos exemplos canônicos,
mas não cobrem todas as semânticas de entrada do modo Código: os achados 1 e 3
mostram que uma geração estável pode continuar diferente do programa original.
Os testes de clique usam callbacks/IDs que não exercitam o achado 2. Também faltam
testes das transições de animação, acessibilidade do quiz e descritores dos grupos.

## Verificação executada nesta revisão

- **591 testes aprovados, zero falhas** em `textGames.test.ts`,
  `blockAudit.test.ts`, `docDrift.test.ts`, `valueFieldsMigration.test.ts` e
  `generators/__tests__/architecture.test.ts` (4.199 assertions).
- **Oito testes aprovados, zero falhas** em `runtimeTypecheck.test.ts` e
  `bundle.test.ts`, incluindo análise semântica do runtime composto e contrato
  de assinaturas públicas.
- **Typecheck do Studio aprovado**, comando `bunx tsc --noEmit --pretty false
  --incremental --tsBuildInfoFile .cache/text-sprites-clean.tsbuildinfo`, exit 0
  e log vazio nesta execução.
- **Biome aprovado nos 47 arquivos TypeScript da mudança**, sem aplicação de
  correções.
- Reproduções adicionais no **Chromium real** para callbacks, animação,
  descritores de grupo e acessibilidade do quiz; parser/gerador reais para as
  duas perdas de semântica na Ponte.

Total desta revisão: **599 testes existentes aprovados**, além das reproduções
dirigidas. Não reexecutei aqui toda a suíte do monorepo nem os E2E completos da
galeria. A validação anterior da entrega está registrada na proposta; não foi
contada como uma nova execução nesta revisão. A árvore de acessibilidade foi
inspecionada por automação, sem sessão manual de leitor de tela.

Evidências locais em `packages/studio/.cache/`: `review-text-contracts.log`,
`review-text-runtime-contracts.log`, `review-text-typecheck.log`,
`review-text-lint.log`, `review-text-sprites-results.log` e
`review-text-codec-results.log`. Os scripts de reprodução estão em
`review-text-sprites.ts` e `review-text-codec.ts`. Esses arquivos são temporários;
este relatório preserva os cenários e resultados necessários para correção.

## Correções concluídas em 13/09/2026

| Achado | Correção aplicada | Evidência de regressão |
| --- | --- | --- |
| 1. Declarações mutáveis | `declarationKind` preserva `let` e `var` no parser, schema, gerador e dados serializados do Blockly. A análise de escopo respeita `var` dentro de laços sem deixar nomes de callbacks e funções escaparem. | Reatribuição com os dois criadores; salvar/reabrir; variável declarada em laço; rejeição de referências fora de escopo. |
| 2. Callback compartilhado | Identidade implícita por alvo, tipo do evento e função; IDs explícitos têm namespace próprio. O domínio de texto limpa seu estado no reinício. | Uma função atende dois sprites e dois grupos, com registros repetidos; um ID explícito que se parece com o implícito não substitui outra inscrição; reiniciar remove os eventos. |
| 3. IDs perdidos na Ponte | `eventId` é um campo semântico separado de `__id`, preservado inclusive quando repetido ou vazio. A geração reserva IDs explícitos para não reutilizá-los em eventos novos. | Persistência pelos blocos e execução antes/depois da Ponte no runtime real, para sprites e grupos; apenas o callback substituto executa. |
| 4. Animação obsoleta | `setSpriteText` invalida `_animState`, com o campo descrito no contrato TypeScript. | Animação → texto → animação no mesmo estado recupera a spritesheet original. |
| 5. Quiz inacessível | Teclas 1/2/3 e Enter compartilham funções com clique/toque. Alternativas têm números visíveis; o runtime publica textos visíveis no HUD acessível. O feedback informa a resposta correta em texto. | Duas partidas completas só com teclado, sem pontuação repetida; opções e feedback na árvore de acessibilidade; remoção dos textos da pergunta anterior e reinício. |
| 6. Accessors de grupos | `configurable: false` explícito nos grupos comuns e na vista de inimigos. | Remoção e redefinição recusadas, enquanto a substituição normal da lista continua atualizando a revisão. |

Os dropdowns de eventos e leitura de teclas agora oferecem os dígitos 0–9. Isso
permite que os controles do quiz atravessem a Ponte e a reabertura do workspace.
Os exemplos e o índice do servidor foram regenerados. O manual foi condensado
para continuar dentro do limite de 60.000 caracteres, com as instruções novas.

Verificação final, após as correções:

- **3.536 testes aprovados, zero falhas**, em 225 arquivos, com 86.606 assertions.
  Escopo: Jogo 2D, IR, geradores, parsers e Blockly.
- **11 cenários Chromium aprovados** sobre o build final, incluindo galeria,
  Ponte, recarga do projeto, duas partidas por teclado, clique/toque, 100 números,
  dados, layout, câmera, animação e grupos.
- **Typecheck completo do Studio aprovado** com `tsc --noEmit`; cache específico
  desta correção e nova execução após as últimas mudanças.
- **Biome aprovado nos 51 arquivos TypeScript alterados**, sem correções pendentes.
- Build de produção para E2E concluído e `git diff --check` sem erros.

Os testes novos estão em
`packages/studio/src/official-extensions/game-2d/__tests__/textSpriteCodec.test.ts`
e `packages/studio/e2e/text-sprites.spec.ts`. Evidências finais em
`packages/studio/.cache/fix-text-regression-final.log`,
`fix-text-browser-final.log`, `fix-text-typecheck-final.log` e
`fix-text-lint-final.log`. A acessibilidade foi validada por teclado e árvore
acessível no Chromium, sem sessão manual de leitor de tela.
