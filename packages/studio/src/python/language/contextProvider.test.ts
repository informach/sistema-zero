import { expect, test } from 'bun:test'
import { StudioPythonAnalysisAuthorizationSchema } from '@sistemazero/core/studio/python-language-authorization'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { createContextualPythonLanguageProvider } from './contextProvider'

test('analysis reads fresh editor metadata for each operation and entrypoint changes keep one native session', async () => {
  const project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro') throw new Error('fixture')
  const scope = new AbortController()
  const authorization: ReturnType<typeof StudioPythonAnalysisAuthorizationSchema.parse>[] = []
  const paths: string[] = []
  const provider = createContextualPythonLanguageProvider({
    initialProject: project,
    project: () => project,
    context: () => ({ kind: 'free', audience: 'kids', projectId: project.id }),
    signal: scope.signal,
    request: async (url, init) => {
      paths.push(String(url))
      if (init?.method === 'DELETE') return Response.json({ closed: true })
      const body = JSON.parse(String(init?.body))
      authorization.push(StudioPythonAnalysisAuthorizationSchema.parse(body.authorization))
      let result: unknown
      if (String(url).endsWith('/python-language')) {
        project.python.entrypoint = 'src/helper.py'
        result = { version: 1, sessionId: 'a'.repeat(32), projectId: project.id }
      } else if (String(url).endsWith('/start')) result = { ready: true }
      else result = { version: 1, id: body.command.id, kind: 'ack' }
      return Response.json({ transportVersion: 1, status: 200, body: result })
    },
  })
  const connection = await provider.open({ projectId: project.id }, new AbortController().signal)
  expect(authorization[0]?.subject.programmingLanguage).toBe('python')
  expect(authorization[1]?.subject).toMatchObject({ python: { entrypoint: 'src/helper.py' } })
  project.tree['requirements.txt'] = { kind: 'file', content: '# currently editing dependencies\n' }
  await connection.send(
    {
      version: 1,
      id: 'query',
      kind: 'query',
      revision: 1,
      path: 'src/helper.py',
      documentVersion: 1,
      method: 'symbols',
    },
    new AbortController().signal,
  )
  expect(authorization[2]?.subject).toMatchObject({
    requirements: '# currently editing dependencies\n',
  })
  expect(authorization[2]?.revision).not.toBe(authorization[1]?.revision)
  expect(paths.filter((path) => path.endsWith('/python-language'))).toHaveLength(1)
  expect(paths.filter((path) => path.endsWith('/start'))).toHaveLength(1)
  scope.abort()
  expect(paths.filter((path) => path.endsWith('a'.repeat(32)))).toHaveLength(2)
  await expect(
    connection.send(
      { version: 1, id: 'old', kind: 'cancel', requestId: 'query' },
      new AbortController().signal,
    ),
  ).rejects.toThrow()
})

test('a changed project or runtime cannot reuse the original analysis factory or send source', async () => {
  const initial = documentFixture('python', 'pro')
  let current = structuredClone(initial)
  let calls = 0
  const provider = createContextualPythonLanguageProvider({
    initialProject: initial,
    project: () => current,
    context: () => ({ kind: 'free', audience: 'kids', projectId: initial.id }),
    signal: new AbortController().signal,
    request: async () => {
      calls++
      return Response.json({})
    },
  })
  current.id = 'another-project'
  await expect(
    provider.open({ projectId: initial.id }, new AbortController().signal),
  ).rejects.toThrow()
  current = structuredClone(initial)
  current.runtime.releaseId = 'other-release'
  await expect(
    provider.open({ projectId: initial.id }, new AbortController().signal),
  ).rejects.toThrow()
  expect(calls).toBe(0)
})
