/** O importador do Tiled: conversão de propriedades, relatório de perdas, recusas e limites. */
import { describe, expect, it } from 'bun:test'
import { zstdCompressSync } from 'node:zlib'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { gzipSync, zlibSync } from 'fflate'
import { vilaEFloresta } from '../../../scripts/homologacao/fixture'
import { nativeImageOf } from '../../../scripts/homologacao/generate'
import { sanitizePintaAsset } from '../../core/project'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V } from '../../tiles/cell'
import { cellMatrix } from '../../tiles/chunks'
import { exportPintaScene } from '../scene'
import { importTiledScene, TiledImportError, tiledXmlToJson, tileObjectPlacement } from './import'
import { sceneToNative } from './native'

type Json = Record<string, unknown>
const PNG = 'data:image/png;base64,AAAA'
const resolver = {
  text: async (path: string): Promise<string> => {
    throw new Error(`sem arquivo ${path}`)
  },
  image: async () => PNG,
}
const folha = (extra: Json = {}): Json => ({
  firstgid: 1,
  name: 'chao',
  tilewidth: 16,
  tileheight: 16,
  tilecount: 4,
  columns: 2,
  margin: 0,
  spacing: 0,
  image: 'chao.png',
  imagewidth: 32,
  imageheight: 32,
  ...extra,
})
const camada = (extra: Json = {}): Json => ({
  id: 1,
  type: 'tilelayer',
  name: 'Chão',
  width: 2,
  height: 2,
  visible: true,
  opacity: 1,
  data: [1, 2, 3, 4],
  ...extra,
})
const objetos = (objects: Json[], extra: Json = {}): Json => ({
  id: 9,
  type: 'objectgroup',
  name: 'Coisas',
  draworder: 'index',
  visible: true,
  opacity: 1,
  objects,
  ...extra,
})
const mapa = (extra: Json = {}): Json => ({
  type: 'map',
  version: '1.10',
  tiledversion: '1.10.2',
  orientation: 'orthogonal',
  renderorder: 'right-down',
  infinite: false,
  width: 2,
  height: 2,
  tilewidth: 16,
  tileheight: 16,
  nextlayerid: 10,
  nextobjectid: 100,
  tilesets: [folha()],
  layers: [camada()],
  ...extra,
})
const tmx = (dentro: string, atributos = '') =>
  `<?xml version="1.0" encoding="UTF-8"?><map version="1.10" tiledversion="1.10.2" orientation="orthogonal" renderorder="right-down" width="2" height="2" tilewidth="16" tileheight="16" infinite="0" nextlayerid="10" nextobjectid="100"${atributos}><tileset firstgid="1" name="chao" tilewidth="16" tileheight="16" tilecount="4" columns="2"><image source="chao.png" width="32" height="32"/></tileset>${dentro}</map>`
const importar = (input: unknown) => importTiledScene(input, resolver, 'teste')
/** A recusa é sempre uma frase para a criança: nunca JSON do validador nem inglês. */
async function recusa(input: unknown): Promise<string> {
  try {
    await importar(input)
  } catch (e) {
    expect(e).toBeInstanceOf(TiledImportError)
    const message = (e as Error).message
    expect(message).not.toMatch(
      /[{}[\]]|"code"|expected|invalid|too_big|too_small|Too big|undefined/,
    )
    expect(message.length).toBeGreaterThan(10)
    return message
  }
  throw new Error('O mapa devia ter sido recusado.')
}
const base64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64')
const gids = (values: number[]) => {
  const bytes = new Uint8Array(values.length * 4),
    view = new DataView(bytes.buffer)
  values.forEach((v, i) => {
    view.setUint32(i * 4, v, true)
  })
  return bytes
}

