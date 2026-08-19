/**
 * O cliente comum do "Guardado na sua conta": gzip de ida e volta, o fio
 * reserva → PUT → commit (só a revisão), a fila que só sobe o snapshot mais recente,
 * a retentativa em falha de rede (e só de rede), o erro 4xx que não fica em loop, o
 * 5xx limitado, `onUploaded`/`onRemoved` só depois da confirmação, o `x-sz-viewer`
 * em toda chamada e as mensagens de criança no selo.
 */
import { describe, expect, test } from 'bun:test'
import {
  CLOUD_MESSAGES,
  type CloudPart,
  type CloudSyncState,
  canonicalJson,
  createCreationsCloud,
  type FetchLike,
  gunzipToText,
  gzipText,
  hashSupported,
  isNetworkError,
  sha256Hex,
} from '../src/lib/creations-cloud'

interface Call {
  url: string
  method: string
  body: unknown
  headers: Record<string, string>
}

/** Um BFF + R2 de mentira: reserva, PUT, commit, download, delete. */
function fakeServer(
  opts: {
    failNetworkTimes?: number
    quotaFor?: string
    serverErrorTimes?: number
    viewerMismatch?: boolean
    bugTimes?: number
    /** A reserva confere `baseRevision` com a revisão corrente (409 CREATION_STALE_BASE). */
    checkBase?: boolean
    /** O PUT no R2 falha (403, URL vencida) estas vezes. */
    putFailTimes?: number
    /** A borda responde 429 (com `retry-after: 1`) estas vezes na reserva. */
    rateLimitTimes?: number
    /** Atraso (ms) em cada chamada, para simular rede lenta. */
    delayMs?: number
    /** O commit responde 409 CREATION_PART_MISSING (HEAD do BFF não achou) estas vezes. */
    partMissingTimes?: number
    /** Partes que o servidor "perde" depois de guardadas (simula R2 sem o objeto). */
    corruptPart?: string
  } = {},
) {
  const calls: Call[] = []
  const blobs = new Map<string, Uint8Array>()
  const items = new Map<
    string,
    {
      /** Revisão COMMITADA (a que a lista/download mostram). */
      revision: number
      /** Contador de reservas (nunca volta) e a reserva em voo (só ela pode commitar). */
      lastReserved: number
      pendingRevision: number | null
      name: string
      bytes: number
      /** Partes CONFIRMADAS (hash → bytes) e as da reserva pendente. */
      parts: Map<string, number>
      pendingParts: Map<string, number> | null
    }
  >()
  let partMissing = opts.partMissingTimes ?? 0
  const partUrl = (itemId: string, hash: string) =>
    `https://r2.test/creations/${itemId}/parts/${hash}`
  let networkFailures = opts.failNetworkTimes ?? 0
  let serverErrors = opts.serverErrorTimes ?? 0
  let bugs = opts.bugTimes ?? 0
  let putFailures = opts.putFailTimes ?? 0
  let rateLimits = opts.rateLimitTimes ?? 0
  const fetchImpl: FetchLike = async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const rawBody = init?.body
    const body =
      typeof rawBody === 'string'
        ? JSON.parse(rawBody)
        : rawBody instanceof Uint8Array
          ? rawBody
          : null
    calls.push({ url, method, body, headers: (init?.headers as Record<string, string>) ?? {} })
    // Como o `fetch` de verdade: sinal já abortado → AbortError (o cliente passa o sinal da
    // fila em toda chamada; `dispose({abort:true})` corta o que vier depois).
    if (init?.signal?.aborted) throw new DOMException('Abortado', 'AbortError')
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs))
    if (networkFailures > 0) {
      networkFailures -= 1
      throw new TypeError('Failed to fetch')
    }
    if (bugs > 0) {
      bugs -= 1
      // Um TypeError que NÃO é de rede (bug de programação): não pode virar "sem internet".
      throw new TypeError("Cannot read properties of undefined (reading 'x')")
    }
    if (serverErrors > 0 && url.endsWith('/upload')) {
      serverErrors -= 1
      return new Response(JSON.stringify({ error: { code: 'INTERNAL', message: 'boom' } }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (opts.viewerMismatch && url.startsWith('/api/')) {
      return new Response(
        JSON.stringify({
          error: { code: 'VIEWER_MISMATCH', message: 'A sessão trocou de perfil.' },
        }),
        { status: 409, headers: { 'content-type': 'application/json' } },
      )
    }
    const json = (status: number, payload: unknown) =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { 'content-type': 'application/json' },
      })
    const listMatch = url.match(/^\/api\/creations\/(\w+)$/)
    if (listMatch) {
      return json(200, {
        items: [...items.entries()].map(([itemId, it]) => ({
          itemId,
          name: it.name,
          kind: 'classic',
          itemUpdatedAt: '2026-08-18T12:00:00.000Z',
          revision: it.revision,
          bytes: it.bytes,
          thumb: null,
          syncedAt: '2026-08-18T12:00:01.000Z',
        })),
      })
    }
    const uploadMatch = url.match(/^\/api\/creations\/(\w+)\/([^/]+)\/upload$/)
    if (uploadMatch) {
      const itemId = uploadMatch[2] as string
      if (rateLimits > 0) {
        rateLimits -= 1
        return new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'calma' } }), {
          status: 429,
          headers: { 'content-type': 'application/json', 'retry-after': '1' },
        })
      }
      if (opts.quotaFor === itemId) {
        return json(409, {
          error: { code: 'CREATION_QUOTA_EXCEEDED', message: 'Sua conta está cheia' },
        })
      }
      const current = items.get(itemId)
      const b = body as {
        name: string
        bytes: number
        baseRevision?: number
        parts?: Array<{ hash: string; bytes?: number }>
      }
      if (
        opts.checkBase &&
        b.baseRevision !== undefined &&
        b.baseRevision !== (current?.revision ?? 0)
      ) {
        return json(409, {
          error: { code: 'CREATION_STALE_BASE', message: 'Esse item mudou em outro aparelho' },
        })
      }
      // PARTES (como o members): faltantes = as que o item ainda não tem; faltante SEM bytes
      // → 409 CREATION_PARTS_NEED_BYTES e nada reservado.
      const committed = current?.parts ?? new Map<string, number>()
      const declared = b.parts ?? []
      const needBytes = declared.filter((p) => !committed.has(p.hash) && p.bytes === undefined)
      if (needBytes.length > 0) {
        return json(409, {
          error: { code: 'CREATION_PARTS_NEED_BYTES', message: 'Partes sem bytes' },
          details: { hashes: needBytes.map((p) => p.hash) },
        })
      }
      const missing = declared.filter((p) => !committed.has(p.hash))
      const pendingParts = new Map(
        declared.map((p) => [p.hash, committed.get(p.hash) ?? (p.bytes as number)]),
      )
      // Como o members: a reserva NÃO promove a revisão (só o commit); o contador só sobe.
      const revision = (current?.lastReserved ?? 0) + 1
      items.set(itemId, {
        revision: current?.revision ?? 0,
        lastReserved: revision,
        pendingRevision: revision,
        name: b.name,
        bytes: b.bytes + [...pendingParts.values()].reduce((a, n) => a + n, 0),
        parts: committed,
        pendingParts,
      })
      return json(200, {
        revision,
        bytes: b.bytes,
        uploadUrl: `https://r2.test/creations/${itemId}/${revision}`,
        method: 'PUT',
        headers: { 'content-type': 'application/gzip' },
        parts: missing.map((p) => ({
          hash: p.hash,
          bytes: p.bytes,
          uploadUrl: partUrl(itemId, p.hash),
        })),
      })
    }
    if (url.startsWith('https://r2.test/') && method === 'PUT') {
      if (putFailures > 0) {
        putFailures -= 1
        return new Response('<Error>Request has expired</Error>', { status: 403 })
      }
      blobs.set(url, body as Uint8Array)
      return new Response(null, { status: 200 })
    }
    const commitMatch = url.match(/^\/api\/creations\/(\w+)\/([^/]+)\/commit$/)
    if (commitMatch) {
      const itemId = commitMatch[2] as string
      const it = items.get(itemId)
      const c = body as { revision: number; uploadedParts?: string[] }
      if (partMissing > 0) {
        partMissing -= 1
        return json(409, {
          error: { code: 'CREATION_PART_MISSING', message: 'Partes não enviadas' },
          details: { hashes: c.uploadedParts ?? [] },
        })
      }
      // Como o members: só a revisão RESERVADA confirma (outra reserva depois → 409 mismatch);
      // re-commit da corrente é idempotente.
      if (it && c.revision !== it.pendingRevision) {
        if (c.revision === it.revision)
          return json(200, { item: { itemId, revision: it.revision } })
        return json(409, {
          error: { code: 'CREATION_REVISION_MISMATCH', message: 'Revisão vencida' },
        })
      }
      if (it?.pendingParts) {
        // `uploadedParts` ⊇ (pendentes − confirmadas), senão 409.
        const uploaded = new Set(c.uploadedParts ?? [])
        const lacking = [...it.pendingParts.keys()].filter(
          (hash) => !it.parts.has(hash) && !uploaded.has(hash),
        )
        if (lacking.length > 0) {
          return json(409, {
            error: { code: 'CREATION_PART_MISSING', message: 'Partes não enviadas' },
            details: { hashes: lacking },
          })
        }
        it.parts = it.pendingParts
        it.pendingParts = null
      }
      if (it) {
        it.revision = c.revision
        it.pendingRevision = null
      }
      return json(200, { item: { itemId, revision: it?.revision ?? 0 } })
    }
    const downloadMatch = url.match(/^\/api\/creations\/(\w+)\/([^/]+)\/download$/)
    if (downloadMatch) {
      const itemId = downloadMatch[2] as string
      const it = items.get(itemId)
      if (!it) return json(404, { error: { code: 'CREATION_NOT_FOUND' } })
      return json(200, {
        downloadUrl: `https://r2.test/creations/${itemId}/${it.revision}`,
        revision: it.revision,
        bytes: it.bytes,
        item: {
          itemId,
          name: it.name,
          kind: 'classic',
          itemUpdatedAt: '2026-08-18T12:00:00.000Z',
          revision: it.revision,
          bytes: it.bytes,
          thumb: null,
          syncedAt: '2026-08-18T12:00:01.000Z',
        },
        parts: [...it.parts.entries()].map(([hash, bytes]) => ({
          hash,
          bytes,
          url: partUrl(itemId, hash),
        })),
      })
    }
    if (url.startsWith('https://r2.test/') && method === 'GET') {
      if (opts.corruptPart && url.endsWith(`/parts/${opts.corruptPart}`)) {
        return new Response((await gzipText('{"trocado":true}')) as BodyInit, { status: 200 })
      }
      const blob = blobs.get(url)
      if (!blob) return new Response(null, { status: 404 })
      return new Response(blob as BodyInit, { status: 200 })
    }
    const deleteMatch = url.match(/^\/api\/creations\/(\w+)\/([^/]+)$/)
    if (deleteMatch && method === 'DELETE') {
      const current = items.get(deleteMatch[2] as string)
      const existed = items.delete(deleteMatch[2] as string)
      return json(200, { deleted: existed, revision: current?.revision ?? 0 })
    }
    return json(500, { error: { code: 'UNHANDLED', message: url } })
  }
  return { fetchImpl, calls, blobs, items }
}

