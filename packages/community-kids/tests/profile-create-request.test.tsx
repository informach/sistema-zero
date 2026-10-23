import { afterEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProfileEditor } from '../src/app/pais/_components/profile-editor'

const originalFetch = globalThis.fetch
const originalAssign = window.location.assign
function setup() {
  const calls: Array<{ path: string; body: Record<string, unknown> }> = []
  const destinations: string[] = []
  window.location.assign = ((url: string | URL) => {
    destinations.push(String(url))
  }) as typeof originalAssign
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path === '/api/onboarding/events') return new Response(null, { status: 204 })
      calls.push({ path, body: JSON.parse(String(init?.body)) })
      return Response.json({ error: { code: 'SERVICE_UNAVAILABLE' } }, { status: 503 })
    },
    { preconnect: originalFetch.preconnect },
  )
  const { container } = render(<ProfileEditor />)
  fireEvent.change(screen.getByLabelText('Nome do perfil'), {
    target: { value: 'Criança de teste' },
  })
  fireEvent.change(screen.getByLabelText('Data de nascimento da criança'), {
    target: { value: '2018-05-10' },
  })
  const form = container.querySelector('form')!
  return { calls, destinations, save: () => fireEvent.submit(form) }
}
afterEach(() => {
  globalThis.fetch = originalFetch
  window.location.assign = originalAssign
})
describe('criação preserva identidade após resultado inconclusivo', () => {
  it('envia UUID válido e reutiliza ao salvar novamente', async () => {
    const { calls, destinations, save } = setup()
    save()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Salvar' }).hasAttribute('disabled')).toBe(false),
    )
    expect(calls).toHaveLength(1)
    expect(calls[0]?.body.birthDate).toBe('2018-05-10')
    expect(calls[0]?.body.requestId).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
    )
    save()
    await waitFor(() => expect(calls).toHaveLength(2))
    expect(calls[1]?.body.requestId).toBe(calls[0]?.body.requestId)
    expect(destinations).toEqual([])
  })
})