describe('propriedades', () => {
  it('no TMX, texto que parece número ou verdadeiro/falso continua texto', async () => {
    const xml = tmx(
      `<objectgroup id="9" name="Coisas" draworder="index"><object id="1" name="1234" type="007" x="1" y="2" width="3" height="4"><properties>
        <property name="senha" value="1234"/>
        <property name="aceita" type="string" value="true"/>
        <property name="zero" value="0"/>
        <property name="vazio" value=""/>
        <property name="vidas" type="int" value="5"/>
        <property name="peso" type="float" value="1.5"/>
        <property name="ligado" type="bool" value="true"/>
        <property name="desligado" type="bool" value="false"/>
        <property name="cor" type="color" value="#ff000000"/>
        <property name="longo">linha 1
linha 2</property>
      </properties></object></objectgroup>`,
    )
    const { scene, warnings } = await importar(tiledXmlToJson(xml))
    const objeto = scene.layers.flatMap((l) => (l.kind === 'objects' ? l.objects : []))[0]
    expect(warnings).toEqual([])
    expect(objeto?.name).toBe('1234')
    expect(objeto?.type).toBe('007')
    expect(objeto?.properties).toEqual({
      senha: '1234',
      aceita: 'true',
      zero: '0',
      vazio: '',
      vidas: { type: 'int', value: 5 },
      peso: { type: 'float', value: 1.5 },
      ligado: true,
      desligado: false,
      cor: { type: 'color', value: '#000000' },
      longo: 'linha 1\nlinha 2',
    })
  })
  it('no JSON, o tipo da propriedade decide a conversão', async () => {
    const { scene } = await importar(
      mapa({
        layers: [
          camada({
            properties: [
              { name: 'senha', type: 'string', value: '1234' },
              { name: 'aceita', type: 'string', value: 'true' },
              { name: 'semTipo', value: 'false' },
              { name: 'vidas', type: 'int', value: 5 },
              { name: 'ligado', type: 'bool', value: true },
            ],
          }),
        ],
      }),
    )
    expect(scene.layers[0]?.properties).toEqual({
      senha: '1234',
      aceita: 'true',
      semTipo: 'false',
      vidas: { type: 'int', value: 5 },
      ligado: true,
    })
  })
  it('nome inválido, texto comprido, tipo próprio do Tiled e excesso entram no relatório', async () => {
    const { scene, warnings } = await importar(
      mapa({
        properties: [{ name: 'autor', type: 'string', value: 'Ana' }],
        layers: [
          camada({
            properties: [
              { name: 'cor do céu', type: 'string', value: 'azul' },
              { name: 'historia', type: 'string', value: 'x'.repeat(250) },
              { name: 'ficha', type: 'class', propertytype: 'Ficha', value: { a: 1 } },
              ...Array.from({ length: 17 }, (_, i) => ({ name: `p${i}`, type: 'int', value: i })),
            ],
          }),
        ],
      }),
    )
    const properties = scene.layers[0]?.properties ?? {}
    expect(Object.keys(properties).length).toBe(16)
    expect(properties.historia).toBe('x'.repeat(200))
    expect(properties['cor do céu']).toBeUndefined()
    expect(warnings).toEqual([
      'A propriedade ficha de a camada Chão é de um tipo próprio do Tiled (class) e não foi trazida.',
      'A propriedade cor do céu de a camada Chão não foi trazida: o nome precisa começar com letra, ter só letras sem acento, números, - ou _ e até 32 sinais.',
      'O texto da propriedade historia de a camada Chão foi cortado em 200 sinais.',
      'a camada Chão tinha mais de 16 propriedades; as 2 últimas não foram trazidas.',
      'As propriedades do mapa (autor) não foram trazidas: o Pinta guarda propriedades nas camadas, nas peças e nos objetos.',
    ])
  })
})

