# Full review — categorias HTML, CSS, SVG e Canvas

Data: 20/07/2026  
Escopo: `packages/studio`, do catálogo Blockly ao preview no Chromium.  
Natureza: auditoria e correção de causa-raiz.  
Status: **10 de 10 achados corrigidos**.

## Resumo executivo

As quatro categorias têm uma base pedagógica e técnica boa: os blocos estão agrupados por intenção, usam encaixes coerentes com as Áreas do projeto, possuem níveis de aprendizagem, tooltips em português e atravessam IR, geradores, parsers, reconstrução Blockly e source maps. Os testes direcionados também estão verdes.

Mesmo assim, a auditoria encontrou 10 problemas: **3 altos, 6 médios e 1 baixo**. Não há achado crítico nem vulnerabilidade crítica identificada. Os riscos mais importantes são perdas silenciosas de código CSS e falhas de primeiro frame no Canvas. Esses problemas não são apenas hipóteses: foram reproduzidos com o pipeline real.

As três causas arquiteturais dominantes são:

1. declarações CSS ordenadas são representadas por `Record<string, string>`, que não consegue preservar propriedades repetidas, comentários nem a identidade de cada declaração;
2. `<canvas>` é um tipo especial de IR, separado do catálogo de elementos HTML, e por isso seu parser/gerador ficou mais pobre que o HTML comum;
3. os diagnósticos semânticos conhecem seletores CSS e parte do SVG, mas ainda não possuem uma tabela de símbolos compartilhada para ids, telas e pincéis do Canvas.

## Encerramento dos achados

| Achado | Resultado aplicado | Cobertura de regressão |
|---|---|---|
| A-01 | Declarações CSS agora aceitam uma lista ordenada com ocorrências repetidas e mantêm leitura do `Record` legado; comentários e trechos de keyframe não representáveis permanecem como CSS avançado, sem descarte. | Parser, gerador, Blockly, source map e round-trip com propriedades repetidas, comentários e resto inválido. |
| A-02 | O diagnóstico usa uma tabela de símbolos com multiplicidade, tipo do elemento e declarações de tela/pincel; o preview inválido não substitui o último válido e o JavaScript gerado falha com mensagem pedagógica. | Tela ausente, id duplicado, alvo que não é Canvas e pincel redeclarado. |
| A-03 | O IR especial de Canvas passou a aceitar id opcional, atributos extras e filhos; parser, gerador e estado Blockly preservam classe, ARIA, `data-*` e conteúdo alternativo sem inventar id. | Round-trip HTML/IR/Blockly de Canvas com e sem id. |
| A-04 | A ponte de entrada prefere o Canvas que recebeu o evento e guarda esse alvo; o primeiro Canvas é apenas fallback determinístico. | Evento de ponteiro na segunda de duas telas. |
| A-05 | O bloco de Canvas oferece descrição opcional, preservada como alternativa textual e nome acessível. | Geração e round-trip do fallback acessível. |
| A-06 | `label` seleciona o id do controle; `input` modela id, nome, tipo, placeholder, valor e estado marcado; `textarea` modela nome. | Semântica nativa e round-trip de formulários. |
| A-07 | `viewBox`, transformações e caminhos recebem validação estrutural; entradas inválidas conservam o último preview válido. | Quantidade/valores do `viewBox`, aridade de transformações, tokens de path e flags de arco. |
| A-08 | O seletor oferece somente formas reutilizáveis compatíveis, exclui raiz, `defs`, `use` e ancestrais; o diagnóstico detecta alvo incompatível e ciclos. | Coleta contextual e grafo de referências SVG. |
| A-09 | Foi criada uma jornada Chromium montada com os blocos reais de HTML, CSS, SVG e Canvas, incluindo preview, Ponte, reabertura, diagnóstico e layout estreito. | `e2e/html-canvas-blocks.spec.ts`, cinco cenários. |
| A-10 | Documentação e comentários agora descrevem as cinco Áreas, projetos novos vazios, rascunhos e migração transparente. | Revisão documental e checagem Biome. |

As correções foram feitas no contrato compartilhado de cada pipeline, não apenas nos exemplos ou nos sintomas observados. O formato antigo de declarações CSS continua aceito e o Canvas sem id continua sendo HTML válido; portanto, a mudança não exige reescrita de projetos salvos.

## Inventário auditado