const noWait = (_ms: number, _wake: Promise<void>) => Promise.resolve()

/** Uma parte de teste: JSON canônico + hash, como o adaptador do Estúdio monta. */
async function partOf(value: unknown): Promise<CloudPart & { json: string }> {
  const json = canonicalJson(value)
  return { hash: await sha256Hex(json), text: () => json, json }
}

describe('isNetworkError', () => {
  test('só TypeError de rede (ou navegador offline) conta como rede', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isNetworkError(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(
      true,
    )
    expect(isNetworkError(new TypeError('Load failed'))).toBe(true)
    expect(isNetworkError(new TypeError("Cannot read properties of undefined (reading 'x')"))).toBe(
      false,
    )
    expect(isNetworkError(new Error('qualquer'))).toBe(false)
  })
})

describe('gzip de ida e volta', () => {
  test('o que sobe comprimido volta igual', async () => {
    const text = JSON.stringify({ name: 'nave', data: 'x'.repeat(5000) })
    const bytes = await gzipText(text)
    expect(bytes.byteLength).toBeLessThan(text.length)
    expect(await gunzipToText(bytes)).toBe(text)
  })
})

describe('createCreationsCloud', () => {
  test('upload = reserva → PUT no R2 com o content-type assinado → commit; download devolve o JSON', async () => {
    const server = fakeServer()
    const cloud = createCreationsCloud({ tool: 'studio', fetch: server.fetchImpl, wait: noWait })
    const meta = { itemId: 'proj-1', name: 'Nave', kind: 'classic', updatedAt: 1_700_000_000_000 }
    const { revision } = await cloud.upload(meta, '{"a":1}')
    expect(revision).toBe(1)
    const methods = server.calls.map((c) => `${c.method} ${c.url}`)
    expect(methods).toEqual([
      'POST /api/creations/studio/proj-1/upload',
      'PUT https://r2.test/creations/proj-1/1',
      'POST /api/creations/studio/proj-1/commit',
    ])
    // A reserva declara os bytes COMPRIMIDOS; o commit manda SÓ a revisão (bytes/meta são
    // os da reserva, conferidos e assinados no servidor).
    const reserve = server.calls[0]?.body as { bytes: number; itemUpdatedAt: string }
    const commit = server.calls[2]?.body as { revision: number }
    expect(reserve.bytes).toBe(
      server.blobs.get('https://r2.test/creations/proj-1/1')?.byteLength ?? -1,
    )
    expect(reserve.itemUpdatedAt).toBe(new Date(meta.updatedAt).toISOString())
    expect(commit).toEqual({ revision: 1 })
    const down = await cloud.download('proj-1')
    expect(down?.json).toBe('{"a":1}')
    expect(down?.summary.revision).toBe(1)
    expect(await cloud.download('nao-existe')).toBeNull()
    cloud.dispose()

    // Toda chamada ao BFF leva o perfil que enfileirou; o PUT no R2 (outra origem) não.
    const cloudWithViewer = createCreationsCloud({
      tool: 'studio',
      viewerId: 'perfil-1',
      fetch: server.fetchImpl,
      wait: noWait,
    })
    await cloudWithViewer.upload(meta, '{"a":2}')
    const tail = server.calls.slice(-3)
    expect(tail[0]?.headers['x-sz-viewer']).toBe('perfil-1')
    expect(tail[1]?.headers['x-sz-viewer']).toBeUndefined()
    expect(tail[2]?.headers['x-sz-viewer']).toBe('perfil-1')
    cloudWithViewer.dispose()
  })

  test('a fila sobe só o SNAPSHOT MAIS RECENTE do item e o estado vai a "saved"', async () => {
    const server = fakeServer()
    const cloud = createCreationsCloud({
      tool: 'pinta',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: noWait,
    })
    const states: CloudSyncState['status'][] = []
    cloud.subscribe((s) => states.push(s.status))
    let produced = 0
    cloud.enqueueUpload('d-1', async () => {
      produced += 1
      return { json: '{"v":1}', meta: { name: 'nave', kind: 'pixel-sprite', updatedAt: 1 } }
    })
    cloud.enqueueUpload('d-1', async () => {
      produced += 1
      return { json: '{"v":2}', meta: { name: 'nave', kind: 'pixel-sprite', updatedAt: 2 } }
    })
    await cloud.flush()
    // Um produtor só rodou (o último), um upload só.
    expect(produced).toBe(1)
    expect(server.calls.filter((c) => c.method === 'PUT')).toHaveLength(1)
    const blob = server.blobs.get('https://r2.test/creations/d-1/1')
    expect(blob && (await gunzipToText(blob))).toBe('{"v":2}')
    expect(cloud.getState().status).toBe('saved')
    expect(cloud.getState().pending).toBe(0)
    expect(states).toContain('saving')
    cloud.dispose()
  })

  test('falha de rede: fica "offline", tenta de novo e termina "saved" quando a rede volta', async () => {
    const server = fakeServer({ failNetworkTimes: 2 })
    const cloud = createCreationsCloud({
      tool: 'studio',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: noWait,
    })
    const seen: string[] = []
    cloud.subscribe((s) => seen.push(s.status))
    cloud.enqueueUpload('p-1', async () => ({ json: '{}', meta: { name: 'x', kind: 'classic' } }))
    await cloud.flush()
    expect(seen).toContain('offline')
    expect(cloud.getState().status).toBe('saved')
    expect(server.calls.filter((c) => c.url.endsWith('/upload'))).toHaveLength(3)
    cloud.dispose()
  })

  test('erro 4xx (quota) NÃO fica em loop: sai da fila, vira "error" com a mensagem', async () => {
    const server = fakeServer({ quotaFor: 'gordo' })
    const cloud = createCreationsCloud({
      tool: 'studio',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: noWait,
    })
    cloud.enqueueUpload('gordo', async () => ({ json: '{}', meta: { name: 'x', kind: 'classic' } }))
    await cloud.flush()
    expect(cloud.getState().status).toBe('error')
    // Recado de criança, nunca a mensagem crua do servidor.
    expect(cloud.getState().lastError).toBe(CLOUD_MESSAGES.quota)
    expect(cloud.getState().pending).toBe(0)
    expect(server.calls.filter((c) => c.url.endsWith('/upload'))).toHaveLength(1)
    cloud.dispose()
  })

  test('remover na fila cancela o upload pendente do mesmo item e chama o DELETE', async () => {
    const server = fakeServer()
    const cloud = createCreationsCloud({
      tool: 'pinta',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: noWait,
    })
    cloud.enqueueUpload('d-1', async () => ({
      json: '{}',
      meta: { name: 'x', kind: 'pixel-sprite' },
    }))
    cloud.enqueueRemove('d-1')
    await cloud.flush()
    expect(server.calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'DELETE /api/creations/pinta/d-1',
    ])
    cloud.dispose()
  })

  test('`onUploaded` roda SÓ depois do commit confirmado, com o updatedAt do que subiu; `onRemoved` idem', async () => {
    const server = fakeServer()
    const cloud = createCreationsCloud({
      tool: 'pinta',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: noWait,
    })
    const uploaded: Array<{ itemId: string; updatedAt: number; revision: number }> = []
    let removed = 0
    cloud.enqueueUpload(
      'd-1',
      async () => ({ json: '{}', meta: { name: 'x', kind: 'pixel-sprite', updatedAt: 777 } }),
      (r) => uploaded.push(r),
    )
    expect(uploaded).toEqual([])
    await cloud.flush()
    expect(uploaded).toEqual([{ itemId: 'd-1', updatedAt: 777, revision: 1 }])
    cloud.enqueueRemove('d-1', () => {
      removed += 1
    })
    await cloud.flush()
    expect(removed).toBe(1)
    cloud.dispose()
  })

  test('`onRemoved` recebe a revisão autoritativa devolvida pelo DELETE', async () => {
    const server = fakeServer()
    server.items.set('d-1', {
      revision: 7,
      lastReserved: 7,
      pendingRevision: null,
      name: 'nave',
      bytes: 10,
      parts: new Map(),
      pendingParts: null,
    })
    const cloud = createCreationsCloud({
      tool: 'pinta',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: noWait,
    })
    const removals: unknown[] = []

    cloud.enqueueRemove('d-1', (...args: unknown[]) => removals.push(args[0]))
    await cloud.flush()

    expect(removals).toEqual([{ revision: 7 }])
    cloud.dispose()
  })

  test('falha que NÃO é de rede (bug/TypeError qualquer) não vira "sem internet": sai da fila como erro', async () => {
    const server = fakeServer({ bugTimes: 1 })
    const cloud = createCreationsCloud({
      tool: 'studio',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: noWait,
    })
    const seen: string[] = []
    cloud.subscribe((s) => seen.push(s.status))
    cloud.enqueueUpload('p-1', async () => ({ json: '{}', meta: { name: 'x', kind: 'classic' } }))
    await cloud.flush()
    expect(seen).not.toContain('offline')
    expect(cloud.getState().status).toBe('error')
    expect(cloud.getState().lastError).toBe(CLOUD_MESSAGES.generic)
    expect(cloud.getState().pending).toBe(0)
    cloud.dispose()
  })

  test('5xx do servidor: tenta de novo algumas vezes com o recado certo e depois desiste do item (sem loop eterno)', async () => {
    const server = fakeServer({ serverErrorTimes: 10 })
    const cloud = createCreationsCloud({
      tool: 'studio',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: noWait,
    })
    cloud.enqueueUpload('p-1', async () => ({ json: '{}', meta: { name: 'x', kind: 'classic' } }))
    await cloud.flush()
    expect(cloud.getState().status).toBe('error')
    expect(cloud.getState().lastError).toBe(CLOUD_MESSAGES.server)
    expect(cloud.getState().pending).toBe(0)
    expect(server.calls.filter((c) => c.url.endsWith('/upload')).length).toBe(3)
    cloud.dispose()
  })

  test('sessão trocou de perfil (409 VIEWER_MISMATCH): sai da fila com o recado certo', async () => {
    const server = fakeServer({ viewerMismatch: true })
    const cloud = createCreationsCloud({
      tool: 'studio',
      viewerId: 'p1',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: noWait,
    })
    cloud.enqueueUpload('p-1', async () => ({ json: '{}', meta: { name: 'x', kind: 'classic' } }))
    await cloud.flush()
    expect(cloud.getState().status).toBe('error')
    expect(cloud.getState().lastError).toBe(CLOUD_MESSAGES.viewer)
    cloud.dispose()
  })

  test('remover não espera o debounce (sobe na hora); `dispose` depois do `flush` deixa TODA a fila subir', async () => {
    const server = fakeServer()
    const cloud = createCreationsCloud({
      tool: 'pinta',
      fetch: server.fetchImpl,
      idleMs: 60_000,
      wait: noWait,
    })
    cloud.enqueueUpload('a', async () => ({
      json: '{}',
      meta: { name: 'a', kind: 'pixel-sprite' },
    }))
    cloud.enqueueUpload('b', async () => ({
      json: '{}',
      meta: { name: 'b', kind: 'pixel-sprite' },
    }))
    cloud.enqueueRemove('c')
    // Sem flush explícito, o remove já disparou a fila (debounce 0) e a fila drena a, b e c.
    await new Promise((r) => setTimeout(r, 30))
    await cloud.flush().finally(() => cloud.dispose())
    const seen = server.calls.map((c) => `${c.method} ${c.url}`)
    expect(seen).toContain('PUT https://r2.test/creations/a/1')
    expect(seen).toContain('PUT https://r2.test/creations/b/1')
    expect(seen).toContain('DELETE /api/creations/pinta/c')
    expect(cloud.getState().pending).toBe(0)
  })

  test('a rede volta DURANTE o passo que falhou: o acordar não se perde e a fila tenta de novo na hora', async () => {
    const server = fakeServer({ failNetworkTimes: 1 })
    let woke = 0
    // Quando a reserva falhar por rede, o "online" chega ANTES de a fila começar a esperar.
    const fetchImpl: FetchLike = async (input, init) => {
      try {
        return await server.fetchImpl(input, init)
      } catch (error) {
        woke += 1
        window.dispatchEvent(new Event('online'))
        throw error
      }
    }
    const cloud = createCreationsCloud({
      tool: 'pinta',
      fetch: fetchImpl,
      idleMs: 0,
      // Espera "infinita": só o acordar destrava. Sem a guarda, o teste travaria aqui.
      wait: (_ms, wake) => wake,
    })
    cloud.enqueueUpload('d-1', async () => ({
      json: '{}',
      meta: { name: 'x', kind: 'pixel-sprite' },
    }))
    await cloud.flush()
    expect(woke).toBe(1)
    expect(cloud.getState().status).toBe('saved')
    expect(server.calls.filter((c) => c.url.endsWith('/upload'))).toHaveLength(2)
    cloud.dispose()
  })

  test('revisão-base: a reserva leva `baseRevision`; 409 CREATION_STALE_BASE tira o item da fila e chama `onStale` (que resolve e enfileira de novo)', async () => {
    const server = fakeServer({ checkBase: true })
    // A nuvem já tem a revisão 2 do item (outro aparelho subiu).
    server.items.set('p-1', {
      revision: 2,
      lastReserved: 2,
      pendingRevision: null,
      name: 'Nave',
      bytes: 10,
      parts: new Map(),
      pendingParts: null,
    })
    const cloud = createCreationsCloud({
      tool: 'studio',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: noWait,
    })
    const stale: string[] = []
    const uploaded: number[] = []
    let base = 0
    const enqueue = () =>
      cloud.enqueueUpload(
        'p-1',
        async () => ({ json: '{}', meta: { name: 'Nave', kind: 'classic', baseRevision: base } }),
        (r) => uploaded.push(r.revision),
        async ({ itemId }) => {
          stale.push(itemId)
          // O adaptador "resolve": passa a conhecer a revisão corrente e sobe de novo.
          base = 2
          enqueue()
        },
      )
    enqueue()
    await cloud.flush()
    // 1ª reserva com base 0 → 409; nada foi PUTado; onStale rodou; 2ª reserva com base 2 → ok.
    expect(stale).toEqual(['p-1'])
    const seen = server.calls.map((c) => `${c.method} ${c.url}`)
    expect(seen.filter((c) => c.endsWith('/upload')).length).toBe(2)
    expect(seen.filter((c) => c.startsWith('PUT ')).length).toBe(1)
    expect(server.calls[0]?.body).toMatchObject({ baseRevision: 0 })
    expect(uploaded).toEqual([3])
    expect(cloud.getState().status).toBe('saved')
    // Sem `onStale`, o item sai da fila com o recado certo (não fica em loop).
    server.items.set('p-2', {
      revision: 5,
      lastReserved: 5,
      pendingRevision: null,
      name: 'Outro',
      bytes: 10,
      parts: new Map(),
      pendingParts: null,
    })
    cloud.enqueueUpload('p-2', async () => ({
      json: '{}',
      meta: { name: 'Outro', kind: 'classic', baseRevision: 1 },
    }))
    await cloud.flush()
    expect(cloud.getState().pending).toBe(0)
    expect(cloud.getState().lastError).toBe(CLOUD_MESSAGES.staleFailed)
    cloud.dispose()
  })

  test('apagar ENQUANTO o upload do mesmo item voa: o upload termina, mas `onUploaded` NÃO roda (a lápide manda) e o DELETE sai', async () => {
    const server = fakeServer({ delayMs: 5 })
    const cloud = createCreationsCloud({
      tool: 'pinta',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: noWait,
    })
    let uploaded = 0
    let removed = 0
    cloud.enqueueUpload(
      'd-1',
      async () => ({ json: '{}', meta: { name: 'x', kind: 'pixel-sprite', updatedAt: 1 } }),
      () => {
        uploaded += 1
      },
    )
    const flushing = cloud.flush()
    // A reserva já saiu; o apagar chega no meio do PUT.
    await new Promise((r) => setTimeout(r, 8))
    cloud.enqueueRemove('d-1', () => {
      removed += 1
    })
    await flushing
    await cloud.flush()
    expect(uploaded).toBe(0)
    expect(removed).toBe(1)
    expect(server.calls.map((c) => `${c.method} ${c.url}`)).toContain(
      'DELETE /api/creations/pinta/d-1',
    )
    cloud.dispose()
  })

  test('PUT no R2 falhou (403, URL vencida): não é "sem posse" — tenta de novo com reserva (URL) nova e termina', async () => {
    const server = fakeServer({ putFailTimes: 1 })
    const cloud = createCreationsCloud({
      tool: 'pinta',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: noWait,
    })
    const errors: Array<string | null> = []
    cloud.subscribe((s: CloudSyncState) => errors.push(s.lastError))
    cloud.enqueueUpload('d-1', async () => ({
      json: '{}',
      meta: { name: 'x', kind: 'pixel-sprite' },
    }))
    await cloud.flush()
    expect(errors).not.toContain(CLOUD_MESSAGES.forbidden)
    expect(cloud.getState().status).toBe('saved')
    const puts = server.calls.filter((c) => c.method === 'PUT').map((c) => c.url)
    expect(puts).toEqual(['https://r2.test/creations/d-1/1', 'https://r2.test/creations/d-1/2'])
    cloud.dispose()
  })

  test('`flush({timeoutMs})` volta no teto mesmo com a fila presa (sem internet); a fila continua sozinha', async () => {
    const server = fakeServer({ failNetworkTimes: 50 })
    const cloud = createCreationsCloud({
      tool: 'studio',
      fetch: server.fetchImpl,
      idleMs: 0,
      // Espera de verdade (curta) entre tentativas: a fila fica presa "offline".
      wait: (_ms, wake) => Promise.race([new Promise<void>((r) => setTimeout(r, 20)), wake]),
    })
    cloud.enqueueUpload('p-1', async () => ({ json: '{}', meta: { name: 'a', kind: 'classic' } }))
    const started = Date.now()
    await cloud.flush({ timeoutMs: 40 })
    expect(Date.now() - started).toBeLessThan(2000)
    expect(cloud.getState().status).toBe('offline')
    expect(cloud.getState().pending).toBe(1)
    cloud.dispose({ abort: true })
  })

  test('um upload enfileirado logo depois de um apagar NÃO empurra o DELETE para o debounce', async () => {
    const server = fakeServer()
    const cloud = createCreationsCloud({
      tool: 'pinta',
      fetch: server.fetchImpl,
      idleMs: 400,
      wait: noWait,
    })
    cloud.enqueueRemove('b')
    cloud.enqueueUpload('a', async () => ({
      json: '{}',
      meta: { name: 'a', kind: 'pixel-sprite' },
    }))
    await new Promise((r) => setTimeout(r, 60))
    // O DELETE (prazo 0) já saiu; o `a` pega carona no mesmo passo ou espera o debounce.
    expect(server.calls.map((c) => `${c.method} ${c.url}`)).toContain(
      'DELETE /api/creations/pinta/b',
    )
    await cloud.flush()
    cloud.dispose()
  })

  test('429 da borda é TEMPORÁRIO: espera o `retry-after` e termina (não derruba o item); o selo segue "guardando"', async () => {
    const server = fakeServer({ rateLimitTimes: 2 })
    const waits: number[] = []
    const cloud = createCreationsCloud({
      tool: 'pinta',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: async (ms) => {
        waits.push(ms)
      },
    })
    const statuses: string[] = []
    cloud.subscribe((s: CloudSyncState) => statuses.push(s.status))
    cloud.enqueueUpload('d-1', async () => ({
      json: '{}',
      meta: { name: 'x', kind: 'pixel-sprite' },
    }))
    await cloud.flush()
    expect(cloud.getState().status).toBe('saved')
    expect(statuses).not.toContain('error')
    // Duas esperas de 1 s (o `retry-after` da borda), depois a subida completa.
    expect(waits.filter((ms) => ms === 1000).length).toBe(2)
    expect(server.calls.filter((c) => c.url.endsWith('/upload')).length).toBe(3)
    cloud.dispose()
  })

  test('a espera do `retry-after` (429) NÃO é interrompida por `flush`/`online`: um flush no meio não gasta tentativa', async () => {
    const server = fakeServer({ rateLimitTimes: 1 })
    const cloud = createCreationsCloud({
      tool: 'pinta',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: (ms, wake) => Promise.race([new Promise<void>((r) => setTimeout(r, ms)), wake]),
    })
    cloud.enqueueUpload('d-1', async () => ({ json: '{"x":1}', meta: { updatedAt: 1 } }))
    // Deixa o primeiro passo levar o 429 (retry-after: 1 s) e começar a esperar.
    await new Promise((r) => setTimeout(r, 50))
    const before = server.calls.filter((c) => c.url.endsWith('/upload')).length
    expect(before).toBe(1)
    // Vários "acordares" durante a espera (troca de aba, flush ao sair): não batem na borda.
    await cloud.flush({ timeoutMs: 30 })
    await cloud.flush({ timeoutMs: 30 })
    window.dispatchEvent(new Event('online'))
    await new Promise((r) => setTimeout(r, 100))
    expect(server.calls.filter((c) => c.url.endsWith('/upload')).length).toBe(1)
    // Passado o retry-after (1 s do fake), sobe e termina.
    await new Promise((r) => setTimeout(r, 1100))
    expect(server.calls.filter((c) => c.url.endsWith('/upload')).length).toBe(2)
    expect(cloud.getState().status).toBe('saved')
  })

  test('5xx com tentativa ainda por fazer mantém o selo em "guardando" (sem anúncio de erro); erro só ao desistir', async () => {
    const server = fakeServer({ serverErrorTimes: 1 })
    const cloud = createCreationsCloud({
      tool: 'pinta',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: noWait,
    })
    const statuses: string[] = []
    cloud.subscribe((state) => statuses.push(state.status))
    cloud.enqueueUpload('d-1', async () => ({ json: '{"x":1}', meta: { updatedAt: 1 } }))
    await cloud.flush()
    expect(cloud.getState().status).toBe('saved')
    expect(statuses).not.toContain('error')
  })

  test('`anySignal`: compõe dois sinais com e sem `AbortSignal.any` (Safari antigo)', async () => {
    const { anySignal } = await import('../src/lib/creations-cloud')
    const a = new AbortController()
    const b = new AbortController()
    const composed = anySignal(a.signal, b.signal)
    expect(composed.aborted).toBe(false)
    b.abort(new Error('b'))
    expect(composed.aborted).toBe(true)
    const nativeAny = (AbortSignal as { any?: unknown }).any
    try {
      ;(AbortSignal as { any?: unknown }).any = undefined
      const c = new AbortController()
      const d = new AbortController()
      const fallback = anySignal(c.signal, d.signal)
      expect(fallback.aborted).toBe(false)
      c.abort()
      expect(fallback.aborted).toBe(true)
      // Um já abortado na entrada.
      expect(anySignal(c.signal, new AbortController().signal).aborted).toBe(true)
    } finally {
      ;(AbortSignal as { any?: unknown }).any = nativeAny
    }
  })

  test('PARTES: ticket SEM `parts` quando partes foram declaradas (serviço antigo): erro retentável, nunca commit do manifesto sozinho', async () => {
    const server = fakeServer()
    const legacy: FetchLike = async (input, init) => {
      const res = await server.fetchImpl(input, init)
      if (String(input).endsWith('/upload')) {
        const body = (await res.json()) as Record<string, unknown>
        const { parts: _parts, ...rest } = body
        return new Response(JSON.stringify(rest), {
          status: res.status,
          headers: { 'content-type': 'application/json' },
        })
      }
      return res
    }
    const cloud = createCreationsCloud({ tool: 'studio', fetch: legacy })
    const a = await partOf({ id: 'a', dataUrl: 'data:image/png;base64,AAAA' })
    await expect(
      cloud.upload({ itemId: 'jogo', name: 'J', kind: 'classic', updatedAt: 1 }, '{}', [a]),
    ).rejects.toMatchObject({ code: 'CLOUD_PARTS_UNSUPPORTED', status: 503 })
    expect(server.calls.some((c) => c.url.endsWith('/commit'))).toBe(false)
  })

  test('muito pendente (primeira sincronia): a fila anda no compasso da borda (um passo a cada 250 ms)', async () => {
    const server = fakeServer()
    const waits: number[] = []
    const cloud = createCreationsCloud({
      tool: 'pinta',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: async (ms) => {
        waits.push(ms)
      },
    })
    for (let i = 0; i < 30; i += 1) {
      cloud.enqueueUpload(`d-${i}`, async () => ({
        json: '{}',
        meta: { name: `d-${i}`, kind: 'pixel-sprite' },
      }))
    }
    await cloud.flush()
    expect(cloud.getState().pending).toBe(0)
    // Compasso só enquanto SOBRAM mais de 10 pendentes depois do passo: 30 itens → 19 esperas
    // (após os passos 1..19 restam 29..11); do 20º em diante (≤ 10) a fila anda solta.
    expect(waits.filter((ms) => ms === 250).length).toBe(19)
    cloud.dispose()
  })

  test('o selo só é avisado quando algo VISÍVEL muda: 10 enfileiramentos seguidos = 1 aviso de "guardando"', async () => {
    const server = fakeServer()
    const cloud = createCreationsCloud({
      tool: 'pinta',
      fetch: server.fetchImpl,
      idleMs: 60_000,
      wait: noWait,
    })
    const statuses: string[] = []
    cloud.subscribe((s: CloudSyncState) => statuses.push(s.status))
    for (let i = 0; i < 10; i += 1) {
      cloud.enqueueUpload('d-1', async () => ({ json: '{}', meta: { name: 'x', kind: 'k' } }))
    }
    // 10 enfileiramentos do MESMO item: pending continua 1, status continua 'saving' → 1 aviso.
    expect(statuses).toEqual(['saving'])
    cloud.dispose()
  })

  test('PARTES: a 1ª subida declara sem bytes → 409 "preciso dos bytes" → comprime SÓ as pedidas, reserva de novo, PUT das partes + manifesto, commit com `uploadedParts`', async () => {
    expect(hashSupported()).toBe(true)
    const server = fakeServer()
    const cloud = createCreationsCloud({ tool: 'studio', fetch: server.fetchImpl })
    const a = await partOf({ id: 'a', name: 'Nave', dataUrl: 'data:image/png;base64,AAAA' })
    const b = await partOf({ id: 'b', name: 'Tiro', dataUrl: 'data:image/png;base64,BBBB' })
    let readsA = 0
    const manifest = JSON.stringify({
      format: 'sz-studio-parts',
      version: 1,
      assets: [a.hash, b.hash],
    })
    const meta = { itemId: 'jogo', name: 'Jogo', kind: 'classic', updatedAt: 1 }
    const result = await cloud.upload(meta, manifest, [
      {
        hash: a.hash,
        text: () => {
          readsA += 1
          return a.json
        },
      },
      b,
      // Repetida: o cliente declara uma vez só (o servidor recusa hash duplicado).
      b,
    ])
    expect(result).toEqual({ revision: 1 })
    const seen = server.calls.map((c) => `${c.method} ${c.url}`)
    // Duas reservas (a 1ª sem bytes), os dois PUTs de parte, o PUT do manifesto, o commit.
    expect(seen.filter((c) => c.endsWith('/upload'))).toHaveLength(2)
    const first = server.calls[0]?.body as { parts: unknown[] }
    expect(first.parts).toEqual([{ hash: a.hash }, { hash: b.hash }])
    const second = server.calls[1]?.body as { parts: Array<{ hash: string; bytes?: number }> }
    expect(second.parts.map((p) => p.hash)).toEqual([a.hash, b.hash])
    expect(second.parts.every((p) => typeof p.bytes === 'number' && p.bytes > 0)).toBe(true)
    expect(readsA).toBe(1)
    expect(seen).toContain(`PUT https://r2.test/creations/jogo/parts/${a.hash}`)
    expect(seen).toContain(`PUT https://r2.test/creations/jogo/parts/${b.hash}`)
    expect(seen).toContain('PUT https://r2.test/creations/jogo/1')
    // O manifesto vem DEPOIS das partes.
    expect(seen.lastIndexOf('PUT https://r2.test/creations/jogo/1')).toBeGreaterThan(
      seen.indexOf(`PUT https://r2.test/creations/jogo/parts/${b.hash}`),
    )
    const commit = server.calls.find((c) => c.url.endsWith('/commit'))?.body as {
      revision: number
      uploadedParts: string[]
    }
    expect(commit.revision).toBe(1)
    expect([...commit.uploadedParts].sort()).toEqual([a.hash, b.hash].sort())
    // O que subiu como parte é o JSON canônico, comprimido.
    const partBlob = server.blobs.get(`https://r2.test/creations/jogo/parts/${a.hash}`)
    expect(await gunzipToText(partBlob as Uint8Array)).toBe(a.json)

    // 2ª subida: só o programa mudou — UMA reserva (sem bytes), nada de parte comprimida, só o
    // manifesto sobe, commit SEM `uploadedParts` (como o fio simples).
    server.calls.length = 0
    readsA = 0
    await cloud.upload({ ...meta, updatedAt: 2 }, `${manifest} `, [a, b])
    const again = server.calls.map((c) => `${c.method} ${c.url}`)
    expect(again).toEqual([
      'POST /api/creations/studio/jogo/upload',
      'PUT https://r2.test/creations/jogo/2',
      'POST /api/creations/studio/jogo/commit',
    ])
    expect(readsA).toBe(0)
    expect(server.calls[2]?.body).toEqual({ revision: 2 })

    // 3ª subida: trocou um desenho (B sai, C entra): só C é comprimida e enviada.
    server.calls.length = 0
    const c = await partOf({ id: 'c', name: 'Nave 2', dataUrl: 'data:image/png;base64,CCCC' })
    await cloud.upload({ ...meta, updatedAt: 3 }, `${manifest}  `, [a, c])
    const third = server.calls.map((x) => `${x.method} ${x.url}`)
    expect(third.filter((x) => x.includes('/parts/'))).toEqual([
      `PUT https://r2.test/creations/jogo/parts/${c.hash}`,
    ])
    expect((server.calls.at(-1)?.body as { uploadedParts: string[] }).uploadedParts).toEqual([
      c.hash,
    ])
  })

  test('PARTES: download lista as partes e `fetchPart` baixa, descomprime e CONFERE o hash (parte trocada no R2 é recusada)', async () => {
    const a = await partOf({ id: 'a', dataUrl: 'data:image/png;base64,AAAA' })
    const b = await partOf({ id: 'b', dataUrl: 'data:image/png;base64,BBBB' })
    const server = fakeServer({ corruptPart: b.hash })
    const cloud = createCreationsCloud({ tool: 'studio', fetch: server.fetchImpl })
    const manifest = JSON.stringify({
      format: 'sz-studio-parts',
      version: 1,
      assets: [a.hash, b.hash],
    })
    await cloud.upload({ itemId: 'jogo', name: 'Jogo', kind: 'classic', updatedAt: 1 }, manifest, [
      a,
      b,
    ])
    const downloaded = await cloud.download('jogo')
    expect(downloaded?.json).toBe(manifest)
    expect(downloaded?.parts.map((p) => p.hash).sort()).toEqual([a.hash, b.hash].sort())
    expect(await downloaded?.fetchPart(a.hash)).toBe(a.json)
    await expect(downloaded?.fetchPart(b.hash)).rejects.toMatchObject({
      code: 'CREATION_PART_CORRUPT',
    })
    await expect(downloaded?.fetchPart('f'.repeat(64))).rejects.toMatchObject({
      code: 'CREATION_PART_MISSING',
    })
    // Fio simples (sem partes): `parts` vazio.
    await cloud.upload({ itemId: 'desenho', name: 'D', kind: 'pixel', updatedAt: 1 }, '{"x":1}')
    expect((await cloud.download('desenho'))?.parts).toEqual([])
  })

  test('PARTES: 409 CREATION_PART_MISSING no commit é TEMPORÁRIO — a fila reserva de novo e termina', async () => {
    const a = await partOf({ id: 'a', dataUrl: 'data:image/png;base64,AAAA' })
    const server = fakeServer({ partMissingTimes: 1 })
    const cloud = createCreationsCloud({
      tool: 'studio',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: noWait,
    })
    const uploaded: number[] = []
    cloud.enqueueUpload(
      'jogo',
      async () => ({
        json: JSON.stringify({ format: 'sz-studio-parts', version: 1, assets: [a.hash] }),
        meta: { name: 'Jogo', kind: 'classic', updatedAt: 5 },
        parts: [a],
      }),
      ({ revision }) => uploaded.push(revision),
    )
    await cloud.flush()
    expect(uploaded).toEqual([2])
    expect(cloud.getState().status).toBe('saved')
    expect(server.calls.filter((c) => c.url.endsWith('/commit'))).toHaveLength(2)
  })

  test('canonicalJson ordena chaves em profundidade e tira `undefined` (o hash não depende da ordem de quem montou o objeto)', async () => {
    const x = canonicalJson({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: undefined } })
    const y = canonicalJson({ a: { d: [3, { y: 2, z: 1 }] }, b: 1 })
    expect(x).toBe(y)
    expect(x).toBe('{"a":{"d":[3,{"y":2,"z":1}]},"b":1}')
    expect(await sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })

  test('revisão vencida ENTRE a reserva e o commit (outro aparelho reservou depois): 409 no commit, a fila reserva de novo e termina', async () => {
    const server = fakeServer()
    const cloud = createCreationsCloud({
      tool: 'pinta',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: noWait,
    })
    // Durante o PUT do nosso blob, "outro aparelho" reserva a revisão seguinte do mesmo item.
    let intruded = false
    const original = server.fetchImpl
    const intruding: FetchLike = async (input, init) => {
      const res = await original(input, init)
      if (!intruded && String(input).startsWith('https://r2.test/') && init?.method === 'PUT') {
        intruded = true
        await original('/api/creations/pinta/d-1/upload', {
          method: 'POST',
          body: JSON.stringify({ name: 'nave', bytes: 5 }),
        })
      }
      return res
    }
    const cloud2 = createCreationsCloud({
      tool: 'pinta',
      fetch: intruding,
      idleMs: 0,
      wait: noWait,
    })
    cloud2.enqueueUpload('d-1', async () => ({
      json: '{"x":1}',
      meta: { name: 'nave', updatedAt: 1 },
    }))
    await cloud2.flush()
    expect(cloud2.getState().status).toBe('saved')
    // 1º commit (revisão 1) → 409 mismatch; a fila reservou de novo (revisão 3) e commitou.
    const commits = server.calls.filter((c) => c.url.endsWith('/commit'))
    expect(commits.map((c) => (c.body as { revision: number }).revision)).toEqual([1, 3])
    expect(server.items.get('d-1')?.revision).toBe(3)
    cloud.dispose()
  })

  test('PARTES: `dispose({abort:true})` no meio dos PUTs das partes não commita nem lança; `fetchPart` com o sinal abortado rejeita com AbortError', async () => {
    const a = await partOf({ id: 'a', dataUrl: 'data:image/png;base64,AAAA' })
    const b = await partOf({ id: 'b', dataUrl: 'data:image/png;base64,BBBB' })
    const server = fakeServer({ delayMs: 15 })
    // ⚠️ Corta no INSTANTE em que o 1º PUT de parte chega ao servidor, não "depois de
    // 60 ms": o fakeServer só confere `signal.aborted` na ENTRADA de cada chamada, então
    // um abort por relógio disputava com o fluxo reserva→409→reserva→PUT→PUT→commit —
    // no runner lento do CI (19/08) o commit já tinha saído quando o abort chegou
    // (local passava 3/3 por ser rápido). Gatilhado pelo evento, a ordem é garantida:
    // o PUT em voo termina, o commit que viria depois encontra o sinal abortado.
    let cortou = false
    let abortar: (() => void) | null = null
    const cortandoNoPrimeiroPut: FetchLike = async (input, init) => {
      if (!cortou && String(input).startsWith('https://r2.test/') && init?.method === 'PUT') {
        cortou = true
        abortar?.()
      }
      return server.fetchImpl(input, init)
    }
    const cloud = createCreationsCloud({
      tool: 'studio',
      fetch: cortandoNoPrimeiroPut,
      idleMs: 0,
      wait: noWait,
    })
    abortar = () => cloud.dispose({ abort: true })
    const manifest = JSON.stringify({
      format: 'sz-studio-parts',
      version: 1,
      assets: [a.hash, b.hash],
    })
    cloud.enqueueUpload('jogo', async () => ({
      json: manifest,
      meta: { name: 'Jogo', kind: 'classic', updatedAt: 1 },
      parts: [a, b],
    }))
    // Deixa a fila andar até o 1º PUT (que dispara o corte) e o que sobrar assentar.
    await new Promise((r) => setTimeout(r, 200))
    expect(cortou).toBe(true)
    expect(server.calls.some((c) => c.url.endsWith('/commit'))).toBe(false)

    // Download com sinal abortado no meio das partes.
    const server2 = fakeServer()
    const cloud2 = createCreationsCloud({ tool: 'studio', fetch: server2.fetchImpl })
    await cloud2.upload({ itemId: 'jogo', name: 'Jogo', kind: 'classic', updatedAt: 1 }, manifest, [
      a,
      b,
    ])
    const controller = new AbortController()
    const downloaded = await cloud2.download('jogo', { signal: controller.signal })
    controller.abort()
    await expect(downloaded?.fetchPart(a.hash)).rejects.toMatchObject({ name: 'AbortError' })
  })

  test('produtor que devolve null não sobe nada (o item sumiu antes de subir)', async () => {
    const server = fakeServer()
    const cloud = createCreationsCloud({
      tool: 'pinta',
      fetch: server.fetchImpl,
      idleMs: 0,
      wait: noWait,
    })
    cloud.enqueueUpload('d-1', async () => null)
    await cloud.flush()
    expect(server.calls).toHaveLength(0)
    expect(cloud.getState().status).toBe('saved')
    cloud.dispose()
  })
})
