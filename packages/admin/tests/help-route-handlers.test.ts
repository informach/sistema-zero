import { beforeEach, describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

const calls: Array<{ fn: string; args: unknown[] }> = []
const ok = (fn: string) => {
  return async (...args: unknown[]) => {
    calls.push({ fn, args })
    return { status: 200, body: { fn } }
  }
}

mock.module('@/server/help', () => ({
  listHelpCollections: ok('listHelpCollections'),
  createHelpCollection: ok('createHelpCollection'),
  updateHelpCollection: ok('updateHelpCollection'),
  archiveHelpCollection: ok('archiveHelpCollection'),
  restoreHelpCollection: ok('restoreHelpCollection'),
  reorderHelpCollections: ok('reorderHelpCollections'),
  listHelpTutorials: ok('listHelpTutorials'),
  getHelpTutorial: ok('getHelpTutorial'),
  createHelpTutorial: ok('createHelpTutorial'),
  updateHelpTutorial: ok('updateHelpTutorial'),
  actHelpTutorial: ok('actHelpTutorial'),
  importHelp: ok('importHelp'),
  exportHelp: ok('exportHelp'),
}))

mock.module('@/server/forward', () => ({
  forwardUpstream: ({ status, body }: { status: number; body: unknown }) =>
    Response.json(body, { status }),
}))

const route = await import('../src/app/api/members/help/[[...path]]/route')

const ID = '0f5c1e6a-3f4e-4b0a-9c1d-2a7b8e9f0a1b'

function call(method: string, path: string[], body?: unknown) {
  const req = new Request(`http://admin.test/api/members/help/${path.join('/')}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
  })
  const handler = route[method as 'GET' | 'POST' | 'PATCH' | 'PUT']
  return handler(req, { params: Promise.resolve({ path }) })
}

describe('BFF do Como fazer (allowlist do catch-all)', () => {
  beforeEach(() => {
    calls.length = 0
  })

  test('cada sufixo aceito cai no adapter certo', async () => {
    await call('GET', ['collections'])
    await call('POST', ['collections'], { slug: 'estudio' })
    await call('PUT', ['collections', 'order'], { ids: ['a', 1, 'b', null] })
    await call('PATCH', ['collections', ID], { title: 'X' })
    await call('POST', ['collections', ID, 'archive'])
    await call('POST', ['collections', ID, 'restore'])
    await call('GET', ['tutorials'])
    await call('POST', ['tutorials'], { slug: 't' })
    await call('GET', ['tutorials', 'export'])
    await call('POST', ['tutorials', 'import'], { tutorials: [] })
    await call('GET', ['tutorials', ID])
    await call('PATCH', ['tutorials', ID], { expectedRevision: 1 })
    await call('POST', ['tutorials', ID, 'publish'], { expectedRevision: 2 })
    await call('POST', ['tutorials', ID, 'unpublish'], { expectedRevision: 3 })
    await call('POST', ['tutorials', ID, 'archive'], { expectedRevision: 4 })

    expect(calls.map((c) => c.fn)).toEqual([
      'listHelpCollections',
      'createHelpCollection',
      'reorderHelpCollections',
      'updateHelpCollection',
      'archiveHelpCollection',
      'restoreHelpCollection',
      'listHelpTutorials',
      'createHelpTutorial',
      'exportHelp',
      'importHelp',
      'getHelpTutorial',
      'updateHelpTutorial',
      'actHelpTutorial',
      'actHelpTutorial',
      'actHelpTutorial',
    ])
    // A reordenação só repassa strings: lixo no array não chega ao members.
    expect(calls[2]?.args).toEqual([['a', 'b']])
    expect(calls[3]?.args).toEqual([ID, { title: 'X' }])
    expect(calls[12]?.args).toEqual([ID, 'publish', { expectedRevision: 2 }])
    expect(calls[14]?.args).toEqual([ID, 'archive', { expectedRevision: 4 }])
  })

  test('a lista de tutoriais repassa os filtros da query', async () => {
    const req = new Request(
      'http://admin.test/api/members/help/tutorials?status=draft&collectionId=abc&q=camada',
    )
    await route.GET(req, { params: Promise.resolve({ path: ['tutorials'] }) })
    expect(calls[0]?.args).toEqual([{ status: 'draft', collectionId: 'abc', q: 'camada' }])
  })

  test('sufixo fora da allowlist, id que não é uuid e método errado dão 404 sem tocar o adapter', async () => {
    const cases: Array<[string, string[]]> = [
      ['GET', []],
      ['GET', ['outra']],
      ['GET', ['tutorials', 'nao-e-uuid']],
      ['POST', ['tutorials', ID, 'delete']],
      ['POST', ['tutorials', ID]],
      ['PUT', ['tutorials', ID]],
      ['GET', ['collections', ID]],
      ['POST', ['collections', 'order']],
      ['PATCH', ['tutorials', 'import']],
    ]
    for (const [method, path] of cases) {
      const res = await call(method, path, method === 'GET' ? undefined : {})
      expect([method, path, res.status]).toEqual([method, path, 404])
    }
    expect(calls).toEqual([])
  })

  test('o BFF não expõe DELETE', () => {
    expect((route as Record<string, unknown>).DELETE).toBeUndefined()
  })
})
