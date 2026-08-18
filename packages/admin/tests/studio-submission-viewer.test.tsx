import { afterEach, describe, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { Project } from '@sistemazero/studio'
import { useState } from 'react'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// Os editores reais travam o projeto inicial no mount. Os doubles mantêm essa
// semântica: o teste só vê a versão nova se o viewer realmente REMONTAR o embed.
mock.module('@/components/studio/studio-embed', () => ({
  StudioEmbed: ({ initialProject }: { initialProject: Project }) => {
    const [mountedProject] = useState(initialProject)
    return <div data-testid="studio-project">{mountedProject.name}</div>
  },
}))
mock.module('@/components/pinta/pinta-embed', () => ({
  PintaEmbed: () => <div data-testid="pinta-project" />,
}))
mock.module('../src/app/admin/membros/cursos/[courseId]/teacher-thread-panel', () => ({
  TeacherThreadPanel: () => <div data-testid="teacher-thread" />,
}))

const actualProfessorCounts = await import('@/components/admin/professor-counts-store')
let refreshCalls = 0
mock.module('@/components/admin/professor-counts-store', () => ({
  ...actualProfessorCounts,
  refreshProfessorCounts: () => {
    refreshCalls += 1
  },
}))

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { StudioSubmissionViewer } = await import(
  '../src/app/admin/membros/cursos/[courseId]/studio-submission-viewer'
)

function project(name: string): Project {
  return {
    id: 'project-1',
    name,
    createdAt: 1,
    updatedAt: 1,
    mode: 'blocks',
    files: { 'index.html': '', 'style.css': '', 'script.js': '' },
    assets: [],
    ir: null,
    blocksState: null,
    installedExtensions: [],
  }
}

function buttonWithText(text: string): HTMLButtonElement | null {
  return (
    Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === text,
    ) ?? null
  )
}

async function waitForElement<T>(find: () => T | null): Promise<T> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const found = find()
    if (found) return found
    await act(async () => {
      await Promise.resolve()
    })
  }
  throw new Error('Elemento esperado não apareceu depois de esvaziar a fila de updates.')
}

afterEach(() => {
  refreshCalls = 0
  document.body.replaceChildren()
})

describe('restauração no viewer da entrega', () => {
  test('após o swap recarrega o detalhe e remonta o editor com a versão restaurada', async () => {
    const calls: Array<{ path: string; method: string }> = []
    let detailRequest = 0
    const originalFetch = globalThis.fetch
    const viewerFetch = Object.assign(
      async (input: URL | RequestInfo, init?: RequestInit | BunFetchRequestInit) => {
        const path = String(input)
        const method = init?.method ?? 'GET'
        calls.push({ path, method })

        if (path === '/api/members/blocks/bloco-1/studio-submissions/aluno-1') {
          detailRequest += 1
          return Response.json({
            project: project(detailRequest === 1 ? 'Versão atual' : 'Versão restaurada'),
            submittedAt:
              detailRequest === 1 ? '2026-08-18T12:00:00.000Z' : '2026-08-17T12:00:00.000Z',
            previousSubmittedAt:
              detailRequest === 1 ? '2026-08-17T12:00:00.000Z' : '2026-08-18T12:00:00.000Z',
            score: null,
            results: null,
            checkedAt: null,
            passed: false,
            message: null,
            reviewedAt: null,
            reviewed: false,
          })
        }
        if (
          path === '/api/members/studio-submissions/bloco-1/aluno-1/restore-previous' &&
          method === 'POST'
        ) {
          return Response.json({ restored: true })
        }
        throw new Error(`Fetch inesperado: ${method} ${path}`)
      },
      {
        preconnect: (
          _url: string | URL,
          _options?: { dns?: boolean; tcp?: boolean; http?: boolean; https?: boolean },
        ) => {},
      },
    ) satisfies typeof fetch
    globalThis.fetch = viewerFetch

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    try {
      await act(async () => {
        root.render(
          <StudioSubmissionViewer
            open
            onClose={() => {}}
            blockId="bloco-1"
            userId="aluno-1"
            studentName="Aluno"
            audience="kids"
            courseId="curso-1"
            lessonId="aula-1"
            lessonTitle="Aula 1"
          />,
        )
      })

      await waitForElement(() =>
        document.querySelector('[data-testid="studio-project"]')?.textContent === 'Versão atual'
          ? document.querySelector<HTMLElement>('[data-testid="studio-project"]')
          : null,
      )

      const restoreButton = await waitForElement(() => buttonWithText('Restaurar versão anterior'))
      await act(async () => restoreButton.click())

      const confirmButton = await waitForElement(() => buttonWithText('Restaurar'))
      await act(async () => {
        confirmButton.click()
        await Promise.resolve()
      })

      await waitForElement(() =>
        document.querySelector('[data-testid="studio-project"]')?.textContent ===
        'Versão restaurada'
          ? document.querySelector<HTMLElement>('[data-testid="studio-project"]')
          : null,
      )

      expect(calls).toEqual([
        {
          path: '/api/members/blocks/bloco-1/studio-submissions/aluno-1',
          method: 'GET',
        },
        {
          path: '/api/members/studio-submissions/bloco-1/aluno-1/restore-previous',
          method: 'POST',
        },
        {
          path: '/api/members/blocks/bloco-1/studio-submissions/aluno-1',
          method: 'GET',
        },
      ])
      expect(refreshCalls).toBe(1)
    } finally {
      globalThis.fetch = originalFetch
      await act(async () => root.unmount())
      container.remove()
    }
  })
})
