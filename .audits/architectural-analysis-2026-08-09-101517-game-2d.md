# Full review arquitetural — Jogo 2D (`game-2d`) v0.67.0

**Data:** 2026-08-09 10:15 BRT  
**Estado analisado:** branch `staging`, commit `b0f8595e`  
**Escopo principal:** `packages/studio/src/official-extensions/game-2d` e integrações de IR, Blockly, gerador, catálogo, preview e exemplos  
**Veredito após remediação:** **LIBERÁVEL no escopo revisado; AA-G2D-01 a AA-G2D-08 corrigidos e verificados**

## Resumo executivo

A extensão tem uma base forte: contrato público tipado, manifest validado cedo, carregamento lazy de exemplos/runtime/IA, fragmentos de runtime por domínio, round-trip dos exemplos e uma suíte específica extensa. Não encontrei módulo morto comprovado, ciclo de importação, `any`/supressão TypeScript em produção, rede ativa nem avaliação dinâmica dentro do código de produção da extensão.

O review encontrou sete problemas acionáveis, e um oitavo foi relatado durante a remediação. O bloqueante era uma contradição nova entre o bloco **Animação dos inimigos do tipo no estado...** e o lifecycle: o bloco passou a ter raiz obrigatória em **Meus moldes**, mas a folha que ele consome só pode nascer em **Ao iniciar**. A própria validação recusava essa combinação; se ela fosse contornada, o JavaScript gerado referenciava a `const` antes da inicialização. Projetos antigos com esse bloco também eram migrados para a combinação inválida.

O segundo risco alto era de compatibilidade: a migração movia ajustes de tipo para uma seção executada antes de todo o `Ao iniciar`, alterando silenciosamente a lógica relativa a inimigos já soltos. Os demais problemas estavam no runtime de áudio e grupos, além de tooltips que mandavam a criança usar uma área recusada pelo próprio Blockly. Todos foram corrigidos; o fechamento e as evidências novas estão registrados ao fim deste documento.

A quantidade de blocos liberados por nível foi deliberadamente excluída, conforme solicitado.

| ID | Prioridade | Achado | Confiança |
|---|---:|---|---:|
| AA-G2D-01 | P1 — bloqueante | Animação de estado do inimigo não tem composição raiz válida e quebra a migração de projetos salvos | Alta |
| AA-G2D-02 | P1 | Migração para moldes muda silenciosamente a ordem e a semântica de projetos existentes | Alta |
| AA-G2D-03 | P2 | Apelidos perigosos de áudio furam os mapas internos e deixam som sobreviver ao reinício | Alta |
| AA-G2D-04 | P2 | O mesmo sprite em dois grupos colide consigo próprio | Alta |
| AA-G2D-05 | P2 | O teto rígido de 400 itens é contornável pela API pública `group.items` | Alta |
| AA-G2D-06 | P2 | Cinco tooltips ensinam uma área que o Blockly recusa | Alta |
| AA-G2D-07 | P3 | Leitura de `group.items.toString()` é tratada como mutação | Alta |

---

## Escopo e inventário

- 127 arquivos TypeScript e 55.601 linhas no diretório da extensão.
- 63 arquivos de produção/suporte, 36.518 linhas; 47 arquivos de teste, 16.230 linhas; 17 fontes geradoras, 2.853 linhas.
- 22 fragmentos/arquivos de runtime, 7.490 linhas.
- 32 exemplos oficiais.
- 232 métodos/chaves no contrato público `SZGame2D`.
- Bootstrap composto: 383.623 caracteres, 385.712 bytes UTF-8 e 134.848 bytes gzip.
- Manifest corrente: v0.67.0.

Foram acompanhados os caminhos principais:

1. registro oficial → `game-2d/index.ts`;
2. manifest/catálogos → definições Blockly e toolbox;
3. Blockly → IR → schema/normalização;
4. IR → JavaScript → parser/round-trip;
5. bootstrap do preview → runtime composto → contrato público;
6. catálogo lazy → 32 exemplos → smoke/round-trip;
7. migração de workspaces salvos para as quatro áreas de lifecycle.

