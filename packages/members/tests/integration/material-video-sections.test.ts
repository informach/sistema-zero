import { describe, expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { defaultLessonSection } from '@sistemazero/core/learning'
import type { LessonDetailView } from '../../src/application/mappers/views'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

function setup(material: boolean, legacy = false) {
  const env = buildApp(),
    course = seedSampleCourse(env.courses)
  const userId = randomUUID(),
    lessonId = course.lessonIds[0],
    blockId = randomUUID(),
    sectionId = legacy ? lessonId : randomUUID(),
    videoId = randomUUID(),
    revision = 'a'.repeat(32)
  grantLifetime(env.entitlements, { userId, courseRef: course.slug })
  env.courses.blocks = env.courses.blocks.filter((block) => block.lessonId !== lessonId)
  env.courses.blocks.push({
    id: blockId,
    lessonId,
    kind: material ? 'ebook' : 'video',
    contentRevision: revision,
    sortOrder: 0,
    content: material
      ? { kind: 'ebook', title: 'Meu caderno', attachmentId: env.courses.attachments[0]!.id }
      : { kind: 'video', src: 'https://vimeo.com/123456789', provider: 'vimeo' },
  })
  if (material)
    env.courses.blocks.push({
      id: videoId,
      lessonId,
      kind: legacy ? 'rich_text' : 'video',
      sortOrder: 1,
      contentRevision: revision,
      content: legacy
        ? { kind: 'rich_text', markdown: 'O caderno do curso.' }
        : { kind: 'video', provider: 'vimeo', src: 'https://vimeo.com/987654321' },
    })
  env.learningRepository.structures.set(lessonId, {
    revision: randomUUID(),
    sections: [
      {
        ...defaultLessonSection(sectionId, 'Material', [blockId, ...(material ? [videoId] : [])]),
        ...(legacy
          ? {}
          : {
              intent: material ? ('material' as const) : ('explanation' as const),
              completion: { version: 1, blockIds: [blockId] },
            }),
      },
    ],
  })
  const request = (path: string, method = 'GET', body?: unknown) =>
    env.app.handle(
      new Request(`http://localhost/members${path}`, {
        method,
        headers: { 'x-auth-user-id': userId, 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    )
  const save = (answers: Record<string, string | number | boolean | string[]>) =>
    request(`/lessons/${lessonId}/blocks/${blockId}/learning-progress`, 'PUT', {
      revision,
      answers,
      hintsUsed: 0,
      positionSeconds: null,
    })
  const read = (): Promise<LessonDetailView> =>
    request(`/courses/${course.slug}/lessons/${lessonId}`).then(
      (response) => response.json() as Promise<LessonDetailView>,
    )
  const complete = () => request(`/lessons/${lessonId}/complete`, 'POST')
  return { read, save, complete }
}
describe('material and watching are distinct section criteria', () => {
  test('a video and one selected file are both required; another file stays optional', async () => {
    const env = buildApp()
    const course = seedSampleCourse(env.courses)
    const userId = randomUUID()
    const lessonId = course.lessonIds[0]
    const videoId = randomUUID()
    const materialsId = randomUUID()
    const requiredId = randomUUID()
    const optionalId = randomUUID()
    const attachmentId = randomUUID()
    const optionalAttachmentId = randomUUID()
    const revision = 'b'.repeat(32)
    grantLifetime(env.entitlements, { userId, courseRef: course.slug })
    env.courses.blocks = env.courses.blocks.filter((block) => block.lessonId !== lessonId)
    env.courses.blocks.push(
      {
        id: videoId,
        lessonId,
        kind: 'video',
        sortOrder: 0,
        contentRevision: revision,
        content: { kind: 'video', provider: 'vimeo', src: 'https://vimeo.com/123456789' },
      },
      {
        id: materialsId,
        lessonId,
        kind: 'materials',
        sortOrder: 1,
        contentRevision: revision,
        content: {
          kind: 'materials',
          items: [
            { id: requiredId, kind: 'file', attachmentId },
            { id: optionalId, kind: 'file', attachmentId: optionalAttachmentId },
          ],
        },
      },
    )
    env.courses.attachments.push(
      {
        id: attachmentId,
        lessonId,
        label: 'Obrigatório',
        url: 'r2priv:arquivo.pdf',
        fileType: 'application/pdf',
        sizeBytes: 100,
        zappyStudentNotebook: false,
        sortOrder: 1,
      },
      {
        id: optionalAttachmentId,
        lessonId,
        label: 'Opcional',
        url: 'r2priv:outro.pdf',
        fileType: 'application/pdf',
        sizeBytes: 100,
        zappyStudentNotebook: false,
        sortOrder: 2,
      },
    )
    env.learningRepository.structures.set(lessonId, {
      revision: randomUUID(),
      sections: [
        {
          ...defaultLessonSection(randomUUID(), 'Vídeo e arquivos', [videoId, materialsId]),
          completion: {
            version: 1,
            blockIds: [videoId, materialsId],
            materialItems: [{ blockId: materialsId, itemIds: [requiredId] }],
          },
        },
      ],
    })
    const request = (path: string, method = 'GET', body?: unknown, actor = userId) =>
      env.app.handle(
        new Request(`http://localhost/members${path}`, {
          method,
          headers: {
            'x-auth-user-id': actor,
            'x-consumer-id': 'member-shell',
            'content-type': 'application/json',
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      )
    const progress = async () =>
      (
        (await (
          await request(`/courses/${course.slug}/lessons/${lessonId}`)
        ).json()) as LessonDetailView
      ).sectionProgress?.completed
    const record = (
      itemId: string,
      attachmentId: string,
      actor = userId,
      account = actor,
      expectedRevision = revision,
      expectedStorageRefHash = createHash('sha256')
        .update(attachmentId === optionalAttachmentId ? 'r2priv:outro.pdf' : 'r2priv:arquivo.pdf')
        .digest('hex'),
    ) =>
      request(
        '/internal/material-downloads',
        'POST',
        {
          actor: { userId: actor, accountId: account },
          courseSlug: course.slug,
          lessonId,
          blockId: materialsId,
          itemId,
          attachmentId,
          expectedRevision,
          expectedStorageRefHash,
        },
        actor,
      )
    expect(await progress()).toBe(0)
    expect((await record(optionalId, optionalAttachmentId)).status).toBe(200)
    expect(
      (
        await env.learningRepository.getProgress({ userId, accountId: userId }, lessonId)
      ).blocks.find((block) => block.blockId === materialsId),
    ).toBeUndefined()
    expect(await progress()).toBe(0)
    expect((await record(requiredId, optionalAttachmentId)).status).toBe(404)
    expect((await record(requiredId, attachmentId, userId, userId, 'c'.repeat(32))).status).toBe(
      409,
    )
    expect(
      (await record(requiredId, attachmentId, userId, userId, revision, '0'.repeat(64))).status,
    ).toBe(409)
    expect((await record(requiredId, attachmentId, randomUUID())).status).not.toBe(200)
    const sibling = randomUUID()
    expect((await record(requiredId, attachmentId, sibling, userId)).status).toBe(200)
    expect(
      (
        await env.learningRepository.getProgress({ userId, accountId: userId }, lessonId)
      ).blocks.find((block) => block.blockId === materialsId),
    ).toBeUndefined()
    expect((await record(requiredId, attachmentId)).status).toBe(200)
    expect((await record(requiredId, attachmentId)).status).toBe(200)
    expect(await progress()).toBe(0)
    const watched = await request(
      `/lessons/${lessonId}/blocks/${videoId}/learning-progress`,
      'PUT',
      {
        revision,
        answers: { videoDuration: 100, videoRanges: ['0:90'] },
        hintsUsed: 0,
        positionSeconds: 90,
      },
    )
    expect(watched.status).toBe(200)
    expect(await progress()).toBe(1)
    expect((await request(`/lessons/${lessonId}/complete`, 'POST')).status).toBe(200)
  })
  test.each([
    true,
    false,
  ])('open OR download completes the material stage without a quiz or watching gate; legacy=%s', async (legacy) => {
    for (const method of ['opened', 'downloaded']) {
      const ctx = setup(true, legacy)
      expect((await ctx.read()).sections).toHaveLength(1)
      expect((await ctx.complete()).status).not.toBe(200)
      expect((await ctx.save({ passed: true })).status).toBe(400)
      expect((await ctx.save({ materialAccess: method })).status).toBe(200)
      expect((await ctx.read()).sectionProgress?.completed).toBe(1)
      expect((await ctx.complete()).status).toBe(200)
    }
  })
  test('a new isolated video requires 90% played, including after reopening', async () => {
    const ctx = setup(false)
    expect((await ctx.save({ videoDuration: 100, videoRanges: ['90:100'] })).status).toBe(200)
    expect((await ctx.read()).sectionProgress?.completed).toBe(0)
    expect((await ctx.complete()).status).not.toBe(200)
    expect((await ctx.save({ videoDuration: 100, videoRanges: ['0:80'] })).status).toBe(200)
    expect((await ctx.read()).sectionProgress?.completed).toBe(1)
    expect((await ctx.complete()).status).toBe(200)
  })
})
