---
name: aula-roteiro
description: Escreve o roteiro de uma aula do curso infantil de programação (Sistema Zero) no formato roteiro.yaml do pacote @sistemazero/studio-aulas, na voz das aulas atuais. Use quando o usuário quiser criar/rascunhar uma aula nova, adaptar um roteiro existente, ou preparar a entrada do pipeline de geração de vídeo. Não use para copy de marketing nem para código.
---

# Skill: roteiro de aula infantil (Sistema Zero)

Gera um `roteiro.yaml` válido para o pipeline `@sistemazero/studio-aulas`. Esse
arquivo é a FONTE ÚNICA da aula: dele saem a voz (ElevenLabs), o avatar (HeyGen),
a gravação da tela do Estúdio e a montagem (Remotion). Escreva pensando que cada
cena vira um trecho de narração + o que aparece na tela.

## A voz (não-negociável)

Calibrada nas aulas reais do "Desafio do Primeiro Jogo". Imite:

- **Acolhe e fala de igual pra igual.** Abre com "Oi" / "Oi de novo". Usa "você"
  o tempo todo. A criança é a autora: "foi você que montou, peça por peça".
- **Analogia ANTES do termo técnico.** "uma tigela pra juntar os ingredientes"
  antes de dizer Comportamento; "aqueles livrinhos que passam rápido" antes de
  quadro. Apresenta a palavra nova como presente: "a gente chama de sprite",
  "sprite é só o nome chique do bonequinho".
- **Comemora cada micro-vitória.** "Que bom", "Olha só", "Você conseguiu".
- **Dá autonomia.** "Capricha", "esse jogo é seu, então essa escolha é sua".
- **Normaliza o erro.** "não tem problema nenhum, é assim mesmo", "arrumar o que
  não funcionou também é criar".
- **Ritmo calmo.** "Bora?", "Vamos com calma". Frases curtas.
- **Ao mandar montar, nomeia o bloco E a categoria** e usa verbos simples:
  "na categoria Jogo 2D, procura o bloco criar sprite e encaixa", "arrasta",
  "clica", "solta", "até dar aquele clique".
- **Português do Brasil, sempre.** Sem travessão (—) e sem jargão de IA. Escreve
  como gente fala.

## Estrutura da aula (7 partes)

1. Abertura (apresentacao): oi, retoma o dia anterior, provoca a meta de hoje.
2. Conceito (teoria): a analogia + a palavra nova.
3. Passo a passo (uma ou mais pratica): montar o jogo, bloco a bloco.
4. Testar (teste): rodar e ver funcionando; reenquadra o erro.
5. Personalizar: convidar a mudar cor/tamanho/velocidade.
6. Recapitular (recapitulacao): celebrar o que construiu.
7. Fecho (fecho): parabéns + gancho pro próximo dia.

Nem toda aula usa as 7; use o que fizer sentido. Aula de 8 a 15 minutos.

## Formato de saída (`roteiro.yaml`)

Schema em `packages/studio-aulas/src/roteiro/schema.ts`. Campos:

- `meta`: `slug` (kebab-case), `titulo`, `dia?`, `extensoes` (ex.: `[game-2d]`
  para blocos de Jogo 2D, `[game-3d]` para 3D), `cenarioAbertura`/`cenarioMeio`
  (nomes de imagem em `cenarios/`), `voz?` (estabilidade/estilo 0..1),
  **`projetoInicial`** (`vazio` = começa do zero; OU um `.szproject.json` = começa
  do FIM da aula anterior, ex.: `"../dia-2/final.szproject.json"`). Cada gravação
  EXPORTA `aulas/<slug>/final.szproject.json` — é o `inicial` da próxima aula, é
  assim que o curso encadeia.
- `cenas[]`: `id` (kebab-case único), `tipo` (apresentacao | teoria | pratica |
  teste | recapitulacao | fecho), `narracao` (o texto falado), `emocao` (neutro |
  empolgado | calmo | curioso | comemorando).
  - Cena `teoria`: `ilustracao: { nome, params? }`. Nomes disponíveis: `sprite`,
    `colisao`, `variavel`, `condicional`, `loop`, `coordenadas-xy`.
  - Cena `pratica`: `acoes[]` (o passo a passo na tela).