---

## Achados detalhados

### AA-G2D-01 — P1 bloqueante — Animação de estado do inimigo não tem composição raiz válida

**Evidência**

- `blockCatalogInteraction.ts:196-197` mantém `sz_g2d_load_spritesheet` como `start-only-command`.
- `blockCatalogInteraction.ts:397-398` tornou `sz_g2d_enemy_state_anim` um `mold-command`.
- `ir/lifecycle.ts:238-252` ainda documenta corretamente que cargas ficam em **Ao iniciar** e que `g2d:enemyStateAnim` deve ficar fora de moldes porque consome a folha carregada depois.
- Apesar disso, `ir/lifecycle.ts:304-308` inclui `g2d:enemyStateAnim` em `MOLD_NESTABLE_STATEMENT_TYPES`.
- `ir/schema.ts:11249-11277` recusa moldes que referenciam nomes criados em **Ao iniciar**. O teste em `blockly/__tests__/moldsArea.test.ts:369-399` prova exatamente que `enemyStateAnim` em moldes + `loadSpritesheet` no início é inválido.
- `blockly/normalizeFrames.ts:415-436` migra raízes antigas para a área canônica, mas só ergue dependências que também podem viver em moldes; a carga da folha não pode subir.
- Se uma rota contornar o schema, `generators/js.ts:346-371` emite moldes primeiro, enquanto `generators/js.ts:1275-1277` declara a folha com `const` e `generators/js.ts:1292-1293` a consome. O resultado é uma referência na temporal dead zone.
- `runtime/lifecycle.ts:215-224` captura o erro e remove o handler de **Ao iniciar**, impedindo novas execuções desse setup.

**Impacto**

- A composição normal oferecida pela UI não pode ser validada nem executada como raiz.
- Um projeto antigo válido com folha + animação de estado pode deixar de abrir/validar depois da migração automática.
- Rotas que aceitem IR não validada chegam a `ReferenceError` e perdem o handler de inicialização.
- O teste novo de migração usa blocos vazios e prova apenas placement/partição; ele não monta a dependência real de uma folha.

**Recomendação**

Retirar `g2d:enemyStateAnim` da área canônica de moldes e preservar sua raiz em **Ao iniciar**, mantendo apenas o uso aninhado onde ele for semanticamente válido. Isso está alinhado à regra já documentada em `lifecycle.ts`. Como alternativa, seria necessário tornar `loadSpritesheet` uma declaração válida em moldes e migrá-la junto, mas essa opção conflita com a distinção pedagógica atual de que carregar recursos é preparação da partida.

Adicionar três regressões:

1. workspace real com `load_spritesheet` + `enemy_state_anim`;
2. migração de um workspace antigo com os dois blocos e `SZIRV2Schema.safeParse` bem-sucedido;
3. geração e execução do `onStart`, não apenas inspeção da partição.

### AA-G2D-02 — P1 — Migração muda a semântica de projetos salvos

**Evidência**

- `ir/behavior.ts:90-97` retira do `start` todo statement cuja área canônica virou `molds` e o anexa à seção de moldes.
- `blockly/normalizeFrames.ts:415-436` faz o mesmo na serialização de workspaces antigos.
- `generators/js.ts:346-371` executa toda a seção de moldes antes de qualquer statement restante em **Ao iniciar**.
- `enemyMolds.test.ts:147-163` exige que `enemyAddBehavior` e `setEnemyTypeParam` sejam movidos, mas só verifica a ordem relativa dentro das novas partições.

Um projeto antigo podia expressar legitimamente:

```text
criar tipo com vida 1
soltar inimigo fraco
ajustar a vida dos próximos para 10
soltar inimigo forte
```

Depois da normalização, o ajuste roda antes dos dois spawns. Os dois inimigos passam a nascer com vida 10. O tooltip do próprio parâmetro afirma que a vida vale apenas para os que nascerem dali em diante, portanto a ordem é parte observável do contrato.

