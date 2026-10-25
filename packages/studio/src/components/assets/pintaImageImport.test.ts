import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import type { PintaImageDerivation } from '@sistemazero/core/studio/pinta-image'
import { PGZERO_EXTENSION } from '../../runtime/python/pgzero/contract'
import { pgzeroSvgSize } from '../../runtime/python/pgzero/svgSize'
import { PYGAME_EXTENSION } from '../../runtime/python/pygame/contract'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { createProjectStore } from '../../state/projectStore'
import { refinePythonProjectDocument } from '../../state/pythonProjectValidation'
import { addPintaCreationToProject, pintaImageOutputFor } from './addCreationToProject'

const dataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII='
const bytes = Buffer.from(dataUrl.split(',')[1]!, 'base64')
function imported(frameIndex: number) {
  const pintaImage: PintaImageDerivation = {
    recipe: {
      version: 1,
      algorithm: 'pinta-image-1',
      drawingId: 'drawing',
      selection: { kind: 'frame', animationId: 'andar', frameIndex },
      scale: 1,
    },
    provenance: { sourceSha256: 'a'.repeat(64), dependencies: [] },
    output: {
      mime: 'image/png',
      width: 1,
      height: 1,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    },
  }
  return { id: 'drawing', name: 'heroi', dataUrl, width: 1, height: 1, pintaImage, libRevision: 3 }
}

for (const kind of ['classic', 'pro'] as const) {
  test(`${kind}: two selected frames coexist and only the matching recipe updates`, async () => {
    const store = createProjectStore()
    const raw = documentFixture('python', kind)
    raw.assets = []
    store.getState().hydrateProject(await refinePythonProjectDocument(raw))
    expect(addPintaCreationToProject(store.getState(), imported(0))).toBeNull()
    expect(addPintaCreationToProject(store.getState(), imported(1))).toBeNull()
    const [first, second] = store.getState().project!.assets!
    expect(store.getState().project!.assets).toHaveLength(2)
    expect(first?.pintaImage?.recipe.selection).toEqual(imported(0).pintaImage.recipe.selection)
    expect(second?.pintaImage?.recipe.selection).toEqual(imported(1).pintaImage.recipe.selection)
    expect(first?.proPath).toBe('assets/heroi.png')
    expect(second?.proPath).toBe('assets/heroi-2.png')
    const next = imported(0)
    next.pintaImage.provenance.sourceSha256 = 'b'.repeat(64)
    next.libRevision = 4
    expect(addPintaCreationToProject(store.getState(), next)).toBeNull()
    expect(store.getState().project!.assets![1]).toEqual(second!)
    expect(store.getState().project!.assets![0]).toEqual({
      ...first!,
      pintaImage: next.pintaImage,
      libRevision: 4,
    })
    const before = store.getState().project
    const { pintaImage: _metadata, ...canonical } = imported(0)
    expect(addPintaCreationToProject(store.getState(), canonical)).toBeTruthy()
    expect(store.getState().project).toBe(before)
  })
}

test('review keeps the material identity; edits/removal and a concurrent addition win over late imports', async () => {
  const store = createProjectStore()
  const raw = documentFixture('python', 'pro')
  raw.assets = []
  store.getState().hydrateProject(await refinePythonProjectDocument(raw))
  expect(addPintaCreationToProject(store.getState(), imported(0))).toBeNull()
  const first = structuredClone(store.getState().project!.assets![0]!)
  expect(addPintaCreationToProject(store.getState(), imported(1), first)).toBeNull()
  const revised = store.getState().project!.assets![0]!
  expect(revised.id).toBe(first.id)
  expect(revised.name).toBe(first.name)
  expect(revised.proPath).toBe(first.proPath)
  expect(revised.pintaImage?.recipe.selection).toEqual(imported(1).pintaImage.recipe.selection)
  const before = store.getState().project
  expect(addPintaCreationToProject(store.getState(), imported(0), first)).toContain('mudou')
  expect(store.getState().project).toBe(before)
  const snapshot = structuredClone(revised)
  expect(store.getState().renameAsset(revised.id, 'nome-autoral')).toBeNull()
  const renamed = store.getState().project
  expect(addPintaCreationToProject(store.getState(), imported(0), snapshot)).toContain('mudou')
  expect(store.getState().project).toBe(renamed)
  store.getState().removeAsset(revised.id)
  expect(addPintaCreationToProject(store.getState(), imported(0), snapshot)).toContain('mudou')
  expect(store.getState().project?.assets).toEqual([])
  expect(addPintaCreationToProject(store.getState(), imported(0), null)).toBeNull()
  const concurrent = store.getState().project
  expect(addPintaCreationToProject(store.getState(), imported(0), null)).toContain('preparação')
  expect(store.getState().project).toBe(concurrent)
})

