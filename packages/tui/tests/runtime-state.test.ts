import { expect, test } from 'bun:test'
import { type RuntimeEvent, runSchema } from '@sistemazero/agent-core'
import { RuntimeState } from '../src/state/runtime'

const run = runSchema.parse({
  id: 'run',
  sessionId: 'session',
  input: 'original input',
  backend: 'openrouter',
  model: 'fixture',
  mode: 'plan',
  state: 'running',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  maxCost: 1,
  maxSteps: 5,
})
const event = (sequence: number, terminal = false): RuntimeEvent => ({
  schemaVersion: 1,
  id: `event-${sequence}`,
  runId: run.id,
  sequence,
  type: terminal ? 'run.state' : 'assistant.delta',
  payload: terminal ? { ...run, state: 'succeeded' } : 'text',
  occurredAt: new Date().toISOString(),
})

test('initial event tail supplies a terminal state newer than the run snapshot', async () => {
  const state = new RuntimeState('fixture')
  state.client = {
    close() {},
    async request(method) {
      if (method === 'events.tail') return { events: [event(1, true)] }
      throw new Error('fixture stream ended')
    },
  }
  try {
    await state.follow(run)
    expect(state.run?.state).toBe('succeeded')
    expect(state.run?.input).toBe('original input')
  } finally {
    state.close()
  }
})

test('stream eviction preserves the cursor for retrieving the immediately preceding history', async () => {
  const state = new RuntimeState('fixture')
  let batch = 0
  state.client = {
    close() {},
    async request(method) {
      if (method === 'events.tail') return { events: [] }
      if (batch === 5) return []
      const start = batch++ * 100
      return Array.from({ length: 100 }, (_, index) =>
        event(start + index + 1, start + index === 499),
      )
    },
  }
  try {
    const completed = new Promise<void>((resolve) => {
      state.on('change', () => {
        if (state.run?.state === 'succeeded') resolve()
      })
    })
    await state.follow(run)
    await completed
    expect(state.events).toHaveLength(300)
    expect(state.events[0]?.sequence).toBe(201)
    expect(state.previousCursor).toBe(201)
  } finally {
    state.close()
  }
})
