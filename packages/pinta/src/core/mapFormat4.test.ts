/**
 * Formato 4 (18/11/2026): a cena completa leva um carimbo e um envelope PRÓPRIOS, separados do 3.
 *
 * Por quê. O formato 3 foi publicado duas vezes com o mesmo número: primeiro só com camadas e
 * grupos (commit bf6e895f, que rodou em homologação) e depois com a cena completa (formas, giro,
 * papel, propriedades tipadas, arte, conjuntos, animações, terrenos). O código de bf6e895f lia o
 * carimbo 3 da cena completa, reconstruía o mapa sem o que não conhecia e salvava por cima.
 *
 * FROTA MISTA, reprodução manual (foi rodada em 18/11/2026; não entra na suíte porque depende do
 * histórico do git):
 *
 *   mkdir -p /tmp/frota && git archive bf6e895f packages/pinta/src packages/core/src \
 *     | tar -x -C /tmp/frota
 *   # ligue node_modules/@sistemazero/core para /tmp/frota/packages/core e rode com bun um script
 *   # que importe o `sanitizePintaAsset` e o `importPintaJson` ANTIGOS de /tmp/frota e os NOVOS
 *   # deste pacote, e passe ao antigo o que o novo grava.
 *
 * Resultado medido com o código de bf6e895f:
 * - mapa com forma, papel e propriedade tipada, carimbo 4: `null` (recusa, não corta);
 * - o MESMO mapa com carimbo 3 (o defeito): lido, e o objeto volta sem forma, papel e propriedade;
 * - conjunto (`map-set`): `null` (tipo desconhecido);
 * - `.pinta.json` com envelope 4: recusado com o recado de versão; envelope 3 só de camadas: lido;
 * - ⚠️ conjunto de PEÇAS com animação, carimbo 4: LIDO e a animação é descartada. O leitor de
 *   peças de bf6e895f não confere `schema`, então nenhum carimbo o faz recusar. Para peças a
 *   proteção é a da nuvem (versão declarada 3 > 2) e a memória de carimbo da sincronia
 *   (`PintaFormatMemory`), não este carimbo.
 * - ⚠️ o código de produção de antes das camadas (origin/main) não confere `schema` em nada.
 *
 * O que estes testes travam é o que faz o código antigo recusar: o número gravado é MAIOR que o
 * único que ele conhecia, e só aparece quando o desenho precisa.
 */
import { describe, expect, it } from 'bun:test'
import { pintaAssetFromWire, pintaAssetToWire } from '../assets/wire'
import {
  assetNeedsV3,
  assetNeedsV4,
  envelopeVersionFor,
  galleryToPintaJson,
  importPintaJson,
} from '../export/projectJson'
import {
  type MapSetAsset,
  PINTA_MAP_SCHEMA,
  PINTA_MAX_SCHEMA,
  PINTA_SCENE_SCHEMA,
  type PintaAsset,
  pintaAssetSchema,
  sanitizePintaAsset,
  type TilemapAsset,
  type TilemapObject,
  type TilesetAsset,
  tilemapNeedsV3,
  tilemapNeedsV4,
  withPintaSchemaStamp,
} from './project'

/** O carimbo e o envelope que o código de bf6e895f conhecia (ele recusa tudo acima disto). */
const CONHECIDO_PELO_INTERMEDIARIO = { schema: 3, envelope: 3 } as const

const objeto = (extra: Partial<TilemapObject> = {}): TilemapObject => ({
  id: 'o1',
  name: 'porta',
  type: 'porta',
  x: 0,
  y: 0,
  width: 16,
  height: 16,
  properties: {},
  ...extra,
})

function mapa(objetos: TilemapObject[] | null = null, camada: Record<string, unknown> = {}) {
  return {
    id: 'mapa',
    kind: 'tilemap',
    name: 'vila',
    createdAt: 1,
    updatedAt: 2,
    tilesetId: 'pecas',
    cols: 2,
    rows: 1,
    layers: [
      { id: 'chao', name: 'Chão', visible: true, cells: [0, -1], ...camada },
      ...(objetos
        ? [{ id: 'coisas', kind: 'objects', name: 'Coisas', visible: true, objects: objetos }]
        : []),
    ],
  }
}

