import { expect, test } from 'bun:test'
import { zipSync } from 'fflate'
import { sceneToJson } from '../scene/documentJson'
import { readSceneDocument } from '../scene/readDocument'
import { createGallerySceneSource } from '../state/gallerySceneSource'
import { createGalleryStore } from '../state/galleryStore'
import { createMemoryPersistence } from '../state/memoryPersistence'
import { createScenePersistence } from '../state/scenePersistence'
import { makeTexture } from '../testing/fixtures'
import { nativeDatabase } from '../testing/nativeDatabase'
import { animatedScene } from '../testing/sceneAnimation'
import { readMoldaBackupFile, readMoldaBackupProjects } from './backupFile'
import { importMoldaJson } from './projectJson'
import { zipGalleryBlob } from './zip'

test('a complete mixed-generation ZIP restores editable projects as new copies, preserving originals, names, animation and pixels', async () => {
  const db = await nativeDatabase(),
    source = animatedScene(),
    before = structuredClone(source)
  const persistence = createScenePersistence(db.store),
    legacy = makeTexture()
  try {
    await persistence.save(source, null)
    const generation = createGallerySceneSource(db.store)
    const memory = createMemoryPersistence([legacy])
    const gallery = createGalleryStore(memory, { scene: generation })
    await gallery.getState().load()
    const zip = await zipGalleryBlob([legacy], {
      scenes: [{ name: source.name, read: () => generation.readProject(source.id) }],
    })
    const file = new File([zip], 'galeria.zip', { type: 'application/zip' })
    const backup = await readMoldaBackupFile(file),
      projects = await readMoldaBackupProjects(file)
    expect(backup.ok && projects.ok).toBe(true)
    if (!backup.ok || !projects.ok) throw new Error('Backup unreadable')
    const parsed = importMoldaJson(backup.text)!
    expect(projects.projects).toHaveLength(1)
    expect(await gallery.getState().importAssets(parsed.assets)).toEqual({ imported: 1 })
    expect(
      await gallery
        .getState()
        .importProjects(projects.projects.map((json) => ({ name: source.name, json }))),
    ).toEqual({ imported: 1 })
    const all = gallery.getState().assets
    expect(all).toHaveLength(4)
    expect(new Set(all.map((item) => item.name)).size).toBe(4)
    const copy = all.find((item) => item.formatVersion === 2 && item.id !== source.id)!
    const restored = await persistence.read(copy.id),
      original = await persistence.read(source.id)
    expect(restored.status).toBe('active')
    if (restored.status !== 'active') throw new Error('Restored project missing')
    expect(restored.document.images).toEqual(source.images)
    expect(restored.document.animations).toEqual(source.animations)
    expect(restored.document.nodes).toEqual(source.nodes)
    expect(original.status === 'active' && original.document).toEqual(before)
    expect(source).toEqual(before)
  } finally {
    db.close()
  }
})

test('project preparation reads the next snapshot only after the previous one was compressed; cancellation stops more reads', async () => {
  const source = animatedScene(),
    controller = new AbortController()
  let compressed = 0,
    reads = 0
  await expect(
    zipGalleryBlob([], {
      signal: controller.signal,
      scenes: [0, 1, 2].map((index) => ({
        name: `projeto-${index}`,
        async read() {
          reads++
          if (index) {
            expect(compressed).toBeGreaterThan(0)
            controller.abort()
          }
          return JSON.stringify(sceneToJson(source))
        },
      })),
      onProgress: (progress) => {
        compressed = progress.compressedBytes
      },
    }),
  ).rejects.toThrow('cancelada')
  expect(reads).toBe(2)
})

test('project reader validates CRC before returning decodable but corrupted JSON and ignores nested resource files', async () => {
  const json = JSON.stringify(sceneToJson(animatedScene()))
  const bytes = zipSync(
    {
      'projetos/modelo.molda.json': new TextEncoder().encode(json),
      'modelos/grande.glb': new Uint8Array(100_000),
      'projetos/nested/ignored.molda.json': new TextEncoder().encode('{}'),
    },
    { level: 0 },
  )
  const file = new File([bytes.buffer], 'galeria.zip')
  const read = await readMoldaBackupProjects(file)
  expect(read.ok && read.projects).toEqual([json])
  if (read.ok) expect(readSceneDocument(JSON.parse(read.projects[0]!)).status).toBe('valid')
  const header = new DataView(bytes.buffer)
  const start = 30 + header.getUint16(26, true) + header.getUint16(28, true)
  // Replace a name character, leaving the JSON syntax and length valid.
  const position = json.indexOf('"name":"') + 8
  bytes[start + position] = 90
  expect(await readMoldaBackupProjects(new File([bytes.buffer], 'corrompido.zip'))).toEqual({
    ok: false,
    reason: 'invalid-zip',
  })
})
