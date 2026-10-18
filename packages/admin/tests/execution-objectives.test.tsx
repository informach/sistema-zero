import { describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  isSectionCompletion,
  type SectionCompletion,
  type SectionProjectCheck,
} from '@sistemazero/core/learning'
import {
  describeExecutionRule,
  formatArgs,
  newExecutionRule,
  parseArgs,
  parseExpected,
  parseExpectedValue,
} from '../src/lib/execution-rule'
import {
  ExecutionTestRejectedError,
  runExecutionTest,
  testSectionObjectives,
} from '../src/lib/objectives-test'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { SectionCompletionEditor } = await import(
  '../src/components/editor/section-completion-editor'
)

const anda: SectionProjectCheck = {
  id: 'anda',
  label: 'O herói anda',
  rule: {
    type: 'behavior',
    steps: [{ action: 'press', key: 'ArrowRight', holdMs: 500 }],
    expect: { target: { kind: 'value', path: 'heroi.x' }, compare: 'changed' },
  },
}
const laco: SectionProjectCheck = { id: 'laco', label: 'Use um laço', rule: { type: 'usesLoop' } }

describe('a autoria dos objetivos que rodam o jogo', () => {
  test('o valor esperado e os casos da função são digitados como a professora pensa', () => {
    expect(parseExpectedValue('10', 'equals')).toBe(10)
    expect(parseExpectedValue('2,5', 'atLeast')).toBe(2.5)
    expect(parseExpectedValue('verdadeiro', 'equals')).toBe(true)
    expect(parseExpectedValue('10', 'contains')).toBe('10')
    expect(parseArgs('3, 4')).toEqual([3, 4])
    expect(parseArgs('[1, "oi"]')).toEqual([1, 'oi'])
    expect(parseArgs('3,,')).toBeNull()
    expect(parseArgs('')).toEqual([])
    expect(formatArgs([3, 'oi'])).toBe('3, "oi"')
    expect(parseExpected('[1, 2]')).toEqual([1, 2])
    expect(parseExpected('venceu')).toBe('venceu')
    expect(parseExpected('{quebrado')).toBeUndefined()
  })

  test('cada objetivo novo nasce válido para o core, menos o que a professora precisa escrever', () => {
    const behavior = newExecutionRule('behavior', true)
    expect(
      isSectionCompletion({
        version: 1,
        blockIds: [],
        projectChecks: [{ id: 'a', label: 'x', rule: behavior }],
      }),
    ).toBe(true)
    expect(describeExecutionRule(anda.rule as Parameters<typeof describeExecutionRule>[0])).toBe(
      'O jogo faz algo: segurar seta para a direita por 500 ms; conferir se heroi.x mudou',
    )
  })

  test('o "Testar agora" junta a estrutura (na hora) e a execução (do executor)', () => {
    const workspace = { initialProject: {}, solutionProject: {} }
    const antes = testSectionObjectives([laco, anda], workspace)
    expect(antes.rows[1]).toMatchObject({ initial: 'pending', solution: 'pending' })
    const depois = testSectionObjectives([laco, anda], workspace, {
      initial: { results: [{ id: 'anda', passed: false }] },
      solution: {
        results: [{ id: 'anda', passed: false, detail: 'o herói não andou' }],
        screenshots: { anda: 'anBn' },
      },
    })
    expect(depois.rows[1]).toEqual({
      id: 'anda',
      label: 'O herói anda',
      optional: false,
      initial: false,
      solution: false,
      solutionDetail: 'o herói não andou',
      screenshot: 'anBn',
    })
    expect(depois.problems).toContain(
      'O gabarito não cumpre "O herói anda". Ajuste o gabarito ou o objetivo antes de publicar.',
    )
    const falhou = testSectionObjectives([anda], workspace, { initial: 'error', solution: 'error' })
    expect(falhou.notes[0]).toContain('Não consegui rodar o jogo agora')
    // Sem gabarito, quem roda o jogo não publica: vira problema, não aviso.
    expect(testSectionObjectives([anda], { initialProject: {} }).problems[0]).toContain(
      'precisam do gabarito',
    )
  })

  test('só os objetivos que rodam o jogo vão ao executor', async () => {
    const sent: unknown[] = []
    const outcome = await runExecutionTest({ nome: 'p' }, [laco, anda], (async (
      _url: string,
      init: RequestInit,
    ) => {
      sent.push(JSON.parse(String(init.body)))
      return Response.json({ results: [{ id: 'anda', passed: true }] })
    }) as unknown as typeof fetch)
    expect(outcome.results).toEqual([{ id: 'anda', passed: true }])
    expect(sent).toEqual([{ project: { nome: 'p' }, checks: [{ id: 'anda', rule: anda.rule }] }])
    await expect(
      runExecutionTest(
        {},
        [anda],
        (async () => new Response('', { status: 503 })) as unknown as typeof fetch,
      ),
    ).rejects.toThrow()
  })

  test('recusa do executor: o motivo vira problema, não "tente de novo"', async () => {
    const sent: unknown[] = []
    const recusa = (async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)))
      return Response.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Escolha o modelo Pro do bloco.' } },
        { status: 400 },
      )
    }) as unknown as typeof fetch
    const inicial = { kind: 'pro', nome: 'inicial' }
    const erro = await runExecutionTest({ kind: 'pro' }, [anda], recusa, inicial).catch((e) => e)
    expect(erro).toBeInstanceOf(ExecutionTestRejectedError)
    expect((erro as Error).message).toBe('Escolha o modelo Pro do bloco.')
    // O gabarito vai com o projeto inicial (o servidor confere tipo e modelo); o inicial, sozinho.
    expect(sent[0]).toMatchObject({ initialProject: inicial })
    await runExecutionTest(inicial, [anda], recusa, inicial).catch(() => {})
    expect(sent[1]).not.toHaveProperty('initialProject')
    const report = testSectionObjectives(
      [anda],
      { initialProject: {}, solutionProject: {} },
      { initial: { results: [] }, solution: { rejected: 'Escolha o modelo Pro do bloco.' } },
    )
    expect(report.problems).toContain('No gabarito: Escolha o modelo Pro do bloco.')
    expect(report.notes.join(' ')).not.toContain('Não consegui rodar o jogo agora')
  })
})

