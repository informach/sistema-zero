import { PYTHON_ANALYSIS_LIMITS as limits, type PythonNode } from './types'

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
export function assertPythonRange(value: unknown, sourceLength: number) {
  if (
    !record(value) ||
    Object.keys(value).some((key) => key !== 'start' && key !== 'end') ||
    typeof value.start !== 'number' ||
    typeof value.end !== 'number' ||
    !Number.isSafeInteger(value.start) ||
    !Number.isSafeInteger(value.end) ||
    value.start < 0 ||
    value.end < value.start ||
    value.end > sourceLength
  )
    throw new Error('Intervalo Python inválido.')
}

/** Bounds parsed or cached AST before recursive codecs/clone/stringify. Cycles fail by depth. */
export function readPythonNode(raw: unknown, sourceLength: number, requireIds = true): PythonNode {
  let count = 0,
    values = 0,
    textUnits = 0
  const ids = new Set<string>()
  const text = (value: string) => {
    textUnits += value.length
    if (textUnits > limits.responseBytes) throw new Error('Estrutura Python excessiva.')
  }
  const visit = (value: unknown, depth: number): void => {
    if (++values > limits.nodes * 16 || depth > limits.depth + 2)
      throw new Error('Estrutura Python excessiva.')
    if (typeof value === 'string') {
      text(value)
      return
    }
    if (value === null || typeof value === 'boolean') return
    if (Array.isArray(value)) {
      if (value.length > limits.nodes) throw new Error('Estrutura Python excessiva.')
      for (const child of value) visit(child, depth + 1)
      return
    }
    if (!record(value)) throw new Error('Valor Python inválido.')
    if ('literal' in value) {
      if (Object.keys(value).some((key) => !['literal', 'value'].includes(key)))
        throw new Error('Literal Python inválido.')
      if (
        ['int', 'float', 'bytes', 'ellipsis'].includes(String(value.literal)) &&
        typeof value.value === 'string'
      ) {
        text(value.value)
        return
      }
      if (
        value.literal === 'complex' &&
        Array.isArray(value.value) &&
        value.value.length === 2 &&
        value.value.every((part) => typeof part === 'string')
      ) {
        for (const part of value.value) text(part)
        return
      }
      throw new Error('Literal Python inválido.')
    }
    if (
      ++count > limits.nodes ||
      Object.keys(value).some((key) => !['kind', 'id', 'range', 'fields'].includes(key)) ||
      typeof value.kind !== 'string' ||
      !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(value.kind) ||
      !record(value.fields)
    )
      throw new Error('Nó Python inválido.')
    if (value.id !== undefined || requireIds) {
      if (typeof value.id !== 'string' || !/^[1-9][0-9]{0,5}$/.test(value.id) || ids.has(value.id))
        throw new Error('Nó Python inválido.')
      ids.add(value.id)
    }
    if (value.range !== undefined) assertPythonRange(value.range, sourceLength)
    if (Object.keys(value.fields).length > 32) throw new Error('Campo Python inválido.')
    for (const [key, child] of Object.entries(value.fields)) {
      if (!/^[a-z][a-z0-9_]{0,63}$/.test(key) || key === 'constructor' || key === 'prototype')
        throw new Error('Campo Python inválido.')
      visit(child, depth + 1)
    }
  }
  visit(raw, 0)
  if (!record(raw) || !('kind' in raw)) throw new Error('Nó Python inválido.')
  return raw as unknown as PythonNode
}
