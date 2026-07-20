# Full review — categorias HTML, CSS, SVG e Canvas

Data: 20/07/2026  
Escopo: `packages/studio`, do catálogo Blockly ao preview no Chromium.  
Natureza: auditoria, correção histórica e revalidação residual do estado atual.
Status: **encerrado — os 14 achados anteriores e as 10 lacunas da reabertura foram corrigidos e revalidados**.

## Resumo executivo

As quatro categorias têm uma base pedagógica e técnica boa: os blocos estão agrupados por intenção, usam encaixes coerentes com as Áreas do projeto, possuem níveis de aprendizagem, tooltips em português e atravessam IR, geradores, parsers, reconstrução Blockly e source maps. Os testes direcionados também estão verdes.

Na auditoria original foram encontrados 10 problemas: **3 altos, 6 médios e 1 baixo**. Naquele recorte não havia achado crítico. Os riscos mais importantes eram perdas silenciosas de código CSS e falhas de primeiro frame no Canvas; todos foram reproduzidos com o pipeline real e corrigidos no ciclo registrado abaixo.

Uma revisão residual depois das dez correções encontrou mais quatro lacunas: raios negativos capazes de interromper o Canvas, sanitização segura porém silenciosa em HTML/CSS e semântica/foco incompletos nos seletores infantis de cor, assets e pintura SVG. Todas também foram reproduzidas, cobertas e encerradas.

Uma nova revalidação sobre o worktree de 20/07/2026 encontrou **10 lacunas adicionais: 1 crítica, 6 altas e 3 médias**. A mais grave fazia os blocos de teclado e ponteiro do Canvas funcionarem no preview, mas quebrarem no site exportado, no ZIP de fonte e na conversão para o modo profissional. Os dez achados foram corrigidos na causa compartilhada de cada pipeline e estão detalhados em “Reabertura — encerramento”.

As três causas arquiteturais dominantes encontradas originalmente foram:

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
| A-11 | Raios Canvas literais negativos bloqueiam o preview com aviso no bloco; valores dinâmicos recebem explicação infantil no console sem alterar o JavaScript ou o round-trip. | Cinco operações Canvas e duas mensagens nativas reais de Chromium. |
| A-12 | Diagnóstico e geradores compartilham o mesmo contrato de saída segura: uma pontuação `;` terminal é normalizada e CSS/atributos HTML recusados mostram o motivo no bloco, mantendo a proteção fail-closed. | Injeção CSS, `javascript:` em HTML, URLs/handlers preexistentes e semicolon terminal benigno. |
| A-13 | Os seletores de cor e assets têm nomes programáticos, foco visível, dimensões explícitas de imagem e não roubam foco depois do clique; erro HEX usa `aria-invalid` e região viva. | Interação real por mouse e teclado no Chromium. |
| A-14 | A paleta SVG usa `group` com botões nativos, foco visível e erro textual anunciado, sem o contrato incorreto de `listbox`. | Papel semântico, validação vazia e anúncio do erro no Chromium. |

As correções foram feitas no contrato compartilhado de cada pipeline, não apenas nos exemplos ou nos sintomas observados. O formato antigo de declarações CSS continua aceito e o Canvas sem id continua sendo HTML válido; portanto, a mudança não exige reescrita de projetos salvos.

## Evidência histórica após as 14 correções

- `bun test src`: **4.500 passaram, 0 falharam, 42.635 asserções**, em 294 arquivos.
- Testes direcionados finais de diagnóstico, geradores HTML/CSS, glossário e acessibilidade: **74 passaram, 0 falharam**.
- `bun run typecheck`: **passou**.
- `bun run check`: **684 arquivos verificados, sem correções**.
- Chromium, inventário integral: **134 passaram, 0 falharam**, incluindo a jornada de HTML/CSS/SVG/Canvas, os seletores acessíveis, os 67 exemplos, segurança, reabertura, smoke e arrasto.

## Inventário auditado

