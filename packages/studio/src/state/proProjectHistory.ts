import { studioProDigest } from '@sistemazero/core/studio'
import type { ProjectTree } from '../core/proProject'
import { readValue, readValues, writeInOneTransaction } from './idbTransaction'
import type { ProjectStorageScope } from './projectStorageRuntime'

/**
 * O Histórico do projeto do Pro (proposta aprovada em 21/11/2026): versões automáticas dos
 * arquivos, guardadas NESTE computador, para a criança ver o que mudou e voltar a uma versão. Não
 * é Git e não se apresenta como Git.
 *
 * - Uma versão é a árvore inteira (os arquivos de texto e as pastas) no momento em que o Estúdio
 *   a guardou: ao Rodar com mudanças (no máximo uma a cada 2 minutos), antes de aplicar uma
 *   mudança do Zappy, antes de uma operação com arquivos e antes de voltar a uma versão.
 * - Cada arquivo é guardado uma vez pela impressão do conteúdo (SHA-256): só o que mudou ocupa
 *   espaço. Ficam as últimas 50 versões ou até 20 MB por projeto, o que vier primeiro; as mais
 *   antigas saem primeiro, e os arquivos que nenhuma versão usa saem junto.
 * - Os materiais (imagens, sons, modelos) não entram: as operações com materiais seguem no
 *   registro de operações, com o "Recuperar" delas.
 *
 * Chaves FORA da família `sz:v4:project-` (que passa por um codec próprio) e apagadas junto com o
 * projeto (`proHistoryStorageKeys`, no `deleteProject`).
 */
export const PRO_HISTORY_MAX_VERSIONS = 50
export const PRO_HISTORY_MAX_BYTES = 20 * 1024 * 1024
export const PRO_HISTORY_RUN_INTERVAL_MS = 2 * 60 * 1000

export type ProHistoryTrigger = 'run' | 'zappy' | 'operation' | 'undo' | 'restore'

export interface ProHistoryVersion {
  id: string
  trigger: ProHistoryTrigger
  /** O nome da operação ("Arquivo renomeado") ou do que foi desfeito. */
  label?: string
  /** Ao voltar para uma versão: quando aquela versão foi guardada (a data é escrita só na tela). */
  restoredFrom?: number
  createdAt: number
  /** Caminho → impressão do conteúdo. */
  files: Record<string, string>
  directories: string[]
  /** Quantos arquivos mudaram desde a versão anterior (criados, alterados ou apagados). */
  changedFiles: number
  /** A primeira versão guardada do projeto (não há anterior com que contar). */
  first?: true
}

interface ProHistoryIndex {
  version: 1
  versions: ProHistoryVersion[]
  /** Impressão → tamanho em bytes (UTF-8) de cada arquivo guardado. */
  sizes: Record<string, number>
}

export const proHistoryIndexKey = (projectId: string) => `sz:v4:history-index:${projectId}`
export const proHistoryFileKey = (projectId: string, digest: string) =>
  `sz:v4:history-file:${projectId}:${digest}`

const DIGEST = /^[a-f0-9]{64}$/

const isVersion = (value: unknown): value is ProHistoryVersion => {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<ProHistoryVersion>
  return (
    typeof entry.id === 'string' &&
    typeof entry.createdAt === 'number' &&
    typeof entry.trigger === 'string' &&
    !!entry.files &&
    typeof entry.files === 'object' &&
    Object.values(entry.files).every(
      (digest) => typeof digest === 'string' && DIGEST.test(digest),
    ) &&
    Array.isArray(entry.directories) &&
    typeof entry.changedFiles === 'number'
  )
}

/**
 * O índice guardado. `known: false` = de um formato que este código não conhece (uma aba de outra
 * versão do Estúdio): ninguém grava por cima, para não perder as versões nem deixar arquivos sem
 * dono. Entradas corrompidas ficam de fora da leitura (revisão do lote 7).
 */
