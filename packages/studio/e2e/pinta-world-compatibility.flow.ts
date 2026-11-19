import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import type { PintaImageDerivation } from '@sistemazero/core/studio/pinta-image'
import type { EditableStudioProject } from '../src/core/editableProject'

type Proof = typeof import('../src/state/persistence') &
  typeof import('../src/state/editableProjectValidation') &
  typeof import('../src/state/projectStorageRevision') &
  typeof import('../src/state/fixtures/projectDocuments') &
  typeof import('../src/runtime/python/snapshot') &
  typeof import('../src/export/pythonSource')
type PintaProof = typeof import('../../pinta/src/state/persistence') &
  typeof import('../../pinta/src/export/studioLibrary') &
  typeof import('../../pinta/scripts/homologacao/fixture')
declare global {
  interface Window {
    worldProof: Proof
    worldRam: EditableStudioProject
    pintaWorldProof: PintaProof
  }
}
async function open(page: Page, version: string, namespace: string) {
  await page.goto(`/${version}.html`)
  await page.waitForFunction(() => !!window.worldProof)
  await page.evaluate((ns) => window.worldProof.setStorageNamespace(ns), namespace)
}

test('o envio captura o PNG Python e a biblioteca canônica com todos os destinos no mesmo perfil', async ({
  page,
}) => {
  await open(page, 'current', `native-world-${Date.now()}`)
  const result = await page.evaluate(async () => {
    const api = window.pintaWorldProof
    const { map, cabana, assets } = api.vilaEFloresta()
    const namespace = 'native-pygame-world'
    const client = api.createPintaPersistence({ namespace })
    await client.persistAssets(assets)
    const recipe = {
      version: 2 as const,
      algorithm: 'pinta-image-1' as const,
      drawingId: map.id,
      selection: { kind: 'map-world' as const },
      scale: 1,
    }
    const limits = {
      dimension: 4096,
      imagePixels: 4194304,
      totalImagePixels: 16777216,
      imageBytes: 16777216,
      dataUrlChars: 800000,
    }
    const first = await api.exportImageAndSourceForStudio(recipe, limits, { namespace })
    if (!first.ok) throw new Error(JSON.stringify(first))
    const loaded = await client.loadAssetById(cabana.id)
    if (loaded?.kind !== 'tilemap') throw new Error('cabana ausente')
    await client.persistAsset({
      ...loaded,
      layers: loaded.layers.map((layer) => ({ ...layer, name: 'Lugar editado depois' })),
    })
    const second = await api.exportImageAndSourceForStudio(recipe, limits, { namespace })
    if (!second.ok) throw new Error(JSON.stringify(second))
    const inspected = await api.inspectImageForStudio(map.id, { namespace, selection: 'map-world' })
    return {
      mapIds: first.asset.maps?.map((map) => map.id),
      rootScene: first.asset.scene?.id,
      first: first.image.derivation,
      second: second.image.derivation,
      inspected,
      childLayerName: second.asset.maps?.find((map) => map.id === cabana.id)?.scene?.layers[0]
        ?.name,
    }
  })
  expect(result.mapIds).toContain('cabana')
  expect(result.rootScene).toBe('vila-e-floresta')
  expect(result.first.output.sha256).not.toBe(result.second.output.sha256)
  expect(result.first.provenance.sourceSha256).toBe(result.second.provenance.sourceSha256)
  expect(result.second.provenance).toEqual(result.inspected)
  expect(result.childLayerName).toBe('Lugar editado depois')
})
test('um leitor congelado recusa a receita nova; sua aba antiga não sobrescreve o mundo offline', async ({
  page,
  context,
}, testInfo) => {
  const namespace = `pygame-world-${Date.now()}`
  await open(page, 'current', namespace)
  const id = await page.evaluate(async () => {
    const api = window.worldProof
    const raw = api.documentFixture('python', 'classic')
    raw.assets = []
    raw.installedExtensions = [{ id: 'python-pygame', version: '1.0.0', installedAt: 1 }]
    const project = await api.prepareEditableStudioProject(raw)
    if (!project) throw new Error('fixture inválida')
    await api.persistProject(project)
    return project.id
  })
  const old = await context.newPage()
  await open(old, 'old', namespace)
  await old.evaluate(async (id) => {
    const api = window.worldProof
    const project = await api.prepareEditableStudioProject(await api.loadProjectById(id))
    if (!project) throw new Error('o leitor antigo não abriu o Python anterior')
    window.worldRam = project
  }, id)
  const expected = await page.evaluate(async (id) => {
    const api = window.worldProof
    const current = await api.prepareEditableStudioProject(await api.loadProjectById(id))
    if (!current) throw new Error('projeto ausente')
    const derivation = (await (
      await fetch('/fixtures/vila-mundo.derivation.json')
    ).json()) as PintaImageDerivation
    const bytes = await (await fetch('/fixtures/vila-mundo.png')).arrayBuffer()
    let binary = ''
    for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte)
    const asset = {
      id: 'vila',
      name: 'vila',
      kind: 'image' as const,
      source: 'library' as const,
      libOrigin: 'pinta' as const,
      libId: `personal:${derivation.recipe.drawingId}`,
      libRevision: 1,
      dataUrl: `data:image/png;base64,${btoa(binary)}`,
      width: derivation.output.width,
      height: derivation.output.height,
      pintaImage: derivation,
      proPath: 'vila.png',
    }
    const next = api.advanceLocalRevision(current, { ...current, assets: [asset] })
    const validated = await api.prepareEditableStudioProject(next)
    if (!validated) throw new Error('mundo recusado pelo leitor atual')
    await api.persistProject(validated)
    return { sha256: derivation.output.sha256, files: current.files }
  }, id)
  await context.setOffline(true)
  const conflict = await old.evaluate(async () => {
    const api = window.worldProof,
      previous = window.worldRam
    const next = api.advanceLocalRevision(previous, { ...previous, name: 'edição da aba antiga' })
    try {
      await api.persistProject(next)
      return 'saved'
    } catch (error) {
      return (error as Error).name
    }
  })
  expect(conflict).toBe('ProjectWriteConflict')
  const refused = await old.evaluate(async (id) => {
    try {
      await window.worldProof.prepareEditableStudioProject(
        await window.worldProof.loadProjectById(id),
      )
      return false
    } catch {
      return true
    }
  }, id)
  expect(refused).toBe(true)
  const read = await page.evaluate(async (id) => {
    const project = await window.worldProof.prepareEditableStudioProject(
      await window.worldProof.loadProjectById(id),
    )
    return {
      name: project?.name,
      sha256: project?.assets?.[0]?.pintaImage?.output.sha256,
      recipeVersion: project?.assets?.[0]?.pintaImage?.recipe.version,
      files: project?.files,
    }
  }, id)
  expect(read.name).toBe('Meu jogo')
  expect(read.sha256).toBe(expected.sha256)
  expect(read.recipeVersion).toBe(2)
  expect(read.files).toEqual(expected.files)
  const materialized = await page.evaluate(async (id) => {
    const api = window.worldProof
    const project = await api.prepareEditableStudioProject(await api.loadProjectById(id))
    if (project?.programmingLanguage !== 'python' || project.kind !== 'classic')
      throw new Error('projeto Python ausente')
    const snapshot = await api.preparePythonExecutionSnapshot(project)
    const source = await api.buildPythonSourceFiles(project)
    const asset = project.assets![0]!
    const path = asset.proPath!
    const runtime = snapshot.files.find((file) => file.path === path)!
    const exported = source.files[path]
    if (typeof exported === 'string' || !exported) throw new Error('PNG exportado ausente')
    return {
      sha256: runtime.sha256,
      runtime: Array.from(runtime.bytes),
      exported: Array.from(exported),
      module: source.files['pinta.py'],
      program: source.files['main.py'],
      files: project.files,
    }
  }, id)
  expect(materialized.sha256).toBe(expected.sha256)
  expect(materialized.exported).toEqual(materialized.runtime)
  expect(materialized.module).toContain('def abrir_destino(self, porta)')
  expect(materialized.program).toBe(materialized.files['main.py'])
  const output = testInfo.outputPath('source')
  for (const [path, content] of [
    ['pinta.py', materialized.module],
    ['assets/vila.png', new Uint8Array(materialized.exported)],
    ['main.py', materialized.program],
  ] as const) {
    if (typeof content !== 'string' && !(content instanceof Uint8Array))
      throw new Error('arquivo inválido')
    const target = resolve(output, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, content)
  }
})
