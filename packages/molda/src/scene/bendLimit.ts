import { number, record, requireScene } from './validation'

/** Flexion between two consecutive segments: 0° straight, 180° folded back. Assistance only. */
export interface SceneBendLimit {
  min: number
  max: number
}

export function readSceneBendLimit(input: unknown, path = 'bendLimit'): SceneBendLimit {
  const value = record(input, path, ['min', 'max']),
    min = number(value.min, `${path}.min`, 0, 180),
    max = number(value.max, `${path}.max`, 0, 180)
  requireScene(min <= max, path, 'A menor dobra não pode ultrapassar a maior dobra.')
  return { min, max }
}
