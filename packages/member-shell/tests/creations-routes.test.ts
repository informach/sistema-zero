import { beforeEach, describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server; neutraliza para testar os handlers.
mock.module('server-only', () => ({}))

/** R2 falso: registra o que o BFF assinou/apagou (nada toca a rede). */
const r2 = {
  presignPut: [] as Array<{
    key: string
    contentType: string
    contentLength: number
    expiresInSeconds?: number
  }>,
  presignGet: [] as string[],
  deleted: [] as string[],
  /** Chamadas ao apagar em LOTE (partes): cada entrada é a lista de chaves de uma chamada. */
  deletedBatches: [] as string[][],
  /** HEADs feitos no commit (partes) e o que cada um responde (padrão: existe). */
  heads: [] as string[],
  headResult: {} as Record<string, boolean | null>,
  failDelete: false,
  /** O DELETE no R2 fica pendurado (nunca resolve): a resposta não pode esperar por ele. */
  hangDelete: false,
  /** Liga o apagar em lote no R2 falso (sem ele, o BFF cai no apagar um a um). */
  batchDelete: false,
}
const storage = {
  presignPut: async (input: {
    key: string
    contentType: string
    contentLength: number
    expiresInSeconds?: number
  }) => {
    r2.presignPut.push(input)
    return `https://r2.test/put/${input.key}`
  },
  presignGet: async (key: string) => {
    r2.presignGet.push(key)
    return `https://r2.test/get/${key}`
  },
  deleteObject: async (key: string) => {
    if (r2.hangDelete) await new Promise<never>(() => {})
    if (r2.failDelete) throw new Error('R2 fora do ar')
    r2.deleted.push(key)
  },
  deleteObjects: async (keys: readonly string[]) => {
    if (!r2.batchDelete) {
      for (const key of keys) await storage.deleteObject(key)
      return
    }
    if (r2.hangDelete) await new Promise<never>(() => {})
    if (r2.failDelete) throw new Error('R2 fora do ar')
    r2.deletedBatches.push([...keys])
    r2.deleted.push(...keys)
  },
  headObject: async (key: string) => {
    r2.heads.push(key)
    return key in r2.headResult ? (r2.headResult[key] as boolean | null) : true
  },
}
const HASH_A = 'a'.repeat(64)
const HASH_B = 'b'.repeat(64)
const HASH_C = 'c'.repeat(64)
/** A chave de uma parte leva a revisão em que subiu (`<hash>.<rev>.gz`). */
const partKey = (hash: string, rev = 3) => `creations/user-1/studio/proj-1/parts/${hash}.${rev}.gz`

const { createCreationsRoutes } = await import('../src/routes/creations')

const USER = {
  id: 'user-1',
  email: 'aluno@example.com',
  firstName: 'Aluno',
  lastName: 'Teste',
  role: 'customer',
  status: 'active',
}
const IMPERSONATED = { ...USER, act: { sub: 'admin-1', email: 'admin@example.com' } }

const SUMMARY = {
  tool: 'studio',
  itemId: 'proj-1',
  name: 'Nave',
  kind: 'classic',
  itemUpdatedAt: '2026-08-18T12:00:00.000Z',
  revision: 2,
  bytes: 1234,
  thumb: null,
  syncedAt: '2026-08-18T12:00:01.000Z',
}

function buildRoutes(
  over: {
    session?: unknown | null
    members?: Record<string, unknown>
    storage?: Record<string, unknown>
  } = {},
) {
  const calls: Record<string, unknown[]> = {}
  const record =
    (name: string, result: unknown) =>
    async (...args: unknown[]) => {
      const list = calls[name] ?? []
      list.push(args)
      calls[name] = list
      return result
    }
  const members = {
    listCreations: record('listCreations', { status: 200, body: { items: [SUMMARY] } }),
    reserveCreationUpload: record('reserveCreationUpload', {
      status: 200,
      body: { revision: 2, storageKey: 'creations/u/studio/proj-1/2.json.gz', bytes: 1234 },
    }),
    commitCreationUpload: record('commitCreationUpload', {
      status: 200,
      body: { item: SUMMARY, previousStorageKey: 'creations/u/studio/proj-1/1.json.gz' },
    }),
    getCreationDownload: record('getCreationDownload', {
      status: 200,
      body: {
        storageKey: 'creations/u/studio/proj-1/2.json.gz',
        revision: 2,
        bytes: 1234,
        summary: SUMMARY,
      },
    }),
    deleteCreation: record('deleteCreation', {
      status: 200,
      body: { deleted: true, storageKey: 'creations/u/studio/proj-1/2.json.gz', revision: 2 },
    }),
    ...over.members,
  }
  const routes = createCreationsRoutes({
    // `session: null` = sem sessão (o `??` engoliria o null).
    session: { getSession: async () => (over.session === undefined ? USER : over.session) },
    members,
    storage: over.storage ?? storage,
  } as never)
  return { routes, calls }
}

const post = (body: unknown) =>
  new Request('https://community.test/api', { method: 'POST', body: JSON.stringify(body) })
const deleteRequest = (baseRevision: number) =>
  new Request('https://community.test/api', {
    method: 'DELETE',
    body: JSON.stringify({ baseRevision }),
  })
const item = { params: Promise.resolve({ tool: 'studio', itemId: 'proj-1' }) }

beforeEach(() => {
  r2.presignPut.length = 0
  r2.presignGet.length = 0
  r2.deleted.length = 0
  r2.deletedBatches.length = 0
  r2.heads.length = 0
  r2.headResult = {}
  r2.failDelete = false
  r2.hangDelete = false
  r2.batchDelete = false
})

/** Espera os `after()`/microtasks do BFF (o apagar no R2 acontece DEPOIS da resposta). */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

describe('BFF das criações — reserva', () => {
  test('corta o nome no teto (120) e descarta miniatura grande, em vez de recusar; assina o PUT com o Content-Length ecoado pelo members', async () => {
    const { routes, calls } = buildRoutes()
    const res = await routes.creationsUploadUrl.POST(
      post({
        name: 'N'.repeat(200),
        kind: 'classic',
        itemUpdatedAt: '2026-08-18T12:00:00.000Z',
        bytes: 1234,
        thumb: `data:image/png;base64,${'A'.repeat(20_000)}`,
      }),
      item,
    )
    expect(res.status).toBe(200)
    const sent = (calls.reserveCreationUpload?.[0] as unknown[])[2] as Record<string, unknown>
    expect((sent.name as string).length).toBe(120)
    expect(sent.thumb).toBeNull()
    expect(sent.bytes).toBe(1234)
    expect(r2.presignPut).toEqual([
      {
        key: 'creations/u/studio/proj-1/2.json.gz',
        contentType: 'application/gzip',
        contentLength: 1234,
        expiresInSeconds: 600,
      },
    ])
    const body = await res.json()
    expect(body.revision).toBe(2)
    expect(body.headers['content-type']).toBe('application/gzip')
    expect(body.uploadUrl).toContain('/put/')
  })

  test('bytes acima do teto por item é 409 de quota com "grande demais" (o selo diz a verdade); corpo malformado ou itemId com ":" são 400 (nunca chegam ao members)', async () => {
    const { routes, calls } = buildRoutes()
    const tooBig = await routes.creationsUploadUrl.POST(
      post({
        name: 'x',
        kind: 'y',
        itemUpdatedAt: '2026-08-18T12:00:00.000Z',
        bytes: 41 * 1024 * 1024,
      }),
      item,
    )
    expect(tooBig.status).toBe(409)
    const tooBigBody = await tooBig.json()
    expect(tooBigBody.error.code).toBe('CREATION_QUOTA_EXCEEDED')
    expect(tooBigBody.error.message).toMatch(/grande demais/)
    const broken = await routes.creationsUploadUrl.POST(post({ name: 'x' }), item)
    expect(broken.status).toBe(400)
    const badId = await routes.creationsUploadUrl.POST(
      post({ name: 'x', kind: 'y', itemUpdatedAt: '2026-08-18T12:00:00.000Z', bytes: 1 }),
      { params: Promise.resolve({ tool: 'studio', itemId: 'a:b' }) },
    )
    expect(badId.status).toBe(400)
    expect(calls.reserveCreationUpload).toBeUndefined()
  })
})

describe('BFF das criações — PARTES (assets do Estúdio por conteúdo)', () => {
  test('reserva: repassa `parts` ao members e assina UM PUT por parte faltante (Content-Length da parte), além do manifesto', async () => {
    let sentToMembers: unknown
    const { routes } = buildRoutes({
      members: {
        reserveCreationUpload: async (...args: unknown[]) => {
          sentToMembers = args[2]
          return {
            status: 200,
            body: {
              revision: 3,
              storageKey: 'creations/user-1/studio/proj-1/3.json.gz',
              bytes: 2048,
              parts: [
                { hash: HASH_A, bytes: 1000, storageKey: partKey(HASH_A) },
                { hash: HASH_C, bytes: 3000, storageKey: partKey(HASH_C) },
              ],
            },
          }
        },
      },
    })
    const res = await routes.creationsUploadUrl.POST(
      post({
        name: 'Nave',
        kind: 'classic',
        itemUpdatedAt: '2026-08-18T12:00:00.000Z',
        bytes: 2048,
        parts: [{ hash: HASH_A, bytes: 1000 }, { hash: HASH_B }, { hash: HASH_C, bytes: 3000 }],
      }),
      item,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.revision).toBe(3)
    expect(body.uploadUrl).toBe('https://r2.test/put/creations/user-1/studio/proj-1/3.json.gz')
    expect(body.parts).toEqual([
      { hash: HASH_A, bytes: 1000, uploadUrl: `https://r2.test/put/${partKey(HASH_A)}` },
      { hash: HASH_C, bytes: 3000, uploadUrl: `https://r2.test/put/${partKey(HASH_C)}` },
    ])
    expect(r2.presignPut.map((p) => [p.key, p.contentLength, p.contentType])).toEqual([
      ['creations/user-1/studio/proj-1/3.json.gz', 2048, 'application/gzip'],
      [partKey(HASH_A), 1000, 'application/gzip'],
      [partKey(HASH_C), 3000, 'application/gzip'],
    ])
    expect((sentToMembers as { parts: unknown }).parts).toEqual([
      { hash: HASH_A, bytes: 1000 },
      { hash: HASH_B },
      { hash: HASH_C, bytes: 3000 },
    ])
  })

  test('reserva: total declarado (manifesto + partes) acima de 40 MB é 409 de quota SEM ir ao members; 129 partes ou hash fora do padrão são 400', async () => {
    const { routes, calls } = buildRoutes()
    const base = { name: 'Nave', kind: 'classic', itemUpdatedAt: '2026-08-18T12:00:00.000Z' }
    const tooBig = await routes.creationsUploadUrl.POST(
      post({
        ...base,
        bytes: 1024,
        parts: [
          { hash: HASH_A, bytes: 30 * 1024 * 1024 },
          { hash: HASH_B, bytes: 11 * 1024 * 1024 },
        ],
      }),
      item,
    )
    expect(tooBig.status).toBe(409)
    expect((await tooBig.json()).error.code).toBe('CREATION_QUOTA_EXCEEDED')
    const many = Array.from({ length: 129 }, (_, i) => ({
      hash: i.toString(16).padStart(64, '0'),
      bytes: 1,
    }))
    expect(
      (await routes.creationsUploadUrl.POST(post({ ...base, bytes: 1, parts: many }), item)).status,
    ).toBe(400)
    expect(
      (
        await routes.creationsUploadUrl.POST(
          post({ ...base, bytes: 1, parts: [{ hash: 'ABC', bytes: 1 }] }),
          item,
        )
      ).status,
    ).toBe(400)
    expect(calls.reserveCreationUpload).toBeUndefined()
  })

  test('commit: confere as `uploadedParts` no R2 (HEAD, chave com a revisão do commit) antes do members; 404 definitivo é 409 CREATION_PART_MISSING com os hashes e o members NÃO é chamado', async () => {
    r2.headResult[partKey(HASH_B, 3)] = false
    const { routes, calls } = buildRoutes()
    const res = await routes.creationsCommit.POST(
      post({ revision: 3, uploadedParts: [HASH_A, HASH_B] }),
      item,
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('CREATION_PART_MISSING')
    expect(body.details).toEqual({ hashes: [HASH_B] })
    expect([...r2.heads].sort()).toEqual([partKey(HASH_A, 3), partKey(HASH_B, 3)].sort())
    expect(calls.commitCreationUpload).toBeUndefined()
  })

  test('reserva com partes declaradas mas members SEM `parts` na resposta (members antigo/rollback): 503 retentável, nunca um ticket sem as faltantes', async () => {
    const { routes } = buildRoutes({
      members: {
        reserveCreationUpload: async () => ({
          status: 200,
          body: { revision: 3, storageKey: 'creations/user-1/studio/proj-1/3.json.gz', bytes: 10 },
        }),
      },
    })
    const res = await routes.creationsUploadUrl.POST(
      post({
        name: 'Nave',
        kind: 'classic',
        itemUpdatedAt: '2026-08-18T12:00:00.000Z',
        bytes: 10,
        parts: [{ hash: HASH_A, bytes: 5 }],
      }),
      item,
    )
    expect(res.status).toBe(503)
    expect((await res.json()).error.code).toBe('UPSTREAM_INCOMPATIBLE')
    expect(r2.presignPut).toEqual([])
    // Sem partes declaradas (Pinta), a mesma resposta do members vira ticket normal.
    const plain = await routes.creationsUploadUrl.POST(
      post({ name: 'D', kind: 'pixel', itemUpdatedAt: '2026-08-18T12:00:00.000Z', bytes: 10 }),
      item,
    )
    expect(plain.status).toBe(200)
    expect((await plain.json()).parts).toEqual([])
  })

  test('409 CREATION_PARTS_NEED_BYTES do members atravessa o BFF com `details.hashes` (o cliente comprime só essas)', async () => {
    const { routes } = buildRoutes({
      members: {
        reserveCreationUpload: async () => ({
          status: 409,
          body: {
            error: { code: 'CREATION_PARTS_NEED_BYTES', message: 'Partes sem bytes' },
            details: { hashes: [HASH_C] },
          },
        }),
      },
    })
    const res = await routes.creationsUploadUrl.POST(
      post({
        name: 'Nave',
        kind: 'classic',
        itemUpdatedAt: '2026-08-18T12:00:00.000Z',
        bytes: 10,
        parts: [{ hash: HASH_A }, { hash: HASH_C }],
      }),
      item,
    )
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      error: { code: 'CREATION_PARTS_NEED_BYTES', message: 'Partes sem bytes' },
      details: { hashes: [HASH_C] },
    })
  })

  test('storage SEM `deleteObjects` (fallback): apaga um a um o que a revisão soltou', async () => {
    const released = ['creations/user-1/studio/proj-1/2.json.gz', partKey(HASH_B, 1)]
    const { routes } = buildRoutes({
      members: {
        commitCreationUpload: async () => ({
          status: 200,
          body: { item: SUMMARY, previousStorageKey: released[0], releasedStorageKeys: released },
        }),
      },
      storage: {
        presignPut: storage.presignPut,
        presignGet: storage.presignGet,
        deleteObject: storage.deleteObject,
      },
    })
    const res = await routes.creationsCommit.POST(post({ revision: 3 }), item)
    expect(res.status).toBe(200)
    await settle()
    expect(r2.deleted).toEqual(released)
    expect(r2.deletedBatches).toEqual([])
  })

  test('commit: HEAD que falha (não é 404) NÃO barra; repassa `uploadedParts` ao members e apaga em lote tudo o que a revisão soltou (`releasedStorageKeys`)', async () => {
    r2.headResult[partKey(HASH_A)] = null
    r2.batchDelete = true
    const released = ['creations/user-1/studio/proj-1/2.json.gz', partKey(HASH_B), partKey(HASH_C)]
    let sentToMembers: unknown
    const { routes } = buildRoutes({
      members: {
        commitCreationUpload: async (...args: unknown[]) => {
          sentToMembers = args[2]
          return {
            status: 200,
            body: { item: SUMMARY, previousStorageKey: released[0], releasedStorageKeys: released },
          }
        },
      },
    })
    const res = await routes.creationsCommit.POST(
      post({ revision: 3, uploadedParts: [HASH_A] }),
      item,
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ item: SUMMARY })
    expect(sentToMembers).toEqual({ revision: 3, uploadedParts: [HASH_A] })
    await settle()
    expect(r2.deletedBatches).toEqual([released])
  })

  test('commit sem `releasedStorageKeys` (members antigo) apaga só `previousStorageKey`; 409 do members apaga só o manifesto recusado (nunca as partes)', async () => {
    const { routes } = buildRoutes()
    await routes.creationsCommit.POST(post({ revision: 2 }), item)
    await settle()
    expect(r2.deleted).toEqual(['creations/u/studio/proj-1/1.json.gz'])
    r2.deleted.length = 0
    const { routes: rejecting } = buildRoutes({
      members: {
        commitCreationUpload: async () => ({
          status: 409,
          body: { error: { code: 'CREATION_REVISION_MISMATCH', message: 'x' } },
        }),
      },
    })
    const res = await rejecting.creationsCommit.POST(
      post({ revision: 3, uploadedParts: [HASH_A, HASH_B] }),
      item,
    )
    expect(res.status).toBe(409)
    await settle()
    expect(r2.deleted).toEqual(['creations/user-1/studio/proj-1/3.json.gz'])
  })

  test('download: assina o GET do manifesto e um por parte (`parts: [{hash, bytes, url}]`)', async () => {
    const { routes } = buildRoutes({
      members: {
        getCreationDownload: async () => ({
          status: 200,
          body: {
            storageKey: 'creations/user-1/studio/proj-1/3.json.gz',
            revision: 3,
            bytes: 5000,
            summary: SUMMARY,
            parts: [
              { hash: HASH_A, bytes: 1000, storageKey: partKey(HASH_A) },
              { hash: HASH_C, bytes: 3000, storageKey: partKey(HASH_C) },
            ],
          },
        }),
      },
    })
    const res = await routes.creationsDownloadUrl.GET(
      new Request('https://community.test/api'),
      item,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.downloadUrl).toBe('https://r2.test/get/creations/user-1/studio/proj-1/3.json.gz')
    expect(body.parts).toEqual([
      { hash: HASH_A, bytes: 1000, url: `https://r2.test/get/${partKey(HASH_A)}` },
      { hash: HASH_C, bytes: 3000, url: `https://r2.test/get/${partKey(HASH_C)}` },
    ])
    expect(r2.presignGet).toEqual([
      'creations/user-1/studio/proj-1/3.json.gz',
      partKey(HASH_A),
      partKey(HASH_C),
    ])
  })

  test('lixeira: apaga em lote tudo o que o members soltou (`storageKeys` = manifesto + partes)', async () => {
    r2.batchDelete = true
    const keys = ['creations/user-1/studio/proj-1/3.json.gz', partKey(HASH_A), partKey(HASH_C)]
    const { routes } = buildRoutes({
      members: {
        deleteCreation: async () => ({
          status: 200,
          body: { deleted: true, storageKey: keys[0], storageKeys: keys, revision: 3 },
        }),
      },
    })
    const res = await routes.creationsDelete.DELETE(deleteRequest(3), item)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deleted: true, revision: 3 })
    await settle()
    expect(r2.deletedBatches).toEqual([keys])
  })
})

