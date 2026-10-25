import { createHash, randomUUID } from 'node:crypto'
import { canonicalJson } from '@sistemazero/core/creations'
import { DomainError, ValidationError } from '@sistemazero/core/errors'
import { awaitWithSignal } from '@sistemazero/core/http'
import {
  isPythonProjectExecutionRule,
  judgePythonProjectExecution,
  preparePythonProjectExecution,
  type SectionPythonProjectCheck,
  SectionPythonProjectCheckDraftSchema,
  sectionProjectChecksEnvironmentIssue,
  validateSectionPythonProjectChecks,
} from '@sistemazero/core/learning'
import {
  type StudioProjectCuration,
  StudioProjectCurationSchema,
} from '@sistemazero/core/studio/project-capabilities'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import {
  prepareStudioPythonStructureEvaluation,
  StudioPythonStructureRuleSchema,
} from '@sistemazero/core/studio/python-activity-structure'
import type { StudioPythonInspectionReport } from '@sistemazero/core/studio/python-inspection'
import {
  PYTHON_MISSION_LIMITS,
  pythonMissionRequest,
  pythonProjectStructureRecipe,
  verifyPythonMissionValidationReport,
} from '@sistemazero/core/studio/python-mission-execution'
import {
  checkStudioPythonRevision,
  StudioPythonRuntimeError,
  validateStudioPythonRevision,
} from '@sistemazero/core/studio/python-runtime-client'
import { PYTHON_PROJECT_MISSION_FEATURE } from '@sistemazero/core/studio/python-runtime-features'
import { verifyStudioPythonValidationReport } from '@sistemazero/core/studio/python-validation'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { preparePythonExecutionSnapshot } from '@sistemazero/studio/server-python-snapshot'
import { StudioPythonProjectCheckUnavailableError } from '../../domain/studio/python-project-check.errors'
import type { StudioRuntimePolicy } from '../../domain/studio/runtime-policy'

/** Saved-project authority: no browser feedback, pass flags, weights or client answers enter here. */
export class PythonProjectCheckerService {
  constructor(
    private readonly options: {
      runtimeUrl?: string
      runtimeToken?: string
      policy?: StudioRuntimePolicy
      validate?: typeof validateStudioPythonRevision
      execute?: typeof checkStudioPythonRevision
      cleanupFailed?(): void
    },
  ) {}