const pecas = (extra: Record<string, unknown> = {}, quantas = 2) => ({
  id: 'pecas',
  kind: 'tileset',
  name: 'pecas',
  createdAt: 1,
  updatedAt: 2,
  tileSize: 16,
  paletteId: 'pico8',
  tiles: Array.from({ length: quantas }, () => ({
    width: 16,
    height: 16,
    data: new Uint8Array(256),
  })),
  solid: [],
  platform: [],
  ...extra,
})

const lerMapa = (cru: unknown): TilemapAsset => {
  const lido = sanitizePintaAsset(cru)
  if (lido?.kind !== 'tilemap') throw new Error('esperava um mapa')
  return lido
}
const lerPecas = (cru: unknown): TilesetAsset => {
  const lido = sanitizePintaAsset(cru)
  if (lido?.kind !== 'tileset') throw new Error('esperava peças')
  return lido
}

describe('frota mista: o que faz o código intermediário recusar em vez de cortar', () => {
  it('o carimbo e o envelope da cena completa são maiores que os que ele conhecia', () => {
    expect(PINTA_SCENE_SCHEMA).toBeGreaterThan(CONHECIDO_PELO_INTERMEDIARIO.schema)
    expect(PINTA_MAX_SCHEMA).toBe(7)
    // O formato só de camadas continua no número que ele lê inteiro.
    expect(PINTA_MAP_SCHEMA).toBe(CONHECIDO_PELO_INTERMEDIARIO.schema)
    const completo = lerMapa(mapa([objeto({ shape: 'ellipse' })]))
    expect(envelopeVersionFor([completo])).toBeGreaterThan(CONHECIDO_PELO_INTERMEDIARIO.envelope)
    // Um dígito: o medidor incremental do backup conta com o cabeçalho de tamanho fixo.
    expect(String(envelopeVersionFor([completo]))).toHaveLength(1)
  })

  it.each([
    ['forma', { shape: 'ellipse' }],
    [
      'polígono',
      {
        shape: 'polygon',
        points: [
          { x: 0, y: 0 },
          { x: 8, y: 8 },
          { x: 0, y: 8 },
        ],
      },
    ],
    ['giro', { rotation: 90 }],
    ['espelho', { flipX: true }],
    ['papel', { role: 'door' }],
    ['arte', { shape: 'art', art: { assetId: 'heroi' } }],
    ['instância de conjunto', { shape: 'set', setId: 'casa' }],
    ['propriedade tipada', { properties: { vida: { type: 'int', value: 3 } } }],
  ] as Array<
    [string, Partial<TilemapObject>]
  >)('objeto com %s pede o carimbo 4 no registro, no transporte e no arquivo', (_nome, extra) => {
    const lido = lerMapa(mapa([objeto(extra)]))
    expect(lido.schema).toBe(4)
    expect(tilemapNeedsV4(lido)).toBe(true)
    expect(tilemapNeedsV3(lido)).toBe(true)
    expect((pintaAssetToWire(lido) as { schema?: number }).schema).toBe(4)
    const arquivo = JSON.parse(galleryToPintaJson([lido]))
    expect(arquivo.version).toBe(4)
    expect(arquivo.assets[0].schema).toBe(4)
  })

  it('mapa que só usa camadas continua no 3: carimbo, transporte e envelope', () => {
    for (const camada of [
      { opacity: 0.5 },
      { locked: true },
      { collision: true },
      { offsetX: 4 },
    ]) {
      const lido = lerMapa(mapa([objeto()], camada))
      expect(lido.schema).toBe(3)
      expect(tilemapNeedsV4(lido)).toBe(false)
      expect(assetNeedsV4(lido)).toBe(false)
      expect(assetNeedsV3(lido)).toBe(true)
      expect(envelopeVersionFor([lido])).toBe(3)
    }
  })

  it.each([
    'tiles',
    'objects',
    'group',
  ] as const)('propriedade tipada da camada %s exige formato 4 em todas as gravações', (kind) => {
    const base = lerMapa(mapa())
    const properties = { premio: { type: 'asset' as const, value: 'heroi' } }
    const common = { id: 'camada', name: 'Camada', visible: true, properties }
    const layer =
      kind === 'tiles'
        ? { ...common, cells: new Int16Array(2) }
        : kind === 'objects'
          ? { ...common, kind, objects: [] }
          : { ...common, kind }
    // Migra também o registro completo gravado incorretamente com schema 3.
    const lido = lerMapa({ ...base, schema: 3, layers: [...base.layers, layer] })
    expect(lido.schema).toBeGreaterThan(CONHECIDO_PELO_INTERMEDIARIO.schema)
    expect(withPintaSchemaStamp({ ...lido, schema: 3 }).schema).toBe(4)
    expect((pintaAssetToWire(lido) as { schema: number }).schema).toBe(4)
    expect(envelopeVersionFor([lido])).toBeGreaterThan(CONHECIDO_PELO_INTERMEDIARIO.envelope)
    expect(importPintaJson(galleryToPintaJson([lido])).assets).toEqual([lido])
    expect(lido.layers.find((l) => l.id === 'camada')?.properties).toEqual(properties)
    const primitive = lerMapa({
      ...base,
      layers: [
        ...base.layers,
        { ...layer, properties: { premio: 'heroi', quantidade: 3, aberto: true } },
      ],
    })
    expect(primitive.schema).toBe(3)
    expect(envelopeVersionFor([primitive])).toBe(3)
  })

  it('mapa antigo (ponto e retângulo, texto, número, sim/não) sai sem carimbo e byte a byte igual', () => {
    const cru = mapa([
      objeto({ properties: { vida: 3, nome: 'ana', aberta: true } }),
      objeto({ id: 'o2', width: 0, height: 0 }),
    ])
    const lido = lerMapa(cru)
    expect('schema' in lido).toBe(false)
    expect(pintaAssetSchema(lido)).toBe(0)
    expect(withPintaSchemaStamp(lido)).toBe(lido)
    // O texto exato que o código de bf6e895f também produz para este mapa (conferido na
    // reprodução manual do cabeçalho): nenhuma chave nova, nenhuma ordem diferente.
    expect(JSON.stringify(pintaAssetToWire(lido))).toBe(
      '{"id":"mapa","name":"vila","createdAt":1,"updatedAt":2,"kind":"tilemap","tilesetId":"pecas","cols":2,"rows":1,"layers":[{"id":"chao","name":"Chão","visible":true,"cells":[0,-1]},{"kind":"objects","id":"coisas","name":"Coisas","visible":true,"objects":[{"id":"o1","name":"porta","type":"porta","x":0,"y":0,"width":16,"height":16,"properties":{"vida":3,"nome":"ana","aberta":true}},{"id":"o2","name":"porta","type":"porta","x":0,"y":0,"width":0,"height":0,"properties":{}}]}]}',
    )
    expect(envelopeVersionFor([lido])).toBe(2)
    expect(envelopeVersionFor([lerMapa(mapa())])).toBe(1)
    expect('schema' in JSON.parse(galleryToPintaJson([lido])).assets[0]).toBe(false)
  })

  it('o carimbo acompanha o conteúdo: 4 → 3 → some, conforme o mapa deixa de precisar', () => {
    const completo = lerMapa(mapa([objeto({ role: 'start' })], { opacity: 0.5 }))
    expect(completo.schema).toBe(4)
    const semPapel = lerMapa({
      ...pintaAssetToWireObj(completo),
      layers: pintaAssetToWireObj(completo).layers.map((l) =>
        l.kind === 'objects' ? { ...l, objects: [objeto()] } : l,
      ),
    })
    expect(semPapel.schema).toBe(3)
    const semCamada = lerMapa({
      ...pintaAssetToWireObj(semPapel),
      layers: pintaAssetToWireObj(semPapel).layers.map(({ opacity: _o, ...l }) => l),
    })
    expect('schema' in semCamada).toBe(false)
  })

  it('leitura aceita 3 e 4: o mapa completo que foi gravado com 3 é lido inteiro e passa a 4', () => {
    const gravadoCom3 = { ...mapa([objeto({ shape: 'ellipse', role: 'danger' })]), schema: 3 }
    const lido = lerMapa(gravadoCom3)
    expect(lido.schema).toBe(4)
    const coisas = lido.layers[1]
    expect(coisas?.kind === 'objects' && coisas.objects[0]).toMatchObject({
      shape: 'ellipse',
      role: 'danger',
    })
    expect(lerMapa({ ...gravadoCom3, schema: 4 })).toEqual(lido)
    // E o arquivo com envelope 3 ou 4 entra do mesmo jeito.
    for (const version of [3, 4]) {
      const arquivo = JSON.parse(galleryToPintaJson([lido]))
      arquivo.version = version
      expect(importPintaJson(JSON.stringify(arquivo)).assets).toEqual([lido])
    }
  })

  it('carimbo ou envelope acima do que ESTE código conhece é recusado inteiro', () => {
    expect(sanitizePintaAsset({ ...mapa(), schema: PINTA_MAX_SCHEMA + 1 })).toBeNull()
    expect(sanitizePintaAsset(pecas({ schema: PINTA_MAX_SCHEMA + 1 }))).toBeNull()
    const arquivo = JSON.parse(galleryToPintaJson([lerMapa(mapa())]))
    arquivo.version = PINTA_MAX_SCHEMA + 1
    const { assets, warnings } = importPintaJson(JSON.stringify(arquivo))
    expect(assets).toEqual([])
    expect(warnings).toHaveLength(1)
  })
})

