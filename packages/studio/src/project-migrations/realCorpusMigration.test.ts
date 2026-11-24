import { describe, expect, it } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { projetosDosCursos } from '../../../../docs/aulas-interativas-tecnico/qa/matriz-compatibilidade'
import { buildKitGroups, buildProjectFromKitEntry } from '../projects/KitGallery'
import { prepareEditableStudioProject } from '../state/editableProjectValidation'
import { readAllKeys, readValues, writeInOneTransaction } from '../state/idbTransaction'
import { loadProjectById } from '../state/persistence'
import { encodeProjectJsonGraph } from '../state/projectJsonGraph'
import { projectHeadKey, projectMetaKey } from '../state/projectStorageKeys'
import {
  assembleProjectRecord,
  projectStorageEntries,
  type StorableProjectDocument,
} from '../state/projectStorageRecords'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import { listLocalProjectBackups, readLocalProjectBackup } from './localBackups'

/**
 * Lote 1.2 (19/11/2026): até aqui toda prova de migração usava projetos sintéticos. Esta passa
 * o ACERVO REAL — os 185 exemplos da galeria e os projetos dos cursos protegidos — pela migração
 * v3→v4 e v2→v4 no caminho de abrir de verdade (`loadProjectById`, que prepara e migra), e
 * compara o documento aberto com o que o cliente v3 abriria, campo a campo e byte a byte.
 */

function database(): ProjectStorageScope {
  const identity = `corpus-${crypto.randomUUID()}`
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = new IDBFactory().open(identity, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('kv')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return {
    identity,
    namespace: '',
    store: async (mode, callback) =>
      callback((await opening).transaction('kv', mode).objectStore('kv')),
  }
}

const head = { version: 1 as const, token: 'corpus', writer: 'tab', base: null, sequence: 1 }

/** Os registros que o cliente v3 lê: as partições v3 montadas, sem o marcador de layout. */
function v3View(project: StorableProjectDocument) {
  const parts = new Map(projectStorageEntries(project, 3))
  const part = (name: string) => parts.get(`sz:v3:project-${name}:${project.id}`)
  return assembleProjectRecord(
    project.id,
    part('meta'),
    part('files'),
    part('state'),
    part('assets'),
    part('blocks'),
  )
}

/** Volatile local stamps are not content; everything else must match exactly. */
function comparable(record: unknown) {
  const copy = { ...(record as Record<string, unknown>) }
  delete copy.storageVersion
  return encodeProjectJsonGraph(copy)
}

const kitProjects: StorableProjectDocument[] = await Promise.all(
  (await buildKitGroups())
    .flatMap((group) => group.entries)
    .map(async (entry) => {
      const loaded = entry.ir ? entry : { ...entry, ...(await entry.load?.()) }
      return buildProjectFromKitEntry(loaded)
    }),
)
const courseProjects: StorableProjectDocument[] = []
for (const [index, { curso, origem, projeto }] of projetosDosCursos().entries()) {
  const prepared = await prepareEditableStudioProject({
    ...(projeto as Record<string, unknown>),
    id: `curso-${index}`,
    name: `${curso} ${origem}`.slice(0, 180),
  })
  if (!prepared) throw new Error(`projeto do curso não abriu: ${curso} ${origem}`)
  courseProjects.push(prepared)
}
const corpus = [...kitProjects, ...courseProjects]

describe('acervo real pela migração v4', () => {
  it('o acervo tem os exemplos da galeria e os projetos dos cursos', () => {
    expect(kitProjects.length).toBeGreaterThanOrEqual(185)
    expect(courseProjects.length).toBeGreaterThanOrEqual(7)
    expect(new Set(corpus.map((project) => project.id)).size).toBe(corpus.length)
  })

  it('v3 → v4: cada projeto abre igual ao que o v3 abriria, e o backup devolve o original', async () => {
    const scope = database()
    await writeInOneTransaction(scope.store, {
      puts: corpus.flatMap((project) => [
        ...projectStorageEntries(project, 3),
        [projectHeadKey(project.id, 3), head] as [string, unknown],
      ]),
    })
    const failures: string[] = []
    for (const project of corpus) {
      const raw = v3View(project)
      // O v3 também passa o que lê pelo preparo antes de abrir: é isso que a criança via.
      const expected = comparable(await prepareEditableStudioProject(raw))
      const opened = await loadProjectById(project.id, scope)
      const actual = opened ? await prepareEditableStudioProject(opened) : null
      if (!actual || comparable(actual) !== expected) {
        failures.push(`${project.id} (${project.name}): aberto diferente`)
        continue
      }
      // O backup guarda os registros crus de antes: devolve o v3 byte a byte.
      const [backup] = await listLocalProjectBackups(project.id, scope)
      const restored = backup ? await readLocalProjectBackup(backup, scope) : null
      if (!restored || comparable(restored) !== comparable(raw))
        failures.push(`${project.id} (${project.name}): backup diferente`)
    }
    expect(failures).toEqual([])
    const keys = await readAllKeys(scope.store)
    const metas = await readValues(
      scope.store,
      corpus.map((project) => projectMetaKey(project.id, 4)),
    )
    expect(metas.every((meta) => (meta as { storageVersion?: number })?.storageVersion === 4)).toBe(
      true,
    )
    expect(
      keys.some((key) => /^sz:v3:project-(meta|files|state|blocks|assets):/.test(String(key))),
    ).toBe(false)
  }, 600_000)

  it('v2 plano → v4: o documento salvo inteiro abre igual', async () => {
    const scope = database()
    await writeInOneTransaction(scope.store, {
      puts: corpus.map((project) => [`sz:v2:project:${project.id}`, project] as [string, unknown]),
    })
    const failures: string[] = []
    for (const project of corpus) {
      const opened = await loadProjectById(project.id, scope)
      if (!opened) {
        failures.push(`${project.id} (${project.name}): não abriu`)
        continue
      }
      const expected = await prepareEditableStudioProject(project)
      const actual = await prepareEditableStudioProject(opened)
      if (!actual || comparable(actual) !== comparable(expected))
        failures.push(`${project.id} (${project.name}): aberto diferente`)
    }
    expect(failures).toEqual([])
  }, 600_000)
})
