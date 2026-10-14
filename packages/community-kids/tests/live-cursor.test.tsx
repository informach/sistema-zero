import { afterEach, expect, test } from 'bun:test'
import { cursorAnchor, cursorPosition } from '../../member-shell/src/lib/live/cursor'

afterEach(() => {
  document.body.replaceChildren()
})
function box(left: number, top: number, width: number, height: number) {
  return { left, top, width, height, right: left + width, bottom: top + height } as DOMRect
}
test('cursor follows the actual target after resizing, and disappears for hidden or different blocks', () => {
  const root = document.createElement('div')
  root.innerHTML =
    '<button data-live-target="studio-run">Executar</button><svg><g class="blocklyBlockCanvas"><g data-id="block-a"></g></g></svg>'
  document.body.append(root)
  root.getBoundingClientRect = () => box(10, 20, 800, 600)
  const button = root.querySelector('button')!
  button.getBoundingClientRect = () => box(410, 120, 100, 40)
  const anchor = cursorAnchor(root, button)!
  expect(cursorPosition(root, anchor.target, 0.5, 0.5)).toEqual({ left: 450, top: 120 })
  button.getBoundingClientRect = () => box(110, 220, 80, 40)
  expect(cursorPosition(root, anchor.target, 0.5, 0.5)).toEqual({ left: 140, top: 220 })
  expect(cursorPosition(root, { kind: 'block', id: 'different-file' }, 0.5, 0.5)).toBeNull()
  button.getBoundingClientRect = () => box(110, -220, 80, 40)
  expect(cursorPosition(root, anchor.target, 0.5, 0.5)).toBeNull()
  expect(cursorAnchor(root, root)).toBeNull()
})
