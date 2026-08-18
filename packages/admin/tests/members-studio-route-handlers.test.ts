import { beforeEach, describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

// `mock.module` é global ao run do Bun: espalhar a superfície real evita apagar
// exports usados por outras suítes carregadas depois deste arquivo.
const actualMembers = await import('@/server/members')

let previousArgs: string[] = []
let countsCourseId: string | null = null
let restoreArgs: string[] = []

mock.module('@/server/members', () => ({
  ...actualMembers,
  getStudioSubmissionPrevious: async (blockId: string, userId: string) => {
    previousArgs = [blockId, userId]
    return { status: 200, body: { project: { name: 'Anterior' }, submittedAt: '2026-08-17' } }
  },
  getCourseSubmissionCounts: async (courseId: string) => {
    countsCourseId = courseId
    return { status: 200, body: { total: 2, byLesson: { l1: 2 }, byBlock: { b1: 2 } } }
  },
  restoreStudioSubmissionPrevious: async (blockId: string, userId: string) => {
    restoreArgs = [blockId, userId]
    return { status: 200, body: { restored: true } }
  },
}))

const { GET: getPrevious } = await import(
  '../src/app/api/members/blocks/[id]/studio-submissions/[userId]/previous/route'
)
const { GET: getCounts } = await import(
  '../src/app/api/members/courses/[id]/submission-counts/route'
)
const { POST: restorePrevious } = await import(
  '../src/app/api/members/studio-submissions/[blockId]/[userId]/restore-previous/route'
)

beforeEach(() => {
  previousArgs = []
  countsCourseId = null
  restoreArgs = []
})

describe('BFF de versões e contagens das entregas', () => {
  test('previous encaminha bloco/aluno e preserva a resposta', async () => {
    const response = await getPrevious(new Request('https://admin.test/previous'), {
      params: Promise.resolve({ id: 'bloco 1', userId: 'aluno/1' }),
    })

    expect(previousArgs).toEqual(['bloco 1', 'aluno/1'])
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      project: { name: 'Anterior' },
      submittedAt: '2026-08-17',
    })
  })

  test('submission-counts encaminha o curso e preserva os agregados', async () => {
    const response = await getCounts(new Request('https://admin.test/counts'), {
      params: Promise.resolve({ id: 'curso 1' }),
    })

    expect(countsCourseId).toBe('curso 1')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      total: 2,
      byLesson: { l1: 2 },
      byBlock: { b1: 2 },
    })
  })

  test('restore-previous encaminha bloco/aluno pelo POST', async () => {
    const response = await restorePrevious(
      new Request('https://admin.test/restore', { method: 'POST' }),
      { params: Promise.resolve({ blockId: 'bloco 1', userId: 'aluno/1' }) },
    )

    expect(restoreArgs).toEqual(['bloco 1', 'aluno/1'])
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ restored: true })
  })
})
