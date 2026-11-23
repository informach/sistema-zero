/**
 * Decisão de 23/11: no Python, as peças de plataforma funcionam como plataforma nas duas físicas
 * do Pinta, como no Pinta e nos jogadores JavaScript. A referência é o pouso do Core
 * (`scenePlatformLanding`), o mesmo que o Phaser regional usa também na física antiga.
 */
import { expect, it } from 'bun:test'
import { createCanvas } from '@napi-rs/canvas'
import { encodePintaRegionLayers } from '@sistemazero/core/creations'
import { readPintaRegionScene } from '@sistemazero/core/studio/pinta-region-scene'
import { createRegionSceneQueries } from '@sistemazero/core/studio/pinta-scene-query'
import { purePython, runPurePython } from '../testing/runPurePython'
import { pythonRegionWorld } from './pythonRegionWorld'
import { pythonSceneRuntime } from './pythonSceneRuntime'
import { embedPintaRegionImage } from './regionImage'

type Box = [x: number, y: number, width: number, height: number]
type Pair = [before: Box, after: Box, gravity: number]
const SOLID = 0,
  PLATFORM = 1,
  DECOR = 2
const bounds = { col: -4, row: -4, cols: 12, rows: 12 }

/** Chão sólido na linha 4 e, se houver, uma plataforma de mão única na linha 0 (x de 0 a 64). */
function scene(physics: 'legacy' | 'precise', platform: boolean) {
  const chunks = new Map<string, { col: number; row: number; cells: Int16Array }>()
  const put = (col: number, row: number, tile: number) => {
    const key = `${Math.floor(col / 32)},${Math.floor(row / 32)}`
    let chunk = chunks.get(key)
    if (!chunk) {
      chunk = {
        col: Math.floor(col / 32),
        row: Math.floor(row / 32),
        cells: new Int16Array(1024).fill(-1),
      }
      chunks.set(key, chunk)
    }
    chunk.cells[(row - chunk.row * 32) * 32 + col - chunk.col * 32] = tile
  }
  for (let col = -4; col < 8; col++) put(col, 4, SOLID)
  // Sem plataforma, a peça fica no mesmo lugar como enfeite. A folha continua DECLARANDO a peça
  // de plataforma, como num modelo que a criança não usou: só a peça colocada muda o jogo.
  for (let col = 0; col < 4; col++) put(col, 0, platform ? PLATFORM : DECOR)
  const layers = encodePintaRegionLayers(
    [{ kind: 'regions', version: 1, side: 32, chunks: [...chunks.values()] }],
    bounds,
  )
  if (!layers) throw Error('Grade de teste inválida')
  const image = createCanvas(48, 16).toDataURL('image/png')
  return {
    version: 4,
    id: `plataforma-${physics}-${platform}`,
    name: 'Plataforma',
    physics,
    tileSize: 16,
    cols: bounds.cols,
    rows: bounds.rows,
    origin: { col: bounds.col, row: bounds.row },
    tilesets: [
      {
        id: 'folha',
        name: 'Folha',
        image,
        columns: 3,
        count: 3,
        solid: [SOLID],
        platform: [PLATFORM],
      },
    ],
    layers: [
      {
        id: 'chao',
        kind: 'tiles',
        name: 'Chão',
        visible: true,
        tilesetId: 'folha',
        cells: layers[0],
      },
    ],
  }
}

const cover = new Uint8Array(createCanvas(16, 16).toBuffer('image/png'))
async function png(source: ReturnType<typeof scene>) {
  const { png } = await embedPintaRegionImage(cover, JSON.stringify(source))
  return Buffer.from(png).toString('base64')
}

/** Corpos de 12 × 12 que cruzam, tocam e passam pela plataforma nos dois sentidos. */
const pairs: Pair[] = []
for (let x = -14; x <= 70; x += 6)
  for (let y = -30; y <= 30; y += 4)
    for (const g of [1, -1, 0]) {
      pairs.push([[x, y, 12, 12], [x, y + 9 * (g || 1), 12, 12], g])
      pairs.push([[x, y, 12, 12], [x, y - 9 * (g || 1), 12, 12], g])
    }
const boxes: Box[] = []
for (let x = -14; x <= 70; x += 6) for (let y = -30; y <= 70; y += 5) boxes.push([x, y, 12, 12])

