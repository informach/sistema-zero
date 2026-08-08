import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'

const refresh = mock(() => {})
mock.module('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

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