test('a professora monta "o jogo faz algo" no editor e testa contra o gabarito', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let value: SectionCompletion = {
    version: 1,
    blockIds: [],
    projectChecks: [{ id: 'c1', label: 'O herói anda', rule: { type: 'usesLoop' } }],
  }
  const calls: unknown[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body))
    calls.push(body)
    return Response.json({
      results: [{ id: 'c1', passed: body.project.name === 'solution' }],
      screenshots: { c1: 'anBn' },
    })
  }) as unknown as typeof fetch
  const workspace = {
    initialProject: { name: 'initial', files: {} },
    solutionProject: { name: 'solution', files: {} },
  }
  const render = () =>
    root.render(
      <SectionCompletionEditor
        value={value}
        candidates={[]}
        hasStudio
        workspace={workspace}
        onChange={(next) => {
          value = next
          render()
        }}
      />,
    )
  try {
    await act(async () => render())
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent === 'Editar objetivo')!
        .click(),
    )
    await act(async () => {
      const select = container.querySelector<HTMLSelectElement>(
        'select[aria-label="Regra do objetivo 1"]',
      )!
      select.value = 'behavior'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(value.projectChecks?.[0]?.rule.type).toBe('behavior')
    await act(async () => {
      const input = container.querySelector<HTMLInputElement>(
        'input[aria-label="Variável do objetivo 1"]',
      )!
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, 'heroi.x')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const rule = value.projectChecks?.[0]?.rule
    expect(rule).toMatchObject({ expect: { target: { kind: 'value', path: 'heroi.x' } } })
    expect(isSectionCompletion(value)).toBe(true)
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent === 'Testar agora')!
        .click(),
    )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
    // Inicial e gabarito, cada um num pedido.
    expect(calls).toHaveLength(2)
    expect(container.textContent).toContain('gabarito cumpre')
    expect(container.querySelector('img[alt^="Tela do gabarito"]')).not.toBeNull()
    expect(container.textContent).toContain('Nenhum problema nos objetivos.')
    const unavailable = Promise.withResolvers<void>()
    globalThis.fetch = Object.assign(
      async () => {
        await unavailable.promise
        return new Response('', { status: 503 })
      },
      { preconnect: realFetch.preconnect },
    )
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent === 'Testar agora')!
        .click(),
    )
    expect(container.textContent).toContain('testando…')
    expect(container.textContent).not.toContain('Nenhum problema nos objetivos.')
    await act(async () => {
      unavailable.resolve()
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
    expect(container.textContent).toContain('não deu para testar')
    expect(container.textContent).not.toContain('Nenhum problema nos objetivos.')
  } finally {
    globalThis.fetch = realFetch
    await act(async () => root.unmount())
    container.remove()
  }
})
