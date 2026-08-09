import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { Button } from './Button'

afterEach(cleanup)

describe('Button', () => {
  it('expõe o alvo mínimo compartilhado para dispositivos de toque', () => {
    render(<Button>Continuar</Button>)

    expect(
      screen.getByRole('button', { name: 'Continuar' }).classList.contains('sz-touch-target'),
    ).toBe(true)
  })
})
