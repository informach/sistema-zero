import { requireGltf } from './gltfInput'

export interface GltfTopology {
  kind: 'points' | 'lines' | 'triangles'
  indices: Uint32Array
}

export function gltfTopologyLength(mode: number, count: number, path: string): number {
  requireGltf(
    count > 0 &&
      (mode !== 1 || count % 2 === 0) &&
      (mode !== 4 || count % 3 === 0) &&
      ((mode !== 2 && mode !== 3) || count >= 2) &&
      ((mode !== 5 && mode !== 6) || count >= 3),
    path,
    'A quantidade de índices não forma primitivas completas neste modo de desenho.',
  )
  if (mode === 2) return count * 2
  if (mode === 3) return (count - 1) * 2
  if (mode === 5 || mode === 6) return (count - 2) * 3
  return count
}

/** Degenerate primitives remain explicit; converting/omitting them is a separate decision. */
export function expandGltfTopology(
  mode: number,
  count: number,
  source: Float64Array | null,
  length: number,
): GltfTopology {
  const indices = new Uint32Array(length)
  const at = (i: number) => (source ? source[i]! : i)
  if (mode === 0 || mode === 1 || mode === 4) for (let i = 0; i < count; i++) indices[i] = at(i)
  else if (mode === 2 || mode === 3) {
    for (let i = 0; i < length / 2; i++) {
      indices[i * 2] = at(i)
      indices[i * 2 + 1] = at((i + 1) % count)
    }
  } else {
    for (let i = 0; i < count - 2; i++) {
      if (mode === 5) {
        indices[i * 3] = at(i)
        indices[i * 3 + 1] = at(i + 1 + (i % 2))
        indices[i * 3 + 2] = at(i + 2 - (i % 2))
      } else {
        indices[i * 3] = at(i + 1)
        indices[i * 3 + 1] = at(i + 2)
        indices[i * 3 + 2] = at(0)
      }
    }
  }
  return { kind: mode === 0 ? 'points' : mode < 4 ? 'lines' : 'triangles', indices }
}
