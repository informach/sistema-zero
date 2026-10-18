import type { StudioPythonStructureFacts } from '@sistemazero/core/studio/python-structure'
import limits from './limits.json'

export const PYTHON_ANALYSIS_LIMITS = Object.freeze(limits)
export interface PythonSourceRange {
  /** Absolute UTF-16 offsets, end exclusive. Never UTF-8 offsets from CPython. */
  start: number
  end: number
}
export type PythonLiteral =
  | { literal: 'int' | 'float' | 'bytes' | 'ellipsis'; value: string }
  | { literal: 'complex'; value: [string, string] }
export type PythonValue = PythonNode | PythonLiteral | string | boolean | null | PythonValue[]
/** Python-specific IR mirrors the pinned grammar; unsupported visual syntax remains present. */
export interface PythonNode {
  kind: string
  /** Analysis-local ID; callers scope it to the document identity. New block nodes omit it. */
  id?: string
  range?: PythonSourceRange
  fields: Record<string, PythonValue>
}
export interface PythonToken {
  kind: string
  text: string
  range: PythonSourceRange
}
export interface PythonSyntaxDiagnostic {
  kind: 'syntax'
  message: string
  range: PythonSourceRange
}
export interface PythonAnalysisIdentity {
  projectId: string
  instanceId: string
  path: string
  revision: string
  generation: number
}
export interface PythonParsedDocument {
  version: 1
  language: 'python'
  identity: PythonAnalysisIdentity
  source: string
  tree: PythonNode | null
  tokens: PythonToken[]
  diagnostics: PythonSyntaxDiagnostic[]
}
export type PythonAnalysisRequest =
  | { operation: 'parse'; path: string; source: string; compilable?: boolean }
  | { operation: 'compile' | 'structure'; path: string; bytesBase64: string }
  | { operation: 'render'; node: PythonNode }
export interface PythonByteCompilation {
  identity: PythonAnalysisIdentity
  diagnostics: { kind: 'syntax'; message: string }[]
  structure?: StudioPythonStructureFacts
}
export type PythonAnalysisResult =
  | { ok: false; message: string }
  | { ok: true; source: string }
  | {
      ok: true
      compiledBytes: true
      diagnostics: { kind: 'syntax'; message: string }[]
      structure?: StudioPythonStructureFacts
    }
  | {
      ok: true
      tree: PythonNode | null
      tokens: PythonToken[]
      diagnostics: PythonSyntaxDiagnostic[]
      compilable?: true
    }

export function samePythonAnalysisIdentity(a: PythonAnalysisIdentity, b: PythonAnalysisIdentity) {
  return (
    a.projectId === b.projectId &&
    a.instanceId === b.instanceId &&
    a.path === b.path &&
    a.revision === b.revision &&
    a.generation === b.generation
  )
}
