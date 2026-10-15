import { appendFile } from 'node:fs/promises'
import { join } from 'node:path'
import { runSchema } from '@sistemazero/agent-core'
import { Store } from '../src/store/client'

const [directory, boundary] = process.argv.slice(2)
if (!directory || !boundary) throw new Error('Missing fixture arguments')
const store = new Store(join(directory, 'state.sqlite'))
const now = new Date().toISOString()
await store.call({
  op: 'session.put',
  value: { id: 's', workspace: directory, createdAt: now, archived: false, title: 'fault' },
})
await store.call({
  op: 'run.put',
  requestId: 'request',
  digest: 'identity',
  value: runSchema.parse({
    id: 'r',
    sessionId: 's',
    input: 'fault fixture',
    backend: 'openrouter',
    model: 'fixture',
    mode: 'build',
    state: 'running',
    createdAt: now,
    updatedAt: now,
    maxCost: 1,
    maxSteps: 10,
  }),
})
const base = { id: 'effect', runId: 'r', capability: 'fixture_effect', digest: 'd' }
await store.call({ op: 'effect.put', value: { ...base, state: 'prepared' } })
if (boundary !== 'prepared') {
  await store.call({ op: 'effect.put', value: { ...base, state: 'dispatched' } })
  if (boundary !== 'dispatched') {
    await appendFile(join(directory, 'external-receipt.txt'), 'accepted\n')
    if (boundary === 'confirmed')
      await store.call({
        op: 'effect.put',
        value: {
          ...base,
          state: 'confirmed',
          outcome: { kind: 'ok', value: { receipt: 'accepted' }, artifacts: [] },
        },
      })
  }
}
console.log('CUT')
setInterval(() => {}, 1000)
