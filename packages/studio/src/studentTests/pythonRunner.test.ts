import { describe, expect, it } from 'bun:test'
import type {
  StudioPythonMissionFrameObservation,
  StudioPythonMissionProbe,
} from '@sistemazero/core/studio/python-mission-observation'
import type { StudioStudentTest } from '@sistemazero/core/studio/student-tests'
import type { PythonClassicProjectDocument } from '../core/pythonProject'
import type { StudioRuntimeEnvironment } from '../runtime/environment'
import type { PythonExecutionView } from '../runtime/python/controller'
import { PGZERO_EXTENSION } from '../runtime/python/pgzero/contract'
import type { StudioRuntimeEvent } from '../runtime/types'
import { documentFixture } from '../state/fixtures/projectDocuments'
import type { PythonTestHost } from '../state/pythonTestHost'
import {
  type PythonTestController,
  type PythonTestControllerOptions,
  runPythonStudentTest,
} from './pythonRunner'

/** Meus testes no Python (proposta aprovada em 20/11/2026): o executor, com um controlador falso. */

const semDesenho = documentFixture('python', 'classic') as PythonClassicProjectDocument
const comDesenho = {
  ...semDesenho,
  installedExtensions: [{ ...PGZERO_EXTENSION, installedAt: 1 }],
} as PythonClassicProjectDocument

function hostFor(project: PythonClassicProjectDocument | null): PythonTestHost {
  return {
    environment: () => ({}) as StudioRuntimeEnvironment,
    project: () => project,
    writerEpoch: () => null,
    canExecute: () => true,
  }
}

interface Fake {
  /** O que a execução faz ao Rodar (o estado a que chega). */
  runTo?: PythonExecutionView['status']
  error?: string
  value?: (path: string, pressed: string[]) => unknown
  functionAnswer?: (args: unknown[]) => unknown
  missing?: boolean
  keysRefused?: boolean
  console?: string
}