| Categoria | Blocos visíveis | Grupos | Distribuição por nível |
|---|---:|---:|---|
| HTML | 24 | 5 | 17 iniciante 2D, 7 intermediário 2D |
| CSS | 52 | 8 | 12 iniciante 2D, 28 intermediário 2D, 12 avançado 2D |
| SVG | 21 | 4 | 10 iniciante 2D, 10 intermediário 2D, 1 avançado 2D |
| Canvas | 54 de 55 | 8 | 15 iniciante 2D, 16 intermediário 2D, 23 avançado 2D |

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

## Reabertura — encerramento no worktree atual

Esta seção revalida o código **como ele está no worktree atual**, que já continha muitas alterações não commitadas. Nenhuma mudança pré-existente foi revertida. A implementação ficou limitada aos dez achados e aos fixtures que precisavam representar o novo contrato Canvas.

### Evidência atual

- Inventário: **152 definições** nas quatro categorias; **151 visíveis**. HTML tem 24 blocos/5 grupos; CSS, 52/8; SVG, 21/4; Canvas, 54 visíveis de 55/8. O único oculto é `sz_canvas_keyboard`, legado e protegido por teste.
- Regressões TDD cobrem runtime exportado, ordem/colisão Canvas, segurança e fidelidade CSS, HTML inline/source map, Google Fonts e comprimentos SVG.
- `bun test src`: **4.562 passaram, 0 falharam, 43.111 asserções**, em 295 arquivos.
- `bun run typecheck`: passou (`tsc --noEmit`).
- Biome dirigido aos **25 arquivos** alterados nesta correção: passou sem diagnóstico.
- `bun run check` global ainda encontra sete formatações em arquivos modificados por trabalhos paralelos (`e2e/helpers/blockly.ts`, execução/lifecycle e parser/gerador JS); nenhum dos 25 arquivos deste lote aparece no resultado.
- Chromium dirigido a HTML/CSS/SVG/Canvas: **8 passaram, 0 falharam**.

### Situação por categoria

| Categoria | Estado atual | Principais forças | Lacunas atuais |
|---|---|---|---|
| HTML | Corrigido e revalidado | catálogo central, content model, segurança de URL/atributos, formulários e Canvas acessíveis | pai inline não representável permanece avançado; mapa acompanha quebras reais |
| CSS | Corrigido e revalidado | declarações ordenadas, scanner estrutural compartilhado, source maps e safety contract | entrada parcial/ambígua permanece avançada; Google Font canônica volta ao bloco |
| SVG | Corrigido e revalidado | fluxo acessível, reutilização, referências/ciclos e diagnóstico de geometria | negativos literais com ou sem unidade recebem o mesmo aviso |
| Canvas | Corrigido e revalidado | runtime compartilhado, símbolos sequenciais, acessibilidade e preview multi-Canvas | preview, export, ZIP e Pro recebem a mesma entrada; setup/colisões são bloqueados |

### Encerramento dos dez achados

| Achado | Resultado aplicado | Cobertura de regressão |
|---|---|---|
| R-01 | `__szInput` virou runtime de produto separado dos controles de preview; `sz-input.js` é emitido e carregado antes do código do aluno em export, fonte e Pro. | File map, source export, conversão Pro, JavaScript inline no `<head>` e runtime de teclado/ponteiro sem controles exclusivos do preview. |
| R-02 | Todo nó `canvas*` com `ctxVar` consulta o ambiente sequencial; somente um setup anterior declara o pincel. | Uso antes/depois do setup, statements e expressões aninhadas, aviso no bloco. |
| R-03 | Declarações do mesmo escopo detectam colisões entre variável, setup, import, função e classe; escopos filhos mantêm shadowing. | Variável versus setup, nomes repetidos e escopo filho. |
| R-04 | Comentários compartilham contrato que rejeita `*/`; parser só estrutura comentário inequívoco e gerador falha fechado. | Schema, diagnóstico, gerador, comentário multilinha e comentários adjacentes. |
| R-05 | O scanner informa cobertura completa; propriedade ou valor ausente preserva regra/keyframe inteiro como `rawCSS`. | `width:`, `width`, custom property vazia e keyframe parcial. |
| R-06 | Elemento phrasing com filho avançado preserva o pai inteiro, mantendo adjacência e espaços autorados. | `abbr`, `mark` e `code`, colados e separados. |
| R-07 | Parser, schema e gerador usam o mesmo scanner de chaves fora de string/comentário/escape; seletores válidos não são mutilados. | `[data-x="}"]`, seletor malicioso e parser de spans. |
| R-08 | Renderização inline carrega posição `{line, column}` e atualiza ranges depois de cada quebra. | Irmãos phrasing separados por `\n`, inclusive range do texto e segundo elemento. |
| R-09 | O contrato Google Fonts monta e reconhece somente o import canônico seguro. | Bloco → CSS → IR com “Press Start 2P”; imports arbitrários seguem avançados. |
| R-10 | O diagnóstico extrai o número de comprimentos literais e aplica não-negatividade antes da unidade. | `px`, `%`, `rem` e expressão dinâmica `var()`. |

