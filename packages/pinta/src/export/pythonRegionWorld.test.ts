import { expect, it } from 'bun:test'
import { createHash } from 'node:crypto'
import { createCanvas } from '@napi-rs/canvas'
import { createRegionCellReader } from '@sistemazero/core/creations'
import {
  PINTA_REGION_IMAGE_MAX_JSON_BYTES,
  preparePintaRegionImageData as prepareCoreImage,
} from '@sistemazero/core/studio/pinta-region-image'
import type { PintaRegionScene } from '@sistemazero/core/studio/pinta-region-scene'
import { scene4BudgetFixture } from '../../../core/tests/fixtures/pinta-region-scene'
import { nativeImageOf } from '../../scripts/homologacao/generate'
import { regionVila } from '../testing/regionVila'
import { purePython, runPurePython } from '../testing/runPurePython'
import { pngChunk, pngWithPintaJson } from './pngText'
import { pythonRegionWorld } from './pythonRegionWorld'
import { embedPintaRegionImage } from './regionImage'
import { readPintaRegionImageWorld } from './regionImageWorld'
import { exportPintaRegionScene } from './regionScene'

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const url = (bytes: Uint8Array) => `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64')
function png(width = 64, height = 32, color = '#1234ef') {
  const canvas = createCanvas(width, height),
    ctx = canvas.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  return new Uint8Array(canvas.toBuffer('image/png'))
}
function scene(id = 'vila', image = url(png(64, 16))): any {
  const { art: _art, resources: _resources, ...source } = scene4BudgetFixture(1, 1)
  return {
    ...source,
    id,
    name: id,
    physics: 'legacy',
    tilesets: source.tilesets.map((sheet) => ({ ...sheet, image })),
  }
}
const metadata = (source: any, extra = {}) => ({
  format: 'pinta',
  version: 5,
  kind: 'map',
  name: source.name,
  scale: 1,
  scene: source,
  ...extra,
})
async function world(root = scene(), child = scene('cabana', root.tilesets[0].image)) {
  const childPng = (await embedPintaRegionImage(png(), JSON.stringify(child))).png
  return (
    await embedPintaRegionImage(png(), JSON.stringify(root), {
      world: {
        version: 1,
        rootId: root.id,
        maps: [{ id: child.id, name: child.name, png: url(childPng) }],
      },
    })
  ).png
}
function expectedScene(source: PintaRegionScene): unknown {
  const map = (current: Pick<PintaRegionScene, 'origin' | 'cols' | 'rows' | 'layers'>) => ({
    ...current,
    layers: current.layers.map((layer) => {
      if (layer.kind !== 'tiles') return layer
      const cells: number[][] = []
      createRegionCellReader(layer.cells).visitOccupied(
        { ...current.origin, cols: current.cols, rows: current.rows },
        (cell, col, row) => cells.push([cell, col, row]),
        'row-major',
      )
      return { ...layer, cells }
    }),
  })
  return { ...source, ...map(source), ...(source.sets ? { sets: source.sets.map(map) } : {}) }
}
function expectedWorld(source: Uint8Array): unknown {
  const result = readPintaRegionImageWorld(source)
  return {
    rootId: result.rootId,
    imagePixels: result.imagePixels,
    maps: [...result.maps].map(([id, map]) => [
      id,
      { ...map, data: { ...map.data, scene: expectedScene(map.data.scene) }, png: hash(map.png) },
    ]),
    images: [...result.images].map(([id, image]) => [id, { ...image, png: hash(image.png) }]),
  }
}
const summarize = `
def summarize_scene(scene):
    for current in [scene]+scene.get('sets',[]):
        rect=dict(current['origin'],cols=current['cols'],rows=current['rows'])
        for layer in current['layers']:
            if layer['kind']=='tiles':
                layer['cells']=list(layer['cells'].occupied(rect,True))
    return scene
def summarize_world(world):
    maps=[]
    for key,item in world['maps'].items():
        data=item['data']
        data['scene']=summarize_scene(data['scene'])
        maps.append([key,dict(item,png=hashlib.sha256(item['png']).hexdigest(),data=data)])
    return {'rootId':world['rootId'],'imagePixels':world['imagePixels'],'maps':maps,'images':[[key,dict(image,png=hashlib.sha256(image['png']).hexdigest())] for key,image in world['images'].items()]}