describe('o que o esquema recusava em inglês agora vira frase ou ajuste com aviso', () => {
  it('nome de camada com 60 letras é encurtado para 48 e avisado', async () => {
    const nome = 'Camada com um nome muito comprido mesmo, daqueles sem fim...'
    expect(nome.length).toBe(60)
    const { scene, warnings } = await importar(mapa({ layers: [camada({ name: nome })] }))
    expect(scene.layers[0]?.name).toBe(nome.slice(0, 48))
    expect(warnings).toEqual([
      `O nome de uma camada foi encurtado para 48 sinais: ${nome.slice(0, 48)}`,
    ])
  })
  it('quadro de animação com menos de 16 ms vira 16 ms, com aviso', async () => {
    const { scene, warnings } = await importar(
      mapa({
        tilesets: [
          folha({
            tiles: [
              {
                id: 0,
                animation: [
                  { tileid: 0, duration: 5 },
                  { tileid: 1, duration: 100 },
                  { tileid: 2, duration: 999999 },
                ],
              },
            ],
          }),
        ],
      }),
    )
    expect(scene.tilesets[0]?.animations).toEqual({
      '0': [
        { tile: 0, duration: 16 },
        { tile: 1, duration: 100 },
        { tile: 2, duration: 60000 },
      ],
    })
    expect(warnings).toEqual([
      'A animação da peça 0 de chao tinha quadros rápidos ou lentos demais; cada quadro ficou entre 16 e 60000 milissegundos.',
    ])
  })
  it('mapa sem folha de peças', async () => {
    expect(await recusa(mapa({ tilesets: [], layers: [camada({ data: [0, 0, 0, 0] })] }))).toBe(
      'O mapa precisa de pelo menos uma folha de peças. Inclua a folha (imagem) junto do mapa.',
    )
  })
  it('mais de 32 camadas', async () => {
    const layers = Array.from({ length: 33 }, (_, i) => camada({ id: i + 1, name: `C${i}` }))
    expect(await recusa(mapa({ layers }))).toContain('camadas demais. O Pinta aceita até 32')
    const ok = await importar(mapa({ layers: layers.slice(0, 32) }))
    expect(ok.scene.layers.length).toBe(32)
  })
  it('mais de 512 objetos numa camada', async () => {
    const objects = Array.from({ length: 513 }, (_, i) => ({
      id: i + 1,
      name: '',
      type: '',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    }))
    expect(await recusa(mapa({ layers: [objetos(objects)] }))).toBe(
      'A camada Coisas tem objetos demais. O Pinta aceita até 512 por camada.',
    )
    const ok = await importar(mapa({ layers: [objetos(objects.slice(0, 512))] }))
    expect(ok.scene.layers[0]?.kind).toBe('objects')
  })
  it('arquivo que não é um mapa', async () => {
    await recusa(null)
    await recusa([])
    await recusa('mapa')
    await recusa({})
  })
})

