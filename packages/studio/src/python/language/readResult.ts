import { StudioPythonStructureFactsSchema } from '@sistemazero/core/studio/python-structure'
import { assertPythonRange, readPythonNode } from './readNode'
import { PYTHON_ANALYSIS_LIMITS as limits, type PythonAnalysisResult } from './types'

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/** Bound the detached syntax tree before any codec consumes it. */
export function readPythonAnalysisResult(
  payload: string,
  sourceLength: number,
): PythonAnalysisResult {
  if (payload.length > limits.responseBytes) throw new Error('Resposta Python excessiva.')
  const raw: unknown = JSON.parse(payload)
  if (!record(raw) || typeof raw.ok !== 'boolean') throw new Error('Resposta Python inválida.')
  if (!raw.ok) {
    if (typeof raw.message !== 'string' || raw.message.length > 2000)
      throw new Error('Diagnóstico Python inválido.')
    return { ok: false, message: raw.message }
  }
  if ('source' in raw) {
    if (
      typeof raw.source !== 'string' ||
      new TextEncoder().encode(raw.source).byteLength > limits.sourceBytes
    )
      throw new Error('Fonte Python excessiva.')
    return { ok: true, source: raw.source }
  }
  if ('compiledBytes' in raw) {
    if (raw.compiledBytes !== true || !Array.isArray(raw.diagnostics) || raw.diagnostics.length > 1)
      throw new Error('Confirmação de compilação dos bytes Python inválida.')
    const diagnostics: { kind: 'syntax'; message: string }[] = []
    for (const diagnostic of raw.diagnostics) {
      if (
        !record(diagnostic) ||
        diagnostic.kind !== 'syntax' ||
        typeof diagnostic.message !== 'string' ||
        !diagnostic.message.length ||
        diagnostic.message.length > 2000
      )
        throw new Error('Diagnóstico de compilação dos bytes Python inválido.')
      diagnostics.push({ kind: 'syntax', message: diagnostic.message })
    }
    const structure =
      'structure' in raw ? StudioPythonStructureFactsSchema.parse(raw.structure) : undefined
    if (structure && diagnostics.length)
      throw new Error('Uma fonte inválida não pode oferecer evidência estrutural.')
    return { ok: true, compiledBytes: true, diagnostics, ...(structure ? { structure } : {}) }
  }
  const range = (value: unknown) => assertPythonRange(value, sourceLength)
  if ('compilable' in raw && (raw.compilable !== true || raw.tree === null))
    throw new Error('Confirmação de compilação Python inválida.')
  if (raw.tree !== null && readPythonNode(raw.tree, sourceLength).kind !== 'Module')
    throw new Error('Módulo Python inválido.')
  if (
    !Array.isArray(raw.tokens) ||
    raw.tokens.length > limits.tokens ||
    !Array.isArray(raw.diagnostics) ||
    raw.diagnostics.length > 1
  )
    throw new Error('Análise Python excessiva.')
  for (const token of raw.tokens) {
    if (
      !record(token) ||
      typeof token.kind !== 'string' ||
      !/^[A-Z_]{1,48}$/.test(token.kind) ||
      typeof token.text !== 'string'
    )
      throw new Error('Token Python inválido.')
    range(token.range)
  }
  for (const diagnostic of raw.diagnostics) {
    if (
      !record(diagnostic) ||
      diagnostic.kind !== 'syntax' ||
      typeof diagnostic.message !== 'string' ||
      diagnostic.message.length > 2000
    )
      throw new Error('Diagnóstico Python inválido.')
    range(diagnostic.range)
  }
  if ((raw.tree === null) !== raw.diagnostics.length > 0)
    throw new Error('Análise Python incompleta.')
  return raw as unknown as PythonAnalysisResult
}