**Impacto**

Projetos persistidos podem mudar dificuldade, ondas e progressão sem erro e sem ação da criança. A transformação preserva a ordem *dentro de cada área*, mas não preserva a ordem causal entre statements que foram separados.

**Recomendação**

Não reclassificar automaticamente statements publicados quando a mudança altera a ordem observável. Opções seguras:

- manter a forma antiga em `start` por uma versão legada do IR/placement;
- migrar somente projetos em que uma análise prove que não há statement observável entre definição e ajuste;
- introduzir uma migração versionada que preserve as duas fases/ordem original;
- se o produto aceitar a quebra, pedir confirmação explícita e registrar telemetria/inventário dos projetos atingidos.

Adicionar um golden de compatibilidade com dois spawns separados por `setEnemyTypeParam('vida', ...)`.

### AA-G2D-03 — P2 — Apelidos perigosos de áudio quebram isolamento e reinício

**Evidência**

`runtime/audio.ts:285-295` cria `_clips`, `_clipSrc` e `_clipWaiting` com `{}`. As chaves vêm diretamente de `_clipKey(name)` (`audio.ts:305-307`) e são acessadas por indexação em `audio.ts:308-371`. O reset só percorre propriedades próprias e recria objetos literais (`audio.ts:397-405`).

Isso torna `constructor`, `toString` e `__proto__` especiais:

- `playClip('constructor')` encontra `Object.prototype.constructor` e não emite o aviso de som não carregado;
- atribuir `_clips['__proto__'] = audio` muda o protótipo do mapa em vez de criar uma entrada própria;
- `_resetClips()` não visita esse áudio e não o pausa.

Probe no runtime composto:

```json
{
  "dangerousWarnCount": 0,
  "ordinaryWarnCount": 1,
  "instances": 1,
  "wasPlaying": true,
  "pausedAfterRestart": false,
  "pauseCallsAfterRestart": 0
}
```

**Impacto**

Um apelido permitido pelo campo de texto pode deixar uma trilha tocando depois de reiniciar e produzir diagnósticos incorretos. O runtime já usa `Object.create(null)` em outros mapas expostos a nomes (`MUSIC_TUNES`, timers, handlers e shapes), então o comportamento é inconsistente.

**Recomendação**

Inicializar e reinicializar os três mapas com `Object.create(null)` ou usar `Map`. Verificar também `SOUNDS` com `hasOwnProperty`, porque um mapa de assets com protótipo normal tem o mesmo problema para nomes herdados. Cobrir `constructor`, `toString` e `__proto__` em carregar, tocar, parar, pausar e reiniciar.

### AA-G2D-04 — P2 — Sprite compartilhado entre grupos colide consigo próprio

**Evidência**

- `runtime/worldGroups.ts:8-36` suporta explicitamente um sprite pertencendo a mais de um grupo.
- `runtime/worldGroups.ts:448-494` evita pares idênticos somente quando `a === b`; para grupos distintos não existe guarda `ai === bj`.
- `runtimeContract.ts:86` expõe `items`, e `addToGroup` permite a associação legítima a grupos diferentes.

Probe no runtime real: um sprite adicionado a `a` e `b`, seguido de `overlapGroups(a, b, callback)`, chamou o callback uma vez com o mesmo objeto nos dois argumentos.

**Impacto**

Grupos semânticos sobrepostos — por exemplo, “atores” e “aliados” — podem disparar dano, pontuação ou remoção por uma colisão impossível consigo próprios.

**Recomendação**

Pular o par quando `ai === bj`, tanto no caminho ingênuo quanto na fase ampla. Adicionar cobertura para membro compartilhado, inclusive com listas grandes que ativem `_overlapBroadPhase`.

### AA-G2D-05 — P2 — O teto de 400 itens é contornável por `group.items`

**Evidência**

