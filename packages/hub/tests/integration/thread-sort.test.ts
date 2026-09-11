import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { AccessConfig } from '../../src/domain/access/access-config'
import { buildApp, jsonRequest, studentHeaders } from '../helpers'

/**
 * Filtros do Mural (09/2026): "Todos os jogos" (atividade, fixados primeiro), "Mais
 * jogados" (jogadas) e "Novidades" (publicação). O que este arquivo prova: cada ordem
 * devolve a sequência certa, a paginação por cursor não pula nem repete item em
 * NENHUMA das três, e cursor de uma ordem não vale na outra.
 */
const PUBLIC: AccessConfig = { visibility: 'public', courses: [], roles: [] }

type Page = { items: { id: string; title: string }[]; nextCursor: string | null; hasMore: boolean }

async function montar() {
  // Relógio manual: cada tópico nasce 1 minuto depois do anterior.
  let agora = Date.parse('2026-09-01T12:00:00Z')
  const ctx = buildApp({ clock: () => new Date(agora) })
  const space = await ctx.repo.createSpace({
    slug: `mural-${randomUUID().slice(0, 6)}`,
    name: 'Mural',
    description: null,
    iconUrl: null,
    audience: 'kids',
    accessConfig: PUBLIC,
    requiresApproval: false,
    teaserWhenLocked: false,
    status: 'active',
  })
  const channel = await ctx.repo.createChannel(space.id, {
    slug: 'parede',
    name: 'Parede',
    topic: null,
    accessConfig: null,
    postingPolicy: 'members',
    requiresApproval: null,
    status: 'active',
  })
  const user = randomUUID()
  const criar = async (title: string) => {
    agora += 60_000
    const res = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channel.id}/threads`, {
        headers: studentHeaders(user),
        body: { title, body: `Jogo ${title}` },
      }),
    )
    expect(res.status).toBe(201)
    return ((await res.json()) as { id: string }).id
  }
  // A (mais antigo) … E (mais novo). Jogadas e atividade embaralhadas de propósito,
  // para nenhuma ordem coincidir com outra.
  const ids: Record<string, string> = {}
  for (const t of ['A', 'B', 'C', 'D', 'E']) ids[t] = await criar(t)
  const ajustar = (t: string, over: { plays?: number; activityMin?: number; pinned?: boolean }) => {
    const th = ctx.threadRepo.threads.find((x) => x.id === ids[t])
    if (!th) throw new Error(`sem ${t}`)
    if (over.plays !== undefined) th.playsCount = over.plays
    if (over.activityMin !== undefined) {
      th.lastActivityAt = new Date(Date.parse('2026-09-02T00:00:00Z') + over.activityMin * 60_000)
    }
    if (over.pinned !== undefined) th.isPinned = over.pinned
  }
  ajustar('A', { plays: 7, activityMin: 30 })
  ajustar('B', { plays: 3, activityMin: 10 })
  ajustar('C', { plays: 7, activityMin: 50, pinned: true })
  ajustar('D', { plays: 0, activityMin: 40 })
  ajustar('E', { plays: 9, activityMin: 20 })

  const listar = async (query: string) => {
    const res = await ctx.app.handle(
      jsonRequest('GET', `/hub/channels/${channel.id}/threads${query}`, {
        headers: studentHeaders(user),
      }),
    )
    return { status: res.status, body: (await res.json()) as Page }
  }
  // Percorre TODAS as páginas de uma ordem, de 2 em 2.
  const tudo = async (sort: string | null) => {
    const titulos: string[] = []
    let cursor: string | null = null
    for (let i = 0; i < 10; i++) {
      const q = new URLSearchParams({ limit: '2' })
      if (sort) q.set('sort', sort)
      if (cursor) q.set('cursor', cursor)
      const { status, body } = await listar(`?${q}`)
      expect(status).toBe(200)
      titulos.push(...body.items.map((it) => it.title))
      if (!body.hasMore) break
      cursor = body.nextCursor
    }
    return titulos
  }
  return { listar, tudo }
}

describe('ordem da listagem de tópicos (filtros do Mural)', () => {
  test('"Novidades": do mais novo ao mais antigo, com os fixados no meio da fila', async () => {
    const { tudo } = await montar()
    expect(await tudo('recent')).toEqual(['E', 'D', 'C', 'B', 'A'])
  })

  test('"Mais jogados": jogadas primeiro, empate desfeito pela publicação mais nova', async () => {
    const { tudo } = await montar()
    // E(9) · C(7, mais novo) · A(7) · B(3) · D(0)
    expect(await tudo('plays')).toEqual(['E', 'C', 'A', 'B', 'D'])
  })

  test('"Todos os jogos" continua a ordem de sempre: fixados na frente, depois atividade', async () => {
    const { tudo } = await montar()
    // C fixado; depois atividade: D(40) · A(30) · E(20) · B(10)
    expect(await tudo(null)).toEqual(['C', 'D', 'A', 'E', 'B'])
    expect(await tudo('activity')).toEqual(['C', 'D', 'A', 'E', 'B'])
  })

  test('cursor de uma ordem não vale na outra (400, e não uma página errada)', async () => {
    const { listar } = await montar()
    const primeira = await listar('?sort=recent&limit=2')
    expect(primeira.body.nextCursor).not.toBeNull()
    const cursor = primeira.body.nextCursor as string

    const outra = await listar(`?sort=plays&limit=2&cursor=${encodeURIComponent(cursor)}`)
    expect(outra.status).toBe(400)
    const padrao = await listar(`?limit=2&cursor=${encodeURIComponent(cursor)}`)
    expect(padrao.status).toBe(400)
  })

  test('ordem desconhecida é recusada na borda', async () => {
    const { listar } = await montar()
    expect((await listar('?sort=aleatorio')).status).toBe(400)
  })
})
