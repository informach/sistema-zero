import { expect, test } from 'bun:test'
import { pintaContentFingerprint, studioContentFingerprint } from '@sistemazero/core/creations'
import { createAsset, type PintaAsset, pintaAssetToWire } from '@sistemazero/pinta/assets'
import type { EditableStudioProject, Project } from '@sistemazero/studio'
import { createEmptyProject } from '@sistemazero/studio/project'
import { sanitizeCloudProjectSnapshot } from '@sistemazero/studio/project-validation'
import { prepareEditableCloudProject } from '../../studio/src/state/editableCloudProject'
import { documentFixture } from '../../studio/src/state/fixtures/projectDocuments'
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
import {
  LESSON_DRAFT_OUTDATED,
  type LessonDraftChannel,
  type LessonDraftMark,
  LessonDraftOutdatedError,
  type LessonDraftRemote,
} from '../src/lib/lesson-draft-cloud'
import { StudioLessonSeedCompatibilityError } from '../src/lib/studio-lesson-seed'

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
    studioDraftProducer({
      studio,
      blockId: 'block',
      projectId: 'local',
      initialProject: createEmptyProject('initial', 'Aula'),
    })(),
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
              initialProject: project,
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

test('offline context opens the existing draft without another network wait or cloud acknowledgement', async () => {
  const local = createEmptyProject('local', 'Meu jogo')
  const { studio, projetos } = memoriaDoEstudio([local])
  const neverRead = () => {
    throw new Error('Offline must not read remote state')
  }
  const deps = {
    studio,
    channel: { ...canalParado, peek: neverRead, setMark: neverRead, mark: neverRead },
    blockId: 'block',
    projectId: local.id,
    backupId: 'other',
    initialProject: local,
    offline: true,
    submission: { at: Date.now() + 1000, fingerprint: 'newer' },
    readSubmission: neverRead,
  }
  expect(await prepareStudioLessonDraft(deps)).toEqual({ upload: true, other: false })
  expect(projetos.get(local.id)).toBe(local)
  projetos.delete(local.id)
  await expect(prepareStudioLessonDraft(deps)).rejects.toThrow('não está mais neste aparelho')
})

test('first admission cannot interpret an unavailable account as absence of previous work', async () => {
  const local = createEmptyProject('local', 'Meu jogo')
  const { studio, projetos } = memoriaDoEstudio([local])
  let signal: AbortSignal | undefined
  const unavailable = new TypeError('Conta indisponível')
  const channel: LessonDraftChannel = {
    ...canalParado,
    peek: async (_block, options) => {
      signal = options?.signal
      throw unavailable
    },
  }
  await expect(
    prepareStudioLessonDraft({
      studio,
      channel,
      blockId: 'block',
      projectId: local.id,
      backupId: 'other',
      initialProject: local,
      requireRemoteCheck: true,
      submission: null,
      readSubmission: async () => null,
    }),
  ).rejects.toBe(unavailable)
  expect(signal).toBeInstanceOf(AbortSignal)
  expect(projetos.get(local.id)).toBe(local)
})

for (const action of [
  'prepare',
  'conflict-first',
  'conflict-later',
  'prepare-local-newer',
  'submission',
  'producer',
] as const) {
  test(`studio ${action}: incompatible cloud work never replaces the active draft or acknowledges its revision`, async () => {
    const initial = createEmptyProject('initial', 'Aula JavaScript')
    const local = { ...createEmptyProject('local', 'Meu jogo'), updatedAt: 1 }
    const python = { ...documentFixture('python', 'pro'), id: 'block', assets: [] }
    const remoteProject = action === 'prepare-local-newer' ? { ...local, id: 'block' } : python
    const backup = createEmptyProject('other', 'Outra versão já guardada')
    const projects = new Map<string, EditableStudioProject>([
      [local.id, local],
      [backup.id, backup],
    ])
    const studio: StudioDraftDeps['studio'] = {
      loadProjectSnapshotForCloud: async (id) => projects.get(id) ?? null,
      loadProjectSummaryForCloud: async () => null,
      validateCloudProjectSnapshot: prepareEditableCloudProject,
      replaceLocalProject: async (project) => {
        projects.set(project.id, project as EditableStudioProject)
      },
    }
    let acknowledged = false
    const remote = remotoDe(remoteProject, null)
    const channel = {
      ...canalParado,
      mark: () => null,
      peek: async () => (action === 'submission' ? null : remote),
      setMark: () => {
        acknowledged = true
      },
    }
    const deps = {
      studio,
      channel,
      blockId: 'block',
      projectId: local.id,
      backupId: 'other',
      initialProject: initial,
    }
    const producer = studioDraftProducer(deps)
    if (action === 'prepare-local-newer' || action === 'producer') {
      const changed = await prepareEditableCloudProject({
        ...python,
        id: local.id,
        updatedAt: Date.now() + 10000,
      })
      projects.set(local.id, changed.project)
    }
    const previous = projects.get(local.id)
    const run =
      action === 'producer'
        ? producer()
        : action === 'prepare' || action === 'prepare-local-newer' || action === 'submission'
          ? prepareStudioLessonDraft({
              ...deps,
              submission: action === 'submission' ? { at: Date.now(), fingerprint: 'new' } : null,
              readSubmission: async () =>
                action === 'submission'
                  ? (await prepareEditableCloudProject(python)).project
                  : null,
            })
          : resolveStudioConflict(deps, remote, action === 'conflict-first')
    await expect(run).rejects.toBeInstanceOf(StudioLessonSeedCompatibilityError)
    expect(projects.get(local.id)).toBe(previous)
    expect(projects.get(backup.id)).toBe(backup)
    expect(acknowledged).toBe(false)
  })
}

