import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { AccessConfig } from '../../src/domain/access/access-config'
import type {
  ChannelFields,
  SpaceFields,
} from '../../src/domain/ports/community-admin-repository.port'
import { adminHeaders, buildApp, jsonRequest, studentHeaders } from '../helpers'

const PUBLIC: AccessConfig = { visibility: 'public', courses: [], roles: [] }

const spaceFields = (over: Partial<SpaceFields> & { slug: string }): SpaceFields => ({
  name: over.slug,
  description: null,
  iconUrl: null,
  audience: 'adult',
  accessConfig: PUBLIC,
  requiresApproval: false,
  teaserWhenLocked: false,
  status: 'active',
  ...over,
})
const channelFields = (over: Partial<ChannelFields> & { slug: string }): ChannelFields => ({
  name: over.slug,
  topic: null,
  accessConfig: null,
  postingPolicy: 'members',
  requiresApproval: null,
  status: 'active',
  ...over,
})

async function seedChannel(
  ctx: ReturnType<typeof buildApp>,
  over: { space?: Partial<SpaceFields>; channel?: Partial<ChannelFields> } = {},
) {
  const space = await ctx.repo.createSpace(
    spaceFields({ slug: `s-${randomUUID().slice(0, 6)}`, ...over.space }),
  )
  const channel = await ctx.repo.createChannel(
    space.id,
    channelFields({ slug: `c-${randomUUID().slice(0, 6)}`, ...over.channel }),
  )
  return { space, channelId: channel.id }
}

/** Registra um anexo (pending_upload) e devolve o id. */
async function registerAttachment(
  ctx: ReturnType<typeof buildApp>,
  headers: Record<string, string>,
  over: Partial<{
    kind: string
    mime: string
    sizeBytes: number
    originalName: string
    storageRef: string
  }> = {},
) {
  const res = await ctx.app.handle(
    jsonRequest('POST', '/hub/attachments', {
      headers,
      body: {
        kind: 'image',
        mime: 'image/webp',
        sizeBytes: 1024,
        originalName: 'foto.webp',
        storageRef: `r2ugc:hub/${randomUUID()}`,
        ...over,
      },
    }),
  )
  return res
}

