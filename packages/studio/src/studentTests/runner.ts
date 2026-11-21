import {
  type ExecutionObservation,
  type ExecutionObservedValue,
  executionRuleBudgetMs,
  judgeExecutionObservation,
} from '@sistemazero/core/learning'
import { isRunnableStudentTestRule } from '@sistemazero/core/studio/student-test-runnable'
import type {
  StudentTestBehaviorRule,
  StudioStudentTest,
} from '@sistemazero/core/studio/student-tests'
import { createCheckScope, instrumentCheckScript } from '../check/instrumentCheckScript'
import { isPreviewSnapshotMessage, PREVIEW_SNAPSHOT_REQUEST } from '../preview/snapshotBridge'
import type { PreviewDocumentFactory } from '../state/previewDocumentFactory'
import { buildStudentTestDriver, STUDENT_TEST_MESSAGE } from './driver'
import { STUDENT_TEST_VIEWPORT, type StudentTestOutcome } from './outcome'

export { STUDENT_TEST_VIEWPORT, type StudentTestOutcome } from './outcome'

/**
 * O executor de um teste da aba "Meus testes" (proposta aprovada em 20/11/2026). Pede à prévia o
 * documento do jogo com o leitor das variáveis e o piloto (`driver.ts`), roda num quadro escondido
 * da página do editor, espera a resposta do piloto e julga com a régua dos objetivos das aulas
 * (`judgeExecutionObservation`). O projeto não muda: o teste roda do zero e o quadro sai no fim.
 *
 * Este módulo é baixado só quando a aba roda um teste (ele traz o analisador do instrumentador e
 * o validador dos objetivos, que não cabem no pacote de abertura do Estúdio).
 */

/**
 * Quanto o teste pode levar além das esperas dele: abrir o jogo, os modelos 3D (até 10 s, como o
 * piloto espera) e as duas folgas de 250 ms.
 */
const LOAD_MS = 15_000
const MODELS_WAIT_MS = 10_000
const SETTLE_MS = 500
/** Quanto o executor espera a foto do fim de um teste que não passou. */
const ENDING_WAIT_MS = 1500

/** O quadro do teste: o documento montado e um jeito de tirá-lo da página. */
export interface StudentTestFrame {
  readonly window: Window | null
  remove(): void
}

export interface RunStudentTestOptions {
  test: StudioStudentTest
  documentFactory: PreviewDocumentFactory | null
  /** A origem do editor (as mensagens do piloto vêm para ela). */
  parentOrigin: string
  signal?: AbortSignal
  /** Testes: troca o quadro de verdade. */
  createFrame?: (document: string) => StudentTestFrame
  /** Testes: troca o prazo calculado. */
  timeoutMs?: number
  /** Testes: troca a espera pela foto do fim. */
  endingWaitMs?: number
}

/** Os passos que o piloto sabe fazer: teclas, esperas e o clique no sprite de um grupo. */
function pilotCanRun(rule: StudentTestBehaviorRule): boolean {
  return rule.steps.every(
    (step) => step.action === 'press' || step.action === 'wait' || step.action === 'clickTarget',
  )
}

