import { expect, spyOn, test } from 'bun:test'
import { fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
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
    fireEvent.pointerDown(button, { clientX: 612, button: 0, pointerId: 1 })
    expect(chosen.at(-1)).toBe(2)
    fireEvent.pointerDown(button, { clientX: 100, button: 0, pointerId: 1 })
    expect(chosen.at(-1)).toBe(0)
  } finally {
    rect.mockRestore()
  }
  view.rerender(<SceneAnimationKeyStrip {...props} times={[]} />)
  const count = chosen.length
  expect((view.getByRole('button') as HTMLButtonElement).disabled).toBe(false)
  fireEvent.click(view.getByRole('button'))
  expect(chosen).toHaveLength(count)
})

test('65,536 keys have bounded DOM/bitmap marks; cursor updates do not repaint the key bitmap', () => {
  let clears = 0,
    marks = 0
  // Only the browser's 2D drawing boundary is replaced; component timing/data/DOM stay real.
  const boundary = spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ({
    setTransform() {
      clears++
    },
    fillRect() {},
    stroke() {},
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
    expect((view.container.querySelector('.mld-key-playhead') as HTMLElement).style.left).toBe(
      'calc(-14px + 100%)',
    )
    view.rerender(<SceneAnimationKeyStrip {...props} times={[0, 2]} />)
    expect(clears).toBe(2)
  } finally {
    view.unmount()
    boundary.mockRestore()
  }
})

test('dragging empty space seeks continuously, snaps to exact keys, and Escape restores the start', () => {
  const times = [0, 1.123456789123, 2]
  const chosen: number[] = []
  function Timeline() {
    const [time, setTime] = useState(0.37)
    return (
      <SceneAnimationKeyStrip
        times={times}
        duration={2}
        time={time}
        label="Mover"
        onSeek={(time) => {
          chosen.push(time)
          setTime(time)
        }}
      />
    )
  }
  const view = render(<Timeline />)
  const button = view.getByRole('button')
  let captured: number | null = null
  button.setPointerCapture = (id) => {
    captured = id
  }
  button.hasPointerCapture = (id) => captured === id
  button.releasePointerCapture = () => {
    captured = null
  }
  const rect = spyOn(button, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 512, 36))
  try {
    fireEvent.pointerDown(button, { clientX: 214, button: 0, pointerId: 1 })
    fireEvent.pointerMove(button, { clientX: 400, pointerId: 1 })
    expect(chosen.at(-1)).toBe(1.2)
    fireEvent.pointerMove(button, { clientX: 114 + (times[1]! / 2) * 484 + 2, pointerId: 1 })
    expect(chosen.at(-1)).toBe(times[1])
    fireEvent.keyDown(button, { key: 'Escape' })
    expect(chosen.at(-1)).toBe(0.37)
    expect(captured).toBeNull()
    fireEvent.pointerUp(button, { clientX: 400, pointerId: 1 })
    expect(chosen.at(-1)).toBe(0.37)
    fireEvent.pointerDown(button, { clientX: 214, button: 0, pointerId: 2 })
    fireEvent.pointerMove(button, { clientX: 300, pointerId: 2 })
    fireEvent.pointerUp(button, { clientX: 114 + (0.85 / 2) * 484, pointerId: 2 })
    expect(chosen.at(-1)).toBe(0.85)
    expect(captured).toBeNull()
  } finally {
    rect.mockRestore()
    view.unmount()
  }
})