| Categoria | Blocos visíveis | Grupos | Distribuição por nível |
|---|---:|---:|---|
| HTML | 24 | 5 | 17 iniciante 2D, 7 intermediário 2D |
| CSS | 52 | 8 | 12 iniciante 2D, 28 intermediário 2D, 12 avançado 2D |
| SVG | 21 | 4 | 10 iniciante 2D, 10 intermediário 2D, 1 avançado 2D |
| Canvas | 54 de 55 | 8 | 12 iniciante 2D, 16 intermediário 2D, 27 avançado 2D |

O 55º bloco de Canvas é um bloco legado de teclado mantido oculto para compatibilidade.

## Evidência da auditoria original

- 19 arquivos de testes direcionados a HTML, CSS, SVG, Canvas, parsers, geradores e ponte de entrada: **231 passaram, 0 falharam, 1.093 asserções**.
- `bun run typecheck`: **passou**.
- Chromium, `e2e/css-learning.spec.ts` e `e2e/svg.spec.ts`: **3 passaram**.
- Sondagem bloco → IR com duas declarações `display`: o IR reteve somente `display: grid` e o id do segundo bloco.
- Sondagem do parser de `@keyframes` com `display:flex; display:grid`: o IR reteve somente `display: grid`.
- Sondagem de `@keyframes` com conteúdo válido seguido de `isto-some`: o parser aceitou o keyframe estruturado e descartou silenciosamente `isto-some`.
- Sondagem HTML com `<canvas id="t" class="responsiva" aria-label="Jogo"></canvas>`: o parser reteve somente `{ type: 'canvas', id: 't' }`.
- Sondagem HTML com `<canvas></canvas>`: o parser inventou o id `tela`.
- Execução do JavaScript de `canvasSetup` apontando para id inexistente: `TypeError` em `null.getContext`.
- Compilação do JavaScript de dois preparos com os nomes padrão: `SyntaxError` por redeclaração de `const canvas`.

## Pontos sólidos

- O catálogo HTML centraliza tags, formato do parser, atributos modelados e regras de encaixe; isso reduz divergências na maior parte do HTML e do SVG.
- O HTML escapa texto e atributos e bloqueia esquemas perigosos em atributos de URL. O CSS também contém validações contra quebra estrutural por chaves em campos simples.
- A importação de regras CSS comuns já reconhece propriedades duplicadas e preserva a regra inteira como CSS avançado. O defeito está nas outras entradas do pipeline e na estrutura do IR, não na ausência completa dessa preocupação.
- SVG oferece `title` e `desc`, além de mensagens pedagógicas e avisos para medidas, raios negativos, pontos e referências ausentes.
- Os blocos Canvas cobrem uma progressão ampla — tela, formas, caminhos, aparência, texto, imagens, transformações, animação e entrada — e os comandos de inicialização recebem contrato de posicionamento.
- A UI estreita do grupo de formas SVG está coberta no Chromium e passou em 375 × 812.

## Achados

### A-01 — Alto — O modelo CSS perde ordem, fallbacks, comentários e identidade de declarações

**Onde:** `src/ir/schema.ts:1286`, `src/ir/schema.ts:1421`, `src/blockly/buildIR.ts:1287`, `src/parsers/css.ts:89`, `src/parsers/css.ts:149`, `src/parsers/css.ts:420`.

`CSSRule.declarations` e cada passo de `KeyframesCSS` usam `Record<string, string>`. Esse formato não representa duas declarações com o mesmo nome, embora isso seja CSS válido e comum para fallback/progressive enhancement. Também não representa comentários intercalados nem um id por ocorrência.

O parser de regras comuns contém uma proteção local: ao detectar duplicatas, guarda a regra inteira como `rawCSS`. Porém:

- dois blocos `sz_css_decl` com a mesma propriedade são reduzidos ao último em `getCssDeclarations`;
- passos de `@keyframes` chamam `parseDeclarations` sem a proteção contra duplicatas;
- o parser de keyframes retorna sucesso quando encontrou ao menos um passo, mesmo que tenha deixado conteúdo inválido não consumido no restante do corpo;
- comentários junto às declarações desaparecem na regeneração estruturada.

**Impacto:** a criança pode montar código visualmente válido e receber CSS semanticamente diferente, sem aviso. Na Ponte, código digitado também pode voltar alterado. Isso viola a promessa de fidelidade bidirecional.

