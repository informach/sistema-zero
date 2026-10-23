import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { defaultLessonSection } from '@sistemazero/core/learning'
import { Elysia } from 'elysia'
import { SectionCompletionSchema } from '../../src/interfaces/http/learning.dtos'
import { changeDraft, publishDraft, readDraft } from '../draft-authoring-helpers'
import { authoringFixture } from '../fakes/studio-authoring-policy'
import { buildApp, seedSampleCourse } from '../helpers'

test('the real draft DTO preserves the Python discriminant, profile and unfinished rules without absorbing them as JavaScript', async () => {
  const app = new Elysia().post('/criteria', ({ body }) => body, { body: SectionCompletionSchema })
  const input = {
    version: 1,
    blockIds: [],
    projectChecks: [
      {
        id: 'loop',
        label: '',
        programmingLanguage: 'python',
        profileId: 'python-test',
        rule: { type: 'usesLoop' },
      },
    ],
  }
  const request = (body: unknown) =>
    app.handle(
      new Request('http://localhost/criteria', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
  const response = await request(input)
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(input)
  const incomplete = {
    ...input,
    projectChecks: [
      { ...input.projectChecks[0], rule: { type: 'definesFunction', name: '', file: 'src/' } },
    ],
  }
  expect(await (await request(incomplete)).json()).toEqual(incomplete)
  expect(
    (
      await request({
        ...input,
        projectChecks: [
          { ...input.projectChecks[0], rule: { type: 'usesBlock', blockType: 'sz_js_log' } },
        ],
      })
    ).status,
  ).toBe(422)
  expect(
    (
      await request({
        ...input,
        projectChecks: [{ ...input.projectChecks[0], programmingLanguage: 'ruby' }],
      })
    ).status,
  ).toBe(422)
  const legacy = {
    version: 1,
    blockIds: [],
    projectChecks: [{ id: 'loop', label: '', rule: { type: 'usesLoop' } }],
  }
  expect(await (await request(legacy)).json()).toEqual(legacy)
})

test('admin can save an incomplete Python objective, publication refuses it, and a valid objective survives publication', async () => {
  const fixture = await authoringFixture('python', 'pro')
  const env = buildApp({ studioAuthoringPolicy: fixture.policy })
  const course = seedSampleCourse(env.courses)
  const lessonId = course.lessonIds[0],
    blockId = randomUUID()
  env.courses.blocks = env.courses.blocks.filter((block) => block.lessonId !== lessonId)
  env.courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'studio',
    sortOrder: 0,
    contentRevision: 'a'.repeat(32),
    content: { kind: 'studio', purpose: 'experiment', initialProject: fixture.project },
  })
  const section = {
    ...defaultLessonSection(randomUUID(), 'Defina uma função', [blockId]),
    intent: 'application' as const,
    workspaceBlockId: blockId,
    completion: {
      version: 1 as const,
      blockIds: [],
      projectChecks: [
        {
          id: 'function',
          label: 'Crie a função',
          programmingLanguage: 'python' as const,
          profileId: fixture.project.runtime.profileId,
          rule: { type: 'definesFunction' as const, name: '', file: 'src/' },
        },
      ],
    },
  }
  const saved = await changeDraft(env.app, lessonId, { type: 'structure', sections: [section] })
  expect({ status: saved.status, body: await saved.json() }).toMatchObject({ status: 200 })
  expect((await readDraft(env.app, lessonId)).document.sections[0]?.completion).toEqual(
    section.completion,
  )
  expect((await publishDraft(env.app, lessonId)).status).toBe(400)
  section.completion.projectChecks[0]!.rule = {
    type: 'definesFunction',
    name: 'iniciar',
    file: 'src/main.py',
  }
  expect(
    (await changeDraft(env.app, lessonId, { type: 'structure', sections: [section] })).status,
  ).toBe(200)
  const published = await publishDraft(env.app, lessonId)
  expect({ status: published.status, body: await published.json() }).toMatchObject({ status: 200 })
  expect((await env.learningRepository.getStructure(lessonId))?.sections[0]?.completion).toEqual(
    section.completion,
  )
})
