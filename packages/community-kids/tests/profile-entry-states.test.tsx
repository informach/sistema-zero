import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'

// ⚠️ `mock.module` NÃO é isolado por arquivo: o último registro vale para TODO
// import seguinte, em qualquer arquivo. Um mock ESTREITO (só `useRouter`) derruba
// quem importa outro export — `focus-mode.tsx` importa `usePathname`, e o link do
// ESM falha com "Export named 'usePathname' not found". Espalhar o módulo atual faz
// o mock só CRESCER, então a ordem dos arquivos (que muda no Linux do CI) não pesa.
const nav = await import('next/navigation')
const refresh = mock(() => {})
mock.module('next/navigation', () => ({ ...nav, useRouter: () => ({ refresh }) }))

const { ProfilesNotIncluded, ProfilesUnavailable } = await import(
  '../src/components/kids/profiles-unavailable'
)

beforeEach(() => refresh.mockClear())

describe('estados de entrada da página de perfis', () => {
  it('falha ao consultar o allowance pede retry e nunca oferece criação', () => {
    render(<ProfilesUnavailable reason="allowance" />)

    expect(
      screen.getByRole('heading', { name: 'Não foi possível verificar o acesso' }),
    ).toBeTruthy()
    expect(screen.queryByText('Adicionar')).toBeNull()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('maxProfiles 0 ganha estado de matrícula ausente com CTA e nova verificação', () => {
    render(<ProfilesNotIncluded />)

    const cta = screen.getByRole('link', { name: 'Conhecer a Comunidade dos Criadores' })
    expect(cta.getAttribute('href')).toBe(
      'https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta',
    )
    expect(screen.queryByText('Adicionar')).toBeNull()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Já comprei/ }))
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
