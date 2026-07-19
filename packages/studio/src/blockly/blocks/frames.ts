import {
  FRAME_APPEARANCE,
  FRAME_BEHAVIOR_LEGACY,
  FRAME_EVENTS,
  FRAME_LOOPS,
  FRAME_START,
  FRAME_STRUCTURE,
} from '../blockContracts'
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
    type: FRAME_STRUCTURE,
    message0: '🧱 Estrutura: HTML',
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'HTMLNode' }],
    colour: CATEGORY_COLORS.html,
    tooltip:
      'A página em si (HTML). Tudo que estiver DENTRO daqui vira o index.html. O que ficar de fora é só rascunho.',
  },
  {
    type: FRAME_APPEARANCE,
    message0: '🎨 Aparência: CSS',
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'CSSEntry' }],
    colour: CATEGORY_COLORS.css,
    tooltip:
      'O visual (CSS). Tudo DENTRO daqui vira o style.css. O que ficar de fora é só rascunho.',
  },
  {
    type: FRAME_START,
    message0: '⚙️ Ao iniciar',
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'JSStartRoot' }],
    colour: CATEGORY_COLORS.js,
    tooltip: 'Roda ao abrir ou a cada nova partida.',
  },
  {
    type: FRAME_EVENTS,
    message0: '⚡ Quando acontecer — Eventos',
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'JSEventRoot' }],
    colour: '#eab308',
    tooltip: 'Roda quando alguma coisa acontece.',
  },
  {
    type: FRAME_LOOPS,
    message0: '🔁 Enquanto estiver rodando — Loops',
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'JSLoopRoot' }],
    colour: '#14b8a6',
    tooltip: 'Repete enquanto o projeto estiver rodando.',
  },
  {
    type: FRAME_BEHAVIOR_LEGACY,
    message0: '⚙️ Comportamento antigo',
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'CHILDREN', check: 'JSStmt' }],
    colour: CATEGORY_COLORS.js,
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