function pintaAssetToWireObj(asset: TilemapAsset) {
  return pintaAssetToWire(asset) as Record<string, unknown> & {
    layers: Array<Record<string, unknown> & { kind?: string }>
  }
}

describe('carimbo do conjunto de peças aparece e some', () => {
  it('conjunto simples não tem carimbo e não muda de envelope', () => {
    const lido = lerPecas(pecas())
    expect('schema' in lido).toBe(false)
    expect(envelopeVersionFor([lido])).toBe(1)
  })

  it.each([
    ['animação', { animations: { '0': [{ tile: 1, duration: 120 }] } }],
    ['propriedade de peça', { tileProperties: { '1': { dano: 2 } } }],
    [
      'terreno',
      {
        terrains: [{ id: 'grama', name: 'Grama', mode: 'corner', colors: ['#00ff00'], tiles: {} }],
      },
    ],
  ])('%s pede o carimbo 4 e o envelope 4', (_nome, extra) => {
    const lido = lerPecas(pecas(extra))
    expect(lido.schema).toBe(4)
    expect(envelopeVersionFor([lido])).toBe(4)
    expect(importPintaJson(galleryToPintaJson([lido])).assets).toEqual([lido])
  })

  it('mais de 64 peças, sem metadados, pede só o 3', () => {
    const lido = lerPecas(pecas({}, 65))
    expect(lido.schema).toBe(3)
    expect(envelopeVersionFor([lido])).toBe(3)
    expect(lerPecas(pecas({}, 64)).schema).toBeUndefined()
  })

  it('o carimbo some quando o metadado some, e metadado inválido nem chega a carimbar', () => {
    const com = lerPecas(pecas({ animations: { '0': [{ tile: 1, duration: 120 }] } }))
    const { animations: _a, ...sem } = pintaAssetToWire(com) as Record<string, unknown>
    expect('schema' in lerPecas(sem)).toBe(false)
    // Animação que aponta para peça que não existe é descartada: sobra um conjunto simples.
    const invalido = lerPecas(pecas({ animations: { '0': [{ tile: 9, duration: 120 }] } }))
    expect(invalido.animations).toBeUndefined()
    expect('schema' in invalido).toBe(false)
  })
})

