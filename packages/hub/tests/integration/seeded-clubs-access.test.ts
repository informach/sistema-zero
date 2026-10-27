import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { COMMUNITY_SEED_DEFINITIONS } from '../../scripts/community-seed-plan'
import { adminHeaders, buildApp, jsonRequest, studentHeaders } from '../helpers'

test('seeded clubs isolate entitlement, conversations and team-only announcements', async () => {
  const ctx = buildApp()
  const clubs = COMMUNITY_SEED_DEFINITIONS.filter((d) => d.space.slug.startsWith('clube-'))
  expect(clubs).toHaveLength(2)
  const ids = new Map<string, { general: string; announcements: string }>()
  for (const definition of clubs) {
    const space = await ctx.repo.createSpace(definition.space)
    const channels = await Promise.all(
      definition.channels.map((channel) => ctx.repo.createChannel(space.id, channel)),
    )
    ids.set(space.audience, {
      general: channels.find((c) => c.slug === 'geral')!.id,
      announcements: channels.find((c) => c.slug === 'recados-da-equipe')!.id,
    })
  }
  for (const audience of ['adult', 'kids'] as const) {
    const user = randomUUID()
    const own = ids.get(audience)!
    const other = ids.get(audience === 'adult' ? 'kids' : 'adult')!
    ctx.members.communitiesByUser.set(
      user,
      new Set([audience === 'adult' ? 'adult-clube-dos-criadores' : 'clube-dos-criadores']),
    )
    const headers = studentHeaders(user)
    const post = (channel: string, auth = headers) =>
      ctx.app.handle(
        jsonRequest('POST', `/hub/channels/${channel}/threads`, {
          headers: auth,
          body: { title: 'Minha criação', body: 'Uma dúvida sobre meu projeto.' },
        }),
      )
    const created = await post(own.general)
    expect(created.status).toBe(201)
    expect(await created.json()).toMatchObject({
      status: audience === 'kids' ? 'pending' : 'visible',
    })
    expect((await post(other.general)).status).toBe(403)
    const crossRead = await ctx.app.handle(
      jsonRequest('GET', `/hub/channels/${other.general}/threads`, { headers }),
    )
    expect(crossRead.status).toBe(403)
    expect((await post(own.announcements)).status).toBe(403)
    expect((await post(own.announcements, adminHeaders())).status).toBe(201)
  }
})
