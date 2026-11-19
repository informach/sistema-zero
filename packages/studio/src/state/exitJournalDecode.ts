import { decodeProjectJsonGraph } from '@sistemazero/core/studio/project-json-graph-decode'
import { DOCUMENT_LIMITS } from './exitJournalCodec'

export const decodeExitJournal = (text: string): unknown =>
  decodeProjectJsonGraph(text, DOCUMENT_LIMITS)
export const decodeRecoverySnapshot = decodeProjectJsonGraph
