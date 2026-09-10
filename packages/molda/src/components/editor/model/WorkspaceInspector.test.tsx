import { describe, expect, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import { WorkspaceInspector } from './WorkspaceInspector'

describe('workspace inspector', () => {
  test('the tablet drawer is labelled, non-modal, focusable and leaves the canvas available', () => {
    let closes = 0
    render(
      <div>
        <button type="button">Palco</button>
        <WorkspaceInspector
          docked={false}
          onBeforeClose={() => {
            closes += 1
          }}
        >
          <input name="partName" aria-label="Nome da peça" defaultValue="Minha peça" />
        </WorkspaceInspector>
      </div>,
    )
    expect(screen.queryByRole('complementary')).toBeNull()
    const trigger = screen.getByRole('button', { name: COPY.editor.model.inspector.open })
    fireEvent.click(trigger)
    const drawer = screen.getByRole('complementary', { name: COPY.editor.model.inspector.title })
    expect(drawer.getAttribute('aria-modal')).toBeNull()
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: COPY.editor.model.inspector.title }),
    )
    const input = screen.getByRole('textbox', { name: 'Nome da peça' })
    fireEvent.change(input, { target: { value: 'editado' } })
    screen.getByRole('button', { name: 'Palco' }).focus()
    expect(document.activeElement?.textContent).toBe('Palco')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(closes).toBe(1)
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    fireEvent.click(trigger)
    expect(screen.getByRole('textbox', { name: 'Nome da peça' })).toBe(input)
    expect((input as HTMLInputElement).value).toBe('editado')
  })

  test('the desktop dock can collapse; resize keeps the current controls mounted', () => {
    const view = (docked: boolean) => (
      <WorkspaceInspector docked={docked} onBeforeClose={() => {}}>
        <input name="color" aria-label="Cor" />
      </WorkspaceInspector>
    )
    const { rerender } = render(view(true))
    const input = screen.getByRole('textbox', { name: 'Cor' })
    rerender(view(false))
    expect(screen.getByRole('textbox', { name: 'Cor' })).toBe(input)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.inspector.close }))
    expect(screen.queryByRole('complementary')).toBeNull()
    rerender(view(true))
    expect(screen.queryByRole('complementary')).toBeNull()
  })
})
