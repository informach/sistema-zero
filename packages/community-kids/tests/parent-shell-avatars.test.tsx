import { afterEach, describe, expect, mock, test } from 'bun:test'
import { render, screen, waitFor, within } from '@testing-library/react'
import { ParentShell } from '../src/app/pais/_components/parent-shell'
import type { ProfileView } from '../src/lib/types'

const originalFetch = globalThis.fetch
const ANA = '11111111-1111-4111-8111-111111111111'
const BIA = '22222222-2222-4222-8222-222222222222'

function profile(id: string, name: string, sortOrder: number): ProfileView {
  return {
    id,
    name,
    avatarUrl: null,
    whatsapp: null,
    birthDate: null,
    publicProfileEnabled: false,
    sortOrder,
  }
}

function install(avatars: Record<string, string | null> | null) {
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path === '/api/profiles')
        return Response.json({ profiles: [profile(ANA, 'Ana', 0), profile(BIA, 'Bia', 1)] })
      if (path === '/api/parents/avatares')
        return avatars ? Response.json({ avatars }) : Response.json({}, { status: 503 })
      return Response.json({}, { status: 503 })
    }),
    { preconnect: originalFetch.preconnect },
  )
}
afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('os filhos no menu da área dos pais', () => {
  // Retorno da Helena de 21/11/2026: o Início mostrava o rosto e o menu, só a inicial.
  test('cada filho aparece com a foto do avatar, e sem foto fica a inicial', async () => {
    install({ [ANA]: 'https://cdn.test/ana.png', [BIA]: null })
    const { container } = render(
      <ParentShell active="familia" parentName="Helena">
        <p>conteúdo</p>
      </ParentShell>,
    )
    const nav = screen.getByRole('navigation', { name: 'Área dos pais' })
    const ana = await within(nav).findByRole('link', { name: 'Ana' })
    await waitFor(() =>
      expect(ana.querySelector('img')?.getAttribute('src')).toBe('https://cdn.test/ana.png'),
    )
    const bia = within(nav).getByRole('link', { name: 'Bia' })
    expect(bia.querySelector('img')).toBeNull()
    expect(bia.textContent).toContain('B')
    expect(container.querySelectorAll('img[src="https://cdn.test/ana.png"]').length).toBe(1)
  })

  test('se as fotos não vierem, a lista aparece do mesmo jeito, com as iniciais', async () => {
    install(null)
    render(
      <ParentShell active="familia" parentName="Helena">
        <p>conteúdo</p>
      </ParentShell>,
    )
    const nav = screen.getByRole('navigation', { name: 'Área dos pais' })
    expect(await within(nav).findByRole('link', { name: 'Ana' })).toBeTruthy()
    expect(within(nav).getByRole('link', { name: 'Bia' }).querySelector('img')).toBeNull()
  })
})
