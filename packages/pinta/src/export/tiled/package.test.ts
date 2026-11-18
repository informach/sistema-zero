/** O pacote que a criança traz (arquivos soltos ou ZIP): caminhos, tetos e escolha do mapa. */
import { describe, expect, it } from 'bun:test'
import { strToU8, zipSync } from 'fflate'
import { COPY } from '../../core/copy'
import { TiledImportError } from './errors'
import { importTiledScene } from './import'
import {
  readTiledPackage,
  TILED_PACKAGE_LIMITS,
  tiledPackagePath,
  tiledPackageSource,
} from './package'

const arquivo = (name: string, content: Uint8Array | string, size?: number) => {
  const bytes = typeof content === 'string' ? strToU8(content) : content
  return {
    name,
    size: size ?? bytes.length,
    arrayBuffer: async () => bytes.slice().buffer as ArrayBuffer,
  }
}
const mapa = JSON.stringify({
  orientation: 'orthogonal',
  infinite: false,
  width: 1,
  height: 1,
  tilewidth: 16,
  tileheight: 16,
  tilesets: [{ firstgid: 1, source: '../folhas/chao.tsj' }],
  layers: [{ id: 1, type: 'tilelayer', name: 'Chão', width: 1, height: 1, data: [1] }],
})
const folha = (image: string) =>
  JSON.stringify({
    name: 'chao',
    tilewidth: 16,
    tileheight: 16,
    tilecount: 1,
    columns: 1,
    image,
  })
const recusa = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise
  } catch (e) {
    expect(e).toBeInstanceOf(TiledImportError)
    return (e as Error).message
  }
  throw new Error('Devia ter recusado.')
}

describe('caminhos dentro do pacote', () => {
  it('normaliza pastas e barras', () => {
    expect(tiledPackagePath('mapas/./fase/../folhas/chao.png')).toBe('mapas/folhas/chao.png')
    expect(tiledPackagePath('mapas\\fase\\chao.png')).toBe('mapas/fase/chao.png')
  })
  it('recusa sair da pasta, caminho absoluto e endereço de internet', () => {
    for (const fora of ['../segredo.png', 'a/../../segredo.png', '..\\..\\x.png'])
      expect(() => tiledPackagePath(fora)).toThrow(COPY.scene.pathOutsideMap)
    for (const absoluto of [
      '/etc/passwd',
      '\\\\servidor\\x.png',
      'C:\\Users\\x.png',
      'c:/x.png',
      'https://exemplo.com/x.png',
      'http://exemplo.com/x.png',
      'file:///etc/passwd',
      'data:image/png;base64,AAAA',
      'javascript:alert(1)',
    ])
      expect(() => tiledPackagePath(absoluto)).toThrow(COPY.scene.localImagesOnly)
    expect(() => tiledPackagePath('../x')).toThrow(TiledImportError)
  })
})

