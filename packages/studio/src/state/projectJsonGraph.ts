import {
  copyStudioProjectJson,
  STUDIO_PROJECT_JSON_LIMITS,
} from '@sistemazero/core/studio/project-json'

export interface ProjectJsonGraphLimits {
  nodes: number
  textChars: number
  depth: number
}

export function validateProjectJsonGraphLimits(limits: ProjectJsonGraphLimits) {
  for (const key of ['nodes', 'textChars', 'depth'] as const)
    if (
      !Number.isSafeInteger(limits[key]) ||
      limits[key] < 1 ||
      limits[key] > STUDIO_PROJECT_JSON_LIMITS[key]
    )
      throw new Error('O orçamento do grafo de projeto é inválido.')
}

type Scalar = null | string | number | boolean
type Ref = Scalar | [] | [number]
type Container = { object: Array<[string, Ref]> } | { array: Ref[] }

// [] is undefined; [-1] is negative zero; [n] refers to container n. Learner
// arrays are containers, so these tags cannot collide with project contents.
export function encodeProjectJsonGraph(
  value: unknown,
  limits: ProjectJsonGraphLimits = STUDIO_PROJECT_JSON_LIMITS,
): string {
  validateProjectJsonGraphLimits(limits)
  const source = copyStudioProjectJson(value, limits)
  const nodes: Container[] = []
  const pending: Array<{ source: object; target: Container }> = []
  const ref = (item: unknown): Ref => {
    if (item === undefined) return []
    if (Object.is(item, -0)) return [-1]
    if (
      item === null ||
      typeof item === 'string' ||
      typeof item === 'boolean' ||
      typeof item === 'number'
    )
      return item
    if (typeof item !== 'object') throw new Error('Valor de recuperação inválido.')
    const index = nodes.length
    const target: Container = Array.isArray(item) ? { array: [] } : { object: [] }
    nodes.push(target)
    pending.push({ source: item, target })
    return [index]
  }
  const root = ref(source)
  while (pending.length) {
    const item = pending.pop()
    if (!item) break
    if ('array' in item.target && Array.isArray(item.source)) {
      for (const value of item.source) item.target.array.push(ref(value))
    } else if ('object' in item.target) {
      for (const [key, value] of Object.entries(item.source))
        item.target.object.push([key, ref(value)])
    }
  }
  const encoded = JSON.stringify({ version: 1, root, nodes })
  if (encoded.length > limits.textChars)
    throw new Error('A cópia de recuperação excede seu orçamento local.')
  return encoded
}
