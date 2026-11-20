import { isDocumentRecord } from '../core/projectDocument'
import { readAllKeys, readValues } from '../state/idbTransaction'
import { encodeProjectJsonGraph } from '../state/projectJsonGraph'
import { decodeProjectJsonGraph } from '../state/projectJsonGraphDecode'
import { nativeRecovery, synchronousRecovery } from '../state/projectRecoveryGuards'
import { projectFromRecovery, type RecoveryWrite } from '../state/projectStorageCoordinator'
import {
  PROJECT_STORAGE_VERSION,
  type ProjectStorageVersion,
  projectBackupKey,
  projectRecoveryKey,
} from '../state/projectStorageKeys'
import { assembleProjectRecord, type StoredProjectRecord } from '../state/projectStorageRecords'
import {
  captureProjectStorageScope,
  type ProjectStorageScope,
} from '../state/projectStorageRuntime'
import { decodeProjectStorageValue } from '../state/projectStorageTransport'
import { readSynchronousExitJournal } from '../state/synchronousExitJournalRead'
import { isV3ExitCopy, isV3RecoveryArchive } from './localV3RecoveryArchive'

/**
 * Segurança de reversão do armazenamento v4 (lote 1.1, 19/11/2026).
 *
 * Toda migração e todo arquivamento de recuperação deixam um backup imutável:
 * - v3 → v4: `sz:v4:project-backup:<id>:<sha>` `{version: 1, sourceVersion: 3, records}`;
 * - v1/v2 → v4: a mesma chave, `{version: 2, sourceKeys, records}` (objeto por chave);
 * - v1/v2 → v3 (bundles antigos): `sz:project-backup:<id>:<sha>` `{version: 1, sourceKeys, records[]}`;
 * - ancestral de recuperação: `...:recovery-<sha>` `{kind: 'recovery-source', encoded}`;
 * - cópia de saída v3 que a migração reaplicou: `...:v3-recovery-<sha>` `{sourceVersion: 3,
 *   writer, token, encoded}` (antes de 20/11/2026 ela ia na chave do ancestral, `recovery-<sha>`).
 *
 * Até aqui nenhum código lia esses registros. Este módulo os lê SEM alterar nada e devolve o
 * documento como estava, para virar uma CÓPIA NOVA pelo import (que cria outro id): restaurar
 * nunca sobrescreve o projeto atual nem o próprio backup.
 */

export type LocalProjectBackupKind = 'v3' | 'legacy-layout' | 'recovery-source' | 'v3-recovery'

export interface LocalProjectBackup {
  key: string
  projectId: string
  kind: LocalProjectBackupKind
  capturedAt?: number
}

const PARTS = ['meta', 'files', 'state', 'blocks', 'assets'] as const
type Part = (typeof PARTS)[number]

const LEGACY_BACKUP_PREFIX = 'sz:project-backup:'

function backupPrefixes(projectId: string): string[] {
  return [projectBackupKey(projectId, '', 4), `${LEGACY_BACKUP_PREFIX}${projectId}:`]
}

/** O id do registro decide; o prefixo sozinho não basta quando ids contêm dois-pontos. */
function describeBackup(key: string, projectId: string, value: unknown): LocalProjectBackup | null {
  if (!isDocumentRecord(value)) return null
  const capturedAt = typeof value.capturedAt === 'number' ? value.capturedAt : undefined
  if (value.kind === 'recovery-source')
    return value.projectId === projectId && typeof value.encoded === 'string'
      ? { key, projectId, kind: 'recovery-source' }
      : null
  // Reconhecido pelo formato, não pela chave: o mesmo arquivo pode estar na chave antiga.
  if (isV3RecoveryArchive(value))
    return value.projectId === projectId ? { key, projectId, kind: 'v3-recovery' } : null
  if (value.sourceId !== projectId) return null
  if (value.version === 1 && value.sourceVersion === 3 && isDocumentRecord(value.records))
    return { key, projectId, kind: 'v3', capturedAt }
  if ((value.version === 1 || value.version === 2) && Array.isArray(value.sourceKeys))
    return { key, projectId, kind: 'legacy-layout', capturedAt }
  return null
}

/** Lista os backups do projeto, do mais recente para o mais antigo (sem data por último). */
export async function listLocalProjectBackups(
  projectId: string,
  scope: ProjectStorageScope = captureProjectStorageScope(),
): Promise<LocalProjectBackup[]> {
  const prefixes = backupPrefixes(projectId)
  const keys = (await readAllKeys(scope.store)).filter(
    (key): key is string =>
      typeof key === 'string' && prefixes.some((prefix) => key.startsWith(prefix)),
  )
  if (!keys.length) return []
  const values = await readValues(scope.store, keys)
  const backups: LocalProjectBackup[] = []
  keys.forEach((key, index) => {
    const backup = describeBackup(key, projectId, values[index])
    if (backup) backups.push(backup)
  })
  return backups.sort((a, b) => (b.capturedAt ?? -1) - (a.capturedAt ?? -1))
}

