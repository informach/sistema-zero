/**
 * "Guardado na sua conta" (18/08/2026) — o cliente comum das criações do Estúdio
 * Completo e do Pinta. Cada jogo/desenho sobe sozinho depois que o autosave
 * confirma, e desce sozinho onde falta. Aqui mora o transporte e a FILA; quem
 * decide O QUE subir (o `Project` do Estúdio, o `.pinta.json` do desenho) são os
 * adaptadores de cada ferramenta (`studio-cloud.ts`, `pinta-cloud-persistence.ts`).
 *
 * Transporte (o mesmo desenho dos anexos do hub): `POST /api/creations/:tool/:id/upload`
 * (o BFF reserva no members e assina o PUT) → PUT do gzip DIRETO no R2 (a URL
 * assina Content-Length/Content-Type: nem um byte a mais) → `POST …/commit`. Baixar:
 * `GET …/download` (URL assinada) → gunzip. Nada grande passa pelo Next/gateway.
 *
 * Fila: por item só o SNAPSHOT MAIS RECENTE vale (idioma do `latestTaskQueue` do
 * Pinta); um envio por vez; falha de REDE espera com backoff e tenta de novo (o
 * `online` acorda a fila na hora, mesmo no meio da espera); erro do servidor (5xx)
 * tenta algumas vezes e desiste do item (o próximo autosave tenta de novo); erro
 * 4xx (quota, sem posse) não fica em loop — vira estado `error` com a mensagem.
 * `pagehide` e `visibilitychange` disparam o que estiver pendente. Cada subida
 * confirmada avisa `onUploaded` (é assim que as marcas de sincronia avançam), cada
 * remoção confirmada avisa `onRemoved` (a lápide local vira "enviada").
 *
 * Revisão-base (revisão 18/08/2026): cada reserva leva `baseRevision` = a revisão da
 * nuvem que ESTE aparelho conhece para o item (das marcas; 0 = nunca viu). O members
 * recusa com 409 `CREATION_STALE_BASE` quando outro aparelho subiu depois — um
 * aparelho atrasado nunca sobrescreve às cegas (antes era perda silenciosa: B subia,
 * A por cima, B baixava a versão pior "porque a nuvem mudou"). Nesse caso a fila chama
 * `onStale` do adaptador, que guarda a versão da nuvem como CÓPIA e sobe de novo com a
 * base certa. Os dois lados sobrevivem, sempre.
 *
 * Toda chamada leva `x-sz-viewer` = perfil que enfileirou: o BFF recusa (409) se a
 * sessão já trocou de perfil (irmão que entrou no meio de um upload em voo).
 */

import { perfSpanAsync } from './perf'

/** Espelho de `CREATION_TOOLS` do members (`molda` = a oficina 3D, 04/09/2026). */
export type CreationTool = 'studio' | 'pinta' | 'molda'

/** O `fetch` injetável (testes): só a assinatura de chamada, sem o `preconnect` do Bun. */
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type CloudSyncStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error' | 'unsupported'

export interface CloudSyncState {
  status: CloudSyncStatus
  /** Itens ainda por subir/apagar. */
  pending: number
  lastSavedAt: number | null
  /** Recado na linguagem da criança (nunca a mensagem crua do servidor). */
  lastError: string | null
}

export interface CreationMeta {
  itemId: string
  name: string
  kind: string
  /** `updatedAt` do item no relógio do editor (ms). */
  updatedAt: number
  /** PNG data URL pequeno, opcional (a lista da nuvem mostra sem baixar o blob). */
  thumb?: string | null
  /**
   * A revisão da nuvem que este aparelho conhece para o item (0 = nunca viu / novo).
   * Vai na reserva; base vencida = 409 `CREATION_STALE_BASE` (ver `onStale`).
   */
  baseRevision?: number
}

export interface CloudCreationSummary {
  itemId: string
  name: string
  kind: string
  /** ms desde a época (o members devolve ISO). */
  itemUpdatedAt: number
  revision: number
  bytes: number
  thumb: string | null
  syncedAt: number
  /** ms desde a época; presente somente quando o item é uma lápide remota. */
  deletedAt?: number | null
}

/**
 * Uma PARTE do snapshot (um asset do Estúdio), endereçada por conteúdo: `hash` = SHA-256 hex do
 * JSON canônico (`canonicalJson`) da parte; `text()` devolve ESSE mesmo JSON e só é lido se a
 * nuvem ainda não tem a parte (a maioria das subidas não lê nenhuma).
 */
export interface CloudPart {
  hash: string
  text: () => string | Promise<string>
}

/**
 * O produtor do snapshot: roda na hora do envio (sempre o estado mais recente). `null` = nada a
 * subir. `json` é o blob principal (o item inteiro, ou o MANIFESTO quando há `parts`); `parts`
 * são as partes separadas (Estúdio): sobem só as que a nuvem não tem. Sem `parts` = fio simples
 * (o Pinta).
 */
export type SnapshotProducer = () => Promise<{
  json: string
  meta?: Partial<CreationMeta>
  parts?: CloudPart[]
} | null>