const program = `request=json.load(sys.stdin)
result={}
for name,data in request['pngs'].items():
    cena=CenaRegional(ler_mundo_png(base64.b64decode(data)))
    land=[cena.pouso(tuple(a),tuple(b),g) for a,b,g in request['pairs']]
    hits=[cena.bloqueado(tuple(b)) for b in request['boxes']]
    # O laço de um jogo de plataforma: cai do alto, para em cima e continua em pé.
    corpo=(8,-40,12,12)
    caiu=None
    for _ in range(12):
        desejado=(corpo[0],corpo[1]+4,12,12)
        apoio=cena.pouso(corpo,desejado)
        corpo=desejado if apoio is None else apoio
        if apoio is not None and caiu is None:
            caiu=apoio[1]
    em_pe=[]
    for _ in range(30):
        apoio=cena.pouso(corpo,(corpo[0],corpo[1]+0.5,12,12))
        em_pe.append(None if apoio is None else apoio[1])
        corpo=apoio or corpo
    result[name]=dict(physics=cena.fisica,land=land,hits=hits,caiu=caiu,em_pe=em_pe,
        por_baixo=cena.pouso((8,20,12,12),(8,-14,12,12)),
        de_dentro=cena.pouso((8,-6,12,12),(8,-2,12,12)),
        parede=cena.bloqueado((8,2,12,12)),
        cabeca=cena.pouso((8,30,12,12),(8,10,12,12),-1),
        vista_de_cima=cena.pouso((8,-20,12,12),(8,-2,12,12),0))
print(json.dumps(result))`

async function run() {
  const variants = {
    legacy: scene('legacy', true),
    precise: scene('precise', true),
    'legacy-sem': scene('legacy', false),
    'precise-sem': scene('precise', false),
  }
  const pngs = Object.fromEntries(
    await Promise.all(Object.entries(variants).map(async ([k, v]) => [k, await png(v)] as const)),
  )
  const values = (await runPurePython(
    `${pythonRegionWorld}\n${pythonSceneRuntime}`,
    `import base64\n${program}`,
    { pngs, pairs, boxes },
  )) as Record<
    keyof typeof variants,
    {
      physics: string
      land: (Box | null)[]
      hits: boolean[]
      caiu: number | null
      em_pe: (number | null)[]
      por_baixo: Box | null
      de_dentro: Box | null
      parede: boolean
      cabeca: Box | null
      vista_de_cima: Box | null
    }
  >
  return { variants, values }
}

it.skipIf(!purePython)(
  'na física antiga, a peça de plataforma segura por cima, deixa passar por baixo e pousa como no JS',
  async () => {
    const { variants, values } = await run()
    for (const physics of ['legacy', 'precise'] as const) {
      const actual = values[physics]
      expect(actual.physics).toBe(physics)
      // Cai do alto e para com os pés no topo da plataforma (y = 0): o corpo fica em y = -12.
      expect(actual.caiu).toBe(-12)
      // Em pé com a gravidade puxando, não atravessa a plataforma por cima.
      expect(actual.em_pe).toEqual(Array(30).fill(-12))
      // Subindo, ou começando dentro dela, a plataforma deixa passar.
      expect(actual.por_baixo).toBeNull()
      expect(actual.de_dentro).toBeNull()
      // A plataforma não é parede: o corpo pode estar dentro dela.
      expect(actual.parede).toBe(false)
      // Com a gravidade invertida, segura pela face de baixo (y = 16).
      expect(actual.cabeca).toEqual([8, 16, 12, 12])
      // Gravidade zero é o jogo visto de cima: sem apoio.
      expect(actual.vista_de_cima).toBeNull()

      // Os mesmos pousos e bloqueios do Core, o pouso que o Phaser usa nas duas físicas.
      const query = createRegionSceneQueries(
        readPintaRegionScene(JSON.stringify(variants[physics]))!,
      )
      const body = ([x, y, width, height]: Box) => ({ x, y, width, height })
      const expected = pairs.map(([a, b, g]): Box | null => {
        const landing = query.platformLanding(body(a), body(b), g)
        return landing ? [landing.x, landing.y, landing.width, landing.height] : null
      })
      expect(actual.land).toEqual(expected)
      expect(expected.filter(Boolean).length).toBeGreaterThan(20)
      expect(actual.hits).toEqual(boxes.map((b) => query.intersectsBox(body(b))))
    }
    // As duas físicas pousam igual sobre peças: só os contornos de objeto as distinguem.
    expect(values.legacy.land).toEqual(values.precise.land)
  },
)

it.skipIf(!purePython)(
  'sem peça de plataforma colocada, a física antiga responde como antes: nenhum pouso e as mesmas paredes',
  async () => {
    const { values } = await run()
    const legacy = values['legacy-sem']
    expect(legacy.physics).toBe('legacy')
    // Antes da decisão, o pouso da física antiga era sempre None. Sem peça colocada, continua.
    expect(legacy.land.every((landing) => landing === null)).toBe(true)
    expect([legacy.caiu, legacy.por_baixo, legacy.cabeca, legacy.vista_de_cima]).toEqual([
      null,
      null,
      null,
      null,
    ])
    expect(legacy.em_pe.every((landing) => landing === null)).toBe(true)
    // O bloqueio nunca dependeu da plataforma: é o mesmo com ou sem ela.
    expect(legacy.hits).toEqual(values.legacy.hits)
    expect(legacy.hits.some(Boolean) && !legacy.hits.every(Boolean)).toBe(true)
  },
)
