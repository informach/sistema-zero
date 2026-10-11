/**
 * O rascunho do Estúdio e do Pinta DENTRO da fase, guardado na conta (10/10/2026): o canal que o
 * bloco do member-shell usa. Um BFF + R2 de mentira com o que importa aqui: a reserva com a
 * impressão e a base, o commit, o tíquete com o relógio do servidor e a recusa por base vencida.
 */
import { describe, expect, test } from 'bun:test'
import { LessonDraftOutdatedError } from '@sistemazero/member-shell/lib/lesson-draft-cloud'
import { type FetchLike, gunzipToText, gzipText } from '../src/lib/creations-cloud'
import { createMemorySyncedMarks } from '../src/lib/creations-sync'
import { createLessonDraftCloud } from '../src/lib/lesson-draft-cloud'

const VIEWER = '11111111-1111-4111-8111-111111111111'
const BLOCO = '22222222-2222-4222-8222-222222222222'
const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })

function servidor() {
  const reservas: Array<{ url: string; body: Record<string, unknown> }> = []
  const blobs = new Map<string, Uint8Array>()
  const itens = new Map<
    string,
    { revision: number; fingerprint: string | null; syncedAt: string; pending: number | null }
  >()
  let pendente: { fingerprint: string | null } | null = null
  const fetchImpl: FetchLike = async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const body =
      typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : null
    const m = /\/api\/creations\/([a-z-]+)\/([^/]+)\/(upload|commit|download)$/.exec(url)
    if (m) {
      const [, tool, item, acao] = m as unknown as [string, string, string, string]
      const chave = `${tool}/${item}`
      const atual = itens.get(chave)
      if (acao === 'upload' && body) {
        reservas.push({ url, body })
        const corrente = atual?.revision ?? 0
        if (body.baseRevision !== undefined && body.baseRevision !== corrente)
          return json(409, {
            error: { code: 'CREATION_STALE_BASE', message: 'base' },
            details: { currentRevision: corrente },
          })
        const revision = corrente + 1
        pendente = { fingerprint: (body.fingerprint as string | undefined) ?? null }
        itens.set(chave, {
          revision: corrente,
          fingerprint: atual?.fingerprint ?? null,
          syncedAt: atual?.syncedAt ?? new Date(0).toISOString(),
          pending: revision,
        })
        return json(200, {
          revision,
          formatVersion: body.formatVersion ?? 1,
          bytes: body.bytes,
          uploadUrl: `https://r2.test/${chave}/${revision}`,
          method: 'PUT',
          headers: { 'content-type': 'application/gzip' },
          parts: [],
        })
      }
      if (acao === 'commit' && body && atual?.pending === body.revision) {
        itens.set(chave, {
          revision: body.revision as number,
          fingerprint: pendente?.fingerprint ?? null,
          syncedAt: new Date(1_000 * (body.revision as number)).toISOString(),
          pending: null,
        })
        return json(200, { item: {} })
      }
      if (acao === 'download') {
        if (!atual || atual.revision === 0) return json(404, { error: { code: 'NOT_FOUND' } })
        return json(200, {
          downloadUrl: `https://r2.test/${chave}/${atual.revision}`,
          revision: atual.revision,
          bytes: 1,
          item: {
            itemId: item,
            name: 'x',
            kind: 'classic',
            itemUpdatedAt: new Date(0).toISOString(),
            revision: atual.revision,
            bytes: 1,
            thumb: null,
            syncedAt: atual.syncedAt,
            contentFingerprint: atual.fingerprint,
          },
          parts: [],
          serverNow: new Date(5_000).toISOString(),
        })
      }
      return json(409, { error: { code: 'CREATION_REVISION_MISMATCH' } })
    }
    if (url.startsWith('https://r2.test/')) {
      const chave = url.slice('https://r2.test/'.length)
      if (method === 'PUT') {
        blobs.set(chave, init?.body as Uint8Array)
        return new Response(null, { status: 200 })
      }
      const blob = blobs.get(chave)
      return blob ? new Response(blob as BodyInit) : new Response(null, { status: 404 })
    }
    return json(404, { error: { code: 'NOT_FOUND' } })
  }
  /** Simula outro computador: a conta passa a ter uma revisão nova com este conteúdo. */
  async function outroAparelho(tool: string, documento: unknown, fingerprint: string) {
    const chave = `${tool}/${BLOCO}`
    const revision = (itens.get(chave)?.revision ?? 0) + 1
    blobs.set(`${chave}/${revision}`, await gzipText(JSON.stringify(documento)))
    itens.set(chave, {
      revision,
      fingerprint,
      syncedAt: new Date(9_000).toISOString(),
      pending: null,
    })
  }
  return { fetchImpl, reservas, blobs, itens, outroAparelho }
}

