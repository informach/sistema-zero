import { z } from 'zod'
import { canonicalJson } from '../creations/content-fingerprint'
import {
  EXECUTION_LIMITS,
  type ExecutionStep,
  isExecutionStep,
  isExecutionValuePath,
} from '../learning/project-execution'
import {
  PythonProjectExecutionIdentitySchema,
  type PythonProjectExecutionPlan,
  PythonProjectExecutionReportSchema,
  pythonProjectExecutionProbes,
} from '../learning/python-project-execution'
import { StudioProjectIdSchema } from './project-document'
import { copyStudioProjectJson } from './project-json'
import { verifyStudioPythonExecutionMetadata } from './python-execution-content'
import {
  StudioPythonInspectionReportSchema,
  verifyStudioPythonInspectionReport,
  verifyStudioPythonStructureEvidence,
} from './python-inspection'
import { StudioPythonMissionProbeSchema } from './python-mission-observation'
import {
  StudioPythonPlaytestRecipeSchema,
  StudioPythonPlaytestReportSchema,
  verifyStudioPythonPlaytestReport,
} from './python-playtest'

export const PYTHON_MISSION_LIMITS = Object.freeze({
  requestBytes: 128_000,
  responseBytes: 3 * 1024 * 1024,
  jobMs: 140_000,
  runnerMs: 125_000,
  callerMs: 150_000,
})
const input = z
  .array(
    z
      .string()
      .max(4096)
      .regex(/^[^\r\n]*$/),
  )
  .max(4)
  .optional()
const identifierPath = z
  .string()
  .max(200)
  .refine((value) => isExecutionValuePath(value, 'python'))
const target = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('value'), path: identifierPath }),
  z.strictObject({ kind: z.literal('console') }),
  z.strictObject({
    kind: z.literal('spritePosition'),
    path: identifierPath,
    axis: z.enum(['x', 'y']),
  }),
])
type MissionStep = Exclude<ExecutionStep, { action: 'clickTarget' }>
const behavior = z.strictObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
  type: z.literal('behavior'),
  stdin: input,
  steps: z
    .array(
      z.custom<MissionStep>(
        (step) =>
          isExecutionStep(step) &&
          step.action !== 'clickTarget' &&
          step.action !== 'approachSprite' &&
          step.action !== 'approachObject3d',
      ),
    )
    .max(EXECUTION_LIMITS.maxSteps),
  target,
  observation: z
    .strictObject({
      type: z.literal('idleBeforeAction'),
      idleMs: z.number().int().positive().max(EXECUTION_LIMITS.maxIdleBaselineMs),
    })
    .optional(),
})
export const PythonProjectExecutionProbeSchema = z.discriminatedUnion('type', [
  behavior,
  StudioPythonMissionProbeSchema.options[2].extend({ stdin: input }),
])
export type PythonProjectExecutionProbe = z.infer<typeof PythonProjectExecutionProbeSchema>
export function pythonMissionProbeBudget(probe: PythonProjectExecutionProbe) {
  return (
    (probe.stdin?.length ?? 0) * 1000 +
    (probe.type === 'functionReturns'
      ? probe.args.length * 2000
      : (probe.observation?.idleMs ?? 0) +
        probe.steps.reduce(
          (sum, step) =>
            sum +
            (step.action === 'wait' ? step.ms : step.action === 'press' ? (step.holdMs ?? 80) : 0),
          0,
        ))
  )
}
export const PythonProjectExecutionRequestSchema = z
  .strictObject({
    version: z.literal(1),
    identity: PythonProjectExecutionIdentitySchema,
    probes: z.array(PythonProjectExecutionProbeSchema).min(1).max(EXECUTION_LIMITS.maxObjectives),
  })
  .superRefine((request, context) => {
    if (
      new Set(request.probes.map((probe) => probe.id)).size !== request.probes.length ||
      request.probes.reduce((sum, probe) => sum + pythonMissionProbeBudget(probe), 0) >
        EXECUTION_LIMITS.maxSectionWaitMs ||
      request.probes.some(
        (probe) =>
          probe.type === 'behavior' &&
          (pythonMissionProbeBudget(probe) >
            EXECUTION_LIMITS.maxTotalWaitMs + EXECUTION_LIMITS.maxIdleBaselineMs ||
            (probe.target.kind === 'spritePosition' &&
              (!probe.observation ||
                probe.steps.length !== 1 ||
                probe.steps[0]?.action !== 'press')) ||
            (probe.observation && probe.target.kind !== 'spritePosition')),
      )
    )
      context.addIssue({
        code: 'custom',
        message: 'As sondas Python são duplicadas, incoerentes ou excedem o orçamento.',
      })
  })
