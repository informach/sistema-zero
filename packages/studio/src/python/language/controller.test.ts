import { expect, test } from 'bun:test'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { createPythonAnalysisController } from './controller'
import type { PythonAnalysisSession } from './session'
import type { PythonAnalysisIdentity, PythonParsedDocument } from './types'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const identity: PythonAnalysisIdentity = {
  projectId: 'python-classic',
  instanceId: 'test',
  path: 'main.py',
  revision: 'a'.repeat(64),
  generation: 1,
}
const parsed = (source: string): PythonParsedDocument => ({
  language: 'python',
  version: 1,
  source,
  identity,
  tree: null,
  tokens: [],
  diagnostics: [],
})

async function fixture() {
  const { project, environment } = await pythonEnvironmentFixture('classic')
  environment.resolvePythonAnalysis = async () => ({
    url: 'https://parser.test/analysis.html',
    allowedOrigins: ['https://parser.test'],
  })
  let epoch = 1
  let currentProject = project
  const sessions: PythonAnalysisSession[] = []
  const requests: { source: string; reply: ReturnType<typeof deferred<PythonParsedDocument>> }[] =
    []
  let mounts = 0,
    releases = 0
  const controller = createPythonAnalysisController({
    project: () => currentProject,
    environment: () => environment,
    writerEpoch: () => epoch,
    mountFrame: () => {
      mounts++
      return {
        frame: document.createElement('iframe'),
        release: () => {
          releases++
        },
      }
    },
    prepareSession: async ({ signal }) => {
      let closed = false
      const session: PythonAnalysisSession = {
        get closed() {
          return closed
        },
        parse(_identity, source) {
          const reply = deferred<PythonParsedDocument>()
          requests.push({ source, reply })
          signal.addEventListener(
            'abort',
            () => reply.reject(new DOMException('cancel', 'AbortError')),
            { once: true },
          )
          return reply.promise
        },
        render: async () => {
          throw new Error('invalid visual node')
        },
        dispose() {
          closed = true
        },
      }
      sessions.push(session)
      return session
    },
  })
  const run = (source: string) =>
    controller.run({ current: () => true, execute: (analysis) => analysis.parse(identity, source) })
  return {
    controller,
    run,
    requests,
    sessions,
    environment,
    epoch: () => {
      epoch++
    },
    project: () => {
      currentProject = { ...project, id: 'second' }
    },
    counts: () => ({ mounts, releases }),
  }
}
const tick = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve()
}

test('revoking the host context closes the parser and rejects pending and subsequent edits', async () => {
  const f = await fixture()
  const context = new AbortController()
  f.environment.signal = context.signal
  let committed = 0
  const result = f.controller
    .run({
      current: () => true,
      execute: (parser) => parser.parse(identity, 'pending'),
      commit: () => {
        committed++
        return undefined
      },
    })
    .catch((error) => error.name)
  await tick()
  expect(f.requests).toHaveLength(1)
  context.abort()
  expect(await result).toBe('AbortError')
  f.requests[0]!.reply.resolve(parsed('pending'))
  await tick()
  expect(committed).toBe(0)
  expect(f.sessions[0]!.closed).toBe(true)
  expect(f.counts()).toEqual({ mounts: 1, releases: 1 })
  await expect(f.run('new')).rejects.toThrow()
  expect(f.requests).toHaveLength(1)
  f.controller.dispose()
})

test('typing coalesces queued parses and reuses CPython after a superseded request', async () => {
  const f = await fixture()
  try {
    const first = f.run('old').catch((error) => error.name)
    await tick()
    expect(f.requests.map((item) => item.source)).toEqual(['old'])
    const intermediate = f.run('middle').catch((error) => error.name)
    const latest = f.run('latest')
    expect(await intermediate).toBe('AbortError')
    expect(f.requests).toHaveLength(1)
    f.requests[0]!.reply.resolve(parsed('old'))
    expect(await first).toBe('AbortError')
    await tick()
    expect(f.requests.map((item) => item.source)).toEqual(['old', 'latest'])
    f.requests[1]!.reply.resolve(parsed('latest'))
    expect((await latest).source).toBe('latest')
    expect(f.counts()).toEqual({ mounts: 1, releases: 0 })
    expect(f.sessions[0]!.closed).toBe(false)
  } finally {
    f.controller.dispose()
  }
  expect(f.counts()).toEqual({ mounts: 1, releases: 1 })
})

test('stale visual work cannot start its next render and invalid visual input keeps the parser', async () => {
  const f = await fixture()
  let fresh = true
  try {
    const transaction = f.controller
      .run({
        current: () => fresh,
        execute: async (analysis) => {
          await analysis.parse(identity, 'source')
          return analysis.render({ kind: 'Module', fields: {} })
        },
      })
      .catch((error) => error.name)
    await tick()
    fresh = false
    f.requests[0]!.reply.resolve(parsed('source'))
    expect(await transaction).toBe('AbortError')
    await expect(
      f.controller.run({
        current: () => true,
        execute: (analysis) => analysis.render({ kind: 'Module', fields: {} }),
      }),
    ).rejects.toThrow('invalid visual node')
    expect(f.sessions[0]!.closed).toBe(false)
    const next = f.run('retry')
    await tick()
    f.requests[1]!.reply.resolve(parsed('retry'))
    expect((await next).source).toBe('retry')
    expect(f.sessions).toHaveLength(1)
  } finally {
    f.controller.dispose()
  }
})