`

it.skipIf(!purePython)(
  'the complete Vila and Cabana PNG world agrees with the JS registry and captured images',
  async () => {
    const { map, cabana: child, assets } = regionVila()
    const find = (id: string) => assets.find((a) => a.id === id) ?? null
    const rootScene = await exportPintaRegionScene(map, find, nativeImageOf)
    const childScene = await exportPintaRegionScene(child, find, nativeImageOf)
    const childPng = (await embedPintaRegionImage(png(), childScene.json)).png
    const root = (
      await embedPintaRegionImage(png(), rootScene.json, {
        world: {
          version: 1,
          rootId: map.id,
          maps: [{ id: child.id, name: child.name, png: url(childPng) }],
        },
      })
    ).png
    expect(
      await runPurePython(
        pythonRegionWorld,
        `${summarize}
raw=bytearray(base64.b64decode(json.load(sys.stdin)))
world=ler_mundo_png(raw)
raw[:]=bytes(len(raw))
print(json.dumps(summarize_world(world)))`,
        b64(root),
      ),
    ).toEqual(expectedWorld(root))
  },
)

it.skipIf(!purePython)(
  'metadata plans preserve readonly descriptors and the same header admission as Core',
  async () => {
    const root = scene(),
      child = await world()
    const base = metadata(root)
    const cases: any[] = [
      base,
      { ...base, scale: 0.5 },
      { ...base, version: 6 },
      { ...base, scene: { ...root, physics: undefined } },
      { ...base, name: 'other' },
      { ...base, scale: 1 / 3 },
    ]
    for (const id of ['vila', 'vila\n', 'vila\u007f', 'vila\u0085', 'vila🌳', 'vila\ud800'])
      cases.push({ ...base, scene: { ...root, id }, world: { version: 1, rootId: id, maps: [] } })
    const descriptor = { id: 'cabana', name: 'cabana', png: url(child) }
    cases.push(
      { ...base, world: { version: 1, rootId: 'vila', maps: [descriptor] } },
      { ...base, world: { version: 1, rootId: 'vila', maps: [descriptor, descriptor] } },
      { ...base, world: { version: 1, rootId: 'vila', maps: [{ ...descriptor, id: 'vila' }] } },
    )
    const texts = cases.map((data) => JSON.stringify(data))
    const actual = await runPurePython(
      pythonRegionWorld,
      `results=[]
for text in json.load(sys.stdin):
    plan=preparar_imagem(text)
    if plan is None:
        results.append(None)
        continue
    if plan.world is not None:
        try:
            plan.world['rootId']='other'
            raise AssertionError('Mutable world header')
        except TypeError:
            pass
        if plan.world['maps']:
            try:
                plan.world['maps'][0]['name']='other'
                raise AssertionError('Mutable descriptor')
            except TypeError:
                pass
    scene=plan.decode()
    assert plan.decode() is None
    results.append({'id':plan.id,'name':plan.name,'scale':plan.scale,'indexBytes':plan.index_bytes,'data':dict(scene,scene=summarize_scene(scene['scene']))} if scene is not None else None)
