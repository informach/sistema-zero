# Full review — extensão Jogo 2D (`game-2d`)

**Data:** 2026-08-02  
**Alvo:** estado atual do worktree de `packages/studio`  
**Versão do manifesto auditada:** 0.55.3  
**Método:** inventário completo, revisão de contratos/blocos/runtime/exemplos/integrações, busca de usos e código morto, reproduções isoladas, testes Bun, Biome e Playwright.

## Remediação — 2026-08-02

Os dez achados técnicos e de descoberta foram corrigidos no manifesto **0.55.4**:
colisão otimizada, escopo do ponteiro, deduplicação, migração assíncrona, feedback de
carga, descoberta dos exemplos, proteção do runtime composto, DPR, tilemaps e
nomenclatura da Ponte. A recomendação de reduzir/progredir a paleta foi
**explicitamente excluída pela usuária**; os 211 blocos visíveis continuam em
`iniciante-2d` por decisão de produto.

## Resumo executivo

A extensão tem uma base incomumente forte: catálogo e IR possuem guardas exaustivas, o runtime foi dividido por domínio, os 31 exemplos fazem round-trip pelo parser/Blockly e todos os cenários executados no Chromium passaram. Não encontrei código morto de alta confiança, permissões indevidas, rede/eval no runtime ou divergência geral bloco → API.

Ainda assim, há **um bug de correção P1 reproduzido**, **seis riscos/inconsistências P2** e **três melhorias P3**. O mais importante é que a colisão de grupos muda de semântica ao cruzar o limiar de otimização: hitboxes maiores que 100% deixam de detectar contatos quando há pelo menos 2.048 pares potenciais. Para uma ferramenta infantil, os maiores débitos de produto são a apresentação simultânea dos 211 blocos no nível iniciante e uma galeria de 31 exemplos sem dificuldade, conceitos, busca ou percurso sugerido.

### Inventário

- 118 arquivos TypeScript próprios, 48.447 linhas incluindo testes e geradores de fixtures;
- 213 definições de bloco: 211 visíveis e 2 legadas ocultas;
- 24 subcategorias na paleta;
- 212 métodos/valores públicos em `window.SZGame2D`;
- 10 fragmentos de runtime compostos como uma string injetável;
- 31 exemplos: 26 jogos, 4 demos e 1 exploração;
- 41 arquivos de teste próprios.

### Prioridades

| Prioridade | Achado | Confiança |
|---|---|---|
| P1 | Broad phase de grupos ignora a hitbox efetiva e perde colisões acima de 2.048 pares | Alta, reproduzido |
| P2 | Ponteiro é global ao iframe, embora coordenadas e linguagem indiquem o palco/canvas | Alta, reproduzido |
| P2 | Renderer/player não deduplicam extensões e podem injetar o mesmo runtime duas vezes | Alta, reproduzido |
| P2 | `renderProjectToPreviewDoc` mudou de síncrono para assíncrono sem fronteira de migração | Alta, por inspeção |
| P2 | Carga lazy produz estado branco/sem anúncio no player público | Alta, por inspeção |
| P2 | Todos os 211 blocos visíveis são classificados como `iniciante-2d` | Alta, contrato explícito |
| P2 | Os 31 exemplos aparecem em grade única com metadados insuficientes para descoberta | Alta, por inspeção |
| P2 | Runtime em template strings mantém dependências internas fora do typecheck | Alta, arquitetural |
| P3 | Backing store usa DPR bruto, sem teto de dimensão ou orçamento de pixels | Alta, por inspeção |
| P3 | Tilemaps manuais não têm limites de texto, linhas ou colunas no runtime | Alta, por inspeção |
| P3 | Documentação fala em “modo Código” para projeto clássico, que oferece Blocos/Ponte | Alta, por inspeção |

## Achados detalhados

### P1 — Colisão de grupos muda ao entrar a otimização

**Arquivos:**

- `packages/studio/src/official-extensions/game-2d/runtime/worldGroups.ts:339-374`
- `packages/studio/src/official-extensions/game-2d/runtime/worldGroups.ts:386-412`
- `packages/studio/src/official-extensions/game-2d/runtime/sprites.ts:489-521`

`setHitboxScale` permite 10%–300% e `isColliding` usa `_hitboxOf`, como prometido na documentação. Porém `_overlapBroadPhase` indexa `x/y/w/h` crus. Quando `A.length × B.length >= 2048`, pares que só se tocam por uma hitbox expandida são descartados antes do teste exato.

