import { z } from 'zod'

export const StudioPythonLearningLevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)])
export type PythonLearningLevel = z.infer<typeof StudioPythonLearningLevelSchema>
export const PYTHON_LEARNING_LEVELS = Object.freeze([
  { value: 1, label: 'Primeiros passos' },
  { value: 2, label: 'Construindo programas' },
  { value: 3, label: 'Explorando Python' },
] as const)

/** Independent of the JavaScript 2D/3D ladder. Older hosts start at the first level. */
export function resolvePythonLearningLevel(value: unknown): PythonLearningLevel {
  return value === 2 || value === 3 ? value : 1
}
