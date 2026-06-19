# Blocos para criança: estudo MakeCode Arcade + Scratch e diretrizes do Estúdio

> Documento de referência do redesenho dos blocos de jogo do `@sistemazero/studio`.
> Consolida a pesquisa em MakeCode Arcade e Scratch, a review dos blocos atuais e as
> diretrizes adotadas. Fonte da verdade das decisões de usabilidade infantil.

## 1. Por que isto importa

O público do Estúdio (via produto **kids**) é criança, muitas vezes no celular, muitas vezes
pré-leitora ou leitora iniciante. Os dois maiores ambientes de programação em blocos do mundo —
**MIT Scratch** e **Microsoft MakeCode Arcade** — convergiram, ao longo de anos de pesquisa, num
mesmo conjunto de princípios que reduzem a carga cognitiva e fazem a criança ter sucesso nos
primeiros minutos. Este documento destila esses princípios e os traduz para o nosso editor (Blockly).

## 2. Princípios que se repetem nos dois

### 2.1 Forma = gramática (o erro de sintaxe vira impossível)
Cada bloco tem um **formato** que só encaixa do jeito gramaticalmente válido:
- **Chapéu** (hat): começa um script — eventos (`when green flag clicked`, `on start`). Nada encaixa acima.
- **Comando** (stack): encaixe de quebra-cabeça, empilha na vertical (`move 10 steps`).
- **Booleano** (hexágono): só entra no buraco hexagonal de um `se`/`enquanto` (`touching mouse?`).
- **Reporter** (oval): devolve um valor, cabe nos campos brancos (`x position`, `score`).
- **C** (laço/condicional): abraça um bloco de comandos (`forever`, `repeat`, `if`).
- **Tampa** (cap): fim de fluxo, nada encaixa abaixo (`stop all`).

**Por quê:** a criança não comete erro de sintaxe — ele é fisicamente impossível. A cabeça fica livre
para pensar na **lógica**, não nas regras. É a maior sacada pedagógica dos dois.

