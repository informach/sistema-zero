import type { BlockDefinition } from '../../blockly/blocks/types'
import {
  GAME_TWO_D_BLOCK_COLOR as C,
  GAME_TWO_D_EVENT_COLOR as EVENT_C,
} from './blockCatalogShared'

export const gameTwoDTextBlocks: BlockDefinition[] = [
  {
    type: 'sz_g2d_create_text_sprite',
    placement: 'command',
    message0: 'Criar sprite %1 com texto %2 em x %3 y %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'resposta' },
      { type: 'input_value', name: 'TEXT', check: 'JSValue' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um sprite de texto ou número, com tamanho automático. Encaixe uma variável, conta ou item de lista. Cada repetição cria outro sprite. Use os blocos de desenhar, mover e colidir como nos outros sprites.',
  },
  {
    type: 'sz_g2d_spawn_text_in_group',
    placement: 'command',
    message0: 'No grupo %1 criar sprite %2 com texto %3 em x %4 y %5',
    args0: [
      { type: 'field_name_picker', name: 'GROUP', text: 'números', kind: 'group' },
      { type: 'field_input', name: 'NAME', text: 'numero' },
      { type: 'input_value', name: 'TEXT', check: 'JSValue' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um novo sprite de texto ou número e guarda no grupo. O nome é opcional e identifica o recém-criado para ajustar velocidade, estilo ou dados. O grupo guarda todos os sprites do laço.',
  },
  {
    type: 'sz_g2d_set_sprite_text',
    placement: 'command',
    message0: 'Mudar o texto do sprite %1 para %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'resposta' },
      { type: 'input_value', name: 'TEXT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Troca a aparência para texto e ajusta a caixa. Conserva posição, velocidade, dados e grupos; também aceita números.',
  },
  {
    type: 'sz_g2d_sprite_text',
    message0: 'texto do sprite %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'resposta' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'O texto que o sprite mostra. Para guardar um número e fazer contas com ele, use os dados do sprite.',
  },
  {
    type: 'sz_g2d_set_text_style',
    placement: 'command',
    message0: 'Texto do sprite %1 tamanho %2 cor %3',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'resposta' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#ffffff' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Escolhe o tamanho da letra e a cor. Usa a fonte escolhida para o jogo; a caixa acompanha as novas medidas.',
  },
  {
    type: 'sz_g2d_scale_text_size',
    placement: 'command',
    message0: 'Multiplicar o tamanho do texto do sprite %1 por %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'resposta' },
      { type: 'input_value', name: 'FACTOR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Multiplica o tamanho da letra: 2 dobra, 0,5 reduz à metade. Sem imagem de fundo, este bloco basta: a caixa do sprite acompanha a letra sozinha. Numa placa com imagem, use também o “Multiplicar o tamanho do sprite” para a moldura crescer junto. Repetir a cada quadro multiplica de novo a cada quadro.',
  },
  {
    type: 'sz_g2d_set_text_box',
    placement: 'command',
    message0: 'Caixa de texto do sprite %1 largura %2 alinhamento %3 margem %4 fundo %5',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'resposta' },
      { type: 'input_value', name: 'WIDTH', check: 'JSValue' },
      {
        type: 'field_dropdown',
        name: 'ALIGN',
        options: [
          ['à esquerda', 'left'],
          ['no centro', 'center'],
          ['à direita', 'right'],
        ],
      },
      { type: 'input_value', name: 'PADDING', check: 'JSValue' },
      { type: 'input_value', name: 'BACKGROUND', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Largura 0 ajusta ao texto. Uma largura maior quebra frases em linhas. A margem dá espaço ao redor das letras. No fundo, escolha a cor e suba a opacidade para ela aparecer (0% = sem fundo). Toda a caixa pode ser clicada.',
  },
  {
    type: 'sz_g2d_set_text_image',
    placement: 'command',
    message0: 'Fundo do sprite %1 com a imagem %2, texto %3',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'resposta' },
      // ⚠️ Nasce VAZIO, como os outros seletores de imagem opcionais. Um nome de
      // fábrica que não existe no projeto ("placa") faz o runtime avisar que a
      // imagem não está lá assim que a criança arrasta o bloco: aviso acusando
      // quem acabou de chegar.
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
      {
        type: 'field_dropdown',
        name: 'VALIGN',
        options: [
          ['no meio', 'middle'],
          ['em cima', 'top'],
          ['embaixo', 'bottom'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Escolha um desenho seu: ele vira a moldura do sprite, que nasce do tamanho dele, e o texto é escrito por cima, quebrando linha na margem. Serve para placa, botão e balão de fala. Com o “Definir o tamanho do sprite” a moldura acompanha o tamanho que você pedir, e a letra fica no tamanho que você escolheu. Sem imagem escolhida, vale o fundo de cor, e a altura do texto continua valendo: é assim que se centraliza a frase num botão colorido.',
  },
  {
    type: 'sz_g2d_set_sprite_data',
    placement: 'command',
    message0: 'Guardar no sprite %1 o dado %2 como %3',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'numero' },
      { type: 'field_input', name: 'KEY', text: 'valor' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Guarda um valor só neste sprite: número, resposta correta, identificador… Mudar o texto não muda os dados. Funciona em qualquer sprite.',
  },
  {
    type: 'sz_g2d_sprite_data',
    message0: 'dado %1 do sprite %2 ou %3',
    args0: [
      { type: 'field_input', name: 'KEY', text: 'valor' },
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'numero' },
      { type: 'input_value', name: 'FALLBACK', check: 'JSValue' },
    ],
    output: 'JSValue',
    inputsInline: true,
    colour: C,
    tooltip:
      'Lê o dado guardado neste sprite. Se ele ainda não existe, devolve o valor depois de "ou". O número continua número, mesmo que o texto tenha mudado.',
  },
  {
    type: 'sz_g2d_on_sprite_click',
    placement: 'event',
    userGesture: true,
    message0: 'Quando clicar/tocar no sprite %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'resposta' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Roda uma vez por clique ou toque dentro da caixa do sprite desenhado. Coloque na área de eventos. Funciona também com câmera e sprite girado.',
  },
  {
    type: 'sz_g2d_on_group_click',
    placement: 'event',
    userGesture: true,
    message0: 'Quando clicar/tocar num sprite do grupo %1 chamá-lo de %2',
    args0: [
      { type: 'field_name_picker', name: 'GROUP', text: 'respostas', kind: 'group' },
      { type: 'field_input', name: 'ITEM', text: 'escolhida' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Identifica o sprite tocado para ler os dados ou mudar a aparência. Se dois integrantes estiverem sobrepostos, escolhe o desenhado por cima. Vale também para sprites criados depois.',
  },
]
