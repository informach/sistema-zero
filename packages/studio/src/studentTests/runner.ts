import {
  type ExecutionObservation,
  type ExecutionObservedValue,
  executionRuleBudgetMs,
  judgeExecutionObservation,
} from '@sistemazero/core/learning'
import { isRunnableStudentTestRule } from '@sistemazero/core/studio/student-test-runnable'
import type { StudioStudentTest } from '@sistemazero/core/studio/student-tests'
import { createCheckScope, instrumentCheckScript } from '../check/instrumentCheckScript'
import type { PreviewDocumentFactory } from '../state/previewDocumentFactory'
import { buildStudentTestDriver, STUDENT_TEST_MESSAGE } from './driver'

/**
 * O executor de um teste da aba "Meus testes" (proposta aprovada em 20/11/2026). Pede à prévia o
 * documento do jogo com o leitor das variáveis e o piloto (`driver.ts`), roda num quadro escondido
 * da página do editor, espera a resposta do piloto e julga com a régua dos objetivos das aulas
 * (`judgeExecutionObservation`). O projeto não muda: o teste roda do zero e o quadro sai no fim.
 *
 * Este módulo é baixado só quando a aba roda um teste (ele traz o analisador do instrumentador e
 * o validador dos objetivos, que não cabem no pacote de abertura do Estúdio).
 */

/** O tamanho do palco do teste: o mesmo do executor do servidor (`CHECK_VIEWPORT`). */
export const STUDENT_TEST_VIEWPORT = { width: 1024, height: 640 } as const

/**
 * Quanto o teste pode levar além das esperas dele: abrir o jogo, os modelos 3D (até 10 s, como o
 * piloto espera) e as duas folgas de 250 ms.
 */
const LOAD_MS = 15_000
const MODELS_WAIT_MS = 10_000
const SETTLE_MS = 500

export type StudentTestOutcome =
  | { status: 'passed'; observation: ExecutionObservation }
  | { status: 'failed'; detail: string; observation: ExecutionObservation }
  /** O jogo não respondeu a tempo (abriu travado, ou um passo nunca terminou). */
  | { status: 'timeout' }
  /** O teste não segue o contrato inteiro (um passo ou uma conferência fora dos limites). */
  | { status: 'invalid' }
  /** Um passo que este executor ainda não sabe fazer. */
  | { status: 'unsupported' }
  /** A prévia não tem como montar o jogo agora (os materiais ou os motores chegando). */
  | { status: 'unavailable' }
  | { status: 'cancelled' }

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
}

/** Os passos que o piloto sabe fazer hoje (o clique no sprite vem depois). */
function pilotCanRun(test: StudioStudentTest): boolean {
  return test.rule.steps.every((step) => step.action === 'press' || step.action === 'wait')
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

export function runStudentTest(options: RunStudentTestOptions): Promise<StudentTestOutcome> {
  const { test, signal } = options
  if (!isRunnableStudentTestRule(test.rule)) return Promise.resolve({ status: 'invalid' })
  if (!pilotCanRun(test)) return Promise.resolve({ status: 'unsupported' })
  if (signal?.aborted) return Promise.resolve({ status: 'cancelled' })
  const scope = createCheckScope()
  const token = createCheckScope().slice(4)
  const document = options.documentFactory?.({
    transformScript: (source) => instrumentCheckScript(source, scope),
    trustedScripts: [
      buildStudentTestDriver({
        parentOrigin: options.parentOrigin,
        scope,
        token,
        steps: test.rule.steps,
        target: test.rule.expect.target,
      }),
    ],
    parentOrigin: options.parentOrigin,
  })
  if (!document) return Promise.resolve({ status: 'unavailable' })

  return new Promise((resolve) => {
    const frame = (options.createFrame ?? createHiddenStudentTestFrame)(document)
    const timeoutMs =
      options.timeoutMs ?? executionRuleBudgetMs(test.rule) + MODELS_WAIT_MS + SETTLE_MS + LOAD_MS
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
    const onMessage = (event: MessageEvent) => {
      // Só o quadro deste teste, e só a resposta deste teste (um quadro antigo não responde por ele).
      if (!frame.window || event.source !== frame.window) return
      const data: unknown = event.data
      if (!isRecord(data) || data.type !== STUDENT_TEST_MESSAGE || data.token !== token) return
      const observation = toObservation(test.id, data.observation)
      const judged = judgeExecutionObservation(test.rule, observation)
      finish(
        judged.passed
          ? { status: 'passed', observation }
          : { status: 'failed', detail: judged.detail ?? '', observation },
      )
    }
    const onAbort = () => finish({ status: 'cancelled' })
    const timer = setTimeout(() => finish({ status: 'timeout' }), timeoutMs)
    window.addEventListener('message', onMessage)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
