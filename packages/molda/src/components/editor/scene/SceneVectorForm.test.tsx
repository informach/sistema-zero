import { expect, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Vec3 } from '../../../core/model'
import { SceneVectorForm } from './SceneVectorForm'

test('advanced position form rounds only edited axes on Enter and preserves imported fractions elsewhere', () => {
  let applied: Vec3 | undefined
  const view = render(
    <SceneVectorForm
      label="Posição"
      hint="Mundo"
      values={[0.25, 0.35, 0.45]}
      step={1}
      onApply={(value) => {
        applied = value
      }}
    />,
  )
  try {
    const x = screen.getByRole('spinbutton', { name: 'Posição X' })
    fireEvent.change(x, { target: { value: '2.7' } })
    const form = x.closest('form')
    if (!form) throw new Error('Missing measurement form')
    fireEvent.submit(form)
    expect(applied).toEqual([3, 0.35, 0.45])
  } finally {
    view.unmount()
  }
})

test('advanced size form uses tenths, refuses zero and negative sizes and keeps small positive sizes on the grid', () => {
  let applied: Vec3 | undefined
  const view = render(
    <SceneVectorForm
      label="Tamanho"
      hint="Unidades"
      values={[2, 2, 2]}
      step={0.1}
      min={0.1}
      onApply={(value) => {
        applied = value
      }}
    />,
  )
  try {
    const x = screen.getByRole('spinbutton', { name: 'Tamanho X' })
    const form = x.closest('form')
    if (!form) throw new Error('Missing measurement form')
    for (const value of ['0', '-2']) {
      fireEvent.change(x, { target: { value } })
      fireEvent.blur(x)
      fireEvent.submit(form)
      expect(applied).toBeUndefined()
    }
    fireEvent.change(x, { target: { value: '3.25' } })
    fireEvent.blur(x)
    fireEvent.submit(form)
    expect(applied).toEqual([3.3, 2, 2])
    fireEvent.change(x, { target: { value: '0.01' } })
    fireEvent.submit(form)
    expect(applied).toEqual([0.1, 2, 2])
  } finally {
    view.unmount()
  }
})