test('studio: identical content fingerprints do not authorize a different Pro template', async () => {
  const local = (
    await prepareEditableCloudProject({
      ...documentFixture('python', 'pro'),
      id: 'local',
      assets: [],
    })
  ).project
  if (local.programmingLanguage !== 'python' || local.kind !== 'pro') throw new Error('Pro fixture')
  const remoteProject = {
    ...local,
    id: 'block',
    proMeta: { ...local.proMeta, templateId: 'another-template' },
  }
  const fingerprint = await studioContentFingerprint(local)
  expect(await studioContentFingerprint(remoteProject)).toBe(fingerprint)
  let loaded = false
  let writes = 0
  const result = resolveStudioConflict(
    {
      studio: {
        loadProjectSnapshotForCloud: async () => local,
        loadProjectSummaryForCloud: async () => null,
        validateCloudProjectSnapshot: prepareEditableCloudProject,
        replaceLocalProject: async () => {
          writes++
        },
      },
      channel: canalParado,
      blockId: 'block',
      projectId: local.id,
      backupId: 'other',
      initialProject: local,
    },
    {
      ...remotoDe(remoteProject, fingerprint),
      load: async () => {
        loaded = true
        return remoteProject
      },
    },
    true,
  )
  await expect(result).rejects.toBeInstanceOf(StudioLessonSeedCompatibilityError)
  expect(loaded).toBe(true)
  expect(writes).toBe(0)
})

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
    initialProject: daqui,
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
    initialProject: daqui,
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

test('estúdio: a versão da conta feita por um Estúdio mais novo vira "página desatualizada", sem gravar nada', async () => {
  const daqui = createEmptyProject('local', 'Meu jogo')
  const { projetos, studio } = memoriaDoEstudio([daqui])
  const deps = {
    // O validador de verdade do Estúdio: é ele que recusa o formato que esta página não conhece.
    studio: { ...studio, validateCloudProjectSnapshot: sanitizeCloudProjectSnapshot },
    channel: canalParado,
    blockId: 'block',
    projectId: 'local',
    backupId: 'outra',
    initialProject: daqui,
  }
  const daConta = { ...createEmptyProject('block', 'Meu jogo'), formatVersion: 999 }
  const erro = await resolveStudioConflict(
    deps,
    remotoDe(daConta, `v1:${'f'.repeat(64)}`),
    false,
  ).catch((e: unknown) => e)
  expect(erro).toBeInstanceOf(LessonDraftOutdatedError)
  expect((erro as LessonDraftOutdatedError).code).toBe(LESSON_DRAFT_OUTDATED)
  expect(projetos.has('outra')).toBe(false)
  expect(projetos.get('local')).toBe(daqui)
})

test('estúdio: falha do disco ao guardar a outra versão continua sendo falha comum', async () => {
  const daqui = createEmptyProject('local', 'Meu jogo')
  const { studio } = memoriaDoEstudio([daqui])
  const deps = {
    studio: {
      ...studio,
      replaceLocalProject: async () => {
        throw new Error('disco cheio')
      },
    },
    channel: canalParado,
    blockId: 'block',
    projectId: 'local',
    backupId: 'outra',
    initialProject: daqui,
  }
  const daConta = createEmptyProject('block', 'Outro jogo')
  const erro = await resolveStudioConflict(
    deps,
    remotoDe(daConta, `v1:${'f'.repeat(64)}`),
    false,
  ).catch((e: unknown) => e)
  expect(erro).not.toBeInstanceOf(LessonDraftOutdatedError)
  expect((erro as Error).message).toBe('disco cheio')
})
