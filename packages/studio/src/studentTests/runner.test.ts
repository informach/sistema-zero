import { describe, expect, it } from 'bun:test'
import { createExecutionObservationCodec } from '@sistemazero/core/learning'
import type { StudioStudentTest } from '@sistemazero/core/studio/student-tests'
import { CHECK_VIEWPORT } from '../blockly/projectCheckAuthoring'
import type { PreviewDocumentFactory } from '../state/previewDocumentFactory'
import { STUDENT_TEST_MESSAGE } from './driver'
import { runStudentTest, STUDENT_TEST_VIEWPORT, type StudentTestFrame } from './runner'

/**
 * O executor sem o jogo: a fábrica de mentira devolve um documento com o piloto dentro, o quadro
 * de mentira guarda o documento e uma "janela" própria, e o teste responde por ela como o piloto
 * responderia (o piloto em si tem os testes dele, `driver.test.ts`).
 */

const encoded = (value: unknown) => createExecutionObservationCodec().encode(value, 20_000)

const pontosChegaA = (n: number): StudioStudentTest => ({
  id: 't1',
  name: 'Enter dá um ponto',
  rule: {
    type: 'behavior',
    steps: [{ action: 'press', key: 'Enter' }],
    expect: { target: { kind: 'value', path: 'pontos' }, compare: 'equals', value: n },
  },
})

const factory: PreviewDocumentFactory = ({ transformScript, trustedScripts }) =>
  `<script>${transformScript('let pontos = 0')}</script>${trustedScripts.map((s) => `<script>${s}</script>`).join('')}`

interface FakeFrame extends StudentTestFrame {
  document: string
  removed: boolean
  token: string
  answer(observation: unknown, overrides?: { token?: string; source?: object }): void
}

function fakeFrames(): { frames: FakeFrame[]; createFrame: (document: string) => FakeFrame } {
  const frames: FakeFrame[] = []
  return {
    frames,
    createFrame(document) {
      const self = {} as Window
      const token = /var token = "([a-f0-9]+)"/.exec(document)?.[1] ?? ''
      const frame: FakeFrame = {
        document,
        removed: false,
        token,
        window: self,
        remove() {
          frame.removed = true
        },
        answer(observation, overrides = {}) {
          window.dispatchEvent(
            new MessageEvent('message', {
              data: { type: STUDENT_TEST_MESSAGE, token: overrides.token ?? token, observation },
              source: (overrides.source ?? self) as Window,
            }),
          )
        },
      }
      frames.push(frame)
      return frame
    },
  }
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('o executor de "Meus testes"', () => {
  it('o palco do teste tem o tamanho do executor do servidor', () => {
    expect(STUDENT_TEST_VIEWPORT).toEqual(CHECK_VIEWPORT)
  })

  it('monta o jogo com o leitor das variáveis e o piloto, julga a resposta e tira o quadro', async () => {
    const { frames, createFrame } = fakeFrames()
    const running = runStudentTest({
      test: pontosChegaA(1),
      documentFactory: factory,
      parentOrigin: 'https://editor.test',
      createFrame,
    })
    const [frame] = frames
    if (!frame) throw new Error('o executor não montou o quadro')
    // O leitor entrou no script da criança e o piloto veio depois, com a origem do editor.
    expect(frame.document).toMatch(/__sz[a-f0-9]{24}/)
    expect(frame.document).toContain('"https://editor.test"')
    expect(frame.token).toMatch(/^[a-f0-9]{24}$/)
    frame.answer({
      initial: { found: true, value: encoded(0) },
      final: { found: true, value: encoded(1) },
      errors: [],
    })
    const outcome = await running
    expect(outcome.status).toBe('passed')
    expect(frame.removed).toBe(true)
  })

  it('a conferência que não bate reprova com o motivo da régua dos objetivos', async () => {
    const { frames, createFrame } = fakeFrames()
    const running = runStudentTest({
      test: pontosChegaA(2),
      documentFactory: factory,
      parentOrigin: 'https://editor.test',
      createFrame,
    })
    frames[0]?.answer({
      initial: { found: true, value: encoded(0) },
      final: { found: true, value: encoded(1) },
      errors: [],
    })
    const outcome = await running
    expect(outcome.status).toBe('failed')
    if (outcome.status === 'failed') expect(outcome.detail.length).toBeGreaterThan(0)
  })

  it('o erro do jogo durante o teste reprova', async () => {
    const { frames, createFrame } = fakeFrames()
    const running = runStudentTest({
      test: pontosChegaA(1),
      documentFactory: factory,
      parentOrigin: 'https://editor.test',
      createFrame,
    })
    frames[0]?.answer({
      initial: { found: true, value: encoded(0) },
      final: { found: true, value: encoded(1) },
      errors: ['pontos is not defined'],
    })
    expect((await running).status).toBe('failed')
  })

  it('ignora a resposta de outro quadro e a de outro teste; sem resposta, o tempo acaba', async () => {
    const { frames, createFrame } = fakeFrames()
    const running = runStudentTest({
      test: pontosChegaA(1),
      documentFactory: factory,
      parentOrigin: 'https://editor.test',
      createFrame,
      timeoutMs: 50,
    })
    const passou = {
      initial: { found: true, value: encoded(0) },
      final: { found: true, value: encoded(1) },
      errors: [],
    }
    frames[0]?.answer(passou, { source: {} })
    frames[0]?.answer(passou, { token: 'a'.repeat(24) })
    const outcome = await running
    expect(outcome.status).toBe('timeout')
    expect(frames[0]?.removed).toBe(true)
  })

  it('parar no meio tira o quadro', async () => {
    const { frames, createFrame } = fakeFrames()
    const controller = new AbortController()
    const running = runStudentTest({
      test: pontosChegaA(1),
      documentFactory: factory,
      parentOrigin: 'https://editor.test',
      createFrame,
      signal: controller.signal,
    })
    await tick()
    controller.abort()
    expect((await running).status).toBe('cancelled')
    expect(frames[0]?.removed).toBe(true)
  })

  it('não monta nada quando o teste sai do contrato, pede um passo que o piloto não faz ou a prévia não está pronta', async () => {
    const { frames, createFrame } = fakeFrames()
    const base = pontosChegaA(1)
    const longo: StudioStudentTest = {
      ...base,
      rule: { ...base.rule, steps: [{ action: 'wait', ms: 60_000 }] },
    }
    const clique: StudioStudentTest = {
      ...base,
      rule: {
        ...base.rule,
        steps: [
          { action: 'clickTarget', target: { kind: 'sprite', path: 'moeda', groupPath: 'moedas' } },
        ],
      },
    }
    const comum = { documentFactory: factory, parentOrigin: 'https://editor.test', createFrame }
    expect((await runStudentTest({ ...comum, test: longo })).status).toBe('invalid')
    expect((await runStudentTest({ ...comum, test: clique })).status).toBe('unsupported')
    expect(
      (await runStudentTest({ ...comum, test: base, documentFactory: () => null })).status,
    ).toBe('unavailable')
    expect((await runStudentTest({ ...comum, test: base, documentFactory: null })).status).toBe(
      'unavailable',
    )
    expect(frames).toHaveLength(0)
  })
})