describe('limites de leitura do formato do mapa', () => {
  it('colunas, linhas e peças fora do teto', async () => {
    expect(
      await recusa(
        mapa({ width: 257, layers: [camada({ width: 257, data: Array(514).fill(0) })] }),
      ),
    ).toBe('O mapa precisa de peças quadradas e de até 256 × 256 casas.')
    expect(await recusa(mapa({ tileheight: 32 }))).toContain('peças quadradas')
    expect(await recusa(mapa({ tilesets: [folha({ tilecount: 257, columns: 16 })] }))).toContain(
      'até 256 peças',
    )
    const cheia = await importar(mapa({ tilesets: [folha({ tilecount: 256, columns: 16 })] }))
    expect(cheia.scene.tilesets[0]?.count).toBe(256)
  })
  it('margem ou espaçamento na folha são recusados', async () => {
    expect(await recusa(mapa({ tilesets: [folha({ margin: 1 })] }))).toContain(
      'sem margem nem espaçamento',
    )
    expect(await recusa(mapa({ tilesets: [folha({ spacing: 2 })] }))).toContain(
      'sem margem nem espaçamento',
    )
  })
  it('grupos além de quatro níveis', async () => {
    const aninhar = (niveis: number): Json =>
      niveis === 0
        ? camada()
        : { id: 20 + niveis, type: 'group', name: `G${niveis}`, layers: [aninhar(niveis - 1)] }
    expect((await importar(mapa({ layers: [aninhar(4)] }))).scene.layers.length).toBe(5)
    expect(await recusa(mapa({ layers: [aninhar(5)] }))).toBe(
      'O mapa tem grupos dentro de grupos demais. O Pinta aceita até 4 níveis.',
    )
  })
  it('deslocamento de camada e lugar de objeto longe demais', async () => {
    expect(await recusa(mapa({ layers: [camada({ offsetx: 99999 })] }))).toContain(
      'deslocamento de a camada Chão é grande demais',
    )
    expect(
      await recusa(
        mapa({ layers: [objetos([{ id: 1, name: 'lua', x: 1e6, y: 0, width: 1, height: 1 }])] }),
      ),
    ).toContain('longe ou é grande demais')
  })
  it('opacidade e parallax fora da faixa são ajustados com aviso', async () => {
    const { scene, warnings } = await importar(
      mapa({ layers: [camada({ opacity: 1.5, parallaxx: 40, parallaxy: -1 })] }),
    )
    expect(scene.layers[0]).toMatchObject({ parallaxX: 16, parallaxY: 0 })
    expect(scene.layers[0]?.opacity).toBe(1)
    expect(warnings.length).toBe(3)
  })
  it('gid acima da última peça da folha, em camada e em objeto', async () => {
    expect(await recusa(mapa({ layers: [camada({ data: [1, 2, 3, 5] })] }))).toBe(
      'A camada Chão aponta para peças que não existem nas folhas do mapa.',
    )
    expect(
      await recusa(
        mapa({
          layers: [objetos([{ id: 1, name: 'placa', gid: 9, x: 0, y: 16, width: 16, height: 16 }])],
        }),
      ),
    ).toBe('O objeto placa da camada Coisas usa uma peça que não existe nas folhas do mapa.')
  })
  it('descrição de peça, animação e terreno que apontam para fora da folha', async () => {
    expect(await recusa(mapa({ tilesets: [folha({ tiles: [{ id: 4 }] })] }))).toContain(
      'descreve a peça 4',
    )
    expect(
      await recusa(
        mapa({
          tilesets: [folha({ tiles: [{ id: 0, animation: [{ tileid: 7, duration: 100 }] }] })],
        }),
      ),
    ).toContain('animação da peça 0')
    expect(
      await recusa(
        mapa({
          tilesets: [
            folha({
              wangsets: [
                {
                  name: 'Grama',
                  type: 'corner',
                  colors: [{ color: '#00ff00', name: 'Terreno 1' }],
                  wangtiles: [{ tileid: 0, wangid: [0, 2, 0, 2, 0, 2, 0, 2] }],
                },
              ],
            }),
          ],
        }),
      ),
    ).toContain('terreno Grama')
  })
})

describe('recusas de formato', () => {
  it('mapa infinito, isométrico, hexagonal e escalonado', async () => {
    const frase =
      'Traga um mapa ortogonal de tamanho fixo. Mapas infinitos, isométricos e hexagonais ainda não entram no Pinta.'
    expect(await recusa(mapa({ infinite: true }))).toBe(frase)
    expect(await recusa(mapa({ orientation: 'isometric' }))).toBe(frase)
    expect(await recusa(mapa({ orientation: 'hexagonal' }))).toBe(frase)
    expect(await recusa(mapa({ orientation: 'staggered' }))).toBe(frase)
    expect(await recusa(tiledXmlToJson(tmx('').replace('infinite="0"', 'infinite="1"')))).toBe(
      frase,
    )
    expect(await recusa(tiledXmlToJson(tmx('').replace('orthogonal', 'isometric')))).toBe(frase)
  })
  it('camada compactada com zstd', async () => {
    const data = base64(zstdCompressSync(gids([1, 2, 3, 4])))
    const frase = await recusa(
      mapa({ layers: [camada({ data, encoding: 'base64', compression: 'zstd' })] }),
    )
    expect(frase).toContain('zstd')
    expect(
      await recusa(
        tiledXmlToJson(
          tmx(
            `<layer id="1" name="Chão" width="2" height="2"><data encoding="base64" compression="zstd">${data}</data></layer>`,
          ),
        ),
      ),
    ).toBe(frase)
  })
  it('DTD e ENTITY no XML', () => {
    const entidade =
      '<?xml version="1.0"?><!DOCTYPE map [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><map orientation="orthogonal">&xxe;</map>'
    expect(() => tiledXmlToJson(entidade)).toThrow(TiledImportError)
    expect(() => tiledXmlToJson('<!doctype map><map/>')).toThrow(/entidades/)
    expect(() => tiledXmlToJson('<map><!ENTITY a "b"></map>')).toThrow(/entidades/)
    expect(() => tiledXmlToJson('<map><layer></map>')).toThrow(
      'O arquivo TMX/TSX não é um XML válido.',
    )
  })
})