- `runtime/worldGroups.ts:6` declara `MAX_GROUP = 400` e o comentário promete teto rígido contra vazamento de memória.
- `spawn`, `spawnBullet` e `addToGroup` verificam o teto (`worldGroups.ts:184-195`, `353`).
- Porém `runtimeContract.ts:86` publica `items: TSprite[]`, e o Proxy em `worldGroups.ts:58-123` aceita `push`, atribuição por índice, mudança de `length` e substituição integral sem aplicar o teto.

Probe: 401 chamadas diretas a `group.items.push(createSprite(...))` terminaram com `rawLength: 401`.

**Impacto**

O modo Código consegue contornar justamente a defesa destinada a loops acidentais. Substituir `items` por um array muito grande também força snapshots e `Set`s proporcionais em travessias/colisões.

**Recomendação**

Aplicar o limite no Proxy e no setter de `items`, com semântica documentada para métodos que adicionam vários itens (`push`, `unshift`, `splice`, `fill`). Cobrir os caminhos diretos da API pública, não apenas helpers.

### AA-G2D-06 — P2 — Tooltips mandam usar uma área recusada

**Evidência**

Em `blockCatalogInteraction.ts`, os placements são de moldes, mas os tooltips continuam ensinando **Ao iniciar**:

- grupo de todos os inimigos: `314-323`;
- criar tipo: `326-350`;
- criar tipo inteligente: `356-378`;
- somar comportamento: `381-394`;
- ajustar parâmetro: `431-463`.

O manifest já ensina **Meus moldes** em `manifest.ts:454-456` e `571`, e os testes confirmam que o Blockly recusa essas raízes em **Ao iniciar**.

**Impacto**

A ajuda contextual instrui exatamente uma ação que a interface impede. Para uma criança, isso parece defeito de encaixe e não documentação desatualizada.

**Recomendação**

Atualizar as cinco mensagens e adicionar um teste de drift entre `placement` e vocabulário de área dos tooltips. Para os blocos aninháveis, explicar separadamente: raiz em **Meus moldes**; dentro de evento/laço quando a dificuldade muda durante a partida.

### AA-G2D-07 — P3 — Leitura de array é marcada como mutação

**Evidência**

`runtime/worldGroups.ts:63-80` cria `mutatingMethods` com objeto literal e consulta `mutatingMethods[property]` sem checar propriedade própria. Logo, métodos herdados como `toString`, `valueOf` e `hasOwnProperty` são considerados mutantes quando também existem no array.

Probe:

```json
{ "before": 1, "after": 2 }
```

O único passo entre os valores foi `String(group.items)`.

`runtime/enemies.ts:77-97` já documenta e resolve o mesmo problema no espelho de inimigos usando `Object.create(null)`. Há duplicação conceitual dos wrappers de Proxy e uma das cópias ficou para trás.

**Impacto**

Leituras benignas invalidam revisões e forçam reconstrução de caches de pertencimento durante travessias. O resultado funcional costuma continuar correto, mas há trabalho extra e sinais falsos de mutação.

**Recomendação**

Trocar o mapa por `Object.create(null)`, `Set` ou `hasOwnProperty`. Extrair a lista/guarda compartilhada com o Proxy de inimigos para impedir novo drift.

---

## Arquitetura e qualidade

### Pontos aprovados

- Entry point pequeno e declarativo; runtime, exemplos e contexto de IA são lazy.
- Manifest é validado ao importar a extensão.
- Catálogo canônico alimenta a definição Blockly e há auditoria de wiring/round-trip.
- Contrato público possui inventário único e teste de assinatura.
- Runtime foi dividido em fragmentos por responsabilidade; lifecycle usa registro de domínios para reset/pause/resume.
- Mapas de handlers, timers, shapes e HUD usam estruturas resistentes a nomes perigosos.
- Não foram encontradas chamadas de rede, storage interno, `eval` ou `new Function` no código de produção da extensão.
- Não foram encontrados `any`, `@ts-ignore` ou `@ts-expect-error` em produção no escopo.
- Os 17 geradores `__gen_*` têm referências em testes/drift; não são arquivos órfãos.

