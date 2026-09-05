/**
 * O adaptador do ESTÚDIO: `attach` liga o espelho do pacote à fila (subida relê o
 * projeto inteiro, nome cortado no teto, marca só no commit; apagar grava lápide);
 * `pullMissing` desce com id conferido e SUBSTITUINDO, cria a cópia "(deste computador)"
 * só depois de a descida validar, e sobe o que só existe aqui.
 */
import { describe, expect, test } from 'bun:test'
import {
  type CloudCreationSummary,
  type CreationsCloud,
  canonicalJson,
  type RemovedListener,
  type SnapshotProducer,
  type StaleListener,
  sha256Hex,
  type UploadedListener,
} from '../src/lib/creations-cloud'
import { createMemorySyncedMarks } from '../src/lib/creations-sync'
import {
  buildStudioCloudSnapshot,
  createStudioCloudSync,
  isStudioPartsManifest,
  type StudioCloudModule,
  type StudioProjectLike,
} from '../src/lib/studio-cloud'

type Mirror = { onChanged(id: string): void; onDeleted(id: string): void } | null

/** Um `@sistemazero/studio` de mentira: projetos em memória + o espelho registrado. */
function fakeStudio(initial: StudioProjectLike[] = []) {
  const projects = new Map(initial.map((p) => [p.id, p]))
  let mirror: Mirror = null
  const restored: Array<{ id: string; expectedId?: string }> = []
  const imported: string[] = []
  const openIds = new Set<string>()
  const namespaces = {
    load: [] as Array<string | undefined>,
    assets: [] as Array<string | undefined>,
    listLight: [] as Array<string | undefined>,
    restore: [] as Array<string | undefined>,
    import: [] as Array<string | undefined>,
    list: [] as Array<string | undefined>,
  }
  const studio: StudioCloudModule = {
    setStudioCloudMirror: (m) => {
      mirror = m
    },
    loadProjectSnapshotForCloud: async (id, opts) => {
      namespaces.load.push(opts?.namespace)
      return projects.get(id) ?? null
    },
    loadProjectAssetsSnapshotForCloud: async (id, opts) => {
      namespaces.assets.push(opts?.namespace)
      return projects.get(id)?.assets ?? []
    },
    listProjectSummariesLightForCloud: async (opts) => {
      namespaces.listLight.push(opts?.namespace)
      return [...projects.values()].map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt }))
    },
    loadProjectSummaryForCloud: async (id) => {
      const p = projects.get(id)
      return p ? { id: p.id, name: p.name, updatedAt: p.updatedAt } : null
    },
    isProjectOpenAnywhere: (id) => openIds.has(id),
    validateCloudProjectSnapshot: (raw, opts) => {
      const project = raw as StudioProjectLike & { rejectMe?: boolean }
      if (!project || typeof project !== 'object') throw new Error('Snapshot inválido')
      if (opts?.expectedId && project.id !== opts.expectedId) {
        throw new Error('Snapshot inválido: o id do projeto não é o esperado.')
      }
      // Um snapshot que o saneamento ESTRITO recusaria (bloco desconhecido nesta versão).
      if (project.rejectMe) throw new Error('Snapshot recusado: bloco desconhecido.')
      return { project, warnings: [] }
    },
    restoreProjectFromCloud: async (raw, opts) => {
      namespaces.restore.push(opts?.namespace)
      const project = raw as StudioProjectLike
      if (opts?.expectedId && project.id !== opts.expectedId) {
        throw new Error('Snapshot inválido: o id do projeto não é o esperado.')
      }
      projects.set(project.id, project)
      restored.push({ id: project.id, expectedId: opts?.expectedId })
      return { project, warnings: [] }
    },
    importProjectSnapshot: async (raw, opts) => {
      namespaces.import.push(opts?.namespace)
      const source = raw as StudioProjectLike
      const project = { ...source, id: `${source.id}-copia`, name: opts?.name ?? source.name }
      projects.set(project.id, project)
      imported.push(project.name)
      // Como o pacote de verdade: imports provisórios ficam silenciosos até o commit.
      if (!opts?.silent) mirror?.onChanged(project.id)
      return { project, warnings: [] }
    },
    discardImportedProjectSnapshot: async (id) => {
      projects.delete(id)
    },
    createLocalPersistenceAdapter: (opts) => ({
      list: async () => {
        namespaces.list.push(opts?.namespace)
        return [...projects.values()].map((p) => ({
          id: p.id,
          name: p.name,
          updatedAt: p.updatedAt,
        }))
      },
    }),
  }
  return { studio, projects, restored, imported, namespaces, openIds, mirror: () => mirror }
}