describe('camada compactada', () => {
  for (const [nome, compactar] of [
    ['zlib', zlibSync],
    ['gzip', gzipSync],
  ] as const) {
    it(`${nome}: do tamanho certo entra; maior ou menor que o mapa é recusada`, async () => {
      const com = (values: number[]) =>
        mapa({
          layers: [
            camada({
              data: base64(compactar(gids(values))),
              encoding: 'base64',
              compression: nome,
            }),
          ],
        })
      const certa = await importar(com([1, 2, 3, 4]))
      expect(certa.scene.layers[0]).toMatchObject({ cells: [0, 1, 2, 3] })
      const frase = 'O tamanho da camada não corresponde ao mapa.'
      // Um fluxo com mais bytes que largura × altura × 4 não pode entrar cortado.
      expect(await recusa(com([1, 2, 3, 4, 1]))).toBe(frase)
      expect(await recusa(com([...Array(4096).fill(1)]))).toBe(frase)
      expect(await recusa(com([1, 2, 3]))).toBe(frase)
    })
  }
  it('bomba de descompactação é cortada no tamanho do mapa, sem inflar tudo', async () => {
    const bomba = base64(zlibSync(new Uint8Array(64 * 1024 * 1024)))
    expect(bomba.length).toBeLessThan(200_000)
    const inicio = performance.now()
    expect(
      await recusa(
        mapa({ layers: [camada({ data: bomba, encoding: 'base64', compression: 'zlib' })] }),
      ),
    ).toBe('O tamanho da camada não corresponde ao mapa.')
    expect(performance.now() - inicio).toBeLessThan(2000)
  })
  it('dados corrompidos, base64 sem compactar de tamanho errado e CSV curto', async () => {
    expect(
      await recusa(
        mapa({ layers: [camada({ data: 'AAAAAAAA', encoding: 'base64', compression: 'zlib' })] }),
      ),
    ).toBe('Uma camada compactada do mapa está corrompida.')
    expect(
      await recusa(
        mapa({ layers: [camada({ data: base64(gids([1, 2, 3])), encoding: 'base64' })] }),
      ),
    ).toBe('O tamanho da camada não corresponde ao mapa.')
    expect(await recusa(mapa({ layers: [camada({ data: '1,2,3', encoding: 'csv' })] }))).toBe(
      'O tamanho da camada não corresponde ao mapa.',
    )
    expect(await recusa(mapa({ layers: [camada({ data: [1, 2, 3, 4, 1] })] }))).toBe(
      'O tamanho da camada não corresponde ao mapa.',
    )
  })
})

