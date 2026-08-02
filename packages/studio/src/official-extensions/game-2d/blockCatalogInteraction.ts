import type { BlockDefinition } from '../../blockly/blocks/types'
import {
  GAME_TWO_D_BLOCK_COLOR as C,
  GAME_TWO_D_EVENT_COLOR as EVENT_C,
} from './blockCatalogShared'

export const gameTwoDInteractionBlocks = [
  // ---- Mouse / toque ----
  {
    type: 'sz_g2d_on_pointer',
    placement: 'event',
    userGesture: true,
    message0: 'Quando clicar/tocar, na posição x %1 y %2',
    args0: [
      { type: 'field_input', name: 'PX', text: 'px' },
      { type: 'field_input', name: 'PY', text: 'py' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Roda o "fazer" a cada clique/toque, com a posição do ponteiro no canvas em px/py.',
  },

  // ---- Eventos "Quando…" (hats) ----
  {
    type: 'sz_g2d_on_key',
    placement: 'event',
    userGesture: true,
    message0: 'Quando apertar a tecla %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'KEY',
        options: [
          ['→ seta direita', 'ArrowRight'],
          ['← seta esquerda', 'ArrowLeft'],
          ['↑ seta para cima', 'ArrowUp'],
          ['↓ seta para baixo', 'ArrowDown'],
          ['barra de espaço', 'Space'],
          ['Enter', 'Enter'],
          ['tecla A', 'a'],
          ['tecla D', 'd'],
          ['tecla W', 'w'],
          ['tecla S', 's'],
          ['tecla F', 'f'],
        ],
      },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip: 'Roda o que está dentro toda vez que a tecla é apertada (ex.: pular, atirar).',
  },
  {
    type: 'sz_g2d_on_overlap',
    placement: 'event',
    message0: 'Quando o sprite %1 começar a encostar no sprite %2',
    args0: [
      { type: 'field_sprite_picker', name: 'A', text: 'jogador' },
      { type: 'field_sprite_picker', name: 'B', text: 'inimigo' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Roda o que está dentro quando os dois sprites se encostam (ex.: pegar moeda, levar dano). Dispara uma vez a cada vez que começam a encostar.',
  },
  {
    // Sem userGesture: este dispara DENTRO do laço do jogo, não na pilha de um
    // gesto do navegador (≠ do "qualquer tecla ou toque", logo abaixo).
    type: 'sz_g2d_on_jump',
    placement: 'event',
    message0: 'Quando o sprite %1 pular',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Roda o que está dentro toda vez que o sprite pula de verdade (ex.: tocar um som, contar os pulos). Vale para os três jeitos de pular: estilo plataforma, pular no chão e o kit do dinossauro.',
  },
  {
    // COM userGesture: roda dentro do listener de tecla/toque, então o corpo
    // está mesmo num gesto do navegador (é o que libera som e tela cheia).
    // ⚠️ O espelho no IR é a lista de `providesUserGesture` (ir/lifecycle.ts).
    type: 'sz_g2d_on_any_input',
    placement: 'event',
    userGesture: true,
    message0: 'Quando apertar qualquer tecla ou tocar na tela',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Roda o que está dentro quando a criança aperta qualquer tecla ou toca na tela. É o "aperte qualquer coisa para começar" das telas de início. Segurar a tecla dispara uma vez só.',
  },

  // ---- Perguntas (booleanos) — caem dentro de um "se" ----
  {
    type: 'sz_g2d_key_down',
    message0: 'a tecla %1 está apertada?',
    args0: [
      {
        type: 'field_dropdown',
        name: 'KEY',
        options: [
          ['→ seta direita', 'ArrowRight'],
          ['← seta esquerda', 'ArrowLeft'],
          ['↑ seta para cima', 'ArrowUp'],
          ['↓ seta para baixo', 'ArrowDown'],
          ['barra de espaço', 'Space'],
          ['Enter', 'Enter'],
          ['tecla A', 'a'],
          ['tecla D', 'd'],
          ['tecla W', 'w'],
          ['tecla S', 's'],
          ['tecla F', 'f'],
        ],
      },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Verdadeiro enquanto a tecla está sendo segurada. Use dentro de um "se", no "a cada quadro" (ótimo para mover sem parar).',
  },
  {
    type: 'sz_g2d_pointer_down',
    message0: 'o mouse ou dedo está segurado ?',
    args0: [],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Verdadeiro enquanto o botão do mouse ou o dedo está pressionado no jogo. Use dentro de um "se", no "a cada quadro" (ótimo para segurar e soltar).',
  },
  {
    type: 'sz_g2d_touches',
    message0: 'o sprite %1 está encostando no sprite %2 ?',
    args0: [
      { type: 'field_sprite_picker', name: 'A', text: 'jogador' },
      { type: 'field_sprite_picker', name: 'B', text: 'inimigo' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Verdadeiro enquanto os dois sprites estão se encostando. Use dentro de um "se".',
  },

  // ---- Imagens / spritesheet / animação (v0.3.0) ----
  {
    type: 'sz_g2d_create_image_sprite',
    placement: 'start-only-command',
    message0: 'Criar sprite %1 em x %2 y %3 largura %4 altura %5 com imagem %6',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'heroi' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'heroi' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um sprite que mostra uma imagem da sua biblioteca. Em "imagem", use o nome do asset (ex.: heroi). Se a imagem ainda não existe, aparece um retângulo até ela carregar.',
  },
  {
    type: 'sz_g2d_set_image',
    placement: 'command',
    message0: 'Trocar imagem do sprite %1 para %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'heroi' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Troca a imagem que o sprite mostra (e cancela a animação atual dele).',
  },
  {
    type: 'sz_g2d_load_spritesheet',
    placement: 'start-only-command',
    message0: 'Carregar folha de quadros %1 da imagem %2 com quadros de %3 x %4 px',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'andar' },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'heroi-andando' },
      { type: 'input_value', name: 'FW', check: 'JSValue' },
      { type: 'input_value', name: 'FH', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Prepara uma folha de sprites (vários quadros numa única imagem) para animar. Informe o tamanho de CADA quadro em pixels.',
  },
  {
    type: 'sz_g2d_animate_sprite',
    placement: 'command',
    message0: 'Animar sprite %1 com a folha %2 na animação %3, do quadro %4 ao %5 a %6 fps',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_name_picker', name: 'SHEET', text: 'andar', kind: 'spritesheet' },
      { type: 'field_animation_picker', name: 'ANIM', text: 'Escolher' },
      { type: 'input_value', name: 'FROM', check: 'JSValue' },
      { type: 'input_value', name: 'TO', check: 'JSValue' },
      { type: 'input_value', name: 'FPS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Escolha a animação pelo NOME (vem da sua folha do Pinta) e os quadros/velocidade se preenchem sozinhos. Sem animação nomeada, escreva os números dos quadros (do primeiro ao último).',
  },
  {
    type: 'sz_g2d_set_state_anim',
    placement: 'start-only-command',
    message0: 'Animação do sprite %1 no estado %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      {
        type: 'field_dropdown',
        name: 'STATE',
        options: [
          ['parado', 'parado'],
          ['andando (para os lados)', 'andando'],
          ['andando (cima/baixo)', 'vertical'],
          ['pulando', 'pulando'],
          ['caindo', 'caindo'],
          ['tomando dano', 'dano'],
        ],
      },
    ],
    message1: 'folha %1 animação %2, quadros %3 a %4, %5 fps',
    args1: [
      { type: 'field_name_picker', name: 'SHEET', text: 'andar', kind: 'spritesheet' },
      { type: 'field_animation_picker', name: 'ANIM', text: 'Escolher' },
      { type: 'input_value', name: 'FROM', check: 'JSValue' },
      { type: 'input_value', name: 'TO', check: 'JSValue' },
      { type: 'input_value', name: 'FPS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Guarda a animação que o sprite toca NESSE estado (parado, andando, pulando, caindo, tomando dano). Configure uma por estado, FORA do "a cada quadro". Quem troca sozinho é o bloco "Animar e virar o sprite sozinho".',
  },
  {
    type: 'sz_g2d_auto_animate',
    placement: 'command',
    message0: 'Animar e virar o sprite %1 sozinho conforme ele se move',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Use DENTRO do "a cada quadro do jogo": troca a animação sozinho conforme o estado do sprite (parado, andando, pulando, caindo, tomando dano) e vira o desenho para a esquerda/direita conforme ele anda. Perder vida mostra a animação de dano.',
  },
  // ---- Tipos de inimigo (v0.22.0): classes de inimigo com comportamento pronto ----
  {
    type: 'sz_g2d_define_enemy_type',
    placement: 'start-only-command',
    message0:
      'Criar tipo de inimigo %1 que é %2 cor %3 imagem %4 figura %5 vida %6 velocidade %7 dano %8 tamanho %9 x %10',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'zumbi' },
      {
        type: 'field_dropdown',
        name: 'BEHAVIOR',
        options: [
          ['patrulha (anda e volta)', 'patrulha'],
          ['perseguidor (vai atrás do alvo)', 'perseguidor'],
          ['voador (vai e volta no ar)', 'voador'],
          ['voador (sobe e desce)', 'voador-vertical'],
          ['saltador (pula de tempos em tempos)', 'saltador'],
          ['atirador (fica no chão e atira no alvo)', 'atirador'],
        ],
      },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#e4573d' },
      { type: 'field_asset_picker', name: 'IMAGE', text: '' },
      // Figura desenhada ("Desenhar a figura … assim") como visual do tipo —
      // vazia = usa imagem/cor. Figura VENCE a imagem (setShape cancela imagem).
      { type: 'field_name_picker', name: 'SHAPE', text: '', kind: 'shape' },
      { type: 'input_value', name: 'HP', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'DMG', check: 'JSValue' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma CLASSE de inimigo (como o Goomba ou o Koopa): escolha o comportamento e os atributos UMA vez, e solte quantos inimigos desse tipo quiser. O visual segue esta ordem: figura desenhada > imagem > cor. O tipo funciona nos blocos de grupo (para cada, contar, colisões).',
  },
  {
    type: 'sz_g2d_enemy_state_anim',
    placement: 'start-only-command',
    message0: 'Animação dos inimigos do tipo %1 no estado %2',
    args0: [
      { type: 'field_name_picker', name: 'TYPE', text: 'zumbi', kind: 'enemytype' },
      {
        type: 'field_dropdown',
        name: 'STATE',
        options: [
          ['parado', 'parado'],
          ['andando (para os lados)', 'andando'],
          ['andando (cima/baixo)', 'vertical'],
          ['pulando', 'pulando'],
          ['caindo', 'caindo'],
          ['tomando dano', 'dano'],
        ],
      },
    ],
    message1: 'folha %1 animação %2, quadros %3 a %4, %5 fps',
    args1: [
      { type: 'field_name_picker', name: 'SHEET', text: 'andar', kind: 'spritesheet' },
      { type: 'field_animation_picker', name: 'ANIM', text: 'Escolher' },
      { type: 'input_value', name: 'FROM', check: 'JSValue' },
      { type: 'input_value', name: 'TO', check: 'JSValue' },
      { type: 'input_value', name: 'FPS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Guarda a animação de UM estado para TODOS os inimigos do tipo (o "Atualizar os inimigos" troca sozinho). Configure FORA do "a cada quadro".',
  },
  {
    type: 'sz_g2d_enemy_type_param',
    placement: 'command',
    message0: 'Ajustar no tipo de inimigo %1 o valor de %2 para %3',
    args0: [
      { type: 'field_name_picker', name: 'TYPE', text: 'zumbi', kind: 'enemytype' },
      {
        type: 'field_dropdown',
        name: 'PARAM',
        options: [
          ['força do pulo (saltador)', 'pulo'],
          ['pular a cada tantos quadros (saltador)', 'ritmo'],
          ['alcance do voo (voador)', 'alcance'],
          ['atirar a cada tantos quadros (atirador)', 'cadencia'],
          ['velocidade do tiro (atirador)', 'tiro'],
        ],
      },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Ajuste fino do comportamento do tipo: força/ritmo do pulo (saltador), alcance do voo (voador) e cadência/velocidade do tiro (atirador).',
  },
  {
    type: 'sz_g2d_spawn_enemy',
    placement: 'command',
    message0: 'Soltar um inimigo do tipo %1 em x %2 y %3',
    args0: [
      { type: 'field_name_picker', name: 'TYPE', text: 'zumbi', kind: 'enemytype' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Solta um inimigo NOVO do tipo em x/y, já com a vida, o dano e as animações do tipo.',
  },
  {
    type: 'sz_g2d_update_enemy_type',
    placement: 'command',
    message0: 'Atualizar os inimigos do tipo %1 (alvo: o sprite %2)',
    args0: [
      { type: 'field_name_picker', name: 'TYPE', text: 'zumbi', kind: 'enemytype' },
      { type: 'field_sprite_picker', name: 'TARGET', text: 'jogador' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Use DENTRO do "a cada quadro": move cada inimigo conforme o comportamento do tipo, anima, atira (atirador), remove os derrotados (vida 0) e move os tiros. O alvo é quem o perseguidor persegue e o atirador mira.',
  },
  {
    type: 'sz_g2d_draw_enemy_type',
    placement: 'command',
    message0: 'Desenhar os inimigos do tipo %1 (e os tiros deles)',
    args0: [{ type: 'field_name_picker', name: 'TYPE', text: 'zumbi', kind: 'enemytype' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desenha todos os inimigos do tipo e os tiros deles. Use depois de atualizar.',
  },
  {
    type: 'sz_g2d_on_enemy_defeated',
    placement: 'event',
    message0: 'Quando um inimigo do tipo %1 for derrotado (chamado %2)',
    args0: [
      { type: 'field_name_picker', name: 'TYPE', text: 'zumbi', kind: 'enemytype' },
      { type: 'field_input', name: 'ANAME', text: 'inimigo' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Registre UMA vez, fora do "a cada quadro". Quando a vida de um inimigo do tipo acabar, ele some soltando partículas e o "fazer" roda com ele (ex.: somar pontos).',
  },
  {
    type: 'sz_g2d_on_enemy_shot_hit',
    placement: 'loop-command',
    bodyExecution: 'sync-callback',
    message0: 'Para cada tiro do tipo %1 que acertar o sprite %2',
    args0: [
      { type: 'field_name_picker', name: 'TYPE', text: 'zumbi', kind: 'enemytype' },
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
    ],
    message1: 'chamar o tiro de %1',
    args1: [{ type: 'field_input', name: 'ANAME', text: 'tiro' }],
    message2: 'fazer %1',
    args2: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Use DENTRO do "a cada quadro". Para cada tiro dos inimigos do tipo que acertar o sprite, o tiro SOME e o "fazer" roda com ele (ex.: machucar o jogador).',
  },
  {
    type: 'sz_g2d_hurt_by_enemy',
    placement: 'command',
    message0: 'Machucar o sprite %1 com o dano de contato do inimigo %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
      { type: 'field_sprite_picker', name: 'ENEMY', text: 'inimigo' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Tira da vida do sprite o dano do inimigo (ou do tiro) e faz o sprite piscar. Enquanto pisca, ele é INVENCÍVEL (não leva dano de novo). O jeito clássico de dar um respiro depois do dano.',
  },
  {
    type: 'sz_g2d_enemy_damage',
    message0: 'o dano de contato do inimigo %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'inimigo' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Quanto de dano este inimigo (ou o tiro dele) causa por contato. Sem dano marcado, vale 1.',
  },
  {
    type: 'sz_g2d_draw_frame',
    placement: 'command',
    message0: 'Desenhar quadro %1 da folha de quadros %2 em x %3 y %4 largura %5 altura %6',
    args0: [
      { type: 'input_value', name: 'INDEX', check: 'JSValue' },
      { type: 'field_name_picker', name: 'SHEET', text: 'andar', kind: 'spritesheet' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha um quadro específico da folha de quadros na posição escolhida (controle manual).',
  },

  // ---- Movimento (v0.4.0) ----
  {
    type: 'sz_g2d_platformer',
    placement: 'command',
    message0: 'Mover o sprite %1 estilo plataforma, velocidade %2 pulo %3',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'JUMP', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Esquerda/direita com as setas, pulo com a seta pra cima (só quando está no chão) e gravidade. Usa a gravidade do mundo quando ela foi definida; senão usa 0,6. O chão é a borda atraída: base com gravidade positiva, teto com gravidade negativa.',
  },
  {
    type: 'sz_g2d_top_down',
    placement: 'command',
    message0: 'Mover sprite %1 em 4 direções com setas, velocidade %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Movimento de cima pra baixo (visão de topo) nas 4 direções. A diagonal não fica mais rápida que andar reto.',
  },
  {
    type: 'sz_g2d_fly_free',
    placement: 'command',
    message0: 'Fazer o sprite %1 voar livre, velocidade %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Voa com as setas, sem gravidade nenhuma. A diferença para o "4 direções" é o PESO: leva um tiquinho para engatar, continua planando um bom tanto depois que você solta e demora para virar de lado, então é preciso fazer a curva antes. Bom para passarinho e fadinha. A velocidade que você põe é a máxima.',
  },
  {
    type: 'sz_g2d_flap',
    placement: 'command',
    message0: 'Fazer o sprite %1 bater as asas, força %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'input_value', name: 'FORCE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A gravidade puxa o tempo todo e cada toque na seta pra cima, no W, no espaço ou na tela dá um empurrão pra cima, inclusive no ar. É o passarinho dos canos, o foguete, o balão. Segurar a tecla não sobe para sempre: cada batida precisa de um toque novo.',
  },
  {
    type: 'sz_g2d_swim',
    placement: 'command',
    message0: 'Fazer o sprite %1 nadar, velocidade %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Água pesada: solto, o bicho afunda devagarinho; segurando a seta pra cima, ele sobe. Tudo mais lento e mais macio que no ar, com as 8 direções. Com a gravidade do mundo em 0 ele fica boiando parado.',
  },
  {
    type: 'sz_g2d_follow_pointer',
    placement: 'command',
    message0: 'Fazer sprite %1 seguir o ponteiro, velocidade %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'O sprite anda em direção ao mouse/dedo (ponteiro) na velocidade escolhida.',
  },
  {
    type: 'sz_g2d_clamp_to_screen',
    placement: 'command',
    message0: 'Manter o sprite %1 dentro da tela',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Impede o sprite de sair pelas bordas da tela (gruda na borda em vez de sumir).',
  },

  // ---- Efeitos visuais (v0.4.0) ----
  {
    type: 'sz_g2d_flash',
    placement: 'command',
    message0: 'Dar um clarão de cor %1',
    args0: [{ type: 'field_colour_sz', name: 'COLOR', colour: '#ffffff' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Pinta a tela inteira com uma cor translúcida (efeito de flash). Use num quadro específico, ex.: ao levar dano.',
  },
  {
    type: 'sz_g2d_shake',
    placement: 'command',
    message0: 'Tremer a tela com intensidade %1',
    args0: [{ type: 'input_value', name: 'INTENSITY', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Sacode a tela e para sozinho (o tremor vai diminuindo). Chame uma vez, ex.: numa colisão ou explosão.',
  },
  {
    type: 'sz_g2d_emit_particles',
    placement: 'command',
    message0: 'Soltar %1 partículas de cor %2 em x %3 y %4',
    args0: [
      { type: 'input_value', name: 'COUNT', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#fbbf24' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma explosão de partículas no ponto x/y. Lembre de "atualizar e desenhar as partículas" a cada quadro.',
  },
  {
    type: 'sz_g2d_draw_particles',
    placement: 'command',
    message0: 'Atualizar e desenhar as partículas',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Move e desenha as partículas (use dentro do "a cada quadro"); elas somem sozinhas.',
  },

  // ---- Tiles / tilemaps (v0.5.0) ----
  {
    type: 'sz_g2d_create_tilemap_from_asset',
    placement: 'start-only-command',
    message0: 'Criar mapa %1 do meu desenho %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'mapa' },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'meu-mapa', filter: 'tilemap' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Monta o mapa que você desenhou no Pinta: a grade, as peças e os sólidos já vêm JUNTOS no desenho (envie o mapa pelo 🚀 do Pinta e escolha-o aqui). Para montar ou editar uma grade na mão, use o bloco "Criar mapa de tiles".',
  },
  {
    type: 'sz_g2d_create_tilemap',
    placement: 'start-only-command',
    message0:
      'Criar mapa de tiles %1 com imagem %2, tamanho do tile %3 px, tiles sólidos %4, tiles plataforma %5, grade %6',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'mapa' },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'tileset' },
      { type: 'input_value', name: 'TILE', check: 'JSValue' },
      { type: 'field_solid_tiles_picker', name: 'SOLID', text: '1' },
      { type: 'field_solid_tiles_picker', name: 'PLATFORM', text: '', variant: 'platform' },
      { type: 'field_tile_grid', name: 'GRID', text: '0 0 0 0;0 0 0 0;1 1 1 1' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Monta um mapa de tiles a partir de uma imagem (o tileset, com vários quadros lado a lado). O "tamanho do tile" é o tamanho de cada quadro NA ARTE (o Pinta já sugere). Na tela o mapa se AJUSTA sozinho para encaixar no canvas. Cada número da GRADE escolhe um quadro do tileset; use ";" para separar as linhas e espaço entre os números. Use "." para uma célula vazia. Em "tiles sólidos", toque nos tiles que barram o jogador. Em "tiles plataforma", toque nos que dá para PISAR por cima e passar por baixo (estilo Mario). Os sólidos e plataformas do Pinta já vêm sugeridos.',
  },
  {
    type: 'sz_g2d_draw_tilemap',
    placement: 'command',
    message0: 'Desenhar o mapa %1 em x %2 y %3 com tiles de %4 px (0 = encaixar na tela)',
    args0: [
      { type: 'field_name_picker', name: 'MAP', text: 'mapa', kind: 'tilemap' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha o mapa de tiles. Com tiles de 0 px, ele ENCAIXA sozinho no tamanho da tela (tiles quadrados, sem distorcer) e fica centralizado. Escolha um tamanho (ex.: 32) para controlar você mesmo o tamanho dos tiles na tela: o mapa continua centralizado. x e y deslocam o mapa; use com a câmera para rolar um mapa maior que a tela.',
  },
  {
    type: 'sz_g2d_tilemap_collide',
    placement: 'command',
    message0: 'Impedir o sprite %1 de atravessar os tiles sólidos do mapa %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_name_picker', name: 'MAP', text: 'mapa', kind: 'tilemap' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O sprite não atravessa os tiles marcados como sólidos: ele pousa sobre o chão e bate nas paredes. Use a cada quadro, depois de mover o sprite.',
  },
  {
    type: 'sz_g2d_collide_group',
    placement: 'command',
    message0: 'Impedir o sprite %1 de atravessar os sprites do grupo %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_name_picker', name: 'GROUP', text: 'obstaculos', kind: 'group' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O sprite não atravessa nenhum sprite do grupo (pedras, casas, paredes desenhadas por você): ele é empurrado para fora e desliza pela beirada. Ótimo para obstáculos sem mapa de tiles. Use a cada quadro, depois de mover o sprite.',
  },
  {
    type: 'sz_g2d_collide_sprite',
    placement: 'command',
    message0: 'Impedir o sprite %1 de atravessar o sprite %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_sprite_picker', name: 'OTHER', text: 'parede' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Como "impedir de atravessar os sprites do grupo", mas contra UM sprite só (uma parede, uma plataforma). O sprite é empurrado para fora e desliza pela beirada. Use a cada quadro, depois de mover o sprite.',
  },
] satisfies BlockDefinition[]