/** O que subiu, confirmado pelo commit: é com este `updatedAt` que a marca de sincronia avança. */
export type UploadedListener = (result: {
  itemId: string
  updatedAt: number
  revision: number
}) => void

/**
 * A nuvem recusou a reserva porque outro aparelho subiu este item depois (409
 * `CREATION_STALE_BASE`). O item SAI da fila; quem resolve é o adaptador (guarda a
 * versão da nuvem como cópia, avança a marca e enfileira de novo). Rejeitar = o selo
 * mostra `staleFailed`.
 */
export type StaleListener = (info: { itemId: string }) => void | Promise<void>
export type RemovedListener = (result: { revision: number }) => void

export interface CreationsCloud {
  readonly tool: CreationTool
  /** A nuvem funciona neste navegador? (`CompressionStream`; sem ele, tudo vira no-op). */
  readonly supported: boolean
  list(options?: { signal?: AbortSignal }): Promise<CloudCreationSummary[]>
  /**
   * Sobe AGORA (fora da fila): comprime, reserva, envia, confirma. Lança em falha. Com `parts`,
   * declara as partes na reserva e sobe só as que a nuvem pede (ver `CloudPart`).
   */
  upload(meta: CreationMeta, json: string, parts?: CloudPart[]): Promise<{ revision: number }>
  /**
   * Baixa e descomprime a revisão corrente. `null` = não existe (404). Lança em falha de rede.
   * `parts` lista as partes da revisão (vazio no fio simples); `fetchPart(hash)` baixa UMA,
   * descomprime e CONFERE o hash (lança `CREATION_PART_CORRUPT` se não bate).
   */
  download(itemId: string, options?: { signal?: AbortSignal }): Promise<CloudDownload | null>
  /** Lixeira lógica na nuvem, condicionada à revisão que este aparelho conhece. */
  remove(itemId: string, baseRevision: number): Promise<{ revision: number }>
  /**
   * Enfileira o item (o produtor roda só na hora de subir; substitui o pendente do
   * mesmo item). `onUploaded` roda DEPOIS do commit confirmado — nunca antes (e não
   * roda se um `enqueueRemove` do mesmo item chegou enquanto o upload voava: a lápide
   * fica). `onStale` roda quando a nuvem recusa a base (outro aparelho subiu antes).
   */
  enqueueUpload(
    itemId: string,
    produce: SnapshotProducer,
    onUploaded?: UploadedListener,
    onStale?: StaleListener,
  ): void
  /** Enfileira a remoção SEM debounce (cancela um upload pendente do mesmo item). */
  enqueueRemove(
    itemId: string,
    baseRevision: number,
    onRemoved?: RemovedListener,
    onStale?: StaleListener,
  ): void
  /**
   * Dispara o que está pendente agora (sem esperar o debounce) e aguarda a fila esvaziar.
   * `timeoutMs` = teto da espera (sair do editor não pode ficar preso num upload de vários
   * MB, nem numa espera de backoff sem internet): a fila CONTINUA depois; só a promessa volta.
   */
  flush(options?: { timeoutMs?: number }): Promise<void>
  getState(): CloudSyncState
  subscribe(listener: (state: CloudSyncState) => void): () => void
  /**
   * Desliga listeners de janela e impede passos NOVOS. O passo em voo termina (a rede
   * já foi gasta); `{ abort: true }` corta até ele (testes / troca brusca de perfil).
   */
  dispose(options?: { abort?: boolean }): void
}

/** O que `download` devolve. */
export interface CloudDownload {
  json: string
  summary: CloudCreationSummary
  parts: Array<{ hash: string; bytes: number }>
  fetchPart(hash: string): Promise<string>
}

interface CloudError extends Error {
  status?: number
  code?: string
  /** `retry-after` do 429 da borda (ms), quando veio. */
  retryAfterMs?: number
  /** `details` estruturado do members/BFF (partes: quais hashes faltam). */
  details?: { hashes?: string[] }
}

/** PUTs de partes em paralelo (briga com banda e com o teto de conexões do navegador). */
const PART_PUT_CONCURRENCY = 4
/** Voltas da reserva quando o servidor pede bytes de partes (409 `CREATION_PARTS_NEED_BYTES`). */
const MAX_NEED_BYTES_ROUNDS = 3

const IDLE_MS = 2000
/** Espera entre tentativas depois de falha de rede: 2 s → 5 s → 15 s → 60 s → 5 min. */
const RETRY_STEPS_MS = [2000, 5000, 15_000, 60_000, 300_000]
/** Erro do servidor (5xx) ou inesperado: até aqui, depois o item sai da fila. */
const MAX_SERVER_RETRIES = 3
/**
 * Compasso da fila quando há MUITO pendente (primeira sincronia de uma galeria grande):
 * um passo a cada 250 ms ≈ 240 itens/min, abaixo dos 300/min por rota da borda
 * (`members-creations-upload`/`commit`) — sem ele a fila cruzava o teto e cada item
 * passado era derrubado com 429. Com pouco pendente, sem compasso.
 */
