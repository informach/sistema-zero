import {
  type ExecutionObservation,
  type ExecutionObservedValue,
  executionRuleBudgetMs,
  judgeExecutionObservation,
} from '@sistemazero/core/learning'
import {
  PYTHON_MISSION_UNRESPONSIVE_MESSAGE,
  type StudioPythonMissionFrameObservation,
  type StudioPythonMissionProbe,
} from '@sistemazero/core/studio/python-mission-observation'
import {
  isRunnableStudentTestRule,
  type RunnableStudentTestFunctionRule,
} from '@sistemazero/core/studio/student-test-runnable'
import type {
  StudentTestBehaviorRule,
  StudioStudentTest,
} from '@sistemazero/core/studio/student-tests'
import { pythonCanvasExtension } from '../runtime/python/canvasExtension'
import {
  createPythonExecutionController,
  type PythonExecutionView,
} from '../runtime/python/controller'
import type { StudioRuntimeEvent } from '../runtime/types'
import type { PythonTestHost } from '../state/pythonTestHost'
import { STUDENT_TEST_VIEWPORT, type StudentTestOutcome } from './outcome'

/**
 * O executor de um teste da aba "Meus testes" no Python (proposta aprovada em 20/11/2026: "no
 * navegador: testar o programa e testar uma função"). Cria uma execução escondida, só dele, com o
 * ambiente e o projeto que a prévia entrega (`state/pythonTestHost.ts`), no modo de observação das
 * missões (o observador lê as variáveis e chama as funções sem mudar o programa). O programa da
 * prévia não muda; a execução escondida sai no fim.
 *
 * - **Testar o programa** (com Turtle, Pygame Zero, pygame-ce ou Raylib): aperta as teclas pelo
 *   quadro do Python (o comando `key`, como o teclado faria) e espera; no fim, lê a variável (ou a
 *   posição, `ator.x`) pelo observador, ou as mensagens que o programa escreveu.
 * - **Testar uma função** (todo programa Python): espera o programa chegar ao desenho (ou ao fim,
 *   sem desenho) e chama a função com os casos da criança.
 *
 * Julga com a régua dos objetivos das aulas (`judgeExecutionObservation`). Baixado só quando a aba
 * roda um teste.
 */

/** Quanto o teste pode levar além das esperas dele: abrir o Python (o primeiro baixa o ambiente). */
const LOAD_MS = 30_000
/** Quanto a execução espera, depois de começar, antes de ler o começo (o primeiro desenho). */
const SETTLE_MS = 250
/** O que as mensagens do programa guardam (o mesmo do piloto do JavaScript). */
const MAX_CONSOLE_CHARS = 50_000
const PRESS_MS = 80

/** O que o executor usa do controlador de execução do Python. */
export interface PythonTestController {
  getSnapshot(): PythonExecutionView
  subscribe(listener: () => void): () => void
  run(): Promise<void>
  observe(probe: StudioPythonMissionProbe): Promise<StudioPythonMissionFrameObservation>
  pressKey(key: string, down: boolean): Promise<void>
  input(requestId: string, response: { kind: 'eof' }): Promise<void>
  capture(): Promise<{ dataUrl: string } | null>
  dispose(): Promise<void>
}

export interface PythonTestControllerOptions {
  host: PythonTestHost
  project: NonNullable<ReturnType<PythonTestHost['project']>>
  environment: NonNullable<ReturnType<PythonTestHost['environment']>>
  writerEpoch: number | null
  canExecute(): boolean
  mountFrame(): { frame: HTMLIFrameElement; release(): void }
  onEvent(event: StudioRuntimeEvent): void
}

export interface RunPythonStudentTestOptions {
  test: StudioStudentTest
  host: PythonTestHost | null
  signal?: AbortSignal
  /** Testes: troca o controlador de verdade. */
  createController?: (options: PythonTestControllerOptions) => PythonTestController
  /** Testes: troca o prazo calculado. */
  timeoutMs?: number
}

/**
 * O lugar escondido da execução: na página, sem receber clique nem foco, e desenhando. ⚠️ Na tela
 * e com opacidade 0, nunca `display: none`, `visibility: hidden` ou fora da tela: o navegador para
 * o `requestAnimationFrame` de um quadro que não está desenhado (o mesmo do palco do JavaScript).
 */
