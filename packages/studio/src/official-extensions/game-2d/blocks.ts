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
    name: '🕹️ Movimento',
    colour: '#4cbfe6',
    types: [
      'sz_g2d_platformer',
      'sz_g2d_top_down',
      'sz_g2d_follow_pointer',
      'sz_g2d_clamp_to_screen',
      'sz_g2d_apply_velocity',
      'sz_g2d_set_gravity',
      'sz_g2d_bounce_edges',
    ],
  },
  {
    name: '⏱️ Quando…',
    colour: '#ffbf00',
    types: ['sz_g2d_update_each_frame', 'sz_g2d_on_key', 'sz_g2d_on_overlap', 'sz_g2d_on_pointer'],
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
  { name: '🏆 Placar', colour: '#ff6680', types: ['sz_g2d_score'] },
  {
    name: '🗺️ Mapa',
    colour: '#59c059',
    types: ['sz_g2d_create_tilemap', 'sz_g2d_draw_tilemap', 'sz_g2d_tilemap_collide'],
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