export type PythonProjectExecutionRequest = z.infer<typeof PythonProjectExecutionRequestSchema>
export function pythonMissionRequest(
  plan: PythonProjectExecutionPlan,
): PythonProjectExecutionRequest {
  return PythonProjectExecutionRequestSchema.parse({
    version: 1,
    identity: plan.identity,
    probes: pythonProjectExecutionProbes(plan).map((probe, index) => ({
      ...probe,
      ...(plan.objectives[index]?.stdin ? { stdin: plan.objectives[index].stdin } : {}),
    })),
  })
}
export function pythonMissionRecipe(probe: PythonProjectExecutionProbe) {
  return StudioPythonPlaytestRecipeSchema.parse({
    version: 1,
    mission: true,
    capture: false,
    observeMs: 250,
    stdin: probe.stdin ?? [],
    keys: [],
    clicks: [],
    requireGraphics: false,
  })
}
/** A concept-only objective still needs an actual responsive, error-free program. */
export function pythonProjectStructureRecipe() {
  return StudioPythonPlaytestRecipeSchema.parse({
    version: 1,
    mission: true,
    capture: false,
    observeMs: 250,
    stdin: [],
    keys: [],
    clicks: [],
    requireGraphics: false,
  })
}
export const PythonMissionExecutionArtifactsSchema = z.strictObject({
  mission: PythonProjectExecutionReportSchema,
  executions: z
    .array(
      z.strictObject({ id: z.string().min(1).max(100), report: StudioPythonPlaytestReportSchema }),
    )
    .min(1)
    .max(EXECUTION_LIMITS.maxObjectives),
})
export const PythonMissionValidationReportSchema = z.strictObject({
  version: z.literal(1),
  projectId: StudioProjectIdSchema,
  status: z.enum(['passed', 'failed']),
  inspection: StudioPythonInspectionReportSchema,
  mission: PythonProjectExecutionReportSchema.optional(),
  executions: z
    .array(
      z.strictObject({ id: z.string().min(1).max(100), report: StudioPythonPlaytestReportSchema }),
    )
    .min(1)
    .max(EXECUTION_LIMITS.maxObjectives)
    .optional(),
})
export type PythonMissionValidationReport = z.infer<typeof PythonMissionValidationReportSchema>

export async function verifyPythonMissionRequest(raw: unknown, snapshotInput: unknown) {
  const request = PythonProjectExecutionRequestSchema.parse(
    copyStudioProjectJson(raw, {
      nodes: 20_000,
      depth: 64,
      textChars: PYTHON_MISSION_LIMITS.requestBytes,
    }),
  )
  const snapshot = await verifyStudioPythonExecutionMetadata(snapshotInput)
  if (
    request.identity.projectId !== snapshot.projectId ||
    request.identity.revision !== snapshot.revision ||
    request.identity.runtimeManifestSha256 !== snapshot.configuration.runtime.manifestSha256
  )
    throw new Error('As sondas não pertencem à revisão Python solicitada.')
  return request
}

/** Authenticated service evidence; never accepts learner browser feedback. */
export async function verifyPythonMissionValidationReport(
  raw: unknown,
  snapshotInput: unknown,
  requestInput: unknown,
  structure: boolean,
) {
  const request = await verifyPythonMissionRequest(requestInput, snapshotInput)
  const snapshot = await verifyStudioPythonExecutionMetadata(snapshotInput)
  const report = PythonMissionValidationReportSchema.parse(copyStudioProjectJson(raw))
  if (report.projectId !== snapshot.projectId) throw new Error('Relatório de outro projeto Python.')
  const inspection = await verifyStudioPythonInspectionReport(report.inspection, snapshot)
  if (inspection.status === 'passed' && structure)
    await verifyStudioPythonStructureEvidence(inspection, snapshot)
  const compiled = inspection.status === 'passed'
  if (
    compiled !== Boolean(report.mission && report.executions) ||
    (!compiled && (report.mission || report.executions || report.status !== 'failed'))
  )
    throw new Error('As fases da verificação Python estão incompletas.')
  if (report.mission && report.executions) {
    if (
      canonicalJson(report.mission.identity) !== canonicalJson(request.identity) ||
      report.executions.length !== request.probes.length ||
      report.mission.observations.length !== request.probes.length ||
      new Set(report.executions.map((item) => item.report.runId)).size !== report.executions.length
    )
      throw new Error('A execução Python não corresponde às sondas e gerações solicitadas.')
    for (const [index, probe] of request.probes.entries()) {
      const execution = report.executions[index],
        observation = report.mission.observations[index]
      if (
        execution?.id !== probe.id ||
        observation?.id !== probe.id ||
        observation.type !== probe.type
      )
        throw new Error('A execução omitiu ou trocou uma sonda Python.')
      await verifyStudioPythonPlaytestReport(execution.report, snapshot, pythonMissionRecipe(probe))
      if (!execution.report.stopped)
        throw new Error('A execução Python não confirmou o encerramento.')
      if (canonicalJson(observation.errors ?? []) !== canonicalJson(execution.report.errors))
        throw new Error('A observação não preservou os erros da execução Python.')
    }
    if (
      (report.status === 'passed') !==
      report.executions.every((item) => item.report.status === 'passed')
    )
      throw new Error('O resultado não corresponde às execuções Python.')
  }
  if (
    new TextEncoder().encode(JSON.stringify(report)).byteLength >
    PYTHON_MISSION_LIMITS.responseBytes
  )
    throw new Error('O relatório das missões Python excede o limite.')
  return report
}
