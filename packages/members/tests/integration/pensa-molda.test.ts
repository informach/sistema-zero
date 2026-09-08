import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

async function setup() {
  const ctx = buildApp(),
    userId = randomUUID(),
    accountId = randomUUID()
  for (const courseRef of ['pensa', 'molda'])
    grantLifetime(ctx.entitlements, { userId: accountId, courseRef })
  const headers = {
    'x-auth-user-id': userId,
    'x-auth-account-id': accountId,
    'content-type': 'application/json',
  }
  const request = (
    path: string,
    body?: unknown,
    method = body === undefined ? 'GET' : 'POST',
    owner = userId,
  ) =>
    ctx.app.handle(
      new Request(`http://localhost/members/pensa${path}?audience=kids`, {
        method,
        headers: { ...headers, 'x-auth-user-id': owner },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    )
  const created = await request('/projects', { name: 'Mundo da Lua' })
  const project = z
    .object({ project: z.object({ id: z.string(), currentCycle: z.object({ id: z.string() }) }) })
    .parse(await created.json()).project
  const tasks = await request(
    `/cycles/${project.currentCycle.id}/tasks`,
    {
      tasks: [
        {
          key: 'rocha',
          title: 'Modelar rocha',
          destination: 'molda',
          category: 'art',
          estimatedMinutes: 15,
          guide: {
            steps: [{ id: 'modelar', text: 'Modele a rocha', required: true }],
            criteria: [{ id: 'pronto', text: 'Confira a forma', required: true }],
          },
          context: {
            kind: 'molda',
            assetId: 'rocha-inventario',
            artKind: 'model',
            appearance: 'Rocha baixa azul',
            usage: 'Cenário lunar',
            palette: [],
          },
        },
      ],
    },
    'PUT',
  )
  expect(tasks.status).toBe(200)
  const task = z.object({ tasks: z.array(z.object({ id: z.string() })) }).parse(await tasks.json())
    .tasks[0]
  if (!task) throw new Error('Missing task')
  return { ...ctx, userId, accountId, project, taskId: task.id, request }
}
async function unlockExplorer(ctx: Awaited<ReturnType<typeof setup>>) {
  for (let position = 0; position < 17; position++) {
    const course = seedSampleCourse(
      ctx.courses,
      `passo-${position}`,
      'published',
      'kids',
      false,
      position === 0 ? 'primeiros-passos' : 'iniciante',
      position > 8 ? '3d' : '2d',
      position === 0 ? 1 : ((position - 1) % 8) + 1,
    )
    await ctx.gamification.award({
      userId: ctx.userId,
      accountId: ctx.accountId,
      audience: 'kids',
      events: [
        { sourceType: 'course_complete', sourceId: course.courseId, amount: 0 },
        { sourceType: 'course_showcased', sourceId: course.courseId, amount: 0 },
      ],
      today: '2026-06-02',
      now: new Date('2026-06-02T12:00:00Z'),
      privileged: false,
    })
  }
}
describe('Pensa → Molda', () => {
  test('posse sem carreira bloqueia handoff e progresso; irmãos não veem o plano', async () => {
    const ctx = await setup()
    expect(await (await ctx.request(`/tasks/${ctx.taskId}/handoff`)).json()).toMatchObject({
      task: { destination: 'molda' },
      capability: {
        owned: false,
        blockedReason: 'O Molda ainda não foi liberado pelo seu nível na carreira.',
      },
    })
    expect(
      (await ctx.request(`/tasks/${ctx.taskId}/progress`, { status: 'in_progress' }, 'PATCH'))
        .status,
    ).toBe(403)
    expect(
      (await ctx.request(`/tasks/${ctx.taskId}/handoff`, undefined, 'GET', randomUUID())).status,
    ).toBe(404)
  })
  test('Explorador vincula um modelo existente sem trocar IDs; conclusão exige tipo e guia corretos', async () => {
    const ctx = await setup()
    await unlockExplorer(ctx)
    expect(await (await ctx.request(`/tasks/${ctx.taskId}/handoff`)).json()).toMatchObject({
      capability: { owned: true },
      project: { id: ctx.project.id },
    })
    const begun = await ctx.request(
      `/tasks/${ctx.taskId}/progress`,
      { status: 'in_progress', expectedUpdatedAt: null },
      'PATCH',
    )
    expect(begun.status).toBe(200)
    const version = z
      .object({ task: z.object({ progress: z.object({ updatedAt: z.string() }) }) })
      .parse(await begun.json()).task.progress.updatedAt
    const body = {
      status: 'completed',
      expectedUpdatedAt: version,
      completedStepIds: ['modelar'],
      completedCriteriaIds: ['pronto'],
      outputRef: {
        kind: 'molda_asset',
        assetId: 'minha-rocha-antiga',
        assetName: 'Rocha',
        assetKind: 'texture',
      },
    }
    expect((await ctx.request(`/tasks/${ctx.taskId}/progress`, body, 'PATCH')).status).toBe(409)
    const saved = await ctx.request(
      `/tasks/${ctx.taskId}/progress`,
      { ...body, outputRef: { ...body.outputRef, assetKind: 'model' } },
      'PATCH',
    )
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({
      task: {
        id: ctx.taskId,
        context: { assetId: 'rocha-inventario' },
        progress: {
          status: 'completed',
          outputRef: { assetId: 'minha-rocha-antiga', assetKind: 'model' },
        },
      },
    })
  })
})
