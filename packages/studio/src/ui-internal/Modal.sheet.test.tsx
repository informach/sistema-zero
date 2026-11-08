import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StudioSheetProvider } from '../studio/sheet-context'
import { Modal } from './Modal'

afterEach(cleanup)

function janela(onClose = () => {}) {
  return (
    <Modal open onClose={onClose} title="Criar um arquivo" className="max-w-[900px]">
      <input aria-label="Nome" />
    </Modal>
  )
}

describe('Modal: folha no celular do Pro', () => {
  it('com folha, a janela sobe de baixo e ignora a largura de janela de quem chama', () => {
    render(<StudioSheetProvider value>{janela()}</StudioSheetProvider>)
    const dialog = screen.getByRole('dialog', { name: 'Criar um arquivo' })
    expect(dialog.hasAttribute('data-sz-sheet')).toBe(true)
    expect(dialog.className).toContain('items-end')
    const panel = dialog.querySelector('[role="document"]') as HTMLElement
    expect(panel.className).toContain('sz-sheet')
    expect(panel.className).not.toContain('max-w-[900px]')
  })

  it('sem o provider, a janela de sempre (centralizada, com a largura pedida)', () => {
    render(janela())
    const dialog = screen.getByRole('dialog', { name: 'Criar um arquivo' })
    expect(dialog.hasAttribute('data-sz-sheet')).toBe(false)
    expect(dialog.className).toContain('items-center')
    const panel = dialog.querySelector('[role="document"]') as HTMLElement
    expect(panel.className).toContain('max-w-[900px]')
    expect(panel.className).not.toContain('sz-sheet')
  })

  it('Esc e o toque fora fecham a folha como fechavam a janela', () => {
    const onClose = mock(() => {})
    render(<StudioSheetProvider value>{janela(onClose)}</StudioSheetProvider>)
    const dialog = screen.getByRole('dialog', { name: 'Criar um arquivo' })
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    fireEvent.mouseDown(dialog)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
