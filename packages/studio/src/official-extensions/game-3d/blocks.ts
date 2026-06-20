import type { ExtensionToolboxCategory } from '#extensions'

// Cor base da extensão (cena/objetos/física). Perguntas usam dourado (como o
// Jogo 2D) e o Kit "Desvie" usa um tom de inimigo (rosa/vermelho).
const C = '#a78bfa'
const EVENT_C = '#fbbf24'
const KIT_C = '#fb7185'
// Genéricos de grade/isométrico (azul) e Kit Travessia (verde grama).
const GRID_C = '#38bdf8'
const KIT2_C = '#84cc16'

export const gameThreeDBlocks = [
  {
    type: 'sz_g3d_create_scene',
    message0: 'Criar cena 3D no canvas %1 e guardar em %2',
    args0: [
      { type: 'field_input', name: 'CANVAS', text: 'tela' },
      { type: 'field_input', name: 'NAME', text: 'cena' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria cena + câmera + renderizador + luz, prontos para desenhar. Crie um <canvas> no HTML antes.',
  },
  {
    type: 'sz_g3d_set_background',
    message0: 'Cor de fundo da cena %1 como %2',
    args0: [
      { type: 'field_input', name: 'WORLD', text: 'cena' },
      { type: 'field_colour', name: 'COLOR', colour: '#0b1020' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g3d_set_camera',
    message0: 'Posicionar câmera da cena %1 em x %2 y %3 z %4',
    args0: [
      { type: 'field_input', name: 'WORLD', text: 'cena' },
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
    message0: 'Criar cubo %1 na cena %2 tamanho %3 cor %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'caixa' },
      { type: 'field_input', name: 'WORLD', text: 'cena' },
      { type: 'field_number', name: 'SIZE', value: 1, min: 0.1 },
      { type: 'field_colour', name: 'COLOR', colour: '#22d3ee' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g3d_create_sphere',
    message0: 'Criar esfera %1 na cena %2 raio %3 cor %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'bola' },
      { type: 'field_input', name: 'WORLD', text: 'cena' },
      { type: 'field_number', name: 'RADIUS', value: 0.5, min: 0.1 },
      { type: 'field_colour', name: 'COLOR', colour: '#f59e0b' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g3d_create_block',
    message0: 'Criar caixa %1 na cena %2 largura %3 altura %4 profundidade %5 cor %6',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'chao' },
      { type: 'field_input', name: 'WORLD', text: 'cena' },
      { type: 'field_number', name: 'W', value: 10, min: 0.1 },
      { type: 'field_number', name: 'H', value: 0.5, min: 0.1 },
      { type: 'field_number', name: 'D', value: 50, min: 0.1 },
      { type: 'field_colour', name: 'COLOR', colour: '#0369a1' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma caixa retangular (ótima para o chão). Depois use "Posição do objeto" para colocá-la no lugar.',
  },
  {
    type: 'sz_g3d_set_position',
    message0: 'Posição do objeto %1 em x %2 y %3 z %4',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'caixa' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g3d_set_rotation',
    message0: 'Rotação do objeto %1 em x %2 y %3 z %4 (radianos)',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'caixa' },
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
    message0: 'Tamanho (escala) do objeto %1 em %2',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'caixa' },
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
    message0: 'A cada frame 3D da cena %1, fazer %2',
    args0: [
      { type: 'field_input', name: 'WORLD', text: 'cena' },
      { type: 'input_statement', name: 'BODY' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Loop de animação 3D (setAnimationLoop): roda o "fazer" e redesenha a cena a cada quadro.',
  },

  // ---- Física & controles ----
  {
    type: 'sz_g3d_control_keys',
    message0: 'Mover %1 com o teclado (WASD/setas), velocidade %2',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'jogador' },
      { type: 'field_number', name: 'SPEED', value: 0.05, min: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Anda no plano (frente/trás/lados) com W A S D ou as setas. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_set_velocity',
    message0: 'Definir velocidade do objeto %1 em x %2 y %3 z %4',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'jogador' },
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
    message0: 'Fazer %1 pular com força %2',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'jogador' },
      { type: 'input_value', name: 'FORCE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Dá um impulso para cima — só funciona se o objeto estiver no chão. Combine com "se a tecla espaço está apertada".',
  },
  {
    type: 'sz_g3d_apply_gravity',
    message0: 'Mover %1 com gravidade (chão: %2)',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'jogador' },
      { type: 'field_input', name: 'GROUND', text: 'chao' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Puxa o objeto para baixo e o faz parar/quicar no chão, andando pela velocidade. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_camera_follow',
    message0: 'A câmera da cena %1 segue o objeto %2',
    args0: [
      { type: 'field_input', name: 'WORLD', text: 'cena' },
      { type: 'field_input', name: 'OBJ', text: 'jogador' },
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
      { type: 'field_input', name: 'A', text: 'jogador' },
      { type: 'field_input', name: 'B', text: 'chao' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Verdadeiro enquanto os dois objetos 3D estão se tocando. Use dentro de um "se".',
  },
  {
    type: 'sz_g3d_hit_any',
    message0: 'o objeto %1 encostou em algum de %2 ?',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'jogador' },
      { type: 'field_input', name: 'GROUP', text: 'inimigos' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Verdadeiro se o objeto bateu em qualquer um do grupo (ótimo para o fim de jogo).',
  },

  // ---- Kit "Desvie": grupo de inimigos, spawner que avança e fim de jogo ----
  {
    type: 'sz_g3d_create_group',
    message0: 'Criar grupo de objetos %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'inimigos' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT_C,
    tooltip: 'Cria uma lista vazia para guardar vários objetos (ex.: os inimigos).',
  },
  {
    type: 'sz_g3d_run_enemies',
    message0: 'Na cena %1, soltar inimigos no grupo %2 (chão %3) a cada %4 quadros, velocidade %5',
    args0: [
      { type: 'field_input', name: 'WORLD', text: 'cena' },
      { type: 'field_input', name: 'GROUP', text: 'inimigos' },
      { type: 'field_input', name: 'GROUND', text: 'chao' },
      { type: 'field_number', name: 'EVERY', value: 200, min: 20 },
      { type: 'field_number', name: 'SPEED', value: 0.02, min: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT_C,
    tooltip:
      'Cria inimigos que vêm de longe acelerando e os move sozinho (limpa os que passam). Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_stop',
    message0: 'Fim de jogo: parar a cena %1',
    args0: [{ type: 'field_input', name: 'WORLD', text: 'cena' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT_C,
    tooltip: 'Para o loop de animação (game over). Use dentro de um "se" de colisão.',
  },

  // ---- GENÉRICOS de grade/isométrico (fora do kit, p/ outros jogos) ----
  {
    type: 'sz_g3d_isometric_camera',
    message0: 'Câmera isométrica na cena %1 seguindo o objeto %2',
    args0: [
      { type: 'field_input', name: 'WORLD', text: 'cena' },
      { type: 'field_input', name: 'FOLLOW', text: 'jogador' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: GRID_C,
    tooltip:
      'Troca a câmera por uma isométrica (vista de cima em ângulo). Deixe o objeto em branco para não seguir ninguém.',
  },
  {
    type: 'sz_g3d_grid_position',
    message0: 'Colocar o objeto %1 na linha %2 coluna %3',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'caixa' },
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
    message0: 'Mover %1 em grade com as setas (a cada frame)',
    args0: [{ type: 'field_input', name: 'OBJ', text: 'jogador' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: GRID_C,
    tooltip:
      'Anda uma casa por vez (com um pulinho) ao apertar as setas. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_grid_move',
    message0: 'Dar um passo de %1 para %2',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'jogador' },
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
    message0: 'Mover os objetos do grupo %1 (velocidade %2, dando a volta de x %3 até %4)',
    args0: [
      { type: 'field_input', name: 'GROUP', text: 'carros' },
      { type: 'field_number', name: 'SPEED', value: 0.1 },
      { type: 'field_number', name: 'MIN', value: -10 },
      { type: 'field_number', name: 'MAX', value: 10 },
    ],
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
      { type: 'field_input', name: 'OBJ', text: 'jogador' },
      { type: 'field_input', name: 'GROUP', text: 'carros' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Verdadeiro se o objeto bate em algum do grupo (caixa real — funciona com modelos como carros). Use num "se".',
  },

  // ---- Kit Travessia (atravessar a rua / Crossy Road) ----
  {
    type: 'sz_g3d_create_crossing_scene',
    message0: 'Criar mundo Travessia no canvas %1 e guardar em %2',
    args0: [
      { type: 'field_input', name: 'CANVAS', text: 'jogo' },
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
    message0: 'Criar personagem da Travessia no mundo %1 cor %2 e guardar em %3',
    args0: [
      { type: 'field_input', name: 'WORLD', text: 'mundo' },
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
    message0: 'Mover o personagem %1 para %2',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'jogador' },
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
    message0: 'Atualizar o personagem %1 no mundo %2 (a cada frame)',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'jogador' },
      { type: 'field_input', name: 'WORLD', text: 'mundo' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT2_C,
    tooltip:
      'Move o personagem com as setas (em grade), gera mais ruas, segue com a câmera e conta a pontuação. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_crosser_reset',
    message0: 'Recomeçar a Travessia: personagem %1 no mundo %2',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'jogador' },
      { type: 'field_input', name: 'WORLD', text: 'mundo' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT2_C,
    tooltip: 'Volta o personagem ao início e recria o mapa (botão Recomeçar).',
  },
  {
    type: 'sz_g3d_add_row',
    message0: 'No mundo %1, na linha %2, criar faixa de %3 indo para %4 velocidade %5',
    args0: [
      { type: 'field_input', name: 'WORLD', text: 'mundo' },
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
      { type: 'field_number', name: 'SPEED', value: 150, min: 0 },
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
    message0: 'No mundo %1, gerar %2 linhas aleatórias',
    args0: [
      { type: 'field_input', name: 'WORLD', text: 'mundo' },
      { type: 'field_number', name: 'COUNT', value: 20, min: 1 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT2_C,
    tooltip:
      'Cria várias linhas sorteadas (grama/floresta/carros/caminhões) à frente do personagem.',
  },
  {
    type: 'sz_g3d_move_traffic',
    message0: 'Mover os veículos do mundo %1 (a cada frame)',
    args0: [{ type: 'field_input', name: 'WORLD', text: 'mundo' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: KIT2_C,
    tooltip: 'Faz os carros e caminhões andarem e darem a volta. Use dentro de "A cada frame 3D".',
  },
  {
    type: 'sz_g3d_crosser_hit',
    message0: 'o personagem %1 bateu num veículo? (mundo %2)',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'jogador' },
      { type: 'field_input', name: 'WORLD', text: 'mundo' },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Verdadeiro quando o personagem é atropelado. Use num "se" para mostrar o fim de jogo.',
  },
  {
    type: 'sz_g3d_crosser_row',
    message0: 'a pontuação (linha) do personagem %1',
    args0: [{ type: 'field_input', name: 'OBJ', text: 'jogador' }],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Quantas linhas o personagem avançou (a pontuação). Use num "se" ou para mostrar o placar.',
  },
]

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
    ],
  },
  {
    name: '❓ Perguntas',
    colour: EVENT_C,
    types: ['sz_g3d_key_down', 'sz_g3d_collides', 'sz_g3d_hit_any', 'sz_g3d_touches_box'],
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
]

const CATEGORIZED = new Set(SUBCATS.flatMap((sc) => sc.types))
const leftover = gameThreeDBlocks.map((b) => b.type).filter((t) => !CATEGORIZED.has(t))

export const gameThreeDToolboxCategory: ExtensionToolboxCategory = {
  kind: 'category',
  name: 'Jogo 3D',
  colour: C,
  contents: [
    ...SUBCATS.map((sc) => ({
      kind: 'category' as const,
      name: sc.name,
      colour: sc.colour,
      contents: sc.types.map((type) => ({ kind: 'block' as const, type })),
    })),
    ...(leftover.length
      ? [
          {
            kind: 'category' as const,
            name: 'Mais',
            colour: C,
            contents: leftover.map((type) => ({ kind: 'block' as const, type })),
          },
        ]
      : []),
  ],
}
