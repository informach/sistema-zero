import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { formatShortcut, ProShortcutsDialog, visibleShortcutGroups } from './ProShortcutsDialog'

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

  it('só lista o que funciona AQUI: Ctrl+Alt+K com o Zappy, Ctrl+Enter no Python', () => {
    const rows = (context: { python: boolean; zappy: boolean }) =>
      visibleShortcutGroups(context).flatMap((group) => group.rows.map((row) => row.key))
    expect(rows({ python: false, zappy: false })).not.toContain('pro.zappy.change')
    expect(rows({ python: false, zappy: false })).not.toContain('pro.shortcuts.replTest')
    expect(rows({ python: false, zappy: true })).toContain('pro.zappy.change')
    expect(rows({ python: true, zappy: false })).toContain('pro.shortcuts.replTest')
    // Sem Zappy e sem Python, o grupo "Ajuda" fica vazio e sai inteiro (nada de título solto).
    expect(visibleShortcutGroups({ python: false, zappy: false })).toHaveLength(2)
    expect(visibleShortcutGroups({ python: true, zappy: true })).toHaveLength(3)
    render(<ProShortcutsDialog open onClose={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'Atalhos do teclado' })
    expect(dialog.textContent).not.toContain('Testar a linha de Python')
    expect(dialog.textContent).not.toContain('Pedir mudança nestas linhas')
    expect(dialog.textContent).toContain('Arrumar código')
  })

  it('no Mac as teclas têm os símbolos de lá', () => {
    expect(formatShortcut('Ctrl+Shift+P', false)).toEqual(['Ctrl', 'Shift', 'P'])
    expect(formatShortcut('Ctrl+Shift+P', true)).toEqual(['⌘', '⇧', 'P'])
    expect(formatShortcut('Shift+Alt+F', true)).toEqual(['⇧', '⌥', 'F'])
  })
})