function readIndex(value: unknown): { index: ProHistoryIndex; known: boolean } {
  const empty: ProHistoryIndex = { version: 1, versions: [], sizes: {} }
  if (value === undefined || value === null) return { index: empty, known: true }
  if (typeof value !== 'object') return { index: empty, known: false }
  const raw = value as Partial<ProHistoryIndex>
  if (
    raw.version !== 1 ||
    !Array.isArray(raw.versions) ||
    !raw.sizes ||
    typeof raw.sizes !== 'object'
  )
    return { index: empty, known: false }
  const sizes = Object.fromEntries(
    Object.entries(raw.sizes).filter(
      ([digest, size]) => DIGEST.test(digest) && typeof size === 'number' && size >= 0,
    ),
  )
  return { index: { version: 1, versions: raw.versions.filter(isVersion), sizes }, known: true }
}

/** Uma gravação por projeto de cada vez: ler, decidir e gravar o índice não pode intercalar. */
const queues = new Map<string, Promise<unknown>>()
/** Projetos apagados nesta página: uma gravação que chegar depois não recria o histórico. */
const deleted = new Set<string>()
const queueKey = (scope: ProjectStorageScope, projectId: string) =>
  `${scope.identity}\u0000${projectId}`
function serialized<T>(scope: ProjectStorageScope, projectId: string, task: () => Promise<T>) {
  const key = queueKey(scope, projectId)
  const run = (queues.get(key) ?? Promise.resolve()).catch(() => undefined).then(task)
  queues.set(key, run)
  // Os dois caminhos limpam: um `finally` solto deixava a rejeição sem dono ("Uncaught (in
  // promise)") a cada falha ao gravar, mesmo com o chamador tratando (revisão do lote 7).
  const cleanup = () => {
    if (queues.get(key) === run) queues.delete(key)
  }
  run.then(cleanup, cleanup)
  return run
}

/**
 * Antes de apagar o projeto: nenhuma gravação nova do histórico começa, e a que está em voo
 * termina antes de as chaves serem lidas para o apagar. Sem isso, uma versão gravada logo antes de
 * sair do editor podia terminar depois e deixar arquivos sem dono (revisão do lote 7).
 */
export async function quiesceProHistory(scope: ProjectStorageScope, projectId: string) {
  const key = queueKey(scope, projectId)
  deleted.add(key)
  await queues.get(key)?.catch(() => undefined)
}

/** As versões do projeto, da mais nova para a mais antiga. */
export async function listProHistory(
  scope: ProjectStorageScope,
  projectId: string,
): Promise<ProHistoryVersion[]> {
  const { index } = readIndex(await readValue(scope.store, proHistoryIndexKey(projectId)))
  return [...index.versions].reverse()
}

const byteLength = (text: string) => new TextEncoder().encode(text).byteLength

/**
 * Guarda a árvore de agora como uma versão nova. Devolve `null` quando não havia o que guardar:
 * nada mudou desde a última versão, ou (ao Rodar) a última versão de Rodar é de menos de 2 minutos.
 */
