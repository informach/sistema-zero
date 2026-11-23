import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { readPintaRegionImageData } from '@sistemazero/core/studio/pinta-region-image'
import { unzlibSync } from 'fflate'
import { scene4Fixture } from '../../../core/tests/fixtures/pinta-region-scene'
import { utf8ByteLength } from '../core/jsonBytes'
import { pythonRequiredInCi } from '../testing/ciPython'
import { pngCrc32, pngWithPintaData } from './pngText'
import { embedPintaRegionImage, preparePintaRegionImageData } from './regionImage'

const sceneJson = () => JSON.stringify({ ...scene4Fixture(), physics: 'precise' })

test('the existing data producer still serializes after acquiring its asynchronous encoder', async () => {
  const data = { format: 'pinta', version: 1, name: 'before' }
  const pending = pngWithPintaData(cover(), data)
  data.name = 'after'
  const png = await pending,
    view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const text = new TextDecoder().decode(unzlibSync(png.subarray(51, 41 + view.getUint32(33))))
  expect(JSON.parse(text).name).toBe('after')
})
function cover() {
  const canvas = createCanvas(64, 32),
    ctx = canvas.getContext('2d')
  ctx.fillStyle = '#e04020'
  ctx.fillRect(0, 0, 64, 32)
  ctx.fillStyle = 'blue'
  ctx.fillRect(32, 16, 16, 8)
  return new Uint8Array(canvas.toBuffer('image/png'))
}
test('PNG 5 carries real wire chunks in a normal image, with exact metadata bytes and unchanged cover pixels', async () => {
  const original = cover(),
    result = await embedPintaRegionImage(original, sceneJson())
  expect(result.width).toBe(64)
  expect(result.height).toBe(32)
  expect(result.metadata.bytes).toBe(utf8ByteLength(result.metadata.json))
  const view = new DataView(result.png.buffer, result.png.byteOffset, result.png.byteLength),
    length = view.getUint32(33)
  expect(new TextDecoder().decode(result.png.subarray(37, 41))).toBe('iTXt')
  expect([...result.png.subarray(41, 51)]).toEqual([112, 105, 110, 116, 97, 0, 1, 0, 0, 0])
  const text = new TextDecoder().decode(unzlibSync(result.png.subarray(51, 41 + length)))
  expect(text).toBe(result.metadata.json)
  expect(readPintaRegionImageData(text)).toEqual(result.metadata.data)
  const raw = JSON.parse(text)
  expect(raw.version).toBe(5)
  expect(
    raw.scene.layers.find((layer: { kind: string }) => layer.kind === 'tiles').cells.encoding,
  ).toBe('i16le-base64-v1')
  for (const bytes of [original, result.png]) {
    const image = await loadImage(Buffer.from(bytes)),
      canvas = createCanvas(64, 32),
      ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)
    expect([...ctx.getImageData(2, 2, 1, 1).data]).toEqual([224, 64, 32, 255])
    expect([...ctx.getImageData(36, 20, 1, 1).data]).toEqual([0, 0, 255, 255])
  }
  expect(result.png.subarray(0, 33)).toEqual(original.subarray(0, 33))
  expect(result.png.subarray(33 + 12 + length)).toEqual(original.subarray(33))
})
test('scene and scale failures refuse before reading a cover, and metadata cannot normalize future fields away', async () => {
  const invalid = new Uint8Array([1])
  for (const source of [
    '{',
    JSON.stringify({ ...JSON.parse(sceneJson()), future: true }),
    JSON.stringify({ ...JSON.parse(sceneJson()), version: 3 }),
  ])
    await expect(embedPintaRegionImage(invalid, source)).rejects.toThrow('conferir os dados')
  for (const scale of [0, -1, 1 / 3, NaN, Infinity])
    expect(() => preparePintaRegionImageData(sceneJson(), { scale })).toThrow('conferir os dados')
  expect(preparePintaRegionImageData(sceneJson(), { scale: 2 }).data.scale).toBe(2)
})
test('duplicate Pinta metadata and corrupt PNGs cannot be silently wrapped as a new scene', async () => {
  const original = cover(),
    saved = original.slice()
  const legacy = await pngWithPintaData(original, { format: 'pinta', version: 1, kind: 'tileset' })
  await expect(embedPintaRegionImage(legacy, sceneJson())).rejects.toThrow('já tem dados')
  const once = await embedPintaRegionImage(original, sceneJson())
  await expect(embedPintaRegionImage(once.png, sceneJson())).rejects.toThrow('já tem dados')
  const corrupted = original.slice()
  corrupted[29] = corrupted[29]! ^ 1
  await expect(embedPintaRegionImage(corrupted, sceneJson())).rejects.toThrow('Integridade')
  await expect(
    embedPintaRegionImage(original.subarray(0, original.length - 1), sceneJson()),
  ).rejects.toThrow()
  expect(original).toEqual(saved)
})

