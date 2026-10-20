import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ZAPPY_SRC } from '../src/components/kids/mascot'

// Espalha o módulo real (ver `profile-entry-states.test.tsx`): o mock só cresce.
const nav = await import('next/navigation')
const refresh = mock(() => {})
mock.module('next/navigation', () => ({ ...nav, useRouter: () => ({ refresh }) }))

const { KidsAccessUnavailable } = await import('../src/components/kids/kids-access-unavailable')
const { HelpUnavailable } = await import('../src/components/kids/help/help-unavailable')
const { KidsPensaUnavailable } = await import('../src/components/kids/kids-pensa-unavailable')

beforeEach(() => refresh.mockClear())
afterEach(cleanup)

/**
 * A tela compartilhada de "não consegui verificar" (Pinta, Molda, Pensa, Estúdio, Clube, Mural)
 * é um PROBLEMA a tentar de novo: o Zappy aparece pensativo (a pose das outras telas de erro),
 * nunca a cena `alivio` sorrindo com coração.
 */
describe('KidsAccessUnavailable', () => {
  it('mostra o Zappy pensativo, decorativo, e não a cena sorrindo com coração', () => {
    const { container } = render(<KidsAccessUnavailable title="Pinta" />)
    const art = container.querySelectorAll('img')
    expect(art).toHaveLength(1)
    expect(art[0]?.getAttribute('src')).toBe(ZAPPY_SRC.thinking)
    expect(art[0]?.getAttribute('alt')).toBe('')
    expect(art[0]?.getAttribute('aria-hidden')).toBe('true')
    expect(container.innerHTML).not.toContain('/ilustra/alivio')
    expect(screen.getByText(/Não consegui verificar agora/)).toBeTruthy()
  })

  it('o "Tentar de novo" usa o retry do chamador e, sem ele, recarrega o servidor', () => {
    const onRetry = mock(() => {})
    render(<KidsAccessUnavailable title="Molda" onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(refresh).not.toHaveBeenCalled()
    cleanup()
    render(<KidsAccessUnavailable title="Estúdio" />)
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})

describe('HelpUnavailable', () => {
  it('usa a mesma pose pensativa do Zappy e recarrega o servidor no "Tentar de novo"', () => {
    const { container } = render(<HelpUnavailable />)
    const art = container.querySelectorAll('img')
    expect(art).toHaveLength(1)
    expect(art[0]?.getAttribute('src')).toBe(ZAPPY_SRC.thinking)
    expect(art[0]?.getAttribute('alt')).toBe('')
    expect(art[0]?.getAttribute('class')).toContain('kid-float')
    expect(art[0]?.getAttribute('class')).toContain('size-24')
    expect(container.innerHTML).not.toContain('/ilustra/alivio')
    expect(screen.getByText(/Não consegui abrir os tutoriais agora/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})

describe('KidsPensaUnavailable', () => {
  it('diz que os jogos estão guardados, tenta de novo e leva ao Estúdio', () => {
    const { container } = render(<KidsPensaUnavailable />)
    expect(screen.getByRole('heading', { name: 'O Pensa não abriu agora' })).toBeTruthy()
    expect(
      screen.getByText(
        'Os seus jogos e as suas missões estão guardados. Tente de novo daqui a pouco.',
      ),
    ).toBeTruthy()
    expect(container.querySelector('img')?.getAttribute('src')).toBe(ZAPPY_SRC.thinking)
    expect(screen.getByRole('link', { name: 'Ir para o Estúdio' }).getAttribute('href')).toBe(
      '/estudio',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