print(json.dumps(results))`.replace('results=[]', `${summarize}\nresults=[]`),
      texts,
    )
    expect(actual).toEqual(
      texts.map((text) => {
        const plan = prepareCoreImage(text)
        const data = plan?.decode()
        return plan && data
          ? {
              id: plan.id,
              name: plan.name,
              scale: plan.scale,
              indexBytes: plan.indexBytes,
              data: { ...data, scene: expectedScene(data.scene) },
            }
          : null
      }),
    )
  },
)

it.skipIf(!purePython)(
  'future, mismatched, nested and corrupt destinations refuse without replacing an admitted world',
  async () => {
    const good = await world(),
      root = scene(),
      child = scene('cabana', root.tilesets[0].image)
    const invalidCell = structuredClone(child)
    const cells = Buffer.from(invalidCell.layers[0].cells.chunks[0].data, 'base64')
    cells.writeInt16LE(9, 0)
    invalidCell.layers[0].cells.chunks[0].data = cells.toString('base64')
    const variants: any[] = [
      { ...metadata(child), version: 6 },
      metadata({ ...child, id: 'other' }),
      metadata({ ...child, name: 'other' }),
      metadata(child, { world: { version: 1, rootId: child.id, maps: [] } }),
      metadata(child, { scale: 2 }),
      metadata(invalidCell),
    ]
    const sources: Uint8Array[] = []
    for (const data of variants) {
      const childPng = await pngWithPintaJson(png(), JSON.stringify(data))
      sources.push(
        await pngWithPintaJson(
          png(),
          JSON.stringify(
            metadata(root, {
              world: {
                version: 1,
                rootId: root.id,
                maps: [{ id: child.id, name: child.name, png: url(childPng) }],
              },
            }),
          ),
        ),
      )
    }
    const corrupt = (await embedPintaRegionImage(png(), JSON.stringify(child))).png.slice()
    corrupt[corrupt.length - 1]! ^= 1
    sources.push(
      await pngWithPintaJson(
        png(),
        JSON.stringify(
          metadata(root, {
            world: {
              version: 1,
              rootId: root.id,
              maps: [{ id: child.id, name: child.name, png: url(corrupt) }],
            },
          }),
        ),
      ),
    )
    expect(
      await runPurePython(
        pythonRegionWorld,
        `items=json.load(sys.stdin)
accepted=ler_mundo_png(base64.b64decode(items[0]))
before=hashlib.sha256(accepted['maps'][accepted['rootId']]['png']).hexdigest()
for item in items[1:]:
    try:
        ler_mundo_png(base64.b64decode(item))
        raise AssertionError('Invalid destination admitted')
    except ValueError:
        pass
assert hashlib.sha256(accepted['maps'][accepted['rootId']]['png']).hexdigest()==before
assert accepted['maps'][accepted['rootId']]['data']['scene']['layers'][0]['cells'].at(0,0)==0
print(json.dumps({'refused':len(items)-1,'preserved':True}))`,
        [b64(good), ...sources.map(b64)],
      ),
    ).toEqual({ refused: sources.length, preserved: true })
    for (const source of sources) expect(() => readPintaRegionImageWorld(source)).toThrow()
  },
)

it.skipIf(!purePython)(
  'resource CRC, geometry and rounding failures precede region cell allocation',
  async () => {
    const root = scene(),
      good = await world(root)
    const bad = scene('vila', url(png(16, 16)))
    const data = metadata(bad)
    const broken = await pngWithPintaJson(png(), JSON.stringify(data))
    const rounding = scene()
    rounding.art = [{ id: 'tiny', image: url(png(1, 1)), width: 1, height: 1 }]
    const rounded = await pngWithPintaJson(
      png(),
      JSON.stringify(metadata(rounding, { scale: 0.49999999999999994 })),
    )
    const corrupt = png(64, 16)
    corrupt[corrupt.length - 1]! ^= 1
    const badCrc = await pngWithPintaJson(
      png(),
      JSON.stringify(metadata(scene('vila', url(corrupt)))),
    )
    expect(() => readPintaRegionImageWorld(broken)).toThrow()
    expect(() => readPintaRegionImageWorld(rounded)).toThrow()
    expect(() => readPintaRegionImageWorld(badCrc)).toThrow()
    expect(
      await runPurePython(
        pythonRegionWorld,
        `items=json.load(sys.stdin)
original=array.array
calls=[]
def watched(*args,**kwargs):
    calls.append(1)
    return original(*args,**kwargs)
array.array=watched
for item in items[1:]:
    source=base64.b64decode(item)
    try:
        ler_mundo_png(source)
        raise AssertionError('Invalid resource admitted')
    except ValueError:
        pass