describe('objeto de peça com espelhos e o bit diagonal', () => {
  const H = 0x80000000,
    V = 0x40000000,
    D = 0x20000000
  const girar = (x: number, y: number, graus: number) => {
    const a = (graus * Math.PI) / 180
    return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) }
  }
  /** Onde o Tiled desenha o ponto (u, v) da imagem: a matriz das células, na caixa do objeto. */
  function noTiled(
    o: { x: number; y: number; width: number; height: number; rotation: number },
    flags: number,
    u: number,
    v: number,
  ) {
    const cell =
        1 |
        (flags & H ? CELL_FLIP_H : 0) |
        (flags & V ? CELL_FLIP_V : 0) |
        (flags & D ? CELL_FLIP_D : 0),
      [a, b, c, d] = cellMatrix(cell),
      x = u - 0.5,
      y = v - 0.5
    const p = girar(
      (a * x + c * y + 0.5) * o.width,
      (b * x + d * y + 0.5) * o.height - o.height,
      o.rotation,
    )
    return { x: o.x + p.x, y: o.y + p.y }
  }
  /** Onde o Pinta desenha o mesmo ponto (`drawScene`): gira no canto de cima, espelha na caixa. */
  function noPinta(o: ReturnType<typeof tileObjectPlacement>, u: number, v: number) {
    const p = girar((o.flipX ? 1 - u : u) * o.width, (o.flipY ? 1 - v : v) * o.height, o.rotation)
    return { x: o.x + p.x, y: o.y + p.y }
  }
  it('as oito combinações caem no mesmo lugar que o Tiled desenha, com giro e caixa não quadrada', () => {
    let conferidos = 0
    for (const rotation of [0, 30, 90, 200, 330])
      for (let bits = 0; bits < 8; bits++) {
        const flags = (bits & 1 ? H : 0) + (bits & 2 ? V : 0) + (bits & 4 ? D : 0),
          tiled = { x: 40, y: 70, width: 32, height: 12, rotation },
          pinta = tileObjectPlacement({ ...tiled, gid: (5 + flags) >>> 0 })
        for (const [u, v] of [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
          [0.25, 0.8],
        ] as const) {
          const esperado = noTiled(tiled, flags, u, v),
            obtido = noPinta(pinta, u, v)
          expect(obtido.x).toBeCloseTo(esperado.x, 9)
          expect(obtido.y).toBeCloseTo(esperado.y, 9)
          conferidos++
        }
      }
    expect(conferidos).toBe(200)
  })
  it('o importador grava giro, caixa e espelhos, sem aviso e sem perder a peça', async () => {
    const { scene, warnings } = await importar(
      mapa({
        layers: [
          objetos([
            {
              id: 1,
              name: 'placa',
              gid: (3 + D + H) >>> 0,
              x: 16,
              y: 32,
              width: 16,
              height: 16,
              rotation: 0,
            },
            {
              id: 2,
              name: 'seta',
              gid: (2 + D) >>> 0,
              x: 0,
              y: 32,
              width: 16,
              height: 8,
              rotation: 0,
            },
            {
              id: 3,
              name: 'comum',
              gid: (1 + V) >>> 0,
              x: 0,
              y: 16,
              width: 16,
              height: 16,
              rotation: 0,
            },
          ]),
        ],
      }),
    )
    expect(warnings).toEqual([])
    const [placa, seta, comum] = scene.layers.flatMap((l) =>
      l.kind === 'objects' ? l.objects : [],
    )
    // Diagonal + horizontal é o giro de 90° para a direita.
    expect(placa).toMatchObject({
      rotation: 90,
      width: 16,
      height: 16,
      art: { assetId: 'tiles-0', tile: 2 },
    })
    expect(placa?.flipX).toBeUndefined()
    expect(placa?.flipY).toBeUndefined()
    expect(placa?.x).toBeCloseTo(32, 9)
    expect(placa?.y).toBeCloseTo(16, 9)
    // Só a diagonal: giro de 90° com a caixa deitada e um espelho.
    expect(seta).toMatchObject({ rotation: 90, width: 8, height: 16, flipY: true })
    expect(comum).toMatchObject({ x: 0, y: 0, flipY: true })
    expect(comum?.rotation).toBeUndefined()
  })
})