describe('BFF das criações — commit', () => {
  test('manda só a revisão ao members, apaga a revisão anterior no R2 e devolve só o resumo', async () => {
    const { routes, calls } = buildRoutes()
    const res = await routes.creationsCommit.POST(post({ revision: 2 }), item)
    expect(res.status).toBe(200)
    expect((calls.commitCreationUpload?.[0] as unknown[])[2]).toEqual({ revision: 2 })
    expect(r2.deleted).toEqual(['creations/u/studio/proj-1/1.json.gz'])
    const body = await res.json()
    expect(body).toEqual({ item: SUMMARY })
  })

  test('`bytes` no corpo do commit é recusado (o corpo é estrito): os bytes são os da reserva', async () => {
    const { routes } = buildRoutes()
    const res = await routes.creationsCommit.POST(post({ revision: 2, bytes: 1 }), item)
    expect(res.status).toBe(400)
  })

  test('o DELETE do blob anterior no R2 fica FORA do caminho crítico: a resposta do commit sai mesmo com o R2 pendurado', async () => {
    r2.hangDelete = true
    const { routes } = buildRoutes()
    const res = await Promise.race([
      routes.creationsCommit.POST(post({ revision: 2 }), item),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 300)),
    ])
    expect(res).not.toBe('timeout')
    expect((res as Response).status).toBe(200)
    r2.hangDelete = false
    // Idem na lixeira.
    r2.hangDelete = true
    const del = await Promise.race([
      routes.creationsDelete.DELETE(deleteRequest(2), item),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 300)),
    ])
    expect(del).not.toBe('timeout')
    r2.hangDelete = false
  })

  test('falha ao apagar o blob anterior não vira erro para a criança', async () => {
    r2.failDelete = true
    const { routes } = buildRoutes()
    const res = await routes.creationsCommit.POST(post({ revision: 2 }), item)
    expect(res.status).toBe(200)
  })

  test('409 definitivo do members apaga do R2 a revisão recusada e passa o erro', async () => {
    for (const code of ['CREATION_REVISION_MISMATCH', 'CREATION_QUOTA_EXCEEDED']) {
      r2.deleted.length = 0
      const { routes } = buildRoutes({
        members: {
          commitCreationUpload: async () => ({
            status: 409,
            body: { error: { code, message: 'x' } },
          }),
        },
      })
      const res = await routes.creationsCommit.POST(post({ revision: 2 }), item)
      expect(res.status).toBe(409)
      expect((await res.json()).error.code).toBe(code)
      expect(r2.deleted).toEqual(['creations/user-1/studio/proj-1/2.json.gz'])
    }
  })
})

