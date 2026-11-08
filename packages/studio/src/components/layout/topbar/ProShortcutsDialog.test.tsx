import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { formatShortcut, ProShortcutsDialog } from './ProShortcutsDialog'

afterEach(cleanup)

describe('"Atalhos do teclado" (o modo Código do Pro)', () => {
  it('lista os atalhos de verdade do editor em três grupos', () => {
    const onClose = mock(() => {})
    render(<ProShortcutsDialog open onClose={onClose} />)
    const dialog = screen.getByRole('dialog', { name: 'Atalhos do teclado' })
    expect(dialog.textContent).toContain('Andar pelo projeto')
    expect(dialog.textContent).toContain('Ir para um arquivo')
    expect(dialog.textContent).toContain('Todas as ações')
    expect(dialog.textContent).toContain('Trocar nome em todo lugar')
    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao código' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('no Mac as teclas têm os símbolos de lá', () => {
    expect(formatShortcut('Ctrl+Shift+P', false)).toEqual(['Ctrl', 'Shift', 'P'])
    expect(formatShortcut('Ctrl+Shift+P', true)).toEqual(['⌘', '⇧', 'P'])
    expect(formatShortcut('Shift+Alt+F', true)).toEqual(['⇧', '⌥', 'F'])
  })
})