**Correção de causa-raiz:** migrar declarações para uma lista ordenada, por exemplo `{ property, value, __id?, trivia? }[]`, aceitando o `Record` legado na leitura. Enquanto a migração não estiver pronta, qualquer regra ou keyframe que não seja consumido integralmente, contenha duplicata ou comentário não representável deve permanecer inteiro como `rawCSS`, com diagnóstico explícito em vez de perda silenciosa.

### A-02 — Alto — Canvas não valida ids nem declarações antes de gerar JavaScript quebrado

**Onde:** `src/blockly/blocks/canvas.ts:9`, `src/blockly/blocks/canvas.ts:21`, `src/generators/js.ts:1042`, `src/blockly/semanticDiagnostics.ts:47`, `src/blockly/semanticDiagnostics.ts:262`.

O bloco “Preparar tela de desenho” gera `document.getElementById(id)` seguido imediatamente de `.getContext('2d')`. Não há verificação de que:

- o id existe;
- o elemento encontrado é um `<canvas>`;
- ids HTML são únicos;
- o nome do pincel/contexto não foi declarado duas vezes;
- dois blocos de preparo com os valores padrão não redeclaram `const canvas` e `const ctx`.

Os diagnósticos atuais transformam os ids HTML em `Set`, perdendo multiplicidade, e só executam verificações de seletores CSS e SVG. A sondagem reproduziu `TypeError` para tela ausente e `SyntaxError` para dois preparos padrão.

**Impacto:** preview vazio já no primeiro frame, exatamente no caminho iniciante, com erro técnico no console em vez de uma orientação no bloco.

**Correção de causa-raiz:** construir uma tabela de símbolos do projeto com ids DOM, tipos de elemento, declarações de tela e declarações de pincel. Antes de substituir o último preview válido, avisar no bloco sobre id ausente/duplicado, alvo que não é Canvas e nome de pincel duplicado. O runtime gerado também deve falhar com mensagem amigável caso o DOM externo seja alterado.

### A-03 — Alto — O round-trip especial de `<canvas>` apaga HTML válido e inventa id

**Onde:** `src/ir/schema.ts:1196`, `src/parsers/html.ts:332`, `src/blockly/buildIR.ts:1522`, `src/generators/html.ts:239`.

Ao contrário dos outros elementos, `<canvas>` não passa por `collectAllAttrs`. Seu tipo especial de IR exige `id` e só aceita `class`, `width` e `height`. Na importação:

- `class`, `aria-label`, `role`, `data-*` e outros atributos legais são descartados;
- o conteúdo alternativo entre `<canvas>...</canvas>` é descartado;
- um Canvas perfeitamente válido sem id recebe silenciosamente `id="tela"`;
- na volta ao código, o gerador sempre emite id e corpo vazio.

**Impacto:** perda garantida de fidelidade e acessibilidade ao alternar Código/Ponte/Blocos.

**Correção de causa-raiz:** representar Canvas como o elemento HTML comum `tag: 'canvas'`, usando o catálogo e o mecanismo de atributos extras já existentes. Se a separação de tipo for indispensável, tornar `id` opcional, adicionar `attrs` e `children` e preservar todos os atributos/dados no estado Blockly. O preparo de desenho deve exigir ou sugerir um id no ponto em que a referência é realmente necessária, sem reescrever a origem.

### A-04 — Médio — Mouse e toque sempre usam o primeiro Canvas da página

**Onde:** `src/preview/inputBridge.ts:31`, `src/blockly/blocks/canvas.ts:805`.

O bridge de entrada guarda `document.querySelector('canvas')`. Os blocos “x do mouse/dedo” e “y do mouse/dedo” não escolhem tela nem pincel. Num projeto com duas telas, as coordenadas são sempre calculadas a partir da primeira, mesmo que o desenho ou a interação estejam na segunda.

**Impacto:** controles deslocados, escala errada e comportamento aparentemente aleatório em projetos válidos com mais de uma tela.

**Correção de causa-raiz:** ligar explicitamente a entrada a uma tela ativa registrada por `canvasSetup`, ou oferecer um alvo nos blocos de ponteiro. Eventos ocorridos sobre um Canvas devem preferir o `currentTarget`; o fallback global precisa ser determinístico e documentado.

### A-05 — Médio — A categoria Canvas não permite criar alternativa acessível

**Onde:** `src/blockly/blocks/canvas.ts:9`, `src/generators/html.ts:239`, `src/ir/schema.ts:1205`.