## Achados atuais — histórico corrigido

### R-01 — Crítico — Teclado e ponteiro do Canvas quebram fora do preview — corrigido

**Onde:** `src/blockly/blocks/canvas.ts:831`, `src/generators/expr.ts:657`, `src/preview/bootstrap.ts:293`, `src/export/fileMap.ts:46`, `src/export/sourceExport.ts:58`, `src/state/convertToPro.ts:19`.

Os blocos `sz_input_key_pressed`, `sz_input_pointer_x` e `sz_input_pointer_y` geram referências a `__szInput`. Essa global é criada apenas por `buildInputBridgeRuntime()`, injetado pelo bootstrap do preview. `buildClassicFileMap` copia/minifica o `script.js` sem esse runtime; o mesmo builder alimenta export de deploy, ZIP de fonte e conversão Classic → Pro.

**Reprodução:** um projeto cujo `script.js` contém `__szInput.key("ArrowRight")` foi processado por `buildClassicFileMap`; a saída reteve a chamada e não continha nenhuma definição de `__szInput`. O primeiro uso em execução produz `ReferenceError`.

**Impacto:** um jogo pode funcionar perfeitamente dentro do Studio e sair injogável quando publicado ou entregue ao aluno para continuar no VSCode. Isso atinge diretamente a promessa central de ensinar e publicar jogos.

**Correção de causa-raiz:** transformar o input bridge em runtime de produto compartilhado, declarado como dependência pelo gerador, e compô-lo antes do código do aluno em preview, export, source export e conversão Pro. Evitar detecção por regex no JS; o gerador/IR deve devolver requisitos de runtime. Adicionar E2E que exporta, abre o artefato e valida teclado e coordenadas na segunda tela.

### R-02 — Alto — Canvas aceita desenho antes de “Preparar a tela” — corrigido

**Onde:** `src/ir/canvasContexts.ts:58`, `src/blockly/semanticDiagnostics.ts:131`, `src/blockly/semanticDiagnostics.ts:172`, `src/generators/js.ts:1042`.

`collectCanvasContextSymbols` devolve duas listas sem posição. O diagnóstico cria um `Set` com todos os setups do programa e considera qualquer uso válido se o nome aparecer em algum ponto, inclusive depois do uso.

**Reprodução:** `canvasFillRect(ctx)` seguido de `canvasSetup(ctx)` passa no `SZIRSchema`. O gerador emite `ctx.fillRect(...)` antes de `const ctx = ...`; a execução falha no primeiro statement por zona temporal morta/variável ainda não inicializada.

**Impacto:** reordenação, paste, importação ou Ponte podem produzir tela vazia apesar da mensagem pedagógica afirmar que o setup deve vir antes.

**Correção de causa-raiz:** validar símbolos Canvas em ordem e por escopo, adicionando o contexto ao ambiente somente depois do setup. Integrar os campos `ctxVar` dos statements ao validador sequencial de referências, em vez de compensá-los com um inventário global não ordenado.

### R-03 — Alto — O nome do pincel pode colidir com qualquer variável JavaScript — corrigido

