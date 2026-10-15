import { z } from 'zod'

export const referenceSchema = z.object({ $ref: z.string().min(1).max(500) }).strict()
const unsafe = new Set(['__proto__', 'prototype', 'constructor'])
export function referencePath(input: string) {
  const parts = input.split('.')
  if (parts.length > 20 || parts.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part) || unsafe.has(part)))
    throw new Error('Invalid workflow reference path')
  if (!['inputs', 'nodes', 'artifacts', 'item', 'index'].includes(parts[0] ?? ''))
    throw new Error('Unknown reference root')
  return parts
}
export function references(value: unknown, depth = 0): string[] {
  if (depth > 20) throw new Error('Workflow template nesting exceeds 20 levels')
  if (!value || typeof value !== 'object') return []
  if (!Array.isArray(value) && Object.hasOwn(value, '$ref')) {
    const ref = referenceSchema.parse(value).$ref
    referencePath(ref)
    return [ref]
  }
  return Object.values(value).flatMap((child) => references(child, depth + 1))
}
export function resolveTemplate(
  value: unknown,
  scope: Record<string, unknown>,
  depth = 0,
): unknown {
  if (depth > 20) throw new Error('Workflow template nesting exceeds 20 levels')
  if (!value || typeof value !== 'object') return value
  if (!Array.isArray(value) && Object.hasOwn(value, '$ref')) {
    let result: unknown = scope
    for (const part of referencePath(referenceSchema.parse(value).$ref)) {
      if (!result || typeof result !== 'object' || !Object.hasOwn(result, part))
        throw new Error(`Missing workflow reference: ${referenceSchema.parse(value).$ref}`)
      result = Reflect.get(result, part)
    }
    return structuredClone(result)
  }
  if (Array.isArray(value)) return value.map((item) => resolveTemplate(item, scope, depth + 1))
  const entries = Object.entries(value)
  if (entries.some(([key]) => unsafe.has(key))) throw new Error('Unsafe workflow template key')
  return Object.fromEntries(
    entries.map(([key, child]) => [key, resolveTemplate(child, scope, depth + 1)]),
  )
}