  async grade(input: {
    userId: string
    accountId: string
    project: unknown
    checks: readonly SectionPythonProjectCheck[]
    signal?: AbortSignal
    authorize(signal: AbortSignal): Promise<StudioProjectCuration>
  }) {
    const { userId, accountId, authorize: authorizeContext, signal: callerSignal } = input
    const { runtimeUrl, runtimeToken, policy } = this.options
    if (!runtimeUrl || !runtimeToken || !policy)
      throw new StudioPythonProjectCheckUnavailableError()
    const checks = SectionPythonProjectCheckDraftSchema.array().parse(
      copyStudioProjectJson(input.checks),
    )
    try {
      validateSectionPythonProjectChecks(checks)
    } catch {
      throw new ValidationError(
        'Complete os objetivos de execução e estrutura Python antes de testar.',
      )
    }
    const project = StudioProjectDocumentSchema.parse(copyStudioProjectJson(input.project))
    if (project.programmingLanguage !== 'python')
      throw new ValidationError('Os objetivos precisam de um projeto Python.')
    const issue = sectionProjectChecksEnvironmentIssue(checks, project)
    if (issue) throw new ValidationError(issue)
    const executionChecks = checks.flatMap((check) =>
      isPythonProjectExecutionRule(check.rule)
        ? [{ id: check.id, rule: check.rule, ...(check.stdin ? { stdin: check.stdin } : {}) }]
        : [],
    )
    const hasStructure = checks.some(
      (check) => check.rule.type !== 'behavior' && check.rule.type !== 'functionReturns',
    )
    const signal = AbortSignal.any([
      ...(callerSignal ? [callerSignal] : []),
      AbortSignal.timeout(PYTHON_MISSION_LIMITS.callerMs),
    ])
    const subject = studioRuntimeSubject(project)
    const authorize = async () => {
      signal.throwIfAborted()
      const curation = StudioProjectCurationSchema.parse(
        await awaitWithSignal(() => authorizeContext(signal), signal),
      )
      signal.throwIfAborted()
      const decision = policy.authorize({
        project: subject,
        curation,
        operation: 'execute',
        grantedCapabilities: ['edit', 'execute'],
      })
      if (
        !decision.catalog.releases
          .find((release) => release.manifestSha256 === project.runtime.manifestSha256)
          ?.manifest.python?.features.includes(PYTHON_PROJECT_MISSION_FEATURE)
      )
        throw new ValidationError(
          'Atualize o ambiente Python do projeto para uma versão com verificação de objetivos.',
        )
    }
    await authorize()
    const snapshot = await awaitWithSignal(() => preparePythonExecutionSnapshot(project), signal)
    const files = new Map(snapshot.files.map((file) => [file.path, file.bytes]))
    const metadata = {
      ...snapshot,
      files: snapshot.files.map(({ bytes, ...file }) => ({
        ...file,
        byteLength: bytes.byteLength,
      })),
    }
    await authorize()
    const transport = {
      snapshot: metadata,
      projectId: project.id,
      owner: createHash('sha256')
        .update(canonicalJson([accountId, userId]))
        .digest('hex'),
      executionId: randomUUID(),
      requestId: randomUUID(),
      runtimeUrl,
      runtimeToken,
      signal,
      structure: hasStructure,
      read: async (path: string, operationSignal: AbortSignal) => {
        operationSignal.throwIfAborted()
        const bytes = files.get(path)
        if (!bytes) throw new ValidationError('O arquivo não pertence ao projeto submetido.')
        return new Uint8Array(bytes)
      },
      authorize,
      ...(this.options.cleanupFailed ? { cleanupFailed: this.options.cleanupFailed } : {}),
    }
    try {
      let inspection: StudioPythonInspectionReport
      let programHealthy = false
      let executed = new Map<string, { passed: boolean; detail?: string }>()
      if (executionChecks.length) {
        const plan = await preparePythonProjectExecution(
          {
            projectId: project.id,
            revision: metadata.revision,
            runtimeManifestSha256: metadata.configuration.runtime.manifestSha256,
            runId: randomUUID(),
          },
          executionChecks,
        )
        const mission = pythonMissionRequest(plan)
        const report = await verifyPythonMissionValidationReport(
          await (this.options.execute ?? checkStudioPythonRevision)({ ...transport, mission }),
          metadata,
          mission,
          hasStructure,
        )
        inspection = report.inspection
        programHealthy = report.status === 'passed'
        if (inspection.status === 'passed' && report.mission)
          executed = new Map(
            judgePythonProjectExecution(plan, report.mission).map(({ id, ...result }) => [
              id,
              result,
            ]),
          )
      } else {
        const recipe = pythonProjectStructureRecipe()
        const report = await verifyStudioPythonValidationReport(
          await (this.options.validate ?? validateStudioPythonRevision)({ ...transport, recipe }),
          metadata,
          recipe,
          hasStructure,
        )
        inspection = report.inspection
        programHealthy = report.status === 'passed'
      }
      const structure =
        inspection.status === 'passed' && hasStructure
          ? await prepareStudioPythonStructureEvaluation(inspection, metadata)
          : () => false
      const results = checks.map((check) => {
        const execution = isPythonProjectExecutionRule(check.rule)
        const result = execution ? executed.get(check.id) : undefined
        if (execution && inspection.status === 'passed' && !result)
          throw new StudioPythonProjectCheckUnavailableError()
        const passed =
          inspection.status === 'passed' &&
          programHealthy &&
          (execution
            ? result?.passed === true
            : structure(StudioPythonStructureRuleSchema.parse(check.rule)))
        const message =
          inspection.status !== 'passed'
            ? 'Um arquivo Python não compila. Corrija o código antes de verificar o projeto.'
            : !programHealthy
              ? 'O programa precisa executar sem erros e responder à verificação.'
              : result?.detail
        return {
          checkId: check.id,
          passed,
          kind: execution ? ('execution' as const) : ('structure' as const),
          verifiedBy: 'server' as const,
          ...(message ? { message } : {}),
        }
      })
      await authorize()
      return {
        passed: checks.every(
          (check) =>
            check.optional || results.find((result) => result.checkId === check.id)?.passed,
        ),
        results,
      }
    } catch (error) {
      if (error instanceof DomainError) throw error
      if (error instanceof StudioPythonRuntimeError && error.status === 422)
        throw new ValidationError(error.message)
      throw new StudioPythonProjectCheckUnavailableError()
    }
  }
}