function fakeCloud(
  remote: Map<string, { summary: CloudCreationSummary; json: string; parts?: Map<string, string> }>,
) {
  const uploads = new Map<
    string,
    { produce: SnapshotProducer; onUploaded?: UploadedListener; onStale?: StaleListener }
  >()
  const removed: Array<{
    itemId: string
    baseRevision: number
    onRemoved?: RemovedListener
    onStale?: StaleListener
  }> = []
  /** Partes baixadas (hash) por item — para provar o que NÃO desceu de novo. */
  const fetchedParts: string[] = []
  const cloud: CreationsCloud = {
    tool: 'studio',
    supported: true,
    list: async () => [...remote.values()].map((r) => r.summary),
    upload: async () => ({ revision: 1 }),
    download: async (itemId) => {
      const r = remote.get(itemId)
      return r
        ? {
            json: r.json,
            summary: r.summary,
            parts: [...(r.parts?.keys() ?? [])].map((hash) => ({ hash, bytes: 1 })),
            fetchPart: async (hash) => {
              const text = r.parts?.get(hash)
              if (text === undefined) throw new Error('sem a parte')
              fetchedParts.push(hash)
              return text
            },
          }
        : null
    },
    remove: async () => ({ revision: 1 }),
    enqueueUpload: (itemId, produce, onUploaded, onStale) => {
      uploads.set(itemId, { produce, onUploaded, onStale })
    },
    enqueueRemove: (itemId, baseRevision, onRemoved, onStale) => {
      removed.push({ itemId, baseRevision, onRemoved, onStale })
    },
    flush: async () => {},
    getState: () => ({ status: 'idle', pending: 0, lastSavedAt: null, lastError: null }),
    subscribe: () => () => {},
    dispose: () => {},
  }
  return { cloud, uploads, removed, fetchedParts }
}

/** Um projeto "na nuvem" em PARTES: manifesto + mapa hash → JSON canônico do asset. */
async function remotePartsOf(project: StudioProjectLike) {
  const built = await buildStudioCloudSnapshot(project)
  const parts = new Map<string, string>()
  for (const part of built.parts ?? []) parts.set(part.hash, await part.text())
  return { json: built.json, summary: summaryOf(project), parts }
}

const asset = (id: string, dataUrl: string) => ({ id, name: id, kind: 'image', dataUrl })

const summaryOf = (
  p: StudioProjectLike,
  over: Partial<CloudCreationSummary> = {},
): CloudCreationSummary => ({
  itemId: p.id,
  name: p.name,
  kind: 'classic',
  itemUpdatedAt: p.updatedAt,
  revision: 1,
  bytes: 10,
  thumb: null,
  syncedAt: p.updatedAt,
  ...over,
})
const remoteOf = (projects: StudioProjectLike[]) =>
  new Map(projects.map((p) => [p.id, { json: JSON.stringify(p), summary: summaryOf(p) }]))

