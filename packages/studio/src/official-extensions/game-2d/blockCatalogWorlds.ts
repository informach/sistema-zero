import type { BlockDefinition } from '../../blockly/blocks/types'
import {
  GAME_TWO_D_BLOCK_COLOR as C,
  GAME_TWO_D_EVENT_COLOR as EVENT_C,
} from './blockCatalogShared'

/**
 * Mapas, Mundos e Fases são conceitos separados de propósito:
 *
 * - Mapa: a arte/grade e sua geometria.
 * - Mundo: limites, terreno e regras de câmera de uma área jogável.
 * - Fase: entrada opcional em um Mundo, com ponto inicial e evento de entrada.
 *
 * Os textos abaixo fazem parte do contrato pedagógico da extensão. Evite
 * encurtá-los de volta para termos ambíguos como "usar mapa com câmera".
 */
export const gameTwoDWorldBlocks = [
  // ---- Mapas: preparar uma vez, desenhar muitas vezes ----
  {
    type: 'sz_g2d_fit_tilemap_to_stage',
    placement: 'start-only-command',
    message0: 'Preparar o mapa %1 encaixado na tela',
    args0: [{ type: 'field_name_picker', name: 'MAP', text: 'mapa', kind: 'tilemap' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Define uma vez o tamanho e a posição do mapa para ele caber inteiro na tela. Use em “Ao iniciar”. Isso não cria Mundo, câmera nem Fase.',
  },
  {
    type: 'sz_g2d_place_tilemap',
    placement: 'start-only-command',
    message0: 'Preparar o mapa %1 em x %2 y %3 com tiles de %4 px',
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
      'Define uma vez a origem e o tamanho exatos dos tiles. Use em “Ao iniciar” para mapas maiores que a tela ou posicionados dentro de um Mundo.',
  },
  {
    type: 'sz_g2d_draw_prepared_tilemap',
    placement: 'loop-command',
    message0: 'Desenhar o mapa preparado %1',
    args0: [{ type: 'field_name_picker', name: 'MAP', text: 'mapa', kind: 'tilemap' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha o mapa usando exatamente a geometria preparada em “Ao iniciar”. Desenhar nunca muda o tamanho nem desloca as colisões.',
  },

  // ---- Movimento: tela artificial ou terreno real ----
  {
    type: 'sz_g2d_platformer_terrain',
    placement: 'command',
    message0: 'Mover o sprite %1 estilo plataforma sobre o terreno, velocidade %2 pulo %3',
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
      'Move com ←/→ e pula com ↑ somente quando uma colisão confirmou chão. Não inventa piso na borda da tela. Logo abaixo, use “Colidir com o Mundo” para confirmar mapas ou figuras de terreno.',
  },
  {
    type: 'sz_g2d_jump_terrain',
    placement: 'command',
    message0: 'Fazer o sprite %1 pular sobre o terreno, força %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'input_value', name: 'JUMP', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Pula com ↑/Espaço/W ou toque somente sobre terreno confirmado. Não usa a borda da tela como chão.',
  },

  // ---- Mundos: uma área jogável, com ou sem tilemap ----
  {
    type: 'sz_g2d_create_world',
    placement: 'start-only-command',
    message0: 'Criar Mundo %1 com largura %2 altura %3',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'mundo' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma área jogável vazia com limites próprios. Use para terreno feito de figuras, para jogos de nave ou para uma única tela. Mundo não é Fase.',
  },
  {
    type: 'sz_g2d_create_world_from_tilemap',
    placement: 'start-only-command',
    message0: 'Criar Mundo %1 do mapa %2 com tiles de %3 px',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'mundo' },
      { type: 'field_name_picker', name: 'MAP', text: 'mapa', kind: 'tilemap' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um Mundo exatamente do tamanho da grade: colunas × tile por linhas × tile. Também prepara o mapa em x 0, y 0. Use um Mundo por mapa quando houver rolagem ou terreno misto.',
  },
  {
    type: 'sz_g2d_world_add_tilemap',
    placement: 'start-only-command',
    message0: 'No Mundo %1 usar o mapa preparado %2 como terreno',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g2d-world' },
      { type: 'field_name_picker', name: 'MAP', text: 'mapa', kind: 'tilemap' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Acrescenta um mapa já preparado ao terreno do Mundo. Se ele passar dos limites, o Mundo avisa em vez de deslocar ou cortar silenciosamente.',
  },
  {
    type: 'sz_g2d_world_add_solid_group',
    placement: 'start-only-command',
    message0: 'No Mundo %1 usar as figuras do grupo %2 como terreno sólido',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g2d-world' },
      { type: 'field_name_picker', name: 'GROUP', text: 'chao', kind: 'group' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cada figura do grupo vira chão e parede que bloqueia por todos os lados. Também pode ser desenhada pelo Mundo. Se estiver nos dois tipos, terreno sólido vence.',
  },
  {
    type: 'sz_g2d_world_add_platform_group',
    placement: 'start-only-command',
    message0: 'No Mundo %1 usar as figuras do grupo %2 como plataformas',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g2d-world' },
      { type: 'field_name_picker', name: 'GROUP', text: 'plataformas', kind: 'group' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cada figura do grupo vira plataforma: dá para passar por baixo e pousar na face atraída pela gravidade. Plataformas móveis carregam quem estiver apoiado.',
  },
  {
    type: 'sz_g2d_world_add_enemy_type',
    placement: 'start-only-command',
    message0: 'No Mundo %1 os inimigos do tipo %2 andam no terreno',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g2d-world' },
      { type: 'field_name_picker', name: 'TYPE', text: 'inimigos', kind: 'enemytype' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Sem isto o inimigo que anda no chão pousa na borda da tela, que rola junto com a câmera. Com isto ele pisa nos mapas e nas figuras do Mundo e vai e volta dentro dos limites dele. Quem voa não muda.',
  },
  {
    type: 'sz_g2d_world_set_edges',
    placement: 'start-only-command',
    message0: 'No Mundo %1 usar bordas %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g2d-world' },
      {
        type: 'field_dropdown',
        name: 'EDGES',
        options: [
          ['abertas (pode sair)', 'none'],
          ['só o chão', 'floor'],
          ['todas sólidas', 'solid'],
        ],
      },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Escolhe se os limites do Mundo também colidem. “Abertas” permite buracos e saídas; “só o chão” cria um piso; “todas sólidas” fecha os quatro lados.',
  },
  {
    type: 'sz_g2d_world_camera',
    placement: 'start-only-command',
    message0: 'No Mundo %1 configurar câmera horizontal %2 vertical %3 folga x %4 y %5',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g2d-world' },
      {
        type: 'field_dropdown',
        name: 'HORIZONTAL',
        options: [
          ['desligada', 'off'],
          ['livre', 'free'],
          ['só avança', 'right'],
          ['só volta', 'left'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'VERTICAL',
        options: [
          ['desligada', 'off'],
          ['livre', 'free'],
          ['só desce', 'down'],
          ['só sobe', 'up'],
        ],
      },
      { type: 'input_value', name: 'DEAD_X', check: 'JSValue' },
      { type: 'input_value', name: 'DEAD_Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'A folga é a área onde o jogador pode andar sem mexer a câmera. Em Mundo do tamanho da tela, a câmera fica em 0 automaticamente. Isso independe de usar Fases.',
  },
  {
    type: 'sz_g2d_world_collide',
    placement: 'command',
    message0: 'Fazer o sprite %1 colidir com o Mundo %2',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g2d-world' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Resolve de uma vez os mapas, figuras sólidas, plataformas e bordas cadastrados no Mundo. Use depois de aplicar gravidade e mover.',
  },
  {
    type: 'sz_g2d_world_follow_camera',
    placement: 'command',
    message0: 'Fazer a câmera do Mundo %1 seguir o sprite %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g2d-world' },
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Atualiza a câmera conforme as regras do Mundo. Use a cada quadro, depois de mover e colidir.',
  },
  {
    type: 'sz_g2d_world_draw',
    placement: 'loop-command',
    message0: 'Desenhar o terreno do Mundo %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g2d-world' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha os mapas e grupos de terreno cadastrados, usando a mesma câmera das colisões. Desenhe depois os personagens e, por último, o HUD.',
  },

  // ---- Fases: opcionais e genéricas ----
  {
    type: 'sz_g2d_create_level',
    placement: 'start-only-command',
    message0: 'Criar Fase %1 usando o Mundo %2, entrada x %3 y %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'fase1' },
      { type: 'field_name_picker', name: 'WORLD', text: 'mundo', kind: 'g2d-world' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Uma Fase junta um Mundo e o ponto onde o jogador entra. É opcional e funciona em plataforma, nave, labirinto ou Mundo de uma tela. Ondas comuns não precisam trocar de Fase.',
  },
  {
    type: 'sz_g2d_enter_level',
    placement: 'command',
    message0: 'Entrar na Fase %1 com o sprite %2',
    args0: [
      { type: 'field_name_picker', name: 'LEVEL', text: 'fase1', kind: 'g2d-level' },
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Troca para essa área e posiciona o sprite na entrada, mas preserva tiles quebrados, itens e inimigos que já estavam nela. Use “Reiniciar a Fase” quando quiser tudo novo. Vida e pontuação continuam.',
  },
  {
    type: 'sz_g2d_level_reset_group',
    placement: 'start-only-command',
    message0: 'Na Fase %1 reiniciar o grupo %2 junto com ela',
    args0: [
      { type: 'field_name_picker', name: 'LEVEL', text: 'fase1', kind: 'g2d-level' },
      { type: 'field_name_picker', name: 'GROUP', text: 'inimigos', kind: 'group' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Registra um grupo de inimigos ou itens que pertence à Fase. “Entrar” preserva esse grupo; “Reiniciar” o esvazia antes de rodar “Quando entrar” novamente.',
  },
  {
    type: 'sz_g2d_restart_level',
    placement: 'command',
    message0: 'Reiniciar a Fase %1 com o sprite %2',
    args0: [
      { type: 'field_name_picker', name: 'LEVEL', text: 'fase1', kind: 'g2d-level' },
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Restaura os tiles alterados, esvazia os grupos registrados nessa Fase, reposiciona o jogador e roda “Quando entrar” uma vez para recriar o conteúdo.',
  },
  {
    type: 'sz_g2d_on_level_enter',
    placement: 'event',
    message0: 'Quando entrar na Fase %1',
    args0: [{ type: 'field_name_picker', name: 'LEVEL', text: 'fase1', kind: 'g2d-level' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: EVENT_C,
    tooltip:
      'Roda uma vez em cada “Entrar” ou “Reiniciar”. Use para regras de entrada. Para recriar inimigos e itens sem duplicar, registre os grupos com “reiniciar junto” e use “Reiniciar a Fase”.',
  },
  {
    type: 'sz_g2d_level_is_active',
    message0: 'a Fase %1 está ativa?',
    args0: [{ type: 'field_name_picker', name: 'LEVEL', text: 'fase1', kind: 'g2d-level' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro somente quando essa é a Fase atual. Use em um “se”.',
  },
  {
    type: 'sz_g2d_current_level_collide',
    placement: 'command',
    message0: 'Fazer o sprite %1 colidir com a Fase atual',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Atalho para colidir com o Mundo da Fase ativa. Use quando o jogo realmente troca de Fases.',
  },
  {
    type: 'sz_g2d_current_level_follow_camera',
    placement: 'command',
    message0: 'Fazer a câmera da Fase atual seguir o sprite %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'heroi' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Atalho para seguir com a câmera do Mundo da Fase ativa.',
  },
  {
    type: 'sz_g2d_current_level_draw',
    placement: 'loop-command',
    message0: 'Desenhar o terreno da Fase atual',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Atalho para desenhar o Mundo da Fase ativa. Depois desenhe personagens e HUD.',
  },
] satisfies BlockDefinition[]