test('writer handoff and project replacement release the old parser before reusing the editor', async () => {
  const f = await fixture()
  try {
    const old = f.run('old').catch((error) => error.name)
    await tick()
    f.epoch()
    f.project()
    const next = f.run('new')
    expect(await old).toBe('AbortError')
    await tick()
    expect(f.sessions[0]!.closed).toBe(true)
    expect(f.counts()).toEqual({ mounts: 2, releases: 1 })
    f.requests[1]!.reply.resolve(parsed('new'))
    expect((await next).source).toBe('new')
  } finally {
    f.controller.dispose()
  }
})

test('a hung resolver cannot block a new owner and late boot is disposed', async () => {
  const { project, environment } = await pythonEnvironmentFixture('classic')
  const boot = deferred<PythonAnalysisSession>()
  let lateDisposals = 0,
    releases = 0,
    epoch = 1,
    prepares = 0
  environment.resolvePythonAnalysis = async () => ({
    url: 'https://parser.test/analysis.html',
    allowedOrigins: ['https://parser.test'],
  })
  const parser: PythonAnalysisSession = {
    closed: false,
    parse: async (_id, source) => parsed(source),
    render: async () => '',
    dispose: () => {
      lateDisposals++
    },
  }
  const controller = createPythonAnalysisController({
    project: () => project,
    environment: () => environment,
    writerEpoch: () => epoch,
    mountFrame: () => ({
      frame: document.createElement('iframe'),
      release: () => {
        releases++
      },
    }),
    prepareSession: async () => (++prepares === 1 ? boot.promise : { ...parser, dispose() {} }),
  })
  try {
    const first = controller
      .run({ current: () => true, execute: (analysis) => analysis.parse(identity, 'old') })
      .catch((error) => error.name)
    await tick()
    epoch++
    const second = controller.run({
      current: () => true,
      execute: (analysis) => analysis.parse(identity, 'new'),
    })
    expect(await first).toBe('AbortError')
    expect((await second).source).toBe('new')
    boot.resolve(parser)
    await tick()
    expect(lateDisposals).toBe(1)
    expect(releases).toBe(1)
  } finally {
    controller.dispose()
  }
})

test('revocation after parsing still refuses the final publication', async () => {
  const f = await fixture()
  const gate = deferred<void>()
  let entered = false
  try {
    const result = f.controller
      .run({
        current: () => true,
        execute: async (parser) => {
          await parser.parse(identity, 'print(1)')
          entered = true
          await gate.promise
          return 'accepted'
        },
      })
      .catch((error) => error.message)
    await tick()
    f.requests[0]!.reply.resolve(parsed('print(1)'))
    await tick()
    expect(entered).toBe(true)
    const previous = f.environment.access
    f.environment.access = (project) => ({ ...previous(project), releaseStatus: 'revoked' })
    gate.resolve()
    expect(await result).toContain('desativado')
  } finally {
    f.controller.dispose()
  }
})

test('a retired owner cannot hold the queue with an asynchronous host continuation', async () => {
  const f = await fixture()
  const gate = deferred<void>()
  try {
    const result = f.controller
      .run({
        current: () => true,
        execute: async (parser) => {
          await parser.parse(identity, 'old')
          await gate.promise
          return parser.parse(identity, 'late-invalid')
        },
      })
      .catch((error) => error.name)
    await tick()
    f.requests[0]!.reply.resolve(parsed('old'))
    await tick()
    f.epoch()
    const next = f.run('new')
    expect(await result).toBe('AbortError')
    await tick()
    expect(f.requests.map((request) => request.source)).toEqual(['old', 'new'])
    f.requests[1]!.reply.resolve(parsed('new'))
    expect((await next).source).toBe('new')
    gate.resolve()
    await tick()
    expect(f.requests.map((request) => request.source)).toEqual(['old', 'new'])
  } finally {
    gate.resolve()
    f.controller.dispose()
  }
})

test('a mount callback that retires its owner cannot leak or prepare its frame', async () => {
  const { project, environment } = await pythonEnvironmentFixture('classic')
  environment.resolvePythonAnalysis = async () => ({
    url: 'https://parser.test/analysis.html',
    allowedOrigins: ['https://parser.test'],
  })
  let releases = 0,
    prepares = 0
  const controller = createPythonAnalysisController({
    project: () => project,
    environment: () => environment,
    mountFrame() {
      controller.reset()
      return {
        frame: document.createElement('iframe'),
        release: () => {
          releases++
        },
      }
    },
    async prepareSession() {
      prepares++
      throw new Error('Must not prepare')
    },
  })
  try {
    const result = controller
      .run({ current: () => true, execute: (parser) => parser.parse(identity, '') })
      .catch((error) => error.name)
    expect(await result).toBe('AbortError')
    await tick()
    expect(releases).toBe(1)
    expect(prepares).toBe(0)
  } finally {
    controller.dispose()
  }
})

for (const callback of ['current', 'access'] as const)
  test(`${callback}: reentrant retirement in the final guard cannot publish a candidate`, async () => {
    const f = await fixture()
    let retire = false,
      commits = 0
    const previous = f.environment.access
    f.environment.access = (project) => {
      if (retire && callback === 'access') f.controller.reset()
      return previous(project)
    }
    try {
      const result = f.controller
        .run({
          current: () => {
            if (retire && callback === 'current') f.controller.reset()
            return true
          },
          execute: async () => {
            retire = true
            return 'candidate'
          },
          commit() {
            commits++
          },
        })
        .catch((error) => error.name)
      expect(await result).toBe('AbortError')
      expect(commits).toBe(0)
    } finally {
      f.controller.dispose()
    }
  })
