import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { ConvitesClient } = await import('../src/app/admin/embaixadores/convites-client')

test('busca mais recente vence mesmo quando a resposta antiga chega por último', async () => {
  const originalFetch = globalThis.fetch
  const requests: { url: string; resolve: (value: Response) => void }[] = []
  globalThis.fetch = ((url: string | URL | Request) =>
    new Promise<Response>((resolve) => {
      requests.push({ url: String(url), resolve })
    })) as typeof fetch
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const result = (name: string) =>
    Response.json({
      items: [
        {
          id: name,
          name,
          code: 'teste-local',
          state: 'active',
          endsAt: '2026-11-01T12:00:00Z',
          stats: { redemptions: 0, conversions: 0 },
        },
      ],
      total: 1,
    })
  try {
    await act(async () => root.render(<ConvitesClient currentRole="admin" />))
    expect(requests).toHaveLength(1)
    const input = container.querySelector('input')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'nova')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () =>
      container
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    )
    expect(requests).toHaveLength(2)
    expect(requests[1]!.url).toContain('q=nova')
    await act(async () => requests[1]!.resolve(result('Campanha nova')))
    expect(container.textContent).toContain('Campanha nova')
    await act(async () => requests[0]!.resolve(result('Campanha antiga')))
    expect(container.textContent).toContain('Campanha nova')
    expect(container.textContent).not.toContain('Campanha antiga')

    const refresh = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Atualizar',
    )!
    await act(async () => refresh.click())
    await act(async () =>
      requests[2]!.resolve(
        Response.json({ error: { message: 'Serviço indisponível' } }, { status: 503 }),
      ),
    )
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Serviço indisponível')
    expect(container.textContent).not.toContain('Campanha nova')
    expect(container.textContent).not.toContain('Nenhuma campanha encontrada')
  } finally {
    await act(async () => root.unmount())
    container.remove()
    globalThis.fetch = originalFetch
  }
})