describe('relatório do que não foi convertido', () => {
  it('modelo, objeto escondido, texto, classe da camada e cor de fundo', async () => {
    const { scene, warnings } = await importar(
      mapa({
        backgroundcolor: '#336699',
        class: 'Fase',
        layers: [
          camada({ class: 'chao' }),
          camada({
            id: 2,
            name: 'Teto',
            class: 'teto',
            properties: [{ name: 'class', type: 'string', value: 'minha' }],
          }),
          objetos([
            {
              id: 1,
              name: 'bau',
              template: 'modelos/bau.tj',
              x: 5,
              y: 6,
              properties: [{ name: 'ouro', type: 'int', value: 3 }],
            },
            { id: 2, name: 'fantasma', visible: false, x: 0, y: 0, width: 8, height: 8 },
            { id: 3, name: 'placa', text: { text: 'Oi' }, x: 0, y: 0, width: 8, height: 8 },
          ]),
          { id: 7, type: 'imagelayer', name: 'Céu', image: 'ceu.png' },
          camada({ id: 8, name: 'Brilho', tintcolor: '#ff0000' }),
          camada({ id: 12, name: 'Luz', mode: 'add' }),
        ],
      }),
    )
    expect(scene.layers[0]?.properties).toEqual({ class: 'chao' })
    expect(scene.layers[1]?.properties).toEqual({ class: 'minha' })
    const coisas = scene.layers.find((l) => l.kind === 'objects')
    if (coisas?.kind !== 'objects') throw new Error('camada de objetos ausente')
    expect(coisas.objects.map((o) => o.name)).toEqual(['bau', 'fantasma'])
    expect(coisas.objects[0]).toMatchObject({
      x: 5,
      y: 6,
      width: 0,
      height: 0,
      properties: { ouro: { type: 'int', value: 3 } },
    })
    expect(warnings).toEqual([
      'A cor de fundo do mapa (#336699) não foi trazida: o Pinta não guarda cor de fundo no mapa.',
      'A classe do mapa (Fase) não foi trazida.',
      'A classe chao de a camada Chão foi guardada como a propriedade class.',
      'A classe teto de a camada Teto não foi trazida.',
      'O objeto bau da camada Coisas usa um modelo do Tiled (modelos/bau.tj), que o Pinta não lê. Ele entrou só com o lugar, o nome e as propriedades que estavam no mapa.',
      'O objeto fantasma da camada Coisas estava escondido no Tiled e entrou visível.',
      'O texto do objeto placa não foi convertido.',
      'A camada Céu (imagelayer) não foi convertida.',
      'A camada Brilho usa mistura ou tonalidade que não foi convertida.',
      'A camada Luz usa mistura ou tonalidade que não foi convertida.',
    ])
  })
  it('no TMX: modelo, texto, cor de fundo, classe e objeto escondido também avisam', async () => {
    const { scene, warnings } = await importar(
      tiledXmlToJson(
        tmx(
          `<layer id="1" name="Chão" class="chao" width="2" height="2"><data encoding="csv">1,2,3,4</data></layer>
           <objectgroup id="9" name="Coisas" draworder="index">
             <object id="1" name="bau" template="modelos/bau.tx" x="5" y="6"/>
             <object id="2" name="fantasma" visible="0" x="0" y="0" width="8" height="8"/>
             <object id="3" name="placa" x="0" y="0" width="8" height="8"><text wrap="1">Oi</text></object>
           </objectgroup>`,
          ' backgroundcolor="#000000"',
        ),
      ),
    )
    expect(scene.layers[0]?.properties).toEqual({ class: 'chao' })
    expect(warnings).toEqual([
      'A cor de fundo do mapa (#000000) não foi trazida: o Pinta não guarda cor de fundo no mapa.',
      'A classe chao de a camada Chão foi guardada como a propriedade class.',
      'O objeto bau da camada Coisas usa um modelo do Tiled (modelos/bau.tx), que o Pinta não lê. Ele entrou só com o lugar, o nome e as propriedades que estavam no mapa.',
      'O objeto fantasma da camada Coisas estava escondido no Tiled e entrou visível.',
      'O texto do objeto placa não foi convertido.',
    ])
  })
  it('camada escondida continua escondida (não é perda)', async () => {
    const { scene, warnings } = await importar(mapa({ layers: [camada({ visible: false })] }))
    expect(scene.layers[0]?.visible).toBe(false)
    expect(warnings).toEqual([])
  })
  it('detalhes da folha: chance, formas de colisão, classe, alinhamento, deslocamento e cor transparente', async () => {
    const { warnings } = await importar(
      mapa({
        tilesets: [
          folha({
            objectalignment: 'center',
            tileoffset: { x: 0, y: 4 },
            transparentcolor: '#ff00ff',
            tiles: [
              { id: 0, probability: 0.25 },
              { id: 1, objectgroup: { objects: [{ id: 1, x: 0, y: 0, width: 16, height: 8 }] } },
              { id: 2, type: 'agua' },
            ],
            wangsets: [
              {
                name: 'Grama',
                type: 'corner',
                colors: [{ color: '#00ff00', name: 'Verde' }],
                wangtiles: [{ tileid: 0, wangid: [0, 1, 0, 1, 0, 1, 0, 1] }],
              },
            ],
          }),
        ],
      }),
    )
    expect(warnings).toEqual([
      'A folha chao alinha os objetos de outro jeito (center); os objetos de peça entraram com o canto de baixo à esquerda e podem ter saído do lugar.',
      'O deslocamento de desenho das peças de chao não foi trazido.',
      'A cor transparente da folha chao não foi aplicada.',
      'A chance de sorteio das peças de chao não foi trazida.',
      'As formas de colisão desenhadas dentro das peças de chao não foram trazidas. Marque as peças como sólidas no Pinta.',
      'A classe das peças de chao não foi trazida.',
      'Os nomes das cores dos terrenos de chao não foram trazidos.',
    ])
  })
  it('camada com duas folhas vira duas camadas, com aviso', async () => {
    const { scene, warnings } = await importar(
      mapa({
        tilesets: [folha(), folha({ firstgid: 5, name: 'flores', image: 'flores.png' })],
        layers: [camada({ data: [1, 5, 0, 8] })],
      }),
    )
    expect(scene.layers.map((l) => (l.kind === 'tiles' ? [l.tilesetId, l.cells] : null))).toEqual([
      ['tiles-0', [0, -1, -1, -1]],
      ['tiles-1', [-1, 0, -1, 3]],
    ])
    expect(warnings).toEqual(['A camada Chão virou 2 camadas, uma para cada folha de peças.'])
  })
})