export function recordProHistoryVersion(
  scope: ProjectStorageScope,
  projectId: string,
  tree: ProjectTree,
  trigger: ProHistoryTrigger,
  options: { label?: string; restoredFrom?: number; now?: number } = {},
): Promise<ProHistoryVersion | null> {
  return serialized(scope, projectId, async () => {
    if (deleted.has(queueKey(scope, projectId))) return null
    const now = options.now ?? Date.now()
    const read = readIndex(await readValue(scope.store, proHistoryIndexKey(projectId)))
    if (!read.known) return null
    const index = read.index
    const last = index.versions.at(-1)
    if (
      trigger === 'run' &&
      last?.trigger === 'run' &&
      now - last.createdAt < PRO_HISTORY_RUN_INTERVAL_MS
    )
      return null
    const files: Record<string, string> = {}
    const contents = new Map<string, string>()
    const directories: string[] = []
    for (const [path, node] of Object.entries(tree)) {
      if (node.kind === 'dir') directories.push(path)
      else {
        const digest = await studioProDigest(node.content)
        files[path] = digest
        contents.set(digest, node.content)
      }
    }
    directories.sort()
    const previous = last?.files ?? {}
    const paths = new Set([...Object.keys(previous), ...Object.keys(files)])
    const changedFiles = [...paths].filter((path) => previous[path] !== files[path]).length
    if (last && changedFiles === 0 && last.directories.join('\n') === directories.join('\n'))
      return null
    const version: ProHistoryVersion = {
      id: crypto.randomUUID(),
      trigger,
      ...(options.label ? { label: options.label.slice(0, 200) } : {}),
      ...(options.restoredFrom !== undefined ? { restoredFrom: options.restoredFrom } : {}),
      createdAt: now,
      files,
      directories,
      changedFiles,
      ...(last ? {} : { first: true as const }),
    }
    const sizes = { ...index.sizes }
    const puts: Array<readonly [string, unknown]> = []
    for (const [digest, content] of contents)
      if (sizes[digest] === undefined) {
        sizes[digest] = byteLength(content)
        puts.push([proHistoryFileKey(projectId, digest), content])
      }
    const versions = [...index.versions, version]
    const usedBytes = (list: ProHistoryVersion[]) => {
      const used = new Set(list.flatMap((entry) => Object.values(entry.files)))
      return [...used].reduce((sum, digest) => sum + (sizes[digest] ?? 0), 0)
    }
    // As mais antigas saem primeiro; a versão nova fica sempre.
    while (
      versions.length > 1 &&
      (versions.length > PRO_HISTORY_MAX_VERSIONS || usedBytes(versions) > PRO_HISTORY_MAX_BYTES)
    )
      versions.shift()
    const used = new Set(versions.flatMap((entry) => Object.values(entry.files)))
    const deletes: string[] = []
    for (const digest of Object.keys(sizes))
      if (!used.has(digest)) {
        delete sizes[digest]
        deletes.push(proHistoryFileKey(projectId, digest))
      }
    puts.push([proHistoryIndexKey(projectId), { version: 1, versions, sizes }])
    await writeInOneTransaction(scope.store, { puts, deletes })
    return version
  })
}

/** A árvore de uma versão guardada, com o conteúdo de cada arquivo. */
export async function readProHistoryTree(
  scope: ProjectStorageScope,
  projectId: string,
  versionId: string,
): Promise<ProjectTree> {
  const { index } = readIndex(await readValue(scope.store, proHistoryIndexKey(projectId)))
  const version = index.versions.find((entry) => entry.id === versionId)
  if (!version) throw new Error('Esta versão não está mais guardada neste computador.')
  const paths = Object.keys(version.files)
  const values = await readValues(
    scope.store,
    paths.map((path) => proHistoryFileKey(projectId, version.files[path] as string)),
  )
  const tree: ProjectTree = {}
  for (const directory of version.directories) tree[directory] = { kind: 'dir' }
  paths.forEach((path, position) => {
    const content = values[position]
    if (typeof content !== 'string')
      throw new Error('Um arquivo desta versão não está mais guardado neste computador.')
    tree[path] = { kind: 'file', content }
  })
  return tree
}

/** As chaves do histórico de um projeto, para saírem junto quando o projeto é apagado. */
export async function proHistoryStorageKeys(
  scope: ProjectStorageScope,
  projectId: string,
): Promise<string[]> {
  const { index } = readIndex(await readValue(scope.store, proHistoryIndexKey(projectId)))
  return [
    proHistoryIndexKey(projectId),
    ...Object.keys(index.sizes)
      .filter((digest) => DIGEST.test(digest))
      .map((digest) => proHistoryFileKey(projectId, digest)),
  ]
}