describe('anexos', () => {
  test('registra anexo, vincula ao tópico e aparece na view', async () => {
    const ctx = buildApp()
    const { channelId } = await seedChannel(ctx)
    const user = randomUUID()
    const headers = studentHeaders(user)

    const reg = await registerAttachment(ctx, headers)
    expect(reg.status).toBe(201)
    const { id: attachmentId } = (await reg.json()) as { id: string }

    const created = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
        headers,
        body: { title: 'Com anexo', body: 'veja a foto', attachmentIds: [attachmentId] },
      }),
    )
    expect(created.status).toBe(201)
    const thread = (await created.json()) as {
      id: string
      attachments: Array<{ id: string; kind: string }>
    }
    expect(thread.attachments).toHaveLength(1)
    expect(thread.attachments[0]?.id).toBe(attachmentId)
    expect(thread.attachments[0]?.kind).toBe('image')

    // E persiste na leitura.
    const got = await ctx.app.handle(jsonRequest('GET', `/hub/threads/${thread.id}`, { headers }))
    expect(((await got.json()) as { attachments: unknown[] }).attachments).toHaveLength(1)
  })

  test('anexo acima do limite do tipo → 400', async () => {
    const ctx = buildApp()
    const res = await registerAttachment(ctx, studentHeaders(randomUUID()), {
      kind: 'image',
      sizeBytes: 50 * 1024 * 1024, // > 10MB de imagem
    })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'ATTACHMENT_TOO_LARGE',
    )
  })

  test('não vincula anexo de outro usuário → 404', async () => {
    const ctx = buildApp()
    const { channelId } = await seedChannel(ctx)
    const owner = randomUUID()
    const reg = await registerAttachment(ctx, studentHeaders(owner))
    const { id: attachmentId } = (await reg.json()) as { id: string }

    // Outro usuário tenta usar o id do anexo do owner.
    const created = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
        headers: studentHeaders(randomUUID()),
        body: { title: 'Roubo', body: 'x', attachmentIds: [attachmentId] },
      }),
    )
    expect(created.status).toBe(404)
  })

  test('resolve: pending só o dono; ready exige acesso ao tópico', async () => {
    const ctx = buildApp()
    const { channelId } = await seedChannel(ctx)
    const owner = randomUUID()
    const headers = studentHeaders(owner)
    const reg = await registerAttachment(ctx, headers)
    const { id: attachmentId } = (await reg.json()) as { id: string }

    // pending: dono resolve, terceiro 404.
    const byOwnerPending = await ctx.app.handle(
      jsonRequest('GET', `/hub/attachments/${attachmentId}/resolve`, { headers }),
    )
    expect(byOwnerPending.status).toBe(200)
    expect(((await byOwnerPending.json()) as { storageRef: string }).storageRef).toContain('r2ugc:')

    const byOtherPending = await ctx.app.handle(
      jsonRequest('GET', `/hub/attachments/${attachmentId}/resolve`, {
        headers: studentHeaders(randomUUID()),
      }),
    )
    expect(byOtherPending.status).toBe(404)

    // Vincula a um tópico visível → vira ready.
    const created = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
        headers,
        body: { title: 'T', body: 'b', attachmentIds: [attachmentId] },
      }),
    )
    expect(created.status).toBe(201)

    // ready: outro aluno COM acesso ao canal público resolve.
    const byOtherReady = await ctx.app.handle(
      jsonRequest('GET', `/hub/attachments/${attachmentId}/resolve`, {
        headers: studentHeaders(randomUUID()),
      }),
    )
    expect(byOtherReady.status).toBe(200)
  })

  test('resolve ready em canal gated → 403 sem matrícula', async () => {
    const ctx = buildApp()
    const gated: AccessConfig = { visibility: 'course_gated', courses: ['curso-x'], roles: [] }
    const { channelId } = await seedChannel(ctx, { space: { accessConfig: gated } })
    const owner = randomUUID()
    ctx.members.grantsByUser.set(owner, new Set(['curso-x']))
    const headers = studentHeaders(owner)

    const reg = await registerAttachment(ctx, headers)
    const { id: attachmentId } = (await reg.json()) as { id: string }
    await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
        headers,
        body: { title: 'T', body: 'b', attachmentIds: [attachmentId] },
      }),
    )

    // Sem matrícula → 403.
    const denied = await ctx.app.handle(
      jsonRequest('GET', `/hub/attachments/${attachmentId}/resolve`, {
        headers: studentHeaders(randomUUID()),
      }),
    )
    expect(denied.status).toBe(403)
  })

  test('moderação resolve anexo de conteúdo oculto sem abrir acesso para o aluno', async () => {
    const ctx = buildApp()
    const { channelId } = await seedChannel(ctx)
    const owner = randomUUID()
    const ownerHeaders = studentHeaders(owner)
    const reg = await registerAttachment(ctx, ownerHeaders)
    const { id: attachmentId } = (await reg.json()) as { id: string }
    const created = await ctx.app.handle(
      jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
        headers: ownerHeaders,
        body: { title: 'Prova', body: 'conteúdo denunciado', attachmentIds: [attachmentId] },
      }),
    )
    const { id: threadId } = (await created.json()) as { id: string }
    await ctx.app.handle(
      jsonRequest('POST', `/hub/admin/threads/${threadId}/hide`, { headers: adminHeaders() }),
    )

    const studentResolve = await ctx.app.handle(
      jsonRequest('GET', `/hub/attachments/${attachmentId}/resolve`, { headers: ownerHeaders }),
    )
    expect(studentResolve.status).toBe(404)

    const moderationResolve = await ctx.app.handle(
      jsonRequest('GET', `/hub/admin/attachments/${attachmentId}/resolve`, {
        headers: adminHeaders(),
      }),
    )
    expect(moderationResolve.status).toBe(200)
    expect(((await moderationResolve.json()) as { storageRef: string }).storageRef).toStartWith(
      'r2ugc:',
    )

    const forgedStudent = await ctx.app.handle(
      jsonRequest('GET', `/hub/admin/attachments/${attachmentId}/resolve`, {
        headers: studentHeaders(randomUUID()),
      }),
    )
    expect(forgedStudent.status).toBe(403)
  })

  test('comentário com anexo: aparece na view e resolve pelo comentário', async () => {
    const ctx = buildApp()
    const { channelId } = await seedChannel(ctx)
    const user = randomUUID()
    const headers = studentHeaders(user)

    const t = (await (
      await ctx.app.handle(
        jsonRequest('POST', `/hub/channels/${channelId}/threads`, {
          headers,
          body: { title: 'T', body: 'b' },
        }),
      )
    ).json()) as { id: string }

    const reg = await registerAttachment(ctx, headers, { kind: 'pdf', mime: 'application/pdf' })
    const { id: attachmentId } = (await reg.json()) as { id: string }

    const c = await ctx.app.handle(
      jsonRequest('POST', `/hub/threads/${t.id}/comments`, {
        headers,
        body: { body: 'segue o doc', attachmentIds: [attachmentId] },
      }),
    )
    expect(c.status).toBe(201)
    expect(((await c.json()) as { attachments: unknown[] }).attachments).toHaveLength(1)

    const resolved = await ctx.app.handle(
      jsonRequest('GET', `/hub/attachments/${attachmentId}/resolve`, { headers }),
    )
    expect(resolved.status).toBe(200)
    expect(((await resolved.json()) as { kind: string }).kind).toBe('pdf')
  })
})
