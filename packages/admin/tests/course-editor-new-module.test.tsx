import { afterEach, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const React = await import('react')
const { act } = React
const { createRoot } = await import('react-dom/client')
const { CourseEditorClient } = await import(
  '../src/app/admin/membros/cursos/[courseId]/course-editor-client'
)

const originalFetch = globalThis.fetch
let cleanup: (() => Promise<void>) | null = null
afterEach(async () => {
  await cleanup?.()
  cleanup = null
  globalThis.fetch = originalFetch
})

test('curso que não carregou: "Novo módulo" fica apagado mesmo para quem escreve', async () => {
  globalThis.fetch = Object.assign(
    async () => Response.json({ error: { code: 'TEST', message: 'Fora do ar' } }, { status: 503 }),
    { preconnect: originalFetch.preconnect },
  ) satisfies typeof fetch
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () =>
    root.render(React.createElement(CourseEditorClient, { courseId: 'c1', currentRole: 'admin' })),
  )
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  cleanup = async () => {
    await act(async () => root.unmount())
    container.remove()
  }
  const novo = [...container.querySelectorAll('button')].find((button) =>
    button.textContent?.includes('Novo módulo'),
  ) as HTMLButtonElement
  expect(novo).toBeDefined()
  expect(novo.disabled).toBe(true)
})