describe('conversão para os desenhos do Pinta', () => {
  it('folhas, arte, conjuntos e mapa saem todos pelo portão do documento', async () => {
    const { map, assets } = vilaEFloresta(),
      scene = await exportPintaScene(
        map,
        (id) => assets.find((a) => a.id === id) ?? null,
        nativeImageOf,
      )
    expect(scene.art?.length).toBeGreaterThan(0)
    expect(scene.sets?.length).toBeGreaterThan(0)
    const converted = await sceneToNative(scene, async (url) => {
      const image = await loadImage(url),
        canvas = createCanvas(image.width, image.height),
        ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0)
      return {
        width: image.width,
        height: image.height,
        data: ctx.getImageData(0, 0, image.width, image.height).data,
      }
    })
    expect(converted.assets.map((a): string => a.kind).sort()).toEqual([
      'map-set',
      'pixel-sprite',
      'tilemap',
      'tileset',
      'tileset',
    ])
    // O que o portão devolve para cada desenho é o próprio desenho: nada entra sem passar por ele.
    for (const asset of converted.assets)
      expect(sanitizePintaAsset(structuredClone(asset))).toEqual(asset)
  })
  it('tamanho de peça que o Pinta não edita e imagem menor que a folha são recusados com frase', async () => {
    const { scene } = await importar(
      mapa({ tilewidth: 20, tileheight: 20, tilesets: [folha({ tilewidth: 20, tileheight: 20 })] }),
    )
    await expect(
      sceneToNative(scene, async () => ({ width: 1, height: 1, data: new Uint8ClampedArray(4) })),
    ).rejects.toThrow(TiledImportError)
    const ok = (await importar(mapa())).scene
    await expect(
      sceneToNative(ok, async () => ({
        width: 8,
        height: 8,
        data: new Uint8ClampedArray(8 * 8 * 4),
      })),
    ).rejects.toThrow('A folha de peças é menor que os dados do mapa.')
  })
})