const PACE_MS = 250
const PACE_THRESHOLD = 10
/** 429 sem `retry-after`: espera isto antes de tentar de novo. */
const DEFAULT_RETRY_AFTER_MS = 15_000
/** Teto para o `retry-after` da borda (um header de 3600 s não pode prender a fila por 1 h). */
const MAX_RETRY_AFTER_MS = 5 * 60_000

/**
 * `AbortSignal.any` com fallback: Safari < 17.4 (iPads no iPadOS 16), Chrome < 116 e Firefox
 * < 124 não têm — e um `TypeError` aqui deixava a descida muda (nenhum item descia) nesses
 * aparelhos.
 */
export function anySignal(a: AbortSignal, b: AbortSignal): AbortSignal {
  const native = (AbortSignal as { any?: (signals: AbortSignal[]) => AbortSignal }).any
  if (typeof native === 'function') return native.call(AbortSignal, [a, b])
  const controller = new AbortController()
  const forward = (source: AbortSignal) => () => controller.abort(source.reason)
  if (a.aborted) controller.abort(a.reason)
  else if (b.aborted) controller.abort(b.reason)
  else {
    a.addEventListener('abort', forward(a), { once: true })
    b.addEventListener('abort', forward(b), { once: true })
  }
  return controller.signal
}

/** Recados do selo, na linguagem da criança. */
export const CLOUD_MESSAGES = {
  quota: 'Sua conta está sem espaço para guardar mais. Apague o que não usa mais.',
  tooBig: 'Esse jogo ou desenho é grande demais para guardar na conta.',
  forbidden: 'Sua conta não tem essa ferramenta liberada para guardar na nuvem.',
  viewer: 'Trocou de perfil no meio do caminho. Abra de novo para guardar.',
  server: 'A nuvem não respondeu agora. Vou tentar de novo daqui a pouco.',
  generic: 'Não consegui guardar na sua conta agora. Vou tentar de novo.',
  staleFailed:
    'Esse jogo ou desenho também mudou em outro aparelho e não consegui juntar os dois agora. Vou tentar de novo.',
  unsupported: 'Este navegador não consegue guardar na conta.',
} as const

export function gzipSupported(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'
}

/** JSON → bytes gzip (o que sobe para o R2). */
export async function gzipText(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** bytes gzip → texto (o que desce do R2). */
export async function gunzipToText(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const stream = new Blob([source as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

/** As partes exigem SHA-256 (`crypto.subtle`); sem ele, o adaptador sobe o item inteiro. */
export function hashSupported(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle?.digest === 'function' &&
    typeof TextEncoder !== 'undefined'
  )
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const inner = (value as Record<string, unknown>)[key]
      if (inner !== undefined) out[key] = sortKeysDeep(inner)
    }
    return out
  }
  return value
}

/**
 * JSON canônico (chaves ordenadas em profundidade, `undefined` fora): é ISTO que se hasheia e
 * que sobe como parte — nunca o gzip (não é determinístico) nem só um campo (nome/metadados
 * diferentes colidiriam). Estável entre navegadores e entre leituras do IndexedDB.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value))
}

/** SHA-256 hex de um texto (UTF-8). Assíncrono: o navegador calcula fora da main thread. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * As mensagens de rede dos navegadores (Chrome "Failed to fetch", Firefox "NetworkError
 * when attempting to fetch resource.", Safari "Load failed" / "The network connection was
 * lost." / "The Internet connection appears to be offline."). Sem um `/network/` solto:
 * um bug com "network" no texto viraria "sem internet" e retentaria sem teto.
 */
const NETWORK_MESSAGE =
  /failed to fetch|networkerror|network request failed|load failed|network connection was lost|internet connection appears to be offline/i

/**
 * "Sem internet" de verdade: o navegador diz que está offline, ou o `fetch` nem chegou
 * ao servidor (a mensagem do TypeError é a de rede). Um TypeError qualquer (bug no
 * produtor, `undefined.x`) NÃO é rede — senão o selo diria "sem internet" com internet.
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  return error instanceof TypeError && NETWORK_MESSAGE.test(error.message)
}

/** Traduz o erro em recado de criança (o selo nunca mostra a mensagem crua do servidor). */
export function messageForError(error: unknown): string {
  const err = error as CloudError
  if (err?.code === 'CREATION_QUOTA_EXCEEDED') {
    return /grande demais/i.test(err.message) ? CLOUD_MESSAGES.tooBig : CLOUD_MESSAGES.quota
  }
  if (err?.code === 'VIEWER_MISMATCH') return CLOUD_MESSAGES.viewer
  if (err?.code === 'CREATION_STALE_BASE') return CLOUD_MESSAGES.staleFailed
  // O PUT no R2 falhou (URL vencida numa conexão lenta, relógio…): não é "sem posse".
  if (err?.code === 'STORAGE_PUT_FAILED') return CLOUD_MESSAGES.generic
  if (err?.status === 403) return CLOUD_MESSAGES.forbidden
  if (err?.status !== undefined && err.status >= 500) return CLOUD_MESSAGES.server
  return CLOUD_MESSAGES.generic
}

/** `Retry-After` em segundos ou data HTTP → ms (undefined quando ausente/inválido). */
export function parseRetryAfterMs(header: string | null, now = Date.now()): number | undefined {
  if (!header) return undefined
  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000)
  const at = Date.parse(header)
  return Number.isFinite(at) ? Math.max(0, at - now) : undefined
}