### Código morto e ciclos

- Arquivos mortos comprovados: **0**.
- Ciclos relativos comprovados: **0**.
- Exports seguramente removíveis: **0 identificados**.

`examples.ts` não participa do entry point lazy, mas é consumido por testes de parser como barrel de fixtures. Os `__gen_*` são fontes de verdade para drift dos exemplos. Portanto removê-los como “não importados em produção” seria incorreto.

### Duplicação e coesão

A duplicação mais relevante é a instrumentação de arrays via Proxy em `worldGroups.ts` e no espelho de inimigos em `enemies.ts`. O bug AA-G2D-07 demonstra drift real entre as duas implementações.

Arquivos grandes permanecem concentrados em dados/testes/exemplos. O maior hotspot de produção é `runtime/enemies.ts` (1.482 linhas), seguido por catálogos extensos. Não há evidência suficiente para recomendar divisão puramente por tamanho; a prioridade deve ser extrair invariantes compartilhados e reduzir o contrato espalhado de lifecycle.

### Tipos e runtime composto

O TypeScript do pacote é `strict`, mas o runtime educacional é composto como uma string JavaScript. O teste semântico deliberadamente usa `noImplicitAny: false` e limita a dívida a 893 parâmetros (`runtimeTypecheck.test.ts:53`, `239-243`). Essa proteção encontra nomes/propriedades ausentes, mas não executa dependências temporais entre seções; AA-G2D-01 é o exemplo concreto dessa lacuna.

Recomendação estrutural de médio prazo: manter fragmentos legíveis para o aluno, mas gerar a string a partir de módulos internos tipados/compilados ou, no mínimo, adicionar smoke de execução para cada bloco raiz que consome uma declaração de outra categoria.

### Payload

O bootstrap passou de 111.334 bytes gzip no review da v0.57.1 para 134.848 bytes gzip na v0.67.0, crescimento de aproximadamente 21%. O loader ainda exige o runtime inteiro antes do projeto. Não foi medida regressão de tempo neste review, portanto isso é risco de monitoramento, não defeito comprovado. Recomenda-se budget automático de tamanho e tempo de parse/boot em dispositivo modesto.

---

## Riscos herdados já aceitos anteriormente

Este review não reabre decisões já documentadas no relatório da v0.57.1:

- remoção do bloco publicado `updateGroupNoGravity`, aceita após inventário sem exposição;
- mudança para gravidade explícita, aceita após inventário sem exposição;
- bootstrap único do runtime, restrição atual do loader.

A nova migração de moldes não possuía, no momento do review, a mesma evidência de inventário/aceite. A remediação posterior preservou a ordem publicada por variantes internas de compatibilidade e encerrou AA-G2D-02.

---

## Verificação executada

| Verificação | Resultado |
|---|---|
| Testes exatos de `game-2d` | **1.256 PASS / 0 FAIL**, 6.740 expects, 46 arquivos |
| Moldes + catálogo lazy + typecheck do runtime | **58 PASS / 0 FAIL** |
| TypeScript do Studio (`bun run typecheck`) | **PASS** em 143,9 s |
| Biome focado (`game-2d` + IR/normalização/gerador) | **130 arquivos, PASS** |
| Probe folha/animação | Schema rejeita a combinação; JS sem validação gera uso antes da `const` |
| Probe de áudio perigoso | Reproduzido; áudio em `__proto__` continuou após restart |
| Probe de grupos compartilhados | Reproduzido; 1 callback de autocolisão |
| Probe do teto público | Reproduzido; `items.length` chegou a 401 |
| Probe de leitura/revisão | Reproduzido; `String(items)` incrementou `_revision` |
| E2E galeria `game-2d:` | **INCONCLUSIVO**: porta padrão ocupada; nova porta ficou 5 min sem saída e atingiu timeout |
| Falha ampla fora do escopo | Um timing de pathfinding em `game-2d-advanced` falhou na rodada ampla e passou isoladamente (1/1) |