describe('BFF das criações — apagar', () => {
  test('a lixeira apaga o blob que o members soltou (best-effort) e devolve só `{deleted}`', async () => {
    const { routes, calls } = buildRoutes()
    const res = await routes.creationsDelete.DELETE(deleteRequest(2), item)
    expect(res.status).toBe(200)
    expect(calls.deleteCreation?.[0]).toEqual(['studio', 'proj-1', { baseRevision: 2 }])
    expect(await res.json()).toEqual({ deleted: true, revision: 2 })
    expect(r2.deleted).toEqual(['creations/u/studio/proj-1/2.json.gz'])
    // Falha no R2 não vira erro para a criança.
    r2.failDelete = true
    const again = await routes.creationsDelete.DELETE(deleteRequest(2), item)
    expect(again.status).toBe(200)
  })

  test('recusa DELETE sem revisão-base antes de chamar o members', async () => {
    const { routes, calls } = buildRoutes()
    const res = await routes.creationsDelete.DELETE(
      new Request('https://community.test/api', { method: 'DELETE' }),
      item,
    )
    expect(res.status).toBe(400)
    expect(calls.deleteCreation).toBeUndefined()
  })
})

describe('BFF das criações — respostas e sessão', () => {
  test('lista valida e repassa cursor/limite ao members', async () => {
    const { routes, calls } = buildRoutes()
    const res = await routes.creationsList.GET(
      new Request('https://community.test/api?cursor=abc&limit=25'),
      { params: Promise.resolve({ tool: 'studio' }) },
    )
    expect(res.status).toBe(200)
    expect(calls.listCreations?.[0]).toEqual(['studio', { cursor: 'abc', limit: 25 }])
    const invalid = await routes.creationsList.GET(
      new Request('https://community.test/api?limit=999'),
      { params: Promise.resolve({ tool: 'studio' }) },
    )
    expect(invalid.status).toBe(400)
  })

  test('200 sem corpo vira 502 (o cliente nunca recebe `{ok:true}` no lugar de um ticket)', async () => {
    const { routes } = buildRoutes({
      members: { listCreations: async () => ({ status: 200, body: undefined }) },
    })
    const res = await routes.creationsList.GET(new Request('https://community.test/api'), {
      params: Promise.resolve({ tool: 'studio' }),
    })
    expect(res.status).toBe(502)
  })

  test('download assina o GET da chave corrente e devolve o resumo', async () => {
    const { routes } = buildRoutes()
    const res = await routes.creationsDownloadUrl.GET(
      new Request('https://community.test/api'),
      item,
    )
    expect(res.status).toBe(200)
    expect(r2.presignGet).toEqual(['creations/u/studio/proj-1/2.json.gz'])
    const body = await res.json()
    expect(body.item).toEqual(SUMMARY)
    expect(body.downloadUrl).toContain('/get/')
  })

  test('`x-sz-viewer` diferente do perfil da sessão é 409 em TODAS as rotas (troca de perfil no meio de um upload em voo)', async () => {
    const { routes, calls } = buildRoutes()
    const withViewer = (init: RequestInit = {}) =>
      new Request('https://community.test/api', {
        ...init,
        headers: { 'x-sz-viewer': 'user-2' },
      })
    const list = await routes.creationsList.GET(withViewer(), {
      params: Promise.resolve({ tool: 'studio' }),
    })
    const download = await routes.creationsDownloadUrl.GET(withViewer(), item)
    const reserve = await routes.creationsUploadUrl.POST(
      withViewer({
        method: 'POST',
        body: JSON.stringify({
          name: 'x',
          kind: 'y',
          itemUpdatedAt: '2026-08-18T12:00:00.000Z',
          bytes: 1,
        }),
      }),
      item,
    )
    const commit = await routes.creationsCommit.POST(
      withViewer({ method: 'POST', body: JSON.stringify({ revision: 1 }) }),
      item,
    )
    const del = await routes.creationsDelete.DELETE(withViewer({ method: 'DELETE' }), item)
    for (const res of [list, download, reserve, commit, del]) {
      expect(res.status).toBe(409)
      expect((await res.json()).error.code).toBe('VIEWER_MISMATCH')
    }
    expect(calls.listCreations).toBeUndefined()
    expect(calls.reserveCreationUpload).toBeUndefined()
    expect(calls.deleteCreation).toBeUndefined()
    // O perfil certo passa.
    const ok = await routes.creationsList.GET(
      new Request('https://community.test/api', { headers: { 'x-sz-viewer': 'user-1' } }),
      { params: Promise.resolve({ tool: 'studio' }) },
    )
    expect(ok.status).toBe(200)
    // Sem sessão NÃO é "trocou de perfil": segue para o gateway (que responde 401).
    const { routes: noSession } = buildRoutes({ session: null })
    const anon = await noSession.creationsList.GET(
      new Request('https://community.test/api', { headers: { 'x-sz-viewer': 'user-1' } }),
      { params: Promise.resolve({ tool: 'studio' }) },
    )
    expect(anon.status).toBe(200)
  })

  test('sessão de suporte (impersonação) é só leitura: reserva, commit e apagar são 403 antes do members', async () => {
    const { routes, calls } = buildRoutes({ session: IMPERSONATED })
    const reserve = await routes.creationsUploadUrl.POST(
      post({ name: 'x', kind: 'y', itemUpdatedAt: '2026-08-18T12:00:00.000Z', bytes: 1 }),
      item,
    )
    const commit = await routes.creationsCommit.POST(post({ revision: 1 }), item)
    const del = await routes.creationsDelete.DELETE(
      new Request('https://community.test/api', { method: 'DELETE' }),
      item,
    )
    for (const res of [reserve, commit, del]) {
      expect(res.status).toBe(403)
      expect((await res.json()).error.code).toBe('IMPERSONATION_READONLY')
    }
    expect(calls.reserveCreationUpload).toBeUndefined()
    expect(calls.commitCreationUpload).toBeUndefined()
    expect(calls.deleteCreation).toBeUndefined()
    // Ler continua livre.
    const list = await routes.creationsList.GET(new Request('https://community.test/api'), {
      params: Promise.resolve({ tool: 'studio' }),
    })
    expect(list.status).toBe(200)
  })
})