async function readError(response: Response): Promise<CloudError> {
  const body = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string }
    details?: { hashes?: unknown }
  } | null
  const err = new Error(body?.error?.message ?? `HTTP ${response.status}`) as CloudError
  err.status = response.status
  err.code = body?.error?.code
  const retryAfter = parseRetryAfterMs(response.headers.get('retry-after'))
  if (retryAfter !== undefined) err.retryAfterMs = retryAfter
  const hashes = body?.details?.hashes
  if (Array.isArray(hashes)) {
    err.details = { hashes: hashes.filter((h): h is string => typeof h === 'string') }
  }
  return err
}

interface RawCloudSummary {
  itemId: string
  name?: string
  kind?: string
  itemUpdatedAt?: string
  revision: number
  bytes?: number
  thumb?: string | null
  syncedAt?: string
  deletedAt?: string | null
}

interface CloudListPage {
  items: RawCloudSummary[]
  nextCursor?: string | null
}

function toSummary(raw: RawCloudSummary): CloudCreationSummary {
  const deletedAt = raw.deletedAt ? Date.parse(raw.deletedAt) : undefined
  const summary: CloudCreationSummary = {
    itemId: raw.itemId,
    name: raw.name ?? raw.itemId,
    kind: raw.kind ?? 'deleted',
    itemUpdatedAt: raw.itemUpdatedAt ? Date.parse(raw.itemUpdatedAt) : (deletedAt ?? 0),
    revision: raw.revision,
    bytes: raw.bytes ?? 0,
    thumb: raw.thumb ?? null,
    syncedAt: raw.syncedAt ? Date.parse(raw.syncedAt) : (deletedAt ?? 0),
  }
  if (deletedAt !== undefined) summary.deletedAt = deletedAt
  return summary
}

