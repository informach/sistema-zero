import type { ExtensionToolboxCategory } from '#extensions'

const C = '#f472b6'

export const gameTwoDBlocks = [
  {
    type: 'sz_g2d_create_sprite',
    message0: 'Criar sprite %1 em x %2 y %3 largura %4 altura %5 cor %6',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'jogador' },
      { type: 'field_number', name: 'X', value: 100 },
      { type: 'field_number', name: 'Y', value: 100 },
      { type: 'field_number', name: 'W', value: 40, min: 1 },
      { type: 'field_number', name: 'H', value: 40, min: 1 },
      { type: 'field_colour', name: 'COLOR', colour: '#22d3ee' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_draw_sprite',
    message0: 'Desenhar sprite %1 no pincel %2',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'jogador' },
      { type: 'field_input', name: 'CTX', text: 'ctx' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_set_position',
    message0: 'Definir posição do sprite %1 para x %2 y %3',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'jogador' },
      { type: 'field_number', name: 'X', value: 0 },
      { type: 'field_number', name: 'Y', value: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_set_velocity',
    message0: 'Definir velocidade do sprite %1 para vx %2 vy %3',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'jogador' },
      { type: 'field_number', name: 'VX', value: 0 },
      { type: 'field_number', name: 'VY', value: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_collides',
    message0: 'Guardar em %1 se sprite %2 colide com sprite %3',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'bateu' },
      { type: 'field_input', name: 'A', text: 'jogador' },
      { type: 'field_input', name: 'B', text: 'inimigo' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_score',
    message0: 'Criar pontuação %1 começando em %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'pontos' },
      { type: 'field_number', name: 'INITIAL', value: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_game_over',
    message0: 'Mostrar fim de jogo no pincel %1 com texto %2',
    args0: [
      { type: 'field_input', name: 'CTX', text: 'ctx' },
      { type: 'field_input', name: 'TEXT', text: 'Fim de jogo' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_update_each_frame',
    message0: 'A cada frame do jogo, fazer %1',
    args0: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },

  // ---- Física ----
  {
    type: 'sz_g2d_set_gravity',
    message0: 'Definir gravidade do mundo como %1',
    args0: [{ type: 'field_number', name: 'VALUE', value: 0.5 }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'A gravidade é somada à velocidade vertical de cada sprite em "Aplicar velocidade".',
  },
  {
    type: 'sz_g2d_apply_velocity',
    message0: 'Aplicar velocidade e gravidade ao sprite %1',
    args0: [{ type: 'field_input', name: 'SPRITE', text: 'jogador' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Move o sprite pela sua velocidade (vx/vy) e soma a gravidade ao vy.',
  },
  {
    type: 'sz_g2d_bounce_edges',
    message0: 'Ricochetear sprite %1 nas bordas do pincel %2',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'bola' },
      { type: 'field_input', name: 'CTX', text: 'ctx' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Faz o sprite quicar nas bordas do canvas, invertendo a velocidade.',
  },
  {
    type: 'sz_g2d_circle_collides',
    message0: 'Guardar em %1 se sprite %2 encosta (círculo) no sprite %3',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'bateu' },
      { type: 'field_input', name: 'A', text: 'jogador' },
      { type: 'field_input', name: 'B', text: 'inimigo' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Colisão por círculo (mais justa para objetos redondos que a caixa retangular).',
  },

  // ---- Áudio ----
  {
    type: 'sz_g2d_play_sound',
    message0: 'Tocar som de %1 Hz por %2 ms',
    args0: [
      { type: 'field_number', name: 'FREQ', value: 440, min: 20 },
      { type: 'field_number', name: 'MS', value: 200, min: 1 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Toca um bip sintetizado (sem precisar de arquivo). Ex.: 440 Hz = lá; agudo = número maior.',
  },

  // ---- Mouse / toque ----
  {
    type: 'sz_g2d_on_pointer',
    message0: 'Quando clicar/tocar, na posição x %1 y %2 fazer %3',
    args0: [
      { type: 'field_input', name: 'PX', text: 'px' },
      { type: 'field_input', name: 'PY', text: 'py' },
      { type: 'input_statement', name: 'BODY' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Roda o "fazer" a cada clique/toque, com a posição do ponteiro no canvas em px/py.',
  },

  // ---- Imagens / spritesheet / animação (v0.3.0) ----
  {
    type: 'sz_g2d_create_image_sprite',
    message0: 'Criar sprite %1 em x %2 y %3 largura %4 altura %5 com imagem %6',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'heroi' },
      { type: 'field_number', name: 'X', value: 100 },
      { type: 'field_number', name: 'Y', value: 100 },
      { type: 'field_number', name: 'W', value: 40, min: 1 },
      { type: 'field_number', name: 'H', value: 40, min: 1 },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'heroi' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um sprite que mostra uma imagem da sua biblioteca. Em "imagem", use o nome do asset (ex.: heroi). Se a imagem ainda não existe, aparece um retângulo até ela carregar.',
  },
  {
    type: 'sz_g2d_set_image',
    message0: 'Trocar imagem do sprite %1 para %2',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'heroi' },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'heroi' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Troca a imagem que o sprite mostra (e cancela a animação atual dele).',
  },
  {
    type: 'sz_g2d_load_spritesheet',
    message0: 'Carregar spritesheet %1 da imagem %2 com quadros de %3 x %4 px',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'andar' },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'heroi-andando' },
      { type: 'field_number', name: 'FW', value: 32, min: 1 },
      { type: 'field_number', name: 'FH', value: 32, min: 1 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Prepara uma folha de sprites (vários quadros numa única imagem) para animar. Informe o tamanho de CADA quadro em pixels.',
  },
  {
    type: 'sz_g2d_animate_sprite',
    message0: 'Animar sprite %1 com spritesheet %2, quadros de %3 a %4 a %5 fps',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'heroi' },
      { type: 'field_input', name: 'SHEET', text: 'andar' },
      { type: 'field_number', name: 'FROM', value: 0, min: 0 },
      { type: 'field_number', name: 'TO', value: 3, min: 0 },
      { type: 'field_number', name: 'FPS', value: 8, min: 1 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Faz o sprite percorrer os quadros da spritesheet (do "de" ao "a"). Desenhe o sprite a cada frame para ver a animação rodar.',
  },
  {
    type: 'sz_g2d_draw_frame',
    message0: 'Desenhar quadro %1 do spritesheet %2 no pincel %3 em x %4 y %5 largura %6 altura %7',
    args0: [
      { type: 'field_number', name: 'INDEX', value: 0, min: 0 },
      { type: 'field_input', name: 'SHEET', text: 'andar' },
      { type: 'field_input', name: 'CTX', text: 'ctx' },
      { type: 'field_number', name: 'X', value: 100 },
      { type: 'field_number', name: 'Y', value: 100 },
      { type: 'field_number', name: 'W', value: 40, min: 1 },
      { type: 'field_number', name: 'H', value: 40, min: 1 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desenha um quadro específico da spritesheet na posição escolhida (controle manual).',
  },

  // ---- Movimento (v0.4.0) ----
  {
    type: 'sz_g2d_platformer',
    message0: 'Mover sprite %1 estilo plataforma no pincel %2 — velocidade %3 pulo %4',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'heroi' },
      { type: 'field_input', name: 'CTX', text: 'ctx' },
      { type: 'field_number', name: 'SPEED', value: 4, min: 0 },
      { type: 'field_number', name: 'JUMP', value: 11, min: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Esquerda/direita com as setas, pulo com a seta pra cima (só quando está no chão) e gravidade puxando pra baixo. O chão é a base do canvas.',
  },
  {
    type: 'sz_g2d_top_down',
    message0: 'Mover sprite %1 em 4 direções com setas, velocidade %2',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'heroi' },
      { type: 'field_number', name: 'SPEED', value: 3, min: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Movimento de cima pra baixo (visão de topo) nas 4 direções — a diagonal não fica mais rápida que andar reto.',
  },
  {
    type: 'sz_g2d_follow_pointer',
    message0: 'Fazer sprite %1 seguir o ponteiro, velocidade %2',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'heroi' },
      { type: 'field_number', name: 'SPEED', value: 3, min: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'O sprite anda em direção ao mouse/dedo (ponteiro) na velocidade escolhida.',
  },
  {
    type: 'sz_g2d_clamp_to_screen',
    message0: 'Manter sprite %1 dentro da tela do pincel %2',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'heroi' },
      { type: 'field_input', name: 'CTX', text: 'ctx' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Impede o sprite de sair pelas bordas do canvas (gruda na borda em vez de sumir).',
  },

  // ---- Efeitos visuais (v0.4.0) ----
  {
    type: 'sz_g2d_flash',
    message0: 'Dar um clarão de cor %1 no pincel %2',
    args0: [
      { type: 'field_colour_sz', name: 'COLOR', colour: '#ffffff' },
      { type: 'field_input', name: 'CTX', text: 'ctx' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Pinta a tela inteira com uma cor translúcida (efeito de flash). Use num frame específico, ex.: ao levar dano.',
  },
  {
    type: 'sz_g2d_shake',
    message0: 'Tremer a tela %1 com intensidade %2',
    args0: [
      { type: 'field_input', name: 'CTX', text: 'ctx' },
      { type: 'field_number', name: 'INTENSITY', value: 8, min: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Sacode a tela e para sozinho (o tremor vai diminuindo). Chame uma vez, ex.: numa colisão ou explosão.',
  },
  {
    type: 'sz_g2d_emit_particles',
    message0: 'Soltar %1 partículas de cor %2 em x %3 y %4',
    args0: [
      { type: 'field_number', name: 'COUNT', value: 14, min: 1 },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#fbbf24' },
      { type: 'field_number', name: 'X', value: 150 },
      { type: 'field_number', name: 'Y', value: 100 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma explosão de partículas no ponto x/y. Lembre de "atualizar e desenhar as partículas" a cada frame.',
  },
  {
    type: 'sz_g2d_draw_particles',
    message0: 'Atualizar e desenhar as partículas no pincel %1',
    args0: [{ type: 'field_input', name: 'CTX', text: 'ctx' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Move e desenha as partículas (use dentro do "a cada frame"); elas somem sozinhas.',
  },

  // ---- Tiles / tilemaps (v0.5.0) ----
  {
    type: 'sz_g2d_create_tilemap',
    message0:
      'Criar mapa de tiles %1 com imagem %2, tamanho do tile %3 px, tiles sólidos %4, grade %5',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'mapa' },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'tileset' },
      { type: 'field_number', name: 'TILE', value: 32, min: 1 },
      { type: 'field_input', name: 'SOLID', text: '1' },
      { type: 'field_input', name: 'GRID', text: '0 0 0 0;0 0 0 0;1 1 1 1' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Monta um mapa de tiles a partir de uma imagem (o tileset, com vários quadros lado a lado). Cada número da GRADE escolhe um quadro do tileset; use ";" para separar as linhas e espaço entre os números. Use "." para uma célula vazia. Em "tiles sólidos", liste (separados por vírgula) os números que barram o jogador.',
  },
  {
    type: 'sz_g2d_draw_tilemap',
    message0: 'Desenhar mapa %1 no pincel %2 em x %3 y %4',
    args0: [
      { type: 'field_input', name: 'MAP', text: 'mapa' },
      { type: 'field_input', name: 'CTX', text: 'ctx' },
      { type: 'field_number', name: 'X', value: 0 },
      { type: 'field_number', name: 'Y', value: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desenha o mapa de tiles na tela, com o canto superior esquerdo em x/y.',
  },
  {
    type: 'sz_g2d_tilemap_collide',
    message0: 'Impedir o sprite %1 de atravessar os tiles sólidos do mapa %2',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'heroi' },
      { type: 'field_input', name: 'MAP', text: 'mapa' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O sprite não atravessa os tiles marcados como sólidos: ele pousa sobre o chão e bate nas paredes. Use a cada frame, depois de mover o sprite.',
  },
]

export const gameTwoDToolboxCategory: ExtensionToolboxCategory = {
  kind: 'category',
  name: 'Jogo 2D',
  colour: C,
  contents: gameTwoDBlocks.map((b) => ({ kind: 'block', type: b.type })),
}
