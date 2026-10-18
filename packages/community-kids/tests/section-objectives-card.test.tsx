import { afterEach, describe, expect, mock, test } from 'bun:test'
import {
  type LessonPlayerContextValue,
  LessonPlayerProvider,
} from '@sistemazero/member-shell/components/lesson-player-context'
import {
  type ProjectChangeSubscriber,
  SectionProjectCheck,
} from '@sistemazero/member-shell/components/studio/section-project-check'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { KidsLessonCopy } from '@/components/kids/kids-lesson-copy'

/**
 * O cartão dos Objetivos da parte (18/10/2026): obrigatórios e extras separados, a dica só depois
 * de verificar e não passar, o resultado guardado ao reabrir, a marca "você mexeu depois" e o XP.
 */
afterEach(cleanup)
const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

const OBJECTIVES = [
  { id: 'laco', label: 'Use um laço', hint: 'Procure em Laços', kind: 'idea' as const },
  { id: 'funcao', label: 'Crie a função pular', optional: true as const, kind: 'idea' as const },
]

function montar(opts: {
  saved?: { id: string; passed: boolean }[]
  subscribe?: ProjectChangeSubscriber
  updatedAt?: number
  objectives?: typeof OBJECTIVES
  save?: () => Promise<void>
}) {
  const value: LessonPlayerContextValue = {
    lessonId: 'aula',
    courseSlug: 'curso',
    viewerId: 'perfil',
    viewerWatermark: null,
    initialPositionSeconds: null,
    refreshAfterLearning: () => {},
    sectionProjectCheck: {
      sectionId: 'parte',
      revision: 'r'.repeat(32),
      blockId: 'projeto',
      objectives: opts.objectives ?? OBJECTIVES,
      ...(opts.saved ? { savedResults: opts.saved } : {}),
    },
  }
  const handleRef = {
    current: {
      getProject: () => ({ id: 'p', updatedAt: opts.updatedAt ?? 1000 }),
      save: opts.save ?? (async () => {}),
    } as never,
  }
  return render(
    <KidsLessonCopy>
      <LessonPlayerProvider value={value}>
        <SectionProjectCheck
          blockId="projeto"
          handleRef={handleRef}
          subscribeProjectChanges={opts.subscribe}
        />
      </LessonPlayerProvider>
    </KidsLessonCopy>,
  )
}

const estado = (label: string) =>
  screen.getByText(label).closest('[data-state]')?.getAttribute('data-state')