/** O quadro escondido de verdade: na página, sem receber clique nem foco, e desenhando. */
export function createHiddenStudentTestFrame(document: string): StudentTestFrame {
  const frame = window.document.createElement('iframe')
  frame.title = 'Teste do jogo'
  frame.setAttribute('aria-hidden', 'true')
  frame.setAttribute('tabindex', '-1')
  frame.setAttribute('inert', '')
  // Sem `allow-modals`: um `alert()` do jogo não segura o teste.
  frame.setAttribute('sandbox', 'allow-scripts')
  // ⚠️ Na tela e com opacidade 0, nunca `display: none`, `visibility: hidden` ou fora da tela: o
  // navegador para o `requestAnimationFrame` de um quadro que não está desenhado, e o jogo não
  // andaria (o mesmo motivo da captura de capa, `cover/coverCapture.ts`).
  Object.assign(frame.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: `${STUDENT_TEST_VIEWPORT.width}px`,
    height: `${STUDENT_TEST_VIEWPORT.height}px`,
    opacity: '0',
    pointerEvents: 'none',
    border: '0',
  })
  frame.srcdoc = document
  window.document.body.appendChild(frame)
  return {
    get window() {
      return frame.contentWindow
    },
    remove: () => frame.remove(),
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function observedValue(value: unknown): ExecutionObservedValue | undefined {
  if (!isRecord(value) || typeof value.found !== 'boolean') return undefined
  return value.found ? { found: true, value: value.value } : { found: false }
}

/**
 * A resposta do piloto como observação dos objetivos. Ela vem do mesmo contexto do jogo da
 * criança (que poderia escrevê-la à mão): só a forma é conferida, e um teste que a própria
 * criança escreve sobre o próprio jogo não vale nota.
 */
function toObservation(id: string, raw: unknown): ExecutionObservation {
  const data = isRecord(raw) ? raw : {}
  const errors = Array.isArray(data.errors)
    ? data.errors.filter((item): item is string => typeof item === 'string').slice(0, 5)
    : []
  if (typeof data.error === 'string') return { id, type: 'behavior', error: data.error, errors }
  return {
    id,
    type: 'behavior',
    initial: observedValue(data.initial),
    final: observedValue(data.final),
    errors,
  }
}

export async function runStudentTest(options: RunStudentTestOptions): Promise<StudentTestOutcome> {
  const { test, signal } = options
  const rule = test.rule
  if (!isRunnableStudentTestRule(rule)) return { status: 'invalid' }
  // O teste de função é do Python (o JavaScript clássico testa o jogo, tabela da proposta).
  if (rule.type !== 'behavior' || !pilotCanRun(rule)) return { status: 'unsupported' }
  if (signal?.aborted) return { status: 'cancelled' }
  if (!options.documentFactory) return { status: 'unavailable' }
  const scope = createCheckScope()
  const token = createCheckScope().slice(4)
  const built = await options.documentFactory({
    transformScript: (source) => instrumentCheckScript(source, scope),
    trustedScripts: [
      buildStudentTestDriver({
        parentOrigin: options.parentOrigin,
        scope,
        token,
        steps: rule.steps,
        target: rule.expect.target,
      }),
    ],
    parentOrigin: options.parentOrigin,
    runtimeInspection: rule.steps.some((step) => step.action === 'clickTarget'),
  })
  if ('unavailable' in built)
    return { status: built.unavailable === 'unsaved' ? 'unsaved' : 'unavailable' }
  if (signal?.aborted) return { status: 'cancelled' }
  const document = built.document

  return new Promise((resolve) => {
    const frame = (options.createFrame ?? createHiddenStudentTestFrame)(document)
    const timeoutMs =
      options.timeoutMs ?? executionRuleBudgetMs(rule) + MODELS_WAIT_MS + SETTLE_MS + LOAD_MS
    let settled = false
    const finish = (outcome: StudentTestOutcome) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      signal?.removeEventListener('abort', onAbort)
      frame.remove()
      resolve(outcome)
    }
    let failed: Omit<Extract<StudentTestOutcome, { status: 'failed' }>, 'ending'> | null = null
    const onMessage = (event: MessageEvent) => {
      // Só o quadro deste teste, e só a resposta deste teste (um quadro antigo não responde por ele).
      if (!frame.window || event.source !== frame.window) return
      const data: unknown = event.data
      if (failed) {
        // A foto do fim (a ponte da capa, `preview/snapshotBridge.ts`, que todo documento tem).
        if (isPreviewSnapshotMessage(data)) finish({ ...failed, ending: data.dataUrl })
        return
      }
      if (!isRecord(data) || data.type !== STUDENT_TEST_MESSAGE || data.token !== token) return
      const observation = toObservation(test.id, data.observation)
      const judged = judgeExecutionObservation(rule, observation)
      if (judged.passed) {
        finish({ status: 'passed', observation })
        return
      }
      // O teste não passou: antes de tirar o quadro, a foto de como o jogo terminou.
      failed = { status: 'failed', detail: judged.detail ?? '', observation }
      clearTimeout(timer)
      const pending = failed
      timer = setTimeout(
        () => finish({ ...pending, ending: null }),
        options.endingWaitMs ?? ENDING_WAIT_MS,
      )
      // A origem do quadro é opaca (sandbox sem `allow-same-origin`): não há origem para mirar. A
      // ponte do outro lado só atende o próprio `parent`, e a resposta volta com a origem do editor.
      frame.window.postMessage({ type: PREVIEW_SNAPSHOT_REQUEST }, '*')
    }
    const onAbort = () => finish({ status: 'cancelled' })
    let timer = setTimeout(() => finish({ status: 'timeout' }), timeoutMs)
    window.addEventListener('message', onMessage)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
