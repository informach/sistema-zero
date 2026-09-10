import { expect, test } from 'bun:test'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { SCENE_FIRST_STEPS_COPY as copy } from '../../../core/sceneFirstStepsCopy'
import { SceneFirstSteps } from './SceneFirstSteps'

test('optional reading preserves focus and positions per topic, with bounded navigation', () => {
  const view = render(
    <StrictMode>
      <SceneFirstSteps context="model" />
    </StrictMode>,
  )
  try {
    const trigger = screen.getByRole('button', { name: copy.open })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('region', { name: copy.title })).toBeNull()
    fireEvent.click(trigger)
    const panel = screen.getByRole('region', { name: copy.title }),
      ui = within(panel)
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id)
    expect(document.activeElement).toBe(ui.getByRole('heading', { name: copy.title }))
    const next = ui.getByRole('button', { name: copy.next }),
      previous = ui.getByRole('button', { name: copy.previous })
    fireEvent.click(previous)
    expect(ui.getByText(copy.position(0, 3))).toBeTruthy()
    next.focus()
    for (let i = 0; i < 4; i++) fireEvent.click(next)
    expect(ui.getByText(copy.position(2, 3))).toBeTruthy()
    expect(next.getAttribute('aria-disabled')).toBe('true')
    expect(document.activeElement).toBe(next)
    fireEvent.click(ui.getByRole('button', { name: copy.tracks.paint.label }))
    expect(ui.getByText(copy.tracks.paint.steps[0].title)).toBeTruthy()
    fireEvent.click(next)
    fireEvent.click(ui.getByRole('button', { name: copy.tracks.model.label }))
    expect(ui.getByText(copy.position(2, 3))).toBeTruthy()
    fireEvent.click(ui.getByRole('button', { name: copy.close }))
    expect(document.activeElement).toBe(trigger)
    expect(screen.queryByRole('region', { name: copy.title })).toBeNull()
    fireEvent.click(trigger)
    expect(screen.getByText(copy.position(2, 3))).toBeTruthy()
  } finally {
    view.unmount()
  }
})

test('opening uses the current context, changing the context does not hijack a reading, new project resets', () => {
  const content = (context: 'model' | 'paint' | 'animation', project = 'first') => (
    <StrictMode>
      <SceneFirstSteps key={project} context={context} />
    </StrictMode>
  )
  const view = render(content('paint'))
  try {
    fireEvent.click(screen.getByRole('button', { name: copy.open }))
    expect(screen.getByText(copy.tracks.paint.steps[0].title)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: copy.next }))
    view.rerender(content('animation'))
    expect(screen.getByText(copy.tracks.paint.steps[1].title)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: copy.close }))
    fireEvent.click(screen.getByRole('button', { name: copy.open }))
    expect(screen.getByText(copy.tracks.animation.steps[0].title)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: copy.tracks.paint.label }))
    expect(screen.getByText(copy.tracks.paint.steps[1].title)).toBeTruthy()
    view.rerender(content('paint', 'second'))
    expect(screen.queryByRole('region', { name: copy.title })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: copy.open }))
    expect(screen.getByText(copy.tracks.paint.steps[0].title)).toBeTruthy()
  } finally {
    view.unmount()
  }
})

test('Escape closes only help, authoring keys stay local and Tab remains native', () => {
  const keys: string[] = []
  const view = render(
    <section aria-label="Host" onKeyDown={(event) => keys.push(event.key)}>
      <SceneFirstSteps context="animation" />
      <button type="button">Outside</button>
    </section>,
  )
  try {
    const trigger = screen.getByRole('button', { name: copy.open })
    fireEvent.click(trigger)
    const panel = screen.getByRole('region', { name: copy.title })
    fireEvent.keyDown(panel, { key: 'Delete' })
    fireEvent.keyDown(panel, { key: 'z', ctrlKey: true })
    fireEvent.keyDown(panel, { key: 'z', metaKey: true, shiftKey: true })
    expect(fireEvent.keyDown(panel, { key: 'Tab' })).toBe(true)
    expect(keys).toEqual([])
    const outside = screen.getByRole('button', { name: 'Outside' })
    outside.focus()
    expect(document.activeElement).toBe(outside)
    expect(screen.queryByRole('region', { name: copy.title })).not.toBeNull()
    fireEvent.keyDown(panel, { key: 'Escape' })
    expect(keys).toEqual([])
    expect(document.activeElement).toBe(trigger)
    expect(screen.queryByRole('region', { name: copy.title })).toBeNull()
  } finally {
    view.unmount()
  }
})
