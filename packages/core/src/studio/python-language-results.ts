import type { PythonLanguageCommand } from './python-language'

export interface PythonLanguageSpan {
  start: number
  length: number
}
export interface PythonLanguageLocation {
  path: string
  span: PythonLanguageSpan
}
export interface PythonLanguageEdit extends PythonLanguageSpan {
  path: string
  text: string
}
export interface PythonLanguageResults {
  projectDiagnostics: PythonLanguageResults['diagnostics']
  symbols: (PythonLanguageSpan & {
    name: string
    kind: string
    depth: number
    bodySpan?: PythonLanguageSpan
  })[]
  references: PythonLanguageLocation[]
  definitions: PythonLanguageLocation[]
  renameSymbol: PythonLanguageEdit[]
  diagnostics: (PythonLanguageSpan & {
    path: string
    code: string | number
    source: 'Pyright'
    message: string
    severity: 'error' | 'warning' | 'info'
  })[]
  completions: {
    name: string
    kind: string
    sortText: string
    insertText: string
    replacementSpan?: PythonLanguageSpan
    additionalEdits: PythonLanguageEdit[]
  }[]
  hover: { text: string; span?: PythonLanguageSpan } | null
  signatureHelp: {
    signatures: {
      label: string
      documentation: string
      parameters: { label: string | [number, number]; documentation: string }[]
      activeParameter?: number
    }[]
    activeSignature: number
    activeParameter: number
  } | null
}

export type PythonLanguageErrorCode =
  | 'invalid-request'
  | 'quota-exceeded'
  | 'stale-document'
  | 'unavailable'
  | 'cancelled'
  | 'expired'

/** Replies never expose JSON-RPC IDs, absolute server paths or executable LSP commands. */
export type PythonLanguageReply = { version: 1; id: string } & (
  | { kind: 'synced'; revision: number }
  | {
      [K in keyof PythonLanguageResults]: {
        kind: 'result'
        method: K
        revision: number
        path: string
        documentVersion: number
        result: PythonLanguageResults[K]
      }
    }[keyof PythonLanguageResults]
  | { kind: 'ack' }
  | { kind: 'error'; code: PythonLanguageErrorCode; message: string }
)

export interface PythonLanguageConnection {
  send(command: PythonLanguageCommand, signal: AbortSignal): Promise<PythonLanguageReply>
  close(): void
}

/** The host authenticates access; document content cannot choose the gateway or analysis image. */
export interface PythonLanguageProvider {
  open(input: { projectId: string }, signal: AbortSignal): Promise<PythonLanguageConnection>
}
