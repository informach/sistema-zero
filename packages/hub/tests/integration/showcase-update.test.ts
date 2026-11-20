import { beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { AccessConfig } from '../../src/domain/access/access-config'
import { buildApp, jsonRequest, publishStudioRequest, studentHeaders } from '../helpers'

const PUBLIC: AccessConfig = { visibility: 'public', courses: [], roles: [] }
const INTERNAL = 'showcase-internal-token-0001'
const LESSON_ID = '11111111-1111-1111-1111-111111111111'
const BLOCK_ID = '22222222-2222-2222-2222-222222222222'

type Ctx = ReturnType<typeof buildApp>
type ThreadJson = {
  id: string
  playId: string
  title: string
  body: string
  coverImageUrl: string | null
  createdAt: string
  lastActivityAt: string
  gameUpdatedAt: string | null
  challengeKey: string | null
  status: string
}

async function seedMural(ctx: Ctx) {
  const space = await ctx.repo.createSpace({
    slug: 'mural-dos-criadores',
    name: 'Mural dos Criadores',
    description: null,
    iconUrl: null,
    audience: 'kids',
    accessConfig: PUBLIC,
    requiresApproval: true,
    teaserWhenLocked: true,
    status: 'active',
  })
  await ctx.repo.createChannel(space.id, {
    slug: 'parede',
    name: 'Parede',
    topic: null,
    accessConfig: null,
    postingPolicy: 'staff_only',
    requiresApproval: null,
    status: 'active',
  })
}

const child = (id: string) =>
  studentHeaders(id, { 'x-internal-token': INTERNAL, 'x-auth-profile-name': 'Sofia' })

const standaloneBody = (over: Record<string, unknown> = {}) => ({
  spaceSlug: 'mural-dos-criadores',
  title: 'Meu jogo livre',
  description: 'Fiz no Estúdio Completo!',
  coverImageUrl: 'https://cdn.example.com/capa.png',
  playId: randomUUID(),
  clientIdempotencyKey: randomUUID(),
  ...over,
})
const lessonBody = (over: Record<string, unknown> = {}) => ({
  spaceSlug: 'mural-dos-criadores',
  lessonId: LESSON_ID,
  blockId: BLOCK_ID,
  description: 'Um jogo de nave.',
  coverImageUrl: 'https://cdn.example.com/capa.png',
  playId: randomUUID(),
  clientIdempotencyKey: randomUUID(),
  ...over,
})

async function publish(ctx: Ctx, path: string, headers: Record<string, string>, body: object) {
  const res = await publishStudioRequest(ctx.app, jsonRequest('POST', path, { headers, body }))
  expect(res.status).toBe(200)
  return (await res.json()) as { thread: ThreadJson; deduped: boolean; existing?: boolean }
}
async function post(ctx: Ctx, path: string, headers: Record<string, string>, body: object) {
  return ctx.app.handle(jsonRequest('POST', path, { headers, body }))
}

describe('republicar o mesmo projeto atualiza o post do Mural', () => {
  let ctx: Ctx
  let now = new Date('2026-06-15T12:00:00.000Z')
  beforeEach(async () => {
    now = new Date('2026-06-15T12:00:00.000Z')
    ctx = buildApp({ internalToken: INTERNAL, clock: () => now })
    await seedMural(ctx)
  })
  const STANDALONE = '/hub/internal/showcase-thread-studio-standalone'
  const LESSON = '/hub/internal/showcase-thread-studio'

  test('Estúdio livre: o mesmo projeto vira "existing" e o update mantém id, link, data, ordem e desafio', async () => {
    const accountId = randomUUID()
    ctx.members.communitiesByUser.set(
      accountId,
      new Set(['estudio-completo', 'clube-dos-criadores']),
    )
    const headers = child(accountId)
    const first = await publish(
      ctx,
      STANDALONE,
      headers,
      standaloneBody({ sourceProjectId: 'meu-projeto', challengeKey: 'm:2026-06' }),
    )
    expect(first.thread.challengeKey).toBe('m:2026-06')
    expect(first.thread.gameUpdatedAt).toBeNull()
    const notified = ctx.members.standaloneShowcases.length

    now = new Date('2026-07-02T12:00:00.000Z')
    const again = await publish(
      ctx,
      STANDALONE,
      headers,
      standaloneBody({ sourceProjectId: 'meu-projeto', challengeKey: 'm:2026-07' }),
    )
    expect(again.existing).toBe(true)
    expect(again.thread.id).toBe(first.thread.id)

    const updated = await post(ctx, `${STANDALONE}/update`, headers, {
      ...standaloneBody({ sourceProjectId: 'meu-projeto' }),
      playId: first.thread.playId,
      title: 'Meu jogo 2',
      description: 'Agora com chefão!',
      coverImageUrl: 'https://cdn.example.com/capa-2.png',
    })
    expect(updated.status).toBe(200)
    const result = (await updated.json()) as {
      thread: ThreadJson
      previousCoverUrl: string | null
      updated: true
    }
    expect(result.thread.id).toBe(first.thread.id)
    expect(result.thread.playId).toBe(first.thread.playId)
    expect(result.thread.title).toBe('Meu jogo 2')
    expect(result.thread.body).toBe('Agora com chefão!')
    expect(result.thread.coverImageUrl).toBe('https://cdn.example.com/capa-2.png')
    expect(result.previousCoverUrl).toBe('https://cdn.example.com/capa.png')
    expect(result.thread.createdAt).toBe(first.thread.createdAt)
    expect(result.thread.lastActivityAt).toBe(first.thread.lastActivityAt)
    expect(result.thread.gameUpdatedAt).toBe(now.toISOString())
    // O desafio continua no mês da 1ª publicação.
    expect(result.thread.challengeKey).toBe('m:2026-06')
    // Atualizar não é publicar de novo: sem XP/marco/desafio repetido.
    expect(ctx.members.standaloneShowcases.length).toBe(notified)
    expect(ctx.members.challengeNotifications).toHaveLength(1)
    expect(ctx.threadRepo.threads).toHaveLength(1)
  })

  test('sem capa nova o post mantém a capa atual', async () => {
    const accountId = randomUUID()
    ctx.members.communitiesByUser.set(accountId, new Set(['estudio-completo']))
    const headers = child(accountId)
    const first = await publish(ctx, STANDALONE, headers, standaloneBody({ sourceProjectId: 'p1' }))
    const res = await post(ctx, `${STANDALONE}/update`, headers, {
      ...standaloneBody({ sourceProjectId: 'p1' }),
      playId: first.thread.playId,
      coverImageUrl: null,
    })
    const body = (await res.json()) as { thread: ThreadJson; previousCoverUrl: string | null }
    expect(body.thread.coverImageUrl).toBe('https://cdn.example.com/capa.png')
    expect(body.previousCoverUrl).toBeNull()
  })

  test('"Publicar como jogo novo" cria outro post e passa o vínculo para ele', async () => {
    const accountId = randomUUID()
    ctx.members.communitiesByUser.set(accountId, new Set(['estudio-completo']))
    const headers = child(accountId)
    const first = await publish(ctx, STANDALONE, headers, standaloneBody({ sourceProjectId: 'p1' }))
    const second = await publish(
      ctx,
      STANDALONE,
      headers,
      standaloneBody({ sourceProjectId: 'p1', asNewPost: true }),
    )
    expect(second.thread.id).not.toBe(first.thread.id)
    const status = await post(ctx, '/hub/internal/showcase-source', headers, {
      kind: 'free',
      spaceSlug: 'mural-dos-criadores',
      projectId: 'p1',
    })
    expect(((await status.json()) as { thread: ThreadJson }).thread.id).toBe(second.thread.id)
    const stale = await post(ctx, `${STANDALONE}/update`, headers, {
      ...standaloneBody({ sourceProjectId: 'p1' }),
      playId: first.thread.playId,
    })
    expect(stale.status).toBe(403)
  })

  test('projetos diferentes e autores diferentes nunca se misturam', async () => {
    const a = randomUUID(),
      b = randomUUID()
    for (const id of [a, b]) ctx.members.communitiesByUser.set(id, new Set(['estudio-completo']))
    const first = await publish(
      ctx,
      STANDALONE,
      child(a),
      standaloneBody({ sourceProjectId: 'p1' }),
    )
    const other = await publish(
      ctx,
      STANDALONE,
      child(a),
      standaloneBody({ sourceProjectId: 'p2' }),
    )
    const someoneElse = await publish(
      ctx,
      STANDALONE,
      child(b),
      standaloneBody({ sourceProjectId: 'p1' }),
    )
    expect(new Set([first.thread.id, other.thread.id, someoneElse.thread.id]).size).toBe(3)
    const hijack = await post(ctx, `${STANDALONE}/update`, child(b), {
      ...standaloneBody({ sourceProjectId: 'p1' }),
      playId: first.thread.playId,
    })
    expect(hijack.status).toBe(403)
  })

  test('post apagado perde o vínculo; oculto continua atualizável e oculto', async () => {
    const accountId = randomUUID()
    ctx.members.communitiesByUser.set(accountId, new Set(['estudio-completo']))
    const headers = child(accountId)
    const first = await publish(ctx, STANDALONE, headers, standaloneBody({ sourceProjectId: 'p1' }))
    await ctx.threadRepo.setThreadStatus(first.thread.id, 'hidden', ['visible'], now)
    const hidden = await post(ctx, `${STANDALONE}/update`, headers, {
      ...standaloneBody({ sourceProjectId: 'p1' }),
      playId: first.thread.playId,
    })
    expect(((await hidden.json()) as { thread: ThreadJson }).thread.status).toBe('hidden')
    await ctx.threadRepo.setThreadStatus(first.thread.id, 'deleted', ['hidden'], now)
    const next = await publish(ctx, STANDALONE, headers, standaloneBody({ sourceProjectId: 'p1' }))
    expect(next.existing).toBeUndefined()
    expect(next.thread.id).not.toBe(first.thread.id)
  })

  test('cliente antigo (sem sourceProjectId) segue criando um post por publicação', async () => {
    const accountId = randomUUID()
    ctx.members.communitiesByUser.set(accountId, new Set(['estudio-completo']))
    const headers = child(accountId)
    const first = await publish(ctx, STANDALONE, headers, standaloneBody())
    const second = await publish(ctx, STANDALONE, headers, standaloneBody())
    expect(second.thread.id).not.toBe(first.thread.id)
  })

  test('adoção: link local de publicação antiga vincula o post de antes ao projeto', async () => {
    const accountId = randomUUID()
    ctx.members.communitiesByUser.set(accountId, new Set(['estudio-completo']))
    const headers = child(accountId)
    const legacy = await publish(ctx, STANDALONE, headers, standaloneBody())
    const status = await post(ctx, '/hub/internal/showcase-source', headers, {
      kind: 'free',
      spaceSlug: 'mural-dos-criadores',
      projectId: 'antigo',
      adoptPlayId: legacy.thread.playId,
    })
    expect(((await status.json()) as { thread: ThreadJson }).thread.id).toBe(legacy.thread.id)
    const again = await publish(
      ctx,
      STANDALONE,
      headers,
      standaloneBody({ sourceProjectId: 'antigo' }),
    )
    expect(again.thread.id).toBe(legacy.thread.id)
    // Ninguém adota o post de outra pessoa.
    const stranger = randomUUID()
    const theft = await post(ctx, '/hub/internal/showcase-source', child(stranger), {
      kind: 'free',
      spaceSlug: 'mural-dos-criadores',
      projectId: 'x',
      adoptPlayId: legacy.thread.playId,
    })
    expect(((await theft.json()) as { thread: ThreadJson | null }).thread).toBeNull()
  })

  test('aula: status, update com título autoritativo e post antigo adotado pela reserva', async () => {
    const authorId = randomUUID()
    const headers = child(authorId)
    const none = await post(ctx, '/hub/internal/showcase-source', headers, {
      kind: 'lesson',
      lessonId: LESSON_ID,
      blockId: BLOCK_ID,
    })
    expect(((await none.json()) as { thread: null }).thread).toBeNull()
    const first = await publish(ctx, LESSON, headers, lessonBody())
    // Simula um post de ANTES deste lote: sem vínculo de projeto.
    ctx.threadRepo.sourceKeys.clear()
    const status = await post(ctx, '/hub/internal/showcase-source', headers, {
      kind: 'lesson',
      lessonId: LESSON_ID,
      blockId: BLOCK_ID,
    })
    expect(((await status.json()) as { thread: ThreadJson }).thread.id).toBe(first.thread.id)
    const res = await post(ctx, `${LESSON}/update`, headers, {
      ...lessonBody(),
      playId: first.thread.playId,
      description: 'Versão nova',
    })
    expect(res.status).toBe(200)
    const updated = (await res.json()) as { thread: ThreadJson }
    expect(updated.thread.body).toBe('Versão nova')
    expect(updated.thread.title).toBe(first.thread.title)
    expect(updated.thread.gameUpdatedAt).not.toBeNull()
  })

  test('restaurar uma versão carimba a atualização só para o autor', async () => {
    const accountId = randomUUID()
    ctx.members.communitiesByUser.set(accountId, new Set(['estudio-completo']))
    const first = await publish(
      ctx,
      STANDALONE,
      child(accountId),
      standaloneBody({ sourceProjectId: 'p1' }),
    )
    const stranger = await post(
      ctx,
      '/hub/internal/showcase-thread-studio/touch',
      child(randomUUID()),
      {
        playId: first.thread.playId,
      },
    )
    expect(await stranger.json()).toEqual({ touched: false })
    const own = await post(ctx, '/hub/internal/showcase-thread-studio/touch', child(accountId), {
      playId: first.thread.playId,
    })
    expect(await own.json()).toEqual({ touched: true })
    expect(ctx.threadRepo.threads[0]?.gameUpdatedAt?.toISOString()).toBe(now.toISOString())
  })
})