const desenho = (letra: string) => ({
  id: 'd1',
  name: 'meu-desenho',
  kind: 'pixel-background',
  updatedAt: 1_000,
  marca: letra,
})

describe('o canal do rascunho da fase', () => {
  test('confirmar aguarda a cópia do conflito e o commit da nova versão', async () => {
    const s = servidor()
    const marks = createMemorySyncedMarks()
    await s.outroAparelho('lesson-pinta', desenho('a'), `v1:${'a'.repeat(64)}`)
    marks.set(BLOCO, 500, 1)
    await s.outroAparelho('lesson-pinta', desenho('b'), `v1:${'b'.repeat(64)}`)
    const cloud = createLessonDraftCloud({
      viewerId: VIEWER,
      fetch: s.fetchImpl,
      marks: { pinta: marks },
    })
    const backup = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    cloud.pinta.enqueue(
      BLOCO,
      async () => ({
        document: desenho('c'),
        name: 'novo',
        kind: 'pixel-background',
        updatedAt: 2000,
        fingerprint: `v1:${'c'.repeat(64)}`,
      }),
      async () => {
        started.resolve()
        await backup.promise
        return undefined
      },
    )
    let confirmed = false
    const confirmation = cloud.pinta.confirm(BLOCO, 1000).then(() => {
      confirmed = true
    })
    await started.promise
    await cloud.flushAll(20)
    expect(confirmed).toBe(false)
    backup.resolve()
    await confirmation
    expect(cloud.pinta.mark(BLOCO)).toEqual({ revision: 3, updatedAt: 2000 })
    await cloud.dispose()
  })

  test('timeout não confirma nem cancela a subida; uma nova tentativa espera o commit', async () => {
    const s = servidor()
    const put = Promise.withResolvers<void>()
    const cloud = createLessonDraftCloud({
      viewerId: VIEWER,
      fetch: async (input, init) => {
        if (String(input).startsWith('https://r2.test/') && init?.method === 'PUT')
          await put.promise
        return s.fetchImpl(input, init)
      },
      marks: { pinta: createMemorySyncedMarks() },
    })
    cloud.pinta.enqueue(BLOCO, async () => ({
      document: desenho('a'),
      name: 'novo',
      kind: 'pixel-background',
      updatedAt: 2000,
      fingerprint: `v1:${'a'.repeat(64)}`,
    }))
    const result = await cloud.pinta.confirm(BLOCO, 20).then(
      () => 'confirmed',
      () => 'pending',
    )
    expect(result).toBe('pending')
    expect(cloud.pinta.mark(BLOCO)).toBeNull()
    put.resolve()
    await cloud.pinta.confirm(BLOCO, 1000)
    expect(cloud.pinta.mark(BLOCO)?.revision).toBe(1)
    await cloud.dispose()
  })

  test('erro de um item não é escondido pelo sucesso de outro', async () => {
    const s = servidor()
    const cloud = createLessonDraftCloud({
      viewerId: VIEWER,
      fetch: async (input, init) =>
        String(input).includes(`/${BLOCO}/upload`)
          ? json(403, { error: { code: 'ACCESS_DENIED' } })
          : s.fetchImpl(input, init),
      marks: { pinta: createMemorySyncedMarks() },
    })
    const producer = async () => ({
      document: desenho('a'),
      name: 'novo',
      kind: 'pixel-background',
      updatedAt: 2000,
      fingerprint: `v1:${'a'.repeat(64)}`,
    })
    cloud.pinta.enqueue(BLOCO, producer)
    cloud.pinta.enqueue('33333333-3333-4333-8333-333333333333', producer)
    await cloud.flushAll(1000)
    expect(
      await cloud.pinta.confirm(BLOCO, 1000).then(
        () => true,
        () => false,
      ),
    ).toBe(false)
    await cloud.dispose()
  })
  test('sobe com a impressão e a base, e a marca avança só no commit', async () => {
    const s = servidor()
    const marks = createMemorySyncedMarks()
    const nuvem = createLessonDraftCloud({
      viewerId: VIEWER,
      fetch: s.fetchImpl,
      marks: { pinta: marks },
    })
    expect(nuvem.pinta.mark(BLOCO)).toBeNull()
    nuvem.pinta.enqueue(BLOCO, async () => ({
      document: desenho('a'),
      name: 'meu-desenho',
      kind: 'pixel-background',
      updatedAt: 1_000,
      fingerprint: `v1:${'a'.repeat(64)}`,
      formatVersion: 1,
    }))
    await nuvem.flushAll(5000)
    expect(s.reservas).toHaveLength(1)
    expect(s.reservas[0]?.url).toContain(`/api/creations/lesson-pinta/${BLOCO}/upload`)
    expect(s.reservas[0]?.body).toMatchObject({
      baseRevision: 0,
      fingerprint: `v1:${'a'.repeat(64)}`,
      formatVersion: 1,
    })
    expect(nuvem.pinta.mark(BLOCO)).toEqual({ revision: 1, updatedAt: 1_000 })
    expect(nuvem.pinta.getState(BLOCO).status).toBe('saved')
    // Nada mudou desde a última subida: zero HTTP.
    nuvem.pinta.enqueue(BLOCO, async () => ({
      document: desenho('a'),
      name: 'meu-desenho',
      kind: 'pixel-background',
      updatedAt: 1_000,
      fingerprint: `v1:${'a'.repeat(64)}`,
    }))
    await nuvem.flushAll(5000)
    expect(s.reservas).toHaveLength(1)
  })

  test('peek diz revisão, impressão e relógio do servidor; load baixa o desenho', async () => {
    const s = servidor()
    await s.outroAparelho('lesson-pinta', desenho('b'), `v1:${'b'.repeat(64)}`)
    const nuvem = createLessonDraftCloud({
      viewerId: VIEWER,
      fetch: s.fetchImpl,
      marks: { pinta: createMemorySyncedMarks() },
    })
    const remoto = await nuvem.pinta.peek(BLOCO)
    expect(remoto).toMatchObject({
      revision: 1,
      fingerprint: `v1:${'b'.repeat(64)}`,
      serverNow: 5_000,
      syncedAt: 9_000,
    })
    expect(await remoto?.load()).toEqual(desenho('b'))
    expect(await nuvem.studio.peek('33333333-3333-4333-8333-333333333333')).toBeNull()
  })

  test('base vencida: a versão da conta vira a "outra" e a daqui sobe por cima', async () => {
    const s = servidor()
    const marks = createMemorySyncedMarks()
    const nuvem = createLessonDraftCloud({
      viewerId: VIEWER,
      fetch: s.fetchImpl,
      marks: { pinta: marks },
    })
    // Este aparelho já conhecia a revisão 1; outro computador subiu a 2.
    await s.outroAparelho('lesson-pinta', desenho('x'), `v1:${'x'.repeat(64)}`)
    marks.set(BLOCO, 500, 1)
    await s.outroAparelho('lesson-pinta', desenho('y'), `v1:${'y'.repeat(64)}`)
    const guardadas: unknown[] = []
    nuvem.pinta.enqueue(
      BLOCO,
      async () => ({
        document: desenho('daqui'),
        name: 'meu-desenho',
        kind: 'pixel-background',
        updatedAt: 2_000,
        fingerprint: `v1:${'d'.repeat(64)}`,
      }),
      async (remoto) => {
        guardadas.push(await remoto.load())
        return undefined
      },
    )
    await nuvem.flushAll(5000)
    // O conflito é resolvido em segundo plano e a subida volta para a fila.
    for (let i = 0; i < 100 && s.reservas.length < 2; i += 1) {
      await Bun.sleep(10)
      await nuvem.flushAll(5000)
    }
    await nuvem.flushAll(5000)
    expect(guardadas).toEqual([desenho('y')])
    expect(s.reservas.map((r) => r.body.baseRevision)).toEqual([1, 2])
    expect(nuvem.pinta.mark(BLOCO)).toEqual({ revision: 3, updatedAt: 2_000 })
    const baixado = s.blobs.get(`lesson-pinta/${BLOCO}/3`)
    expect(baixado && JSON.parse(await gunzipToText(baixado))).toEqual(desenho('daqui'))
  })
})

