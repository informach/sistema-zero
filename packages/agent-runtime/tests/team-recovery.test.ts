import { expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Environments } from '../src/environments/manager'
import { Dispatcher } from '../src/execution/dispatcher'
import { Processes } from '../src/process/manager'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'
import { Teams } from '../src/team/coordinator'
import { teamRecordSchema } from '../src/team/schema'
import { Patches } from '../src/workspace/patch'

test('recovery revokes an unfinished integration and retains its handoff without rerunning children', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-team-recovery-'))
  const file = join(directory, 'state.sqlite')
  const first = new Store(file)
  const now = new Date().toISOString()
  await first.call({
    op: 'document.put',
    namespace: 'teams',
    id: 'team',
    value: teamRecordSchema.parse({
      id: 'team',
      intentDigest: 'fixture',
      parentRunId: 'parent',
      sessionId: 'session',
      workspace: directory,
      plan: {
        version: 1,
        title: 'fixture',
        nodes: [{ id: 'review', role: 'reviewer', input: 'review', acceptance: ['done'] }],
      },
      state: 'applying',
      generation: 3,
      createdAt: now,
      updatedAt: now,
      nodes: [
        {
          id: 'review',
          state: 'succeeded',
          handoff: {
            note: 'preserve this handoff',
            sourceDigest: 'a'.repeat(64),
            acceptance: [{ criterion: 'done', passed: true, evidence: 'fixture' }],
            artifacts: [],
            pending: [],
          },
        },
      ],
    }),
  })
  await first.close()
  const store = new Store(file)
  const supervisor = new Supervisor(directory, store)
  await supervisor.initialize()
  let executions = 0
  supervisor.executor = async () => {
    executions++
  }
  const environments = new Environments(store, new Processes(directory), directory)
  const teams = new Teams(
    supervisor,
    new Dispatcher(supervisor),
    environments,
    new Patches(store, directory),
  )
  supervisor.beforeShutdown.add(() => teams.close())
  supervisor.cleanup.add(() => environments.close().then(() => undefined))
  try {
    await teams.initialize()
    const recovered = await teams.get('team')
    expect(recovered.state).toBe('interrupted')
    expect(recovered.generation).toBe(4)
    expect(recovered.nodes[0]?.handoff?.note).toBe('preserve this handoff')
    expect(executions).toBe(0)
  } finally {
    await supervisor.shutdown()
  }
})
