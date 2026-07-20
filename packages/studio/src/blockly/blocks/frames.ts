import {
  BEHAVIOR_AREA_LABELS,
  FRAME_APPEARANCE,
  FRAME_BEHAVIOR_LEGACY,
  FRAME_EVENTS,
  FRAME_LOOPS,
  FRAME_START,
  FRAME_STRUCTURE,
} from '../blockContracts'
import { PROJECT_AREA_SAFE_DELETE_EXTENSION } from '../projectAreaSafeDelete'
import { CATEGORY_COLORS } from '../theme'
import type { BlockDefinition } from './types'

/**
 * As cinco Áreas do projeto. Só o conteúdo interno gera; bloco solto é rascunho.
 * São chapéus top-level, no máximo um de cada. Os checks especializados impedem
 * que início, evento e loop sejam misturados.
 */
export const FRAME_BLOCKS: BlockDefinition[] = [
  {
    type: FRAME_STRUCTURE,
    message0: '🧱 Estrutura: HTML',
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    colour: CATEGORY_COLORS.html,
    extensions: [PROJECT_AREA_SAFE_DELETE_EXTENSION],
    tooltip:
      'A página em si (HTML). Tudo que estiver DENTRO daqui vira o index.html. O que ficar de fora é só rascunho.',
  },
  {
    type: FRAME_APPEARANCE,
    message0: '🎨 Aparência: CSS',
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'CSSEntry' }],
    colour: CATEGORY_COLORS.css,
    extensions: [PROJECT_AREA_SAFE_DELETE_EXTENSION],
    tooltip:
      'O visual (CSS). Tudo DENTRO daqui vira o style.css. O que ficar de fora é só rascunho.',
  },
  {
    type: FRAME_START,
    message0: BEHAVIOR_AREA_LABELS.start,
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'JSStartRoot' }],
    colour: CATEGORY_COLORS.js,
    extensions: [PROJECT_AREA_SAFE_DELETE_EXTENSION],
    tooltip: 'Roda ao abrir ou a cada nova partida.',
  },
  {
    type: FRAME_EVENTS,
    message0: BEHAVIOR_AREA_LABELS.events,
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'JSEventRoot' }],
    colour: '#eab308',
    extensions: [PROJECT_AREA_SAFE_DELETE_EXTENSION],
    tooltip: 'Roda quando alguma coisa acontece.',
  },
  {
    type: FRAME_LOOPS,
    message0: BEHAVIOR_AREA_LABELS.loops,
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'JSLoopRoot' }],
    colour: '#14b8a6',
    extensions: [PROJECT_AREA_SAFE_DELETE_EXTENSION],
    tooltip: 'Repete enquanto o projeto estiver rodando.',
  },
  {
    type: FRAME_BEHAVIOR_LEGACY,
    message0: '⚙️ Comportamento antigo',
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'JSStmt' }],
    colour: CATEGORY_COLORS.js,
    extensions: [PROJECT_AREA_SAFE_DELETE_EXTENSION],
    tooltip: 'Área antiga preservada somente para migração automática.',
    hidden: true,
  },
  {
    type: 'sz_legacy_nested_start',
    message0: 'Compatibilidade: início antigo %1',
    args0: [{ type: 'input_statement', name: 'CHILD', check: 'JSStartRoot' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: CATEGORY_COLORS.js,
    tooltip: 'Preserva uma estrutura antiga que não pode ser movida sem mudar o programa.',
    hidden: true,
  },
  {
    type: 'sz_legacy_nested_event',
    message0: 'Compatibilidade: evento antigo %1',
    args0: [{ type: 'input_statement', name: 'CHILD', check: 'JSEventRoot' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: '#eab308',
    tooltip: 'Preserva um evento aninhado de um projeto antigo.',
    hidden: true,
  },
  {
    type: 'sz_legacy_nested_loop',
    message0: 'Compatibilidade: repetição antiga %1',
    args0: [{ type: 'input_statement', name: 'CHILD', check: 'JSLoopRoot' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: '#14b8a6',
    tooltip: 'Preserva uma repetição aninhada de um projeto antigo.',
    hidden: true,
  },
]
