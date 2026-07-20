import type { ExtensionToolboxCategory } from '#extensions'
import type { BlockDefinition } from '../../blockly/blocks/types'
import { categoryShades } from '../../blockly/colorShades'

// Jogo 3D = UMA cor da categoria: AMARELO/dourado. A categoria inteira fica em
// TONS de amarelo, variando por área/kit.
const C = '#f0b80a' // base (cena/objetos/física)
const EVENT_C = '#f8d23f' // perguntas/eventos
const KIT_C = '#d49e00' // Kit Desvie
const GRID_C = '#fae07a' // grade/isométrico
const KIT2_C = '#e6ad00' // Kit Travessia
const RACE_C = '#b88700' // Kit Corrida
const STACK_C = '#ffe89a' // Kit Empilhar

export const gameThreeDBlocks = [
  {
    type: 'sz_g3d_create_scene',
    placement: 'start-only-command',
    message0: 'Criar cena 3D no canvas %1 e guardar em %2',
    args0: [
      { type: 'field_name_picker', name: 'CANVAS', text: 'tela', kind: 'canvas' },
      { type: 'field_input', name: 'NAME', text: 'cena' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria cena + câmera + renderizador + luz, prontos para desenhar. Crie um <canvas> no HTML antes.',
  },
  {
    type: 'sz_g3d_create_fullscreen_scene',
    placement: 'start-only-command',
    message0: 'Criar cena 3D em tela cheia e guardar em %1, fundo %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'cena' },
      { type: 'field_colour', name: 'BG', colour: '#0b1020' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Atalho: cria a tela (canvas) ocupando a janela inteira, já responsiva, mais a cena + câmera + luz. A cor do fundo fica atrás dos objetos da cena. Não precisa criar a tela de desenho no HTML.',
  },
  {
    type: 'sz_g3d_set_background',
    placement: 'command',
    message0: 'Cor de fundo da cena %1 como %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'field_colour', name: 'COLOR', colour: '#0b1020' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Troca a cor que aparece atrás de todos os objetos da cena 3D.',
  },
  {
    type: 'sz_g3d_set_camera',
    placement: 'command',
    message0: 'Posicionar câmera da cena %1 em x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Move a câmera (ela sempre olha para o centro 0,0,0).',
  },
  {
    type: 'sz_g3d_create_box',
    placement: 'start-only-command',
    message0: 'Criar cubo %1 na cena %2 tamanho %3 cor %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'caixa' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
      { type: 'field_colour', name: 'COLOR', colour: '#22d3ee' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Cria um cubo com todos os lados do mesmo tamanho e a cor escolhida.',
  },
  {
    type: 'sz_g3d_create_sphere',
    placement: 'start-only-command',
    message0: 'Criar esfera %1 na cena %2 raio %3 cor %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'bola' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
      { type: 'field_colour', name: 'COLOR', colour: '#f59e0b' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Cria uma esfera com o raio e a cor escolhidos.',
  },
  {
    type: 'sz_g3d_create_block',
    placement: 'start-only-command',
    message0: 'Criar caixa %1 na cena %2 largura %3 altura %4 profundidade %5 cor %6',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'chao' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'input_value', name: 'D', check: 'JSValue' },
      { type: 'field_colour', name: 'COLOR', colour: '#0369a1' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma caixa retangular (ótima para o chão). Depois use "Posição do objeto" para colocá-la no lugar.',
  },
  {
    type: 'sz_g3d_set_position',
    placement: 'command',
    message0: 'Posição do objeto %1 em x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'caixa', kind: 'object3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Coloca o objeto nas coordenadas x, y e z da cena 3D.',
  },
  {
    type: 'sz_g3d_set_rotation',
    placement: 'command',
    message0: 'Rotação do objeto %1 em x %2 y %3 z %4 (radianos)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'caixa', kind: 'object3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Gira o objeto. Anime dentro de "A cada frame 3D" usando uma variável que aumenta.',
  },
  {
    type: 'sz_g3d_set_scale',
    placement: 'command',
    message0: 'Tamanho (escala) do objeto %1 em %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'caixa', kind: 'object3d' },
      { type: 'input_value', name: 'FACTOR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Aumenta ou diminui o objeto (1 = tamanho normal, 2 = o dobro).',
  },
  {
    type: 'sz_g3d_animate',
    placement: 'loop-update',
    message0: 'A cada frame 3D da cena %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Loop de animação 3D (setAnimationLoop): roda o "fazer" e redesenha a cena a cada quadro.',
  },

  // ---- Física & controles ----
  {
    type: 'sz_g3d_control_keys',
    placement: 'loop-command',
    message0: 'Mover %1 com o teclado (WASD/setas), velocidade %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Anda no plano (frente/trás/lados) com W A S D ou as setas. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_set_velocity',
    placement: 'command',
    message0: 'Definir velocidade do objeto %1 em x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Define o quanto o objeto anda por quadro em cada eixo.',
  },
  {
    type: 'sz_g3d_jump',
    placement: 'command',
    message0: 'Fazer %1 pular com força %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'FORCE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Dá um impulso para cima, só funciona se o objeto estiver no chão. Combine com "se a tecla espaço está apertada".',
  },
  {
    type: 'sz_g3d_apply_gravity',
    placement: 'loop-command',
    message0: 'Mover %1 com gravidade (chão: %2)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'GROUND', text: 'chao', kind: 'object3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Puxa o objeto para baixo e o faz parar/quicar no chão, andando pela velocidade. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_camera_follow',
    placement: 'loop-command',
    message0: 'A câmera da cena %1 segue o objeto %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A câmera acompanha o objeto mantendo o mesmo enquadramento. Use dentro de "A cada frame 3D".',
  },

  // ---- Perguntas (booleanos) — caem dentro de um "se" ----
  {
    type: 'sz_g3d_key_down',
    message0: 'a tecla %1 está apertada?',
    args0: [
      {
        type: 'field_dropdown',
        name: 'KEY',
        options: [
          ['W (frente)', 'KeyW'],
          ['S (trás)', 'KeyS'],
          ['A (esquerda)', 'KeyA'],
          ['D (direita)', 'KeyD'],
          ['espaço (pular)', 'Space'],
          ['↑ seta para cima', 'ArrowUp'],
          ['↓ seta para baixo', 'ArrowDown'],
          ['← seta esquerda', 'ArrowLeft'],
          ['→ seta direita', 'ArrowRight'],
        ],
      },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Verdadeiro enquanto a tecla está sendo segurada. Use dentro de um "se", no "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_collides',
    message0: 'o objeto %1 está encostando em %2 ?',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'B', text: 'chao', kind: 'object3d' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Verdadeiro enquanto os dois objetos 3D estão se tocando. Use dentro de um "se".',
  },
  {
    type: 'sz_g3d_hit_any',
    message0: 'o objeto %1 encostou em algum de %2 ?',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'GROUP', text: 'inimigos', kind: 'group3d' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Verdadeiro se o objeto bateu em qualquer um do grupo (ótimo para o fim de jogo).',
  },

  // ---- Kit "Desvie": grupo de inimigos, spawner que avança e fim de jogo ----
  {
    type: 'sz_g3d_create_group',
    placement: 'start-only-command',
    message0: 'Criar grupo de objetos %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'inimigos' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT_C,
    tooltip: 'Cria uma lista vazia para guardar vários objetos (ex.: os inimigos).',
  },
  {
    type: 'sz_g3d_run_enemies',
    placement: 'loop-command',
    message0: 'Na cena %1, soltar inimigos no grupo %2 (chão %3) a cada %4 quadros, velocidade %5',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'field_name_picker', name: 'GROUP', text: 'inimigos', kind: 'group3d' },
      { type: 'field_name_picker', name: 'GROUND', text: 'chao', kind: 'object3d' },
      { type: 'input_value', name: 'EVERY', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT_C,
    tooltip:
      'Cria inimigos que vêm de longe acelerando e os move sozinho (limpa os que passam). Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_stop',
    placement: 'command',
    message0: 'Fim de jogo: parar a cena %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT_C,
    tooltip: 'Para o loop de animação (game over). Use dentro de um "se" de colisão.',
  },

  // ---- GENÉRICOS de grade/isométrico (fora do kit, p/ outros jogos) ----
  {
    type: 'sz_g3d_isometric_camera',
    placement: 'command',
    message0: 'Câmera isométrica na cena %1 seguindo o objeto %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'field_name_picker', name: 'FOLLOW', text: 'jogador', kind: 'object3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: GRID_C,
    tooltip:
      'Troca a câmera por uma isométrica (vista de cima em ângulo). Deixe o objeto em branco para não seguir ninguém.',
  },
  {
    type: 'sz_g3d_grid_position',
    placement: 'command',
    message0: 'Colocar o objeto %1 na linha %2 coluna %3',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'caixa', kind: 'object3d' },
      { type: 'input_value', name: 'ROW', check: 'JSValue' },
      { type: 'input_value', name: 'COL', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: GRID_C,
    tooltip: 'Coloca o objeto numa casa da grade (linha e coluna).',
  },
  {
    type: 'sz_g3d_grid_step',
    placement: 'loop-command',
    message0: 'Mover %1 em grade com as setas (a cada frame)',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: GRID_C,
    tooltip:
      'Anda uma casa por vez (com um pulinho) ao apertar as setas. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_grid_move',
    placement: 'command',
    message0: 'Dar um passo de %1 para %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      {
        type: 'field_dropdown',
        name: 'DIR',
        options: [
          ['frente', 'forward'],
          ['trás', 'backward'],
          ['esquerda', 'left'],
          ['direita', 'right'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: GRID_C,
    tooltip: 'Enfileira um passo na grade (ótimo para botões na tela).',
  },
  {
    type: 'sz_g3d_move_across',
    placement: 'loop-command',
    message0: 'Mover os objetos do grupo %1 (velocidade %2, dando a volta de x %3 até %4)',
    args0: [
      { type: 'field_name_picker', name: 'GROUP', text: 'carros', kind: 'group3d' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'MIN', check: 'JSValue' },
      { type: 'input_value', name: 'MAX', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: GRID_C,
    tooltip:
      'Move todos os objetos do grupo numa faixa, dando a volta nas bordas. Velocidade negativa = sentido contrário. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_touches_box',
    message0: 'o objeto %1 encosta em algum de %2 ?',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'GROUP', text: 'carros', kind: 'group3d' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Verdadeiro se o objeto bate em algum do grupo (caixa real, funciona com modelos como carros). Use num "se".',
  },

  // ---- Kit Travessia (atravessar a rua / Crossy Road) ----
  {
    type: 'sz_g3d_create_crossing_scene',
    placement: 'start-only-command',
    message0: 'Criar mundo Travessia no canvas %1 e guardar em %2',
    args0: [
      { type: 'field_name_picker', name: 'CANVAS', text: 'jogo', kind: 'canvas' },
      { type: 'field_input', name: 'NAME', text: 'mundo' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT2_C,
    tooltip:
      'Monta a cena com câmera isométrica e luz, pronta para o jogo de atravessar. Crie um <canvas> no HTML antes.',
  },
  {
    type: 'sz_g3d_create_crosser',
    placement: 'start-only-command',
    message0: 'Criar personagem da Travessia no mundo %1 cor %2 e guardar em %3',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'scene3d' },
      { type: 'field_colour', name: 'COLOR', colour: '#ffffff' },
      { type: 'field_input', name: 'NAME', text: 'jogador' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT2_C,
    tooltip: 'Cria o personagem (galinha) que pula de casa em casa. A câmera passa a segui-lo.',
  },
  {
    type: 'sz_g3d_crosser_move',
    placement: 'command',
    message0: 'Mover o personagem %1 para %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      {
        type: 'field_dropdown',
        name: 'DIR',
        options: [
          ['frente', 'forward'],
          ['trás', 'backward'],
          ['esquerda', 'left'],
          ['direita', 'right'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT2_C,
    tooltip:
      'Enfileira um passo do personagem (não sai do tabuleiro nem sobe em árvore). Ótimo para botões na tela.',
  },
  {
    type: 'sz_g3d_crosser_step',
    placement: 'loop-command',
    message0: 'Atualizar o personagem %1 no mundo %2 (a cada frame)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'scene3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT2_C,
    tooltip:
      'Move o personagem com as setas (em grade), gera mais ruas, segue com a câmera e conta a pontuação. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_crosser_reset',
    placement: 'command',
    message0: 'Recomeçar a Travessia: personagem %1 no mundo %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'scene3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT2_C,
    tooltip: 'Volta o personagem ao início e recria o mapa (botão Recomeçar).',
  },
  {
    type: 'sz_g3d_add_row',
    placement: 'start-only-command',
    message0: 'No mundo %1, na linha %2, criar faixa de %3 indo para %4 velocidade %5',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'scene3d' },
      { type: 'input_value', name: 'ROW', check: 'JSValue' },
      {
        type: 'field_dropdown',
        name: 'KIND',
        options: [
          ['grama', 'grass'],
          ['floresta (árvores)', 'forest'],
          ['carros', 'car'],
          ['caminhões', 'truck'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'DIR',
        options: [
          ['→ direita', 'right'],
          ['← esquerda', 'left'],
        ],
      },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT2_C,
    tooltip:
      'Cria uma linha do mapa: grama, floresta com árvores, ou uma pista com carros/caminhões andando.',
  },
  {
    type: 'sz_g3d_generate_rows',
    placement: 'start-only-command',
    message0: 'No mundo %1, gerar %2 linhas aleatórias',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'scene3d' },
      { type: 'input_value', name: 'COUNT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT2_C,
    tooltip:
      'Cria várias linhas sorteadas (grama/floresta/carros/caminhões) à frente do personagem.',
  },
  {
    type: 'sz_g3d_move_traffic',
    placement: 'loop-command',
    message0: 'Mover os veículos do mundo %1 (a cada frame)',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'scene3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT2_C,
    tooltip: 'Faz os carros e caminhões andarem e darem a volta. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_crosser_hit',
    message0: 'o personagem %1 bateu num veículo? (mundo %2)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'scene3d' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Verdadeiro quando o personagem é atropelado. Use num "se" para mostrar o fim de jogo.',
  },
  {
    type: 'sz_g3d_crosser_row',
    message0: 'a pontuação (linha) do personagem %1',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' }],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Quantas linhas o personagem avançou (a pontuação). Use num "se" ou para mostrar o placar.',
  },

  // ---- GENÉRICOS: câmera aérea + movimento circular + distância ----
  {
    type: 'sz_g3d_top_camera',
    placement: 'command',
    message0: 'Câmera aérea (de cima) na cena %1 seguindo o objeto %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'field_name_picker', name: 'FOLLOW', text: '', kind: 'object3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: GRID_C,
    tooltip:
      'Vê a cena de cima (vista aérea). Deixe o objeto em branco para a câmera ficar parada mostrando tudo.',
  },
  {
    type: 'sz_g3d_move_in_circle',
    placement: 'loop-command',
    message0: 'Mover %1 em círculo: raio %2 velocidade %3',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'carro', kind: 'object3d' },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Faz o objeto girar numa circunferência (centro no meio da cena), virado para a direção do movimento. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_distance_to',
    message0: 'a distância entre %1 e %2',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'carro', kind: 'object3d' },
      { type: 'field_name_picker', name: 'B', text: 'rival', kind: 'object3d' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'A distância entre dois objetos (no chão). Use numa conta ou num "se".',
  },
  {
    type: 'sz_g3d_is_near',
    message0: 'o objeto %1 está perto de %2 (menos de %3)?',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'carro', kind: 'object3d' },
      { type: 'field_name_picker', name: 'B', text: 'rival', kind: 'object3d' },
      { type: 'input_value', name: 'DIST', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Verdadeiro quando os dois objetos estão a menos da distância dada. Use num "se".',
  },

  // ---- Kit Corrida (correr numa pista) ----
  {
    type: 'sz_g3d_create_race_scene',
    placement: 'start-only-command',
    message0: 'Criar mundo de corrida no canvas %1 e guardar em %2',
    args0: [
      { type: 'field_name_picker', name: 'CANVAS', text: 'pista', kind: 'canvas' },
      { type: 'field_input', name: 'NAME', text: 'mundo' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: RACE_C,
    tooltip:
      'Monta a cena com câmera aérea e luz, pronta para a corrida. Crie um <canvas> no HTML antes.',
  },
  {
    type: 'sz_g3d_create_race_track',
    placement: 'start-only-command',
    message0: 'No mundo %1, criar a pista de corrida',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'scene3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: RACE_C,
    tooltip: 'Cria a pista oval (grama + asfalto + árvores).',
  },
  {
    type: 'sz_g3d_create_race_car',
    placement: 'start-only-command',
    message0: 'Criar carro do jogador no mundo %1 cor %2 e guardar em %3',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'scene3d' },
      { type: 'field_colour', name: 'COLOR', colour: '#ef2d56' },
      { type: 'field_input', name: 'NAME', text: 'carro' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: RACE_C,
    tooltip: 'Cria o carro do jogador na largada da pista.',
  },
  {
    type: 'sz_g3d_race_step',
    placement: 'loop-command',
    message0: 'Dirigir o carro %1 no mundo %2 (a cada frame)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'carro', kind: 'object3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'scene3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: RACE_C,
    tooltip:
      'Dá voltas na pista: ↑ acelera, ↓ freia. Conta as voltas. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_race_control',
    placement: 'command',
    message0: 'Carro %1: %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'carro', kind: 'object3d' },
      {
        type: 'field_dropdown',
        name: 'MODE',
        options: [
          ['acelerar', 'accelerate'],
          ['frear', 'decelerate'],
          ['velocidade normal', 'normal'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: RACE_C,
    tooltip: 'Muda a marcha do carro (ótimo para botões na tela).',
  },
  {
    type: 'sz_g3d_run_rivals',
    placement: 'loop-command',
    message0: 'No mundo %1, soltar e mover os carros rivais',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'scene3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: RACE_C,
    tooltip: 'Cria e move carros/caminhões rivais pela pista. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_race_reset',
    placement: 'command',
    message0: 'Recomeçar a corrida: carro %1 no mundo %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'carro', kind: 'object3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'scene3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: RACE_C,
    tooltip: 'Volta o carro à largada e limpa os rivais (botão Recomeçar).',
  },
  {
    type: 'sz_g3d_race_hit',
    message0: 'o carro %1 bateu num rival? (mundo %2)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'carro', kind: 'object3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'scene3d' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Verdadeiro quando o carro encosta num rival. Use num "se" para mostrar o fim de jogo.',
  },
  {
    type: 'sz_g3d_race_laps',
    message0: 'as voltas (pontuação) do carro %1',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'carro', kind: 'object3d' }],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Quantas voltas o carro completou (a pontuação). Use num "se" ou para mostrar o placar.',
  },

  // ---- GENÉRICOS: cair (com tombo), deslizar e girar (sem lib de física) ----
  {
    type: 'sz_g3d_fall',
    placement: 'loop-command',
    message0: 'fazer %1 cair girando',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'peca', kind: 'object3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Solta o objeto em queda livre, girando, até sumir da tela (gravidade). Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_slide_between',
    placement: 'loop-command',
    message0: 'Mover %1 no eixo %2 de %3 até %4 e voltar (velocidade %5)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'plataforma', kind: 'object3d' },
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: [
          ['↔ X', 'x'],
          ['↕ Y', 'y'],
          ['↗ Z', 'z'],
        ],
      },
      { type: 'input_value', name: 'MIN', check: 'JSValue' },
      { type: 'input_value', name: 'MAX', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Faz o objeto ir e voltar entre dois limites num eixo (ótimo para plataformas). Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_spin',
    placement: 'loop-command',
    message0: 'Girar %1 no eixo %2 velocidade %3',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: [
          ['↕ Y', 'y'],
          ['↔ X', 'x'],
          ['↗ Z', 'z'],
        ],
      },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Gira o objeto continuamente num eixo (moedas, hélices, planetas). Use dentro de "A cada frame 3D".',
  },

  // ---- Kit Empilhar (torre de blocos) ----
  {
    type: 'sz_g3d_create_stack_scene',
    placement: 'start-only-command',
    message0: 'Criar mundo de empilhar no canvas %1 e guardar em %2',
    args0: [
      { type: 'field_name_picker', name: 'CANVAS', text: 'jogo', kind: 'canvas' },
      { type: 'field_input', name: 'NAME', text: 'torre' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: STACK_C,
    tooltip:
      'Monta a cena com câmera isométrica (que sobe com a torre) e luz. Crie um <canvas> no HTML antes.',
  },
  {
    type: 'sz_g3d_create_stack_tower',
    placement: 'start-only-command',
    message0: 'No mundo %1, montar a base da torre',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'torre', kind: 'scene3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: STACK_C,
    tooltip: 'Cria a base e o primeiro bloco que desliza, pronto para empilhar.',
  },
  {
    type: 'sz_g3d_stack_drop',
    placement: 'command',
    message0: 'Soltar o bloco do mundo %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'torre', kind: 'scene3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: STACK_C,
    tooltip:
      'Encaixa o bloco que se move: a parte que sobra é cortada e cai. Errar o encaixe acaba o jogo. Ligue ao clique ou à tecla espaço.',
  },
  {
    type: 'sz_g3d_stack_step',
    placement: 'loop-command',
    message0: 'Atualizar a torre %1 (a cada frame)',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'torre', kind: 'scene3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: STACK_C,
    tooltip:
      'Desliza o bloco do topo, sobe a câmera e faz as sobras caírem. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_stack_reset',
    placement: 'command',
    message0: 'Recomeçar a torre %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'torre', kind: 'scene3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: STACK_C,
    tooltip: 'Limpa a torre e começa de novo (botão Recomeçar).',
  },
  {
    type: 'sz_g3d_stack_score',
    message0: 'a pontuação (andares) da torre %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'torre', kind: 'scene3d' }],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Quantos andares já foram empilhados (a pontuação). Use num "se" ou no placar.',
  },
  {
    type: 'sz_g3d_stack_game_over',
    message0: 'a torre %1 caiu (fim de jogo)?',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'torre', kind: 'scene3d' }],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Verdadeiro quando o jogador erra o encaixe. Use num "se" para mostrar o fim de jogo.',
  },

  // ---- GENÉRICOS: ler posição/rotação/escala + tempo do quadro (valores) ----
  {
    type: 'sz_g3d_get_pos',
    message0: 'posição %1 do objeto %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: [
          ['x', 'x'],
          ['y', 'y'],
          ['z', 'z'],
        ],
      },
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Lê uma coordenada da posição do objeto. Use numa conta ou num "se".',
  },
  {
    type: 'sz_g3d_get_rot',
    message0: 'rotação %1 do objeto %2 (radianos)',
    args0: [
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: [
          ['x', 'x'],
          ['y', 'y'],
          ['z', 'z'],
        ],
      },
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Lê o giro do objeto num eixo (em radianos).',
  },
  {
    type: 'sz_g3d_get_scale',
    message0: 'tamanho (escala) do objeto %1',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' }],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Lê o tamanho atual do objeto (1 = normal).',
  },
  {
    type: 'sz_g3d_get_vel',
    message0: 'velocidade %1 do objeto %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: [
          ['x', 'x'],
          ['y', 'y'],
          ['z', 'z'],
        ],
      },
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Lê a velocidade do objeto num eixo (a mesma que "Mudar a velocidade" grava). Use numa conta ou num "se".',
  },
  {
    type: 'sz_g3d_get_speed',
    message0: 'velocidade total do objeto %1',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' }],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'O quão rápido o objeto se move, juntando os três eixos. É sempre 0 ou positivo.',
  },
  {
    type: 'sz_g3d_is_moving',
    message0: 'o objeto %1 está se movendo?',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' }],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Verdadeiro quando o objeto tem alguma velocidade em qualquer eixo. Use num "se".',
  },
  {
    type: 'sz_g3d_dt',
    message0: 'tempo desde o último quadro (cena %1)',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' }],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Segundos desde o quadro anterior. Multiplique a velocidade por ele para o jogo correr igual em qualquer computador.',
  },

  // ---- GENÉRICOS: mover/girar relativo + suavizar (lerp) ----
  {
    type: 'sz_g3d_move_by',
    placement: 'loop-command',
    message0: 'mover %1 em x %2 y %3 z %4 (relativo)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Soma à posição atual (move em relação a onde já está). Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_rotate_by',
    placement: 'loop-command',
    message0: 'girar %1 no eixo %2 em %3 (relativo)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: [
          ['↕ Y', 'y'],
          ['↔ X', 'x'],
          ['↗ Z', 'z'],
        ],
      },
      { type: 'input_value', name: 'AMOUNT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Soma ao giro atual num eixo (radianos). Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_move_towards',
    placement: 'command',
    message0: 'suavizar %1 até x %2 y %3 z %4 (força %5)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'input_value', name: 'FACTOR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Aproxima o objeto do ponto aos poucos (força 0 a 1; 0.1 = bem suave). Ótimo para câmera/perseguição.',
  },

  // ---- GENÉRICOS: olhar / apontar / andar para frente ----
  {
    type: 'sz_g3d_look_at_object',
    placement: 'command',
    message0: 'virar %1 para olhar o objeto %2',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'canhao', kind: 'object3d' },
      { type: 'field_name_picker', name: 'B', text: 'alvo', kind: 'object3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Faz o primeiro objeto apontar para o segundo (mira/perseguição).',
  },
  {
    type: 'sz_g3d_look_at_point',
    placement: 'command',
    message0: 'virar %1 para o ponto x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Faz o objeto apontar para um ponto da cena.',
  },
  {
    type: 'sz_g3d_move_forward',
    placement: 'loop-command',
    message0: 'andar %1 para frente %2 (na direção que olha)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'DIST', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Move o objeto para frente, na direção para onde ele está virado. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_face_velocity',
    placement: 'command',
    message0: 'girar %1 para a direção do movimento',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Vira o objeto para onde ele está se movendo (use com velocidade/física).',
  },
  {
    type: 'sz_g3d_angle_to',
    message0: 'ângulo de %1 para %2 (no chão)',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'B', text: 'alvo', kind: 'object3d' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'O ângulo (em radianos) de A para B no plano do chão. Use para mirar/girar.',
  },

  // ---- GENÉRICOS: mira & clique (raycast) ----
  {
    type: 'sz_g3d_pick_at_mouse',
    message0: 'objeto sob o mouse na cena %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' }],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'O objeto 3D que está embaixo do ponteiro (ou vazio). Guarde numa variável para usá-lo.',
  },
  {
    type: 'sz_g3d_pointer_over',
    message0: 'o mouse está sobre o objeto %1 (cena %2)?',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'botao', kind: 'object3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Verdadeiro quando o ponteiro está em cima daquele objeto. Use num "se".',
  },
  {
    type: 'sz_g3d_aim_ahead',
    message0: 'objeto que %1 está mirando (cena %2, alcance %3)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'input_value', name: 'DIST', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'O objeto à frente, na direção que o objeto olha (tiro/mira). Vazio se não houver nada.',
  },
  {
    type: 'sz_g3d_on_ground',
    message0: 'tem chão sob %1 (cena %2)?',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Verdadeiro quando há um objeto logo abaixo (pisando no chão/plataforma). Use num "se".',
  },
  {
    type: 'sz_g3d_ground_height',
    message0: 'altura do chão sob %1 (cena %2)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'A altura (y) do topo do objeto que está logo abaixo. Útil para encostar no chão.',
  },

  // ---- GENÉRICOS: física avançada (corpo, sólidos, presets) ----
  {
    type: 'sz_g3d_body',
    placement: 'start-only-command',
    message0: 'dar corpo físico a %1 (gravidade %2)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'GRAVITY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Liga a física no objeto (a gravidade puxa para baixo; use número negativo).',
  },
  {
    type: 'sz_g3d_step_body',
    placement: 'loop-command',
    message0: 'mover %1 com física no mundo %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Aplica a gravidade e empurra para fora dos objetos sólidos. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_set_solid',
    placement: 'start-only-command',
    message0: 'marcar %1 como sólido (não atravessa)',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'chao', kind: 'object3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Diz que esse objeto é parede/chão: a física não deixa atravessá-lo.',
  },
  {
    type: 'sz_g3d_platformer_controls',
    placement: 'loop-command',
    message0: 'controle de plataforma para %1 no mundo %2 (velocidade %3, pulo %4)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'JUMP', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Anda com WASD/setas + pula no espaço, com gravidade e colisão. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_fps_controls',
    placement: 'loop-command',
    message0: 'controle de primeira pessoa para %1 no mundo %2 (velocidade %3)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Anda com WASD na direção que o jogador olha (combine com a câmera de primeira pessoa). Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_resolve_collision',
    placement: 'command',
    message0: 'empurrar %1 para fora de %2',
    args0: [
      { type: 'field_name_picker', name: 'A', text: 'jogador', kind: 'object3d' },
      { type: 'field_name_picker', name: 'B', text: 'parede', kind: 'object3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Se A está dentro de B, empurra A para fora (colisão manual entre dois objetos).',
  },

  // ---- GENÉRICOS: câmeras vivas (1ª pessoa, orbital, 3ª pessoa, FOV) ----
  {
    type: 'sz_g3d_fps_camera',
    placement: 'command',
    message0: 'câmera em primeira pessoa na cena %1 presa a %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: GRID_C,
    tooltip:
      'Põe a câmera nos olhos do objeto e olha com o mouse (clique para travar o ponteiro). Combine com o controle de primeira pessoa.',
  },
  {
    type: 'sz_g3d_orbit_camera',
    placement: 'command',
    message0: 'câmera orbital na cena %1 olhando para %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: GRID_C,
    tooltip: 'Gira a câmera ao redor de um objeto arrastando o mouse (e a roda dá zoom).',
  },
  {
    type: 'sz_g3d_third_person_camera',
    placement: 'command',
    message0: 'câmera em terceira pessoa na cena %1 atrás de %2 (distância %3, altura %4)',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
      { type: 'input_value', name: 'DIST', check: 'JSValue' },
      { type: 'input_value', name: 'HEIGHT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: GRID_C,
    tooltip:
      'A câmera segue atrás e acima do objeto (estilo aventura). Use no início ou a cada frame.',
  },
  {
    type: 'sz_g3d_camera_look_at',
    placement: 'command',
    message0: 'a câmera da cena %1 olha para %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'field_name_picker', name: 'OBJ', text: 'jogador', kind: 'object3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: GRID_C,
    tooltip: 'Aponta a câmera para um objeto.',
  },
  {
    type: 'sz_g3d_set_fov',
    placement: 'command',
    message0: 'campo de visão da câmera da cena %1 = %2 graus',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'input_value', name: 'DEG', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: GRID_C,
    tooltip: 'Muda o "zoom" da câmera (graus): menos = mais zoom, mais = grande angular.',
  },

  // ---- GENÉRICOS: formas, materiais, texturas, modelo (Fase 6) ----
  {
    type: 'sz_g3d_create_cylinder',
    placement: 'start-only-command',
    message0: 'Criar cilindro %1 na cena %2 (raio %3, altura %4, cor %5)',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'cilindro' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
      { type: 'input_value', name: 'HEIGHT', check: 'JSValue' },
      { type: 'field_colour', name: 'COLOR', colour: '#22d3ee' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Cria um cilindro com o raio, a altura e a cor escolhidos.',
  },
  {
    type: 'sz_g3d_create_cone',
    placement: 'start-only-command',
    message0: 'Criar cone %1 na cena %2 (raio %3, altura %4, cor %5)',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'cone' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
      { type: 'input_value', name: 'HEIGHT', check: 'JSValue' },
      { type: 'field_colour', name: 'COLOR', colour: '#f59e0b' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Cria um cone com o raio da base, a altura e a cor escolhidos.',
  },
  {
    type: 'sz_g3d_create_plane',
    placement: 'start-only-command',
    message0: 'Criar plano (chão) %1 na cena %2 (largura %3, profundidade %4, cor %5)',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'chao' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'D', check: 'JSValue' },
      { type: 'field_colour', name: 'COLOR', colour: '#67c240' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Um plano fino deitado no chão (ótimo para o chão do jogo).',
  },
  {
    type: 'sz_g3d_create_torus',
    placement: 'start-only-command',
    message0: 'Criar rosca (anel) %1 na cena %2 (raio %3, grossura %4, cor %5)',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'anel' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
      { type: 'input_value', name: 'TUBE', check: 'JSValue' },
      { type: 'field_colour', name: 'COLOR', colour: '#a78bfa' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Cria um anel 3D; raio controla o tamanho e grossura controla o tubo.',
  },
  {
    type: 'sz_g3d_create_model',
    placement: 'start-only-command',
    message0: 'Criar modelo %1 na cena %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'modelo' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Um grupo vazio para montar um modelo com várias peças (use "adicionar ao modelo").',
  },
  {
    type: 'sz_g3d_add_to_model',
    placement: 'start-only-command',
    message0: 'Adicionar %1 ao modelo %2',
    args0: [
      { type: 'field_name_picker', name: 'PART', text: 'peca', kind: 'object3d' },
      { type: 'field_name_picker', name: 'MODEL', text: 'modelo', kind: 'object3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Junta uma peça (objeto) ao modelo. Mover o modelo move todas as peças juntas.',
  },
  {
    type: 'sz_g3d_set_visible',
    placement: 'command',
    message0: '%1 o objeto %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'MODE',
        options: [
          ['Mostrar', 'show'],
          ['Esconder', 'hide'],
        ],
      },
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Mostra ou esconde o objeto (continua existindo, só não aparece).',
  },
  {
    type: 'sz_g3d_remove_object',
    placement: 'command',
    message0: 'Remover %1 da cena %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Tira o objeto da cena de vez (apaga e libera memória).',
  },
  {
    type: 'sz_g3d_set_color',
    placement: 'command',
    message0: 'Pintar %1 de %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
      { type: 'field_colour', name: 'COLOR', colour: '#ff5577' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Troca a cor do objeto.',
  },
  {
    type: 'sz_g3d_set_opacity',
    placement: 'command',
    message0: 'Transparência de %1 = %2 (0 a 1)',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
      { type: 'input_value', name: 'OPACITY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Deixa o objeto transparente (1 = opaco, 0 = invisível).',
  },
  {
    type: 'sz_g3d_set_material',
    placement: 'start-only-command',
    message0: 'Deixar %1 com material %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
      {
        type: 'field_dropdown',
        name: 'KIND',
        options: [
          ['normal', 'normal'],
          ['metal', 'metal'],
          ['vidro', 'glass'],
          ['brilhante', 'glow'],
          ['só linhas', 'wireframe'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Muda o estilo da superfície (metal, vidro, brilhante ou só linhas).',
  },
  {
    type: 'sz_g3d_set_texture',
    placement: 'start-only-command',
    message0: 'Vestir %1 com a imagem %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
      { type: 'field_asset_picker', name: 'ASSET', text: 'textura' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Põe uma imagem (asset adicionado ao projeto) na superfície do objeto.',
  },

  // ---- GENÉRICOS: luz & céu (Fase 7) ----
  {
    type: 'sz_g3d_add_ambient_light',
    placement: 'start-only-command',
    message0: 'Adicionar luz ambiente na cena %1 (cor %2, força %3)',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'field_colour', name: 'COLOR', colour: '#ffffff' },
      { type: 'input_value', name: 'INTENSITY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Luz suave que clareia tudo por igual (sem sombra). Crie uma vez, fora do "a cada quadro".',
  },
  {
    type: 'sz_g3d_add_sun_light',
    placement: 'start-only-command',
    message0: 'Adicionar luz do sol na cena %1 (cor %2, força %3)',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'field_colour', name: 'COLOR', colour: '#fff8e1' },
      { type: 'input_value', name: 'INTENSITY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip: 'Luz direcional vinda do alto (como o sol), faz sombras.',
  },
  {
    type: 'sz_g3d_add_point_light',
    placement: 'start-only-command',
    message0: 'Adicionar luz pontual na cena %1 (cor %2, força %3) em x %4 y %5 z %6',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'field_colour', name: 'COLOR', colour: '#ffd27f' },
      { type: 'input_value', name: 'INTENSITY', check: 'JSValue' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip: 'Uma lâmpada/tocha que brilha de um ponto para todos os lados.',
  },
  {
    type: 'sz_g3d_set_fog',
    placement: 'start-only-command',
    message0: 'Neblina na cena %1 (cor %2, perto %3, longe %4)',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'field_colour', name: 'COLOR', colour: '#9ca3af' },
      { type: 'input_value', name: 'NEAR', check: 'JSValue' },
      { type: 'input_value', name: 'FAR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip: 'Faz o que está longe sumir na névoa (começa em "perto", some em "longe").',
  },
  {
    type: 'sz_g3d_set_sky',
    placement: 'start-only-command',
    message0: 'Céu degradê na cena %1 (topo %2, horizonte %3)',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
      { type: 'field_colour', name: 'TOP', colour: '#1e3a8a' },
      { type: 'field_colour', name: 'BOTTOM', colour: '#93c5fd' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip: 'Pinta o fundo com um degradê do topo até o horizonte (céu).',
  },
  {
    type: 'sz_g3d_set_shadows',
    placement: 'start-only-command',
    message0: '%1 as sombras na cena %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'MODE',
        options: [
          ['Ligar', 'on'],
          ['Desligar', 'off'],
        ],
      },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip: 'Liga ou desliga as sombras da cena (desligar deixa o jogo mais leve).',
  },

  // ---- GENÉRICOS: enxames & som (Fase 8) ----
  {
    type: 'sz_g3d_create_swarm',
    placement: 'start-only-command',
    message0: 'Criar enxame %1 na cena %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'enxame' },
      { type: 'field_name_picker', name: 'WORLD', text: 'cena', kind: 'scene3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: '#f472b6',
    tooltip: 'Cria um grupo (vazio) para guardar muitas cópias de um objeto.',
  },
  {
    type: 'sz_g3d_spawn_in_swarm',
    placement: 'command',
    message0: 'Soltar cópia de %1 no enxame %2 em x %3 y %4 z %5',
    args0: [
      { type: 'field_name_picker', name: 'ORIGINAL', text: 'modelo', kind: 'object3d' },
      { type: 'field_name_picker', name: 'SWARM', text: 'enxame', kind: 'group3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: '#f472b6',
    tooltip: 'Cria uma cópia de um objeto e a coloca no enxame, na posição dada.',
  },
  {
    type: 'sz_g3d_count_swarm',
    message0: 'quantidade de cópias no enxame %1',
    args0: [{ type: 'field_name_picker', name: 'SWARM', text: 'enxame', kind: 'group3d' }],
    output: 'JSValue',
    colour: '#f472b6',
    tooltip: 'Mostra quantas cópias existem agora no enxame.',
  },
  {
    type: 'sz_g3d_for_each_swarm',
    placement: 'command',
    message0: 'Para cada %1 do enxame %2',
    args0: [
      { type: 'field_input', name: 'ITEM', text: 'item' },
      { type: 'field_name_picker', name: 'SWARM', text: 'enxame', kind: 'group3d' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: '#f472b6',
    tooltip: 'Repete os blocos de dentro para cada objeto do enxame (o objeto da vez é "item").',
  },
  {
    type: 'sz_g3d_remove_from_swarm',
    placement: 'command',
    message0: 'Tirar %1 do enxame %2',
    args0: [
      { type: 'field_name_picker', name: 'ITEM', text: 'item', kind: 'object3d' },
      { type: 'field_name_picker', name: 'SWARM', text: 'enxame', kind: 'group3d' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: '#f472b6',
    tooltip: 'Remove uma cópia do enxame e da cena (ótimo dentro do "para cada").',
  },
  {
    type: 'sz_g3d_prune_swarm',
    placement: 'command',
    message0: 'No enxame %1, tirar o que saiu de %2 a %3 no eixo %4',
    args0: [
      { type: 'field_name_picker', name: 'SWARM', text: 'enxame', kind: 'group3d' },
      { type: 'input_value', name: 'MIN', check: 'JSValue' },
      { type: 'input_value', name: 'MAX', check: 'JSValue' },
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: [
          ['↔ X', 'x'],
          ['↕ Y', 'y'],
          ['↗ Z', 'z'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: '#f472b6',
    tooltip: 'Limpa do enxame as cópias que passaram dos limites (saíram da tela), higiene.',
  },
  {
    type: 'sz_g3d_play_note',
    placement: 'command',
    message0: 'Tocar nota %1 Hz por %2 ms',
    args0: [
      { type: 'input_value', name: 'FREQ', check: 'JSValue' },
      { type: 'input_value', name: 'MS', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: '#f472b6',
    tooltip: 'Toca um bip (mais Hz = mais agudo). Precisa de um clique antes (o navegador exige).',
  },
  {
    type: 'sz_g3d_play_effect',
    placement: 'command',
    message0: 'Tocar efeito %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'KIND',
        options: [
          ['moeda', 'coin'],
          ['pulo', 'jump'],
          ['explosão', 'explosion'],
          ['acerto', 'hit'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: '#f472b6',
    tooltip: 'Toca um efeito sonoro pronto (moeda, pulo, explosão ou acerto).',
  },
] satisfies BlockDefinition[]

/**
 * Subcategorias da paleta (mesmo padrão do Jogo 2D): agrupa os blocos por tema
 * para a criança achar mais fácil. `leftover` garante que nenhum bloco novo
 * desapareça da paleta se esquecer de ser mapeado aqui.
 */
const SUBCATS: { name: string; colour: string; types: string[] }[] = [
  {
    name: '🧱 Cena & objetos',
    colour: C,
    types: [
      'sz_g3d_create_scene',
      'sz_g3d_create_fullscreen_scene',
      'sz_g3d_set_background',
      'sz_g3d_set_camera',
      'sz_g3d_create_box',
      'sz_g3d_create_sphere',
      'sz_g3d_create_block',
      'sz_g3d_set_position',
      'sz_g3d_set_rotation',
      'sz_g3d_set_scale',
      'sz_g3d_animate',
    ],
  },
  {
    name: '🎮 Física & controles',
    colour: C,
    types: [
      'sz_g3d_control_keys',
      'sz_g3d_set_velocity',
      'sz_g3d_jump',
      'sz_g3d_apply_gravity',
      'sz_g3d_camera_follow',
      'sz_g3d_move_in_circle',
      'sz_g3d_fall',
      'sz_g3d_slide_between',
      'sz_g3d_spin',
    ],
  },
  {
    name: '🎥 Câmera & grade 3D',
    colour: GRID_C,
    types: [
      'sz_g3d_isometric_camera',
      'sz_g3d_grid_position',
      'sz_g3d_grid_step',
      'sz_g3d_grid_move',
      'sz_g3d_move_across',
      'sz_g3d_top_camera',
    ],
  },
  {
    name: '❓ Perguntas',
    colour: EVENT_C,
    types: [
      'sz_g3d_key_down',
      'sz_g3d_collides',
      'sz_g3d_hit_any',
      'sz_g3d_touches_box',
      'sz_g3d_distance_to',
      'sz_g3d_is_near',
    ],
  },
  {
    name: '📐 Posição & direção',
    colour: GRID_C,
    types: [
      'sz_g3d_get_pos',
      'sz_g3d_get_rot',
      'sz_g3d_get_scale',
      'sz_g3d_get_vel',
      'sz_g3d_get_speed',
      'sz_g3d_is_moving',
      'sz_g3d_dt',
      'sz_g3d_move_by',
      'sz_g3d_rotate_by',
      'sz_g3d_move_towards',
    ],
  },
  {
    name: '🧭 Olhar & apontar',
    colour: GRID_C,
    types: [
      'sz_g3d_look_at_object',
      'sz_g3d_look_at_point',
      'sz_g3d_move_forward',
      'sz_g3d_face_velocity',
      'sz_g3d_angle_to',
    ],
  },
  {
    name: '🎯 Mira & clique',
    colour: GRID_C,
    types: [
      'sz_g3d_pick_at_mouse',
      'sz_g3d_pointer_over',
      'sz_g3d_aim_ahead',
      'sz_g3d_on_ground',
      'sz_g3d_ground_height',
    ],
  },
  {
    name: '🏃 Corpo & colisões',
    colour: C,
    types: [
      'sz_g3d_body',
      'sz_g3d_step_body',
      'sz_g3d_set_solid',
      'sz_g3d_platformer_controls',
      'sz_g3d_fps_controls',
      'sz_g3d_resolve_collision',
    ],
  },
  {
    name: '🎥 Câmera viva',
    colour: GRID_C,
    types: [
      'sz_g3d_fps_camera',
      'sz_g3d_orbit_camera',
      'sz_g3d_third_person_camera',
      'sz_g3d_camera_look_at',
      'sz_g3d_set_fov',
    ],
  },
  {
    name: '🧊 Formas & modelos',
    colour: C,
    types: [
      'sz_g3d_create_cylinder',
      'sz_g3d_create_cone',
      'sz_g3d_create_plane',
      'sz_g3d_create_torus',
      'sz_g3d_create_model',
      'sz_g3d_add_to_model',
      'sz_g3d_set_visible',
      'sz_g3d_remove_object',
    ],
  },
  {
    name: '🎨 Aparência',
    colour: C,
    types: ['sz_g3d_set_color', 'sz_g3d_set_opacity', 'sz_g3d_set_material', 'sz_g3d_set_texture'],
  },
  {
    name: '💡 Luz & céu',
    colour: EVENT_C,
    types: [
      'sz_g3d_add_ambient_light',
      'sz_g3d_add_sun_light',
      'sz_g3d_add_point_light',
      'sz_g3d_set_fog',
      'sz_g3d_set_sky',
      'sz_g3d_set_shadows',
    ],
  },
  {
    name: '👯 Enxames & som',
    colour: '#f472b6',
    types: [
      'sz_g3d_create_swarm',
      'sz_g3d_spawn_in_swarm',
      'sz_g3d_count_swarm',
      'sz_g3d_for_each_swarm',
      'sz_g3d_remove_from_swarm',
      'sz_g3d_prune_swarm',
      'sz_g3d_play_note',
      'sz_g3d_play_effect',
    ],
  },
  {
    name: '👾 Kit Desvie',
    colour: KIT_C,
    types: ['sz_g3d_create_group', 'sz_g3d_run_enemies', 'sz_g3d_stop'],
  },
  {
    name: '🐔 Kit Travessia',
    colour: KIT2_C,
    types: [
      'sz_g3d_create_crossing_scene',
      'sz_g3d_create_crosser',
      'sz_g3d_crosser_move',
      'sz_g3d_crosser_step',
      'sz_g3d_crosser_reset',
      'sz_g3d_add_row',
      'sz_g3d_generate_rows',
      'sz_g3d_move_traffic',
      'sz_g3d_crosser_hit',
      'sz_g3d_crosser_row',
    ],
  },
  {
    name: '🏎️ Kit Corrida',
    colour: RACE_C,
    types: [
      'sz_g3d_create_race_scene',
      'sz_g3d_create_race_track',
      'sz_g3d_create_race_car',
      'sz_g3d_race_step',
      'sz_g3d_race_control',
      'sz_g3d_run_rivals',
      'sz_g3d_race_reset',
      'sz_g3d_race_hit',
      'sz_g3d_race_laps',
    ],
  },
  {
    name: '📦 Kit Empilhar',
    colour: STACK_C,
    types: [
      'sz_g3d_create_stack_scene',
      'sz_g3d_create_stack_tower',
      'sz_g3d_stack_drop',
      'sz_g3d_stack_step',
      'sz_g3d_stack_reset',
      'sz_g3d_stack_score',
      'sz_g3d_stack_game_over',
    ],
  },
]

// Cada sub-categoria recebe um TOM do amarelo da categoria (derivado da base C por
// categoryShades) — sobrepõe os consts/hex dos SUBCATS, inclusive o "Enxames & som"
// que estava com ROSA hardcoded (#f472b6) e fugia da família amarela.
const SUBCAT_SHADES = categoryShades(C, SUBCATS.length)
SUBCATS.forEach((sc, i) => {
  sc.colour = SUBCAT_SHADES[i] ?? C
})
// Cor = navegação: pinta cada bloco com o TOM da sua sub-categoria, sobrepondo o
// const usado na definição — sem isto o bloco não seguia a cor do seu grupo
// (game-2d já fazia; o game-3d não tinha este loop).
const COLOUR_BY_TYPE = new Map<string, string>(
  SUBCATS.flatMap((sc) => sc.types.map((t) => [t, sc.colour] as const)),
)
const STACKED_INPUT_TYPES = new Set([
  'sz_g3d_create_block',
  'sz_g3d_run_enemies',
  'sz_g3d_add_row',
  'sz_g3d_slide_between',
  'sz_g3d_move_towards',
  'sz_g3d_create_cylinder',
  'sz_g3d_create_cone',
  'sz_g3d_create_plane',
  'sz_g3d_create_torus',
  'sz_g3d_add_point_light',
  'sz_g3d_spawn_in_swarm',
])
for (const b of gameThreeDBlocks) {
  const colour = COLOUR_BY_TYPE.get(b.type)
  if (colour) b.colour = colour
  if (STACKED_INPUT_TYPES.has(b.type)) (b as { inputsInline?: boolean }).inputsInline = false
}

const CATEGORIZED = new Set(SUBCATS.flatMap((sc) => sc.types))
const leftover = gameThreeDBlocks.map((b) => b.type).filter((t) => !CATEGORIZED.has(t))

const numShadow = (value: number) => ({ shadow: { type: 'sz_val_number', fields: { NUM: value } } })

/**
 * Sombras dos soquetes de valor do Jogo 3D na paleta (espelho do `G2D_SOCKET_SHADOWS`):
 * tipo do bloco → { input → sombra de número editável }. Faz o oval já vir com o
 * valor padrão preenchido ao arrastar da paleta. Cresce a cada campo convertido.
 */
const G3D_SOCKET_SHADOWS: Record<string, Record<string, unknown>> = {
  sz_g3d_set_camera: { X: numShadow(4), Y: numShadow(3), Z: numShadow(6) },
  sz_g3d_create_box: { SIZE: numShadow(1) },
  sz_g3d_create_sphere: { RADIUS: numShadow(0.5) },
  sz_g3d_create_block: { W: numShadow(10), H: numShadow(0.5), D: numShadow(50) },
  sz_g3d_set_position: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3d_set_rotation: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3d_set_scale: { FACTOR: numShadow(1) },
  sz_g3d_create_cylinder: { RADIUS: numShadow(0.5), HEIGHT: numShadow(1) },
  sz_g3d_create_cone: { RADIUS: numShadow(0.5), HEIGHT: numShadow(1) },
  sz_g3d_create_plane: { W: numShadow(10), D: numShadow(10) },
  sz_g3d_create_torus: { RADIUS: numShadow(0.5), TUBE: numShadow(0.2) },
  sz_g3d_control_keys: { SPEED: numShadow(0.05) },
  sz_g3d_set_velocity: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3d_jump: { FORCE: numShadow(0.08) },
  sz_g3d_grid_position: { ROW: numShadow(0), COL: numShadow(0) },
  sz_g3d_move_in_circle: { RADIUS: numShadow(7), SPEED: numShadow(0.02) },
  sz_g3d_slide_between: { MIN: numShadow(-5), MAX: numShadow(5), SPEED: numShadow(0.05) },
  sz_g3d_spin: { SPEED: numShadow(0.03) },
  sz_g3d_move_towards: {
    X: numShadow(0),
    Y: numShadow(0),
    Z: numShadow(0),
    FACTOR: numShadow(0.1),
  },
  sz_g3d_move_by: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3d_rotate_by: { AMOUNT: numShadow(0.01) },
  sz_g3d_look_at_point: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3d_move_forward: { DIST: numShadow(0.05) },
  sz_g3d_body: { GRAVITY: numShadow(-0.01) },
  sz_g3d_platformer_controls: { SPEED: numShadow(0.08), JUMP: numShadow(0.18) },
  sz_g3d_fps_controls: { SPEED: numShadow(0.08) },
  sz_g3d_third_person_camera: { DIST: numShadow(6), HEIGHT: numShadow(3) },
  sz_g3d_set_fov: { DEG: numShadow(60) },
  sz_g3d_set_opacity: { OPACITY: numShadow(1) },
  sz_g3d_add_ambient_light: { INTENSITY: numShadow(0.6) },
  sz_g3d_add_sun_light: { INTENSITY: numShadow(0.9) },
  sz_g3d_add_point_light: {
    INTENSITY: numShadow(1),
    X: numShadow(0),
    Y: numShadow(2),
    Z: numShadow(0),
  },
  sz_g3d_set_fog: { NEAR: numShadow(1), FAR: numShadow(30) },
  sz_g3d_run_enemies: { EVERY: numShadow(200), SPEED: numShadow(0.02) },
  sz_g3d_add_row: { ROW: numShadow(1), SPEED: numShadow(150) },
  sz_g3d_generate_rows: { COUNT: numShadow(20) },
  sz_g3d_move_across: { SPEED: numShadow(0.1), MIN: numShadow(-10), MAX: numShadow(10) },
  sz_g3d_spawn_in_swarm: { X: numShadow(0), Y: numShadow(0), Z: numShadow(0) },
  sz_g3d_prune_swarm: { MIN: numShadow(-20), MAX: numShadow(20) },
  sz_g3d_play_note: { FREQ: numShadow(440), MS: numShadow(200) },
  sz_g3d_is_near: { DIST: numShadow(2) },
  sz_g3d_aim_ahead: { DIST: numShadow(100) },
}

/** (só p/ teste de drift) espelho do G2D_SOCKET_SHADOW_TYPES — ver o comentário lá. */
export const G3D_SOCKET_SHADOW_TYPES: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(G3D_SOCKET_SHADOWS).map(([type, slots]) => [
    type,
    Object.fromEntries(
      Object.entries(slots).map(([slot, wrapper]) => [
        slot,
        String((wrapper as { shadow?: { type?: string } }).shadow?.type ?? ''),
      ]),
    ),
  ]),
)

const toolboxBlock = (type: string) => {
  const inputs = G3D_SOCKET_SHADOWS[type]
  return inputs ? { kind: 'block' as const, type, inputs } : { kind: 'block' as const, type }
}

export const gameThreeDToolboxCategory: ExtensionToolboxCategory = {
  kind: 'category',
  name: 'Jogo 3D',
  colour: C,
  contents: [
    ...SUBCATS.map((sc) => ({
      kind: 'category' as const,
      name: sc.name,
      colour: sc.colour,
      contents: sc.types.map(toolboxBlock),
    })),
    ...(leftover.length
      ? [
          {
            kind: 'category' as const,
            name: 'Mais',
            colour: C,
            contents: leftover.map(toolboxBlock),
          },
        ]
      : []),
  ],
}