describe('createStudioCloudSync — attach', () => {
  test('toda gravação local enfileira o projeto INTEIRO relido do disco, com o nome cortado em 120; a marca só avança no commit', async () => {
    const longName = 'N'.repeat(200)
    const fake = fakeStudio([{ id: 'p1', name: longName, kind: 'pro', updatedAt: 1000 }])
    const { cloud, uploads } = fakeCloud(new Map())
    const marks = createMemorySyncedMarks()
    const sync = createStudioCloudSync({ studio: fake.studio, cloud, viewerId: 'v1', marks })
    const detach = sync.attach()
    expect(fake.mirror()).not.toBeNull()
    fake.mirror()?.onChanged('p1')
    const job = uploads.get('p1')
    expect(job).toBeDefined()
    const snapshot = await job?.produce()
    expect(snapshot?.meta?.name?.length).toBe(120)
    expect(snapshot?.meta?.kind).toBe('pro')
    expect(snapshot?.meta?.updatedAt).toBe(1000)
    expect(JSON.parse(snapshot?.json ?? '{}').id).toBe('p1')
    expect(fake.namespaces.load).toEqual(['v1'])
    expect(marks.get('p1')).toBeUndefined()
    job?.onUploaded?.({ itemId: 'p1', updatedAt: 1000, revision: 1 })
    expect(marks.get('p1')).toBe(1000)
    // Projeto que sumiu antes de subir: nada sobe.
    fake.mirror()?.onChanged('nao-existe')
    expect(await uploads.get('nao-existe')?.produce()).toBeNull()
    detach()
    expect(fake.mirror()).toBeNull()
  })

  test('nada mudou desde a última sincronia confirmada (marca = updatedAt do disco): o produtor devolve null e nada sobe', async () => {
    const fake = fakeStudio([{ id: 'p1', name: 'Nave', updatedAt: 1000 }])
    const { cloud, uploads } = fakeCloud(new Map())
    const marks = createMemorySyncedMarks()
    marks.set('p1', 1000, 3)
    const sync = createStudioCloudSync({ studio: fake.studio, cloud, viewerId: 'v1', marks })
    sync.attach()
    fake.mirror()?.onChanged('p1')
    expect(await uploads.get('p1')?.produce()).toBeNull()
    // Uma edição nova (updatedAt diferente) volta a subir, com a base conhecida.
    fake.projects.set('p1', { id: 'p1', name: 'Nave', updatedAt: 1001 })
    const snapshot = await uploads.get('p1')?.produce()
    expect(snapshot?.meta?.updatedAt).toBe(1001)
    expect(snapshot?.meta?.baseRevision).toBe(3)
  })

  test('apagar grava lápide e enfileira a remoção; a confirmação marca como enviada', () => {
    const fake = fakeStudio([{ id: 'p1', name: 'Nave', updatedAt: 1000 }])
    const { cloud, removed } = fakeCloud(new Map())
    const marks = createMemorySyncedMarks()
    marks.set('p1', 1000)
    const sync = createStudioCloudSync({
      studio: fake.studio,
      cloud,
      viewerId: 'v1',
      marks,
      now: () => 77,
    })
    sync.attach()
    fake.mirror()?.onDeleted('p1')
    expect(marks.get('p1')).toBeUndefined()
    expect(marks.tombstone('p1')).toEqual({ at: 77, sent: false, revision: null })
    expect(removed.map((r) => r.itemId)).toEqual(['p1'])
    removed[0]?.onRemoved?.({ revision: 3 })
    expect(marks.tombstone('p1')).toEqual({ at: 77, sent: true, revision: 3 })
  })

  test('detach de uma fila antiga não remove o mirror instalado pela fila nova', () => {
    const fake = fakeStudio()
    const first = createStudioCloudSync({
      studio: fake.studio,
      cloud: fakeCloud(new Map()).cloud,
      viewerId: 'perfil-a',
      marks: createMemorySyncedMarks(),
    })
    const second = createStudioCloudSync({
      studio: fake.studio,
      cloud: fakeCloud(new Map()).cloud,
      viewerId: 'perfil-b',
      marks: createMemorySyncedMarks(),
    })

    const detachFirst = first.attach()
    const detachSecond = second.attach()
    const newestMirror = fake.mirror()
    detachFirst()
    expect(fake.mirror()).toBe(newestMirror)
    detachSecond()
    expect(fake.mirror()).toBeNull()
  })
})