const svgText =
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16"><rect width="16" height="16" fill="#00f"/></svg>'
const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`
/** A vector drawing exported for a Pygame Zero destination: the recipe asks for SVG. */
function importedSvg(frameIndex = 0) {
  const base = imported(frameIndex)
  const svgBytes = Buffer.from(svgText)
  const pintaImage: PintaImageDerivation = {
    ...base.pintaImage,
    recipe: { ...base.pintaImage.recipe, output: 'svg' },
    output: {
      mime: 'image/svg+xml',
      width: 32,
      height: 32,
      bytes: svgBytes.length,
      sha256: createHash('sha256').update(svgBytes).digest('hex'),
    },
  }
  return { ...base, dataUrl: svgDataUrl, width: 32, height: 32, pintaImage }
}
async function pythonWith(kind: 'classic' | 'pro', extension?: { id: string; version: string }) {
  const store = createProjectStore()
  const raw = documentFixture('python', kind)
  raw.assets = []
  if (extension) raw.installedExtensions = [{ ...extension, installedAt: 1 }]
  store.getState().hydrateProject(await refinePythonProjectDocument(raw))
  return store
}

for (const kind of ['classic', 'pro'] as const) {
  const base = kind === 'pro' ? 'src/' : ''
  test(`${kind} Pygame Zero: vector arrives as SVG and pixel art as PNG, both in images/`, async () => {
    const store = await pythonWith(kind, PGZERO_EXTENSION)
    expect(addPintaCreationToProject(store.getState(), importedSvg())).toBeNull()
    expect(addPintaCreationToProject(store.getState(), imported(1))).toBeNull()
    const [vector, pixel] = store.getState().project!.assets!
    expect(vector?.proPath).toBe(`${base}images/heroi.svg`)
    expect(vector?.dataUrl).toBe(svgDataUrl)
    expect([vector?.width, vector?.height]).toEqual([32, 32])
    expect(vector?.pintaImage?.recipe.output).toBe('svg')
    expect(pixel?.proPath).toBe(`${base}images/heroi_2.png`)
    // The stored SVG is what Pygame Zero sizes: root width/height = the chosen output.
    expect(pgzeroSvgSize(svgText)).toEqual({ width: 32, height: 32 })
    // The same recipe again (a newer Pinta revision) updates the SVG in place.
    const next = importedSvg()
    next.pintaImage.provenance.sourceSha256 = 'c'.repeat(64)
    expect(addPintaCreationToProject(store.getState(), next)).toBeNull()
    expect(store.getState().project!.assets).toHaveLength(2)
    expect(store.getState().project!.assets![0]?.proPath).toBe(`${base}images/heroi.svg`)
    // The file carries the format: an SVG recipe cannot rewrite the PNG material.
    const pngTarget = structuredClone(store.getState().project!.assets![1]!)
    const before = store.getState().project
    expect(addPintaCreationToProject(store.getState(), importedSvg(1), pngTarget)).toBeTruthy()
    expect(store.getState().project).toBe(before)
  })

  test(`${kind} Turtle: a vector drawing arrives as SVG (a turtle shape), pixel art as PNG`, async () => {
    const vector = {
      kind: 'frame' as const,
      width: 16,
      height: 16,
      animations: [],
      vector: true,
      turtleShape: true,
    }
    const turtle = await pythonWith(kind, TURTLE_EXTENSION)
    // formas_do_pinta turns the vector into a shape that turns with the turtle.
    expect(pintaImageOutputFor(turtle.getState().project, vector)).toBe('svg')
    // With text, a picture or a mask it cannot become a shape: it stays a PNG image.
    expect(
      pintaImageOutputFor(turtle.getState().project, { ...vector, turtleShape: undefined }),
    ).toBeUndefined()
    expect(addPintaCreationToProject(turtle.getState(), imported(0))).toBeNull()
    expect(addPintaCreationToProject(turtle.getState(), importedSvg(1))).toBeNull()
    expect(turtle.getState().project!.assets!.map((asset) => asset.proPath)).toEqual([
      'assets/heroi.png',
      'assets/heroi-2.svg',
    ])
    // Without Turtle there is no use for the vector: PNG only, and an SVG recipe never enters.
    const plain = await pythonWith(kind, undefined)
    expect(pintaImageOutputFor(plain.getState().project, vector)).toBeUndefined()
    expect(addPintaCreationToProject(plain.getState(), imported(0))).toBeNull()
    const before = plain.getState().project
    expect(addPintaCreationToProject(plain.getState(), importedSvg(1))).toContain('PNG')
    expect(plain.getState().project).toBe(before)
  })

  test(`${kind} Pygame-ce: Pinta drawings become PNG assets usable by pygame.image.load`, async () => {
    const store = await pythonWith(kind, PYGAME_EXTENSION)
    expect(
      pintaImageOutputFor(store.getState().project, {
        kind: 'frame',
        width: 16,
        height: 16,
        animations: [],
        vector: true,
      }),
    ).toBeUndefined()
    expect(addPintaCreationToProject(store.getState(), imported(0))).toBeNull()
    const asset = store.getState().project!.assets![0]!
    expect(asset.proPath).toBe('assets/heroi.png')
    expect(asset.dataUrl).toBe(dataUrl)
    const next = imported(0)
    next.pintaImage.provenance.sourceSha256 = 'b'.repeat(64)
    expect(addPintaCreationToProject(store.getState(), next)).toBeNull()
    expect(store.getState().project!.assets).toHaveLength(1)
    expect(store.getState().project!.assets![0]?.proPath).toBe('assets/heroi.png')
  })
}

test('the destination decides the format: Pygame Zero or Turtle + a vector drawing asks for SVG', async () => {
  const vector = { kind: 'background', width: 8, height: 8, vector: true } as const
  const pixel = { kind: 'background', width: 8, height: 8 } as const
  const pgzero = (await pythonWith('classic', PGZERO_EXTENSION)).getState().project
  expect(pintaImageOutputFor(pgzero, vector)).toBe('svg')
  expect(pintaImageOutputFor(pgzero, pixel)).toBeUndefined()
  expect(
    pintaImageOutputFor(pgzero, { kind: 'unavailable', reason: 'needs-tileset' }),
  ).toBeUndefined()
  // Reviewing an existing material keeps the format its file already has.
  expect(pintaImageOutputFor(pgzero, vector, {})).toBeUndefined()
  expect(pintaImageOutputFor(pgzero, pixel, { output: 'svg' })).toBe('svg')
  const turtle = (await pythonWith('classic', TURTLE_EXTENSION)).getState().project
  expect(pintaImageOutputFor(turtle, vector)).toBeUndefined()
  expect(pintaImageOutputFor(turtle, { ...vector, turtleShape: true })).toBe('svg')
  expect(pintaImageOutputFor(pgzero, { ...vector, turtleShape: true })).toBe('svg')
  expect(pintaImageOutputFor(turtle, pixel)).toBeUndefined()
  const plain = (await pythonWith('classic', undefined)).getState().project
  expect(pintaImageOutputFor(plain, vector)).toBeUndefined()
  expect(pintaImageOutputFor(null, vector)).toBeUndefined()
})
