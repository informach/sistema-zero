import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { defaultLessonSection, type PlatformAction } from '@sistemazero/core/learning'
import { defaultAvatarConfig } from '../../src/domain/avatar/avatar-config'
import { DEFAULT_ROOM_WALL_COLORS, defaultRoomState } from '../../src/domain/room/room-catalog'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

function setup(action: PlatformAction) {
  const env = buildApp(),
    course = seedSampleCourse(env.courses, 'tour', 'published', 'kids')
  const owner = { userId: randomUUID(), accountId: randomUUID() },
    sibling = randomUUID()
  const lessonId = course.lessonIds[0],
    sectionId = randomUUID(),
    nextId = randomUUID(),
    revision = randomUUID()
  grantLifetime(env.entitlements, { userId: owner.accountId, courseRef: course.slug })
  env.courses.blocks = env.courses.blocks.filter((block) => block.lessonId !== lessonId)
  const dialogueId = randomUUID()
  env.courses.blocks.push({
    id: dialogueId,
    lessonId,
    kind: 'dialogue',
    contentRevision: 'a'.repeat(32),
    sortOrder: 0,
    content: { kind: 'dialogue', pose: 'speaking', text: 'Deixe do seu jeito!' },
  })
  env.learningRepository.structures.set(lessonId, {
    revision,
    sections: [
      {
        ...defaultLessonSection(sectionId, 'Sua missão', [dialogueId]),
        completion: { version: 1, blockIds: [], platformAction: action },
      },
      {
        ...defaultLessonSection(nextId, 'Outra missão', []),
        completion: { version: 1, blockIds: [], platformAction: 'customize-room' },
      },
    ],
  })
  const request = (path: string, method = 'GET', body?: unknown, userId = owner.userId) =>
    env.app.handle(
      new Request(`http://localhost/members${path}`, {
        method,
        headers: {
          'x-auth-user-id': userId,
          'x-auth-account-id': owner.accountId,
          'content-type': 'application/json',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    )
  const verify = (target = sectionId, rev = revision, userId = owner.userId) =>
    request(
      `/lessons/${lessonId}/sections/${target}/action-check`,
      'POST',
      { revision: rev },
      userId,
    )
  return { ...env, course, owner, sibling, lessonId, sectionId, nextId, revision, request, verify }
}

describe('platform actions as section criteria', () => {
  test('default avatar and merely saving it do not pass; an earlier real change passes with current preview', async () => {
    const ctx = setup('customize-avatar')
    expect(await (await ctx.verify()).json()).toMatchObject({
      passed: false,
      sectionProgress: { completed: 0 },
    })
    await ctx.avatar.upsertConfig(
      ctx.owner.userId,
      ctx.owner.accountId,
      'kids',
      defaultAvatarConfig(),
      new Date(),
    )
    expect(await (await ctx.verify()).json()).toMatchObject({ passed: false })
    const config = defaultAvatarConfig()
    config.slots.top = { asset: 'top-01', color: '#e74c3c' }
    await ctx.avatar.upsertConfig(ctx.owner.userId, ctx.owner.accountId, 'kids', config, new Date())
    expect(await (await ctx.verify()).json()).toMatchObject({
      passed: true,
      avatarSlots: { top: config.slots.top },
      sectionProgress: { completed: 1 },
    })
    expect(await (await ctx.verify(ctx.sectionId, ctx.revision, ctx.sibling)).json()).toMatchObject(
      { passed: false },
    )
    const evidence = await ctx.learningRepository.listEvidence(ctx.owner, ctx.lessonId)
    expect(evidence.some((item) => item.kind === 'platform_action')).toBe(true)
    await ctx.avatar.upsertConfig(
      ctx.owner.userId,
      ctx.owner.accountId,
      'kids',
      defaultAvatarConfig(),
      new Date(),
    )
    expect(
      await (await ctx.request(`/courses/${ctx.course.slug}/lessons/${ctx.lessonId}`)).json(),
    ).toMatchObject({ sectionProgress: { completed: 1 } })
  })
  test('locked and stale checks cannot create completion', async () => {
    const ctx = setup('customize-avatar')
    expect((await ctx.verify(ctx.nextId)).status).toBe(423)
    expect((await ctx.verify(ctx.sectionId, randomUUID())).status).toBe(409)
    expect((await ctx.verify(randomUUID())).status).toBe(404)
  })
  test('room defaults explicitly saved still do not pass; a different saved wall does', async () => {
    const ctx = setup('customize-room')
    await ctx.room.upsertState(
      ctx.owner.userId,
      ctx.owner.accountId,
      'kids',
      {
        ...defaultRoomState(),
        floor: 'piso-madeira-clara',
        lighting: 'dia',
        wallColors: DEFAULT_ROOM_WALL_COLORS,
      },
      new Date(),
    )
    expect(await (await ctx.verify()).json()).toMatchObject({ passed: false })
    await ctx.room.upsertState(
      ctx.owner.userId,
      ctx.owner.accountId,
      'kids',
      { ...defaultRoomState(), wallColors: { left: '#a6d8b9' } },
      new Date(),
    )
    expect(await (await ctx.verify()).json()).toMatchObject({ passed: true })
  })
  test('theme checks saved per-profile preference; default, invalid theme and sibling preference do not pass', async () => {
    const ctx = setup('change-theme')
    expect(await (await ctx.verify()).json()).toMatchObject({ passed: false })
    expect((await ctx.request('/preferences/kids', 'PUT', { theme: 'purple' })).status).toBe(400)
    expect(
      (await ctx.request('/preferences/kids', 'PUT', { theme: 'pink' }, ctx.sibling)).status,
    ).toBe(200)
    expect(await (await ctx.verify()).json()).toMatchObject({ passed: false })
    expect((await ctx.request('/preferences/kids', 'PUT', { theme: 'padrao' })).status).toBe(200)
    expect(await (await ctx.verify()).json()).toMatchObject({ passed: false })
    expect((await ctx.request('/preferences/kids', 'PUT', { theme: 'pink' })).status).toBe(200)
    expect(await (await ctx.verify()).json()).toMatchObject({
      passed: true,
      theme: 'pink',
      sectionProgress: { completed: 1 },
    })
    expect(await (await ctx.request('/preferences/kids')).json()).toEqual({ theme: 'pink' })
  })
})