describe('ZIP', () => {
  it('lê o pacote, acha o mapa e resolve a folha e a imagem em relação a cada arquivo', async () => {
    const zip = zipSync({
      'jogo/mapas/fase.tmj': strToU8(mapa),
      'jogo/folhas/chao.tsj': strToU8(folha('imagens/chao.png')),
      'jogo/folhas/imagens/chao.png': new Uint8Array([1, 2, 3]),
      'jogo/maps.json': strToU8('{}'),
      'jogo/desenhos.pinta.json': strToU8('{"orientation":"x"}'),
      'jogo/notas.json': strToU8('{"a":1}'),
    })
    const { entries, maps } = await readTiledPackage([arquivo('jogo.zip', zip)])
    expect(maps).toEqual(['jogo/mapas/fase.tmj'])
    const source = tiledPackageSource(entries, maps[0]!)
    expect(source.name).toBe('fase')
    const { scene } = await importTiledScene(source.map(), source.resolver, source.name)
    expect(scene.tilesets[0]?.image).toBe('data:image/png;base64,AQID')
  })
  it('entrada do ZIP com ../, caminho absoluto ou endereço é recusada antes de abrir', async () => {
    for (const [nome, frase] of [
      ['../fora.png', COPY.scene.pathOutsideMap],
      ['a/../../fora.png', COPY.scene.pathOutsideMap],
      ['/etc/passwd', COPY.scene.localImagesOnly],
      ['C:/Windows/x.png', COPY.scene.localImagesOnly],
      ['https://exemplo.com/x.png', COPY.scene.localImagesOnly],
    ] as const) {
      const zip = zipSync({ 'mapa.tmj': strToU8(mapa), [nome]: new Uint8Array([1]) })
      expect(await recusa(readTiledPackage([arquivo('pacote.zip', zip)]))).toBe(frase)
    }
  })
  it('o mapa que aponta para fora do pacote não lê nada de fora', async () => {
    for (const [imagem, frase] of [
      ['../../../segredo.png', COPY.scene.pathOutsideMap],
      ['https://exemplo.com/chao.png', COPY.scene.localImagesOnly],
      ['/etc/passwd', COPY.scene.localImagesOnly],
      ['nao-veio.png', COPY.scene.dynamicFaltaOArquivoIncluaAsImagens('../folhas/nao-veio.png')],
    ] as const) {
      const { entries, maps } = await readTiledPackage(
        [arquivo('mapas/fase.tmj', mapa), arquivo('folhas/chao.tsj', folha(imagem))].map((f) => ({
          ...f,
          webkitRelativePath: f.name,
        })),
      )
      const source = tiledPackageSource(entries, maps[0]!)
      expect(await recusa(importTiledScene(source.map(), source.resolver))).toBe(frase)
    }
  })
  it('ZIP quebrado e pacote sem mapa têm frase própria', async () => {
    expect(await recusa(readTiledPackage([arquivo('x.zip', new Uint8Array([1, 2, 3, 4]))]))).toBe(
      COPY.scene.naoConseguiAbrirOZip,
    )
    expect(await recusa(readTiledPackage([arquivo('foto.png', new Uint8Array([1]))]))).toBe(
      COPY.scene.naoEncontreiUmMapaTiledNoPacote,
    )
    const { entries } = await readTiledPackage([
      arquivo('fase.tmx', '<map/>'),
      arquivo('ruim.json', '{'),
    ])
    expect(() =>
      tiledPackageSource(new Map([...entries, ['ruim.tmj', strToU8('{')]]), 'ruim.tmj').map(),
    ).toThrow(COPY.scene.oMapaNaoEUmJsonValido)
  })
})

describe('tetos de tamanho', () => {
  it('os tetos são 32 MiB por arquivo e 128 MiB abertos', () => {
    expect(TILED_PACKAGE_LIMITS).toEqual({
      fileBytes: 32 * 1024 * 1024,
      unpackedBytes: 128 * 1024 * 1024,
    })
  })
  it('um arquivo acima de 32 MiB é recusado sem ser lido', async () => {
    let lido = false
    const grande = {
      name: 'fase.tmj',
      size: 32 * 1024 * 1024 + 1,
      arrayBuffer: async () => {
        lido = true
        return new ArrayBuffer(0)
      },
    }
    expect(await recusa(readTiledPackage([grande]))).toBe(COPY.scene.umArquivoPassouDe32MiB)
    expect(lido).toBe(false)
    const noLimite = arquivo('fase.tmj', mapa, 32 * 1024 * 1024)
    expect((await readTiledPackage([noLimite])).maps).toEqual(['fase.tmj'])
  })
  it('um ZIP pequeno que abre em mais de 128 MiB é recusado', async () => {
    // Três entradas de 45 MiB de zeros: poucos KiB compactados, 135 MiB abertos.
    const zeros = new Uint8Array(45 * 1024 * 1024)
    const zip = zipSync(
      { 'mapa.tmj': strToU8(mapa), 'a.bin': zeros, 'b.bin': zeros, 'c.bin': zeros },
      { level: 9 },
    )
    expect(zip.length).toBeLessThan(1024 * 1024)
    expect(await recusa(readTiledPackage([arquivo('bomba.zip', zip)]))).toBe(
      COPY.scene.unpackedTooLarge,
    )
  }, 60_000)
  it('a soma de vários ZIP conta junto, e o teto vale pelo que saiu de verdade', async () => {
    const zip = zipSync({ 'mapa.tmj': strToU8(mapa), 'a.bin': new Uint8Array(600) })
    const limites = { fileBytes: 10_000, unpackedBytes: 1_000 + strToU8(mapa).length }
    expect((await readTiledPackage([arquivo('um.zip', zip)], limites)).maps).toEqual(['mapa.tmj'])
    expect(
      await recusa(readTiledPackage([arquivo('um.zip', zip), arquivo('dois.zip', zip)], limites)),
    ).toBe(COPY.scene.unpackedTooLarge)
  })
})
