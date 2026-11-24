import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ProfileView } from '../src/lib/types'

/**
 * Meu perfil (24/11/2026): a criança muda o PRÓPRIO apelido. O nome completo e o nascimento
 * seguem com o responsável. O apelido só vai ao servidor quando mudou e com os espaços juntos.
 *
 * ⚠️ `mock.module` não é isolado por arquivo no bun: espalhar o módulo atual (receita do
 * `quarto-foco.test.tsx`) para nenhum outro arquivo perder export.
 */
const nav = await import('next/navigation')
const refresh = mock(() => {})
mock.module('next/navigation', () => ({
  ...nav,
  useRouter: () => ({ refresh, push: () => {}, replace: () => {}, prefetch: () => {} }),
}))
const { ProfileClient } = await import('../src/app/(app)/perfil/profile-client')

const ID = '11111111-1111-4111-8111-111111111111'
function perfil(extra: Partial<ProfileView> = {}): ProfileView {
  return {
    id: ID,
    name: 'Fada Azul',
    publicNickname: 'Fada Azul',
    avatarUrl: null,
    whatsapp: null,
    birthDate: null,
    publicProfileEnabled: false,
    sortOrder: 0,
    identityConfirmed: true,
    ...extra,
  }
}

const fetchOriginal = globalThis.fetch
let bodies: unknown[] = []
function stubFetch(status = 200, body: unknown = { profile: { id: ID } }) {
  bodies = []
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)))
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
}

function abrir(profile = perfil()) {
  render(
    <ProfileClient
      profile={profile}
      ranking={null}
      level={null}
      levelHint={null}
      avatarPhotoUrl={null}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Editar perfil' }))
  return screen.getByLabelText('Apelido') as HTMLInputElement
}

function salvar() {
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
}

afterEach(() => {
  cleanup()
  globalThis.fetch = fetchOriginal
  refresh.mockClear()
})

describe('Meu perfil: a criança edita o próprio apelido', () => {
  it('o campo nasce com o apelido e manda o novo, com os espaços juntos', async () => {
    stubFetch()
    const campo = abrir()
    expect(campo.value).toBe('Fada Azul')
    fireEvent.change(campo, { target: { value: '  Raio   Verde ' } })
    salvar()
    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toEqual({ whatsapp: null, publicNickname: 'Raio Verde' })
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('sem mudar o apelido, só o telefone vai ao servidor', async () => {
    stubFetch()
    abrir()
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '11999990000' } })
    salvar()
    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toEqual({ whatsapp: '11999990000' })
  })

  it('apelido curto demais não sai do aparelho e diz o porquê', async () => {
    stubFetch()
    const campo = abrir()
    fireEvent.change(campo, { target: { value: 'R' } })
    salvar()
    expect(await screen.findByText('O apelido precisa de ao menos 2 letras')).toBeTruthy()
    expect(bodies).toHaveLength(0)
  })

  it('perfil antigo sem apelido abre o campo vazio, nunca com o genérico', () => {
    const campo = abrir(
      perfil({ name: 'Criador(a)', publicNickname: null, identityConfirmed: false }),
    )
    expect(campo.value).toBe('')
  })

  it('o nome completo continua com o responsável e o campo explica quem vê o apelido', () => {
    abrir()
    expect(screen.queryByLabelText(/nome completo/i)).toBeNull()
    expect(screen.getByText(/ficam com o seu responsável, na área dos pais/)).toBeTruthy()
    expect(screen.getByText(/Mural, no Clube e no ranking/)).toBeTruthy()
  })
})
