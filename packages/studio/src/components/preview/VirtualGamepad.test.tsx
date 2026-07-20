import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { SZIRV2 } from '#ir'
import { projectUsesKeyboardControls, VirtualGamepad } from './VirtualGamepad'

afterEach(() => cleanup())

describe('projectUsesKeyboardControls', () => {
  const emptyIR = (): SZIRV2 => ({
    version: 2,
    html: [],
    css: [],
    behavior: { start: [], events: [], loops: [] },
    extensions: [],
  })

  it('distingue projeto sem teclado de controle de movimento aninhado', () => {
    expect(projectUsesKeyboardControls(emptyIR())).toBe(false)

    const ir = emptyIR()
    ir.behavior.loops.push({
      type: 'g2d:updateEachFrame',
      body: [{ type: 'g2d:topDown', spriteVar: 'jogador', speed: 4 }],
    })
    expect(projectUsesKeyboardControls(ir)).toBe(true)
  })

  it('reconhece perguntas e eventos de tecla em qualquer profundidade', () => {
    const ir = emptyIR()
    ir.behavior.events.push({
      type: 'if',
      cond: { type: 'g2d:keyDown', key: 'Space' },
      then: [],
    })
    expect(projectUsesKeyboardControls(ir)).toBe(true)
  })
})

describe('VirtualGamepad', () => {
  it('envia keydown/keyup, expõe estado e pode ser ocultado e restaurado', () => {
    const messages: Array<{ action: 'keydown' | 'keyup'; key: string; code: string }> = []
    render(<VirtualGamepad onInput={(message) => messages.push(message)} />)

    const up = screen.getByRole('button', { name: 'Mover para cima' })
    fireEvent.pointerDown(up, { pointerId: 1 })
    expect(up.getAttribute('aria-pressed')).toBe('true')
    expect(messages).toEqual([{ action: 'keydown', key: 'ArrowUp', code: 'ArrowUp' }])

    fireEvent.pointerUp(up, { pointerId: 1 })
    expect(up.getAttribute('aria-pressed')).toBe('false')
    expect(messages.at(-1)).toEqual({ action: 'keyup', key: 'ArrowUp', code: 'ArrowUp' })

    const left = screen.getByRole('button', { name: 'Mover para a esquerda' })
    fireEvent.pointerDown(left, { pointerId: 2 })
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar controles na tela' }))
    expect(messages.at(-1)).toEqual({ action: 'keyup', key: 'ArrowLeft', code: 'ArrowLeft' })
    expect(screen.queryByRole('button', { name: 'Mover para a esquerda' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar controles na tela' }))
    expect(screen.getByRole('button', { name: 'Mover para a esquerda' })).not.toBeNull()
  })
})
