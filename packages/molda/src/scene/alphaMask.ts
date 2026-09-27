import { number, record } from './validation'

/** Test the composed alpha times opacity; keep both independent from pixel bytes. */
export interface SceneAlphaMask {
  cutoff: number
  opacity: number
}

export function readSceneAlphaMask(raw: unknown, path: string): SceneAlphaMask {
  const row = record(raw, path, ['cutoff', 'opacity'])
  return {
    cutoff: number(row.cutoff, `${path}.cutoff`, 0),
    opacity: number(row.opacity, `${path}.opacity`, 0, 1),
  }
}