function partOf(key: string, projectId: string): { part: Part | 'flat'; version: number } | null {
  for (const [version, prefix] of [
    [4, 'sz:v4:project-'],
    [3, 'sz:v3:project-'],
    [2, 'sz:v2:project-'],
    [1, 'sz:project-'],
  ] as const) {
    if (!key.startsWith(prefix)) continue
    const rest = key.slice(prefix.length)
    for (const part of PARTS) if (rest === `${part}:${projectId}`) return { part, version }
    return null
  }
  if (key === `sz:project:${projectId}` || key === `sz:v2:project:${projectId}`)
    return { part: 'flat', version: key.startsWith('sz:v2') ? 2 : 1 }
  return null
}

/**
 * Cada layout guardado (v4, v3, v2, v1) que monta um documento completo, do mais novo para o
 * mais antigo. Um documento plano (v1) só vale quando aquele layout não tem partições.
 */
function projectLayoutsFromStorageRecords(
  projectId: string,
  records: ReadonlyArray<readonly [string, unknown]>,
): Map<number, StoredProjectRecord> {
  const layouts = new Map<number, Partial<Record<Part | 'flat', unknown>>>()
  for (const [key, raw] of records) {
    const located = partOf(key, projectId)
    if (!located || raw === undefined) continue
    const value = decodeProjectStorageValue(key, raw)
    const layout = layouts.get(located.version) ?? {}
    layout[located.part] = value
    layouts.set(located.version, layout)
  }
  const documents = new Map<number, StoredProjectRecord>()
  for (const version of [...layouts.keys()].sort((a, b) => b - a)) {
    const layout = layouts.get(version)!
    if (layout.meta || layout.files || layout.state) {
      const assembled = assembleProjectRecord(
        projectId,
        layout.meta,
        layout.files,
        layout.state,
        layout.assets,
        layout.blocks,
      )
      if (assembled) documents.set(version, assembled)
      continue
    }
    if (isDocumentRecord(layout.flat) && layout.flat.id === projectId)
      documents.set(version, { ...layout.flat, id: projectId })
  }
  return documents
}

/** Monta o documento a partir de registros por chave: o layout mais novo que esteja completo. */
export function projectFromStorageRecords(
  projectId: string,
  records: ReadonlyArray<readonly [string, unknown]>,
): StoredProjectRecord | null {
  return projectLayoutsFromStorageRecords(projectId, records).values().next().value ?? null
}

function recordsOfBackup(value: Record<string, unknown>): Array<readonly [string, unknown]> {
  if (value.kind === 'recovery-source' || isV3RecoveryArchive(value)) {
    const decoded = decodeProjectJsonGraph(value.encoded as string) as {
      write?: { puts?: unknown }
    }
    const puts = decoded?.write?.puts
    return Array.isArray(puts)
      ? puts.filter(
          (entry): entry is [string, unknown] =>
            Array.isArray(entry) && typeof entry[0] === 'string',
        )
      : []
  }
  if (Array.isArray(value.sourceKeys) && Array.isArray(value.records)) {
    const records = value.records as unknown[]
    return (value.sourceKeys as unknown[]).flatMap((key, index) =>
      typeof key === 'string' ? [[key, records[index]] as const] : [],
    )
  }
  return isDocumentRecord(value.records) ? Object.entries(value.records) : []
}

/** Lê o documento guardado num backup, sem gravar nada. `null` se o backup não o reconstrói. */
export async function readLocalProjectBackup(
  backup: LocalProjectBackup,
  scope: ProjectStorageScope = captureProjectStorageScope(),
): Promise<StoredProjectRecord | null> {
  const [value] = await readValues(scope.store, [backup.key])
  if (!describeBackup(backup.key, backup.projectId, value)) return null
  return projectFromStorageRecords(
    backup.projectId,
    recordsOfBackup(value as Record<string, unknown>),
  )
}

export const RESTORED_COPY_SUFFIX = ' (cópia restaurada)'

/**
 * Restaura o backup como projeto NOVO, pelo mesmo caminho do import (id novo, saneamento do
 * load). O projeto atual e o backup continuam intactos.
 */