assert calls==[]
assert ler_mundo_png(base64.b64decode(items[0]))['imagePixels']>0 and calls
array.array=original
assert _pinta_round_positive(0.49999999999999994)==0
print(json.dumps({'preflight':True}))`,
        [b64(good), b64(broken), b64(rounded), b64(badCrc)],
      ),
    ).toEqual({ preflight: true })
  },
)

it.skipIf(!purePython)(
  'source and scaled image accounting agrees for shared resources across maps',
  async () => {
    const root = scene(),
      child = scene('cabana', root.tilesets[0].image)
    const sources = []
    for (const scale of [0.5, 1, 2]) {
      const childPng = (await embedPintaRegionImage(png(), JSON.stringify(child), { scale })).png
      sources.push(
        (
          await embedPintaRegionImage(png(), JSON.stringify(root), {
            scale,
            world: {
              version: 1,
              rootId: root.id,
              maps: [{ id: child.id, name: child.name, png: url(childPng) }],
            },
          })
        ).png,
      )
    }
    expect(
      await runPurePython(
        pythonRegionWorld,
        `${summarize}
print(json.dumps([summarize_world(ler_mundo_png(base64.b64decode(item))) for item in json.load(sys.stdin)]))`,
        sources.map(b64),
      ),
    ).toEqual(sources.map(expectedWorld))
  },
)

it.skipIf(!purePython)(
  'the full four-MiB world index budget decodes and the next chunk refuses before allocation',
  async () => {
    const root = scene(),
      child = scene('cabana', root.tilesets[0].image)
    root.layers = scene4BudgetFixture(16, 64).layers
    child.layers = scene4BudgetFixture(16, 64).layers
    const good = await world(root, child)
    const bad = structuredClone(child)
    bad.layers[0].cells.chunks.push({ ...bad.layers[0].cells.chunks[0], col: 64 })
    const broken = await world(root, bad)
    expect(() => readPintaRegionImageWorld(broken)).toThrow()
    expect(readPintaRegionImageWorld(good).maps.size).toBe(2)
    expect(
      await runPurePython(
        pythonRegionWorld,
        `items=json.load(sys.stdin)
original=array.array
calls=[]
def watched(*args,**kwargs):
    calls.append(1)
    return original(*args,**kwargs)
array.array=watched
try:
    ler_mundo_png(base64.b64decode(items[1]))
    raise AssertionError('World index budget ignored')
except ValueError:
    pass
assert calls==[]
world=ler_mundo_png(base64.b64decode(items[0]))
assert len(calls)==2048
for item in world['maps'].values():
    assert len(item['data']['scene']['layers'])==16
    assert item['data']['scene']['layers'][-1]['cells'].at(2047,31)==0
array.array=original
print(json.dumps({'maps':len(world['maps']),'indexBytes':len(calls)*_REGION_BYTES}))`,
        [b64(good), b64(broken)],
      ),
    ).toEqual({ maps: 2, indexBytes: 4194304 })
  },
  30000,
)

it.skipIf(!purePython)(
  'sixteen real map PNGs fit and the seventeenth refuses at the root header',
  async () => {
    const root = scene(),
      descriptors = []
    for (let index = 0; index < 16; index++) {
      const child = scene(`place${index}`, root.tilesets[0].image)
      const bytes = (await embedPintaRegionImage(png(), JSON.stringify(child))).png
      descriptors.push({ id: child.id, name: child.name, png: url(bytes) })
    }
    const good = await pngWithPintaJson(
      png(),
      JSON.stringify(
        metadata(root, { world: { version: 1, rootId: root.id, maps: descriptors.slice(0, 15) } }),
      ),
    )
    const bad = await pngWithPintaJson(
      png(),
      JSON.stringify(metadata(root, { world: { version: 1, rootId: root.id, maps: descriptors } })),
    )
    expect(readPintaRegionImageWorld(good).maps.size).toBe(16)
    expect(() => readPintaRegionImageWorld(bad)).toThrow()
    expect(
      await runPurePython(
        pythonRegionWorld,
        `items=json.load(sys.stdin)
original=array.array
calls=[]
def watched(*args,**kwargs):
    calls.append(1)
    return original(*args,**kwargs)
array.array=watched
try:
    ler_mundo_png(base64.b64decode(items[1]))
    raise AssertionError('Map count ignored')
except ValueError:
    pass
