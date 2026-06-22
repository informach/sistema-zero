import type { ExtensionToolboxCategory } from '#extensions'
import { categoryShades } from '../../blockly/colorShades'

// Jogo 2D = UMA cor da categoria: ROSA. As sub-categorias são TONS de rosa
// (derivados por categoryShades mais abaixo).
const C = '#ec4899'
// Eventos "Quando…" (hats): também em rosa (o loop de cor abaixo dá a eles o tom
// da sub-categoria "Quando…"; este valor só vale p/ um hat fora de qualquer grupo).
const EVENT_C = '#f06bb0'

export const gameTwoDBlocks = [
  {
    type: 'sz_g2d_create_sprite',
    message0: 'Criar sprite %1 em x %2 y %3 largura %4 altura %5 cor %6',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'jogador' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#22d3ee' },
    ],
    inputsInline: true,
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
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_set_velocity',
    message0: 'Mudar a velocidade do sprite %1 para vx %2 vy %3',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
      { type: 'input_value', name: 'VX', check: 'JSValue' },
      { type: 'input_value', name: 'VY', check: 'JSValue' },
    ],
    inputsInline: true,
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
      { type: 'input_value', name: 'INITIAL', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_game_over',
    message0: 'Mostrar fim de jogo com o texto %1',
    args0: [{ type: 'input_value', name: 'TEXT', check: 'JSValue' }],
    inputsInline: true,
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
    args0: [{ type: 'input_value', name: 'VALUE', check: 'JSValue' }],
    inputsInline: true,
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
  {
    type: 'sz_g2d_play_fx',
    message0: 'Tocar efeito %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'FX',
        options: [
          ['moeda', 'coin'],
          ['joia', 'gem'],
          ['vida', 'heal'],
          ['power-up', 'powerup'],
          ['subir de nível', 'levelup'],
          ['coletar', 'collect'],
          ['tiro', 'laser'],
          ['tiro grande', 'shoot'],
          ['explosão', 'explosion'],
          ['batida', 'hit'],
          ['dano', 'hurt'],
          ['socar', 'punch'],
          ['pulo', 'jump'],
          ['aterrissar', 'land'],
          ['zunido', 'whoosh'],
          ['passo', 'step'],
          ['quicar', 'bounce'],
          ['assobio', 'whistle'],
          ['vitória', 'win'],
          ['derrota', 'gameover'],
          ['começar', 'start'],
          ['alarme', 'alarm'],
          ['clique', 'click'],
          ['confirmar', 'confirm'],
          ['erro', 'error'],
          ['selecionar', 'select'],
          ['aviso', 'blip'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Toca um efeito sonoro pronto (sintetizado, sem arquivo). Escolha um no menu.',
  },
  {
    type: 'sz_g2d_play_note',
    message0: 'Tocar a nota %1 por %2 ms',
    args0: [
      {
        type: 'field_dropdown',
        name: 'NOTE',
        options: [
          ['dó', 'C'],
          ['ré', 'D'],
          ['mi', 'E'],
          ['fá', 'F'],
          ['sol', 'G'],
          ['lá', 'A'],
          ['si', 'B'],
          ['dó agudo', 'C5'],
        ],
      },
      { type: 'field_number', name: 'MS', value: 300, min: 1 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Toca uma nota musical (dó, ré, mi…). Junte várias para fazer uma melodia.',
  },
  {
    type: 'sz_g2d_play_music',
    message0: 'Tocar música de fundo %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'MUSIC',
        options: [
          ['aventura', 'adventure'],
          ['alegre', 'happy'],
          ['tensão', 'tense'],
          ['calma', 'calm'],
          ['vitória', 'victory'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Toca uma musiquinha de fundo em loop (sintetizada). Só uma música toca por vez.',
  },
  {
    type: 'sz_g2d_stop_music',
    message0: 'Parar a música de fundo',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Para a música de fundo que estiver tocando.',
  },

  // ---- Tier 1: Mira e contas ----
  {
    type: 'sz_g2d_aim_at',
    message0: 'Apontar o sprite %1 para o sprite %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'nave' },
      { type: 'field_sprite_picker', name: 'TARGET', text: 'inimigo' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Gira o sprite para ficar de frente para o alvo.',
  },
  {
    type: 'sz_g2d_move_toward',
    message0: 'Mover o sprite %1 na direção do sprite %2 com velocidade %3',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'inimigo' },
      { type: 'field_sprite_picker', name: 'TARGET', text: 'jogador' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Faz o sprite perseguir o alvo, andando um pouquinho na direção dele a cada quadro.',
  },
  {
    type: 'sz_g2d_distance',
    message0: 'a distância entre o sprite %1 e o sprite %2',
    args0: [
      { type: 'field_sprite_picker', name: 'A', text: 'jogador' },
      { type: 'field_sprite_picker', name: 'B', text: 'inimigo' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quantos pixels separam os dois sprites (pelos centros). Use numa conta ou num "se".',
  },
  {
    type: 'sz_g2d_angle_to',
    message0: 'o ângulo (em graus) do sprite %1 até o sprite %2',
    args0: [
      { type: 'field_sprite_picker', name: 'A', text: 'nave' },
      { type: 'field_sprite_picker', name: 'B', text: 'inimigo' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'A direção (0 = pra cima, horário) do primeiro sprite até o segundo.',
  },
  {
    type: 'sz_g2d_random_between',
    message0: 'um número de %1 a %2',
    args0: [
      { type: 'field_number', name: 'MIN', value: 1 },
      { type: 'field_number', name: 'MAX', value: 6 },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'Sorteia um número inteiro entre os dois valores (incluindo as pontas).',
  },
  {
    type: 'sz_g2d_random_chance',
    message0: 'tem chance de %1 %?',
    args0: [{ type: 'field_number', name: 'PERCENT', value: 30, min: 0, max: 100 }],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip:
      'Verdadeiro com a chance escolhida. Ex.: 30 = acontece em ~30% das vezes. Use num "se".',
  },
  {
    type: 'sz_g2d_random_x',
    message0: 'um x aleatório na tela',
    output: 'JSValue',
    colour: C,
    tooltip:
      'Sorteia uma posição x em qualquer lugar da largura da tela. Ótimo para um sprite nascer num x aleatório (asteroides, estrelas…).',
  },
  {
    type: 'sz_g2d_random_y',
    message0: 'um y aleatório na tela',
    output: 'JSValue',
    colour: C,
    tooltip:
      'Sorteia uma posição y em qualquer lugar da altura da tela. Ótimo para um sprite nascer num y aleatório.',
  },

  // ---- Tier 1: Vida e tempo ----
  {
    type: 'sz_g2d_set_health',
    message0: 'Dar %1 de vida ao sprite %2',
    args0: [
      { type: 'input_value', name: 'AMOUNT', check: 'JSValue' },
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Define a vida (e a vida máxima) do sprite.',
  },
  {
    type: 'sz_g2d_change_health',
    message0: 'Mudar a vida do sprite %1 em %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
      { type: 'input_value', name: 'DELTA', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Soma à vida do sprite (número negativo tira vida). Não passa do máximo nem fica abaixo de 0.',
  },
  {
    type: 'sz_g2d_get_health',
    message0: 'a vida do sprite %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quanto de vida o sprite tem agora.',
  },
  {
    type: 'sz_g2d_has_health',
    message0: 'o sprite %1 ainda tem vida?',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' }],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Verdadeiro enquanto a vida do sprite é maior que zero. Use num "se".',
  },
  {
    type: 'sz_g2d_cooldown_ready',
    message0: 'o sprite %1 pode agir? (recarga de %2 quadros)',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'nave' },
      { type: 'field_number', name: 'FRAMES', value: 20, min: 1 },
    ],
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Verdadeiro no máximo a cada N quadros (ótimo para a cadência de tiro). Use num "se".',
  },
  {
    type: 'sz_g2d_prune_old',
    message0: 'Tirar do grupo %1 quem viveu mais de %2 segundos',
    args0: [
      { type: 'field_input', name: 'GROUP', text: 'tiros' },
      { type: 'field_number', name: 'SECONDS', value: 2, min: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Remove do grupo os sprites mais velhos que o tempo dado (tiros somem sozinhos).',
  },

  // ---- Posição & tamanho do sprite (valores prontos p/ facilitar contas) ----
  {
    type: 'sz_g2d_sprite_x',
    message0: 'a posição x do sprite %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'A posição x (borda esquerda) do sprite. Use numa conta ou pra posicionar outra coisa.',
  },
  {
    type: 'sz_g2d_sprite_y',
    message0: 'a posição y do sprite %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'A posição y (borda de cima) do sprite. Use numa conta ou pra posicionar outra coisa.',
  },
  {
    type: 'sz_g2d_sprite_w',
    message0: 'a largura do sprite %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'A largura do sprite, em pixels.',
  },
  {
    type: 'sz_g2d_sprite_h',
    message0: 'a altura do sprite %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'A altura do sprite, em pixels.',
  },
  {
    type: 'sz_g2d_center_x',
    message0: 'o centro x do sprite %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'O x do MEIO do sprite (já soma metade da largura). Ótimo pra atirar/mirar do centro da nave.',
  },
  {
    type: 'sz_g2d_center_y',
    message0: 'o centro y do sprite %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'O y do MEIO do sprite (já soma metade da altura). Ótimo pra atirar/mirar do centro da nave.',
  },

  // ---- Tier 1: Aparência (espelhar, transparência, tamanho) ----
  {
    type: 'sz_g2d_flip_sprite',
    message0: 'Virar o sprite %1 para %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
      {
        type: 'field_dropdown',
        name: 'DIR',
        options: [
          ['esquerda', 'left'],
          ['direita', 'right'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Espelha o desenho do sprite na horizontal (para ele "olhar" para o outro lado).',
  },
  {
    type: 'sz_g2d_set_opacity',
    message0: 'Mudar a transparência do sprite %1 para %2 %',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
      { type: 'input_value', name: 'PERCENT', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: '100% = totalmente visível; 0% = invisível. Bom para fantasmas, fades e piscadas.',
  },
  {
    type: 'sz_g2d_set_size',
    message0: 'Mudar o tamanho do sprite %1 para largura %2 altura %3',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Define a largura e a altura do sprite (a colisão acompanha o novo tamanho).',
  },
  {
    type: 'sz_g2d_scale_sprite',
    message0: 'Multiplicar o tamanho do sprite %1 por %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
      { type: 'input_value', name: 'FACTOR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Cresce (maior que 1) ou encolhe (menor que 1) o sprite a partir do centro.',
  },

  // ---- Tier 1: Mundo ----
  {
    type: 'sz_g2d_wrap_edges',
    message0: 'Dar a volta na tela com o sprite %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'nave' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Saiu por um lado da tela, reaparece no lado oposto (estilo Pac-Man/Asteroids).',
  },

  // ---- Tier 1: Pausa (estado do jogo) ----
  {
    type: 'sz_g2d_pause',
    message0: 'Pausar o jogo',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Marca o jogo como pausado. Embrulhe o movimento num "se o jogo não está pausado".',
  },
  {
    type: 'sz_g2d_resume',
    message0: 'Continuar o jogo',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Tira o jogo da pausa.',
  },
  {
    type: 'sz_g2d_is_paused',
    message0: 'o jogo está pausado?',
    output: 'JSValue',
    colour: EVENT_C,
    tooltip: 'Verdadeiro quando o jogo está pausado. Use num "se".',
  },

  // ---- Tier 2: Câmera (rola o mundo; o HUD fica fixo) ----
  {
    type: 'sz_g2d_camera_follow',
    message0: 'Fazer a câmera seguir o sprite %1 (mundo %2 x %3)',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
      { type: 'input_value', name: 'WORLDW', check: 'JSValue' },
      { type: 'input_value', name: 'WORLDH', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A câmera centraliza no sprite (mundo maior que a tela), presa às bordas do mundo. Desenhe o HUD DEPOIS do mundo — ele não se move.',
  },
  {
    type: 'sz_g2d_set_camera',
    message0: 'Mover a câmera para x %1 y %2',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Posiciona a câmera na mão (canto superior esquerdo do que aparece na tela).',
  },
  {
    type: 'sz_g2d_camera_x',
    message0: 'a posição x da câmera',
    output: 'JSValue',
    colour: C,
    tooltip: 'Onde a câmera está no eixo x — útil para fundos em parallax.',
  },
  {
    type: 'sz_g2d_camera_y',
    message0: 'a posição y da câmera',
    output: 'JSValue',
    colour: C,
    tooltip: 'Onde a câmera está no eixo y — útil para fundos em parallax.',
  },

  // ---- Tier 2: Mapa destrutível (pela posição de um sprite) ----
  {
    type: 'sz_g2d_break_tile_at',
    message0: 'Quebrar o tile do mapa %1 onde está o sprite %2',
    args0: [
      { type: 'field_input', name: 'MAP', text: 'mapa' },
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Apaga o tile que está sob o sprite (mineração/destruição). Vira espaço vazio.',
  },
  {
    type: 'sz_g2d_set_tile',
    message0: 'No mapa %1, pôr o tile número %2 onde está o sprite %3',
    args0: [
      { type: 'field_input', name: 'MAP', text: 'mapa' },
      { type: 'field_number', name: 'INDEX', value: 1, min: 0 },
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Coloca um tile (pelo número do tileset) na célula sob o sprite. Bom para construir.',
  },
  {
    type: 'sz_g2d_tile_at',
    message0: 'o número do tile do mapa %1 onde está o sprite %2',
    args0: [
      { type: 'field_input', name: 'MAP', text: 'mapa' },
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip:
      'O número do tile na célula sob o sprite (-1 se estiver vazio). Use num "se" ou numa conta.',
  },

  // ---- Tier 2: Ordem de desenho dentro de um grupo ----
  {
    type: 'sz_g2d_bring_to_front',
    message0: 'Trazer o sprite %1 para a frente no grupo %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
      { type: 'field_input', name: 'GROUP', text: 'inimigos' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Faz o sprite ser desenhado por ÚLTIMO no grupo (aparece na frente dos outros).',
  },
  {
    type: 'sz_g2d_send_to_back',
    message0: 'Mandar o sprite %1 para trás no grupo %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
      { type: 'field_input', name: 'GROUP', text: 'inimigos' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Faz o sprite ser desenhado PRIMEIRO no grupo (fica atrás dos outros).',
  },

  // ---- Tier 2: Depuração ----
  {
    type: 'sz_g2d_draw_hitbox',
    message0: 'Mostrar a caixa de colisão do sprite %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desenha um contorno rosa na área de colisão do sprite (para depurar colisões).',
  },
  {
    type: 'sz_g2d_show_fps',
    message0: 'Mostrar os quadros por segundo (FPS) em x %1 y %2',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Escreve quantos quadros por segundo o jogo está rodando (para ver a performance).',
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
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'JUMP', check: 'JSValue' },
    ],
    inputsInline: true,
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
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
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
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#ffffff' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
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
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#ffffff' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
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
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
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
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
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
      { type: 'input_value', name: 'TITLE', check: 'JSValue' },
      { type: 'input_value', name: 'SUBTITLE', check: 'JSValue' },
      { type: 'input_value', name: 'HINT', check: 'JSValue' },
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
    args0: [{ type: 'input_value', name: 'SPEED', check: 'JSValue' }],
    inputsInline: true,
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

  {
    type: 'sz_g2d_setup_stage',
    message0: 'Preparar o jogo em tela cheia, tela %1 × %2, fundo %3',
    args0: [
      { type: 'field_number', name: 'W', value: 800, min: 1 },
      { type: 'field_number', name: 'H', value: 480, min: 1 },
      { type: 'field_colour_sz', name: 'BG', colour: '#0b1020' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Atalho para começar: prepara a tela do jogo (largura × altura) para ocupar a janela inteira, mantendo a proporção e se reajustando sozinha, e centralizada. A cor do fundo combina com o jogo — fica no canvas e na sobra ao redor. Use uma vez no começo. Não precisa criar a tela de desenho no HTML.',
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
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: true,
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
      { type: 'input_value', name: 'FRAMES', check: 'JSValue' },
    ],
    inputsInline: true,
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
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'BODY', colour: '#35e8ff' },
      { type: 'field_colour_sz', name: 'WINGS', colour: '#2568ff' },
    ],
    inputsInline: true,
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

  // ---- Pulo no chão (genérico, Movimento) ----
  {
    type: 'sz_g2d_jump_on_ground',
    message0: 'Fazer o sprite %1 pular no chão — força do pulo %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'dino' },
      { type: 'input_value', name: 'JUMP', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Pula com ↑/Espaço/W ou um toque na tela, com gravidade e pouso no chão (a base da tela). Ótimo para jogos de corrida e de pulo. Use dentro do "a cada quadro".',
  },

  // ---- Kit dino (v0.9.0): desenhos prontos + sons para um jogo de corrida ----
  {
    type: 'sz_g2d_create_dino',
    message0: 'Criar dinossauro %1 em x %2 y %3 tamanho %4 cor %5',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'dino' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#5fb45f' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um dinossauro desenhado (com perninhas que correm sozinhas). A pose muda quando ele pula ou abaixa.',
  },
  {
    type: 'sz_g2d_control_dino',
    message0: 'Controlar o dinossauro %1 — força do pulo %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'dino' },
      { type: 'input_value', name: 'JUMP', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Pula com ↑/Espaço ou toque na metade de cima da tela; abaixa com ↓ ou segurando o dedo embaixo. Já vem com gravidade, chão e poeira. Use dentro do "a cada quadro".',
  },
  {
    type: 'sz_g2d_spawn_obstacle',
    message0: 'No grupo %1 criar obstáculo %2 em x %3 tamanho %4 com vx %5',
    args0: [
      { type: 'field_input', name: 'GROUP', text: 'obstaculos' },
      {
        type: 'field_dropdown',
        name: 'SHAPE',
        options: [
          ['cacto', 'cactus'],
          ['pedra', 'rock'],
          ['pássaro (voa alto)', 'bird'],
          ['surpresa (sorteia)', 'random'],
        ],
      },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'field_number', name: 'SIZE', value: 44, min: 8 },
      { type: 'input_value', name: 'VX', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um obstáculo desenhado e coloca no grupo. Cacto e pedra nascem no chão (pule por cima); o pássaro vem no alto (abaixe por baixo). Ligue o x na borda direita e um vx negativo para ele vir vindo.',
  },
  {
    type: 'sz_g2d_spawn_egg',
    message0: 'No grupo %1 criar um ovo (bônus) em x %2 y %3 com vx %4',
    args0: [
      { type: 'field_input', name: 'GROUP', text: 'ovos' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'VX', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um ovo desenhado (item de bônus) e coloca no grupo. Quando o dino encostar, dá pontos extras.',
  },
  {
    type: 'sz_g2d_forest',
    message0: 'Desenhar fundo de floresta (velocidade %1)',
    args0: [{ type: 'input_value', name: 'SPEED', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha um céu com sol, nuvens, morros e uma faixa de grama que rola (parallax). Use no começo do "a cada quadro", depois de limpar a tela. O dino corre sobre a grama.',
  },
  {
    type: 'sz_g2d_play_jump',
    message0: 'Tocar som de pulo',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Um "biip" curto subindo de tom (som sintetizado, sem precisar de arquivo).',
  },
  {
    type: 'sz_g2d_play_dino_hurt',
    message0: 'Tocar som de dano',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Um rosnado grave que decai (som sintetizado, sem precisar de arquivo).',
  },
  {
    type: 'sz_g2d_play_collect',
    message0: 'Tocar som de coletar',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Duas notinhas alegres (som sintetizado) — ótimo ao pegar o ovo bônus.',
  },

  // ---- Nave clássica: girar + impulsionar na direção apontada (v0.10.0) ----
  {
    type: 'sz_g2d_steer_thrust',
    message0: 'Controlar o sprite %1 como nave — velocidade %2 giro %3',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'nave' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'input_value', name: 'TURN', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Controle clássico de nave: vira com as setas ← → (ou A/D), acelera na direção apontada com a seta ↑ (ou W) e desliza com atrito ao soltar. "giro" é quantos graus ela vira por quadro. Use a cada quadro.',
  },
  {
    type: 'sz_g2d_rotate_sprite',
    message0: 'Girar o sprite %1 em %2 graus',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'nave' },
      { type: 'input_value', name: 'DEG', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Gira o sprite alguns graus (positivo = sentido horário, negativo = anti-horário). 0 graus = apontando pra cima.',
  },
  {
    type: 'sz_g2d_point_sprite',
    message0: 'Apontar o sprite %1 para %2 graus',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'nave' },
      { type: 'input_value', name: 'DEG', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Vira o sprite direto para um ângulo (0 = pra cima, 90 = pra direita, 180 = pra baixo, 270 = pra esquerda).',
  },
  {
    type: 'sz_g2d_thrust',
    message0: 'Impulsionar o sprite %1 para a frente, força %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'nave' },
      { type: 'input_value', name: 'FORCE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Acelera o sprite na direção que ele está apontando (soma à velocidade). Combine com "aplicar velocidade" e "frear aos poucos" para o efeito de nave no espaço.',
  },
  {
    type: 'sz_g2d_apply_friction',
    message0: 'Frear o sprite %1 aos poucos (atrito %2)',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'nave' },
      { type: 'input_value', name: 'FACTOR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Vai diminuindo a velocidade do sprite (multiplica por um fator entre 0 e 1). Perto de 1 desliza bastante; menor freia rápido.',
  },
  {
    type: 'sz_g2d_sprite_angle',
    message0: 'a direção (em graus) do sprite %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'nave' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'O ângulo que o sprite está apontando, em graus (0 = pra cima, horário). Use numa conta ou num "se".',
  },
  {
    type: 'sz_g2d_shoot_from',
    message0: 'Atirar do sprite %1 para a frente, no grupo %2 — velocidade %3 cor %4',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'nave' },
      { type: 'field_input', name: 'GROUP', text: 'tiros' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#9cff57' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um tiro na ponta do sprite, saindo na direção que ele aponta. Use no "quando apertar a tecla Espaço".',
  },
  {
    type: 'sz_g2d_spawn_asteroid_edge',
    message0: 'No grupo %1 soltar um asteroide de uma borda — tamanho %2 cor %3 velocidade %4',
    args0: [
      { type: 'field_input', name: 'GROUP', text: 'asteroides' },
      { type: 'field_number', name: 'SIZE', value: 40, min: 4 },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#8d8f9b' },
      { type: 'field_number', name: 'SPEED', value: 1.5, min: 0, precision: 0.1 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Solta um asteroide vindo de uma das bordas da tela (sorteada), já indo em direção ao centro. Use dentro de "a cada X segundos" para nascerem sem parar.',
  },

  // ---- Kit gorilas (v0.11.0): batalha de bananas (artilharia) ----
  {
    type: 'sz_g2d_create_city',
    message0: 'Criar cidade de prédios %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'cidade' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Sorteia uma cidade de prédios (com janelas e vento) e guarda numa variável. É nela que os gorilas ficam e a banana abre crateras.',
  },
  {
    type: 'sz_g2d_draw_city',
    message0: 'Desenhar a cidade %1',
    args0: [{ type: 'field_input', name: 'CITY', text: 'cidade' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha o céu, a lua e os prédios com janelas — já com as crateras "furadas". Use no começo do "a cada quadro", depois de limpar a tela.',
  },
  {
    type: 'sz_g2d_place_thrower',
    message0: 'Pôr o gorila %1 na cidade %2 no lado %3 cor %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'gorila1' },
      { type: 'field_input', name: 'CITY', text: 'cidade' },
      {
        type: 'field_dropdown',
        name: 'SIDE',
        options: [
          ['esquerdo', 'left'],
          ['direito', 'right'],
        ],
      },
      { type: 'field_colour_sz', name: 'COLOR', colour: '#6b4a2b' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um gorila no alto de um prédio perto da ponta (esquerda ou direita) e guarda numa variável. Faça um para cada jogador.',
  },
  {
    type: 'sz_g2d_new_wind',
    message0: 'Sortear o vento da cidade %1',
    args0: [{ type: 'field_input', name: 'CITY', text: 'cidade' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Sorteia um novo vento (empurra a banana para um lado). Use a cada troca de turno.',
  },
  {
    type: 'sz_g2d_draw_wind',
    message0: 'Desenhar a seta do vento da cidade %1',
    args0: [{ type: 'field_input', name: 'CITY', text: 'cidade' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha uma seta no topo: o tamanho mostra a força do vento e o lado mostra a direção. Use no "a cada quadro".',
  },
  {
    type: 'sz_g2d_aim_drag',
    message0: 'Mirar arrastando a partir do gorila %1',
    args0: [{ type: 'field_sprite_picker', name: 'THROWER', text: 'gorila1' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Enquanto segura o mouse/dedo, aponte para onde quer jogar (mais longe = mais forte) e veja a linha pontilhada da trajetória. Solte para lançar. Use no gorila da vez, no "a cada quadro".',
  },
  {
    type: 'sz_g2d_aim_released',
    message0: 'soltou a mira do gorila %1 ?',
    args0: [{ type: 'field_sprite_picker', name: 'THROWER', text: 'gorila1' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro no instante em que a criança SOLTA a mira (depois de arrastar). Use num "se" para então "Jogar a banana".',
  },
  {
    type: 'sz_g2d_throw_banana',
    message0: 'Jogar a banana do gorila %1 na cidade %2',
    args0: [
      { type: 'field_sprite_picker', name: 'THROWER', text: 'gorila1' },
      { type: 'field_input', name: 'CITY', text: 'cidade' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Lança a banana do gorila com a mira atual. Só dá pra ter uma banana voando por vez.',
  },
  {
    type: 'sz_g2d_update_banana',
    message0: 'Mover a banana da cidade %1',
    args0: [{ type: 'field_input', name: 'CITY', text: 'cidade' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Move a banana um pouquinho: a gravidade puxa para baixo e o vento da cidade empurra para o lado. Use no "a cada quadro".',
  },
  {
    type: 'sz_g2d_draw_banana',
    message0: 'Desenhar a banana da cidade %1',
    args0: [{ type: 'field_input', name: 'CITY', text: 'cidade' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desenha a banana voando (com um rastro). Use no "a cada quadro".',
  },
  {
    type: 'sz_g2d_banana_hit_thrower',
    message0: 'a banana da cidade %1 acertou o gorila %2 ?',
    args0: [
      { type: 'field_input', name: 'CITY', text: 'cidade' },
      { type: 'field_sprite_picker', name: 'THROWER', text: 'gorila2' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro se a banana encostou no gorila (acerto = vitória). Passe o gorila INIMIGO. Use num "se".',
  },
  {
    type: 'sz_g2d_banana_hit_city',
    message0: 'a banana da cidade %1 bateu num prédio ?',
    args0: [{ type: 'field_input', name: 'CITY', text: 'cidade' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro quando a banana bate num prédio (abre uma cratera) ou sai da tela. É a hora de TROCAR de turno. Atenção: já abre o buraco e some com a banana.',
  },
  {
    type: 'sz_g2d_play_whistle',
    message0: 'Tocar som de banana caindo',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Um assobio que desce de tom (som sintetizado, sem precisar de arquivo).',
  },
  {
    type: 'sz_g2d_play_boom',
    message0: 'Tocar som de explosão',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Um "bum" curto de explosão (som sintetizado) — ótimo quando a banana acerta.',
  },
  {
    type: 'sz_g2d_computer_turn',
    message0: 'O robô do gorila %1 joga na cidade %2 mirando no %3',
    args0: [
      { type: 'field_sprite_picker', name: 'THROWER', text: 'gorila2' },
      { type: 'field_input', name: 'CITY', text: 'cidade' },
      { type: 'field_sprite_picker', name: 'ENEMY', text: 'gorila1' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'O robô mira sozinho (simula vários lançamentos e escolhe o melhor), pensa um instante e joga a banana. Use no "a cada quadro", na vez do robô. Um tiro por vez. Passe o gorila INIMIGO no último campo.',
  },
  {
    type: 'sz_g2d_draw_aim_readout',
    message0: 'Mostrar ângulo e força da mira',
    args0: [],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Mostra no canto o ângulo (graus) e a força do último arremesso/mira — bom para acompanhar o que o robô escolheu.',
  },

  // ---- Kit equilibrista (Stick Hero) (v0.13.0) ----
  {
    type: 'sz_g2d_create_stickhero',
    message0: 'Criar equilibrista %1 no pincel %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'jogo' },
      { type: 'field_input', name: 'CTX', text: 'ctx' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Monta o jogo do equilibrista (herói, plataformas, colinas e árvores) e guarda numa variável. Faça uma vez, no começo. Depois use "atualizar o equilibrista" dentro do "a cada quadro".',
  },
  {
    type: 'sz_g2d_update_stickhero',
    message0: 'Atualizar o equilibrista %1',
    args0: [{ type: 'field_input', name: 'GAME', text: 'jogo' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Faz um passo do jogo e desenha tudo. Segure o mouse/dedo para esticar o bastão, solte para derrubar e atravessar. Use dentro do "a cada quadro".',
  },
  {
    type: 'sz_g2d_stickhero_score',
    message0: 'pontos do equilibrista %1',
    args0: [{ type: 'field_input', name: 'GAME', text: 'jogo' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quantas plataformas o herói já atravessou (acerto perfeito vale 2).',
  },
  {
    type: 'sz_g2d_stickhero_over',
    message0: 'o equilibrista %1 caiu?',
    args0: [{ type: 'field_input', name: 'GAME', text: 'jogo' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro quando o herói caiu no buraco (fim de jogo). Use num "se".',
  },
  {
    type: 'sz_g2d_restart_stickhero',
    message0: 'Recomeçar o equilibrista %1',
    args0: [{ type: 'field_input', name: 'GAME', text: 'jogo' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Zera o jogo do equilibrista (pontos, plataformas e herói). Bom para um botão "recomeçar".',
  },

  // ---- Kit balão (Hot-Air-Balloon) (v0.13.0) ----
  {
    type: 'sz_g2d_create_balloon',
    message0: 'Criar balão %1 no pincel %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'jogo' },
      { type: 'field_input', name: 'CTX', text: 'ctx' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Monta o jogo do balão (céu, colinas, árvores e combustível) e guarda numa variável. Faça uma vez. Depois use "atualizar o balão" dentro do "a cada quadro".',
  },
  {
    type: 'sz_g2d_update_balloon',
    message0: 'Atualizar o balão %1',
    args0: [{ type: 'field_input', name: 'GAME', text: 'jogo' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Faz um passo do jogo e desenha tudo. Segure o mouse/dedo para subir (gasta combustível); voe baixo para economizar e desvie das árvores. Use dentro do "a cada quadro".',
  },
  {
    type: 'sz_g2d_balloon_score',
    message0: 'metros do balão %1',
    args0: [{ type: 'field_input', name: 'GAME', text: 'jogo' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'A distância (em metros) que o balão já voou.',
  },
  {
    type: 'sz_g2d_balloon_fuel',
    message0: 'combustível do balão %1',
    args0: [{ type: 'field_input', name: 'GAME', text: 'jogo' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quanto combustível resta (0 a 100). Use num "se" para avisar quando estiver baixo.',
  },
  {
    type: 'sz_g2d_balloon_over',
    message0: 'o balão %1 bateu/acabou?',
    args0: [{ type: 'field_input', name: 'GAME', text: 'jogo' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro quando o balão bateu numa árvore ou ficou sem combustível e pousou (fim de jogo). Use num "se".',
  },
  {
    type: 'sz_g2d_restart_balloon',
    message0: 'Recomeçar o balão %1',
    args0: [{ type: 'field_input', name: 'GAME', text: 'jogo' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Zera o jogo do balão (combustível, distância e árvores). Bom para um botão "recomeçar".',
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
    name: '📐 Posição & tamanho',
    colour: '#4c97ff',
    types: [
      'sz_g2d_sprite_x',
      'sz_g2d_sprite_y',
      'sz_g2d_sprite_w',
      'sz_g2d_sprite_h',
      'sz_g2d_center_x',
      'sz_g2d_center_y',
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
      'sz_g2d_bring_to_front',
      'sz_g2d_send_to_back',
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
      'sz_g2d_jump_on_ground',
      'sz_g2d_steer_thrust',
      'sz_g2d_rotate_sprite',
      'sz_g2d_point_sprite',
      'sz_g2d_thrust',
      'sz_g2d_apply_friction',
      'sz_g2d_sprite_angle',
      'sz_g2d_wrap_edges',
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
    name: '🎯 Mira e contas',
    colour: '#48b8d0',
    types: [
      'sz_g2d_aim_at',
      'sz_g2d_move_toward',
      'sz_g2d_angle_to',
      'sz_g2d_distance',
      'sz_g2d_random_between',
      'sz_g2d_random_chance',
      'sz_g2d_random_x',
      'sz_g2d_random_y',
    ],
  },
  {
    name: '❤️ Vida e tempo',
    colour: '#ff5c8d',
    types: [
      'sz_g2d_set_health',
      'sz_g2d_change_health',
      'sz_g2d_get_health',
      'sz_g2d_has_health',
      'sz_g2d_cooldown_ready',
      'sz_g2d_prune_old',
    ],
  },
  {
    name: '✨ Aparência',
    colour: '#9966ff',
    types: [
      'sz_g2d_clear',
      'sz_g2d_setup_stage',
      'sz_g2d_fit_screen',
      'sz_g2d_blink',
      'sz_g2d_flash',
      'sz_g2d_shake',
      'sz_g2d_emit_particles',
      'sz_g2d_draw_particles',
      'sz_g2d_flip_sprite',
      'sz_g2d_set_opacity',
      'sz_g2d_set_size',
      'sz_g2d_scale_sprite',
      'sz_g2d_draw_hitbox',
      'sz_g2d_show_fps',
      'sz_g2d_game_over',
    ],
  },
  {
    name: '🎬 Animação',
    colour: '#cf63cf',
    types: ['sz_g2d_load_spritesheet', 'sz_g2d_animate_sprite', 'sz_g2d_draw_frame'],
  },
  {
    name: '🔊 Som',
    colour: '#d65cd6',
    types: [
      'sz_g2d_play_fx',
      'sz_g2d_play_sound',
      'sz_g2d_play_note',
      'sz_g2d_play_music',
      'sz_g2d_stop_music',
    ],
  },
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
    types: [
      'sz_g2d_set_scene',
      'sz_g2d_scene_is',
      'sz_g2d_show_screen',
      'sz_g2d_pause',
      'sz_g2d_resume',
      'sz_g2d_is_paused',
      'sz_g2d_restart',
    ],
  },
  {
    name: '🗺️ Mapa',
    colour: '#59c059',
    types: [
      'sz_g2d_create_tilemap',
      'sz_g2d_draw_tilemap',
      'sz_g2d_tilemap_collide',
      'sz_g2d_break_tile_at',
      'sz_g2d_set_tile',
      'sz_g2d_tile_at',
    ],
  },
  {
    name: '🎥 Câmera',
    colour: '#0ea5b7',
    types: ['sz_g2d_camera_follow', 'sz_g2d_set_camera', 'sz_g2d_camera_x', 'sz_g2d_camera_y'],
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
      'sz_g2d_spawn_asteroid_edge',
      'sz_g2d_shoot_from',
      'sz_g2d_starfield',
      'sz_g2d_explode',
      'sz_g2d_play_shoot',
      'sz_g2d_play_explosion',
    ],
  },
  {
    name: '🦕 Kit dino',
    colour: '#5fa844',
    types: [
      'sz_g2d_create_dino',
      'sz_g2d_control_dino',
      'sz_g2d_spawn_obstacle',
      'sz_g2d_spawn_egg',
      'sz_g2d_forest',
      'sz_g2d_play_jump',
      'sz_g2d_play_dino_hurt',
      'sz_g2d_play_collect',
    ],
  },
  {
    name: '🦍 Kit gorilas',
    colour: '#a8632e',
    types: [
      'sz_g2d_create_city',
      'sz_g2d_draw_city',
      'sz_g2d_place_thrower',
      'sz_g2d_new_wind',
      'sz_g2d_draw_wind',
      'sz_g2d_aim_drag',
      'sz_g2d_aim_released',
      'sz_g2d_throw_banana',
      'sz_g2d_update_banana',
      'sz_g2d_draw_banana',
      'sz_g2d_banana_hit_thrower',
      'sz_g2d_banana_hit_city',
      'sz_g2d_play_whistle',
      'sz_g2d_play_boom',
      'sz_g2d_computer_turn',
      'sz_g2d_draw_aim_readout',
    ],
  },
  {
    name: '🤸 Kit equilibrista',
    colour: '#0ea5a0',
    types: [
      'sz_g2d_create_stickhero',
      'sz_g2d_update_stickhero',
      'sz_g2d_stickhero_score',
      'sz_g2d_stickhero_over',
      'sz_g2d_restart_stickhero',
    ],
  },
  {
    name: '🎈 Kit balão',
    colour: '#d6455d',
    types: [
      'sz_g2d_create_balloon',
      'sz_g2d_update_balloon',
      'sz_g2d_balloon_score',
      'sz_g2d_balloon_fuel',
      'sz_g2d_balloon_over',
      'sz_g2d_restart_balloon',
    ],
  },
]

// Cada sub-categoria recebe um TOM do ciano da categoria (claro→escuro),
// derivado da cor base por categoryShades — sobrepõe os literais de SUBCATS.
const SUBCAT_SHADES = categoryShades(C, SUBCATS.length)
SUBCATS.forEach((sc, i) => {
  sc.colour = SUBCAT_SHADES[i] ?? C
})
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

// Sombras pré-preenchidas dos slots de VALOR que aparecem na paleta: o aluno pode
// digitar o texto direto (UX igual à de antes) E ainda trocar por uma variável,
// "juntar texto" ou o resultado de uma função.
const txtShadow = (text: string) => ({ shadow: { type: 'sz_val_text', fields: { TEXT: text } } })
const numShadow = (value: number) => ({ shadow: { type: 'sz_val_number', fields: { NUM: value } } })
const G2D_SOCKET_SHADOWS: Record<string, Record<string, unknown>> = {
  sz_g2d_show_screen: {
    TITLE: txtShadow('Nave contra Asteroides'),
    SUBTITLE: txtShadow('Destrua os asteroides!'),
    HINT: txtShadow('Aperte Enter para começar'),
  },
  sz_g2d_create_sprite: {
    X: numShadow(100),
    Y: numShadow(100),
    W: numShadow(40),
    H: numShadow(40),
  },
  sz_g2d_create_image_sprite: {
    X: numShadow(100),
    Y: numShadow(100),
    W: numShadow(40),
    H: numShadow(40),
  },
  sz_g2d_create_ship: { X: numShadow(180), Y: numShadow(250), W: numShadow(54), H: numShadow(62) },
  sz_g2d_create_dino: { X: numShadow(120), Y: numShadow(150), SIZE: numShadow(64) },
  sz_g2d_set_position: { X: numShadow(0), Y: numShadow(0) },
  sz_g2d_set_velocity: { VX: numShadow(0), VY: numShadow(0) },
  sz_g2d_set_size: { W: numShadow(40), H: numShadow(40) },
  sz_g2d_scale_sprite: { FACTOR: numShadow(1.5) },
  sz_g2d_score: { INITIAL: numShadow(0) },
  sz_g2d_game_over: { TEXT: txtShadow('Fim de jogo') },
  sz_g2d_set_health: { AMOUNT: numShadow(3) },
  sz_g2d_change_health: { DELTA: numShadow(-1) },
  sz_g2d_top_down: { SPEED: numShadow(3) },
  sz_g2d_follow_pointer: { SPEED: numShadow(3) },
  sz_g2d_arrows_x: { SPEED: numShadow(6) },
  sz_g2d_rotate_sprite: { DEG: numShadow(15) },
  sz_g2d_point_sprite: { DEG: numShadow(0) },
  sz_g2d_thrust: { FORCE: numShadow(0.1) },
  sz_g2d_apply_friction: { FACTOR: numShadow(0.97) },
  sz_g2d_move_toward: { SPEED: numShadow(2) },
  sz_g2d_platformer: { SPEED: numShadow(4), JUMP: numShadow(11) },
  sz_g2d_jump_on_ground: { JUMP: numShadow(14) },
  sz_g2d_control_dino: { JUMP: numShadow(15) },
  sz_g2d_steer_thrust: { SPEED: numShadow(3), TURN: numShadow(3) },
  sz_g2d_shoot_from: { SPEED: numShadow(6) },
  sz_g2d_set_gravity: { VALUE: numShadow(0.5) },
  sz_g2d_set_opacity: { PERCENT: numShadow(50) },
  sz_g2d_starfield: { SPEED: numShadow(1) },
  sz_g2d_blink: { FRAMES: numShadow(60) },
  sz_g2d_forest: { SPEED: numShadow(4) },
  sz_g2d_camera_follow: { WORLDW: numShadow(800), WORLDH: numShadow(600) },
  sz_g2d_set_camera: { X: numShadow(0), Y: numShadow(0) },
  sz_g2d_show_fps: { X: numShadow(8), Y: numShadow(20) },
  sz_g2d_shake: { INTENSITY: numShadow(8) },
  sz_g2d_emit_particles: { COUNT: numShadow(14), X: numShadow(150), Y: numShadow(100) },
  sz_g2d_draw_score: { X: numShadow(12), Y: numShadow(30), SIZE: numShadow(24) },
  sz_g2d_draw_label: { X: numShadow(12), Y: numShadow(30), SIZE: numShadow(20) },
  sz_g2d_draw_hearts: { X: numShadow(12), Y: numShadow(48), SIZE: numShadow(22) },
  sz_g2d_draw_bar: { X: numShadow(12), Y: numShadow(48), W: numShadow(160), H: numShadow(14) },
}
const toolboxBlock = (type: string) => {
  const inputs = G2D_SOCKET_SHADOWS[type]
  return inputs ? { kind: 'block' as const, type, inputs } : { kind: 'block' as const, type }
}

export const gameTwoDToolboxCategory: ExtensionToolboxCategory = {
  kind: 'category',
  name: 'Jogo 2D',
  colour: C,
  contents: [
    ...SUBCATS.map((sc) => ({
      kind: 'category' as const,
      name: sc.name,
      colour: sc.colour,
      contents: sc.types.map(toolboxBlock),
    })),
    ...(leftover.length > 0
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