export async function restoreLocalProjectBackup(
  backup: LocalProjectBackup,
  opts: {
    namespace?: string
    scope?: ProjectStorageScope
    /** Injetável nos testes; o padrão é o import do Estúdio (id novo, saneamento do load). */
    importSnapshot?: (
      raw: unknown,
      opts: { name: string; namespace: string },
    ) => Promise<{ project: { id: string; name: string }; warnings: string[] }>
  } = {},
): Promise<{ id: string; name: string; warnings: string[] }> {
  const scope = opts.scope ?? captureProjectStorageScope()
  const document = await readLocalProjectBackup(backup, scope)
  if (!document) throw new Error('Este backup não guarda um projeto completo.')
  const baseName = typeof document.name === 'string' && document.name ? document.name : 'Projeto'
  const importSnapshot =
    opts.importSnapshot ?? (await import('../projects/importSnapshot')).importProjectSnapshot
  const { project, warnings } = await importSnapshot(document, {
    name: `${baseName.slice(0, 175)}${RESTORED_COPY_SUFFIX}`,
    namespace: opts.namespace ?? scope.namespace,
  })
  return { id: project.id, name: project.name, warnings }
}

/**
 * Tudo o que este navegador guarda sobre o projeto, para um adulto mandar ao suporte quando o
 * card diz "Preservado". Codificado pelo grafo do Core (preserva `undefined`, -0 e árvores
 * profundas). Só lê.
 */
export async function exportPreservedProjectRecords(
  projectId: string,
  scope: ProjectStorageScope = captureProjectStorageScope(),
): Promise<string> {
  const keys = (await readAllKeys(scope.store)).filter(
    (key): key is string =>
      typeof key === 'string' &&
      key.startsWith('sz:') &&
      (key.endsWith(`:${projectId}`) || key.includes(`:${projectId}:`)),
  )
  const values = await readValues(scope.store, keys)
  const indexed = keys.map((key, index) => [key, values[index]] as const)
  const journal: Array<readonly [string, string]> = []
  const storage = scope.exitJournalStorage
  if (storage) {
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index)
      if (!key?.startsWith('sz:studio-exit:') || !key.includes(`|${projectId}|`)) continue
      const value = storage.getItem(key)
      if (value !== null) journal.push([key, value])
    }
  }
  return JSON.stringify({
    format: 'sz-preserved-project',
    version: 1,
    projectId,
    namespace: scope.namespace,
    exportedAt: new Date().toISOString(),
    indexedDb: encodeProjectJsonGraph(indexed),
    exitJournal: journal,
  })
}

/**
 * O que está guardado AGORA para o projeto, em qualquer layout (v1, v2, v3 ou v4). É o caso do
 * card "Preservado": a migração parou antes de promover, então não há backup, mas as partições
 * originais continuam no lugar.
 */
export async function readPreservedProjectRecords(
  projectId: string,
  scope: ProjectStorageScope = captureProjectStorageScope(),
): Promise<StoredProjectRecord | null> {
  const keys = (await readAllKeys(scope.store)).filter(
    (key): key is string => typeof key === 'string' && partOf(key, projectId) !== null,
  )
  if (!keys.length) return null
  const values = await readValues(scope.store, keys)
  return projectFromStorageRecords(
    projectId,
    keys.map((key, index) => [key, values[index]] as const),
  )
}

/** A cópia preservada como documento; fora do contrato ou sem os blocos, ela não entra. */
function preservedDraft(
  projectId: string,
  version: ProjectStorageVersion,
  read: () => RecoveryWrite,
): StoredProjectRecord | null {
  let recovery: RecoveryWrite
  try {
    recovery = read()
  } catch (error) {
    // Ela continua guardada e vai inteira no "Baixar o que foi preservado".
    console.warn('[studio] cópia preservada fora do contrato; não entra na restauração', error)
    return null
  }
  // Sem os blocos atuais (`incompleteBlocks`), a cópia sairia com blocos velhos ou sem nenhum.
  if (recovery.projectId !== projectId || recovery.incompleteBlocks) return null
  return projectFromRecovery(recovery, version)
}

/** As cópias de saída que ficaram no journal síncrono (localStorage) deste perfil. */
function exitJournalDrafts(projectId: string, scope: ProjectStorageScope): StoredProjectRecord[] {
  let entries: ReturnType<typeof readSynchronousExitJournal>
  try {
    entries = readSynchronousExitJournal(scope.exitJournalStorage, scope.identity, projectId)
  } catch (error) {
    // As entradas continuam no journal e vão no "Baixar o que foi preservado".
    console.warn('[studio] journal de saída ilegível; não entra na restauração', error)
    return []
  }
  return entries.flatMap((entry) => {
    const version = isV3ExitCopy(entry.value) ? 3 : 4
    const draft = preservedDraft(projectId, version, () => synchronousRecovery(entry, version))
    return draft ? [draft] : []
  })
}

