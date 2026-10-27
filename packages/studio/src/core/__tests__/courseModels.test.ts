import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { COURSE_MODEL_LOADERS } from '../course-models/registry.generated'
import {
  clearCourseModelCacheForTests,
  COURSE_MODEL_LIB_PREFIX,
  courseModelSha,
  courseModelStub,
  isCourseModelLibId,
  pendingCourseModels,
  preloadCourseModels,
  resolveCourseModels,
} from '../courseModels'
import { readGlbSummary } from '../glbSummary'
import { asset3DManifest, isValidAssetDataUrl, type ProjectAsset } from '../project'

const DIR = resolve(import.meta.dirname, '../course-models')
const FILES = readdirSync(DIR).filter((f) => /^m-[a-f0-9]{64}\.generated\.ts$/.test(f))

function moduleBytes(file: string): Buffer {
  const text = readFileSync(resolve(DIR, file), 'utf8')
  const base64 = /base64,([A-Za-z0-9+/=]+)'/.exec(text)?.[1]
  if (!base64) throw new Error(`sem data URL em ${file}`)
  return Buffer.from(base64, 'base64')
}

function reference(sha: string, clips: string[] = [], name = 'modelo'): ProjectAsset {
  return {
    id: `id-${name}`,
    name,
    kind: 'model3d',
    source: 'library',
    libId: `${COURSE_MODEL_LIB_PREFIX}${sha}`,
    originalFileName: `${name}.glb`,
    dataUrl: courseModelStub(sha, clips),
  }
}

describe('biblioteca de modelos dos cursos', () => {
  test('cada módulo guarda o GLB do sha do próprio nome, e o registro lista todos', () => {
    expect(FILES.length).toBeGreaterThan(0)
    for (const file of FILES) {
      const sha = file.slice(2, 66)
      expect(createHash('sha256').update(moduleBytes(file)).digest('hex')).toBe(sha)
    }
    expect(Object.keys(COURSE_MODEL_LOADERS).sort()).toEqual(FILES.map((f) => f.slice(2, 66)).sort())
  })

  test('o GLB mínimo passa na validação de assets e mostra os clipes ao seletor', () => {
    const sha = 'a'.repeat(64)
    const stub = courseModelStub(sha, ['acender', 'aceso'])
    expect(stub.length).toBeLessThan(600)
    expect(isValidAssetDataUrl(stub, 'model3d', 'farol.glb')).toBe(true)
    expect(readGlbSummary(stub)?.clips).toEqual(['acender', 'aceso'])
    expect(readGlbSummary(courseModelStub(sha, []))?.clips).toEqual([])
    expect(() => courseModelStub('nada', [])).toThrow()
  })

  test('só uma referência de modelo da biblioteca conta', () => {
    const sha = 'b'.repeat(64)
    expect(courseModelSha(reference(sha))).toBe(sha)
    expect(courseModelSha({ ...reference(sha), source: 'upload' })).toBeNull()
    expect(courseModelSha({ ...reference(sha), kind: 'image' })).toBeNull()
    expect(courseModelSha({ ...reference(sha), libId: `personal:${sha}` })).toBeNull()
    expect(courseModelSha({ ...reference(sha), libId: `${COURSE_MODEL_LIB_PREFIX}abc` })).toBeNull()
    expect(isCourseModelLibId(`${COURSE_MODEL_LIB_PREFIX}${sha}`)).toBe(true)
    expect(isCourseModelLibId('personal:x')).toBe(false)
  })

  test('o manifesto 3D usa o modelo de verdade depois de carregar, e o projeto não muda', async () => {
    clearCourseModelCacheForTests()
    const file = FILES[0]!
    const sha = file.slice(2, 66)
    const real = `data:model/gltf-binary;base64,${moduleBytes(file).toString('base64')}`
    const desconhecido = reference('c'.repeat(64), [], 'outro')
    const assets = [reference(sha), desconhecido]
    expect(asset3DManifest(assets).modelo?.dataUrl).toBe(assets[0]!.dataUrl)
    expect(pendingCourseModels(assets)).toEqual([sha])
    await preloadCourseModels(assets)
    expect(pendingCourseModels(assets)).toEqual([])
    const manifest = asset3DManifest(assets)
    expect(manifest.modelo?.dataUrl).toBe(real)
    // Sem módulo nesta versão do Estúdio: fica o GLB mínimo (o jogo roda sem a peça).
    expect(manifest.outro?.dataUrl).toBe(desconhecido.dataUrl)
    // O projeto continua guardando só a referência.
    expect(assets[0]!.dataUrl).not.toBe(real)
    const resolvidos = await resolveCourseModels(assets)
    expect(resolvidos[0]!.dataUrl).toBe(real)
    expect(resolvidos[1]).toBe(desconhecido)
  })

  test('com o código, só os modelos que ele cita são carregados', async () => {
    clearCourseModelCacheForTests()
    const [a, b] = FILES.map((f) => f.slice(2, 66)) as [string, string]
    const assets = [reference(a, [], 'pirata'), reference(b, [], 'robo')]
    const code = 'const p=SZGame3D.createModelFile(cena,"pirata",1.66);'
    expect(pendingCourseModels(assets, code)).toEqual([a])
    expect(pendingCourseModels(assets, "createModelFile(cena,'robo',1)")).toEqual([b])
    expect(pendingCourseModels(assets)).toEqual([a, b])
    await preloadCourseModels(assets, code)
    expect(pendingCourseModels(assets)).toEqual([b])
    expect(asset3DManifest(assets).robo?.dataUrl).toBe(assets[1]!.dataUrl)
  })
})
