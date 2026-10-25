import { readStudioPythonMissionProbe } from '@sistemazero/core/studio/python-mission-observation'
import {
  STUDIO_PYTHON_PLAYTEST_LIMITS as LIMITS,
  type StudioPythonPlaytestCapture,
  StudioPythonPlaytestRecipeSchema,
  StudioPythonPlaytestReportSchema,
} from '@sistemazero/core/studio/python-playtest'
import {
  readStudioRuntimeImage,
  type StudioRuntimeImage,
} from '@sistemazero/core/studio/runtime-image'
import type { StudioExecutionIdentity, StudioRuntimeEvent, StudioRuntimeSession } from '../types'
import type { StandalonePythonPlayerObserver } from './standalonePlayer'
import { PYTHON_VERSION } from './versions'

const sameIdentity = (left: StudioExecutionIdentity, right: StudioExecutionIdentity) =>
  left.projectId === right.projectId &&
  left.revision === right.revision &&
  left.runtimeManifestSha256 === right.runtimeManifestSha256 &&
  left.runId === right.runId &&
  left.instanceId === right.instanceId &&
  left.writerEpoch === right.writerEpoch
const add = (left: number, right: number) => Math.min(Number.MAX_SAFE_INTEGER, left + right)

/** Trusted parent collector. It never evaluates source or treats dispatched input as game response. */
export function createPythonPlaytestCollector(recipeInput: unknown, retire: () => boolean) {
  const recipe = StudioPythonPlaytestRecipeSchema.parse(recipeInput)
  let session: StudioRuntimeSession | undefined
  let identity: StudioExecutionIdentity | undefined
  let lastSequence = 0
  let startedAt: number | undefined
  let state: 'ready' | 'running' | 'waiting-input' | 'paused' | 'completed' | 'failed' = 'ready'
  let finishing = false
  let finished = false
  let inputRequest: string | undefined
  let submittingInput = false
  const input = { stdinRequests: 0, stdinSubmitted: 0, keysDispatched: 0, clicksDispatched: 0 }
  const output = { stdout: '', stderr: '' }
  let omittedChars = 0
  const errors: string[] = []
  const fail = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    if (errors.length < LIMITS.errors)
      errors.push(message.slice(0, LIMITS.errorChars) || 'Falha de execução Python.')
  }
  const observer: StandalonePythonPlayerObserver = {
    ...(recipe.mission ? { mission: true } : {}),
    session(value) {
      if (session || finishing || finished) {
        fail('A prova de execução não permite reiniciar a sessão.')
        void value.dispose().catch(fail)
        return
      }
      session = value
      identity = { ...value.identity }
    },
    event(event: StudioRuntimeEvent) {
      if (
        finished ||
        !identity ||
        !sameIdentity(identity, event.identity) ||
        event.sequence <= lastSequence
      )
        return
      lastSequence = event.sequence
      if (event.type === 'state') {
        if (event.state === 'stopped') {
          if (!finishing) fail('A sessão foi parada antes de terminar a prova.')
          return
        }
        state = event.state
        if (event.state === 'running' && startedAt === undefined) startedAt = performance.now()
      } else if (event.type === 'console') {
        const combined = output[event.stream] + event.text
        let start = Math.max(0, combined.length - LIMITS.outputChars)
        // Do not retain half a surrogate pair when trimming the bounded tail.
        if (
          start > 0 &&
          combined.charCodeAt(start) >= 0xdc00 &&
          combined.charCodeAt(start) <= 0xdfff
        )
          start++
        output[event.stream] = combined.slice(start)
        omittedChars = add(omittedChars, add(event.omittedChars, start))
      } else if (event.type === 'input-request') {
        if (inputRequest) fail('O runtime solicitou duas entradas simultâneas.')
        inputRequest = event.requestId
        input.stdinRequests = add(input.stdinRequests, 1)
      } else if (event.type === 'diagnostic') {
        fail(`${event.path}:${event.line} ${event.message}\n${event.traceback}`)
      } else if (event.type === 'failed') {
        state = 'failed'
        fail(event.message)
      }
    },
    disposed(disposedIdentity) {
      if (!finishing && identity && disposedIdentity && sameIdentity(identity, disposedIdentity))
        fail('A sessão foi descartada antes de terminar a prova.')
    },
    failed: fail,
  }
  return {
    observer,
    programFailure(message: string) {
      if (!recipe.mission || finishing || finished) throw new Error('A missão não está ativa.')
      fail(message)
    },
    output() {
      if (!recipe.mission || finished || finishing)
        throw new Error('A observação de saída não está disponível.')
      if (omittedChars) throw new Error('A saída do programa excedeu o limite da observação.')
      return { ...output }
    },
    async observe(raw: unknown) {
      if (
        !recipe.mission ||
        !session?.observePythonMission ||
        !identity ||
        finished ||
        finishing ||
        submittingInput
      )
        throw new Error('A observação não está disponível nesta execução.')
      const current = session
      const expected = { ...identity }
      const result = await session.observePythonMission(readStudioPythonMissionProbe(raw))
      if (
        session !== current ||
        !identity ||
        !sameIdentity(identity, expected) ||
        finished ||
        finishing
      )
        throw new Error('A geração mudou durante a observação.')
      return result
    },
    view() {
      return {
        ready: !!session,
        started: startedAt !== undefined,
        state,
        inputPending: !!inputRequest && !submittingInput,
        input: { ...input },
        errors: [...errors],
        finished,
      }
    },
    async submitNextLine() {
      if (
        !session ||
        !inputRequest ||
        submittingInput ||
        finishing ||
        finished ||
        input.stdinSubmitted >= recipe.stdin.length
      )
        throw new Error('Não há entrada autorizada pendente nesta prova.')
      const current = session
      const request = inputRequest
      const line = recipe.stdin[input.stdinSubmitted]
      if (line === undefined) throw new Error('A receita não possui esta linha de entrada.')
      inputRequest = undefined
      submittingInput = true
      try {
        await current.provideInput(request, { kind: 'line', text: line })
        if (session !== current || finishing || finished)
          throw new Error('A sessão mudou durante a entrada.')
        input.stdinSubmitted++
      } catch (error) {
        fail(error)
        throw error
      } finally {
        submittingInput = false
      }
    },
    /** Called only after Playwright successfully dispatches each matching recipe action. */
    dispatched(kind: 'key' | 'click', index: number) {
      const field = kind === 'key' ? 'keysDispatched' : 'clicksDispatched'
      const length = kind === 'key' ? recipe.keys.length : recipe.clicks.length
      if (
        finishing ||
        finished ||
        !session ||
        startedAt === undefined ||
        index !== input[field] ||
        index >= length
      )
        throw new Error('A entrada não corresponde à sequência autorizada da receita.')
      input[field]++
    },
    async finish() {
      if (finishing || finished || !session || !identity)
        throw new Error('A prova não possui uma sessão encerrável.')
      finishing = true
      const current = session
      const expectedIdentity = { ...identity }
      let image: StudioRuntimeImage | undefined
      let capture: StudioPythonPlaytestCapture | undefined
      try {
        const snapshot = recipe.capture === false ? undefined : await current.captureSnapshot?.()
        if (snapshot) {
          if (!sameIdentity(expectedIdentity, snapshot.identity))
            throw new Error('A captura pertence a outra sessão.')
          image = readStudioRuntimeImage(snapshot)
          if (!image) throw new Error('A captura Python não possui formato válido.')
          const bytes = Uint8Array.from(atob(image.dataUrl.slice(22)), (char) => char.charCodeAt(0))
          const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
          capture = {
            path: 'python-playtest.png',
            sha256: Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join(''),
            byteLength: bytes.length,
            width: image.width,
            height: image.height,
            frameSequence: image.frameSequence,
          }
        }
      } catch (error) {
        fail(error)
      }
      const stateBeforeStop = state
      const duration = startedAt === undefined ? 0 : Math.floor(performance.now() - startedAt)
      if (duration > LIMITS.elapsedMs) fail('A prova de execução ultrapassou o prazo.')
      if (submittingInput) fail('Uma entrada ainda estava em trânsito no encerramento.')
      if (recipe.requireGraphics && !capture)
        fail('A receita exige uma apresentação gráfica capturada.')
      if (
        input.stdinSubmitted !== recipe.stdin.length ||
        input.keysDispatched !== recipe.keys.length ||
        input.clicksDispatched !== recipe.clicks.length
      )
        fail('As entradas da receita não foram concluídas.')
      if (
        startedAt === undefined ||
        duration < recipe.observeMs ||
        !['running', 'waiting-input', 'completed'].includes(stateBeforeStop)
      )
        fail('A execução não concluiu a observação exigida.')
      let stopped = false,
        disposed = false,
        retired = false
      try {
        await current.stop()
        stopped = true
      } catch (error) {
        fail(error)
      }
      try {
        await current.dispose()
        disposed = true
      } catch (error) {
        fail(error)
      }
      try {
        retired = retire()
        if (!retired) fail('O frame da prova não foi retirado.')
      } catch (error) {
        fail(error)
      }
      finished = true
      const report = StudioPythonPlaytestReportSchema.parse({
        version: 1,
        projectId: expectedIdentity.projectId,
        revision: expectedIdentity.revision,
        runtimeManifestSha256: expectedIdentity.runtimeManifestSha256,
        pythonVersion: PYTHON_VERSION,
        instanceId: expectedIdentity.instanceId,
        runId: expectedIdentity.runId,
        recipe,
        status: errors.length ? 'failed' : 'passed',
        started: startedAt !== undefined,
        stopped: stopped && disposed && retired,
        stateBeforeStop,
        observedDurationMs: Math.min(duration, LIMITS.elapsedMs),
        ...output,
        omittedChars,
        errors: [...errors],
        input: { ...input },
        ...(capture ? { capture } : {}),
      })
      return { report, image }
    },
  }
}
