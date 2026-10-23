import { createHash, randomUUID } from 'node:crypto'
import { canonicalJson } from '@sistemazero/core/creations'
import { DomainError, ValidationError } from '@sistemazero/core/errors'
import { awaitWithSignal } from '@sistemazero/core/http'
import {
  type StudioProjectCuration,
  StudioProjectCurationSchema,
} from '@sistemazero/core/studio/project-capabilities'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import {
  assertStudioPythonActivityScope,
  gradeStudioPythonActivity,
  StudioPythonActivitySchema,
} from '@sistemazero/core/studio/python-activity'
import { prepareStudioPythonStructureEvaluation } from '@sistemazero/core/studio/python-activity-structure'
import { verifyStudioPythonInspectionReport } from '@sistemazero/core/studio/python-inspection'
import {
  inspectStudioPythonRevision,
  StudioPythonRuntimeError,
} from '@sistemazero/core/studio/python-runtime-client'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { preparePythonExecutionSnapshot } from '@sistemazero/studio/server-python-snapshot'
import { StudioPythonActivityUnavailableError } from '../../domain/studio/python-activity.errors'
import type { StudioRuntimePolicy } from '../../domain/studio/runtime-policy'

/** Fits the operation's 55s gateway and 60s BFF ceilings, including bounded cleanup. */
export const PYTHON_ACTIVITY_INSPECTION_TIMEOUT_MS = 45_000

/** Members owns every structural fact. A browser result/report is never an input to inspection. */
export class PythonActivityInspectionService {
  constructor(
    private readonly options: {
      runtimeUrl?: string
      runtimeToken?: string
      policy?: StudioRuntimePolicy
      /** The shared authenticated transport; injectable without replacing the compiler's verifier. */
      inspect?: typeof inspectStudioPythonRevision
      cleanupFailed?(): void
    },
  ) {}

  async grade(input: {
    userId: string
    accountId: string
    project: unknown
    activity: unknown
    clientResults: Parameters<typeof gradeStudioPythonActivity>[0]['clientResults']
    signal?: AbortSignal
    /** Fresh lesson/section/baseline/revision access, also checked before persistence by the caller. */
    authorize(signal: AbortSignal): Promise<StudioProjectCuration>
  }) {
    const { userId, accountId } = input
    const { runtimeUrl, runtimeToken, policy, cleanupFailed } = this.options
    if (!runtimeUrl || !runtimeToken || !policy) throw new StudioPythonActivityUnavailableError()
    const inspect = this.options.inspect ?? inspectStudioPythonRevision
    const activity = StudioPythonActivitySchema.parse(input.activity)
    const project = StudioProjectDocumentSchema.parse(copyStudioProjectJson(input.project))
    if (project.programmingLanguage !== 'python')
      throw new ValidationError('Esta atividade precisa de um projeto Python.')
    const signal = AbortSignal.any([
      ...(input.signal ? [input.signal] : []),
      AbortSignal.timeout(PYTHON_ACTIVITY_INSPECTION_TIMEOUT_MS),
    ])
    const authorizeContext = input.authorize
    const clientResults = input.clientResults.map(({ checkId, passed, message }) => ({
      checkId,
      passed,
      message,
    }))
    const subject = studioRuntimeSubject(project)
    const authorize = async () => {
      signal.throwIfAborted()
      const curation = StudioProjectCurationSchema.parse(
        await awaitWithSignal(() => authorizeContext(signal), signal),
      )
      signal.throwIfAborted()
      policy.authorize({
        project: subject,
        operation: 'analyze',
        curation,
        grantedCapabilities: ['edit'],
      })
    }
    // Authorize before materialization and again throughout the S2S operation.
    await authorize()
    const snapshot = await awaitWithSignal(() => preparePythonExecutionSnapshot(project), signal)
    assertStudioPythonActivityScope(activity, snapshot.configuration)
    await authorize()
    const files = new Map(snapshot.files.map((file) => [file.path, file.bytes]))
    const metadata = {
      ...snapshot,
      files: snapshot.files.map(({ bytes, ...file }) => ({
        ...file,
        byteLength: bytes.byteLength,
      })),
    }
    const requestId = randomUUID()
    try {
      const rawReport = await inspect({
        snapshot: metadata,
        projectId: project.id,
        owner: createHash('sha256')
          .update(canonicalJson([accountId, userId]))
          .digest('hex'),
        executionId: randomUUID(),
        requestId,
        runtimeUrl,
        runtimeToken,
        signal,
        structure: true,
        read: async (path, operationSignal) => {
          operationSignal.throwIfAborted()
          const bytes = files.get(path)
          if (!bytes)
            throw new ValidationError('O arquivo solicitado não pertence ao projeto submetido.')
          return new Uint8Array(bytes)
        },
        authorize,
        ...(cleanupFailed ? { cleanupFailed } : {}),
      })
      const report = await verifyStudioPythonInspectionReport(rawReport, metadata)
      // A failed compile cannot provide complete structure, even for a negative rule.
      const evaluateStructure =
        report.status === 'passed'
          ? await prepareStudioPythonStructureEvaluation(report, metadata)
          : () => false
      await authorize()
      const grade = gradeStudioPythonActivity({
        activity,
        evaluateStructure,
        structureVerifiedBy: 'server',
        clientResults,
      })
      if (report.status !== 'passed')
        for (const result of grade.results) {
          if (result.kind === 'structure')
            result.message =
              'A estrutura não pôde ser verificada porque um arquivo Python não compila.'
        }
      return grade
    } catch (error) {
      // Access/conflict errors remain actionable. Infrastructure failures never approve a gate.
      if (error instanceof DomainError) throw error
      if (error instanceof StudioPythonRuntimeError && error.status === 422)
        throw new ValidationError(error.message)
      throw new StudioPythonActivityUnavailableError()
    }
  }
}
