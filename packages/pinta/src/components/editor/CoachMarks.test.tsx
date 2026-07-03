import { beforeEach, describe, expect, it } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CoachMarks } from './CoachMarks'

beforeEach(() => {
  try {
    localStorage.clear()
  } catch {
    // sem localStorage: os testes de persistência não se aplicam
  }
})

describe('CoachMarks', () => {
  it('aparece no primeiro uso e some ao dispensar (persistindo)', async () => {
    const { unmount } = render(<CoachMarks id="pixel" title="Dicas" tips={['a', 'b']} />)

    await waitFor(() => {
      expect(screen.getByText('Dicas')).toBeTruthy()
    })
    expect(screen.getByText('a')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Entendi!' }))
    expect(screen.queryByText('Dicas')).toBeNull()
    expect(localStorage.getItem('pinta:coach:pixel')).toBe('1')

    // Remontar: não volta a aparecer (já visto).
    unmount()
    render(<CoachMarks id="pixel" title="Dicas" tips={['a', 'b']} />)
    await act(async () => {
      await Bun.sleep(0)
    })
    expect(screen.queryByText('Dicas')).toBeNull()
  })

  it('ids diferentes são independentes (pixel visto não esconde vetor)', async () => {
    localStorage.setItem('pinta:coach:pixel', '1')
    render(<CoachMarks id="vector" title="Vetor" tips={['x']} />)
    await waitFor(() => {
      expect(screen.getByText('Vetor')).toBeTruthy()
    })
  })
})
