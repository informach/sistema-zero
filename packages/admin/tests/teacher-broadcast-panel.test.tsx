import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { BroadcastPanel } = await import('../src/app/admin/professor/recados/broadcast-panel')

test('professor revisa um aviso coletivo e confirma o público antes de acompanhar o envio', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const originalFetch = globalThis.fetch
  const calls: { path: string; method: string; body: Record<string, unknown> | null }[] = []
  const broadcast = {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Oficina amanhã',
    body: '**Prepare seu jogo!**',
    recipients: 2,
    delivered: 0,
    failed: 0,
    read: 0,
    sentAt: null,
    items: [
      {
        profileId: 'alice',
        name: 'Alice',
        accountName: 'Ana Souza',
        accountEmail: 'ana@example.com',
      },
      {
        profileId: 'bruno',
        name: 'Bruno',
        accountName: 'Bia Silva',
        accountEmail: 'bia@example.com',
      },
    ],
  }
  globalThis.fetch = (async (input, init) => {
    const path = String(input)
    calls.push({
      path,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
    })
    if (path.includes('/recipients?')) return Response.json({ items: [] })
    if (path.endsWith('/confirm'))
      return Response.json({ ...broadcast, sentAt: new Date().toISOString() })
    if (init?.method === 'POST' || path.endsWith(broadcast.id)) return Response.json(broadcast)
    return Response.json([{ ...broadcast, sentAt: new Date().toISOString() }])
  }) as typeof fetch
  localStorage.setItem(
    'sz:admin:reply-templates',
    JSON.stringify([{ id: 'template', title: 'Aviso de oficina', body: broadcast.body }]),
  )
  const button = (label: string) => {
    const found = [...container.querySelectorAll('button')].find(
      (node) => node.textContent?.trim() === label,
    )
    if (!found) throw new Error(`Botão ausente: ${label}`)
    return found
  }
  try {
    await act(async () => root.render(<BroadcastPanel courses={[]} />))
    await act(async () => button('Novo recado').click())
    const audience = container.querySelector('select')!
    expect([...audience.options].map((option) => option.text)).toEqual([
      'Um aluno',
      'Alunos de um curso',
      'Todos do Kids',
    ])
    await act(async () => {
      audience.value = 'kids'
      audience.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => {
      const title = container.querySelector<HTMLInputElement>('input[maxlength="160"]')!
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        title,
        broadcast.title,
      )
      title.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => button('Modelos').click())
    await act(async () => button('Aviso de oficina').click())
    expect(button('Revisar mensagem e destinatários').disabled).toBe(false)
    await act(async () => button('Revisar mensagem e destinatários').click())
    expect(container.textContent).toContain('Ana Souza')
    expect(container.textContent).toContain('Bia Silva')
    expect(container.textContent).toContain('Prepare seu jogo!')
    const prepared = calls.find((call) => call.method === 'POST')!
    expect(prepared.body).toMatchObject({
      audience: { kind: 'kids' },
      title: broadcast.title,
      body: broadcast.body,
    })
    expect(calls.some((call) => call.path.endsWith('/confirm'))).toBe(false)
    await act(async () => button('Enviar para 2').click())
    expect(calls.filter((call) => call.path.endsWith('/confirm'))).toHaveLength(1)
    expect(container.querySelector('[aria-label="Recados enviados"]')).not.toBeNull()
    expect(container.textContent).toContain('0/2 entregues')
  } finally {
    await act(async () => root.unmount())
    globalThis.fetch = originalFetch
    localStorage.removeItem('sz:admin:reply-templates')
    container.remove()
  }
})