**Onde:** `src/ir/programmingReferences.ts:595`, `src/ir/programmingReferences.ts:616`, `src/generators/js.ts:749`, `src/generators/js.ts:1042`.

O validador de referências usa `Set` e registra declarações, mas não acusa duplicatas entre tipos de declaração. O diagnóstico Canvas detecta apenas dois `canvasSetup` com o mesmo nome.

**Reprodução:** `let ctx = null` seguido de `canvasSetup(varName: "ctx")` passa no schema e gera outro `const ctx = ...`, produzindo `SyntaxError: Identifier 'ctx' has already been declared`.

**Impacto:** projetos importados ou editados na Ponte podem nem compilar, embora cada bloco isolado seja válido.

**Correção de causa-raiz:** criar análise de declarações por escopo lexical para variáveis, setups, imports, funções e classes. Ela deve preservar as regras reais de redeclaração do JavaScript e apontar o segundo bloco antes da geração.

### R-04 — Alto — O bloco “comentário CSS” permite encerrar o comentário e injetar regras — corrigido

**Onde:** `src/blockly/blocks/css.ts:34`, `src/ir/schema.ts:1461`, `src/generators/css.ts:106`, `src/blockly/semanticDiagnostics.ts:243`.

O texto do comentário aceita qualquer string e o gerador concatena `/*${entry.text}*/` sem rejeitar `*/`. O safety contract percorre declarações, mas ignora nós `comment`.

**Reprodução:** o texto `*/ body { background: url(https://attacker.example/x); } /*` passa no `CSSEntrySchema` e gera `/**/ body { background: url(...) } /**/`.

**Impacto:** um bloco infantil, importação ou resposta de IA abre uma regra CSS fora do comentário, contornando as proteções de declaração e permitindo efeitos globais/requisições de rede no artefato exportado.

**Correção de causa-raiz:** contrato único para comentário CSS no schema, diagnóstico, parser e gerador. Texto vindo do bloco com `*/` deve ser recusado com mensagem amigável ou normalizado de forma explícita; código textual com vários comentários deve virar múltiplos nós ou `rawCSS`, nunca um comentário estruturado ambíguo. Cobrir fechamento, comentários adjacentes e multilinha.

### R-05 — Alto — Declarações CSS incompletas somem dentro de uma regra válida — corrigido

**Onde:** `src/parsers/css.ts:87`, `src/parsers/css.ts:94`, `src/parsers/css.ts:435`.

O parser estrutura a regra quando encontra ao menos uma declaração válida. Segmentos sem `:` ou com chave/valor vazio são simplesmente ignorados por `parseDeclarations`.

**Reprodução:** `.a { color: red; width:; }`, `.a { color: red; width }` e `.a { color:red; --x:; }` voltam apenas com `color: red`; a Ponte aceita o IR e uma regeneração apaga o trecho incompleto.

**Impacto:** enquanto a criança digita CSS na Ponte, uma linha parcial pode desaparecer ao retornar aos blocos — perda silenciosa de autoria.

**Correção de causa-raiz:** o scanner deve informar cobertura completa. Qualquer segmento não vazio que não possa virar declaração exige preservar a regra inteira como `rawCSS`; aplicar a mesma regra em `@keyframes`. Adicionar regressões para chave/valor ausente e edição intermediária.

### R-06 — Alto — Tags inline não modeladas ganham espaços e mudam o texto da página — corrigido

**Onde:** `src/parsers/html.ts:392`, `src/parsers/html.ts:427`, `src/generators/html.ts:329`, `src/generators/html.ts:354`.

Filhos desconhecidos viram `rawHTML`. Quando um elemento de texto contém somente esses filhos, `isPhrasingNode` os considera não-inline e o gerador os imprime em linhas separadas.

**Reprodução:** `<p><abbr>A</abbr><abbr>B</abbr></p>` é estruturado como um `p` com dois filhos `rawHTML` e volta com quebras/indentação entre eles. O `textContent` do parágrafo muda de `AB` para texto com whitespace; o mesmo ocorre com tags comuns ainda não modeladas, como `mark` e `code`.

