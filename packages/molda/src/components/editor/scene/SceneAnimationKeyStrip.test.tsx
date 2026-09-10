import { expect, spyOn, test } from 'bun:test'
import { fireEvent, render } from '@testing-library/react'
import { SceneAnimationKeyStrip } from './SceneAnimationKeyStrip'

test('strip navigation preserves exact keys through mouse, keyboard, endpoints and empty tracks', () => {
  const chosen: number[] = []
  const times = [0, 1.123456789123, 2]
  const props = {
    times,
    duration: 2,
    time: 0,
    label: 'Mover',
    onSeek: (time: number) => {
      chosen.push(time)
    },
  }
  const view = render(<SceneAnimationKeyStrip {...props} />)
  const button = view.getByRole('button')
  fireEvent.keyDown(button, { key: 'ArrowRight' })
  expect(chosen.at(-1)).toBe(1.123456789123)
  view.rerender(<SceneAnimationKeyStrip {...props} time={1.2} />)
  fireEvent.keyDown(button, { key: 'ArrowLeft' })
  expect(chosen.at(-1)).toBe(1.123456789123)
  fireEvent.keyDown(button, { key: 'End' })
  expect(chosen.at(-1)).toBe(2)
  fireEvent.keyDown(button, { key: 'Home' })
  expect(chosen.at(-1)).toBe(0)
  fireEvent.click(button, { detail: 0 })
  expect(chosen.at(-1)).toBe(1.123456789123)
  const rect = spyOn(button, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 512, 44))
  try {
    fireEvent.click(button, { clientX: 612, detail: 1 })
    expect(chosen.at(-1)).toBe(2)
    fireEvent.click(button, { clientX: 100, detail: 1 })
    expect(chosen.at(-1)).toBe(0)
  } finally {
    rect.mockRestore()
  }
  view.rerender(<SceneAnimationKeyStrip {...props} times={[]} />)
  const count = chosen.length
  expect((view.getByRole('button') as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(view.getByRole('button'))
  expect(chosen).toHaveLength(count)
})

test('65,536 keys have bounded DOM/bitmap marks; cursor updates do not repaint the key bitmap', () => {
  let clears = 0,
    marks = 0
  // Only the browser's 2D drawing boundary is replaced; component timing/data/DOM stay real.
  const boundary = spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ({
    clearRect() {
      clears++
    },
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {
      marks++
    },
  })) as unknown as HTMLCanvasElement['getContext'])
  const times = Array.from({ length: 65536 }, (_, i) => (i / 65535) * 2)
  const props = { times, duration: 2, time: 0, label: 'Mover', onSeek() {} }
  const view = render(<SceneAnimationKeyStrip {...props} />)
  try {
    expect(view.container.querySelectorAll('*').length).toBeLessThan(10)
    expect(marks).toBeGreaterThan(0)
    expect(marks).toBeLessThanOrEqual(1013)
    expect(clears).toBe(1)
    for (let i = 1; i <= 120; i++)
      view.rerender(<SceneAnimationKeyStrip {...props} time={i / 60} />)
    expect(clears).toBe(1)
    expect((view.container.querySelector('button > span') as HTMLElement).style.left).toBe(
      `${(1018 / 1024) * 100}%`,
    )
    view.rerender(<SceneAnimationKeyStrip {...props} times={[0, 2]} />)
    expect(clears).toBe(2)
  } finally {
    view.unmount()
    boundary.mockRestore()
  }
})
