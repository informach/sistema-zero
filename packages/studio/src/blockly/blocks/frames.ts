import {
  BEHAVIOR_AREA_LABELS,
  FRAME_APPEARANCE,
  FRAME_EVENTS,
  FRAME_LOOPS,
  FRAME_MOLDS,
  FRAME_START,
  FRAME_STRUCTURE,
} from '../blockContracts'
import { PROJECT_AREA_SAFE_DELETE_EXTENSION } from '../blockExtensionNames'
import { CATEGORY_COLORS } from '../categoryColors'
import type { BlockDefinition } from './types'

/**
 * As seis Áreas do projeto. Só o conteúdo interno gera; bloco solto é rascunho.
 * São chapéus top-level, no máximo um de cada. Os checks especializados impedem
 * que molde, início, evento e loop sejam misturados.
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
    // Roda ANTES do "Ao iniciar", mas dentro do mesmo envelope de partida: o
    // corpo de um molde só executa quando alguém usa a receita, então ele
    // enxerga tudo que o "Ao iniciar" cria depois.
    type: FRAME_MOLDS,
    message0: BEHAVIOR_AREA_LABELS.molds,
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'JSMoldRoot' }],
    colour: '#6366f1',
    extensions: [PROJECT_AREA_SAFE_DELETE_EXTENSION],
    tooltip:
      'Aqui você cria os moldes: as figuras, os tipos de inimigo, as classes. Nada acontece ainda. É no Ao iniciar que você usa cada um deles.',
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
]