describe('o conflito na subida (full review, 10/10/2026)', () => {
  test('primeiro contato: o bloco sabe, e adotando a versão da conta nada sobe por cima', async () => {
    const s = servidor()
    await s.outroAparelho('lesson-pinta', desenho('trabalho'), `v1:${'a'.repeat(64)}`)
    // Este computador abriu sem conseguir perguntar à conta: nenhuma marca do bloco.
    const marks = createMemorySyncedMarks()
    const cloud = createLessonDraftCloud({
      viewerId: VIEWER,
      fetch: s.fetchImpl,
      marks: { pinta: marks },
    })
    const contextos: Array<{ firstContact: boolean }> = []
    cloud.pinta.enqueue(
      BLOCO,
      async () => ({
        document: desenho('modelo'),
        name: 'modelo',
        kind: 'pixel-background',
        updatedAt: 2_000,
        fingerprint: `v1:${'m'.repeat(64)}`,
      }),
      async (_remote, contexto) => {
        contextos.push(contexto)
        return { adopted: { updatedAt: 1_500 } }
      },
    )
    await cloud.pinta.confirm(BLOCO, 2_000)
    expect(contextos).toEqual([{ firstContact: true }])
    // A conta continua com o trabalho (revisão 1); este aparelho passa a conhecê-la.
    expect(s.itens.get(`lesson-pinta/${BLOCO}`)?.revision).toBe(1)
    expect(s.reservas.length).toBe(1)
    expect(cloud.pinta.mark(BLOCO)).toEqual({ revision: 1, updatedAt: 1_500 })
    await cloud.dispose()
  })

  test('conflito comum (este aparelho já conhecia a conta): a daqui sobe por cima', async () => {
    const s = servidor()
    await s.outroAparelho('lesson-pinta', desenho('a'), `v1:${'a'.repeat(64)}`)
    const marks = createMemorySyncedMarks()
    marks.set(BLOCO, 500, 1)
    await s.outroAparelho('lesson-pinta', desenho('b'), `v1:${'b'.repeat(64)}`)
    const cloud = createLessonDraftCloud({
      viewerId: VIEWER,
      fetch: s.fetchImpl,
      marks: { pinta: marks },
    })
    const contextos: Array<{ firstContact: boolean }> = []
    cloud.pinta.enqueue(
      BLOCO,
      async () => ({
        document: desenho('c'),
        name: 'c',
        kind: 'pixel-background',
        updatedAt: 2_000,
        fingerprint: `v1:${'c'.repeat(64)}`,
      }),
      async (_remote, contexto) => {
        contextos.push(contexto)
        return undefined
      },
    )
    await cloud.pinta.confirm(BLOCO, 2_000)
    expect(contextos).toEqual([{ firstContact: false }])
    expect(s.itens.get(`lesson-pinta/${BLOCO}`)?.revision).toBe(3)
    await cloud.dispose()
  })

  test('um bloco que a rede não deixa subir não segura o outro na fila', async () => {
    const s = servidor()
    const OUTRO = '33333333-3333-4333-8333-333333333333'
    const cloud = createLessonDraftCloud({
      viewerId: VIEWER,
      fetch: async (input, init) => {
        // O primeiro bloco cai sempre na rede; o segundo sobe normal.
        if (String(input).includes(`/${BLOCO}/`)) throw new TypeError('Failed to fetch')
        return s.fetchImpl(input, init)
      },
      marks: { pinta: createMemorySyncedMarks() },
    })
    const produzir = (marca: string) => async () => ({
      document: desenho(marca),
      name: marca,
      kind: 'pixel-background',
      updatedAt: 2_000,
      fingerprint: `v1:${marca.repeat(64)}`,
    })
    cloud.pinta.enqueue(BLOCO, produzir('a'))
    cloud.pinta.enqueue(OUTRO, produzir('b'))
    await cloud.pinta.confirm(OUTRO, 3_000)
    expect(s.itens.get(`lesson-pinta/${OUTRO}`)?.revision).toBe(1)
    // O descarte espera até 5 s pelo bloco que nunca sobe.
    await cloud.dispose()
  }, 15_000)
})

