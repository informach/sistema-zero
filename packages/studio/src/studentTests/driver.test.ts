import { afterEach, describe, expect, it } from 'bun:test'
import { createExecutionObservationCodec } from '@sistemazero/core/learning'
import { buildStudentTestDriver, STUDENT_TEST_MESSAGE } from './driver'

/** O valor como o executor o manda: no envelope do codificador dos objetivos. */
const encoded = (value: unknown) => createExecutionObservationCodec().encode(value, 20_000)

/**
 * O piloto da aba "Meus testes" roda dentro do jogo. Aqui ele roda no DOM de teste com o leitor
 * das variáveis de mentira e um `parent` que anota a resposta: a ordem do executor dos objetivos
 * (começo, passos, fim), os nomes das teclas, as mensagens e o texto da página.
 */

type Posted = { message: Record<string, unknown>; origin: string }

const scope = `__sz${'d'.repeat(24)}`
const keys: string[] = []
const onKey = (event: Event) => {
  const key = event as KeyboardEvent
  keys.push(`${key.type}:${key.key}:${key.code}`)
}

afterEach(() => {
  keys.length = 0
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('keyup', onKey)
  document.body.innerHTML = ''
})

function runDriver(
  options: Omit<Parameters<typeof buildStudentTestDriver>[0], 'parentOrigin' | 'scope' | 'token'>,
  variables: Record<string, unknown>,
): Promise<Posted> {
  document.addEventListener('keydown', onKey)
  document.addEventListener('keyup', onKey)
  const reader = {
    names: () => Object.keys(variables),
    get: (name: string) => (name in variables ? { v: variables[name] } : null),
  }
  return new Promise((resolve) => {
    const parent = {
      postMessage: (message: Record<string, unknown>, origin: string) =>
        resolve({ message, origin }),
    }
    const fakeWindow = new Proxy(window, {
      get(target, key) {
        if (key === 'parent') return parent
        const value = Reflect.get(target, key)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
    const fakeGlobal = new Proxy(globalThis, {
      get(target, key) {
        if (key === scope) return reader
        return Reflect.get(target, key)
      },
    })
    new Function(
      'window',
      'globalThis',
      buildStudentTestDriver({
        ...options,
        parentOrigin: 'https://editor.test',
        scope,
        token: 't1',
      }),
    )(fakeWindow, fakeGlobal)
  })
}

describe('o piloto de "Meus testes"', () => {
  it('lê o começo, faz os passos com os nomes de tecla do navegador e lê o fim', async () => {
    const variables: Record<string, unknown> = { pontos: 0 }
    // O "jogo": cada Enter vale um ponto.
    const ponto = (event: Event) => {
      if ((event as KeyboardEvent).key === 'Enter') variables.pontos = Number(variables.pontos) + 1
    }
    document.addEventListener('keydown', ponto)
    try {
      const started = Date.now()
      const { message, origin } = await runDriver(
        {
          steps: [
            { action: 'press', key: 'Enter' },
            { action: 'press', key: 'Space', holdMs: 150 },
            { action: 'wait', ms: 100 },
            { action: 'press', key: 'a' },
          ],
          target: { kind: 'value', path: 'pontos' },
        },
        variables,
      )
      expect(origin).toBe('https://editor.test')
      expect(message).toMatchObject({ type: STUDENT_TEST_MESSAGE, token: 't1' })
      expect(message.observation).toMatchObject({
        type: 'behavior',
        initial: { found: true, value: encoded(0) },
        final: { found: true, value: encoded(1) },
        errors: [],
      })
      expect(keys).toEqual([
        'keydown:Enter:Enter',
        'keyup:Enter:Enter',
        'keydown: :Space',
        'keyup: :Space',
        'keydown:a:KeyA',
        'keyup:a:KeyA',
      ])
      // 250 ms de folga antes e depois, 80 + 150 + 100 + 80 ms de passos.
      expect(Date.now() - started).toBeGreaterThanOrEqual(900)
    } finally {
      document.removeEventListener('keydown', ponto)
    }
  })

  it('lê um caminho dentro da variável (a posição x do sprite) e diz quando não acha', async () => {
    const { message } = await runDriver(
      { steps: [], target: { kind: 'value', path: 'heroi.x' } },
      { heroi: { x: 412, y: 10 } },
    )
    expect(message.observation).toMatchObject({ final: { found: true, value: encoded(412) } })
    const { message: semNada } = await runDriver(
      { steps: [], target: { kind: 'value', path: 'vilao.x' } },
      {},
    )
    expect(semNada.observation).toMatchObject({ final: { found: false } })
  })

  it('as mensagens do jogo e o texto da página', async () => {
    document.body.innerHTML = '<p>Moedas: 3</p>'
    const { message: texto } = await runDriver({ steps: [], target: { kind: 'text' } }, {})
    expect(texto.observation).toMatchObject({ final: { found: true } })
    expect(String((texto.observation as { final: { value: string } }).final.value)).toContain(
      'Moedas: 3',
    )
  })
})