### Vocabulário de `acoes` (cena de prática)

- `{ tipo: abrirCategoria, categoria: "Jogo 2D" }` — abre a categoria na paleta.
- `{ tipo: pegarBloco, bloco: <tipo>, encaixarEm: <frame ou bloco> }` — adiciona
  o bloco e encaixa. Frames: `sz_frame_behavior` (Comportamento/JS),
  `sz_frame_appearance` (Aparência/CSS), `sz_frame_structure` (Estrutura/HTML).
- `{ tipo: configurarCampo, campo: <NOME>, valor: <x>, bloco?: <tipo> }` — ajusta
  um CAMPO do bloco. Vale pra texto/cor E pra **MENUS** (dropdown): passe o campo
  do menu e o VALOR da opção (ex.: `campo: SCENE, valor: ganhou` no
  `sz_g2d_set_scene`; `campo: KEY, valor: Enter`).
- `{ tipo: preencherSoquete, bloco: <blocoDeValor>, input: <NOME>, emBloco?: <pai>, campo?, valor? }`
  — cria um bloco de VALOR e pluga a saída dele num SOQUETE (input_value). Ex.:
  `sz_val_variable` (campo NAME=pontos) no input `TITLE` do `sz_g2d_show_screen`;
  ou `sz_g2d_scene_is` (campo SCENE=jogando) no input `COND` de um `sz_js_if_else`.
  `emBloco` ausente = o último bloco colocado.
- `{ tipo: envolver, container: <tipo>, corpo: <NOME>, deDentroDe: <pai>, inputPai: <NOME> }`
  — ENVOLVE a cadeia que está no `inputPai` do bloco `deDentroDe` dentro de um
  container novo (ex.: mover tudo pra dentro de um "Se a tela é jogando":
  `container: sz_js_if_else, corpo: THEN, deDentroDe: sz_frame_behavior, inputPai: CHILDREN`;
  depois preencha o `COND` com `preencherSoquete`).
- `{ tipo: balao, ancora: { bloco: <tipo>, campo?: <NOME> }, texto: "..." }` —
  balão apontando pro bloco/campo (aparece no vídeo no tempo daquela fala).
- `{ tipo: testar, segundos?: N }` — roda o preview do jogo.
- `{ tipo: pausar, segundos: N }` — respiro na tela.
- `{ tipo: zoom, nivel: perto|longe|ajustar }` — enquadra a tela.

### Tipos de bloco reais (use os corretos)

Os `bloco:` precisam ser os TIPOS Blockly reais. Não invente. Para descobrir,
leia o catálogo em `packages/studio/src/blockly/blockCatalog.ts` (export
`BLOCK_CATALOG`, com id + rótulo + categoria) e os arquivos de blocos em
`packages/studio/src/blockly/blocks/*` e
`packages/studio/src/official-extensions/game-2d/blocks.ts`. Exemplos de Jogo 2D:
`sz_g2d_create_sprite` (campos NAME, COLOR; X/Y/W/H são soquetes),
`sz_g2d_set_position`, `sz_g2d_set_velocity`, `sz_g2d_collides`, `sz_g2d_score`,
`sz_g2d_game_over`.

## Como trabalhar

1. Confirme com o usuário: tema/dia da aula, o jogo-alvo, e o que a criança já
   sabe (pra retomar). Se ele indicar uma aula existente, leia e adapte mantendo
   a voz.
2. Rascunhe as cenas seguindo a estrutura e a voz. Toda cena de prática deve ter
   um passo a passo real (categoria → bloco → encaixe → balões → testar), lento e
   claro.
3. Escreva em `packages/studio-aulas/aulas/<slug>/roteiro.yaml`.
4. Valide: `cd packages/studio-aulas && bun run src/cli.ts validar <slug>`.
   Corrija o que o validador apontar.
5. Mostre ao usuário um resumo das cenas e ofereça ajustes.

Referência de estilo pronta: `packages/studio-aulas/aulas/dia-1-a-nave-ganha-vida/roteiro.yaml`.