O bloco de criação oferece apenas nome/id e classe. Não há descrição acessível, nome da experiência nem conteúdo alternativo; o gerador sempre produz `<canvas ...></canvas>` vazio.

**Impacto:** leitores de tela não recebem nenhuma explicação sobre o desenho ou jogo criado. Para uma ferramenta educacional, a própria categoria ensina uma prática incompleta.

**Correção de causa-raiz:** oferecer uma descrição opcional em linguagem infantil e preservá-la como fallback textual e/ou nome acessível. Para jogos, complementar com orientação para uma região de status e controles equivalentes, sem impor um `role` incorreto a todos os usos de Canvas.

### A-06 — Médio — Os blocos de formulário HTML não completam a semântica nativa

**Onde:** `src/blockly/blocks/html.ts:243`, `src/blockly/blocks/html.ts:304`, `src/blockly/blocks/html.ts:322`, `src/html/catalog.ts:243`.

“Explicar um campo” não oferece `for` nem seletor do id do campo. `input` e `textarea` não oferecem `name`; opções como valor e estado marcado também não são modeladas. É possível associar um `label` aninhando o campo, mas isso não está expresso no texto do bloco e não atende o padrão comum de label e campo irmãos.

**Impacto:** o formulário pode parecer correto e ainda assim não ter rótulo associado nem produzir dados úteis por `FormData`/envio nativo. A criança precisa recorrer a HTML avançado para completar um conceito apresentado como iniciante.

**Correção de causa-raiz:** adicionar `for` com seletor de ids de controles e `name` opcional a campos/áreas de texto; tornar valor/estado disponíveis conforme o tipo de input. O tooltip deve ensinar a alternativa válida de aninhar o campo dentro do label.

### A-07 — Médio — Campos SVG capazes de invalidar o desenho não recebem diagnóstico suficiente

**Onde:** `src/blockly/blocks/svg.ts:30`, `src/blockly/semanticDiagnostics.ts:164`, `src/blockly/semanticDiagnostics.ts:186`.

O `viewBox` inteiro é um campo textual livre. Os diagnósticos do elemento raiz validam somente `width` e `height`; não validam os quatro números do `viewBox`. Transformações também permanecem livres, e a validação de caminho aceita qualquer texto que comece com `M`, inclusive `M` sozinho.

**Impacto:** um pequeno erro de digitação pode recortar, deformar ou fazer o desenho parecer ausente, sem pista visual no bloco.

**Correção de causa-raiz:** validar `viewBox`, `transform` e a gramática mínima de `path`, preservando o último preview válido e mostrando exemplos acionáveis. Para iniciantes, quatro campos numéricos para o mapa interno reduzem erros; a forma textual pode continuar disponível no nível avançado e na Ponte.

### A-08 — Médio — O seletor “forma guardada” oferece referências que não são formas reutilizáveis

**Onde:** `src/blockly/fields/FieldNamePicker.ts:277`, `src/blockly/blocks/svg.ts:69`, `src/blockly/blocks/svg.ts:105`.

`collectSVGReferences` inclui qualquer bloco `sz_svg_*` e também a raiz `sz_html_svg` que possua id. Assim, o menu pode oferecer `defs`, o SVG raiz, outro `use` e até o próprio `use`. Algumas escolhas não renderizam nada; uma autorreferência pode criar ciclo. O diagnóstico atual apenas verifica se o id existe, então considera essas escolhas válidas.

**Impacto:** o menu sugere opções que contradizem o rótulo “forma guardada” e podem resultar em desenho invisível sem aviso.

**Correção de causa-raiz:** tornar a coleta sensível ao tipo e ao bloco consumidor: priorizar `symbol` e elementos gráficos reutilizáveis, excluir `defs`, raiz, o próprio bloco e referências cíclicas. O diagnóstico deve verificar não apenas existência, mas compatibilidade e ciclo.

### A-09 — Médio — A automação cobre o pipeline feliz, mas não executa os blocos HTML/Canvas reais no navegador

**Onde:** `src/blockly/__tests__/canvasPipeline.test.ts:88`, `e2e/css-learning.spec.ts:20`, `e2e/svg.spec.ts:18`, `playwright.config.ts:4`.

