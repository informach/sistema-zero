import { expect, test } from 'bun:test'
import { createPygameScreen, installSdlWorkerGlobals, takeScreenPixels } from './sdlScreen'

test('the SDL canvas keeps a copy of each flip, taken once', () => {
  const screen = createPygameScreen()
  const canvas = screen.canvas as {
    id: string
    getContext(kind: string): {
      createImageData(width: number, height: number): ImageData
      putImageData(image: ImageData): void
    } | null
  }
  expect(canvas.id).toBe('canvas')
  expect(canvas.getContext('webgl')).toBeNull()
  const context = canvas.getContext('2d')!
  const image = context.createImageData(2, 1)
  image.data.set([1, 2, 3, 255, 4, 5, 6, 255])
  context.putImageData(image)
  // SDL reuses its ImageData: the copy must not change with the next frame's pixels.
  image.data[0] = 99
  expect([...screen.take()!]).toEqual([1, 2, 3, 255, 4, 5, 6, 255])
  expect(screen.take()).toBeUndefined()
})

test('only the page objects a worker lacks are defined, and they are inert', () => {
  const scope = {} as typeof globalThis
  installSdlWorkerGlobals(scope)
  const page = scope as unknown as {
    screen: { width: number }
    document: { querySelector(query: string): unknown; addEventListener(): void }
  }
  expect(page.screen.width).toBe(1920)
  expect(page.document.querySelector('#canvas')).toBeNull()
  expect(() => page.document.addEventListener()).not.toThrow()
  const existing = { screen: 'mine' } as unknown as typeof globalThis
  installSdlWorkerGlobals(existing)
  expect((existing as unknown as { screen: string }).screen).toBe('mine')
})

test('a frame takes the flip of its own size; another size or no flip fails by name', () => {
  const screen = createPygameScreen()
  const context = (
    screen.canvas as {
      getContext(kind: string): {
        createImageData(width: number, height: number): ImageData
        putImageData(image: ImageData): void
      }
    }
  ).getContext('2d')
  context.putImageData(context.createImageData(2, 1))
  expect(takeScreenPixels(screen, 2, 1).byteLength).toBe(8)
  // Nothing drawn since: the page must not show the previous picture again.
  expect(() => takeScreenPixels(screen, 2, 1)).toThrow('não desenhou a tela')
  // SDL drew a window bigger than the game's surface (what SCALED would do).
  context.putImageData(context.createImageData(4, 2))
  expect(() => takeScreenPixels(screen, 2, 1)).toThrow(
    'chegou com 8 pixels, mas a janela tem 2 × 1',
  )
})