type RestoreSource = 'edit' | 'records' | 'backup'
interface RestoreCandidate {
  document: StoredProjectRecord
  source: RestoreSource
}

/**
 * O que este navegador guarda do projeto, separado no que está PRESERVADO (o que ainda não virou
 * documento: cópias de saída v4 e v3, no banco e no journal, e as partições de um layout antigo
 * que não migraram) e no documento ATUAL (o layout desta versão). Só lê.
 */
async function readPreservedProjectSources(
  projectId: string,
  scope: ProjectStorageScope,
): Promise<{ preserved: RestoreCandidate[]; current: StoredProjectRecord | null }> {
  const keys = (await readAllKeys(scope.store)).filter(
    (key): key is string => typeof key === 'string',
  )
  const drafts = keys.flatMap((key) => {
    const version = ([4, 3] as const).find((candidate) =>
      key.startsWith(projectRecoveryKey(projectId, '', candidate)),
    )
    return version ? [[key, version] as const] : []
  })
  const parts = keys.filter((key) => partOf(key, projectId) !== null)
  const values = await readValues(scope.store, [...drafts.map(([key]) => key), ...parts])
  const preserved: RestoreCandidate[] = []
  drafts.forEach(([key, version], index) => {
    // Um id com dois-pontos não vaza: o contrato confere a chave contra o projeto e o escritor.
    const draft = preservedDraft(projectId, version, () =>
      nativeRecovery(values[index], key, version),
    )
    if (draft) preserved.push({ document: draft, source: 'edit' })
  })
  for (const draft of exitJournalDrafts(projectId, scope))
    preserved.push({ document: draft, source: 'edit' })
  const layouts = projectLayoutsFromStorageRecords(
    projectId,
    parts.map((key, index) => [key, values[drafts.length + index]] as const),
  )
  for (const [version, document] of layouts)
    if (version !== PROJECT_STORAGE_VERSION) preserved.push({ document, source: 'records' })
  return { preserved, current: layouts.get(PROJECT_STORAGE_VERSION) ?? null }
}

function editedAt({ document }: RestoreCandidate): number {
  return typeof document.updatedAt === 'number' && Number.isFinite(document.updatedAt)
    ? document.updatedAt
    : 0
}

/** A mais nova pelo `updatedAt`; no empate, a primeira da lista. */
function newest(candidates: readonly RestoreCandidate[]): RestoreCandidate | undefined {
  let best: RestoreCandidate | undefined
  for (const candidate of candidates)
    if (!best || editedAt(candidate) > editedAt(best)) best = candidate
  return best
}

/**
 * "Restaurar uma cópia" do card preservado. A ordem é a do que o card guarda:
 * 1. a edição PRESERVADA mais nova: cópia de saída v4 ou v3, no banco ou no journal (`'edit'`),
 *    ou as partições de um layout antigo que não migraram (`'records'`);
 * 2. sem nada preservado, o documento atual (`'records'`);
 * 3. só então o backup mais novo (o do dia da migração é o mais antigo de todos).
 * Até 20/11/2026 o backup vinha primeiro e a edição preservada era ignorada (P1 da revisão).
 * Sempre uma cópia NOVA pelo import; nada do que existe é apagado ou regravado.
 * Devolve `null` quando nada reconstrói o projeto.
 */
export async function restorePreservedProject(
  projectId: string,
  opts: Parameters<typeof restoreLocalProjectBackup>[1] = {},
): Promise<{ id: string; name: string; warnings: string[]; source: RestoreSource } | null> {
  const scope = opts.scope ?? captureProjectStorageScope()
  const stored = await readPreservedProjectSources(projectId, scope)
  let chosen =
    newest(stored.preserved) ??
    (stored.current ? { document: stored.current, source: 'records' as const } : undefined)
  if (!chosen) {
    const backups: RestoreCandidate[] = []
    for (const backup of await listLocalProjectBackups(projectId, scope)) {
      const restored = await readLocalProjectBackup(backup, scope)
      if (restored) backups.push({ document: restored, source: 'backup' })
    }
    chosen = newest(backups)
  }
  if (!chosen) return null
  const { document, source } = chosen
  const baseName = typeof document.name === 'string' && document.name ? document.name : 'Projeto'
  const importSnapshot =
    opts.importSnapshot ?? (await import('../projects/importSnapshot')).importProjectSnapshot
  const { project, warnings } = await importSnapshot(document, {
    name: `${baseName.slice(0, 175)}${RESTORED_COPY_SUFFIX}`,
    namespace: opts.namespace ?? scope.namespace,
  })
  return { id: project.id, name: project.name, warnings, source }
}