**Reprodução no runtime real:** dois sprites 10×10 em `x=0` e `x=20`, ambos com hitbox 300%.

- grupos 45×45 (2.025 pares, caminho exaustivo): callback = 1;
- grupos 46×46 (2.116 pares, broad phase): callback = 0.

O mesmo jogo, com os mesmos objetos, muda de regra apenas por ganhar outros membros. Isso viola a promessa de que a escala vale para `overlapGroups` e pode tornar moedas/dano intermitentes em jogos densos.

**Recomendação:** construir bounds conservadores com `_hitboxOf` no broad phase. Adicionar um teste de regressão nos dois lados do limiar (45×45 e 46×46), incluindo escalas acima e abaixo de 100%.

### P2 — Clique fora do palco dispara o jogo

**Arquivo:** `packages/studio/src/official-extensions/game-2d/runtime/inputAndMotion.ts:5-70`

O listener fica em `window`. `_canvasEventTarget` só decide foco, `preventDefault` e pointer capture; ele não limita o evento. Assim, `pointer.down` vira `true` e todos os handlers de `onPointer` rodam mesmo quando o alvo é um botão, `body`, outro canvas ou uma UI HTML dentro do iframe. `pointerXY` ainda converte a posição em relação ao palco, podendo devolver coordenadas negativas ou fora da área lógica.

**Reprodução:** disparar `pointerdown` com `target={tagName:'BUTTON'}` resultou em `{ clicks: 1, pointerDown: true }`.

**Recomendação:** decidir e documentar a fronteira. Para semântica de jogo Canvas, aceitar apenas o palco (e, se desejado, a sobra/overlay explicitamente marcada), ignorando controles HTML interativos. Cobrir palco, letterbox, botão e segundo canvas em testes.

### P2 — Snapshot duplicado injeta o runtime duas vezes

**Arquivos:**

- `packages/studio/src/preview/renderProject.ts:38-59`
- `packages/studio/src/components/preview/PreviewIframe.tsx:232-315`
- `packages/studio/src/extensions/runtime.ts:32-35`

O importador e o store normal já deduplicam IDs, mas as fronteiras de renderização confiam na lista recebida. Um `Project` com duas entradas `game-2d` gera duas cópias completas do bootstrap. A segunda sobrescreve `window.SZGame2D`; os listeners da primeira ficam vivos e órfãos.

**Reprodução:**

- uma entrada: 1 ocorrência de `window.SZGame2D`, documento com ~327 KB;
- duas entradas: 2 ocorrências, documento com ~628 KB.

O player público se apresenta como tolerante a snapshots históricos/incompletos, então vale reforçar o invariante nessa última fronteira mesmo que o caminho normal já sanitize.

**Recomendação:** resolver extensões por `Set` preservando a primeira ordem antes de carregar scripts/imports/permissões; adicionar teste em `renderProject.test.ts` e no estado do preview.

### P2 — Mudança assíncrona da API pública precisa de migração explícita

**Arquivos:**

- `packages/studio/src/preview/renderProject.ts:34-37`
- `packages/studio/src/index.ts:68`

Para suportar runtimes lazy, `renderProjectToPreviewDoc` passou de `string` para `Promise<string>`. Todos os consumidores internos encontrados foram atualizados, mas a função está na superfície pública de `@sistemazero/studio`. Um host que atualize o package e ainda use o resultado diretamente como `srcDoc` terá quebra de tipo/execução.

**Recomendação:** tratar como breaking change documentada ou manter uma fronteira compatível: novo nome assíncrono, preloader explícito, ou release coordenado com todos os hosts. Adicionar teste de contrato da superfície pública e nota de migração.

### P2 — Player público fica em branco durante a carga lazy

**Arquivo:** `packages/studio/src/components/preview/StudioProjectPlayer.tsx:35-63`

O player inicia com `srcDoc=''` e limpa o documento novamente sempre que projeto/origem muda. Não há estado `loading`, `aria-live`, skeleton ou fallback visual antes da Promise resolver. Em rede lenta, a criança vê um retângulo branco sem saber se o jogo está carregando. O preview do editor usa um HTML vazio semelhante e a barra continua podendo dizer “Executando”.

**Recomendação:** modelar `loading | ready | error`, mostrar mensagem curta e acessível e manter o jogo anterior até o próximo estar pronto quando a troca não exigir limpeza imediata. Testar Promise pendente e troca rápida de projeto.