export function mountHiddenPythonTestFrame(): { frame: HTMLIFrameElement; release(): void } {
  const holder = document.createElement('div')
  holder.setAttribute('aria-hidden', 'true')
  holder.setAttribute('inert', '')
  Object.assign(holder.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: `${STUDENT_TEST_VIEWPORT.width}px`,
    height: `${STUDENT_TEST_VIEWPORT.height}px`,
    opacity: '0',
    pointerEvents: 'none',
  })
  const frame = document.createElement('iframe')
  frame.title = 'Teste do programa'
  frame.setAttribute('tabindex', '-1')
  Object.assign(frame.style, { width: '100%', height: '100%', border: '0' })
  // O provedor põe o sandbox e a origem aprovada antes de carregar qualquer byte do ambiente.
  holder.append(frame)
  document.body.append(holder)
  return { frame, release: () => holder.remove() }
}

function defaultController(options: PythonTestControllerOptions): PythonTestController {
  const controller = createPythonExecutionController({
    instanceId: crypto.randomUUID(),
    environment: () => options.environment,
    project: () => options.project,
    canExecute: options.canExecute,
    writerEpoch: () => options.writerEpoch,
    // O teste não toca som.
    audioMuted: () => true,
    observation: () => true,
    background: true,
    mountFrame: options.mountFrame,
    onEvent: options.onEvent,
  })
  return {
    getSnapshot: controller.getSnapshot,
    subscribe: controller.subscribe,
    run: controller.run,
    observe: controller.observe,
    pressKey: controller.pressKey,
    input: controller.input,
    capture: controller.capture,
    dispose: controller.dispose,
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

class Unsupported extends Error {}

export async function runPythonStudentTest(
  options: RunPythonStudentTestOptions,
): Promise<StudentTestOutcome> {
  const { test, host, signal } = options
  const rule = test.rule
  if (!isRunnableStudentTestRule(rule, 'python')) return { status: 'invalid' }
  if (signal?.aborted) return { status: 'cancelled' }
  const project = host?.project() ?? null
  const environment = host?.environment() ?? null
  if (!host || !project || !environment) return { status: 'unavailable' }
  const draws = pythonCanvasExtension(project.installedExtensions) !== undefined
  // Testar o programa é do programa que desenha (a tabela da proposta); sem biblioteca de jogo, a
  // aba só oferece testar uma função.
  if (rule.type === 'behavior' && !draws) return { status: 'unsupported' }

  let consoleText = ''
  let consoleIncomplete = false
  const errors: string[] = []
  let controller: PythonTestController | null = null
  const create = options.createController ?? defaultController
  controller = create({
    host,
    project,
    environment,
    writerEpoch: host.writerEpoch(),
    canExecute: () => !signal?.aborted && host.canExecute(),
    mountFrame: mountHiddenPythonTestFrame,
    onEvent(event) {
      if (event.type === 'console' && event.stream === 'stdout' && event.text) {
        if (consoleText.length + event.text.length > MAX_CONSOLE_CHARS) consoleIncomplete = true
        else consoleText += event.text
      }
      // O teste não tem quem digite: o `input()` recebe o fim da entrada e o programa segue.
      if (event.type === 'input-request')
        void controller?.input(event.requestId, { kind: 'eof' }).catch(() => {})
    },
  })
  const running = controller

  /** Espera o programa chegar a um destes estados (ou ao erro, que encerra o teste). */
  const reach = (states: readonly PythonExecutionView['status'][]) =>
    new Promise<PythonExecutionView>((resolve) => {
      const check = () => {
        const view = running.getSnapshot()
        if (states.includes(view.status) || view.status === 'failed' || view.status === 'stopped') {
          stop()
          resolve(view)
        }
      }
      const stop = running.subscribe(check)
      check()
    })
  const consoleValue = (): ExecutionObservedValue => {
    if (consoleIncomplete) throw new Error('O console excedeu os limites de observação.')
    return { found: true, value: consoleText.replace(/\n$/, '') }
  }
  const readValue = async (path: string): Promise<ExecutionObservedValue> => {
    const { observation } = await running.observe({ type: 'value', path })
    // A leitura que deu erro (o nome existe, mas não deu para ler) conta como não achada.
    return observation.type === 'value' && observation.observed.found
      ? { found: true, value: observation.observed.value }
      : { found: false }
  }
  const failure = () => {
    const view = running.getSnapshot()
    if (view.status === 'failed' && view.error && !errors.includes(view.error))
      errors.push(view.error.slice(0, 300))
  }

  const observeBehavior = async (
    behavior: StudentTestBehaviorRule,
  ): Promise<ExecutionObservation> => {
    const target = behavior.expect.target
    const read = () =>
      target.kind === 'console'
        ? Promise.resolve(consoleValue())
        : readValue(target.kind === 'value' ? target.path : '')
    const started = await reach(['running', 'completed', 'waiting-input'])
    if (started.status === 'failed') {
      failure()
      return { id: test.id, type: 'behavior', errors }
    }
    await sleep(SETTLE_MS)
    const initial = await read()
    for (const step of behavior.steps) {
      if (step.action === 'wait') await sleep(step.ms)
      else if (step.action === 'press') {
        try {
          await running.pressKey(step.key, true)
        } catch (error) {
          // O quadro do Python de antes do comando de tecla recusa: o teste não roda aqui.
          if (running.getSnapshot().status !== 'failed') throw new Unsupported(String(error))
        }
        await sleep(step.holdMs ?? PRESS_MS)
        await running.pressKey(step.key, false).catch(() => {})
      }
      failure()
    }
    const final = await read()
    failure()
    return { id: test.id, type: 'behavior', initial, final, errors }
  }

  const observeFunction = async (
    call: RunnableStudentTestFunctionRule,
  ): Promise<ExecutionObservation> => {
    // O programa sem desenho só responde no fim: chamar enquanto ele roda prenderia a sonda.
    const started = await reach(draws ? ['running', 'completed'] : ['completed'])
    if (started.status === 'failed') {
      failure()
      return { id: test.id, type: 'functionReturns', errors }
    }
    const { observation: seen } = await running.observe({
      id: test.id,
      type: 'functionReturns',
      name: call.name,
      ...(call.module ? { module: call.module } : {}),
      args: call.cases.map((item) => item.args),
    })
    failure()
    if (seen.type !== 'functionReturns')
      return { id: test.id, type: 'functionReturns', error: 'O Python não chamou a função.' }
    if (seen.error) errors.push(seen.error.slice(0, 300))
    return {
      id: test.id,
      type: 'functionReturns',
      ...(seen.missing ? { missing: true } : {}),
      ...(seen.cases ? { cases: seen.cases } : {}),
      errors,
    }
  }

  const budget = rule.type === 'behavior' ? executionRuleBudgetMs(rule) : 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let onAbort: (() => void) | undefined
  try {
    const outcome = await Promise.race<StudentTestOutcome>([
      (async (): Promise<StudentTestOutcome> => {
        try {
          await running.run()
        } catch {
          failure()
          if (errors.length === 0) return { status: 'unavailable' }
        }
        let observation: ExecutionObservation
        try {
          observation =
            rule.type === 'behavior' ? await observeBehavior(rule) : await observeFunction(rule)
        } catch (error) {
          if (error instanceof Unsupported) return { status: 'unsupported' }
          failure()
          observation = {
            id: test.id,
            type: rule.type,
            ...(errors.length
              ? { errors }
              : { error: error instanceof Error ? error.message.slice(0, 300) : 'sem resposta' }),
          }
        }
        // O programa travado (o laço que nunca devolve o controle) não responde à leitura, e o
        // supervisor encerra a execução com este recado: é o tempo esgotado, a mesma resposta do
        // JavaScript ("o jogo demorou demais"), não um erro do jogo (lote 3 da conclusão).
        if (errors.includes(PYTHON_MISSION_UNRESPONSIVE_MESSAGE)) return { status: 'timeout' }
        const judged = judgeExecutionObservation(rule, observation)
        if (judged.passed) return { status: 'passed', observation }
        // A foto de como o programa terminou (o programa sem desenho não tem foto).
        const ending = draws ? await running.capture().catch(() => null) : null
        return {
          status: 'failed',
          detail: judged.detail ?? '',
          observation,
          ending: ending?.dataUrl ?? null,
        }
      })(),
      new Promise<StudentTestOutcome>((resolve) => {
        timer = setTimeout(
          () => resolve({ status: 'timeout' }),
          options.timeoutMs ?? budget + LOAD_MS,
        )
      }),
      new Promise<StudentTestOutcome>((resolve) => {
        onAbort = () => resolve({ status: 'cancelled' })
        signal?.addEventListener('abort', onAbort, { once: true })
      }),
    ])
    return outcome
  } finally {
    clearTimeout(timer)
    if (onAbort) signal?.removeEventListener('abort', onAbort)
    await running.dispose()
  }
}
