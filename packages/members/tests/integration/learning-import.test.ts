import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { isLearningManifest } from '@sistemazero/core/learning'
import { changeDraft, readDraft } from '../draft-authoring-helpers'
import { buildApp, seedSampleCourse } from '../helpers'

const actor = '11111111-1111-1111-1111-111111111111'
async function setup(number: 1 | 2) {
  const env = buildApp({ requireAdmin: true })
  const course = seedSampleCourse(env.courses, 'corre-dino', 'published', 'kids')
  const lessonId = course.lessonIds[number - 1]
  if (!lessonId) throw new Error('Aula ausente na fixture')
  const document: unknown = await Bun.file(
    resolve(
      import.meta.dir,
      `../../../../docs/aulas-interativas/aulas/corre-dino-aula-0${number}.manifesto.json`,
    ),
  ).json()
  if (!isLearningManifest(document)) throw new Error('Manifesto inválido na fixture')
  const lesson = env.courses.lessons.find((item) => item.id === lessonId)
  if (!lesson) throw new Error('Aula ausente na fixture')
  lesson.slug = document.lessonSlug
  const request = (action: string, body: unknown) =>
    env.app.handle(
      new Request(`http://localhost/members/admin/lessons/${lessonId}/${action}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-auth-user-id': actor,
          'x-auth-user-role': 'admin',
          'x-auth-user-status': 'active',
        },
        body: JSON.stringify(body),
      }),
    )
  const preview = (mode: 'preserve' | 'replace' = 'preserve') =>
    request('import-preview', { document, mode })
  const apply = (
    expectedFingerprint: string,
    mode: 'preserve' | 'replace' = 'preserve',
    operationId = randomUUID(),
  ) => request('import-learning', { document, mode, expectedFingerprint, operationId })
  return { ...env, lessonId, document, preview, apply }
}

async function revision(response: Response) {
  const body: unknown = await response.json()
  if (
    !body ||
    typeof body !== 'object' ||
    !('fingerprint' in body) ||
    typeof body.fingerprint !== 'string'
  )
    throw new Error('A prévia não retornou sua revisão')
  return body.fingerprint
}

describe('manifest import through the authoring HTTP boundary', () => {
  test('Corre Dino 1 preserves the Studio ID and replaces its initial project from the manifest', async () => {
    const f = await setup(1)
    const id = randomUUID()
    const content = {
      kind: 'studio' as const,
      chain: 'corre-dino',
      initialProject: {
        formatVersion: 2,
        name: 'Projeto original',
        files: { 'index.html': '<p>Dino</p>' },
      },
    }
    f.courses.blocks.push({ id, lessonId: f.lessonId, kind: 'studio', content, sortOrder: 20 })
    const published = await f.courses.findLessonWithContent(f.lessonId)
    const before = await f.preview()
    expect(before.status).toBe(200)
    expect(await before.clone().json()).toMatchObject({
      warnings: expect.arrayContaining([
        'O projeto inicial do Estúdio será substituído pelo manifesto. Projetos e entregas já salvos pelos alunos não são apagados.',
      ]),
    })
    const expectedRevision = await revision(before)
    const response = await f.apply(expectedRevision)
    expect(response.status).toBe(200)
    const draft = await readDraft(f.app, f.lessonId)
    const configured = f.document.blocks.find(
      (block) => 'content' in block && block.content.kind === 'studio',
    )
    if (!configured || !('content' in configured) || configured.content.kind !== 'studio')
      throw new Error('Estúdio ausente')
    expect(draft.document.blocks.filter((b) => b.content.kind === 'studio')).toEqual([
      { id, content: configured.content },
    ])
    expect(draft.document.sections.filter((s) => s.workspaceBlockId)).toHaveLength(
      f.document.sections.filter((s) => s.workspaceKey).length,
    )
    expect(
      draft.document.sections
        .filter((s) => s.workspaceBlockId)
        .every((s) => s.workspaceBlockId === id),
    ).toBe(true)
    expect(draft.document.plannedVideos).toHaveLength(
      f.document.blocks.filter((b) => 'plannedVideo' in b).length,
    )
    expect(await f.courses.findLessonWithContent(f.lessonId)).toEqual(published)
    expect((await f.apply(expectedRevision)).status).toBe(409)
    const next = await revision(await f.preview())
    expect((await f.apply(next)).status).toBe(200)
    expect((await readDraft(f.app, f.lessonId)).document).toEqual(draft.document)
    expect((await f.apply('not-a-revision')).status).toBe(400)
  })

  test('an empty lesson creates its configured Studio and reimports without changing the ID', async () => {
    const f = await setup(2)
    const before = await readDraft(f.app, f.lessonId)
    const preview = await f.preview()
    expect(preview.status).toBe(200)
    expect((await readDraft(f.app, f.lessonId)).document).toEqual(before.document)
    expect((await f.apply(await revision(preview))).status).toBe(200)
    const draft = await readDraft(f.app, f.lessonId)
    const studio = draft.document.blocks.find((b) => b.content.kind === 'studio')
    const authored = f.document.blocks.find((b) => 'content' in b && b.content.kind === 'studio')
    if (!authored || !('content' in authored)) throw new Error('Estúdio ausente')
    const actual: unknown = studio?.content
    expect(actual).toEqual(authored.content)
    expect(draft.document.sections.filter((s) => s.workspaceBlockId)).toHaveLength(
      f.document.sections.filter((s) => s.workspaceKey).length,
    )
    expect(
      draft.document.sections
        .filter((s) => s.workspaceBlockId)
        .every((s) => s.workspaceBlockId === studio?.id),
    ).toBe(true)
    const next = await f.preview()
    expect((await f.apply(await revision(next))).status).toBe(200)
    expect((await readDraft(f.app, f.lessonId)).document).toEqual(draft.document)
    expect((await f.courses.findLessonWithContent(f.lessonId))?.blocks).toHaveLength(0)
  })

  test('refuses to guess which existing Studio block should keep student evidence', async () => {
    const f = await setup(2)
    for (const name of ['Primeiro', 'Segundo'])
      expect(
        (
          await changeDraft(f.app, f.lessonId, {
            type: 'block',
            block: {
              id: randomUUID(),
              content: { kind: 'studio', initialProject: { formatVersion: 2, name, files: {} } },
            },
          })
        ).status,
      ).toBe(200)
    const response = await f.preview()
    expect(response.status).toBe(400)
    expect(JSON.stringify(await response.json())).toContain('mais de um bloco de studio')
  })

  test('replace removes omissions, updates the Studio project and leaves published content unchanged', async () => {
    const f = await setup(2)
    const existing = await readDraft(f.app, f.lessonId)
    const studioBlockId = randomUUID()
    const initialProject = {
      formatVersion: 2 as const,
      name: 'Projeto que já estava configurado',
      files: { 'index.html': '<p>Configuração preservada</p>' },
    }
    const omittedBlockId = randomUUID()
    const omittedSectionId = randomUUID()
    expect(
      (
        await changeDraft(f.app, f.lessonId, {
          type: 'block',
          block: {
            id: studioBlockId,
            content: {
              kind: 'studio',
              chain: 'configuracao-anterior',
              initialProject,
            },
          },
          sectionId: existing.document.sections[0]?.id,
        })
      ).status,
    ).toBe(200)
    const withStudio = await readDraft(f.app, f.lessonId)
    expect(
      (
        await changeDraft(f.app, f.lessonId, {
          type: 'block',
          block: {
            id: omittedBlockId,
            content: { kind: 'rich_text', markdown: 'Texto que não existe no novo manifesto.' },
          },
          sectionId: withStudio.document.sections[0]?.id,
        })
      ).status,
    ).toBe(200)
    const withBlock = await readDraft(f.app, f.lessonId)
    expect(
      (
        await changeDraft(f.app, f.lessonId, {
          type: 'structure',
          sections: [
            ...withBlock.document.sections.map((section) => ({
              ...section,
              blockIds: section.blockIds.filter((id) => id !== omittedBlockId),
            })),
            {
              id: omittedSectionId,
              title: 'Seção antiga',
              objective: 'Será substituída pelo manifesto.',
              intent: 'closing',
              blockIds: [omittedBlockId],
              workspaceBlockId: null,
              externalTool: null,
              pendingMedia: [],
              completion: { version: 1, blockIds: [] },
            },
          ],
        })
      ).status,
    ).toBe(200)
    const published = await f.courses.findLessonWithContent(f.lessonId)

    const response = await f.preview('replace')
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      fingerprint: string
      blocks: Array<{ id: string; label?: string; action: string }>
      removedSections: Array<{ id: string; title: string }>
      warnings: string[]
    }
    expect(body.warnings).toContain(
      'O projeto inicial do Estúdio será substituído pelo manifesto. Projetos e entregas já salvos pelos alunos não são apagados.',
    )
    expect(body.blocks).toContainEqual({
      id: omittedBlockId,
      label: 'Texto · Seção antiga',
      action: 'remove',
    })
    expect(body.blocks).not.toContainEqual(
      expect.objectContaining({ id: studioBlockId, action: 'remove' }),
    )
    expect(body.removedSections).toContainEqual({ id: omittedSectionId, title: 'Seção antiga' })

    const operationId = randomUUID()
    const applied = await f.apply(body.fingerprint, 'replace', operationId)
    expect(applied.status).toBe(200)
    const draft = await readDraft(f.app, f.lessonId)
    const configured = f.document.blocks.find(
      (block) => 'content' in block && block.content.kind === 'studio',
    )
    if (!configured || !('content' in configured) || configured.content.kind !== 'studio')
      throw new Error('Estúdio ausente')
    expect(draft.document.blocks.some((block) => block.id === omittedBlockId)).toBe(false)
    expect(draft.document.sections.some((section) => section.id === omittedSectionId)).toBe(false)
    expect(draft.document.blocks.find((block) => block.id === studioBlockId)?.content).toEqual(
      configured.content,
    )
    expect(
      draft.document.sections
        .filter((section) => section.workspaceBlockId)
        .every((section) => section.workspaceBlockId === studioBlockId),
    ).toBe(true)
    expect(await f.courses.findLessonWithContent(f.lessonId)).toEqual(published)
  })
})