describe('withPintaSchemaStamp: o carimbo de quem GRAVA', () => {
  it('o editor muda o mapa em memória sem tocar no carimbo; a gravação o corrige', () => {
    const simples = lerMapa(mapa([objeto()]))
    // O editor acrescenta uma forma: o registro em memória continua sem carimbo.
    const emMemoria: TilemapAsset = {
      ...simples,
      layers: simples.layers.map((l) =>
        l.kind === 'objects' ? { ...l, objects: [objeto({ shape: 'ellipse' })] } : l,
      ),
    }
    expect(emMemoria.schema).toBeUndefined()
    const gravado = withPintaSchemaStamp(emMemoria)
    expect(gravado.schema).toBe(4)
    expect(gravado.layers).toBe(emMemoria.layers)
    // Já certo: a mesma referência (nenhuma cópia por autosave).
    expect(withPintaSchemaStamp(gravado)).toBe(gravado)
    // A forma saiu: o carimbo velho em memória sai junto na gravação.
    const voltou = withPintaSchemaStamp({ ...gravado, layers: simples.layers })
    expect('schema' in voltou).toBe(false)
  })

  it('carimbo velho de outro código (3 num conjunto de peças com animação) vira 4', () => {
    const com = lerPecas(pecas({ animations: { '0': [{ tile: 1, duration: 120 }] } }))
    const velho = { ...com, schema: 3 }
    expect(withPintaSchemaStamp(velho).schema).toBe(4)
    expect(pintaAssetSchema(velho)).toBe(4)
    expect(JSON.parse(galleryToPintaJson([velho])).assets[0].schema).toBe(4)
  })

  it('desenho sem formato próprio passa intocado', () => {
    const fundo = sanitizePintaAsset({
      id: 'f',
      kind: 'vector-background',
      name: 'ceu',
      createdAt: 1,
      updatedAt: 2,
      width: 16,
      height: 16,
      shapes: [],
    }) as PintaAsset
    expect(withPintaSchemaStamp(fundo)).toBe(fundo)
    expect(pintaAssetSchema(fundo)).toBe(0)
  })
})

