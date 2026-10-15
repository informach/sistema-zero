import { describe, expect, mock, test } from 'bun:test'
import { linkStudioMission, type MissionLinkRefusal } from '../src/lib/pensa-mission-link'

type Call = { url: string; body: Record<string, unknown> }

function server(status: number, body: unknown) {
  const calls: Call[] = []
  const fetch = mock(async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) })
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  })
  return { fetch, calls }
}

const base = {
  taskId: 'm3',
  status: 'planned' as const,
  expectedUpdatedAt: '2026-10-15T10:00:00.000Z',
  projectId: 'pensa-0123456789abcdef0123456789abcdef',
  saveRevision: '1760000000000',
}

const refusal = (code: string, message = 'recusa') => ({ error: { code, message } })

async function refused(promise: Promise<unknown>): Promise<MissionLinkRefusal> {
  try {
    await promise
  } catch (error) {
    return error as MissionLinkRefusal
  }
  throw new Error('era para recusar')
}

describe('abrir o jogo por uma missão do Pensa (15/10/2026)', () => {
  test('no v2 a anotação não leva a versão da página e começa a missão planejada', async () => {
    const progress = { status: 'in_progress' }
    const { fetch, calls } = server(200, { task: { progress } })
    const result = await linkStudioMission({ ...base, fetch, v2: true })
    expect(result).toEqual({ kind: 'linked', progress })
    expect(calls[0]?.url).toBe('/api/pensa/tasks/m3/progress')
    expect(calls[0]?.body).toEqual({
      status: 'in_progress',
      outputRef: {
        kind: 'studio_project',
        projectId: base.projectId,
        saveRevision: '1760000000000',
      },
    })
  })

  test('missão já começada só religa o jogo, sem mudar o estado', async () => {
    const { fetch, calls } = server(200, { task: { progress: {} } })
    await linkStudioMission({ ...base, fetch, v2: true, status: 'in_progress' })
    expect(calls[0]?.body.status).toBeUndefined()
  })

  test.each([
    ['a missão ainda depende das anteriores', 409, 'PENSA_TASK_DEPENDENCY_PENDING'],
    ['o caminho mudou', 409, 'PENSA_TASK_PROGRESS_CONFLICT'],
    ['a mudança não vale agora', 409, 'PENSA_TASK_TRANSITION_INVALID'],
    ['o servidor tropeçou', 503, 'UPSTREAM_ERROR'],
  ])('no v2, %s: o jogo abre e o guia é relido', async (_, status, code) => {
    const { fetch } = server(status, refusal(code))
    expect(await linkStudioMission({ ...base, fetch, v2: true })).toEqual({
      kind: 'deferred',
      reread: true,
    })
  })

  test('no v2, a rede caiu: o jogo abre do mesmo jeito', async () => {
    const fetch = mock(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(await linkStudioMission({ ...base, fetch, v2: true })).toEqual({
      kind: 'deferred',
      reread: false,
    })
  })

  test.each([
    [
      'a missão é de outra pessoa da equipe',
      403,
      'PENSA_NOT_YOUR_MISSION',
      'Essa missão é de outra pessoa da equipe. Volte ao plano para ver a sua.',
    ],
    [
      'outra artista já começou',
      409,
      'PENSA_MISSION_TAKEN',
      'Outra pessoa da equipe já está fazendo essa missão.',
    ],
    [
      'a missão saiu do plano',
      404,
      'PENSA_NOT_FOUND',
      'Esta missão não está mais no seu plano. Volte ao plano para ver o caminho.',
    ],
  ])('no v2, %s: barra abrir com a frase da criança', async (_, status, code, frase) => {
    const { fetch } = server(status, refusal(code))
    const error = await refused(linkStudioMission({ ...base, fetch, v2: true }))
    expect(error.childMessage).toBe(frase)
  })

  test('o plano anterior ao v2 segue estrito: manda a versão e um 409 pede reler', async () => {
    const { fetch, calls } = server(
      409,
      refusal(
        'PENSA_TASK_PROGRESS_CONFLICT',
        'A tarefa mudou em outro aparelho. Recarregue o guia e tente novamente.',
      ),
    )
    const error = await refused(linkStudioMission({ ...base, fetch, v2: false }))
    expect(calls[0]?.body.expectedUpdatedAt).toBe(base.expectedUpdatedAt)
    expect(error.reread).toBe(true)
    expect(error.childMessage).toBe(
      'A missão mudou em outro lugar. Recarreguei o Guia do Pensa para você.',
    )
  })
})