**Impacto:** a Ponte altera conteúdo e apresentação de HTML válido sem converter o pai inteiro para avançado.

**Correção de causa-raiz:** quando a sensibilidade de whitespace dos filhos não é representável, preservar o elemento-pai inteiro como `rawHTML`, ou classificar um raw inline somente por análise segura do fragmento. Testar irmãos desconhecidos colados e separados por espaço.

### R-07 — Alto — Seletor CSS válido com `}` dentro de string é mutilado silenciosamente — corrigido

**Onde:** `src/parsers/css.ts:73`, `src/parsers/css.ts:87`, `src/ir/schema.ts:1363`, `src/generators/css.ts:223`.

O parser encontra a primeira `{` por `indexOf` e aceita `[data-x="}"]` como seletor estruturado. O schema proíbe qualquer chave em seletor, mas o parser não valida sua saída; o gerador então remove todas as chaves com `stripBraces`.

**Reprodução:** `[data-x="}"] { color: red; }` vira `[data-x=""] { color: red; }`. A Ponte reporta parse bem-sucedido, sem aviso.

**Impacto:** seletor CSS válido muda de significado e pode deixar de atingir o elemento pretendido.

**Correção de causa-raiz:** criar um scanner compartilhado de seletor que diferencie chave estrutural de chave dentro de string/escape. Até o schema suportar esse caso, o parser deve preservar a regra inteira como `rawCSS`; o gerador não pode ser a primeira camada a revelar a incompatibilidade mutilando texto.

### R-08 — Médio — Source map HTML não avança linha dentro de um trecho inline — corrigido

**Onde:** `src/generators/html.ts:241`, `src/generators/html.ts:260`, `src/generators/html.ts:382`.

Durante uma sequência phrasing, o gerador soma `rendered.length` à coluna, mas não avança linha nem reinicia coluna quando um nó de texto contém `\n`.

**Reprodução:** `span A`, texto `"\n"`, `span B` gera o segundo span na linha 10; o source map registra os três nós na linha 9 e coloca `B` nas colunas 20–34.

**Impacto:** seleção bloco ↔ código e destaque da Ponte miram a linha errada em HTML formatado normalmente em várias linhas.

**Correção de causa-raiz:** carregar uma posição `{line, column}` ao renderizar inline, atualizando-a por cada quebra, ou derivar os ranges da string final. Adicionar teste com whitespace phrasing entre irmãos.

### R-09 — Médio — “Importar fonte do Google” volta como CSS avançado — corrigido

**Onde:** `src/blockly/buildIR.ts:2018`, `src/generators/css.ts:94`, `src/parsers/css.ts:54`, `src/blockly/workspaceState.ts:563`.

O bloco possui IR dedicado `googleFont` e reconstrução dedicada, mas o parser trata todo `@import` como `rawCSS`.

**Reprodução:** o bloco com “Press Start 2P” gera o import canônico do Google Fonts; parsear esse mesmo texto devolve `{ type: "rawCSS", advanced: true }`.

**Impacto:** uma ida à Ponte transforma um bloco amigável em cartão avançado e quebra a progressão pedagógica, embora o código tenha sido gerado pelo próprio Studio.

**Correção de causa-raiz:** reconhecer somente o formato canônico seguro emitido pelo gerador, decodificar `+` e validar pela função de `css/googleFonts.ts`; outros imports continuam avançados.

### R-10 — Médio — SVG aceita raio/tamanho negativo com unidade sem aviso — corrigido

**Onde:** `src/blockly/semanticDiagnostics.ts:331`, `src/blockly/semanticDiagnostics.ts:502`, `src/blockly/semanticDiagnostics.ts:527`.

`isSvgLength` aceita unidade, mas a verificação de não-negatividade só roda quando o valor casa `SVG_NUMBER_RE`, que aceita apenas número puro.

**Reprodução:** `r="-1"` bloqueia com mensagem; `r="-1px"` e `r="-1%"` retornam diagnóstico válido e nenhum warning.

