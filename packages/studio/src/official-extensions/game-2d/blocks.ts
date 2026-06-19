import type { ExtensionToolboxCategory } from '#extensions'

const C = '#f472b6'
// Eventos "Quando…" (hats) ganham uma cor própria (dourado), à la Scratch, para
// se destacarem como gatilhos. Sem previousStatement/nextStatement: são chapéus.
const EVENT_C = '#fbbf24'

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
      { type: 'field_colour_sz', name: 'COLOR', colour: '#22d3ee' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_draw_sprite',
    message0: 'Desenhar o sprite %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desenha o sprite na tela do jogo. Use a cada quadro, depois de "Limpar a tela".',
  },
  {
    type: 'sz_g2d_set_position',
    message0: 'Mudar a posição do sprite %1 para x %2 y %3',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
      { type: 'field_number', name: 'X', value: 0 },
      { type: 'field_number', name: 'Y', value: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_set_velocity',
    message0: 'Mudar a velocidade do sprite %1 para vx %2 vy %3',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
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
      { type: 'field_sprite_picker', name: 'A', text: 'jogador' },
      { type: 'field_sprite_picker', name: 'B', text: 'inimigo' },
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
    message0: 'Mostrar fim de jogo com o texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Fim de jogo' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Escreve um texto grande na tela (ex.: ao perder ou vencer).',
  },
  {
    type: 'sz_g2d_update_each_frame',
    message0: 'A cada quadro do jogo, fazer %1',
    args0: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Repete o que está dentro a cada quadro (≈60 vezes por segundo) — é o coração do jogo.',
  },
  {
    type: 'sz_g2d_clear',
    message0: 'Limpar a tela',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Apaga tudo o que foi desenhado. Use no começo de cada quadro, antes de desenhar de novo.',
  },

  // ---- Física ----
  {
    type: 'sz_g2d_set_gravity',
    message0: 'Botar a gravidade do mundo em %1',
    args0: [{ type: 'field_number', name: 'VALUE', value: 0.5 }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'A gravidade é somada à velocidade vertical de cada sprite em "Aplicar velocidade".',
  },
  {
    type: 'sz_g2d_apply_velocity',
    message0: 'Aplicar velocidade e gravidade ao sprite %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Move o sprite pela sua velocidade (vx/vy) e soma a gravidade ao vy.',
  },
  {
    type: 'sz_g2d_bounce_edges',
    message0: 'Quicar o sprite %1 nas bordas da tela',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'bola' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Faz o sprite quicar nas bordas da tela, invertendo a velocidade.',
  },
  {
    type: 'sz_g2d_circle_collides',
    message0: 'Guardar em %1 se sprite %2 encosta no sprite %3 (em círculo)',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'bateu' },
      { type: 'field_sprite_picker', name: 'A', text: 'jogador' },
      { type: 'field_sprite_picker', name: 'B', text: 'inimigo' },
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

  // ---- Eventos "Quando…" (hats) ----
  {
    type: 'sz_g2d_on_key',
    message0: 'Quando apertar a tecla %1 fazer %2',
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
        ],
      },
      { type: 'input_statement', name: 'BODY' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip: 'Roda o que está dentro toda vez que a tecla é apertada (ex.: pular, atirar).',
  },
  {
    type: 'sz_g2d_on_overlap',
    message0: 'Quando o sprite %1 encostar no sprite %2 fazer %3',
    args0: [
      { type: 'field_sprite_picker', name: 'A', text: 'jogador' },
      { type: 'field_sprite_picker', name: 'B', text: 'inimigo' },
      { type: 'input_statement', name: 'BODY' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Roda o que está dentro quando os dois sprites se tocam (ex.: pegar moeda, levar dano). Dispara uma vez a cada vez que começam a encostar.',
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
        ],
      },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Verdadeiro enquanto a tecla está sendo segurada. Use dentro de um "se", no "a cada quadro" (ótimo para mover sem parar).',
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
    tooltip: 'Verdadeiro enquanto os dois sprites estão se tocando. Use dentro de um "se".',
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
    message0: 'Carregar folha de quadros %1 da imagem %2 com quadros de %3 x %4 px',
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
    message0: 'Animar sprite %1 com a folha de quadros %2, do quadro %3 ao %4 a %5 fps',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_input', name: 'SHEET', text: 'andar' },
      { type: 'field_number', name: 'FROM', value: 0, min: 0 },
      { type: 'field_number', name: 'TO', value: 3, min: 0 },
      { type: 'field_number', name: 'FPS', value: 8, min: 1 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Faz o sprite percorrer os quadros da folha de quadros (do primeiro ao último). Desenhe o sprite a cada quadro para ver a animação rodar.',
  },
  {
    type: 'sz_g2d_draw_frame',
    message0: 'Desenhar quadro %1 da folha de quadros %2 em x %3 y %4 largura %5 altura %6',
    args0: [
      { type: 'field_number', name: 'INDEX', value: 0, min: 0 },
      { type: 'field_input', name: 'SHEET', text: 'andar' },
      { type: 'field_number', name: 'X', value: 100 },
      { type: 'field_number', name: 'Y', value: 100 },
      { type: 'field_number', name: 'W', value: 40, min: 1 },
      { type: 'field_number', name: 'H', value: 40, min: 1 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha um quadro específico da folha de quadros na posição escolhida (controle manual).',
  },

  // ---- Movimento (v0.4.0) ----
  {
    type: 'sz_g2d_platformer',
    message0: 'Mover o sprite %1 estilo plataforma — velocidade %2 pulo %3',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_number', name: 'SPEED', value: 4, min: 0 },
      { type: 'field_number', name: 'JUMP', value: 11, min: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Esquerda/direita com as setas, pulo com a seta pra cima (só quando está no chão) e gravidade puxando pra baixo. O chão é a base da tela.',
  },
  {
    type: 'sz_g2d_top_down',
    message0: 'Mover sprite %1 em 4 direções com setas, velocidade %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
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
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_number', name: 'SPEED', value: 3, min: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'O sprite anda em direção ao mouse/dedo (ponteiro) na velocidade escolhida.',
  },
  {
    type: 'sz_g2d_clamp_to_screen',
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
    message0: 'Tremer a tela com intensidade %1',
    args0: [{ type: 'field_number', name: 'INTENSITY', value: 8, min: 0 }],
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
      'Cria uma explosão de partículas no ponto x/y. Lembre de "atualizar e desenhar as partículas" a cada quadro.',
  },
  {
    type: 'sz_g2d_draw_particles',
    message0: 'Atualizar e desenhar as partículas',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Move e desenha as partículas (use dentro do "a cada quadro"); elas somem sozinhas.',
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
    message0: 'Desenhar o mapa %1 em x %2 y %3',
    args0: [
      { type: 'field_input', name: 'MAP', text: 'mapa' },
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
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_input', name: 'MAP', text: 'mapa' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O sprite não atravessa os tiles marcados como sólidos: ele pousa sobre o chão e bate nas paredes. Use a cada quadro, depois de mover o sprite.',
  },

  // ---- Grupos de sprites: MUITOS sprites (v0.6.0) ----
  {
    type: 'sz_g2d_create_group',
    message0: 'Criar grupo de sprites %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'asteroides' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um grupo vazio para guardar MUITOS sprites do mesmo tipo (tiros, inimigos, estrelas).',
  },
  {
    type: 'sz_g2d_spawn_in_group',
    message0:
      'No grupo %1 criar um sprite em x %2 y %3 largura %4 altura %5 cor %6 com vx %7 vy %8',
    args0: [
      { type: 'field_input', name: 'GROUP', text: 'asteroides' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'field_number', name: 'W', value: 24, min: 1 },
      { type: 'field_number', name: 'H', value: 24, min: 1 },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#9ca3af' },
      { type: 'input_value', name: 'VX', check: 'JSValue' },
      { type: 'input_value', name: 'VY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um sprite colorido e coloca no grupo. Use x/y com "número aleatório" para nascer em lugares diferentes; vx/vy dão a velocidade.',
  },
  {
    type: 'sz_g2d_spawn_image_in_group',
    message0:
      'No grupo %1 criar um sprite em x %2 y %3 largura %4 altura %5 com imagem %6 vx %7 vy %8',
    args0: [
      { type: 'field_input', name: 'GROUP', text: 'inimigos' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'field_number', name: 'W', value: 32, min: 1 },
      { type: 'field_number', name: 'H', value: 32, min: 1 },
      { type: 'field_asset_picker', name: 'IMAGE', text: 'inimigo' },
      { type: 'input_value', name: 'VX', check: 'JSValue' },
      { type: 'input_value', name: 'VY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Como "criar no grupo", mas o sprite mostra uma imagem da sua biblioteca (use o nome do asset).',
  },
  {
    type: 'sz_g2d_update_group',
    message0: 'Atualizar (mover) o grupo %1',
    args0: [{ type: 'field_input', name: 'GROUP', text: 'asteroides' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Move cada sprite do grupo pela sua velocidade (vx/vy). Use a cada quadro.',
  },
  {
    type: 'sz_g2d_draw_group',
    message0: 'Desenhar o grupo %1',
    args0: [{ type: 'field_input', name: 'GROUP', text: 'asteroides' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desenha todos os sprites do grupo. Use a cada quadro, depois de mover.',
  },
  {
    type: 'sz_g2d_for_each_in_group',
    message0: 'Para cada sprite %1 do grupo %2 fazer %3',
    args0: [
      { type: 'field_input', name: 'ITEM', text: 'sprite' },
      { type: 'field_input', name: 'GROUP', text: 'asteroides' },
      { type: 'input_statement', name: 'BODY' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Roda o que está dentro para cada sprite do grupo (o sprite da vez fica no nome que você escolher).',
  },
  {
    type: 'sz_g2d_count_group',
    message0: 'quantos sprites tem no grupo %1',
    args0: [{ type: 'field_input', name: 'GROUP', text: 'asteroides' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quantidade de sprites no grupo agora. Use dentro de um "se" ou numa conta.',
  },
  {
    type: 'sz_g2d_clear_group',
    message0: 'Esvaziar o grupo %1',
    args0: [{ type: 'field_input', name: 'GROUP', text: 'asteroides' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Tira todos os sprites do grupo de uma vez (ex.: ao reiniciar a fase).',
  },
  {
    type: 'sz_g2d_prune_offscreen',
    message0: 'Tirar do grupo %1 quem sair da tela — para cada um (chamado %2) fazer %3',
    args0: [
      { type: 'field_input', name: 'GROUP', text: 'asteroides' },
      { type: 'field_input', name: 'ITEM', text: 'sprite' },
      { type: 'input_statement', name: 'BODY' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Remove do grupo os sprites que saíram da tela e roda o "fazer" para cada um (ex.: perder uma vida quando um asteroide escapa).',
  },
  {
    type: 'sz_g2d_remove_from_group',
    message0: 'Tirar o sprite %1 do grupo %2',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'asteroide' },
      { type: 'field_input', name: 'GROUP', text: 'asteroides' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Tira um sprite do grupo (ex.: o asteroide que foi atingido). Use o nome do sprite da vez.',
  },

  // ---- Colisão de grupo + temporizadores (hats/eventos) ----
  {
    type: 'sz_g2d_on_group_overlap',
    message0:
      'Quando um sprite do grupo %1 (chamado %2) encostar num do grupo %3 (chamado %4) fazer %5',
    args0: [
      { type: 'field_input', name: 'A', text: 'tiros' },
      { type: 'field_input', name: 'ANAME', text: 'tiro' },
      { type: 'field_input', name: 'B', text: 'asteroides' },
      { type: 'field_input', name: 'BNAME', text: 'asteroide' },
      { type: 'input_statement', name: 'BODY' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Para cada par de sprites (um de cada grupo) que se encostam, roda o "fazer" com os dois sprites. Use dentro do "a cada quadro".',
  },
  {
    type: 'sz_g2d_every_frames',
    message0: 'A cada %1 quadros fazer %2',
    args0: [
      { type: 'input_value', name: 'N', check: 'JSValue' },
      { type: 'input_statement', name: 'BODY' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Roda o "fazer" de tempos em tempos (a cada N quadros). Ótimo para criar inimigos sem parar. Use dentro do "a cada quadro".',
  },
  {
    type: 'sz_g2d_every_seconds',
    message0: 'A cada %1 segundos fazer %2',
    args0: [
      { type: 'field_number', name: 'SECS', value: 2, min: 0, precision: 0.1 },
      { type: 'input_statement', name: 'BODY' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip: 'Roda o "fazer" a cada X segundos. Use dentro do "a cada quadro".',
  },

  // ---- HUD no canvas: placar, texto, vidas e barra (v0.6.0) ----
  {
    type: 'sz_g2d_draw_score',
    message0: 'Mostrar placar %1 valor %2 em x %3 y %4 cor %5 tamanho %6',
    args0: [
      { type: 'field_input', name: 'LABEL', text: 'Pontos:' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
      { type: 'field_number', name: 'X', value: 12 },
      { type: 'field_number', name: 'Y', value: 30 },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#ffffff' },
      { type: 'field_number', name: 'SIZE', value: 24, min: 6 },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Escreve "rótulo valor" (ex.: Pontos: 5) na tela. Ligue o valor à variável do placar.',
  },
  {
    type: 'sz_g2d_draw_label',
    message0: 'Escrever %1 em x %2 y %3 cor %4 tamanho %5 alinhado %6',
    args0: [
      { type: 'field_input', name: 'TEXT', text: 'Nave contra Asteroides' },
      { type: 'field_number', name: 'X', value: 12 },
      { type: 'field_number', name: 'Y', value: 30 },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#ffffff' },
      { type: 'field_number', name: 'SIZE', value: 20, min: 6 },
      {
        type: 'field_dropdown',
        name: 'ALIGN',
        options: [
          ['à esquerda', 'left'],
          ['no centro', 'center'],
          ['à direita', 'right'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Escreve um texto fixo na tela (ex.: um título). Escolha o alinhamento.',
  },
  {
    type: 'sz_g2d_draw_hearts',
    message0: 'Desenhar %1 vidas (corações) em x %2 y %3 tamanho %4 cor %5',
    args0: [
      { type: 'input_value', name: 'COUNT', check: 'JSValue' },
      { type: 'field_number', name: 'X', value: 12 },
      { type: 'field_number', name: 'Y', value: 48 },
      { type: 'field_number', name: 'SIZE', value: 22, min: 4 },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#ff5d5d' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desenha uma fileira de corações (ligue a "quantidade" à variável de vidas).',
  },
  {
    type: 'sz_g2d_draw_bar',
    message0: 'Barra de %1 / %2 em x %3 y %4 largura %5 altura %6 cor %7',
    args0: [
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
      { type: 'input_value', name: 'MAX', check: 'JSValue' },
      { type: 'field_number', name: 'X', value: 12 },
      { type: 'field_number', name: 'Y', value: 48 },
      { type: 'field_number', name: 'W', value: 160, min: 1 },
      { type: 'field_number', name: 'H', value: 14, min: 1 },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#35e8ff' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Barra de progresso/vida: o preenchimento é a fração valor / máximo.',
  },

  // ---- Estado / telas (cenas) ----
  {
    type: 'sz_g2d_set_scene',
    message0: 'Ir para a tela %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SCENE',
        options: [
          ['início', 'inicio'],
          ['jogando', 'jogando'],
          ['ganhou', 'ganhou'],
          ['perdeu', 'perdeu'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Muda a tela atual do jogo (início, jogando, ganhou, perdeu).',
  },
  {
    type: 'sz_g2d_scene_is',
    message0: 'a tela atual é %1 ?',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SCENE',
        options: [
          ['início', 'inicio'],
          ['jogando', 'jogando'],
          ['ganhou', 'ganhou'],
          ['perdeu', 'perdeu'],
        ],
      },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro se o jogo está naquela tela. Use dentro de um "se".',
  },
  {
    type: 'sz_g2d_show_screen',
    message0: 'Mostrar tela com título %1 subtítulo %2 dica %3 fundo %4',
    args0: [
      { type: 'field_input', name: 'TITLE', text: 'Nave contra Asteroides' },
      { type: 'field_input', name: 'SUBTITLE', text: 'Destrua os asteroides!' },
      { type: 'field_input', name: 'HINT', text: 'Aperte Enter para começar' },
      { type: 'field_colour_sz', name: 'BG', colour: '#02111f' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cobre a tela com um aviso central (título + subtítulo + dica). Ótimo para as telas de início, vitória e derrota.',
  },
  {
    type: 'sz_g2d_restart',
    message0: 'Reiniciar o jogo',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Começa o jogo do zero (recarrega tudo).',
  },

  // ---- Cenário: fundo de estrelas + arrastar com o dedo (v0.6.0) ----
  {
    type: 'sz_g2d_starfield',
    message0: 'Desenhar fundo de estrelas (velocidade %1)',
    args0: [{ type: 'field_number', name: 'SPEED', value: 1, min: 0, precision: 0.1 }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha um céu de estrelas que rola para baixo (fundo de jogo espacial). Use no começo do "a cada quadro", depois de limpar a tela.',
  },
  {
    type: 'sz_g2d_drag_x',
    message0: 'Mover o sprite %1 com o dedo/mouse (só na horizontal)',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'nave' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'A nave acompanha o dedo/mouse no eixo X — ótimo para jogar no celular.',
  },

  // ---- Kit "Nave & Asteroides": desenhos prontos + efeitos (v0.7.0) ----
  {
    type: 'sz_g2d_fit_screen',
    message0: 'Fazer a tela preencher %1% da janela (mantendo a proporção)',
    args0: [{ type: 'field_number', name: 'PERCENT', value: 100, min: 10, max: 100 }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Faz o canvas ocupar quase toda a janela e se reajustar sozinho quando ela muda de tamanho; os desenhos escalam juntos, sem distorcer. Use uma vez no começo.',
  },

  {
    type: 'sz_g2d_spawn_bullet',
    message0: 'Criar tiro no grupo %1 em x %2 y %3 raio %4 cor %5 vx %6 vy %7',
    args0: [
      { type: 'field_input', name: 'GROUP', text: 'tiros' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'field_number', name: 'R', value: 5, min: 1 },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#9cff57' },
      { type: 'input_value', name: 'VX', check: 'JSValue' },
      { type: 'input_value', name: 'VY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um tiro (bolinha brilhante) no grupo, no ponto x/y, indo na velocidade vx/vy (vy negativo = sobe).',
  },
  {
    type: 'sz_g2d_arrows_x',
    message0: 'Mover o sprite %1 com as setas <- -> (velocidade %2)',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'nave' },
      { type: 'field_number', name: 'SPEED', value: 6, min: 1 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Move o sprite só na horizontal com as setas esquerda/direita. Combine com "prender o sprite na tela".',
  },
  {
    type: 'sz_g2d_blink',
    message0: 'Fazer o sprite %1 piscar por %2 quadros',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'nave' },
      { type: 'field_number', name: 'FRAMES', value: 60, min: 1 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O sprite pisca (fica intermitente) por N quadros - ótimo para a invencibilidade depois de levar dano.',
  },

  {
    type: 'sz_g2d_create_ship',
    message0: 'Criar nave %1 em x %2 y %3 largura %4 altura %5 — cor do corpo %6 cor das asas %7',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'nave' },
      { type: 'field_number', name: 'X', value: 180 },
      { type: 'field_number', name: 'Y', value: 250 },
      { type: 'field_number', name: 'W', value: 54, min: 1 },
      { type: 'field_number', name: 'H', value: 62, min: 1 },
      { type: 'field_colour_sz', name: 'BODY', colour: '#35e8ff' },
      { type: 'field_colour_sz', name: 'WINGS', colour: '#2568ff' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma nave desenhada (corpo + asas com as cores que você escolher, cabine e foguinho que pulsa sozinho). O foguinho já vem animado.',
  },
  {
    type: 'sz_g2d_spawn_asteroid',
    message0: 'No grupo %1 criar um asteroide em x %2 y %3 tamanho %4 cor %5 com vx %6 vy %7',
    args0: [
      { type: 'field_input', name: 'GROUP', text: 'asteroides' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'field_number', name: 'SIZE', value: 40, min: 4 },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#8d8f9b' },
      { type: 'input_value', name: 'VX', check: 'JSValue' },
      { type: 'input_value', name: 'VY', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um asteroide já desenhado (pedra irregular que gira, com crateras) e coloca no grupo. Cada um nasce com um formato único.',
  },
  {
    type: 'sz_g2d_explode',
    message0: 'Soltar explosão no sprite %1 cor %2',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'asteroide' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#ffb13b' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Solta um jato de partículas (da cor escolhida + estilhaços cinza) no centro do sprite.',
  },
  {
    type: 'sz_g2d_play_shoot',
    message0: 'Tocar som de tiro',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Um "pew" curto (som sintetizado, sem precisar de arquivo).',
  },
  {
    type: 'sz_g2d_play_explosion',
    message0: 'Tocar som de explosão',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Um "bum" de ruído que decai (som sintetizado, sem precisar de arquivo).',
  },
  {
    type: 'sz_g2d_on_sprite_group_overlap',
    message0: 'Quando o sprite %1 encostar num do grupo %2 (chamado %3) fazer %4',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'nave' },
      { type: 'field_input', name: 'GROUP', text: 'asteroides' },
      { type: 'field_input', name: 'ANAME', text: 'inimigo' },
      { type: 'input_statement', name: 'BODY' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Para cada sprite do grupo que encostar no seu sprite (ex.: a nave), roda o "fazer" com aquele sprite. Use dentro do "a cada quadro".',
  },
]

/**
 * Sub-categorias coloridas por domínio (à la Scratch/MakeCode): cada grupo tem a
 * SUA cor, e cada bloco herda a cor do seu grupo (cor = navegação — a criança acha
 * "o azul é sprite" sem ler). A ordem segue o fluxo mental: o que aparece → como
 * mexe → quando algo acontece → perguntas → enfeites → cenário.
 */
const SUBCATS: { name: string; colour: string; types: string[] }[] = [
  {
    name: '🎮 Sprites',
    colour: '#4c97ff',
    types: [
      'sz_g2d_create_sprite',
      'sz_g2d_create_image_sprite',
      'sz_g2d_draw_sprite',
      'sz_g2d_set_image',
      'sz_g2d_set_position',
      'sz_g2d_set_velocity',
    ],
  },
  {
    name: '🪐 Muitos (grupos)',
    colour: '#3373cc',
    types: [
      'sz_g2d_create_group',
      'sz_g2d_spawn_in_group',
      'sz_g2d_spawn_image_in_group',
      'sz_g2d_spawn_bullet',
      'sz_g2d_update_group',
      'sz_g2d_draw_group',
      'sz_g2d_for_each_in_group',
      'sz_g2d_count_group',
      'sz_g2d_clear_group',
      'sz_g2d_prune_offscreen',
      'sz_g2d_remove_from_group',
    ],
  },
  {
    name: '🕹️ Movimento',
    colour: '#4cbfe6',
    types: [
      'sz_g2d_platformer',
      'sz_g2d_top_down',
      'sz_g2d_arrows_x',
      'sz_g2d_follow_pointer',
      'sz_g2d_clamp_to_screen',
      'sz_g2d_apply_velocity',
      'sz_g2d_set_gravity',
      'sz_g2d_bounce_edges',
      'sz_g2d_drag_x',
    ],
  },
  {
    name: '⏱️ Quando…',
    colour: '#ffbf00',
    types: [
      'sz_g2d_update_each_frame',
      'sz_g2d_on_key',
      'sz_g2d_on_overlap',
      'sz_g2d_on_group_overlap',
      'sz_g2d_on_sprite_group_overlap',
      'sz_g2d_on_pointer',
      'sz_g2d_every_frames',
      'sz_g2d_every_seconds',
    ],
  },
  {
    name: '❓ Perguntas',
    colour: '#ff8c1a',
    types: ['sz_g2d_key_down', 'sz_g2d_touches', 'sz_g2d_collides', 'sz_g2d_circle_collides'],
  },
  {
    name: '✨ Aparência',
    colour: '#9966ff',
    types: [
      'sz_g2d_clear',
      'sz_g2d_fit_screen',
      'sz_g2d_blink',
      'sz_g2d_flash',
      'sz_g2d_shake',
      'sz_g2d_emit_particles',
      'sz_g2d_draw_particles',
      'sz_g2d_game_over',
    ],
  },
  {
    name: '🎬 Animação',
    colour: '#cf63cf',
    types: ['sz_g2d_load_spritesheet', 'sz_g2d_animate_sprite', 'sz_g2d_draw_frame'],
  },
  { name: '🔊 Som', colour: '#d65cd6', types: ['sz_g2d_play_sound'] },
  {
    name: '🏆 Placar e HUD',
    colour: '#ff6680',
    types: [
      'sz_g2d_score',
      'sz_g2d_draw_score',
      'sz_g2d_draw_label',
      'sz_g2d_draw_hearts',
      'sz_g2d_draw_bar',
    ],
  },
  {
    name: '🎬 Telas e cenas',
    colour: '#1098ad',
    types: ['sz_g2d_set_scene', 'sz_g2d_scene_is', 'sz_g2d_show_screen', 'sz_g2d_restart'],
  },
  {
    name: '🗺️ Mapa',
    colour: '#59c059',
    types: ['sz_g2d_create_tilemap', 'sz_g2d_draw_tilemap', 'sz_g2d_tilemap_collide'],
  },
  // KITS POR TEMA: blocos prontos e NÃO genéricos, feitos para um tipo de jogo
  // específico (desenhos/efeitos/sons daquele tema). Os blocos genéricos seguem
  // nas categorias acima; aqui ficam só os "atalhos temáticos". O 1º kit é o de
  // jogo de nave espacial — dá para ir somando outros kits (corrida, fazenda…).
  {
    name: '🚀 Kit espaço',
    colour: '#7950f2',
    types: [
      'sz_g2d_create_ship',
      'sz_g2d_spawn_asteroid',
      'sz_g2d_starfield',
      'sz_g2d_explode',
      'sz_g2d_play_shoot',
      'sz_g2d_play_explosion',
    ],
  },
]

// Cor = navegação: pinta cada bloco com a cor do seu grupo (sobrepõe o C/EVENT_C
// usado na definição). Mantém os dois em sincronia automaticamente.
const COLOUR_BY_TYPE = new Map<string, string>(
  SUBCATS.flatMap((sc) => sc.types.map((t) => [t, sc.colour] as const)),
)
for (const b of gameTwoDBlocks) {
  const colour = COLOUR_BY_TYPE.get(b.type)
  if (colour) b.colour = colour
}

// Rede de segurança: qualquer bloco que não esteja em nenhuma sub-categoria entra
// num grupo "Mais" — nada some da paleta se um bloco novo esquecer de ser mapeado.
const CATEGORIZED = new Set(SUBCATS.flatMap((sc) => sc.types))
const leftover = gameTwoDBlocks.map((b) => b.type).filter((t) => !CATEGORIZED.has(t))

export const gameTwoDToolboxCategory: ExtensionToolboxCategory = {
  kind: 'category',
  name: 'Jogo 2D',
  colour: C,
  contents: [
    ...SUBCATS.map((sc) => ({
      kind: 'category' as const,
      name: sc.name,
      colour: sc.colour,
      contents: sc.types.map((type) => ({ kind: 'block' as const, type })),
    })),
    ...(leftover.length > 0
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
