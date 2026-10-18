import { afterEach, describe, expect, mock, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  type LessonPlayerContextValue,
  LessonPlayerProvider,
} from '@sistemazero/member-shell/components/lesson-player-context'
import { SectionProjectCheck } from '@sistemazero/member-shell/components/studio/section-project-check'
import { useReportActivityExpanded } from '@sistemazero/member-shell/lib/lesson-activity-expansion'
import { useLessonRefresh } from '@sistemazero/member-shell/lib/use-lesson-refresh'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { type ReactNode, useEffect } from 'react'

/**
 * A atualização da aula sem derrubar a atividade (11/10/2026). Relato dela: com o Estúdio
 * AMPLIADO, "Verificar esta parte" recarregou a página inteira (build novo no servidor: o
 * `router.refresh()` do Next 16 vira recarregamento) e, numa segunda vez, "recarregou os
 * bloquinhos" (o refresh re-semeava o editor). O que este arquivo trava:
 * 1. o agendador junta os pedidos e ESPERA a atividade ampliada fechar;
 * 2. o "Verificar" só atualiza quando o objetivo passou;
 * 3. a semente do Estúdio não depende do conteúdo que chega novo a cada refresh;
 * 4. os players usam o agendador, nunca o `router.refresh()` cru.
 */

const raiz = resolve(import.meta.dir, '..', '..')
const ler = (caminho: string) => readFileSync(resolve(raiz, caminho), 'utf8')

afterEach(cleanup)

/** Um player de mentira: o agendador ligado a um `refresh` espião. */
function Agendador({ refresh, pedir }: { refresh: () => void; pedir: (f: () => void) => void }) {
  const agendar = useLessonRefresh(refresh)
  useEffect(() => pedir(agendar), [pedir, agendar])
  return null
}

function Ampliada({ ampliada }: { ampliada: boolean }) {
  useReportActivityExpanded(ampliada)
  return null
}

const proximaVolta = () => act(() => new Promise((r) => setTimeout(r, 5)))

describe('o agendador de atualização da aula', () => {
  test('junta os pedidos do mesmo gesto num refresh só', async () => {
    const refresh = mock(() => {})
    let agendar: () => void = () => {}
    render(<Agendador refresh={refresh} pedir={(f) => (agendar = f)} />)
    agendar()
    agendar()
    await proximaVolta()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  test('com uma atividade ampliada, espera ela fechar e atualiza uma vez só', async () => {
    const refresh = mock(() => {})
    let agendar: () => void = () => {}
    const tela = (ampliada: boolean) => (
      <>
        <Ampliada ampliada={ampliada} />
        <Agendador refresh={refresh} pedir={(f) => (agendar = f)} />
      </>
    )
    const { rerender } = render(tela(true))
    agendar()
    await proximaVolta()
    agendar()
    await proximaVolta()
    // Ampliada: nada de refresh (com build novo ele recarregaria a página e a tiraria do modo
    // ampliado).
    expect(refresh).toHaveBeenCalledTimes(0)
    rerender(tela(false))
    await proximaVolta()
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})

const LESSON = '11111111-1111-4111-8111-111111111111'
const SECTION = '22222222-2222-4222-8222-222222222222'

function comPlayer(refresh: () => void, filho: ReactNode) {
  const value: LessonPlayerContextValue = {
    lessonId: LESSON,
    courseSlug: 'cade-todo-mundo',
    viewerId: 'v',
    viewerWatermark: null,
    initialPositionSeconds: null,
    refreshAfterLearning: refresh,
    sectionProjectCheck: {
      sectionId: SECTION,
      revision: 'r'.repeat(32),
      blockId: 'projeto',
      objectives: [{ id: 'revelar-ao-toque', label: 'Revele ao toque', kind: 'block' }],
    },
  }
  return <LessonPlayerProvider value={value}>{filho}</LessonPlayerProvider>
}

describe('"Verificar esta parte"', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  async function verificar(passed: boolean) {
    let saved = false
    globalThis.fetch = mock(async () => {
      expect(saved).toBe(true)
      return Response.json({ passed, results: [{ id: 'revelar-ao-toque', passed }] })
    }) as unknown as typeof fetch
    const refresh = mock(() => {})
    const handleRef = {
      current: {
        getProject: () => ({ id: 'p' }),
        save: async () => {
          await Promise.resolve()
          saved = true
        },
      } as never,
    }
    render(comPlayer(refresh, <SectionProjectCheck blockId="projeto" handleRef={handleRef} />))
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    return refresh
  }

  test('"ainda não": a aula NÃO é atualizada (o modo ampliado e o editor ficam como estão)', async () => {
    const refresh = await verificar(false)
    expect(refresh).toHaveBeenCalledTimes(0)
  })

  test('objetivo cumprido: atualiza uma vez, para liberar a próxima parte', async () => {
    const refresh = await verificar(true)
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})

describe('as travas no código', () => {
  test('a semente do Estúdio da fase não depende do conteúdo que chega novo a cada refresh', () => {
    const fonte = ler('member-shell/src/components/studio/studio-block.tsx')
    // As dependências do efeito de semente (o único com `seedLoadAttempt` na lista).
    const deps = fonte.match(/\}, \[([^\]]*seedLoadAttempt[^\]]*)\]\)/)?.[1]
    expect(deps).toBeDefined()
    expect(deps).not.toContain('content.')
    expect(deps).not.toContain('studioState')
  })

  test('os dois players passam pelo agendador, nunca pelo router.refresh() cru', () => {
    for (const caminho of [
      'community-kids/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx',
      'community/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx',
    ]) {
      const fonte = ler(caminho)
      expect(fonte).toContain('useLessonRefresh(')
      expect(fonte).toContain('refreshAfterLearning: refreshLesson')
      expect(fonte).toContain('refreshAfterStudio: refreshLesson')
      expect(fonte).not.toMatch(/refreshAfter\w+: \(\) => router\.refresh\(\)/)
    }
  })
})
