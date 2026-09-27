import type { BlockDefinition } from '../../blockly/blocks/types'
import { GAME_TWO_D_BLOCK_COLOR as colour } from './blockCatalogShared'

export const gameTwoDActionBlocks: BlockDefinition[] = [
  {
    type: 'sz_g2d_circle_touches',
    message0: 'os sprites %1 e %2 estão encostando em círculo?',
    args0: [
      { type: 'field_sprite_picker', name: 'A', text: 'bola' },
      { type: 'field_sprite_picker', name: 'B', text: 'alvo' },
    ],
    output: 'JSValue',
    colour,
    tooltip:
      'Pergunta sobre o contato entre círculos inscritos nas áreas de colisão dos sprites. Use em um “se”. Só consulta: não move nem remove os sprites.',
  },
  {
    type: 'sz_g2d_with_cooldown',
    placement: 'command',
    bodyExecution: 'sync-callback',
    message0: 'Com o sprite %1 fazer no máximo uma vez a cada %2 quadros',
    args0: [
      { type: 'field_sprite_picker', name: 'SPRITE', text: 'jogador' },
      { type: 'input_value', name: 'FRAMES', check: 'JSValue' },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour,
    tooltip:
      'Tenta executar agora e, se conseguir, inicia a recarga. Cada bloco tem sua própria recarga por sprite. A primeira tentativa executa; 60 quadros equivalem a 1 segundo de jogo. A pausa congela a contagem. Não agenda uma execução futura.',
  },
  {
    type: 'sz_g2d_destroy_sprite',
    placement: 'command',
    message0: 'Destruir o sprite %1',
    args0: [{ type: 'field_sprite_picker', name: 'SPRITE', text: 'resposta' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour,
    tooltip:
      'Retira o sprite de todos os grupos do motor e encerra seu desenho, contato e clique. A variável continua existindo, mas esse sprite não volta a funcionar. Crie outro sprite para substituí-lo.',
  },
]