describe('createStudioCloudSync — pullMissing', () => {
  test('desce o que só existe na nuvem (id conferido no restauro) e sobe o que só existe aqui', async () => {
    const soLocal = { id: 'local-1', name: 'Local', updatedAt: 500 }
    const soNuvem = { id: 'nuvem-1', name: 'Nuvem', updatedAt: 700 }
    const fake = fakeStudio([soLocal])
    const { cloud, uploads } = fakeCloud(remoteOf([soNuvem]))
    const marks = createMemorySyncedMarks()
    const sync = createStudioCloudSync({ studio: fake.studio, cloud, viewerId: 'v1', marks })
    sync.attach()
    await sync.pullMissing()
    expect(fake.restored).toEqual([{ id: 'nuvem-1', expectedId: 'nuvem-1' }])
    // A lista LEVE do perfil (sem capas), não a do adapter com capas.
    expect(fake.namespaces.listLight).toEqual(['v1'])
    expect(fake.namespaces.list).toEqual([])
    expect(fake.namespaces.restore).toEqual(['v1'])
    expect(fake.projects.has('nuvem-1')).toBe(true)
    expect(marks.get('nuvem-1')).toBe(700)
    expect(uploads.has('local-1')).toBe(true)
    expect(uploads.has('nuvem-1')).toBe(false)
  })

  test('JSON da nuvem com id diferente do item é recusado ANTES de gravar (nada restaurado)', async () => {
    const fake = fakeStudio()
    const wrong = { id: 'outro', name: 'X', updatedAt: 1 }
    const remote = new Map([
      ['nuvem-1', { json: JSON.stringify(wrong), summary: summaryOf({ ...wrong, id: 'nuvem-1' }) }],
    ])
    const { cloud } = fakeCloud(remote)
    const sync = createStudioCloudSync({
      studio: fake.studio,
      cloud,
      viewerId: 'v1',
      marks: createMemorySyncedMarks(),
    })
    await sync.pullMissing()
    expect(fake.restored).toEqual([])
    expect(fake.projects.size).toBe(0)
  })

  test('conflito real: a cópia "(deste computador)" nasce (e sobe) e a nuvem substitui; sem conflito, sem cópia', async () => {
    const local = { id: 'p1', name: 'Nave', updatedAt: 120 }
    const remoteProject = { id: 'p1', name: 'Nave', updatedAt: 200 }
    const fake = fakeStudio([local])
    const { cloud, uploads } = fakeCloud(remoteOf([remoteProject]))
    const marks = createMemorySyncedMarks()
    marks.set('p1', 80) // editou aqui depois da última sincronia
    const sync = createStudioCloudSync({ studio: fake.studio, cloud, viewerId: 'v1', marks })
    sync.attach()
    await sync.pullMissing()
    expect(fake.imported).toEqual(['Nave (deste computador)'])
    expect(fake.projects.get('p1')?.updatedAt).toBe(200)
    expect(uploads.has('p1-copia')).toBe(true)

    // Ida e volta sem conflito: a marca avançou com o commit → só baixa.
    const fake2 = fakeStudio([{ id: 'p2', name: 'Jogo', updatedAt: 120 }])
    const { cloud: cloud2 } = fakeCloud(remoteOf([{ id: 'p2', name: 'Jogo', updatedAt: 150 }]))
    const marks2 = createMemorySyncedMarks()
    marks2.set('p2', 120)
    const sync2 = createStudioCloudSync({
      studio: fake2.studio,
      cloud: cloud2,
      viewerId: 'v1',
      marks: marks2,
    })
    await sync2.pullMissing()
    expect(fake2.imported).toEqual([])
    expect(fake2.projects.get('p2')?.updatedAt).toBe(150)
  })

  test('descida RECUSADA pela validação (bloco desconhecido nesta versão) em conflito real: nem cópia órfã, nem restauro — o local fica intacto', async () => {
    const local = { id: 'p1', name: 'Nave', updatedAt: 120 }
    const remoteProject = { id: 'p1', name: 'Nave', updatedAt: 200, rejectMe: true }
    const fake = fakeStudio([local])
    const { cloud, uploads } = fakeCloud(
      new Map([
        [
          'p1',
          { json: JSON.stringify(remoteProject), summary: summaryOf({ ...local, updatedAt: 200 }) },
        ],
      ]),
    )
    const marks = createMemorySyncedMarks()
    marks.set('p1', 80)
    const sync = createStudioCloudSync({ studio: fake.studio, cloud, viewerId: 'v1', marks })
    sync.attach()
    await sync.pullMissing()
    await sync.pullMissing()
    // Duas cargas: zero cópias "(deste computador)", nada restaurado, marca parada.
    expect(fake.imported).toEqual([])
    expect(fake.restored).toEqual([])
    expect(fake.projects.get('p1')?.updatedAt).toBe(120)
    expect(uploads.has('p1-copia')).toBe(false)
    expect(marks.get('p1')).toBe(80)
  })

  test('base vencida no upload (`onStale`): a versão da nuvem vira "(de outro aparelho)" (id novo, sobe), a marca conhece a revisão dela e o jogo daqui sobe de novo', async () => {
    const local = { id: 'p1', name: 'Nave', updatedAt: 500 }
    const remoteProject = { id: 'p1', name: 'Nave', updatedAt: 300 }
    const fake = fakeStudio([local])
    const remote = new Map([
      [
        'p1',
        {
          json: JSON.stringify(remoteProject),
          summary: summaryOf(remoteProject, { revision: 4 }),
        },
      ],
    ])
    const { cloud, uploads } = fakeCloud(remote)
    const marks = createMemorySyncedMarks()
    const sync = createStudioCloudSync({ studio: fake.studio, cloud, viewerId: 'v1', marks })
    sync.attach()
    fake.mirror()?.onChanged('p1')
    const job = uploads.get('p1')
    expect((await job?.produce())?.meta?.baseRevision).toBe(0)
    await job?.onStale?.({ itemId: 'p1' })
    expect(fake.imported).toEqual(['Nave (de outro aparelho)'])
    expect(uploads.has('p1-copia')).toBe(true)
    // O jogo daqui continua com o id dele e sobe com a base certa (a revisão da nuvem).
    expect(fake.projects.get('p1')?.updatedAt).toBe(500)
    expect(marks.revision('p1')).toBe(4)
    expect((await uploads.get('p1')?.produce())?.meta?.baseRevision).toBe(4)
  })

  test('nuvem fora do ar / índice indisponível: não lança e não mexe no local', async () => {
    const fake = fakeStudio([{ id: 'p1', name: 'Nave', updatedAt: 1 }])
    const { cloud } = fakeCloud(new Map())
    cloud.list = async () => {
      throw new TypeError('Failed to fetch')
    }
    const sync = createStudioCloudSync({
      studio: fake.studio,
      cloud,
      viewerId: 'v1',
      marks: createMemorySyncedMarks(),
    })
    await expect(sync.pullMissing()).resolves.toBeUndefined()
    expect(fake.restored).toEqual([])
  })

  test('cancelPull encerra uma descida pendurada sem restaurar no perfil antigo', async () => {
    const remoteProject = { id: 'nuvem-1', name: 'Nuvem', updatedAt: 700 }
    const fake = fakeStudio()
    const { cloud } = fakeCloud(remoteOf([remoteProject]))
    cloud.download = async () => new Promise(() => {})
    const sync = createStudioCloudSync({
      studio: fake.studio,
      cloud,
      viewerId: 'perfil-antigo',
      marks: createMemorySyncedMarks(),
    })

    const pull = sync.pullMissing()
    await Bun.sleep(0)
    sync.cancelPull()

    await expect(
      Promise.race([pull.then(() => 'settled'), Bun.sleep(100).then(() => 'timeout')]),
    ).resolves.toBe('settled')
    expect(fake.restored).toEqual([])
  })
})