function fakeController(fake: Fake) {
  const calls = {
    pressed: [] as string[],
    disposed: false,
    probes: [] as StudioPythonMissionProbe[],
  }
  const create = (options: PythonTestControllerOptions): PythonTestController => {
    let view: PythonExecutionView = { status: 'idle' }
    const listeners = new Set<() => void>()
    const publish = (next: PythonExecutionView) => {
      view = next
      for (const listener of listeners) listener()
    }
    return {
      getSnapshot: () => view,
      subscribe(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      async run() {
        publish({ status: 'ready' })
        setTimeout(() => {
          if (fake.console)
            options.onEvent({
              type: 'console',
              stream: 'stdout',
              text: fake.console,
            } as StudioRuntimeEvent)
          publish(
            fake.runTo === 'failed'
              ? { status: 'failed', error: fake.error ?? 'NameError' }
              : { status: fake.runTo ?? 'running' },
          )
        }, 5)
      },
      async observe(probe): Promise<StudioPythonMissionFrameObservation> {
        calls.probes.push(probe)
        if (probe.type === 'functionReturns')
          return {
            observation: fake.missing
              ? { id: probe.id, type: 'functionReturns', missing: true }
              : {
                  id: probe.id,
                  type: 'functionReturns',
                  cases: probe.args.map((args) => ({
                    ok: true,
                    value: (fake.functionAnswer?.(args) ?? null) as never,
                  })),
                },
          }
        const value = fake.value?.(probe.path, calls.pressed)
        return {
          observation: {
            type: 'value',
            observed:
              value === undefined ? { found: false } : { found: true, value: value as never },
          },
        }
      },
      async pressKey(key, down) {
        if (fake.keysRefused) throw new Error('Comando de execução inválido.')
        if (down) calls.pressed.push(key)
      },
      async input() {},
      async capture() {
        return { dataUrl: 'data:image/png;base64,fim' }
      },
      async dispose() {
        calls.disposed = true
        listeners.clear()
      },
    }
  }
  return { create, calls }
}

const dobro: StudioStudentTest = {
  id: 'dobro',
  name: 'O dobro',
  rule: {
    type: 'functionReturns',
    name: 'dobro',
    cases: [
      { args: [2], expected: 4 },
      { args: [5], expected: 10 },
    ],
  },
}

const pontosSobem: StudioStudentTest = {
  id: 'pontos',
  name: 'Espaço dá ponto',
  rule: {
    type: 'behavior',
    steps: [{ action: 'press', key: 'Space' }],
    expect: { target: { kind: 'value', path: 'pontos' }, compare: 'increased' },
  },
}

describe('Meus testes no Python: testar uma função', () => {
  it('chama a função com os casos da criança, no fim do programa sem desenho', async () => {
    const { create, calls } = fakeController({
      runTo: 'completed',
      functionAnswer: ([n]) => Number(n) * 2,
    })
    const outcome = await runPythonStudentTest({
      test: dobro,
      host: hostFor(semDesenho),
      createController: create,
    })
    expect(outcome.status).toBe('passed')
    expect(calls.probes).toEqual([
      { id: 'dobro', type: 'functionReturns', name: 'dobro', args: [[2], [5]] },
    ])
    expect(calls.disposed).toBe(true)
  })

  it('a resposta errada não passa, e diz o caso', async () => {
    const { create } = fakeController({
      runTo: 'completed',
      functionAnswer: ([n]) => Number(n) + 2,
    })
    const outcome = await runPythonStudentTest({
      test: dobro,
      host: hostFor(semDesenho),
      createController: create,
    })
    expect(outcome.status).toBe('failed')
    if (outcome.status === 'failed') {
      expect(outcome.detail).toContain('respondeu 7')
      // O programa sem desenho não tem foto.
      expect(outcome.ending).toBeNull()
    }
  })

  it('a função que não existe não passa', async () => {
    const { create } = fakeController({ runTo: 'completed', missing: true })
    const outcome = await runPythonStudentTest({
      test: dobro,
      host: hostFor(semDesenho),
      createController: create,
    })
    expect(outcome.status).toBe('failed')
    if (outcome.status === 'failed') expect(outcome.observation.missing).toBe(true)
  })

  it('o programa que dá erro antes não passa', async () => {
    const { create } = fakeController({ runTo: 'failed', error: 'NameError: x' })
    const outcome = await runPythonStudentTest({
      test: dobro,
      host: hostFor(semDesenho),
      createController: create,
    })
    expect(outcome.status).toBe('failed')
    if (outcome.status === 'failed') expect(outcome.observation.errors).toEqual(['NameError: x'])
  })

  it('o programa que não termina estoura o prazo, e a execução escondida sai', async () => {
    const { create, calls } = fakeController({ runTo: 'running' })
    const outcome = await runPythonStudentTest({
      test: dobro,
      host: hostFor(semDesenho),
      createController: create,
      timeoutMs: 100,
    })
    expect(outcome.status).toBe('timeout')
    expect(calls.disposed).toBe(true)
  })
})

describe('Meus testes no Python: testar o programa', () => {
  it('aperta a tecla pelo quadro e lê a variável antes e depois', async () => {
    const { create, calls } = fakeController({
      value: (_path, pressed) => pressed.length,
    })
    const outcome = await runPythonStudentTest({
      test: pontosSobem,
      host: hostFor(comDesenho),
      createController: create,
    })
    expect(outcome.status).toBe('passed')
    expect(calls.pressed).toEqual(['Space'])
  })

  it('o quadro do Python que não aperta teclas: o teste não roda aqui', async () => {
    const { create } = fakeController({ value: () => 0, keysRefused: true })
    const outcome = await runPythonStudentTest({
      test: pontosSobem,
      host: hostFor(comDesenho),
      createController: create,
    })
    expect(outcome.status).toBe('unsupported')
  })

  it('confere as mensagens do programa (o print)', async () => {
    const { create } = fakeController({ console: 'Olá\n' })
    const outcome = await runPythonStudentTest({
      test: {
        id: 'ola',
        name: 'Diz olá',
        rule: {
          type: 'behavior',
          steps: [{ action: 'wait', ms: 10 }],
          expect: { target: { kind: 'console' }, compare: 'equals', value: 'Olá' },
        },
      },
      host: hostFor(comDesenho),
      createController: create,
    })
    expect(outcome.status).toBe('passed')
  })

  it('a variável que não mudou não passa, com a foto do fim', async () => {
    const { create } = fakeController({ value: () => 3 })
    const outcome = await runPythonStudentTest({
      test: pontosSobem,
      host: hostFor(comDesenho),
      createController: create,
    })
    expect(outcome.status).toBe('failed')
    if (outcome.status === 'failed') expect(outcome.ending).toBe('data:image/png;base64,fim')
  })

  it('sem biblioteca de jogo, a aba só testa função', async () => {
    const { create } = fakeController({ value: () => 0 })
    expect(
      (
        await runPythonStudentTest({
          test: pontosSobem,
          host: hostFor(semDesenho),
          createController: create,
        })
      ).status,
    ).toBe('unsupported')
  })
})

describe('Meus testes no Python: o que não roda', () => {
  it('teste fora do contrato do Python, sem prévia, cancelado', async () => {
    const { create } = fakeController({})
    const texto: StudioStudentTest = {
      ...pontosSobem,
      rule: {
        type: 'behavior',
        steps: [],
        expect: { target: { kind: 'text' }, compare: 'contains', value: 'Oi' },
      },
    }
    expect(
      (
        await runPythonStudentTest({
          test: texto,
          host: hostFor(comDesenho),
          createController: create,
        })
      ).status,
    ).toBe('invalid')
    expect(
      (await runPythonStudentTest({ test: dobro, host: null, createController: create })).status,
    ).toBe('unavailable')
    expect(
      (await runPythonStudentTest({ test: dobro, host: hostFor(null), createController: create }))
        .status,
    ).toBe('unavailable')
    const aborted = new AbortController()
    aborted.abort()
    expect(
      (
        await runPythonStudentTest({
          test: dobro,
          host: hostFor(semDesenho),
          createController: create,
          signal: aborted.signal,
        })
      ).status,
    ).toBe('cancelled')
  })
})
