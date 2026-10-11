import { expect, test } from 'bun:test'
import { pintaContentFingerprint, studioContentFingerprint } from '@sistemazero/core/creations'
import { createAsset, type PintaAsset, pintaAssetToWire } from '@sistemazero/pinta/assets'
import type { Project } from '@sistemazero/studio'
import { createEmptyProject } from '@sistemazero/studio/project'
import {
  pintaDraftProducer,
  preparePintaLessonDraft,
  resolvePintaConflict,
} from '../src/components/pinta/lesson-pinta-draft'
import {
  prepareStudioLessonDraft,
  resolveStudioConflict,
  type StudioDraftDeps,
  studioDraftProducer,
} from '../src/components/studio/lesson-studio-draft'
import type {
  LessonDraftChannel,
  LessonDraftMark,
  LessonDraftRemote,
} from '../src/lib/lesson-draft-cloud'

test.each([
  'missing',
  'read-error',
] as const)('falha ao reler o disco não se passa por rascunho já sincronizado: %s', async (failure) => {
  const studio: StudioDraftDeps['studio'] = {
    loadProjectSnapshotForCloud: async () => {
      if (failure === 'read-error') throw new Error('storage unavailable')
      return null
    },
    loadProjectSummaryForCloud: async () => null,
    validateCloudProjectSnapshot: async () => ({
      project: createEmptyProject('local', 'Meu jogo'),
      warnings: [],
    }),
    replaceLocalProject: async () => {},
  }
  const store = {
    listAllAssets: async () => {
      if (failure === 'read-error') throw new Error('storage unavailable')
      return []
    },
    loadAssetById: async () => null,
    deleteAsset: async () => {},
    persistAsset: async () => {},
    persistAssets: async () => {},
  }
  await expect(
    studioDraftProducer({ studio, blockId: 'block', projectId: 'local' })(),
  ).rejects.toThrow()
  await expect(pintaDraftProducer({ store })()).rejects.toThrow()
})

for (const failure of ['download', 'storage'] as const) {
  for (const tool of ['studio', 'pinta'] as const) {
    test(`${tool}: ${failure} da outra versão não autoriza sobrescrever a conta`, async () => {
      const now = Date.now()
      const original = { revision: 1, updatedAt: now - 10_000 }
      let mark: LessonDraftMark = original
      let fail = true
      let backedUp = false
      const project = { ...createEmptyProject('local', 'Meu jogo'), updatedAt: now - 1000 }
      const drawing = {
        ...createAsset({ kind: 'pixel-background', name: 'ceu', width: 4, height: 4 }),
        updatedAt: now - 1000,
      }
      const channel: LessonDraftChannel = {
        supported: true,
        mark: () => mark,
        setMark: (_id, value) => {
          mark = value
        },
        peek: async () => ({
          revision: 2,
          syncedAt: now - 5000,
          fingerprint: `v1:${'b'.repeat(64)}`,
          serverNow: Date.now(),
          load: async () => {
            if (fail && failure === 'download') throw new Error('download failed')
            return tool === 'studio' ? project : pintaAssetToWire(drawing)
          },
        }),
        enqueue: () => {},
        flush: async () => {},
        confirm: async () => {},
        getState: () => ({ status: 'idle', message: null }),
        subscribe: () => () => {},
      }
      const saveBackup = async () => {
        if (fail && failure === 'storage') throw new Error('storage full')
        backedUp = true
      }
      const studio: StudioDraftDeps['studio'] = {
        loadProjectSnapshotForCloud: async () => project,
        loadProjectSummaryForCloud: async () => null,
        validateCloudProjectSnapshot: async () => ({ project, warnings: [] }),
        replaceLocalProject: saveBackup,
      }
      const persistence = (assets: PintaAsset[], persist: () => Promise<void>) => ({
        listAllAssets: async () => assets,
        loadAssetById: async () => assets[0] ?? null,
        deleteAsset: async () => {},
        persistAsset: persist,
        persistAssets: persist,
      })
      const prepare = () =>
        tool === 'studio'
          ? prepareStudioLessonDraft({
              studio,
              channel,
              blockId: 'block',
              projectId: project.id,
              backupId: 'other',
              submission: null,
              readSubmission: async () => null,
            })
          : preparePintaLessonDraft({
              channel,
              blockId: 'block',
              store: persistence([drawing], async () => {}),
              backup: persistence([], saveBackup),
              submission: null,
              readSubmission: async () => null,
            })
      const error = await prepare().then(
        () => null,
        (error) => error,
      )
      expect(error instanceof Error).toBe(true)
      expect(backedUp).toBe(false)
      expect(mark).toEqual(original)
      fail = false
      await prepare()
      expect(backedUp).toBe(true)
      expect(mark.revision).toBe(2)
    })
  }
}

// ── Conflito na subida (10/10/2026, full review): igual, comum e primeiro contato ──

function memoriaDoPinta(inicial: PintaAsset[] = []) {
  const assets = new Map(inicial.map((asset) => [asset.id, asset]))
  return {
    assets,
    store: {
      listAllAssets: async () => [...assets.values()],
      loadAssetById: async (id: string) => assets.get(id) ?? null,
      deleteAsset: async (id: string) => {
        assets.delete(id)
      },
      persistAsset: async (asset: PintaAsset) => {
        assets.set(asset.id, asset)
      },
      persistAssets: async (lista: PintaAsset[]) => {
        for (const asset of lista) assets.set(asset.id, asset)
      },
    },
  }
}

