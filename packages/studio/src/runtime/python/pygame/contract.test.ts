import { expect, test } from 'bun:test'
import { pythonCanvasExtension } from '../canvasExtension'
import manifest from '../vendor-manifest.json'
import snippets from './approved-js-snippets.json'
import { hasPygameExtension, PYGAME_CE_WHEEL, PYGAME_EXTENSION } from './contract'

test('Pygame-ce owns the canvas only at its exact pinned version', () => {
  expect(hasPygameExtension([PYGAME_EXTENSION])).toBe(true)
  expect(hasPygameExtension([{ id: PYGAME_EXTENSION.id, version: '2.0.0' }])).toBe(false)
  expect(pythonCanvasExtension([PYGAME_EXTENSION])).toBe(PYGAME_EXTENSION.id)
  expect(() =>
    pythonCanvasExtension([PYGAME_EXTENSION, { id: 'python-pgzero', version: '1.0.0' }]),
  ).toThrow('mesma tela')
})

test('the wheel is the same file, size and sha in the contract, the vendor manifest and the snippets', () => {
  const vendor = manifest.files.filter((file) => file.path.startsWith('pygame_ce-'))
  expect(vendor).toEqual([
    {
      ...vendor[0]!,
      path: PYGAME_CE_WHEEL.file,
      bytes: PYGAME_CE_WHEEL.bytes,
      sha256: PYGAME_CE_WHEEL.sha256,
    },
  ])
  // The approved JavaScript snippets were recorded from exactly this wheel.
  expect(snippets.wheel).toEqual({ file: PYGAME_CE_WHEEL.file, sha256: PYGAME_CE_WHEEL.sha256 })
  expect(vendor[0]!.url.endsWith(`/${PYGAME_CE_WHEEL.file}`)).toBe(true)
})
