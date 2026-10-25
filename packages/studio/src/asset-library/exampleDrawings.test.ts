import { describe, expect, test } from 'bun:test'
import { PINTA_SOURCE_REF_PATTERN } from '@sistemazero/core/studio/pinta-source-ref'
import type { ProjectAsset } from '#core'
import { sanitizePythonProjectAssets } from '../core/pythonAssets'
import { PYGAME_GAME_EXAMPLES } from '../examples/python/pygameGames'
import {
  exampleDrawingDocumentId,
  exampleDrawingLibId,
  exampleDrawingOrigin,
  exampleDrawingRefOf,
  loadExampleDrawingsJson,
} from './exampleDrawings'
import { personalIdOf } from './personalSync'

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII='
const example = (libId: string, over: Partial<ProjectAsset> = {}): ProjectAsset => ({
  id: 'jogo-assets-nave.png',
  name: 'nave',
  kind: 'image',
  source: 'library',
  libId,
  dataUrl: PNG,
  proPath: 'assets/nave.png',
  ...over,
})

describe('example drawing reference (libId example-<gallery>:<game>:<drawing>)', () => {
  test('round-trips and names the source document', () => {
    const ref = { gallery: 'pygame' as const, game: 'space-shooter', drawing: 'nave' }
    const libId = exampleDrawingLibId(ref)
    expect(libId).toBe('example-pygame:space-shooter:nave')
    expect(exampleDrawingRefOf(example(libId))).toEqual(ref)
    expect(exampleDrawingDocumentId(ref)).toBe('space-shooter-nave')
  })

  test('only images from the library with a well-formed, known gallery reference', () => {
    const libId = 'example-pygame:space-shooter:nave'
    expect(exampleDrawingRefOf(example(libId, { source: 'upload' }))).toBeNull()
    expect(exampleDrawingRefOf(example(libId, { kind: 'audio' }))).toBeNull()
    for (const other of [
      'personal:abc',
      'example-camera-house',
      'example-turtle:jogo:nave',
      'example-pygame:jogo',
      'example-pygame:Jogo:nave',
      'example-pygame:jogo:na:ve',
    ])
      expect(exampleDrawingRefOf(example(other))).toBeNull()
  })

  test('names with "_" are example drawings, and their mark is one Pinta keeps', () => {
    const ref = exampleDrawingRefOf(example('example-pygame:meu_jogo:player_idle'))
    expect(ref).toEqual({ gallery: 'pygame', game: 'meu_jogo', drawing: 'player_idle' })
    const mark = `${exampleDrawingOrigin(ref!)}/${exampleDrawingDocumentId(ref!)}`
    expect(PINTA_SOURCE_REF_PATTERN.test(mark)).toBe(true)
  })

  test('a game named like an Object.prototype key is not a game', async () => {
    for (const game of ['constructor', 'toString', 'valueOf', '__proto__'])
      await expect(
        loadExampleDrawingsJson({ gallery: 'pygame', game, drawing: 'nave' }),
      ).rejects.toThrow('Este jogo de exemplo não está mais disponível.')
  })

  test('survives the Python sanitizer and stays invisible to the personal-library sync', () => {
    const asset = example('example-pygame:space-shooter:nave')
    const [saved] = sanitizePythonProjectAssets([asset])
    expect(saved).toMatchObject({
      source: 'library',
      libId: asset.libId,
      proPath: 'assets/nave.png',
    })
    expect(exampleDrawingRefOf(saved!)).not.toBeNull()
    expect(personalIdOf(saved!)).toBeNull()
  })
})

describe('the Pygame-ce gallery marks every Pinta drawing it ships', () => {
  for (const entry of PYGAME_GAME_EXAMPLES.filter((item) => item.key.endsWith(':code')))
    test(`${entry.key}: each PNG points at a document of the game's drawings`, async () => {
      const { assets = [] } = await entry.load()
      const images = assets.filter((asset) => asset.kind === 'image')
      const refs = images.map((asset) => exampleDrawingRefOf(asset))
      expect(refs.every((ref) => ref !== null)).toBe(true)
      for (const asset of assets.filter((item) => item.kind === 'audio'))
        expect(asset.source).toBe('upload')
      if (images.length === 0) return
      const json = await loadExampleDrawingsJson(refs[0]!)
      const ids = new Set(
        (JSON.parse(json) as { assets: Array<{ id: string }> }).assets.map((asset) => asset.id),
      )
      for (const [index, asset] of images.entries()) {
        const ref = refs[index]!
        expect(asset.proPath).toBe(`assets/${ref.drawing}.png`)
        expect(ids.has(exampleDrawingDocumentId(ref))).toBe(true)
      }
    })
})
