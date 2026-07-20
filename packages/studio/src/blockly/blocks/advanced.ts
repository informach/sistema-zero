import { CATEGORY_COLORS } from '../theme'
import type { BlockDefinition } from './types'

const C = CATEGORY_COLORS.advanced

export const ADVANCED_BLOCKS: BlockDefinition[] = [
  {
    type: 'sz_adv_raw_html',
    message0: 'Código avançado HTML\n%1',
    args0: [{ type: 'field_input', name: 'CODE', text: '<!-- código avançado -->' }],
    previousStatement: 'HTMLNode',
    nextStatement: 'HTMLNode',
    colour: C,
    tooltip: 'HTML que não pôde ser representado em blocos. Edite no modo Código.',
  },
  {
    type: 'sz_adv_raw_css',
    message0: 'Código avançado CSS\n%1',
    args0: [{ type: 'field_input', name: 'CODE', text: '/* css avançado */' }],
    previousStatement: 'CSSEntry',
    nextStatement: 'CSSEntry',
    colour: C,
    tooltip: 'CSS que não pôde ser representado em blocos. Edite no modo Código.',
  },
  {
    type: 'sz_adv_raw_js',
    placement: 'command',
    message0: 'Código avançado JavaScript\n%1',
    args0: [{ type: 'field_input', name: 'CODE', text: '// código avançado' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'JS que não pôde ser representado em blocos. Edite no modo Código.',
  },
]