test('adversarial PNG size headers refuse at the resolution budget before image allocation', async () => {
  for (const [width, height] of [
    [4097, 1],
    [4096, 1025],
  ]) {
    // Deliberately mismatched header/pixel payload: this tests admission, not image decoding.
    const png = cover(),
      view = new DataView(png.buffer, png.byteOffset, png.byteLength)
    view.setUint32(16, width!)
    view.setUint32(20, height!)
    view.setUint32(29, pngCrc32(png, 12, 29))
    await expect(embedPintaRegionImage(png, sceneJson())).rejects.toThrow('limite de resolução')
  }
})
test('one-map PNG 5 preserves admitted world descriptors without treating them as validated child payloads', () => {
  const world = {
    version: 1 as const,
    rootId: 'world',
    maps: [{ id: 'cabana', name: 'Cabana', png: 'data:image/png;base64,AA==' }],
  }
  expect(preparePintaRegionImageData(sceneJson(), { world }).data.world).toEqual(world)
  expect(() =>
    preparePintaRegionImageData(sceneJson(), { world: { ...world, rootId: 'other' } }),
  ).toThrow('conferir os dados')
})

const pygame = pythonRequiredInCi(
  [process.env.PYTHON, 'python3', 'python'].find(
    (name) => name && spawnSync(name, ['-I', '-c', 'import pygame']).status === 0,
  ),
)
test.skipIf(!pygame)(
  'the authentic PNG-4 Pygame reader accepts the ordinary image and refuses PNG-5 metadata',
  async () => {
    const root = resolve(tmpdir()),
      directory = await mkdtemp(join(root, 'pinta-png5-'))
    if (!resolve(directory).startsWith(root + sep)) throw Error('Unsafe test directory')
    try {
      const source = gunzipSync(
        await readFile(new URL('./__fixtures__/pinta-png4-reader.py.gz', import.meta.url)),
      )
      expect(createHash('sha256').update(source).digest('hex')).toBe(
        '76ab0c859b1226672428dd05335a45a9bc4b189d03223492a5672772c28f7c85',
      )
      await writeFile(join(directory, 'pinta.py'), source)
      const result = await embedPintaRegionImage(cover(), sceneJson())
      await writeFile(join(directory, 'map.png'), result.png)
      const script = `import sys,json\nsys.path.insert(0,sys.argv[1])\nimport pygame,pinta\nimage=pygame.image.load(sys.argv[1]+'/map.png')\nassert image.get_size()==(64,32)\nassert tuple(image.get_at((2,2)))==(224,64,32,255)\ntry:\n pinta.ler_dados(sys.argv[1]+'/map.png')\nexcept ValueError as error:\n assert 'Pinta mais novo' in str(error)\nelse:\n raise AssertionError('old reader admitted PNG 5')\nprint(json.dumps({'ordinaryPng':True,'metadata5Refused':True}))\n`
      const checked = spawnSync(pygame!, ['-I', '-c', script, directory], {
        encoding: 'utf8',
        env: {
          ...process.env,
          SDL_VIDEODRIVER: 'dummy',
          SDL_AUDIODRIVER: 'dummy',
          PYGAME_HIDE_SUPPORT_PROMPT: '1',
        },
      })
      expect(checked.status, checked.stderr).toBe(0)
      expect(JSON.parse(checked.stdout)).toEqual({ ordinaryPng: true, metadata5Refused: true })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  },
)
