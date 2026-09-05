import { describe, expect, it } from 'bun:test'
import { strFromU8, unzipSync } from 'fflate'
import { makeModel, makeSky, makeTexture } from '../testing/fixtures'
import { readGlb } from '../testing/glbRead'
import { decodePng } from '../testing/pngDecode'
import { decodeRgbe } from '../testing/rgbeDecode'
import { MOLDA_GALLERY_ZIP_ENTRY } from './backupFormat'
import { importMoldaJson } from './projectJson'
import {
  buildGalleryFileMap,
  GalleryZipError,
  README_ENTRY,
  zipGallery,
  zipGalleryBlob,
} from './zip'

/** O céu real sai em 1024×512 (~0,5 s); os testes usam um céu pequeno. */
const SKY_SIZE = { width: 64, height: 32 }

describe('"Baixar tudo" (o zip da galeria)', () => {
  it('um arquivo pronto por criação, separado por tipo, mais o backup completo e o LEIA-ME', async () => {
    const assets = [makeModel(), makeTexture(), makeSky()]
    const { files, readme, skipped } = await buildGalleryFileMap(assets, {
      skySize: SKY_SIZE,
      yieldBetween: null,
    })
    expect(skipped).toEqual([])
    expect(Object.keys(files).sort()).toEqual(
      [
        'modelos/nave.glb',
        'texturas/grama.png',
        'ceus/fim-de-tarde.hdr',
        MOLDA_GALLERY_ZIP_ENTRY,
      ].sort(),
    )

    const glb = readGlb(files['modelos/nave.glb'] as Uint8Array)
    expect((glb.json.meshes as unknown[]).length).toBe(1)
    const png = decodePng(files['texturas/grama.png'] as Uint8Array)
    expect([png.width, png.height]).toEqual([16, 16])
    const hdr = decodeRgbe(files['ceus/fim-de-tarde.hdr'] as Uint8Array)
    expect([hdr.width, hdr.height]).toEqual([SKY_SIZE.width, SKY_SIZE.height])

    const restored = importMoldaJson(files[MOLDA_GALLERY_ZIP_ENTRY] as string)
    expect(restored?.skipped).toBe(0)
    expect(restored?.assets.map((asset) => [asset.kind, asset.name])).toEqual([
      ['model', 'nave'],
      ['texture', 'grama'],
      ['sky', 'fim-de-tarde'],
    ])

    const text = readme.join('\n')
    expect(text).toContain('modelos/nave.glb')
    expect(text).toContain('texturas/grama.png')
    expect(text).toContain('ceus/fim-de-tarde.hdr')
    expect(text).toContain('Trazer de volta')
    expect(text).not.toContain('—')
  })

  it('criação que o Estúdio não aceita fica FORA dos arquivos prontos, mas DENTRO do backup', async () => {
    const empty = makeModel({ id: 'model-2', name: 'vazio', parts: [] })
    const { files, readme, skipped } = await buildGalleryFileMap([empty, makeTexture()], {
      yieldBetween: null,
    })
    expect(skipped).toEqual([{ name: 'vazio', kind: 'model', reason: 'empty' }])
    expect(Object.keys(files)).not.toContain('modelos/vazio.glb')
    expect(
      importMoldaJson(files[MOLDA_GALLERY_ZIP_ENTRY] as string)?.assets.map((asset) => asset.name),
    ).toEqual(['vazio', 'grama'])
    expect(readme.join('\n')).toContain('"vazio"')
  })

  it('cede a thread entre uma criação e outra (o céu real custa meio segundo)', async () => {
    let yields = 0
    await buildGalleryFileMap([makeModel(), makeTexture()], {
      yieldBetween: async () => {
        yields += 1
      },
    })
    expect(yields).toBe(1)
  })

  it('nomes repetidos ou fora do padrão não colidem nem viram caminho', async () => {
    const { files } = await buildGalleryFileMap(
      [makeTexture({ id: 't-1', name: 'grama' }), makeTexture({ id: 't-2', name: 'grama' })],
      { yieldBetween: null },
    )
    expect(Object.keys(files)).toContain('texturas/grama.png')
    expect(Object.keys(files)).toContain('texturas/grama-2.png')
  })

  it('o ZIP tem as mesmas entradas + o LEIA-ME e abre com o fflate', async () => {
    const bytes = await zipGallery([makeModel(), makeTexture()], { yieldBetween: null })
    const entries = unzipSync(bytes)
    expect(Object.keys(entries).sort()).toEqual(
      ['modelos/nave.glb', 'texturas/grama.png', MOLDA_GALLERY_ZIP_ENTRY, README_ENTRY].sort(),
    )
    expect(strFromU8(entries[README_ENTRY] as Uint8Array)).toContain('Molda')
    expect(
      importMoldaJson(strFromU8(entries[MOLDA_GALLERY_ZIP_ENTRY] as Uint8Array))?.assets,
    ).toHaveLength(2)
  })

  it('monta incrementalmente, informa progresso e devolve Blob sem mapa duplicado', async () => {
    const progress: number[] = []
    const blob = await zipGalleryBlob([makeModel(), makeTexture()], {
      yieldBetween: null,
      onProgress: ({ processed }) => progress.push(processed),
    })
    const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    expect(Object.keys(entries)).toContain(MOLDA_GALLERY_ZIP_ENTRY)
    expect(progress.at(-1)).toBe(2)
  })

  it('cancela sem resultado parcial e recusa limites de entradas/bytes', async () => {
    const aborted = new AbortController()
    aborted.abort()
    await expect(zipGallery([makeTexture()], { signal: aborted.signal })).rejects.toMatchObject({
      code: 'aborted',
    })
    await expect(
      zipGallery([makeTexture()], { yieldBetween: null, maxEntries: 2 }),
    ).rejects.toBeInstanceOf(GalleryZipError)
    await expect(
      zipGallery([makeTexture()], { yieldBetween: null, maxReadyBytes: 1 }),
    ).rejects.toMatchObject({ code: 'ready-bytes' })
    await expect(
      zipGallery([makeTexture()], { yieldBetween: null, maxCompressedBytes: 1 }),
    ).rejects.toMatchObject({ code: 'compressed-bytes' })
  })
})