assert calls==[]
world=ler_mundo_png(base64.b64decode(items[0]))
assert len(calls)==16
array.array=original
print(json.dumps({'maps':len(world['maps']),'images':len(world['images'])}))`,
        [b64(good), b64(bad)],
      ),
    ).toEqual({ maps: 16, images: 1 })
  },
)

it.skipIf(!purePython)(
  'the linked-PNG character budget is aggregated at metadata admission',
  async () => {
    const source = scene(),
      prefix = 'data:image/png;base64,',
      maximum = 4 * 1024 * 1024
    const exact = {
      id: 'cabana',
      name: 'cabana',
      png: prefix + 'A'.repeat(maximum - prefix.length),
    }
    const descriptors = Array.from({ length: 3 }, (_, index) => ({
      id: `place${index}`,
      name: 'Place',
      png: prefix + 'A'.repeat(1500000),
    }))
    const texts = [
      JSON.stringify(metadata(source, { world: { version: 1, rootId: source.id, maps: [exact] } })),
      JSON.stringify(
        metadata(source, {
          world: { version: 1, rootId: source.id, maps: [{ ...exact, png: `${exact.png}A` }] },
        }),
      ),
      JSON.stringify(
        metadata(source, { world: { version: 1, rootId: source.id, maps: descriptors } }),
      ),
    ]
    const expected = texts.map((text) => prepareCoreImage(text) !== null)
    expect(expected).toEqual([true, false, false])
    expect(
      await runPurePython(
        pythonRegionWorld,
        `texts=json.load(sys.stdin)
result=[]
for text in texts:
    plan=preparar_imagem(text)
    result.append(plan is not None)
print(json.dumps(result))`,
        texts,
      ),
    ).toEqual(expected)
  },
)

it.skipIf(!purePython)(
  'adversarial PNG headers exercise the exact aggregate pixel ceiling without allocating image surfaces',
  async () => {
    const resource = url(png(64, 64)),
      root = scene('vila', resource)
    function header(width: number, height: number) {
      const bytes = png(),
        view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      view.setUint32(16, width)
      view.setUint32(20, height)
      bytes.set(pngChunk('IHDR', bytes.subarray(16, 29)), 8)
      return bytes
    }
    const children = []
    for (let index = 0; index < 3; index++) {
      const child = scene(`place${index}`, resource),
        cover = index === 2 ? header(4096, 1023) : header(2048, 2048)
      const encoded = (await embedPintaRegionImage(cover, JSON.stringify(child))).png
      children.push({ id: child.id, name: child.name, png: url(encoded) })
    }
    const good = (
      await embedPintaRegionImage(header(2048, 2048), JSON.stringify(root), {
        world: { version: 1, rootId: root.id, maps: children },
      })
    ).png
    const bad = structuredClone(root)
    bad.tilesets[0].image = url(png(64, 65))
    const broken = (
      await embedPintaRegionImage(header(2048, 2048), JSON.stringify(bad), {
        world: { version: 1, rootId: root.id, maps: children },
      })
    ).png
    expect(readPintaRegionImageWorld(good).imagePixels).toBe(16777216)
    expect(() => readPintaRegionImageWorld(broken)).toThrow()
    expect(
      await runPurePython(
        pythonRegionWorld,
        `items=json.load(sys.stdin)
good=ler_mundo_png(base64.b64decode(items[0]))
original=array.array
calls=[]
def watched(*args,**kwargs):
    calls.append(1)
    return original(*args,**kwargs)
array.array=watched
try:
    ler_mundo_png(base64.b64decode(items[1]))
    raise AssertionError('Pixel budget ignored')
except ValueError:
    pass