### 2.2 Eventos primeiro
Tudo é "**quando** X, **faça** Y": `when green flag clicked`, `on start`, `on button A pressed`,
`on sprite of kind Player overlaps Food`. Casa com a experiência real da criança ("quando tocar o sino,
fila"). Organiza o código por causa→efeito e evita laços que travam (`while`).

### 2.3 Cor = navegação
Cada categoria tem uma **cor forte e distinta**. Depois de 2–3 sessões a criança acha "o azul é
movimento" sem ler. Scratch: Motion azul, Looks roxo, Sound magenta, Events dourado, Control laranja,
Sensing ciano, Operators verde, Variables laranja-avermelhado, My Blocks rosa. MakeCode segue o mesmo
espírito por domínio (Sprites, Controller, Game, Music, Info, Scene…), com quentes para ação e frios
para abstração.

### 2.4 Tudo já vem preenchido (shadow blocks)
`move 10 steps`, `say Hello!`, `repeat 10`. **Zero campo vazio** → a criança roda e vê algo acontecer em
segundos. Os defaults também ensinam convenções (mostra "GAME OVER", 2 segundos de fala…).

### 2.5 Sprite por menu, com editor embutido
Nunca se digita o nome do sprite — escolhe-se num **dropdown com miniatura**. O editor de imagem do
sprite é embutido no bloco. Acaba com o erro de digitação silencioso.

### 2.6 Visual redondo + ícones + feedback
Renderer arredondado (zelos), alvos grandes (bom pra tablet/celular), **brilho** no bloco enquanto roda,
**ícones** dentro do texto (bandeira verde, setas, miniatura do sprite). Prévia de encaixe no arraste.

### 2.7 Pouca coisa de cara (divulgação progressiva)
8–10 categorias visíveis; o avançado fica numa gaveta. Tutoriais introduzem blocos em ordem pedagógica.
Linguagem simples, verbo na frente, rótulos curtos (2–5 palavras), unidades visíveis.

### 2.8 Low floor, high ceiling, wide walls
Sucesso imediato (low floor); espaço pra crescer por anos (high ceiling); muitos tipos de projeto —
jogo, arte, música, história (wide walls). Sem um "jeito certo" único.

## 3. Review dos blocos do Estúdio (estado anterior ao redesenho)

Pontos fortes já presentes: renderer **zelos** (arredondado); 3 níveis (iniciante→intermediário→
avançado); paleta de cor curada de 16 cores estilo MakeCode (`colorPalette.ts`); defaults preenchidos;
tooltips ricos pro professor; e **round-trip pela Ponte** (bloco⇄JS) já cobrindo os blocos de jogo.

Problemas de usabilidade infantil identificados:

| # | Problema | Exemplo | Diretriz |
|---|----------|---------|----------|
| 1 | "pincel ctx" exposto em quase todo bloco | "Desenhar sprite jogador **no pincel ctx**" | Esconder o canvas (implícito no runtime) |
| 2 | Sprite **digitado**, não escolhido | `field_input text='jogador'` em cada bloco | Sprite por menu (`field_sprite_picker`) |
| 3 | Sem bloco-evento "Quando…" | colisão = "Guardar em `bateu` se… colide" | Hats `on_start/on_update/on_key/on_overlap` |
| 4 | 42 blocos numa única cor rosa | toda a categoria "Jogo 2D" | Sub-categorias coloridas por domínio |
| 5 | Sem booleano (hexágono) nem reporter (oval) | colisão guarda em variável | `tecla … apertada?`, `encosta em …?`, reporters |
| 6 | Vocabulário difícil/jargão | "Ricochetear", "encosta (círculo)", "spritesheet", "Hz/ms" | PT didático; nota+duração no som |
| 7 | Sem ícones nas faces | só texto | Ícones inline (bandeira, setas, swatch, nota) |

## 4. Diretrizes adotadas no redesenho

1. **Esconder o `ctx`**: o runtime é dono de um canvas/contexto único; nenhum bloco de jogo mostra "pincel".
2. **Eventos em chapéu**: "Quando o jogo começar", "A cada quadro", "Quando apertar a tecla [▾]",
   "Quando [sprite] encostar em [sprite]" — substituem o plumbing de variável de colisão.
3. **Sprite por menu** (`field_sprite_picker`), com swatch/miniatura; valor continua string (round-trip intacto).
4. **Forma = gramática** também aqui: booleanos hexágono (`tecla … apertada?`, `encosta em …?`) que caem
   dentro de `se`; reporters (`posição do clique x/y`, `x/y do sprite`, `pontuação`).
5. **Cor por domínio**: Sprites, Movimento & Controles, Física & Colisão, Aparência & Efeitos, Som,
   Placar & Fim, Mapa de tiles, Quando/Eventos — cada um com a sua cor.
6. **Visual + ícones**: `startHats` ligado; ícones inline (bandeira, setas, swatch do sprite, nota); alvos
   maiores pra toque.
7. **PT didático**: "Quicar nas bordas", "encosta em", "folha de quadros", "Mudar/Botar"; som por nota
   (Dó/Ré/Mi…) + duração (curta/média/longa) em vez de Hz/ms.

## 5. Inegociável: a Ponte continua perfeita

O diferencial do Estúdio é a **conversão bidirecional bloco⇄JavaScript + realce de seleção** nos dois
sentidos. Para **cada** bloco novo/alterado, fechar o ciclo:
`buildIR` (bloco→IR) · `generators/js.ts` com `map.record(__id, …)` (IR→JS + realce) ·
`parsers/js.ts` (JS→IR, aceitando a forma nova **e** a antiga) · `buildWorkspaceStateFromIR` (IR→bloco) ·
testes de round-trip + `cssBridgeHighlight` espelhado pro jogo.

⚠️ `runtime.ts` é **template literal** — sem regex, sem `\n`/`\s` soltos; parser char-a-char.

## 6. Migração sem perder projeto

Projetos clássicos persistem **arquivos** (html/css/js) + IR + `blocksState`. Bump de versão do schema de
blocos: ao detectar versão velha/bloco obsoleto, descartar `blocksState` e re-derivar de
`buildWorkspaceStateFromIR(parse(arquivos))`. O JS é a fonte da verdade; o parser aceita as assinaturas
antigas (`SZGame2D.x(ctx, …)`).

## 7. Fontes

MakeCode Arcade: arcade.makecode.com (blocks, courses, ide-tour), makecode.com/defining-blocks,
microsoft/pxt-common-packages e microsoft/pxt-arcade (GitHub), e o paper "Microsoft MakeCode: Embedded
Programming for Education, in Blocks and TypeScript" (Microsoft Research, 2019).
Scratch: en.scratch-wiki.info (Blocks, Block Categories), scratchfoundation/scratch-blocks (GitHub),
Mitchel Resnick "Designing for Wide Walls", blog.google "What's New in Scratch 3.0".