### P2 — Progressão global não reduz a paleta do iniciante

**Arquivos:**

- `packages/studio/src/blockly/blockLevels.ts:34-44`
- `packages/studio/src/blockly/blockLevels.ts:231-239`
- `packages/studio/src/official-extensions/game-2d/blocks.ts`

Todo tipo `sz_g2d_*` retorna `iniciante-2d`. Portanto, sem um `allowBlocks` de aula, instalar a extensão expõe 211 blocos e 24 subcategorias no primeiro degrau — inclusive cinco kits de gênero, câmera, tilemap, grupos, música, partículas e IA de gorila. A curadoria por aula funciona e é soberana, mas a experiência standalone e qualquer aula sem lista explícita continuam sobrecarregadas.

Essa é uma decisão de produto registrada, não um acidente. O problema é o custo: o nível global perde capacidade de divulgação progressiva justamente na extensão de entrada para crianças.

**Recomendação:** manter compatibilidade dos tipos, mas introduzir uma paleta “essencial”/progressão por bloco ou uma visualização inicial com 4–6 categorias fundamentais e “ver mais”. `allowBlocks` continua sobrescrevendo tudo nas aulas.

### P2 — Galeria extensa sem percurso de aprendizagem

**Arquivos:**

- `packages/studio/src/extensions/types.ts:100-110`
- `packages/studio/src/projects/KitGallery.tsx:209-251`
- `packages/studio/src/projects/KitGallery.tsx:357-388`
- `packages/studio/src/official-extensions/game-2d/exampleCatalog.ts:35-67`

`ExtensionExample` oferece apenas nome, experiência (`game/demo/exploration`), descrição, IR e assets. A galeria renderiza os 31 cartões do Jogo 2D em uma única grade, sem busca, conceito, gênero, dificuldade, duração ou ordem recomendada. Há três demos realmente mínimas (9–11 nós), enquanto oito jogos têm 310–390 nós; ambos aparecem na mesma camada visual.

**Recomendação:** acrescentar metadados editoriais (`difficulty`, `concepts`, `genre`, `recommendedOrder`, `featured`) e exibir primeiro um percurso curto: “Pegue a moeda” → “Herói que anda” → “Mini plataforma” → “Sala com paredes”. Oferecer busca/filtros e “ver todos” sem remover exemplos.

### P2 — Fragmentos de runtime não recebem typecheck interno

**Arquivos:**

- `packages/studio/src/official-extensions/game-2d/runtime.ts`
- `packages/studio/src/official-extensions/game-2d/runtime/*.ts`
- `packages/studio/src/official-extensions/game-2d/runtimeContract.ts`

Cada domínio exporta uma template string JavaScript. Isso entrega um bootstrap autocontido e lazy, mas as dependências entre fragmentos (`_hitboxOf`, `_finiteNumber`, `_driverGeneration`, `stageW` etc.) são implícitas, ordenadas pela concatenação e invisíveis ao TypeScript. O contrato de 212 membros e os testes de `new Function` cobrem a superfície e a sintaxe; não tipam as chamadas internas nem impedem divergências semânticas entre dois algoritmos — exatamente a classe do bug do broad phase.

**Recomendação:** no médio prazo, manter fonte real tipada e produzir a string como artefato de build. Se isso for inviável, gerar um único arquivo JS com `checkJs`, JSDoc compartilhado e teste de dependências por domínio. Evitar duplicar regras geométricas: expor uma única função de bounds efetivos.

### P3 — DPR e tilemaps não têm orçamento defensivo

**Arquivos:**

- `packages/studio/src/official-extensions/game-2d/runtime/stage.ts:311-325`
- `packages/studio/src/official-extensions/game-2d/runtime/worldTiles.ts:13-104`

`_resizeBacking` multiplica as dimensões CSS pelo `devicePixelRatio` bruto, sem limite de DPR, dimensão máxima ou total de pixels. Em viewport grande/DPR alto isso pode causar alocação excessiva ou ultrapassar limites do canvas. Os testes em DPR 1/2/3 passam, mas não cobrem extremos.

`parseGrid` e `parseSolidList` materializam todo texto recebido e `createTileMap` não limita caracteres, linhas, colunas ou células. O importador limita projetos e metadados, mas chamadas da Ponte/código manual ainda entram diretamente no runtime; os laços internos da extensão não recebem o loop guard do código infantil.

