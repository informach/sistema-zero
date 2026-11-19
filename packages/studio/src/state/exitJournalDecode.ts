import { DOCUMENT_LIMITS } from './exitJournalCodec'
import { decodeProjectJsonGraph } from './projectJsonGraphDecode'

export const decodeExitJournal = (text: string): unknown =>
  decodeProjectJsonGraph(text, DOCUMENT_LIMITS)