describe('conjunto (map-set)', () => {
  const conjunto = (map: unknown, schema: unknown = 4) => ({
    id: 'casa',
    kind: 'map-set',
    name: 'casa',
    createdAt: 1,
    updatedAt: 2,
    schema,
    map,
  })

  it('é sempre formato 4: lê o 3 que as primeiras versões gravaram e devolve 4', () => {
    for (const schema of [3, 4]) {
      const lido = sanitizePintaAsset(conjunto(mapa([objeto()]), schema)) as MapSetAsset
      expect(lido.kind).toBe('map-set')
      expect(lido.schema).toBe(4)
      expect(pintaAssetSchema(lido)).toBe(4)
      expect(envelopeVersionFor([lido])).toBe(4)
      expect(pintaAssetFromWire(JSON.parse(JSON.stringify(pintaAssetToWire(lido))))).toEqual(lido)
      expect(importPintaJson(galleryToPintaJson([lido])).assets).toEqual([lido])
    }
  })

  it('sem carimbo, com carimbo futuro ou com carimbo que não é número: recusado', () => {
    for (const schema of [2, PINTA_MAX_SCHEMA + 1, '4', null])
      expect(sanitizePintaAsset(conjunto(mapa(), schema))).toBeNull()
    const { schema: _semCarimbo, ...semCarimbo } = conjunto(mapa())
    expect(sanitizePintaAsset(semCarimbo)).toBeNull()
  })

  it('🚨 conjunto dentro de conjunto é recusado inteiro (por instância ou por forma)', () => {
    const comInstancia = mapa([objeto({ shape: 'set', setId: 'outro' })])
    const soForma = mapa([objeto({ shape: 'set' })])
    const soId = mapa([objeto({ setId: 'outro' })])
    for (const dentro of [comInstancia, soForma, soId])
      expect(sanitizePintaAsset(conjunto(dentro))).toBeNull()
    // O mesmo mapa, fora de um conjunto, é um mapa válido com uma instância.
    expect(lerMapa(comInstancia).schema).toBe(4)
    // E o conjunto sem instância dentro continua válido (anti-vácuo).
    expect(sanitizePintaAsset(conjunto(mapa([objeto({ shape: 'ellipse' })])))).not.toBeNull()
  })

  it('o mapa de dentro leva o carimbo dele; o de fora é corrigido na gravação', () => {
    const lido = sanitizePintaAsset(conjunto(mapa([objeto({ role: 'door' })]))) as MapSetAsset
    expect(lido.map.schema).toBe(4)
    const velho: MapSetAsset = { ...lido, schema: 3, map: { ...lido.map, schema: 3 } }
    const gravado = withPintaSchemaStamp(velho)
    expect(gravado.schema).toBe(4)
    expect(gravado.map.schema).toBe(4)
    expect(withPintaSchemaStamp(gravado)).toBe(gravado)
  })
})