**Recomendação:** limitar DPR/pixels com degradação previsível e avisar uma vez; limitar tilemaps manuais por caracteres/células e truncar/rejeitar com mensagem didática. Reutilizar limites nomeados, não números mágicos.

### P3 — Linguagem da documentação não corresponde ao modo clássico

**Arquivo:** `packages/studio/src/official-extensions/game-2d/manifest.ts:17-20`

O manual diz “Quando você abrir o modo Código”, mas projetos clássicos usam Blocos e Ponte; “Código” é o modo profissional. Isso confunde a promessa pedagógica de ver o JavaScript gerado.

**Recomendação:** trocar por “Quando você abrir a Ponte” ou pela nomenclatura exata exibida na UI.

## Código morto, duplicação e tipos

### Código morto

Nenhum arquivo/export de produção foi classificado como morto com alta confiança.

- `sz_g2d_on_start` e `sz_g2d_draw_hearts` estão ocultos de propósito para desserialização/migração;
- os 17 `__gen_*.ts` são fontes executáveis dos drift tests e compartilham utilitários de `__gen_dinoCorredor.ts`;
- runtime e exemplos entram por `import()` e, portanto, não podem ser julgados apenas por imports estáticos síncronos.

### Duplicação

Não foi encontrada cópia exata de implementação que justifique remoção imediata. Há uma **duplicação conceitual perigosa** na geometria: broad phase calcula AABB cru enquanto o teste final calcula hitbox efetiva. A correção deve consolidar a obtenção de bounds, não apenas repetir a fórmula de escala em outro lugar.

### Tipos

Não há `any`, `@ts-ignore` ou `@ts-expect-error` em produção dentro da extensão. O double cast encontrado está num gerador de fixture e preserva o tipo genérico após remover IDs. O risco de tipo relevante é arquitetural: o conteúdo das strings de runtime não participa do typecheck.

## Pontos fortes preservados

- namespace único `sz_g2d_*` e API global `SZGame2D`;
- manifesto válido, permissões coerentes (`canvas`, `keyboard`, `mouse`, `audio`) e ausência de rede/storage no bootstrap;
- sem `eval`, `new Function`, `document.write` ou carregamento remoto no runtime;
- providers lazy com cache concorrente e retry;
- catálogo/Blockly/IR/gerador/parser cobertos de forma exaustiva;
- ciclo de vida gerenciado, reinício e pausa amplamente testados;
- exemplos com round-trip, playthrough e cenários reais no navegador;
- acessibilidade do canvas/HUD e comportamento em DPR 1/2/3 já possuem boa cobertura.

## Evidência de verificação

| Verificação | Resultado |
|---|---|
| Testes exclusivos `game-2d` | **968 passaram**, 0 falhas, 5.667 asserções, 41 arquivos |
| Biome dirigido | **122 arquivos verificados**, 0 erros |
| Playwright Chromium filtrado | **41 passaram**: 31 exemplos + DPR 1/2/3 + layout estreito |
| Reprodução broad phase | 45×45 → 1 contato; 46×46 → 0 |
| Reprodução ponteiro fora do palco | botão → 1 callback e `pointer.down=true` |
| Reprodução runtime duplicado | 1 cópia ≈327 KB; 2 cópias ≈628 KB |
| Typecheck global do Studio | **Bloqueado fora do escopo** em `src/blockly/deleteContextMenu.ts:67`: `ActionRegistryItem` não existe no Blockly 12.5.1 |

## Ordem recomendada de correção

1. Corrigir broad phase e adicionar regressão no limiar 2.048.
2. Deduplicar IDs nas fronteiras de preview/player e definir o escopo do ponteiro.
3. Formalizar a migração assíncrona e oferecer estado de carregamento acessível.
4. Criar uma camada de progressão/descoberta para paleta e galeria.
5. Adicionar orçamentos de DPR/tilemap e corrigir a nomenclatura do manual.
6. Planejar a geração tipada do bootstrap sem alterar a API infantil.

## Conclusão

O `game-2d` está funcional e bem protegido no caminho normal, mas ainda não deve ser considerado “sem achados abertos”. O bug de colisão é uma quebra real do contrato público; os demais pontos concentram-se nas fronteiras que hoje recebem menos cobertura: snapshots diretos, entrada fora do canvas, carregamento lazy e experiência de descoberta sem aula curada.