export function createCreationsCloud(options: {
  tool: CreationTool
  /** Perfil dono da fila: vai em `x-sz-viewer` (o BFF confere com a sessão). */
  viewerId?: string
  /** Injetável (testes). Default: o `fetch` global. */
  fetch?: FetchLike
  /**
   * Debounce entre a mudança e a subida (default 2 s — em cima do autosave já debounced).
   * O Estúdio usa mais (o projeto inteiro sobe a cada folga; vários MB).
   */
  idleMs?: number
  /** Relógio injetável (testes). */
  now?: () => number
  /** Agendador injetável (testes: sem esperar de verdade). Recebe um sinal para acordar antes. */
  wait?: (ms: number, wake: Promise<void>) => Promise<void>
}): CreationsCloud {
  const tool = options.tool
  const doFetch: FetchLike = options.fetch ?? ((input, init) => fetch(input, init))
  const idleMs = options.idleMs ?? IDLE_MS
  const now = options.now ?? (() => Date.now())
  const wait =
    options.wait ??
    ((ms: number, wake: Promise<void>) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ms)
        void wake.then(() => {
          clearTimeout(timer)
          resolve()
        })
      }))
  const supported = gzipSupported()
  const base = `/api/creations/${tool}`
  const viewerHeaders: Record<string, string> = options.viewerId
    ? { 'x-sz-viewer': options.viewerId }
    : {}

  type Job =
    | {
        kind: 'upload'
        produce: SnapshotProducer
        onUploaded?: UploadedListener
        onStale?: StaleListener
        failures: number
      }
    | {
        kind: 'remove'
        baseRevision: number
        onRemoved?: RemovedListener
        onStale?: StaleListener
        failures: number
      }
  const pending = new Map<string, Job>()
  const listeners = new Set<(state: CloudSyncState) => void>()
  let state: CloudSyncState = {
    status: supported ? 'idle' : 'unsupported',
    pending: 0,
    lastSavedAt: null,
    lastError: supported ? null : CLOUD_MESSAGES.unsupported,
  }
  let timer: ReturnType<typeof setTimeout> | null = null
  /** Quando o timer vai disparar (relógio do `now`): um prazo mais cedo troca o timer, um mais tarde não. */
  let dueAt = Number.POSITIVE_INFINITY
  let running: Promise<void> | null = null
  let retryIndex = 0
  /** Espera pedida por um 429 (`retry-after`); `null` = nenhuma pendente. */
  let retryAfterMs: number | null = null
  let disposed = false
  const abort = new AbortController()
  // "Acorda" a espera do backoff (rede voltou / flush): promessa trocada a cada espera.
  // `wakeRequested` guarda um acordar que chegou ANTES de a fila começar a esperar (no
  // meio de um passo) — senão ele se perdia e a fila dormia o backoff inteiro.
  let wake: { promise: Promise<void>; resolve: () => void } = deferred()
  let wakeRequested = false

  function deferred(): { promise: Promise<void>; resolve: () => void } {
    let resolve: () => void = () => {}
    const promise = new Promise<void>((r) => {
      resolve = r
    })
    return { promise, resolve }
  }

  function wakeUp(): void {
    wakeRequested = true
    wake.resolve()
  }

  function setState(patch: Partial<CloudSyncState>): void {
    const next: CloudSyncState = { ...state, ...patch, pending: pending.size }
    // Só notifica quando algo VISÍVEL mudou: cada autosave chamava `schedule()` → `saving`
    // de novo → re-render do selo e, pior, o `aria-live` repetia o recado a cada ciclo.
    if (
      next.status === state.status &&
      next.pending === state.pending &&
      next.lastError === state.lastError &&
      next.lastSavedAt === state.lastSavedAt
    ) {
      return
    }
    state = next
    for (const listener of listeners) listener(state)
  }

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const signal = init?.signal ? anySignal(abort.signal, init.signal) : abort.signal
    const response = await doFetch(`${base}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...viewerHeaders, ...(init?.headers ?? {}) },
      credentials: 'same-origin',
      signal,
      // Reserva, commit e DELETE são pequenos (< 64 KB): `keepalive` deixa "apagar e fechar a
      // aba" e o `pagehide` chegarem ao servidor mesmo com a página indo embora (o PUT do blob
      // no R2 é grande demais para isso e fica fora).
      ...(init?.method === 'DELETE' || path.endsWith('/commit') || path.endsWith('/upload')
        ? { keepalive: true }
        : {}),
    })
    if (!response.ok) throw await readError(response)
    return (await response.json()) as T
  }

  async function list(options?: { signal?: AbortSignal }): Promise<CloudCreationSummary[]> {
    const items: CloudCreationSummary[] = []
    const seen = new Set<string>()
    let cursor: string | null = null
    for (let page = 0; page < 100; page += 1) {
      const path: string = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
      const body: CloudListPage = await api<CloudListPage>(path, { signal: options?.signal })
      items.push(...body.items.map(toSummary))
      const next: string | null = body.nextCursor ?? null
      if (!next) return items
      if (seen.has(next)) throw new Error('Cursor repetido na lista de criações')
      seen.add(next)
      cursor = next
    }
    throw new Error('A lista de criações excedeu o limite de páginas')
  }

  interface UploadTicket {
    revision: number
    bytes: number
    uploadUrl: string
    method: 'PUT'
    headers: Record<string, string>
    /** As partes FALTANTES na nuvem (um PUT assinado para cada). */
    parts?: Array<{ hash: string; bytes: number; uploadUrl: string }>
  }

  /** PUT direto no R2: sem cookies (é outra origem) e com o Content-Type assinado. */
  async function putBlob(
    url: string,
    method: string,
    headers: Record<string, string>,
    bytes: Uint8Array,
  ): Promise<void> {
    const put = await doFetch(url, {
      method,
      headers,
      body: bytes as BodyInit,
      signal: abort.signal,
    })
    if (put.ok) return
    // Código PRÓPRIO: um 403 do R2 (URL vencida numa conexão lenta) não é "sem posse", e uma
    // reserva nova traz URL nova — a fila tenta de novo algumas vezes.
    const err = new Error(`Falha ao enviar para o armazenamento (${put.status})`) as CloudError
    err.status = put.status
    err.code = 'STORAGE_PUT_FAILED'
    throw err
  }

  async function upload(
    meta: CreationMeta,
    json: string,
    parts: CloudPart[] = [],
  ): Promise<{ revision: number }> {
    if (!supported) throw new Error(CLOUD_MESSAGES.unsupported)
    const bytes = await perfSpanAsync('kids:cloud:gzip', () => gzipText(json), {
      chars: json.length,
    })
    // Partes únicas por hash (o servidor recusa repetidas; o manifesto pode repetir à vontade).
    const byHash = new Map<string, CloudPart>()
    for (const part of parts) if (!byHash.has(part.hash)) byHash.set(part.hash, part)
    // Bytes gzip das partes que o servidor PEDIU (só essas são comprimidas): hash → bytes.
    const gzipped = new Map<string, Uint8Array>()
    const reserveBody = () =>
      JSON.stringify({
        name: meta.name,
        kind: meta.kind,
        itemUpdatedAt: new Date(meta.updatedAt).toISOString(),
        bytes: bytes.byteLength,
        thumb: meta.thumb ?? null,
        ...(meta.baseRevision !== undefined ? { baseRevision: meta.baseRevision } : {}),
        ...(byHash.size > 0
          ? {
              parts: [...byHash.keys()].map((hash) => {
                const sized = gzipped.get(hash)
                return sized ? { hash, bytes: sized.byteLength } : { hash }
              }),
            }
          : {}),
      })
    // A reserva: 1ª volta SEM bytes de parte nenhuma (o caso comum — "só o programa mudou" —
    // termina aqui: zero gzip de assets). Se a nuvem não tem alguma, responde 409
    // `CREATION_PARTS_NEED_BYTES` com os hashes: comprime SÓ essas e reserva de novo.
    let ticket: UploadTicket | null = null
    for (let round = 0; round < MAX_NEED_BYTES_ROUNDS && !ticket; round += 1) {
      try {
        ticket = await perfSpanAsync('kids:cloud:reserve', () =>
          api<UploadTicket>(`/${encodeURIComponent(meta.itemId)}/upload`, {
            method: 'POST',
            body: reserveBody(),
          }),
        )
      } catch (error) {
        const err = error as CloudError
        const needed = err.details?.hashes ?? []
        if (
          err.status !== 409 ||
          err.code !== 'CREATION_PARTS_NEED_BYTES' ||
          needed.length === 0 ||
          round === MAX_NEED_BYTES_ROUNDS - 1
        ) {
          throw error
        }
        await perfSpanAsync(
          'kids:cloud:gzip-parts',
          async () => {
            for (const hash of needed) {
              const part = byHash.get(hash)
              if (!part) throw error
              if (!gzipped.has(hash)) gzipped.set(hash, await gzipText(await part.text()))
            }
          },
          { parts: needed.length },
        )
      }
    }
    if (!ticket) throw new Error('Reserva sem resposta')
    if (byHash.size > 0 && !Array.isArray(ticket.parts)) {
      // O serviço do outro lado ainda não fala "partes" (janela de deploy/rollback): sem a
      // lista do que falta, subir só o manifesto gravaria na conta um jogo sem os desenhos.
      // Erro RETENTÁVEL (o item volta no próximo autosave), nunca um commit cego.
      const err = new Error('O serviço ainda não aceita partes') as CloudError
      err.status = 503
      err.code = 'CLOUD_PARTS_UNSUPPORTED'
      throw err
    }
    const reserved = ticket
    // As partes faltantes (em paralelo limitado) e depois o manifesto. A reserva só assina
    // partes cujos bytes foram declarados, e esses estão em `gzipped`.
    const missing = reserved.parts ?? []
    await perfSpanAsync(
      'kids:cloud:put',
      async () => {
        let cursor = 0
        const worker = async () => {
          while (cursor < missing.length) {
            const part = missing[cursor] as NonNullable<UploadTicket['parts']>[number]
            cursor += 1
            const body = gzipped.get(part.hash)
            if (!body) {
              const err = new Error('Parte pedida sem bytes locais') as CloudError
              err.code = 'CREATION_PART_MISSING'
              err.status = 409
              throw err
            }
            await putBlob(part.uploadUrl, reserved.method, reserved.headers, body)
          }
        }
        await Promise.all(
          Array.from({ length: Math.min(PART_PUT_CONCURRENCY, missing.length) }, worker),
        )
        await putBlob(reserved.uploadUrl, reserved.method, reserved.headers, bytes)
      },
      {
        bytes: bytes.byteLength + missing.reduce((sum, part) => sum + part.bytes, 0),
        parts: missing.length,
      },
    )
    // Só a revisão (+ as partes que subiram): bytes e metadados são os da reserva.
    await perfSpanAsync('kids:cloud:commit', () =>
      api(`/${encodeURIComponent(meta.itemId)}/commit`, {
        method: 'POST',
        body: JSON.stringify({
          revision: reserved.revision,
          ...(missing.length > 0 ? { uploadedParts: missing.map((part) => part.hash) } : {}),
        }),
      }),
    )
    return { revision: reserved.revision }
  }

  async function getBlobText(url: string, signal: AbortSignal): Promise<string> {
    const response = await doFetch(url, { method: 'GET', signal })
    if (!response.ok) {
      const err = new Error(`Falha ao baixar do armazenamento (${response.status})`) as CloudError
      err.status = response.status
      throw err
    }
    return gunzipToText(await response.arrayBuffer())
  }

  async function download(
    itemId: string,
    options?: { signal?: AbortSignal },
  ): Promise<CloudDownload | null> {
    if (!supported) return null
    let ticket: {
      downloadUrl: string
      revision: number
      bytes: number
      item: Parameters<typeof toSummary>[0]
      parts?: Array<{ hash: string; bytes: number; url: string }>
    }
    try {
      ticket = await api(`/${encodeURIComponent(itemId)}/download`, { signal: options?.signal })
    } catch (error) {
      if ((error as CloudError).status === 404) return null
      throw error
    }
    const signal = options?.signal ? anySignal(abort.signal, options.signal) : abort.signal
    const json = await getBlobText(ticket.downloadUrl, signal)
    const partUrls = new Map((ticket.parts ?? []).map((part) => [part.hash, part]))
    return {
      json,
      summary: toSummary(ticket.item),
      parts: (ticket.parts ?? []).map(({ hash, bytes }) => ({ hash, bytes })),
      fetchPart: async (hash: string) => {
        const part = partUrls.get(hash)
        if (!part) {
          // O manifesto aponta para uma parte que a revisão não tem: a descida recusa.
          const err = new Error('Parte não está na revisão') as CloudError
          err.code = 'CREATION_PART_MISSING'
          err.status = 404
          throw err
        }
        const text = await getBlobText(part.url, signal)
        if (hashSupported()) {
          const actual = await sha256Hex(text)
          if (actual !== hash) {
            const err = new Error('Parte não bate com o hash') as CloudError
            err.code = 'CREATION_PART_CORRUPT'
            throw err
          }
        }
        return text
      },
    }
  }

  async function remove(itemId: string, baseRevision: number): Promise<{ revision: number }> {
    const result = await api<{ revision: number }>(`/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
      body: JSON.stringify({ baseRevision }),
    })
    return { revision: result.revision }
  }

  /** Um passo da fila: pega o PRIMEIRO pendente, executa, remove se deu certo. */
  async function step(): Promise<'done' | 'retry' | 'empty'> {
    const next = pending.entries().next()
    if (next.done) return 'empty'
    const [itemId, job] = next.value
    // Só um acordar que chegue DURANTE este passo conta (um `flush` antigo não vale).
    wakeRequested = false
    try {
      if (job.kind === 'remove') {
        const result = await remove(itemId, job.baseRevision)
        job.onRemoved?.(result)
      } else {
        const snapshot = await perfSpanAsync('kids:cloud:produce', () => job.produce(), {
          itemId,
        })
        if (snapshot) {
          const meta: CreationMeta = {
            itemId,
            name: snapshot.meta?.name ?? itemId,
            kind: snapshot.meta?.kind ?? 'unknown',
            updatedAt: snapshot.meta?.updatedAt ?? now(),
            thumb: snapshot.meta?.thumb ?? null,
            ...(snapshot.meta?.baseRevision !== undefined
              ? { baseRevision: snapshot.meta.baseRevision }
              : {}),
          }
          const { revision } = await upload(meta, snapshot.json, snapshot.parts)
          // Um `enqueueRemove` do mesmo item chegou enquanto o upload voava? A lápide manda:
          // avançar a marca e limpá-la aqui faria o item apagado voltar da nuvem.
          const replacement = pending.get(itemId)
          if (replacement?.kind !== 'remove') {
            job.onUploaded?.({ itemId, updatedAt: meta.updatedAt, revision })
          } else {
            // A remoção chegou durante ESTE upload. A revisão recém-confirmada também é nossa:
            // avance a base da lápide para ela não parecer uma exclusão velha no servidor.
            replacement.baseRevision = revision
          }
        }
      }
      // Só sai da fila se NÃO foi substituído enquanto rodava (o produtor novo é o mais recente).
      if (pending.get(itemId) === job) pending.delete(itemId)
      retryIndex = 0
      setState({
        status: pending.size > 0 ? 'saving' : 'saved',
        lastSavedAt: now(),
        lastError: null,
      })
      return 'done'
    } catch (error) {
      const err = error as CloudError
      if (err?.name === 'AbortError' || disposed) return 'done'
      // Base vencida (409): outro aparelho subiu este item depois. O item SAI da fila e o
      // adaptador resolve (guarda a versão da nuvem como cópia e sobe de novo com a base
      // certa) — repetir o mesmo envio só daria 409 de novo.
      if (err.status === 409 && err.code === 'CREATION_STALE_BASE') {
        if (pending.get(itemId) === job) pending.delete(itemId)
        if (job.onStale) {
          setState({ status: 'saving', lastError: null })
          const onStale = job.onStale
          void Promise.resolve()
            .then(() => onStale({ itemId }))
            .then(() => {
              if (!disposed && pending.size === 0 && !running) setState({ status: 'saved' })
            })
            .catch(() => {
              if (!disposed) setState({ status: 'error', lastError: CLOUD_MESSAGES.staleFailed })
            })
        } else {
          setState({ status: 'error', lastError: CLOUD_MESSAGES.staleFailed })
        }
        return 'done'
      }
      if (isNetworkError(error)) {
        setState({ status: 'offline', lastError: null })
        return 'retry'
      }
      // 429 da borda (rate limit): TEMPORÁRIO — espera o `retry-after` (ou um padrão) e tenta
      // de novo; derrubar o item aqui era perder desenhos na primeira sincronia de uma galeria
      // grande. O selo continua "guardando" (não é erro da criança).
      if (err.status === 429) {
        job.failures += 1
        if (job.failures <= MAX_SERVER_RETRIES) {
          retryAfterMs = Math.min(err.retryAfterMs ?? DEFAULT_RETRY_AFTER_MS, MAX_RETRY_AFTER_MS)
          setState({ status: 'saving', lastError: null })
          return 'retry'
        }
      }
      // Revisão vencida no commit (409): outro navegador reservou depois — reservar de novo
      // resolve; mas com contador (dois aparelhos em pingue-pongue não prendem a fila).
      // Mesmo trato para o PUT que falhou (URL nova na próxima reserva) e para o 5xx.
      // Partes: o BFF/members não acharam no R2 uma parte que subiu (corrida com o GC, R2 com
      // soluço) ou a dança do "preciso dos bytes" não fechou — reservar de novo resolve.
      const retriable =
        (err.status === 409 && err.code === 'CREATION_REVISION_MISMATCH') ||
        (err.status === 409 && err.code === 'CREATION_PART_MISSING') ||
        (err.status === 409 && err.code === 'CREATION_PARTS_NEED_BYTES') ||
        err.code === 'STORAGE_PUT_FAILED' ||
        (err.status !== undefined && err.status >= 500)
      if (retriable) {
        // Servidor com soluço: tenta de novo algumas vezes, sem prender a fila para sempre. O
        // selo segue "guardando" enquanto há tentativa (um soluço que passa na segunda vez não
        // vira susto nem anúncio de erro); só ao desistir vira erro.
        job.failures += 1
        if (job.failures < MAX_SERVER_RETRIES) {
          setState({ status: 'saving', lastError: null })
          return 'retry'
        }
      }
      // 4xx de verdade (quota, sem posse, sessão de outro perfil), erro inesperado, ou 5xx
      // repetido: não fica em loop; o item sai da fila e o próximo autosave tenta de novo.
      if (pending.get(itemId) === job) pending.delete(itemId)
      setState({ status: 'error', lastError: messageForError(error) })
      return 'done'
    }
  }

  async function run(): Promise<void> {
    while (!disposed && pending.size > 0) {
      const outcome = await step()
      if (outcome === 'empty') break
      if (outcome === 'retry') {
        // 429: a espera é a que a borda pediu (não entra no backoff de rede, que um acordar
        // interrompe — a borda não muda de ideia porque a rede voltou).
        if (retryAfterMs !== null) {
          // Espera que NÃO acorda: um `flush`/`online`/`pagehide` no meio voltava a bater na
          // borda antes da hora e cada batida gastava uma das 3 tentativas.
          const delay = retryAfterMs
          retryAfterMs = null
          wake = deferred()
          await wait(delay, new Promise<void>(() => {}))
          wakeRequested = false
          continue
        }
        // Acordaram durante o passo (rede voltou / flush)? Tenta de novo já.
        if (wakeRequested) {
          wakeRequested = false
          continue
        }
        const delay = RETRY_STEPS_MS[Math.min(retryIndex, RETRY_STEPS_MS.length - 1)] ?? 0
        retryIndex += 1
        wake = deferred()
        await wait(delay, wake.promise)
        wakeRequested = false
        continue
      }
      // Compasso com muito pendente (primeira sincronia): não cruzar o rate limit da borda.
      if (outcome === 'done' && pending.size > PACE_THRESHOLD) {
        wake = deferred()
        await wait(PACE_MS, wake.promise)
        wakeRequested = false
      }
    }
  }

  function kick(): void {
    if (disposed || !supported) return
    if (running) return
    running = run().finally(() => {
      running = null
      // Chegou coisa nova enquanto a fila esvaziava? Volta.
      if (!disposed && pending.size > 0) kick()
    })
  }

  function schedule(delayMs: number): void {
    if (!supported) return
    if (state.status !== 'saving') setState({ status: 'saving' })
    // Só um prazo MAIS CEDO troca o timer: um upload enfileirado logo depois de um apagar
    // não pode empurrar o DELETE (prazo 0) para daqui a `idleMs`.
    const due = now() + delayMs
    if (timer && due >= dueAt) return
    if (timer) clearTimeout(timer)
    dueAt = due
    timer = setTimeout(() => {
      timer = null
      dueAt = Number.POSITIVE_INFINITY
      kick()
    }, delayMs)
  }

  function enqueueUpload(
    itemId: string,
    produce: SnapshotProducer,
    onUploaded?: UploadedListener,
    onStale?: StaleListener,
  ): void {
    pending.set(itemId, { kind: 'upload', produce, onUploaded, onStale, failures: 0 })
    schedule(idleMs)
  }

  function enqueueRemove(
    itemId: string,
    baseRevision: number,
    onRemoved?: RemovedListener,
    onStale?: StaleListener,
  ): void {
    pending.set(itemId, { kind: 'remove', baseRevision, onRemoved, onStale, failures: 0 })
    // Apagar não espera o debounce: a criança pode fechar a aba logo depois.
    schedule(0)
  }

  async function flush(options?: { timeoutMs?: number }): Promise<void> {
    if (timer) {
      clearTimeout(timer)
      timer = null
      dueAt = Number.POSITIVE_INFINITY
    }
    retryIndex = 0
    wakeUp()
    kick()
    if (!running) return
    const timeoutMs = options?.timeoutMs
    if (timeoutMs === undefined) {
      await running
      return
    }
    // Teto: sair do editor não fica preso na fila (que segue sozinha).
    await Promise.race([running, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))])
  }

  // Sem esperar o debounce ao sair da página / trocar de aba; e a volta da rede acorda a fila.
  const onLeave = (): void => {
    if (pending.size > 0) void flush()
  }
  const onVisibility = (): void => {
    if (typeof document !== 'undefined' && document.hidden) onLeave()
  }
  const onOnline = (): void => {
    retryIndex = 0
    wakeUp()
    if (pending.size > 0) void flush()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', onLeave)
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibility)
  }

  return {
    tool,
    supported,
    list,
    upload,
    download,
    remove,
    enqueueUpload,
    enqueueRemove,
    flush,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose(opts) {
      disposed = true
      if (timer) clearTimeout(timer)
      dueAt = Number.POSITIVE_INFINITY
      wakeUp()
      if (opts?.abort) abort.abort()
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', onLeave)
        window.removeEventListener('online', onOnline)
        document.removeEventListener('visibilitychange', onVisibility)
      }
    },
  }
}