assert calls==[]
array.array=original
print(json.dumps({'imagePixels':good['imagePixels'],'preflight':True}))`,
        [b64(good), b64(broken)],
      ),
    ).toEqual({ imagePixels: 16777216, preflight: true })
  },
)

it.skipIf(!purePython)(
  'the scene byte ceiling uses JS number and Unicode spelling rather than Python JSON defaults',
  async () => {
    const source = scene()
    source.name = 'Vila 🌳'
    source.physics = 'precise'
    source.layers.push({
      id: 'points',
      kind: 'objects',
      name: 'Pontos',
      visible: true,
      objects: [
        { id: 'point', name: '', type: '', x: 1e20, y: 1e-6, width: 0, height: 0, properties: {} },
      ],
    })
    source.art = Array.from({ length: 11 }, (_, index) => ({
      id: `art${index}`,
      image: 'a'.repeat(index < 10 ? 800000 : 1),
      width: 1,
      height: 1,
    }))
    const size = Buffer.byteLength(JSON.stringify(source)),
      maximum = 8 * 1024 * 1024
    source.art[10].image += 'a'.repeat(maximum - size)
    expect(source.art[10].image.length).toBeLessThan(800000)
    expect(Buffer.byteLength(JSON.stringify(source))).toBe(maximum)
    const exact = JSON.stringify(metadata(source))
    const bad = structuredClone(source)
    bad.art[10].image += 'a'
    const texts = [exact, JSON.stringify(metadata(bad))]
    expect(prepareCoreImage(texts[0]!)?.decode()).not.toBeNull()
    expect(prepareCoreImage(texts[1]!)).toBeNull()
    expect(
      await runPurePython(
        pythonRegionWorld,
        `items=json.load(sys.stdin)
result=[]
for text in items:
    plan=preparar_imagem(text)
    result.append(plan is not None and plan.decode() is not None)
print(json.dumps(result))`,
        texts,
      ),
    ).toEqual([true, false])
  },
  30000,
)

it.skipIf(!purePython)(
  'the actual sixteen-MiB world metadata budget admits exactly and rejects the next byte before cells',
  async () => {
    const root = scene()
    const properties = Object.fromEntries(
      Array.from({ length: 16 }, (_, index) => [`p${index}`, 'a'.repeat(200)]),
    )
    for (let index = 0; index < 5; index++)
      root.layers.push({
        id: `objects${index}`,
        kind: 'objects',
        name: 'Objects',
        visible: true,
        objects: Array.from({ length: 512 }, (_, id) => ({
          id: `o${id}`,
          name: '',
          type: '',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          properties,
        })),
      })
    let size = Buffer.byteLength(JSON.stringify(root))
    while (size > 7 * 1024 * 1024) {
      const layer = root.layers.at(-1),
        object = layer.objects.pop()
      size -= Buffer.byteLength(JSON.stringify(object)) + (layer.objects.length ? 1 : 0)
      if (!layer.objects.length) throw Error('Unexpected metadata fixture size')
    }
    expect(Buffer.byteLength(JSON.stringify(root))).toBe(size)
    const child = { ...root, id: 'cabana', name: 'cabana' }
    const childText = JSON.stringify(metadata(child)),
      childPng = await pngWithPintaJson(png(), childText)
    const rootText = JSON.stringify(
      metadata(root, {
        world: {
          version: 1,
          rootId: root.id,
          maps: [{ id: child.id, name: child.name, png: url(childPng) }],
        },
      }),
    )
    const remaining =
      PINTA_REGION_IMAGE_MAX_JSON_BYTES - Buffer.byteLength(rootText) - Buffer.byteLength(childText)
    expect(remaining).toBeGreaterThan(0)
    const exactText = rootText + ' '.repeat(remaining)
    expect(Buffer.byteLength(exactText) + Buffer.byteLength(childText)).toBe(
      PINTA_REGION_IMAGE_MAX_JSON_BYTES,
    )
    const good = await pngWithPintaJson(png(), exactText),
      broken = await pngWithPintaJson(png(), `${exactText} `)
    expect(readPintaRegionImageWorld(good).maps.size).toBe(2)
    expect(() => readPintaRegionImageWorld(broken)).toThrow()
    expect(
      await runPurePython(
        pythonRegionWorld,
        `items=json.load(sys.stdin)
original=array.array
calls=[]
def watched(*args,**kwargs):
    calls.append(1)
    return original(*args,**kwargs)
array.array=watched
try:
    ler_mundo_png(base64.b64decode(items[1]))
    raise AssertionError('Metadata budget ignored')
except ValueError:
    pass
assert calls==[]
world=ler_mundo_png(base64.b64decode(items[0]))
assert len(calls)==2
array.array=original
print(json.dumps({'maps':len(world['maps']),'decodedChunks':len(calls)}))`,
        [b64(good), b64(broken)],
      ),
    ).toEqual({ maps: 2, decodedChunks: 2 })
  },
  30000,
)