describe('Objetivos da parte', () => {
  test('a verificação aguarda a gravação do editor antes de enviar o projeto', async () => {
    let finishSave: () => void = () => {}
    const saved = new Promise<void>((resolve) => {
      finishSave = resolve
    })
    const request = mock(async () =>
      Response.json({ passed: true, results: OBJECTIVES.map(({ id }) => ({ id, passed: true })) }),
    )
    globalThis.fetch = request as unknown as typeof fetch
    montar({ save: () => saved })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Verificar esta parte' }))
    })
    expect(request).toHaveBeenCalledTimes(0)
    await act(async () => finishSave())
    expect(request).toHaveBeenCalledTimes(1)
    expect(estado('Use um laço')).toBe('passed')
  })

  test('obrigatórios e extras em listas separadas; nada verificado ainda', () => {
    montar({})
    expect(screen.getByText('Desafio extra')).toBeTruthy()
    expect(estado('Use um laço')).toBe('unchecked')
    expect(estado('Crie a função pular')).toBe('unchecked')
    expect(screen.getByText('Crie a função pular').closest('[data-extra]')).toBeTruthy()
    // A dica não aparece antes de verificar (tiraria a descoberta).
    expect(screen.queryByText('Procure em Laços')).toBeNull()
  })

  test('verificar: o que falta mostra a dica; o XP aparece quando vem', async () => {
    globalThis.fetch = mock(async () =>
      Response.json({
        passed: false,
        results: [
          { id: 'laco', passed: false },
          { id: 'funcao', passed: true },
        ],
        gamification: { xpAwarded: 5 },
      }),
    ) as unknown as typeof fetch
    montar({})
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Verificar esta parte' }))
    })
    expect(estado('Use um laço')).toBe('failed')
    expect(estado('Crie a função pular')).toBe('passed')
    expect(screen.getByText('Procure em Laços')).toBeTruthy()
    expect(screen.getByText('+5 XP')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Ainda falta um objetivo')
  })

  test('obrigatórios cumpridos com extra pendente: avisa do desafio extra', async () => {
    globalThis.fetch = mock(async () =>
      Response.json({
        passed: true,
        results: [
          { id: 'laco', passed: true },
          { id: 'funcao', passed: false },
        ],
        gamification: null,
      }),
    ) as unknown as typeof fetch
    montar({})
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Verificar esta parte' }))
    })
    expect(screen.getByRole('status').textContent).toContain('desafio extra')
    expect(screen.queryByText(/^\+\d+ XP$/)).toBeNull()
  })

  test('parte só com desafios extras: nada falta, o recado é de extra', async () => {
    globalThis.fetch = mock(async () =>
      Response.json({ passed: false, results: [{ id: 'funcao', passed: false }] }),
    ) as unknown as typeof fetch
    montar({ objectives: [OBJECTIVES[1]] as unknown as typeof OBJECTIVES })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Verificar esta parte' }))
    })
    const status = screen.getByRole('status').textContent ?? ''
    expect(status).toContain('desafio extra')
    expect(status).not.toContain('falta')
  })

  test('a lista se lembra do resultado guardado ao reabrir', () => {
    montar({ saved: [{ id: 'laco', passed: true }] })
    expect(estado('Use um laço')).toBe('passed')
    expect(estado('Crie a função pular')).toBe('unchecked')
  })

  test('mexer no projeto depois de verificar marca o resultado como de antes', async () => {
    let ouvinte: ((project: { updatedAt?: number }) => void) | null = null
    const subscribe: ProjectChangeSubscriber = (listener) => {
      ouvinte = listener
      return () => {
        ouvinte = null
      }
    }
    globalThis.fetch = mock(async () =>
      Response.json({
        passed: false,
        results: [
          { id: 'laco', passed: false },
          { id: 'funcao', passed: false },
        ],
      }),
    ) as unknown as typeof fetch
    montar({ subscribe, updatedAt: 1000 })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Verificar esta parte' }))
    })
    // O autosave do MESMO projeto (chega depois do clique) não é mudança.
    act(() => ouvinte?.({ updatedAt: 1000 }))
    expect(screen.queryByText(/mexeu no projeto/)).toBeNull()
    // Uma edição nova é.
    act(() => ouvinte?.({ updatedAt: 2000 }))
    expect(screen.getByText(/mexeu no projeto/)).toBeTruthy()
    expect(
      screen.getByText('Use um laço').closest('[data-state]')?.getAttribute('data-stale'),
    ).toBe('true')
  })

  test('uma edição durante a verificação continua marcada depois da resposta', async () => {
    let ouvinte: ((project: { updatedAt?: number }) => void) | null = null
    const subscribe: ProjectChangeSubscriber = (listener) => {
      ouvinte = listener
      return () => {
        ouvinte = null
      }
    }
    let responder: (r: Response) => void = () => {}
    globalThis.fetch = mock(
      () =>
        new Promise<Response>((resolve) => {
          responder = resolve
        }),
    ) as unknown as typeof fetch
    montar({ subscribe, updatedAt: 1000 })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Verificar esta parte' }))
    })
    // A criança mexe no projeto enquanto o servidor confere a versão de 1000.
    act(() => ouvinte?.({ updatedAt: 2000 }))
    await act(async () => {
      responder(
        Response.json({
          passed: false,
          results: [
            { id: 'laco', passed: false },
            { id: 'funcao', passed: false },
          ],
        }),
      )
    })
    expect(screen.getByText(/mexeu no projeto/)).toBeTruthy()
  })

  test('sem objetivos, o cartão não aparece', () => {
    const value: LessonPlayerContextValue = {
      lessonId: 'aula',
      courseSlug: 'curso',
      viewerId: 'perfil',
      viewerWatermark: null,
      initialPositionSeconds: null,
      sectionProjectCheck: {
        sectionId: 'parte',
        revision: 'r',
        blockId: 'projeto',
        objectives: [],
      },
    }
    const { container } = render(
      <LessonPlayerProvider value={value}>
        <SectionProjectCheck blockId="projeto" handleRef={{ current: null }} />
      </LessonPlayerProvider>,
    )
    expect(container.innerHTML).toBe('')
  })
})