function memoriaDoEstudio(inicial: Project[]) {
  const projetos = new Map(inicial.map((project) => [project.id, project]))
  const studio: StudioDraftDeps['studio'] = {
    loadProjectSnapshotForCloud: async (id) => projetos.get(id) ?? null,
    loadProjectSummaryForCloud: async (id) => (projetos.has(id) ? ({ id } as never) : null),
    validateCloudProjectSnapshot: async (raw) => ({ project: raw as Project, warnings: [] }),
    replaceLocalProject: async (project) => {
      projetos.set(project.id, project as Project)
    },
  }
  return { projetos, studio }
}

const canalParado = {} as LessonDraftChannel

function remotoDe(documento: unknown, fingerprint: string | null): LessonDraftRemote {
  return {
    revision: 7,
    syncedAt: Date.now(),
    fingerprint,
    serverNow: Date.now(),
    load: async () => documento,
  }
}

test('pinta: conflito com o MESMO desenho só adota a revisão e não gasta a outra versão', async () => {
  const daqui = createAsset({ kind: 'pixel-background', name: 'a', width: 4, height: 4 })
  const daConta = { ...daqui, id: 'outro-id', name: 'b', updatedAt: daqui.updatedAt + 50 }
  const store = memoriaDoPinta([daqui])
  const backup = memoriaDoPinta()
  const wire = pintaAssetToWire(daConta)
  const desfecho = await resolvePintaConflict(
    { channel: canalParado, blockId: 'block', store: store.store, backup: backup.store },
    remotoDe(wire, await pintaContentFingerprint(wire)),
    true,
  )
  expect(desfecho).toEqual({ kept: false, opened: null, adoptedAt: daqui.updatedAt })
  expect(backup.assets.size).toBe(0)
})

test.each([
  false,
  true,
])('pinta: desenho diferente guarda o da conta; no primeiro contato ele vai para cima: %s', async (firstContact) => {
  const daqui = createAsset({ kind: 'pixel-background', name: 'modelo', width: 4, height: 4 })
  const daConta = createAsset({ kind: 'pixel-background', name: 'trabalho', width: 8, height: 8 })
  const store = memoriaDoPinta([daqui])
  const backup = memoriaDoPinta()
  const wire = pintaAssetToWire(daConta)
  const desfecho = await resolvePintaConflict(
    { channel: canalParado, blockId: 'block', store: store.store, backup: backup.store },
    remotoDe(wire, await pintaContentFingerprint(wire)),
    firstContact,
  )
  expect(desfecho.kept).toBe(true)
  const principal = [...store.assets.values()]
  const outra = [...backup.assets.values()]
  if (firstContact) {
    // A da conta abre; a daqui (talvez só o modelo inicial) fica como a "outra". Nada se perde.
    expect(principal.map((asset) => asset.name)).toEqual(['trabalho'])
    expect(outra.map((asset) => asset.name)).toEqual(['modelo'])
    expect(desfecho.opened).not.toBeNull()
    expect(desfecho.adoptedAt).toBe(principal[0]?.updatedAt ?? -1)
  } else {
    expect(principal.map((asset) => asset.name)).toEqual(['modelo'])
    expect(outra.map((asset) => asset.name)).toEqual(['trabalho'])
    expect(desfecho).toMatchObject({ opened: null, adoptedAt: null })
  }
})

test.each([
  false,
  true,
])('estúdio: projeto diferente guarda o da conta; no primeiro contato ele vai para cima: %s', async (firstContact) => {
  const daqui = createEmptyProject('local', 'Modelo')
  const base = createEmptyProject('block', 'Meu jogo')
  const daConta = { ...base, files: { ...base.files, 'script.js': 'console.log("meu jogo")' } }
  const { projetos, studio } = memoriaDoEstudio([daqui])
  const deps = {
    studio,
    channel: canalParado,
    blockId: 'block',
    projectId: 'local',
    backupId: 'outra',
  }
  const desfecho = await resolveStudioConflict(
    deps,
    remotoDe(daConta, await studioContentFingerprint(daConta)),
    firstContact,
  )
  expect(desfecho.kept).toBe(true)
  const principal = projetos.get('local')?.files['script.js']
  const outra = projetos.get('outra')?.files['script.js']
  if (firstContact) {
    expect(principal).toBe('console.log("meu jogo")')
    expect(outra).toBe(daqui.files['script.js'])
    expect(desfecho.opened?.id).toBe('local')
  } else {
    expect(principal).toBe(daqui.files['script.js'])
    expect(outra).toBe('console.log("meu jogo")')
    expect(desfecho.opened).toBeNull()
  }
})

test('estúdio: conflito com o MESMO projeto só adota a revisão', async () => {
  const daqui = createEmptyProject('local', 'Meu jogo')
  const { projetos, studio } = memoriaDoEstudio([daqui])
  const deps = {
    studio,
    channel: canalParado,
    blockId: 'block',
    projectId: 'local',
    backupId: 'outra',
  }
  const daConta = { ...daqui, id: 'block', name: 'Outro nome', updatedAt: daqui.updatedAt + 9 }
  const desfecho = await resolveStudioConflict(
    deps,
    remotoDe(daConta, await studioContentFingerprint(daConta)),
    true,
  )
  expect(desfecho).toEqual({ kept: false, opened: null, adoptedAt: daqui.updatedAt })
  expect(projetos.has('outra')).toBe(false)
})