A auditoria unitária de Canvas injeta um setup válido para quase todos os casos e compara IR/código/IR; ela não executa o JavaScript gerado. Os E2Es existentes de CSS e SVG começam digitando código na Ponte. Não existe um spec equivalente dedicado ao HTML central nem ao Canvas central, construindo os blocos exatos e inspecionando console/primeiro frame/interação.

**Impacto:** 231 testes direcionados passam enquanto os cenários de id ausente, setup duplicado, segunda tela, perda de atributos e keyframe parcial continuam escapando.

**Correção de causa-raiz:** criar uma matriz de contratos por bloco/categoria que use o caminho real do Estúdio: adicionar Área, arrastar o bloco exato, preencher campos, gerar, abrir preview, verificar console, resultado e round-trip. Casos mínimos de regressão: ids duplicados, Canvas ausente, dois setups padrão, ponteiro na segunda tela, atributos/fallback do Canvas, propriedades CSS repetidas, keyframe malformado e opções inválidas de `<use>`.

### A-10 — Baixo — A documentação ainda descreve três áreas e projeto novo preenchido

**Onde:** `CLAUDE.md:338`, `docs/blocos-pesquisa-makecode-scratch.md:101`, `docs/blocos-pesquisa-makecode-scratch.md:126`, `src/blockly/__tests__/omitEmptyFrames.test.ts:10`, `playwright.config.ts:4`.

Há trechos que ainda falam em três blocos-container, um único Comportamento e projeto novo já preenchido. O modelo atual possui cinco áreas, separa os três ciclos de comportamento, mantém rascunhos fora das áreas e cria projeto novo vazio. O comentário do Playwright também diz que a cobertura profunda está apenas no roadmap, embora já existam fluxos de Ponte.

**Impacto:** professores, mantenedores e futuras revisões podem tomar decisões baseadas no comportamento anterior.

**Correção:** atualizar a documentação canônica e comentários de teste/configuração na mesma alteração que adicionar a nova matriz E2E.

## Plano de correção recomendado

### Prioridade 1 — impedir perda e tela vazia

1. Trocar o modelo de declarações CSS por lista ordenada e adicionar compatibilidade de leitura do IR antigo.
2. Unificar Canvas ao modelo de elemento HTML ou ampliar seu IR para preservar atributos, filhos e id opcional.
3. Criar tabela de símbolos/diagnósticos para ids DOM, Canvas e pincéis; bloquear a troca do preview quando a geração seria inválida.
4. Adicionar testes de regressão para todas as reproduções desta auditoria.

### Prioridade 2 — completar a experiência infantil

5. Definir a tela-alvo do ponteiro.
6. Adicionar descrição acessível ao Canvas.
7. Completar a semântica de formulários com `for` e `name`.
8. Fortalecer validadores e o seletor de referências SVG.

### Prioridade 3 — fechar aceite e documentação

9. Criar E2E por blocos reais para as quatro categorias, incluindo layout estreito.
10. Atualizar documentação das cinco Áreas e dos projetos novos vazios.

## Critérios de aceite sugeridos

- Nenhuma alternância Código → Blocos → Código perde bytes semanticamente relevantes sem converter o trecho inteiro para avançado e avisar.
- Nenhuma combinação disponível na UI gera `SyntaxError`, exceção de primeiro frame ou referência silenciosa à tela errada.
- Canvas preserva atributos e alternativa textual; formulários geram associações e nomes nativos; SVG avisa antes de aceitar valores incompatíveis.
- Cada categoria possui pelo menos um E2E criado pelos blocos, um E2E de Ponte e um caso em viewport estreita.
- Console do preview permanece sem erros e warnings inesperados nos cenários de aceite.

## Arquivos centrais revisados

- `src/blockly/blocks/html.ts`
- `src/blockly/blocks/css.ts`
- `src/blockly/blocks/svg.ts`
- `src/blockly/blocks/canvas.ts`
- `src/html/catalog.ts`
- `src/blockly/buildIR.ts`
- `src/blockly/workspaceState.ts`
- `src/blockly/blockContracts.ts`
- `src/blockly/semanticDiagnostics.ts`
- `src/blockly/fields/FieldNamePicker.ts`
- `src/ir/schema.ts`
- `src/parsers/html.ts`
- `src/parsers/css.ts`
- `src/generators/html.ts`
- `src/generators/css.ts`
- `src/generators/js.ts`
- `src/preview/inputBridge.ts`
- testes unitários direcionados e E2Es de CSS/SVG