describe('o selo do bloco e a página desatualizada (11/10/2026)', () => {
  const OUTRO = '33333333-3333-4333-8333-333333333333'
  const produzir = (marca: string) => async () => ({
    document: desenho(marca),
    name: marca,
    kind: 'pixel-background',
    updatedAt: 2_000,
    fingerprint: `v1:${marca.repeat(64)}`,
  })

  test('o erro de um bloco não pinta o selo do vizinho', async () => {
    const s = servidor()
    const cloud = createLessonDraftCloud({
      viewerId: VIEWER,
      fetch: async (input, init) =>
        // A conta recusa o primeiro bloco (sem acesso); o vizinho sobe normal.
        String(input).includes(`/${BLOCO}/upload`)
          ? json(403, { error: { code: 'ACCESS_DENIED', message: 'não' } })
          : s.fetchImpl(input, init),
      marks: { pinta: createMemorySyncedMarks() },
    })
    let avisos = 0
    const desligar = cloud.pinta.subscribe(() => {
      avisos += 1
    })
    const NUNCA = '44444444-4444-4444-8444-444444444444'
    expect(cloud.pinta.getState(NUNCA).status).toBe('idle')
    cloud.pinta.enqueue(BLOCO, produzir('a'))
    cloud.pinta.enqueue(OUTRO, produzir('b'))
    expect(cloud.pinta.getState(OUTRO).status).toBe('saving')
    await cloud.flushAll(5_000)
    expect(cloud.pinta.getState(BLOCO).status).toBe('error')
    expect(cloud.pinta.getState(OUTRO)).toEqual({ status: 'saved', message: null })
    expect(cloud.pinta.getState(NUNCA).status).toBe('idle')
    expect(avisos).toBeGreaterThan(0)
    desligar()
    await cloud.dispose()
  })

  test('versão da conta mais nova que a página: o selo pede atualizar e a fila para de tentar', async () => {
    const s = servidor()
    // Este aparelho conhecia a revisão 1; outro computador, já com a página nova, subiu a 2.
    await s.outroAparelho('lesson-pinta', desenho('x'), `v1:${'x'.repeat(64)}`)
    const marks = createMemorySyncedMarks()
    marks.set(BLOCO, 500, 1)
    await s.outroAparelho('lesson-pinta', desenho('n'), `v1:${'n'.repeat(64)}`)
    const cloud = createLessonDraftCloud({
      viewerId: VIEWER,
      fetch: s.fetchImpl,
      marks: { pinta: marks },
    })
    let conflitos = 0
    const onConflict = async () => {
      conflitos += 1
      throw new LessonDraftOutdatedError()
    }
    cloud.pinta.enqueue(BLOCO, produzir('a'), onConflict)
    const erro = await cloud.pinta.confirm(BLOCO, 3_000).catch((e: unknown) => e)
    expect((erro as { code?: string }).code).toBe('CREATION_CLIENT_OUTDATED')
    const estado = cloud.pinta.getState(BLOCO)
    expect(estado.status).toBe('error')
    expect(estado.outdated).toBe(true)
    // Cada salvamento novo não baixa a versão da conta só para falhar do mesmo jeito.
    const reservas = s.reservas.length
    cloud.pinta.enqueue(BLOCO, produzir('b'), onConflict)
    await cloud.flushAll(2_000)
    expect(s.reservas.length).toBe(reservas)
    expect(conflitos).toBe(1)
    expect(cloud.pinta.getState(BLOCO).outdated).toBe(true)
    await cloud.dispose()
  })
})
