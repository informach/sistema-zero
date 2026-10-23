import { expect, test } from 'bun:test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { compileTeam, runSchema, type ToolContext } from '@sistemazero/agent-core'
import { Environments } from '../src/environments/manager'
import { Dispatcher } from '../src/execution/dispatcher'
import { sourceRevision } from '../src/preview/revision'
import { Processes } from '../src/process/manager'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'
import { Teams } from '../src/team/coordinator'
import { hash } from '../src/tools/paths'
import { Patches } from '../src/workspace/patch'
import { Workspaces } from '../src/workspace/snapshot'

test('team compiler rejects cycles and reviewers detached from writers', () => {
  expect(() =>
    compileTeam({
      version: 1,
      title: 'bad',
      nodes: [
        {
          id: 'writer',
          role: 'writer',
          input: 'edit',
          acceptance: ['done'],
          dependsOn: ['writer'],
        },
      ],
    }),
  ).toThrow('cycle')
  expect(() =>
    compileTeam({
      version: 1,
      title: 'bad',
      nodes: [
        { id: 'writer', role: 'writer', input: 'edit', acceptance: ['done'] },
        { id: 'review', role: 'reviewer', input: 'review', acceptance: ['done'] },
      ],
    }),
  ).toThrow('every task')
})

test('team uses WIP forks, shared two-slot scheduler, integrated review and conflict-preserving apply', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-team-'))
  const workspace = await mkdtemp(join(tmpdir(), 'zero-team-source-'))
  const store = new Store(join(directory, 'state.sqlite'))
  const supervisor = new Supervisor(directory, store)
  await supervisor.initialize()
  const processes = new Processes(directory)
  const environments = new Environments(store, processes, directory)
  const patches = new Patches(store, directory)
  const teams = new Teams(supervisor, new Dispatcher(supervisor), environments, patches)
  supervisor.beforeShutdown.add(() => teams.close())
  supervisor.cleanup.add(() => environments.close().then(() => undefined))
  const workspaces = new Workspaces(store, processes, directory)
  const signal = AbortSignal.timeout(60000)
  await workspaces.git(workspace, ['init'], signal)
  await writeFile(join(workspace, 'base.txt'), 'committed')
  await workspaces.git(workspace, ['add', 'base.txt'], signal)
  await workspaces.git(
    workspace,
    [
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '-m',
      'fixture',
    ],
    signal,
  )
  await writeFile(join(workspace, 'base.txt'), 'user WIP')
  await writeFile(join(workspace, 'untracked.txt'), 'preserve me')
  const now = new Date().toISOString()
  const parent = runSchema.parse({
    id: 'parent',
    sessionId: 'parent',
    input: 'team',
    backend: 'openrouter',
    model: '',
    mode: 'build',
    state: 'succeeded',
    createdAt: now,
    updatedAt: now,
    maxCost: 1,
    maxSteps: 10,
  })
  await store.call({
    op: 'session.put',
    value: { id: 'parent', workspace, title: 'team', createdAt: now, archived: false },
  })
  await store.call({ op: 'run.put', value: parent, requestId: 'parent', digest: 'parent' })
  const context: ToolContext = { workspace, run: parent, signal, ask: async () => 'deny' }
  let active = 0
  let maximum = 0
  let reviewerSawBoth = false
  let writers = 0
  let releaseWriters!: () => void
  const bothWriters = new Promise<void>((resolve) => {
    releaseWriters = resolve
  })
  supervisor.executor = async (run, root, childSignal) => {
    active++
    maximum = Math.max(maximum, active)
    try {
      expect(await readFile(join(root, 'base.txt'), 'utf8')).toBe('user WIP')
      expect(await readFile(join(root, 'untracked.txt'), 'utf8')).toBe('preserve me')
      const child = { workspace: root, run, signal: childSignal, ask: async () => 'deny' }
      if (run.input.startsWith('write a'))
        await patches.apply(
          root,
          run.id,
          {
            changes: [
              { operation: 'write', path: 'nested/a.txt', expectedHash: null, content: 'A' },
            ],
          },
          childSignal,
        )
      else if (run.input.startsWith('write b'))
        await patches.apply(
          root,
          run.id,
          { changes: [{ operation: 'write', path: 'b.txt', expectedHash: null, content: 'B' }] },
          childSignal,
        )
      else {
        reviewerSawBoth =
          (await readFile(join(root, 'nested/a.txt'), 'utf8')) === 'A' &&
          (await readFile(join(root, 'b.txt'), 'utf8')) === 'B'
      }
      if (run.input.startsWith('write')) {
        writers++
        if (writers === 2) releaseWriters()
        await bothWriters
      }
      const revision = await sourceRevision(root, childSignal)
      const message = { id: 'one', to: 'review', body: 'Evidence is ready' }
      expect(await teams.message(message, child)).toEqual(await teams.message(message, child))
      await teams.report(
        {
          note: 'Verified fixture',
          sourceDigest: revision.digest,
          acceptance: [
            { criterion: 'done', passed: true, evidence: 'Fixture read actual file content' },
          ],
          artifacts: [],
          pending: [],
        },
        child,
      )
    } finally {
      active--
    }
  }
  await teams.initialize()
  try {
    const plan = {
      version: 1,
      title: 'fixture',
      nodes: [
        { id: 'a', role: 'writer', input: 'write a', acceptance: ['done'] },
        { id: 'b', role: 'writer', input: 'write b', acceptance: ['done'] },
        {
          id: 'review',
          role: 'reviewer',
          input: 'review integrated result',
          acceptance: ['done'],
          dependsOn: ['a', 'b'],
        },
      ],
    }
    const team = await teams.start('first', plan, context)
    expect((await teams.start('first', plan, context)).id).toBe(team.id)
    let completed = await teams.get(team.id)
    while (completed.state === 'running') {
      signal.throwIfAborted()
      await Bun.sleep(25)
      completed = await teams.get(team.id)
    }
    expect(completed.error).toBeUndefined()
    expect(completed.state).toBe('ready')
    expect(maximum).toBe(2)
    expect(reviewerSawBoth).toBe(true)
    await writeFile(join(workspace, 'b.txt'), 'external edit')
    await expect(teams.apply(team.id, context)).rejects.toThrow('conflict')
    expect(await readFile(join(workspace, 'b.txt'), 'utf8')).toBe('external edit')
    // Explicitly reconcile the test-owned conflicting file through the same checkpoint engine.
    await patches.apply(
      workspace,
      parent.id,
      { changes: [{ operation: 'delete', path: 'b.txt', expectedHash: hash('external edit') }] },
      signal,
    )
    await teams.apply(team.id, context)
    expect(await readFile(join(workspace, 'nested/a.txt'), 'utf8')).toBe('A')
    expect(await readFile(join(workspace, 'b.txt'), 'utf8')).toBe('B')
    expect(await readFile(join(workspace, 'base.txt'), 'utf8')).toBe('user WIP')
    let lateContext: ToolContext | undefined
    let conflictingWriters = 0
    let releaseConflicts!: () => void
    const conflictsReady = new Promise<void>((resolve) => {
      releaseConflicts = resolve
    })
    supervisor.executor = async (run, root, childSignal) => {
      const child = { workspace: root, run, signal: childSignal, ask: async () => 'deny' }
      lateContext = child
      await patches.apply(
        root,
        run.id,
        {
          changes: [
            {
              operation: 'write',
              path: 'base.txt',
              expectedHash: hash('user WIP'),
              content: run.input.startsWith('same a') ? 'writer A' : 'writer B',
            },
          ],
        },
        childSignal,
      )
      conflictingWriters++
      if (conflictingWriters === 2) releaseConflicts()
      await conflictsReady
      await teams.report(
        {
          note: 'Conflicting fixture',
          sourceDigest: (await sourceRevision(root, childSignal)).digest,
          acceptance: [{ criterion: 'done', passed: true, evidence: 'Changed base file' }],
          artifacts: [],
          pending: [],
        },
        child,
      )
    }
    const conflicting = await teams.start(
      'conflict',
      {
        ...plan,
        nodes: [
          { id: 'a', role: 'writer', input: 'same a', acceptance: ['done'] },
          { id: 'b', role: 'writer', input: 'same b', acceptance: ['done'] },
          {
            id: 'review',
            role: 'reviewer',
            input: 'must not start',
            acceptance: ['done'],
            dependsOn: ['a', 'b'],
          },
        ],
      },
      context,
    )
    let blocked = await teams.get(conflicting.id)
    while (blocked.state === 'running') {
      signal.throwIfAborted()
      await Bun.sleep(25)
      blocked = await teams.get(conflicting.id)
    }
    expect(blocked.state).toBe('blocked')
    expect(blocked.error).toContain('conflict')
    expect(blocked.nodes.find((node) => node.id === 'review')?.state).toBe('blocked')
    expect(conflictingWriters).toBe(2)
    expect(await readFile(join(workspace, 'base.txt'), 'utf8')).toBe('user WIP')
    if (!lateContext) throw new Error('No child context')
    await expect(
      teams.report(
        {
          note: 'late result',
          sourceDigest: hash('stale'),
          acceptance: [{ criterion: 'done', passed: true, evidence: 'stale' }],
          artifacts: [],
          pending: [],
        },
        lateContext,
      ),
    ).rejects.toThrow('no longer owns')
  } finally {
    await supervisor.shutdown()
  }
}, 70000)
