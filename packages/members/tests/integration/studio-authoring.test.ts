import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { isLearningManifest } from '@sistemazero/core/learning'
import { StudioAuthoringOptionsSchema } from '@sistemazero/core/studio/authoring-catalog'
import { changeDraft, publishBlock, publishDraft, readDraft } from '../draft-authoring-helpers'
import { authoringFixture } from '../fakes/studio-authoring-policy'
import { buildApp, seedSampleCourse } from '../helpers'

function manifest(project: unknown, pythonLevel?: unknown) {
  return {
    version: 5,
    courseSlug: 'oficina',
    lessonSlug: 'primeiro-jogo',
    title: 'Primeiro jogo',
    blocks: [
      {
        key: 'projeto',
        content: {
          kind: 'studio',
          initialProject: project,
          ...(pythonLevel !== undefined ? { pythonLevel } : {}),
        },
      },
    ],
    sections: [
      {
        key: 'pratica',
        title: 'Criar',
        objective: '',
        intent: 'application',
        blockKeys: ['projeto'],
        workspaceKey: 'projeto',
        externalTool: null,
        pendingMedia: [],
        completion: { version: 1, blockIds: ['projeto'] },
      },
    ],
  }
}

for (const language of ['javascript', 'python'] as const)
  for (const kind of ['classic', 'pro'] as const)
    test(`manifest and authenticated draft publication preserve ${language}/${kind}`, async () => {
      const { project, policy } = await authoringFixture(language, kind)
      const source = JSON.stringify(project)
      expect(isLearningManifest(manifest(project))).toBe(true)
      expect(isLearningManifest(manifest(project, 2))).toBe(true)
      expect(isLearningManifest(manifest(project, 4))).toBe(false)
      expect(isLearningManifest(manifest({ ...project, formatVersion: 4 }))).toBe(false)
      expect(isLearningManifest(manifest({ ...project, programmingLanguage: 'ruby' }))).toBe(false)
      const env = buildApp({ studioAuthoringPolicy: policy })
      const { lessonIds } = seedSampleCourse(env.courses)
      const blockId = randomUUID()
      const response = await publishBlock(
        env.app,
        lessonIds[1],
        {
          content: {
            kind: 'studio',
            initialProject: project,
            ...(language === 'python' ? { pythonLevel: 2 } : {}),
          },
        },
        {},
        blockId,
      )
      expect({ status: response.status, body: await response.json() }).toMatchObject({
        status: 200,
      })
      const saved = env.courses.blocks.find((block) => block.id === blockId)
      expect(saved?.content.kind).toBe('studio')
      if (saved?.content.kind !== 'studio') throw new Error('Missing published block')
      expect(JSON.stringify(saved.content.initialProject)).toBe(source)
      expect(saved.content.pythonLevel).toBe(language === 'python' ? 2 : undefined)
    })

test('unconfigured runtime leaves the recoverable draft intact and does not publish it', async () => {
  const { project } = await authoringFixture('python', 'pro')
  const env = buildApp()
  const { lessonIds } = seedSampleCourse(env.courses)
  const lessonId = lessonIds[1]
  const before = await readDraft(env.app, lessonId)
  const blockId = randomUUID()
  const saved = await changeDraft(env.app, lessonId, {
    type: 'block',
    block: { id: blockId, content: { kind: 'studio', initialProject: project } },
    sectionId: before.document.sections[0]!.id,
  })
  expect(saved.status).toBe(200)
  const rejected = await publishDraft(env.app, lessonId)
  expect(rejected.status).toBe(400)
  expect(await rejected.text()).toContain('catálogo')
  expect(env.courses.blocks.some((block) => block.id === blockId)).toBe(false)
  expect(
    (await readDraft(env.app, lessonId)).document.blocks.find((block) => block.id === blockId)
      ?.content.initialProject,
  ).toEqual(project)
})

test('authoring discovery requires the internal gateway and an active admin/staff role', async () => {
  const { policy, configuration } = await authoringFixture('python', 'classic')
  const env = buildApp({
    studioAuthoringPolicy: policy,
    requireAdmin: true,
    internalToken: 'catalog-test-token',
  })
  const url = 'http://localhost/members/admin/studio/authoring-options'
  for (const headers of [
    {},
    { 'x-auth-user-role': 'admin', 'x-auth-user-status': 'active' },
    { 'x-internal-token': 'catalog-test-token' },
    {
      'x-internal-token': 'catalog-test-token',
      'x-auth-user-role': 'student',
      'x-auth-user-status': 'active',
    },
    {
      'x-internal-token': 'catalog-test-token',
      'x-auth-user-role': 'admin',
      'x-auth-user-status': 'inactive',
    },
  ]) {
    const response = await env.app.handle(
      new Request(url, { headers: headers as Record<string, string> }),
    )
    expect([401, 403]).toContain(response.status)
  }
  for (const role of ['admin', 'staff', 'superadmin']) {
    const response = await env.app.handle(
      new Request(url, {
        headers: {
          'x-internal-token': 'catalog-test-token',
          'x-auth-user-role': role,
          'x-auth-user-status': 'active',
        },
      }),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    const options = StudioAuthoringOptionsSchema.parse(await response.json())
    expect(options.catalog).toEqual(configuration)
    expect(options.legacyJavaScript).toBe(true)
    expect(options).not.toHaveProperty('grant')
  }
})

test('absent configuration discovers only legacy JavaScript and does not invent runtime approval', async () => {
  const env = buildApp()
  const response = await env.app.handle(
    new Request('http://localhost/members/admin/studio/authoring-options'),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ legacyJavaScript: true, catalog: null })
})
