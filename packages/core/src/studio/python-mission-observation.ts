import { z } from 'zod'
import {
  EXECUTION_LIMITS,
  type ExecutionJson,
  isExecutionJson,
  isExecutionModulePath,
  isExecutionValuePath,
} from '../learning/project-execution'
import {
  PythonExecutionMotionSampleSchema,
  PythonExecutionObservedValueSchema,
  PythonFunctionExecutionObservationSchema,
} from '../learning/python-project-execution'
import { copyStudioProjectJson } from './project-json'

export const PYTHON_MISSION_OBSERVATION_LIMITS = Object.freeze({
  jsonChars: 64_000,
  timeoutMs: 10_000,
})
const path = z
  .string()
  .max(200)
  .refine((value) => isExecutionValuePath(value, 'python'))
export const StudioPythonMissionProbeSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('value'), path }),
  z.strictObject({ type: z.literal('sprite'), path }),
  z.strictObject({
    id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
    type: z.literal('functionReturns'),
    name: path.refine((value) => !value.includes('.') && value.length <= 100),
    module: z
      .string()
      .refine((value) => isExecutionModulePath(value, 'python'))
      .optional(),
    args: z
      .array(z.array(z.custom<ExecutionJson>(isExecutionJson)).max(EXECUTION_LIMITS.maxArgs))
      .min(1)
      .max(EXECUTION_LIMITS.maxCases),
  }),
])
export type StudioPythonMissionProbe = z.infer<typeof StudioPythonMissionProbeSchema>
const sprite = z
  .strictObject({
    found: z.boolean(),
    objectId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    error: z.string().min(1).max(2000).optional(),
  })
  .refine((value) =>
    value.found
      ? value.objectId !== undefined && value.error === undefined
      : value.objectId === undefined,
  )
export const StudioPythonMissionObservationSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('value'), observed: PythonExecutionObservedValueSchema }),
  z.strictObject({ type: z.literal('sprite'), observed: sprite }),
  PythonFunctionExecutionObservationSchema,
])
export type StudioPythonMissionObservation = z.infer<typeof StudioPythonMissionObservationSchema>
export const StudioPythonMissionFrameObservationSchema = z.strictObject({
  observation: StudioPythonMissionObservationSchema,
  pose: PythonExecutionMotionSampleSchema.nullable().optional(),
})
export type StudioPythonMissionFrameObservation = z.infer<
  typeof StudioPythonMissionFrameObservationSchema
>
export function readStudioPythonMissionFrameObservation(raw: unknown) {
  return StudioPythonMissionFrameObservationSchema.parse(copyStudioProjectJson(raw, limits))
}
const limits = { nodes: 10_000, textChars: 64_000, depth: 32 }

export function readStudioPythonMissionProbe(raw: unknown) {
  return StudioPythonMissionProbeSchema.parse(copyStudioProjectJson(raw, limits))
}

export function readStudioPythonMissionObservation(raw: unknown) {
  return StudioPythonMissionObservationSchema.parse(copyStudioProjectJson(raw, limits))
}

export function verifyStudioPythonMissionObservation(
  raw: unknown,
  probe: StudioPythonMissionProbe,
) {
  const result = readStudioPythonMissionObservation(raw)
  if (result.type !== probe.type) throw new Error('A observação não corresponde à sonda Python.')
  if (
    result.type === 'functionReturns' &&
    probe.type === 'functionReturns' &&
    (result.id !== probe.id || (!result.missing && result.cases?.length !== probe.args.length))
  )
    throw new Error('A observação omitiu ou trocou os casos da função Python.')
  return result
}
