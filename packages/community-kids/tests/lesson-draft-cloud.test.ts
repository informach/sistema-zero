/**
 * O rascunho do Estúdio e do Pinta DENTRO da fase, guardado na conta (10/10/2026): o canal que o
 * bloco do member-shell usa. Um BFF + R2 de mentira com o que importa aqui: a reserva com a
 * impressão e a base, o commit, o tíquete com o relógio do servidor e a recusa por base vencida.
 */
import { describe, expect, test } from 'bun:test'
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
    expect(nuvem.pinta.getState().status).toBe('saved')
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
