import { expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { createRegionCellReader } from '@sistemazero/core/creations'
import {
  PINTA_REGION_SCENE_MAX_INDEX_BYTES,
  PINTA_REGION_SCENE_MAX_JSON_BYTES,
  type PintaRegionScene,
  preparePintaRegionScene,
  readPintaRegionScene,
} from '@sistemazero/core/studio/pinta-region-scene'
import { scene4Fixture } from '../../../core/tests/fixtures/pinta-region-scene'
import { nativeImageOf } from '../../scripts/homologacao/generate'
import { regionVila } from '../testing/regionVila'
import { pythonSceneDocument } from './pythonSceneDocument'
import { exportPintaRegionScene } from './regionScene'

const python = [process.env.PYTHON, 'python3', 'python'].find(
  (name) => name && spawnSync(name, ['-I', '-c', 'import json, re']).status === 0,
)
const cache = resolve(import.meta.dir, '../../../../.cache')
async function run(body: string, data: unknown): Promise<unknown> {
  await mkdir(cache, { recursive: true })
  const directory = await mkdtemp(join(cache, 'pinta-scene-data-'))
  if (dirname(directory) !== cache || !basename(directory).startsWith('pinta-scene-data-'))
    throw Error('Unexpected temporary test directory')
  try {
    const file = join(directory, 'check.py')
    await writeFile(
      file,
      `import sys
sys.stdin.reconfigure(encoding='utf-8')
class NoGraphics:
    def find_spec(self, fullname, path=None, target=None):
        if fullname.split('.')[0] in ('pygame','pgzero','pyray','raylib'):
            raise ImportError('Data admission must not import graphics: '+fullname)
sys.meta_path.insert(0,NoGraphics())
${pythonSceneDocument}\n${body}`,
    )
    const result = spawnSync(python!, ['-I', file], {
      input: JSON.stringify(data),
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 8 * 1024 * 1024,
    })
    expect(result.status, result.stderr || result.error?.message).toBe(0)
    return JSON.parse(result.stdout)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
const summarize = `
def summarize(scene):
    if scene is None:
        return None
    for current in [scene]+scene.get('sets',[]):
        rect=dict(current['origin'],cols=current['cols'],rows=current['rows'])
        for layer in current['layers']:
            if layer['kind']=='tiles':
                layer['cells']=list(layer['cells'].occupied(rect,True))
    return scene
`
function expected(scene: PintaRegionScene | null): unknown {
  if (!scene) return null
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
  return { ...scene, ...map(scene), ...(scene.sets ? { sets: scene.sets.map(map) } : {}) }
}
function small(): any {
  const scene = scene4Fixture()
  return { ...scene, layers: [scene.layers[0], scene.layers[1], scene.layers.at(-1)] }
}

it.skipIf(!python)(
  'Python admits and decodes the real regional Vila with identical metadata and occupied cells',
  async () => {
    const { map, assets } = regionVila()
    const exported = await exportPintaRegionScene(
      map,
      (id) => assets.find((a) => a.id === id) ?? null,
      nativeImageOf,
    )
    expect(
      await run(
        `${summarize}
text=json.load(sys.stdin)
plan=preparar_cena(text)
assert plan is not None
scene=plan.decode()
assert plan.decode() is None
print(json.dumps(summarize(scene)))`,
        exported.json,
      ),
    ).toEqual(expected(exported.scene))
  },
)

it.skipIf(!python)(
  'structure, typed properties and scene references agree with Core, including JS string and number rules',
  async () => {
    const scenes: unknown[] = [small(), scene4Fixture()]
    const add = (mutate: (scene: any) => void) => {
      const scene = small()
      mutate(scene)
      scenes.push(scene)
    }
    add((s) => {
      s.name = '🙂'.repeat(24)
    })
    add((s) => {
      s.name = '🙂'.repeat(25)
    })
    add((s) => {
      s.name = '\ud800'
    })
    add((s) => {
      s.physics = 'legacy'
      delete s.layers[2].objects[0].collision
    })
    for (const patch of [
      { version: 3 },
      { version: true },
      { unknown: 1 },
      { tileSize: 0 },
      { physics: 'future' },
      { physics: 'legacy' },
      { origin: { col: -10001, row: 0 } },
    ])
      add((s) => Object.assign(s, patch))
    for (const patch of [
      { visible: 1 },
      { parentId: 'missing' },
      { tilesetId: 'missing' },
      { unknown: 0 },
      { opacity: -0.1 },
      { parallaxX: 17 },
    ])
      add((s) => Object.assign(s.layers[1], patch))
    add((s) => {
      s.layers[1].id = s.layers[0].id
    })
    add((s) => {
      s.layers[0].parentId = s.layers[1].id
    })
    add((s) => {
      s.layers[2].objects.push(structuredClone(s.layers[2].objects[0]))
    })
    for (const patch of [
      { setId: 'missing' },
      { art: { assetId: 'missing' } },
      { art: { assetId: 'ground', tile: 4 } },
      { art: { assetId: 'hero', animationId: 'missing' } },
    ])
      add((s) => Object.assign(s.layers[2].objects[0], patch))
    for (const property of [
      { type: 'int', value: 3 },
      { type: 'int', value: 1e100 },
      { type: 'int', value: 3.5 },
      { type: 'int', value: true },
      { type: 'float', value: 3.5 },
      { type: 'float', value: '3.5' },
      { type: 'color', value: '#AABBCCDD' },
      { type: 'color', value: '#AABBCC\n' },
      { type: 'color', value: '#１２３４５６' },
      { type: 'object', value: 'elsewhere' },
      { type: 'asset', value: 2 },
      { type: 'future', value: 3 },
    ])
      add((s) => {
        s.layers[2].objects[0].properties = { test: property }
      })
    for (const key of ['vida', 'vida\n', 'Vida_2', '_vida', 'a'.repeat(32), 'a'.repeat(33), 'é'])
      add((s) => {
        s.layers[2].objects[0].properties = { [key]: 1 }
      })
    for (const count of [16, 17])
      add((s) => {
        s.layers[1].properties = Object.fromEntries(
          Array.from({ length: count }, (_, i) => [`p${i}`, true]),
        )
      })
    for (const key of [
      '',
      ' 1 ',
      '0x1',
      '0b1',
      '0o1',
      '\ufeff1',
      '\u00851',
      '1_0',
      '1.0',
      '1e0',
      '+1',
      '-0',
      '+0x1',
      'Infinity',
      'NaN',
      '1.5',
      '4',
    ])
      add((s) => {
        s.tilesets[0].animations = { [key]: [{ tile: 1, duration: 100 }] }
      })
    for (const color of ['#ABCDEF', '#abcdef', '#000000\n', '#１２３４５６'])
      add((s) => {
        s.tilesets[0].terrains = [
          {
            id: 'grass',
            name: 'Grama',
            mode: 'corner',
            colors: [color],
            tiles: { 0: Array(8).fill(1) },
          },
        ]
      })
    add((s) => {
      s.tilesets[0].tileProperties = { 9: { life: 1 } }
    })
    add((s) => {
      s.tilesets[0].solid = [4]
    })
    add((s) => {
      s.tilesets.push(structuredClone(s.tilesets[0]))
    })
    add((s) => {
      s.art[0].id = 'ground'
    })
    add((s) => {
      s.art[0].width = 17
    })
    add((s) => {
      s.art[0].sprite.animations[0].frames[0].tile = 1
    })
    add((s) => {
      s.art[0].sprite.animations.push(structuredClone(s.art[0].sprite.animations[0]))
    })
    for (const patch of [{ id: 'missing' }, { sourceId: 'ground' }, { capturedAt: 1e100 }])
      add((s) => Object.assign(s.resources[0], patch))
    add((s) => {
      s.resources.push(structuredClone(s.resources[0]))
    })
    add((s) => {
      s.sets = [
        {
          id: 'house',
          cols: s.cols,
          rows: s.rows,
          origin: s.origin,
          layers: [structuredClone(s.layers[0]), structuredClone(s.layers[1])],
        },
      ]
      s.layers[2].objects[0].setId = 'house'
    })
    add((s) => {
      s.sets = [
        {
          id: 'house',
          cols: s.cols,
          rows: s.rows,
          origin: s.origin,
          layers: [structuredClone(s.layers[2])],
        },
      ]
      s.sets[0].layers[0].objects[0].setId = 'house'
    })
    const texts = scenes.map((scene) => JSON.stringify(scene))
    const actual = await run(
      `${summarize}
output=[]
for text in json.load(sys.stdin):
    plan=preparar_cena(text)
    output.append(summarize(None if plan is None else plan.decode()))
print(json.dumps(output))`,
      texts,
    )
    expect(actual).toEqual(texts.map((text) => expected(readPintaRegionScene(text))))
    expect(texts).toHaveLength(81)
    expect(texts.filter((text) => readPintaRegionScene(text))).toHaveLength(27)
  },
)

it.skipIf(!python)(
  'semantic failures and aggregate index limits precede any base64 decode',
  async () => {
    const good = small()
    const invalid = structuredClone(good)
    invalid.layers[1].cells.chunks[0].data = 'broken'
    invalid.layers[2].objects[0].art.assetId = 'missing'
    const withSet = structuredClone(good)
    withSet.sets = [
      {
        id: 'house',
        cols: good.cols,
        rows: good.rows,
        origin: good.origin,
        layers: [structuredClone(good.layers[0]), structuredClone(good.layers[1])],
      },
    ]
    const texts = [JSON.stringify(invalid), JSON.stringify(withSet), JSON.stringify(good)]
    expect(preparePintaRegionScene(texts[0]!)).toBeNull()
    expect(preparePintaRegionScene(texts[1]!, 2048)).toBeNull()
    expect(preparePintaRegionScene(texts[1]!, 4096)?.decode()).not.toBeNull()
    expect(
      await run(
        `texts=json.load(sys.stdin)
calls=[]
original=base64.b64decode
def watched(*args,**kwargs):
    calls.append(1)
    return original(*args,**kwargs)
base64.b64decode=watched
assert preparar_cena(texts[0]) is None
assert preparar_cena(texts[1],2048) is None
assert preparar_cena(texts[2],True) is None
assert preparar_cena(texts[2],_SCENE_MAX_INDICES+1) is None
assert calls==[]
assert preparar_cena(texts[1],4096) is not None and calls==[]
plan=preparar_cena(texts[2],2048)
assert plan is not None and plan.index_bytes==2048 and calls==[]
assert plan.decode() is not None and len(calls)==1
assert plan.decode() is None
print(json.dumps({'decodedControl':len(calls),'singleAttempt':True}))`,
        texts,
      ),
    ).toEqual({ decodedControl: 1, singleAttempt: true })
  },
)

it.skipIf(!python)(
  'the JSON byte limit only narrows and corrupt payloads cannot return a partial scene',
  async () => {
    const scene = small()
    const ordinary = JSON.stringify(scene)
    const atLimit =
      ordinary + ' '.repeat(PINTA_REGION_SCENE_MAX_JSON_BYTES - Buffer.byteLength(ordinary))
    const corrupt = structuredClone(scene)
    corrupt.layers[1].cells.chunks[0].data = 'broken'
    const cases = [
      atLimit,
      `${atLimit} `,
      JSON.stringify(corrupt),
      ordinary.replace('"version":4', '"version":NaN'),
    ]
    const result = await run(
      `output=[]
for text in json.load(sys.stdin):
    plan=preparar_cena(text)
    scene=None if plan is None else plan.decode()
    assert plan is None or plan.decode() is None
    output.append(scene is not None)
print(json.dumps(output))`,
      cases,
    )
    expect(result).toEqual(cases.map((text) => readPintaRegionScene(text) !== null))
    expect(result).toEqual([true, false, false, false])
    expect(PINTA_REGION_SCENE_MAX_INDEX_BYTES).toBeGreaterThan(4 * 1024 * 1024)
  },
)

it.skipIf(!python)(
  'a late invalid tile refuses the whole scene without affecting another decoded snapshot',
  async () => {
    const good = small()
    const broken = structuredClone(good)
    const child = structuredClone(good.layers[1])
    const bytes = Buffer.from(child.cells.chunks[0].data, 'base64')
    bytes.writeInt16LE(9, 0)
    child.cells.chunks[0].data = bytes.toString('base64')
    broken.sets = [
      {
        id: 'house',
        cols: good.cols,
        rows: good.rows,
        origin: good.origin,
        layers: [structuredClone(good.layers[0]), child],
      },
    ]
    const texts = [JSON.stringify(good), JSON.stringify(broken)]
    expect(preparePintaRegionScene(texts[1]!)).not.toBeNull()
    expect(readPintaRegionScene(texts[1]!)).toBeNull()
    expect(
      await run(
        `texts=json.load(sys.stdin)
accepted=preparar_cena(texts[0]).decode()
first=accepted['layers'][1]['cells'].at(-64,-64)
plan=preparar_cena(texts[1])
assert plan is not None and plan.decode() is None and plan.decode() is None
assert accepted['layers'][1]['cells'].at(-64,-64)==first==2
print(json.dumps({'firstCell':first,'partialResult':False}))`,
        texts,
      ),
    ).toEqual({ firstCell: 2, partialResult: false })
  },
)

it.skipIf(!python)('JSON numbers retain the binary64 values read by the Core', async () => {
  const ordinary = JSON.stringify(small())
  const cases = ['9007199254740993', '1e100', '1e9999', '1e-400', '3.5'].map((value) =>
    ordinary.replace('"value":3', `"value":${value}`),
  )
  expect(
    await run(
      `${summarize}
output=[]
for text in json.load(sys.stdin):
    plan=preparar_cena(text)
    output.append(summarize(None if plan is None else plan.decode()))
print(json.dumps(output))`,
      cases,
    ),
  ).toEqual(cases.map((text) => expected(readPintaRegionScene(text))))
})

it.skipIf(!python)(
  'declared integers become native Python integers after binary64 admission',
  async () => {
    const scene = small()
    scene.layers[2].objects[0].properties.speed = { type: 'float', value: 3 }
    const text = JSON.stringify(scene).replace('"value":3', '"value":9007199254740993')
    expect(
      await run(
        `text=json.load(sys.stdin)
scene=preparar_cena(text).decode()
assert type(scene['version']) is int
assert type(scene['cols']) is int and len(range(scene['cols']))==10000
assert type(scene['origin']['col']) is int
assert type(scene['art'][0]['sprite']['frameWidth']) is int
props=scene['layers'][2]['objects'][0]['properties']
assert type(props['life']['value']) is int and props['life']['value']==9007199254740992
assert type(props['speed']['value']) is float and props['speed']['value']==3
print(json.dumps({'nativeIntegers':True,'binary64Rounding':True}))`,
        text,
      ),
    ).toEqual({ nativeIntegers: true, binary64Rounding: true })
  },
)