Observação: `bun test src/official-extensions/game-2d` também casa com `game-2d-advanced`; por isso a suíte exata foi executada enumerando apenas os 46 arquivos de `game-2d/__tests__`.

---

## Ordem recomendada original de correção

1. Corrigir a classificação/migração de `enemyStateAnim` e adicionar o teste de execução com folha real.
2. Decidir e implementar compatibilidade para a reordenação de `setEnemyTypeParam`/`enemyAddBehavior` em projetos salvos.
3. Endurecer os mapas de áudio e provar reset com nomes perigosos.
4. Corrigir autocolisão entre grupos distintos e aplicar o teto na API pública de `items`.
5. Atualizar tooltips e adicionar drift semântico de placement.
6. Unificar a guarda de métodos mutantes dos Proxies.
7. Reexecutar a galeria E2E em porta livre, Chromium e Firefox, antes da liberação.

## Fechamento da remediação — 09/08/2026

| ID | Situação | Correção verificada |
|---|---|---|
| AA-G2D-01 | Resolvido | A animação de estado voltou a ter raiz em **Ao iniciar**, depois da folha. Um workspace antigo real migra, valida, gera JavaScript e executa na ordem correta. |
| AA-G2D-02 | Resolvido | Dois tipos internos e ocultos preservam `setEnemyTypeParam` e `enemyAddBehavior` no ponto original de projetos antigos. O golden com dois spawns mantém a ordem também no round-trip pelo modo Código. |
| AA-G2D-03 | Resolvido | Os mapas de clips usam protótipo nulo, `SOUNDS` exige propriedade própria e o reset pausa e descarta áudio mesmo com `constructor`/`__proto__`. |
| AA-G2D-04 | Resolvido | `overlapGroups` ignora o mesmo objeto compartilhado por grupos diferentes. |
| AA-G2D-05 | Resolvido | Proxy, setter, índices, `length` e métodos públicos respeitam `MAX_GROUP = 400`. |
| AA-G2D-06 | Resolvido | Os cinco tooltips usam a área real; a animação explica a dependência da folha no início. |
| AA-G2D-07 | Resolvido | Grupos e espelho de inimigos compartilham uma única guarda de mutações com protótipo nulo; leituras não alteram revisão. |
| AA-G2D-08 | Resolvido | Achado durante a remediação: nomes declarados em **Meus moldes**, inclusive o grupo com todos os inimigos, agora aparecem nos seletores de início, eventos e laços. |

### Evidência após as correções

| Verificação | Resultado |
|---|---|
| Escopo direto da remediação | **547 PASS / 0 FAIL**, 3.331 asserções, 6 arquivos |
| Suíte exata de `game-2d` | **1.266 PASS / 0 FAIL**, 6.767 asserções, 48 arquivos |
| Suíte completa do Studio no estado compartilhado final | **6.954 PASS / 0 FAIL**, 75.280 asserções, 455 arquivos |
| TypeScript do Studio (`bun run typecheck`) | **PASS** no estado compartilhado final, em 175,1 s |
| Biome nos arquivos da remediação | **17 arquivos, PASS**, sem correções pendentes |
| E2E de lifecycle, Chromium + Firefox | **16 PASS / 0 FAIL** |
| E2E combinado de lifecycle + smoke | **47 PASS / 1 falha fora do escopo**: o terminal WebContainer não abriu no Firefox; todos os cenários de blocos e lifecycle passaram |

## Disposição final

Os oito achados do full review foram corrigidos sem reverter as mudanças da seção paralela. Projetos novos usam as áreas canônicas; projetos antigos preservam a ordem causal publicada. O runtime fecha as quatro falhas de robustez, a documentação acompanha o encaixe real e os seletores enxergam declarações de **Meus moldes**. A extensão e a suíte global do Studio estão verdes. No E2E combinado, resta somente a falha do terminal WebContainer no Firefox, fora do caminho de `game-2d`; todos os cenários de blocos e lifecycle passaram.