describe('createStudioCloudSync — partes (assets separados do programa)', () => {
  test('projeto COM assets sobe como MANIFESTO + uma parte por asset (hash = SHA-256 do JSON canônico, na ordem); sem assets sobe o Project inteiro', async () => {
    const project: StudioProjectLike = {
      id: 'p1',
      name: 'Nave',
      updatedAt: 10,
      assets: [
        asset('nave', 'data:image/png;base64,AAAA'),
        asset('tiro', 'data:image/png;base64,BBBB'),
      ],
    }
    const fake = fakeStudio([project])
    const { cloud, uploads } = fakeCloud(new Map())
    const sync = createStudioCloudSync({
      studio: fake.studio,
      cloud,
      viewerId: 'v1',
      marks: createMemorySyncedMarks(),
    })
    sync.attach()
    fake.mirror()?.onChanged('p1')
    const snapshot = await uploads.get('p1')?.produce()
    const manifest = JSON.parse(snapshot?.json ?? '{}') as unknown
    expect(isStudioPartsManifest(manifest)).toBe(true)
    if (!isStudioPartsManifest(manifest)) throw new Error('sem manifesto')
    expect(manifest.program).toMatchObject({ id: 'p1', name: 'Nave', updatedAt: 10, assets: [] })
    const expected = await Promise.all(
      (project.assets ?? []).map((a) => sha256Hex(canonicalJson(a))),
    )
    expect(manifest.assets).toEqual(expected)
    expect(snapshot?.parts?.map((p) => p.hash)).toEqual(expected)
    // `text()` é o JSON canônico do asset (o que se hasheou).
    expect(await snapshot?.parts?.[0]?.text()).toBe(canonicalJson(project.assets?.[0]))
    // O manifesto NÃO carrega os dataUrls (é só o programa).
    expect(snapshot?.json.includes('AAAA')).toBe(false)
    expect(snapshot?.meta?.name).toBe('Nave')

    // Sem assets: fio simples (o `Project` inteiro, sem `parts`).
    const plain = await buildStudioCloudSnapshot({ id: 'p2', name: 'Só blocos', updatedAt: 1 })
    expect(plain.parts).toBeUndefined()
    expect(JSON.parse(plain.json)).toEqual({ id: 'p2', name: 'Só blocos', updatedAt: 1 })
    expect(isStudioPartsManifest(JSON.parse(plain.json))).toBe(false)
  })

  test('descida de um manifesto: monta o Project com as partes, baixando SÓ as que este aparelho não tem (mesmo hash reaproveita o local); blob antigo passa direto', async () => {
    const shared = asset('nave', 'data:image/png;base64,AAAA')
    const onlyCloud = asset('chefe', 'data:image/png;base64,CCCC')
    const localProject: StudioProjectLike = {
      id: 'p1',
      name: 'Nave',
      updatedAt: 10,
      assets: [shared, asset('velho', 'data:image/png;base64,VVVV')],
    }
    const cloudProject: StudioProjectLike = {
      id: 'p1',
      name: 'Nave v2',
      updatedAt: 20,
      // A ordem do manifesto manda (e hash repetido é permitido).
      assets: [onlyCloud, shared, onlyCloud],
    }
    const legacy: StudioProjectLike = { id: 'leg', name: 'Antigo', updatedAt: 5 }
    const fake = fakeStudio([localProject])
    const remote = new Map<
      string,
      { summary: CloudCreationSummary; json: string; parts?: Map<string, string> }
    >([
      ['p1', await remotePartsOf(cloudProject)],
      ['leg', { json: JSON.stringify(legacy), summary: summaryOf(legacy) }],
    ])
    const { cloud, fetchedParts } = fakeCloud(remote)
    const marks = createMemorySyncedMarks()
    // Este aparelho conhece a revisão 1 de p1 com updatedAt 10; a nuvem está na 2 (mais nova).
    marks.set('p1', 10, 1)
    const p1 = remote.get('p1')
    if (p1) p1.summary.revision = 2
    const sync = createStudioCloudSync({ studio: fake.studio, cloud, viewerId: 'v1', marks })
    sync.attach()
    await sync.pullMissing()
    const restored = fake.projects.get('p1') as StudioProjectLike
    expect(restored.name).toBe('Nave v2')
    expect(restored.assets).toEqual([onlyCloud, shared, onlyCloud])
    // Só a parte que faltava desceu (uma vez, mesmo citada duas vezes no manifesto).
    expect(fetchedParts).toEqual([await sha256Hex(canonicalJson(onlyCloud))])
    expect(fake.namespaces.assets).toEqual(['v1'])
    // O blob antigo (Project inteiro) restaurou igual.
    expect(fake.projects.get('leg')).toEqual(legacy)
    // `downloadProject` devolve o Project já resolvido (para o host).
    const direct = await sync.downloadProject('p1')
    expect((direct?.raw as StudioProjectLike).assets).toEqual([onlyCloud, shared, onlyCloud])
    expect(direct?.summary.revision).toBe(2)
    expect(await sync.downloadProject('nao-existe')).toBeNull()
  })

  test('manifesto cuja parte não está na revisão (ou não desce) é RECUSADO: nada é gravado', async () => {
    const cloudProject: StudioProjectLike = {
      id: 'p1',
      name: 'Quebrado',
      updatedAt: 20,
      assets: [asset('sumida', 'data:image/png;base64,SSSS')],
    }
    const entry = await remotePartsOf(cloudProject)
    entry.parts.clear() // o R2 não tem a parte
    const fake = fakeStudio()
    const { cloud } = fakeCloud(new Map([['p1', entry]]))
    const sync = createStudioCloudSync({
      studio: fake.studio,
      cloud,
      viewerId: 'v1',
      marks: createMemorySyncedMarks(),
    })
    sync.attach()
    await sync.pullMissing()
    expect(fake.restored).toEqual([])
    expect(fake.projects.has('p1')).toBe(false)
  })
})