**Impacto:** a forma pode ficar inválida/invisível sem a orientação infantil que já existe para o mesmo número sem unidade.

**Correção de causa-raiz:** extrair número e unidade dos comprimentos literais aceitos e aplicar o limite ao componente numérico. Expressões dinâmicas (`calc`, `var`, `clamp`) continuam fora da validação estática.

## Avaliação arquitetural atual

### Código morto e compatibilidade

Não foi encontrado bloco morto nessas quatro categorias: os 152 tipos estão catalogados e cada tipo pertence a exatamente um grupo. `sz_canvas_keyboard` é legado intencional, permanece registrado para abrir projetos antigos e está oculto da paleta por contrato e teste.

### Duplicação e drift

As três duplicações que explicavam os achados foram fechadas no lote:

1. seletor CSS passou a usar o scanner estrutural compartilhado por parser, schema e gerador;
2. entrada Canvas passou a ter um núcleo de produto compartilhado por preview, export, fonte e Pro;
3. referências Canvas passaram para o mesmo validador sequencial e lexical da Programação.

Ainda vale a recomendação de evoluir os megaswitches para codecs por família, mas ela deixou de ser condição para corrigir os dez defeitos.

### Shotgun surgery e arquivos centrais

O próprio guia do package registra cerca de nove pontos para cada bloco. Cinco arquivos centrais somam **51.090 linhas** (`schema.ts`, `buildIR.ts`, `workspaceState.ts`, `parsers/js.ts`, `generators/js.ts`). Isso torna a extensão das categorias sujeita a cases esquecidos e regressões cruzadas.

Recomendação estrutural: evoluir para codecs/registries por família de IR, com funções de bloco→IR, IR→bloco, IR→código, código→IR, referências e requisitos de runtime declarados juntas. Os contratos recentes (`html/catalog.ts`, `css/googleFonts.ts`, `ir/canvasContexts.ts`, `ir/outputSafety.ts`) já apontam na direção correta, mas ainda não são a única porta de entrada.

### Performance e estabilidade

Não foi observado gargalo determinístico nas quatro categorias durante esta revisão; parsers e geradores possuem guardas explícitas de profundidade, e os testes dirigidos executaram em poucos segundos. Não houve profiling de CPU/memória, portanto isto não é uma certificação de performance. O risco imediato é de estabilidade/correção, não throughput.

O conjunto Chromium dirigido terminou com 8/8 cenários verdes. Uma primeira execução oscilou durante a colagem de uma Área e passou tanto isolada quanto na repetição integral; o helper compartilhado já aguarda menu, presença do bloco e autosave, mas a estabilidade de colagem continua merecendo monitoramento fora deste lote.

## Priorização aplicada

1. **P0 concluído:** runtime `__szInput` entregue antes do script do aluno em todos os artefatos clássicos.
2. **P1 concluído:** Canvas sequencial/lexical, comentário seguro e preservação de CSS/HTML não representável.
3. **P2 concluído:** source map HTML, Google Font e negativos SVG com unidade.
4. **Arquitetura parcial:** contratos de seletor CSS, símbolos Canvas e runtime foram centralizados; codecs completos permanecem evolução futura.

## Critérios de aceite da reabertura

- [x] O mesmo jogo com entrada por teclado/ponteiro recebe o runtime no preview, deploy, ZIP de fonte e projeto Pro.
- [x] Nenhum uso de pincel anterior ao setup nem declaração duplicada passa pelo schema/diagnóstico.
- [x] Código HTML/CSS que não cabe no IR estruturado permanece inteiro como avançado; nunca é parcialmente descartado ou reescrito em silêncio.
- [x] Comentário CSS não consegue abrir uma regra fora do comentário.
- [x] Source map aponta a linha real após whitespace multilinha.
- [x] O bloco Google Font sobrevive bloco → código → bloco.
- [x] Comprimentos SVG negativos recebem o mesmo aviso com ou sem unidade.
- [x] `bun test src` voltou a zero falhas no worktree integrado e o conjunto E2E terminou verde.
