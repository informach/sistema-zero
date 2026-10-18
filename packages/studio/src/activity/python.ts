import { awaitWithSignal } from '@sistemazero/core/http'
import type { StudioPythonActivity } from '@sistemazero/core/studio/python-activity'
import {
  assertStudioPythonActivityScope,
  gradeStudioPythonActivity,
  StudioPythonActivitySchema,
} from '@sistemazero/core/studio/python-activity'
import { prepareStudioPythonStructureEvaluation } from '@sistemazero/core/studio/python-activity-structure'
import { StudioPythonPlaytestRecipeSchema } from '@sistemazero/core/studio/python-playtest'
import type { PythonProjectDocument } from '../core/editableProject'
import { preparePythonAnalysisSession } from '../python/language/session'
import type { StudioRuntimeEnvironment } from '../runtime/environment'
import { createPythonExecutionController } from '../runtime/python/controller'
import { inspectPythonSnapshot } from '../runtime/python/inspection'
import { preparePythonExecutionSnapshot } from '../runtime/python/snapshot'

/** One round owns its own analysis and execution frames. The editor's running game is untouched. */
export interface PythonActivityRunOptions {
  environment: StudioRuntimeEnvironment
  signal: AbortSignal
  assertCurrent(): void
  writerEpoch?: number | null
}
export async function runPythonActivity(
  project: PythonProjectDocument,
  rawActivity: StudioPythonActivity,
  options: PythonActivityRunOptions,
): Promise<ReturnType<typeof gradeStudioPythonActivity>> {
  const activity = StudioPythonActivitySchema.parse(rawActivity)
  const { environment, assertCurrent, writerEpoch } = options
  const signal = AbortSignal.any([
    options.signal,
    ...(environment.signal ? [environment.signal] : []),
    AbortSignal.timeout(90_000),
  ])
  const check = () => {
    signal.throwIfAborted()
    assertCurrent()
  }
  const frames = new Set<HTMLIFrameElement>()
  const releaseFrames = () => {
    for (const frame of frames) frame.remove()
    frames.clear()
  }
  signal.addEventListener('abort', releaseFrames, { once: true })
  const mount = () => {
    check()
    const frame = document.createElement('iframe')
    frame.title = 'Verificação da tarefa Python'
    frame.setAttribute('aria-hidden', 'true')
    frame.tabIndex = -1
    frame.style.cssText =
      'position:fixed;left:-10000px;top:0;width:640px;height:480px;border:0;pointer-events:none'
    document.body.append(frame)
    frames.add(frame)
    return {
      frame,
      release() {
        frames.delete(frame)
        frame.remove()
      },
    }
  }
  let execution: ReturnType<typeof createPythonExecutionController> | undefined
  try {
    check()
    const snapshot = await awaitWithSignal(() => preparePythonExecutionSnapshot(project), signal)
    check()
    assertStudioPythonActivityScope(activity, snapshot.configuration)
    const report = await inspectPythonSnapshot({
      snapshot,
      signal,
      structure: true,
      createSession: async (analysisSignal) => {
        check()
        await awaitWithSignal(
          () =>
            environment.authorize?.({
              project,
              operation: 'analyze',
              revision: snapshot.revision,
              signal: analysisSignal,
            }) ?? Promise.resolve(),
          analysisSignal,
        )
        check()
        const approved = await awaitWithSignal(
          () => environment.resolvePythonAnalysis(project, analysisSignal),
          analysisSignal,
        )
        check()
        const mounted = mount()
        return awaitWithSignal(
          () =>
            preparePythonAnalysisSession({
              frame: mounted.frame,
              url: approved.url,
              allowedOrigins: approved.allowedOrigins,
              runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
              signal: analysisSignal,
            }),
          analysisSignal,
          (late) => late.dispose(),
        )
      },
    })
    check()
    if (report.status !== 'passed') {
      const grade = gradeStudioPythonActivity({
        activity,
        structureVerifiedBy: 'client',
        clientResults: [],
        evaluateStructure: () => false,
      })
      for (const result of grade.results)
        result.message = (
          report.files.flatMap((file) => file.diagnostics).at(0)?.message ??
          'Corrija o código Python antes de verificar esta tarefa.'
        ).slice(0, 2000)
      return grade
    }
    const evaluateStructure = await prepareStudioPythonStructureEvaluation(report, {
      ...snapshot,
      files: snapshot.files.map(({ bytes, ...file }) => ({
        ...file,
        byteLength: bytes.byteLength,
      })),
    })
    check()
    if (!activity.recipe && activity.checks.every((criterion) => criterion.kind === 'structure'))
      return gradeStudioPythonActivity({
        activity,
        evaluateStructure,
        structureVerifiedBy: 'client',
        clientResults: [],
      })
    const recipe = StudioPythonPlaytestRecipeSchema.parse(activity.recipe ?? { version: 1 })
    let inputIndex = 0
    let pendingInput: Promise<void> | undefined
    let inputFailure: unknown
    execution = createPythonExecutionController({
      instanceId: crypto.randomUUID(),
      pythonActivity: activity,
      environment: () => environment,
      project: () => project,
      canExecute: () => {
        try {
          check()
          return true
        } catch {
          return false
        }
      },
      writerEpoch: () => writerEpoch ?? null,
      mountFrame: mount,
      onEvent(event) {
        if (event.type !== 'input-request') return
        const line = recipe.stdin[inputIndex++]
        if (line === undefined || pendingInput) {
          inputFailure = new Error('A receita não tem uma resposta para esta entrada.')
          return
        }
        pendingInput = execution!
          .input(event.requestId, { kind: 'line', text: line })
          .catch((error: unknown) => {
            inputFailure = error
          })
          .finally(() => {
            pendingInput = undefined
          })
      },
    })
    await awaitWithSignal(() => execution!.run(), signal)
    check()
    if (recipe.keys.length || recipe.clicks.length) {
      await awaitWithSignal(() => execution!.applyActivityControls(), signal)
      check()
    }
    await awaitWithSignal(
      () => new Promise<void>((resolve) => setTimeout(resolve, recipe.observeMs)),
      signal,
    )
    if (pendingInput) await awaitWithSignal(() => pendingInput!, signal)
    check()
    if (inputFailure) throw inputFailure
    if (inputIndex !== recipe.stdin.length)
      throw new Error('O programa não consumiu as entradas previstas na tarefa.')
    const feedback = await awaitWithSignal(() => execution!.checkActivity(), signal)
    check()
    if (recipe.requireGraphics && !(await awaitWithSignal(() => execution!.capture(), signal)))
      throw new Error('O programa não apresentou um desenho Turtle para verificar.')
    check()
    return gradeStudioPythonActivity({
      activity,
      evaluateStructure,
      structureVerifiedBy: 'client',
      clientResults: feedback.results,
    })
  } finally {
    signal.removeEventListener('abort', releaseFrames)
    const disposed = execution?.dispose()
    releaseFrames()
    await disposed
  }
}
