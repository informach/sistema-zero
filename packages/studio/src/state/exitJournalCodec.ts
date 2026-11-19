import { decodeProjectJsonGraph, encodeProjectJsonGraph } from './projectJsonGraph'

/** Recovery-copy budget, not the editor/project budget. Failure must remain explicit. */
export const EXIT_JOURNAL_MAX_CHARS = 2_000_000
const DOCUMENT_LIMITS = { nodes: 500_000, textChars: EXIT_JOURNAL_MAX_CHARS, depth: 40_064 }

export const encodeExitJournal = (value: unknown): string =>
  encodeProjectJsonGraph(value, DOCUMENT_LIMITS)
export const decodeExitJournal = (text: string): unknown =>
  decodeProjectJsonGraph(text, DOCUMENT_LIMITS)
