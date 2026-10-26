import { describe, expect, test } from 'bun:test'
import { unzlibSync } from 'fflate'
import { FloatType } from 'three'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import demo from '../../../playground/moldaDemoAssets.json'
import { raylibSkyAsImage } from '../../asset-library/personalSync'
import { RAYLIB_3D_EXTENSION } from '../../runtime/python/raylib/contract'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { createProjectStore } from '../../state/projectStore'
import { refinePythonProjectDocument } from '../../state/pythonProjectValidation'
import { addMoldaCreationToProject, raylibReadyCreation } from './addCreationToProject'
import { creationBlockedFor3D } from './has3DConsumer'
import { decodeRadiance, skyPanoramaPng } from './skyPanorama'

const sky = (demo as { sky: { dataUrl: string } }).sky.dataUrl
const bytes = Uint8Array.from(atob(sky.slice(sky.indexOf(',') + 1)), (char) => char.charCodeAt(0))

describe('céu do Molda (.hdr) → PNG panorâmico do Raylib 3D', () => {
  test('lê o .hdr do Molda igual ao HDRLoader do three (o que o Jogo 3D mostra)', () => {
    const ours = decodeRadiance(bytes)
    const loader = new HDRLoader()
    loader.setDataType(FloatType)
    const theirs = loader.parse(bytes.buffer.slice(0) as ArrayBuffer) as {
      width: number
      height: number
      data: Float32Array
    }
    expect([ours.width, ours.height]).toEqual([theirs.width, theirs.height])
    // O three guarda RGBA; o nosso, RGB.
    let worst = 0
    for (let pixel = 0; pixel < ours.width * ours.height; pixel++)
      for (let channel = 0; channel < 3; channel++)
        worst = Math.max(
          worst,
          Math.abs(ours.data[pixel * 3 + channel]! - theirs.data[pixel * 4 + channel]!),
        )
    expect(worst).toBeLessThan(1e-6)
    // Anti-vácuo: o céu não é preto.
    expect(ours.data.reduce((top, value) => Math.max(top, value), 0)).toBeGreaterThan(0.1)
  })

  test('vira um PNG RGB do mesmo tamanho, com o céu em sRGB', () => {
    const { dataUrl, width, height } = skyPanoramaPng(sky)
    const sky2 = decodeRadiance(bytes)
    expect([width, height]).toEqual([sky2.width, sky2.height])
    const png = Uint8Array.from(atob(dataUrl.slice(22)), (char) => char.charCodeAt(0))
    expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    const view = new DataView(png.buffer)
    expect([view.getUint32(16), view.getUint32(20), png[24], png[25]]).toEqual([
      width,
      height,
      8,
      2,
    ])
    // O primeiro pixel do PNG é o primeiro do céu, codificado em sRGB e cortado em 1.
    const idat = 8 + 25
    const length = view.getUint32(idat)
    const raw = unzlibSync(png.subarray(idat + 8, idat + 8 + length))
    expect(raw[0]).toBe(0)
    const encode = (v: number) => {
      const c = Math.min(Math.max(v, 0), 1)
      return Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055) * 255)
    }
    expect([raw[1], raw[2], raw[3]]).toEqual([
      encode(sky2.data[0]!),
      encode(sky2.data[1]!),
      encode(sky2.data[2]!),
    ])
  })

  test('um arquivo que não é .hdr é recusado em português', () => {
    expect(() => decodeRadiance(new TextEncoder().encode('não é um céu'))).toThrow(
      'não é um arquivo .hdr',
    )
  })
})

describe('o céu do Molda num projeto Raylib', () => {
  async function raylib(extension: { id: string; version: string }) {
    const store = createProjectStore()
    const raw = documentFixture('python', 'classic')
    raw.assets = []
    raw.installedExtensions = [{ ...extension, installedAt: 1 }]
    store.getState().hydrateProject(await refinePythonProjectDocument(raw))
    return store
  }
  const creation = {
    id: 'ceu-1',
    name: 'ceu-do-entardecer',
    kind: 'environment3d' as const,
    dataUrl: sky,
    originalFileName: 'ceu-do-entardecer.hdr',
  }

  test('no Raylib 3D entra como imagem panorâmica em images/', async () => {
    const store = await raylib(RAYLIB_3D_EXTENSION)
    const ready = await raylibReadyCreation(creation, true)
    expect(addMoldaCreationToProject(store.getState(), ready)).toBeNull()
    const asset = store.getState().project?.assets?.[0]
    expect(asset).toMatchObject({
      kind: 'image',
      proPath: 'images/ceu-do-entardecer.png',
      libId: 'personal:ceu-1',
      libOrigin: 'molda',
    })
    expect(asset!.dataUrl.startsWith('data:image/png;base64,')).toBe(true)
  })

  test('o céu editado no Molda volta a entrar no jogo Raylib como panorama novo', async () => {
    const store = await raylib(RAYLIB_3D_EXTENSION)
    addMoldaCreationToProject(store.getState(), await raylibReadyCreation(creation, true))
    const asset = { ...store.getState().project!.assets![0]!, libRevision: 1 }
    const drawing = { ...creation, origin: 'molda' as const, updatedAt: 2 }
    const image = await raylibSkyAsImage(asset, drawing)
    expect(image).toMatchObject({ kind: 'image', width: 1024, height: 512, updatedAt: 2 })
    expect(image!.dataUrl.startsWith('data:image/png;base64,')).toBe(true)
    // A mesma revisão já está no jogo: nada a converter de novo.
    expect(await raylibSkyAsImage({ ...asset, libRevision: 2 }, drawing)).toBeNull()
    // Um desenho do Pinta e um céu fora do Raylib seguem pelo caminho de sempre.
    const pinta = { ...drawing, kind: 'image' as const }
    expect(await raylibSkyAsImage(asset, pinta)).toBe(pinta)
    const hdr = { ...asset, kind: 'environment3d' as const }
    expect(await raylibSkyAsImage(hdr, drawing)).toBe(drawing)
  })

  test('fora do Raylib o céu fica como .hdr (o Jogo 3D o lê assim)', async () => {
    expect(await raylibReadyCreation(creation, false)).toBe(creation)
  })

  test('a regra das janelas: modelo e céu pedem o Raylib 3D, textura entra nas duas', () => {
    const two = { has3D: false, raylib: true }
    const three = { has3D: true, raylib: true }
    expect(creationBlockedFor3D('sky', two)).toBe(true)
    expect(creationBlockedFor3D('model', two)).toBe(true)
    expect(creationBlockedFor3D('texture', two)).toBe(false)
    expect(creationBlockedFor3D('sky', three)).toBe(false)
    expect(creationBlockedFor3D('model', three)).toBe(false)
  })
})