describe('createStudioCloudSync — projeto aberto, edição no meio, restauro avulso', () => {
  test('conflito real com o projeto ABERTO no editor: nem cópia "(deste computador)" nem restauro (pulado); ao fechar, a próxima descida resolve com cópia + restauro', async () => {
    const localP = { id: 'p1', name: 'Nave', updatedAt: 120 }
    const cloudP = { id: 'p1', name: 'Nave da nuvem', updatedAt: 200 }
    const fake = fakeStudio([localP])
    fake.openIds.add('p1')
    const { cloud } = fakeCloud(remoteOf([cloudP]))
    const marks = createMemorySyncedMarks()
    marks.set('p1', 80, 1) // os dois lados mudaram desde a marca: conflito real
    const sync = createStudioCloudSync({ studio: fake.studio, cloud, viewerId: 'v1', marks })
    sync.attach()
    await sync.pullMissing()
    expect(fake.imported).toEqual([])
    expect(fake.restored).toEqual([])
    expect(fake.projects.get('p1')?.name).toBe('Nave')
    // A lista LEVE foi a usada (não o adapter com capas).
    expect(fake.namespaces.listLight).toEqual(['v1'])
    // Fechou: a descida seguinte (de volta à lista) faz a cópia e restaura.
    fake.openIds.delete('p1')
    await sync.pullMissing()
    expect(fake.imported).toEqual(['Nave (deste computador)'])
    expect(fake.projects.get('p1')?.name).toBe('Nave da nuvem')
  })

  test('renomeado/editado no meio da descida (depois do retrato): o restauro NÃO passa por cima e a marca não avança', async () => {
    const localP = { id: 'p1', name: 'Nave', updatedAt: 120 }
    const cloudP = { id: 'p1', name: 'Nave da nuvem', updatedAt: 200 }
    const fake = fakeStudio([localP])
    const { cloud } = fakeCloud(remoteOf([cloudP]))
    const marks = createMemorySyncedMarks()
    marks.set('p1', 120, 1) // local intocado → desceria
    const slowDownload = cloud.download
    cloud.download = async (id, opts) => {
      // A criança renomeia enquanto a descida baixa.
      fake.projects.set('p1', { ...localP, name: 'Nave renomeada', updatedAt: 150 })
      return slowDownload(id, opts)
    }
    const sync = createStudioCloudSync({ studio: fake.studio, cloud, viewerId: 'v1', marks })
    sync.attach()
    await sync.pullMissing()
    expect(fake.projects.get('p1')?.name).toBe('Nave renomeada')
    expect(fake.restored).toEqual([])
    expect(marks.get('p1')).toBe(120)
  })

  test('`restoreProject(id)` baixa, restaura e AVANÇA a marca (a primeira edição não vira cópia "(de outro aparelho)")', async () => {
    const cloudP = { id: 'pensa-1', name: 'Missão', updatedAt: 300 }
    const fake = fakeStudio()
    const { cloud } = fakeCloud(remoteOf([cloudP]))
    const marks = createMemorySyncedMarks()
    const sync = createStudioCloudSync({ studio: fake.studio, cloud, viewerId: 'v1', marks })
    expect(await sync.restoreProject('pensa-1')).toBe(true)
    expect(fake.projects.get('pensa-1')?.name).toBe('Missão')
    expect(marks.get('pensa-1')).toBe(300)
    expect(marks.revision('pensa-1')).toBe(1)
    expect(await sync.restoreProject('nao-existe')).toBe(false)
  })
})
