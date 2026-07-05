import { CATEGORY_COLORS } from '../theme'
import type { BlockDefinition } from './types'

/**
 * Os 3 blocos-CONTAINER ("frames") estilo MakeCode (`on start`): SÓ o que está
 * DENTRO de um frame é gerado/executado; bloco solto no canvas é RASCUNHO
 * (ignorado pela geração, mas continua salvo — não some). São CHAPÉUS (sem
 * `previousStatement`/`nextStatement`) → ficam soltos no topo, **um de cada por
 * projeto**. A inclusão passa a ser por CONTÊINER, não por posição/ordem.
 *
 * O `check` de CHILDREN reusa o tipo de conexão que os blocos JÁ expõem
 * (HTML → `'HTMLNode'`, CSS de topo → `'CSSEntry'`, statements JS → `'JSStmt'`),
 * então TODO bloco existente encaixa sem mudar nenhuma definição.
 */
export const FRAME_BLOCKS: BlockDefinition[] = [
  {
    type: 'sz_frame_structure',
    message0: '🧱 Estrutura: HTML',
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    colour: CATEGORY_COLORS.html,
    tooltip:
      'A página em si (HTML). Tudo que estiver DENTRO daqui vira o index.html. O que ficar de fora é só rascunho.',
  },
  {
    type: 'sz_frame_appearance',
    message0: '🎨 Aparência: CSS',
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'CSSEntry' }],
    colour: CATEGORY_COLORS.css,
    tooltip:
      'O visual (CSS). Tudo DENTRO daqui vira o style.css. O que ficar de fora é só rascunho.',
  },
  {
    type: 'sz_frame_behavior',
    message0: '⚙️ Comportamento: JS',
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'JSStmt' }],
    colour: CATEGORY_COLORS.js,
    tooltip:
      'O passo a passo (código). Tudo DENTRO daqui, NA ORDEM, vira o script.js. O que ficar de fora é só rascunho.',
  },
]
