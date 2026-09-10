import { describe, expect, it } from 'bun:test'
import { strFromU8, unzipSync } from 'fflate'
import { readSceneProjectFile } from '../import/sceneProjectFile'
import { sceneToJson } from '../scene/documentJson'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel, makeSky, makeTexture } from '../testing/fixtures'
import { readGlb } from '../testing/glbRead'
import { decodePng } from '../testing/pngDecode'
import { decodeRgbe } from '../testing/rgbeDecode'
import { MOLDA_GALLERY_ZIP_ENTRY } from './backupFormat'
import { importMoldaJson } from './projectJson'
import { exportSkyHdr } from './skyHdr'
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
  it('worker-produced HDR is identical inside the compressed archive', async () => {
    const sky = makeSky()
    const original = structuredClone(sky)
    const expected = exportSkyHdr(sky, SKY_SIZE)
    const bytes = await zipGallery([sky], { skySize: SKY_SIZE, yieldBetween: null })
    const entries = unzipSync(bytes)
    expect(expected.ok).toBe(true)
    if (expected.ok)
      expect(entries['ceus/fim-de-tarde.hdr']).toEqual(Uint8Array.from(expected.bytes))
    expect(sky).toEqual(original)
  })

  it('aborts asynchronous sky preparation without returning partial files or archives', async () => {
    for (const prepare of [buildGalleryFileMap, zipGallery]) {
      const controller = new AbortController()
      const pending = prepare([makeSky()], { signal: controller.signal, yieldBetween: null })
      controller.abort()
      await expect(pending).rejects.toMatchObject({ code: 'aborted' })
    }
  })

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

describe('o pacote e a geração seguinte', () => {
  it('leva a criação da oficina nova no arquivo nativo dela, sem mexer no envelope v1', async () => {
    const model = makeModel()
    const scene = migrateLegacyModel({ ...makeModel(), id: 'promovida', name: 'nave' }).document
    const bytes = await zipGallery([model], {
      yieldBetween: null,
      scenes: [{ name: 'nave', json: JSON.stringify(sceneToJson(scene)) }],
    })
    const entries = unzipSync(bytes)
    // Duas criações com o MESMO nome, uma de cada geração, não podem se sobrescrever.
    expect(Object.keys(entries)).toContain('modelos/nave.glb')
    expect(Object.keys(entries)).toContain('projetos/nave-2.molda.json')
    // O envelope antigo continua exatamente o que era: só a geração v1 mora nele.
    const backup = importMoldaJson(strFromU8(entries[MOLDA_GALLERY_ZIP_ENTRY] as Uint8Array))
    expect(backup?.assets.map((asset) => asset.id)).toEqual([model.id])
    // E o arquivo nativo volta pela mesma porta do "Trazer uma cópia do Molda".
    const restored = readSceneProjectFile(entries['projetos/nave-2.molda.json'] as Uint8Array)
    expect(restored.id).toBe('promovida')
    expect(restored.formatVersion).toBe(2)
    expect(strFromU8(entries[README_ENTRY] as Uint8Array)).toContain('projetos/nave-2.molda.json')
  })
})
