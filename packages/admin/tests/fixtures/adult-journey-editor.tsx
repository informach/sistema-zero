import { expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { buildAdultJourneySeed } from '../../../members/src/application/adult-journey/adult-journey-seed'

GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const navigation = await import('next/navigation')
mock.module('next/navigation', () => ({ ...navigation, useRouter: () => ({ replace: () => {} }) }))
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { PlatformProvider } = await import('../../src/components/admin/platform-provider')
const { setPlatform } = await import('../../src/components/admin/platform-store')
const { AdultJourneyEditor } = await import(
  '../../src/app/admin/professor/jornada-adulta/journey-editor'
)

test('Admin mostra sete etapas aguardando cursos e salva nova etapa planejada sem curso fictício', async () => {
  const originalFetch = globalThis.fetch
  let saved: Record<string, unknown> | null = null
  const policy = buildAdultJourneySeed([]).policy
  globalThis.fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const path = String(input)
      if (path.startsWith('/api/members/courses?')) return Response.json({ items: [], total: 0 })
      if (path === '/api/members/journey/adult') {
        if (init?.method === 'PUT' && typeof init.body === 'string') {
          saved = JSON.parse(init.body)
          return Response.json({ version: 2, policy: saved?.policy })
        }
        return Response.json({ version: 1, policy })
      }
      throw new Error(`Unexpected API: ${path}`)
    },
    originalFetch,
  )
  setPlatform('adult')
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => {
      root.render(
        <PlatformProvider initialPlatform="adult">
          <AdultJourneyEditor />
        </PlatformProvider>,
      )
    })
    expect(container.textContent).toContain('Aguardando cursos.')
    const titles = Array.from(container.querySelectorAll('input')).map((input) => input.value)
    for (const stage of policy.stages) expect(titles).toContain(stage.title)
    const button = (label: string) =>
      Array.from(container.querySelectorAll('button')).find((b) => b.textContent === label)!
    expect(button('Adicionar etapa').disabled).toBe(false)
    await act(async () => {
      button('Adicionar etapa').click()
    })
    await act(async () => {
      button('Salvar a jornada').click()
    })
    expect(saved).not.toBeNull()
    const body = saved as unknown as { expectedVersion: number; policy: typeof policy }
    expect(body.expectedVersion).toBe(1)
    expect(body.policy.stages).toHaveLength(8)
    expect(body.policy.stages.every((s) => s.requirements.length === 0)).toBe(true)
    expect(body.policy.stages[0]?.capabilities).toEqual(['studio', 'pinta'])
  } finally {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    globalThis.fetch = originalFetch
    setPlatform('kids')
  }
})
