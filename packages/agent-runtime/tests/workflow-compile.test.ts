import { expect, test } from 'bun:test'
import { WorkflowCompiler } from '../src/workflows/compiler'
import { resolveTemplate } from '../src/workflows/expressions'
import { dueOccurrences, nextOccurrence, validateSchedule } from '../src/workflows/schedule'

test('workflow compiler rejects unknown tools, cycles, missing refs, type mismatch and unsafe replay', async () => {
  const compiler = new WorkflowCompiler(() => [
    {
      name: 'fixture_read',
      effect: 'read',
      description: 'read',
      input: {
        type: 'object',
        required: ['path'],
        additionalProperties: false,
        properties: { path: { type: 'string' } },
      },
    },
    { name: 'fixture_send', effect: 'external', description: 'send', input: { type: 'object' } },
  ])
  const base = {
    version: 1,
    name: 'fixture',
    description: '',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: { path: { type: 'string' }, count: { type: 'number' } },
    },
    nodes: [
      {
        id: 'read',
        kind: 'capability',
        tool: 'fixture_read',
        input: { path: { $ref: 'inputs.path' } },
        outputSchema: { type: 'object', properties: { text: { type: 'string' } } },
      },
    ],
  }
  try {
    const compiled = await compiler.compile(base)
    expect(compiled.digest).toHaveLength(64)
    expect((await compiler.compile(structuredClone(base))).digest).toBe(compiled.digest)
    await expect(
      compiler.compile({ ...base, nodes: [{ ...base.nodes[0], tool: 'absent' }] }),
    ).rejects.toThrow('Unknown')
    await expect(
      compiler.compile({ ...base, nodes: [{ ...base.nodes[0], dependsOn: ['read'] }] }),
    ).rejects.toThrow('cycle')
    await expect(
      compiler.compile({
        ...base,
        nodes: [{ ...base.nodes[0], input: { path: { $ref: 'inputs.missing' } } }],
      }),
    ).rejects.toThrow('absent')
    await expect(
      compiler.compile({
        ...base,
        nodes: [{ ...base.nodes[0], input: { path: { $ref: 'inputs.count' } } }],
      }),
    ).rejects.toThrow('type')
    await expect(
      compiler.compile({
        ...base,
        nodes: [{ ...base.nodes[0], tool: 'fixture_send', attempts: 2, input: {} }],
      }),
    ).rejects.toThrow('retry')
    expect(
      resolveTemplate({ path: { $ref: 'inputs.path' } }, { inputs: { path: 'safe.txt' } }),
    ).toEqual({ path: 'safe.txt' })
    expect(() => resolveTemplate({ $ref: 'inputs.constructor.name' }, { inputs: {} })).toThrow(
      'Invalid',
    )
    expect(() => resolveTemplate({ $ref: 'inputs.path' }, { inputs: {} })).toThrow('Missing')
  } finally {
    compiler.close()
  }
})

test('IANA scheduling skips nonexistent time, chooses one repeated occurrence and bounds catch-up', () => {
  const spring = validateSchedule({
    timezone: 'America/New_York',
    time: '02:30',
    missed: 'catch_up',
    maxCatchUp: 3,
  })
  const absent = dueOccurrences(
    spring,
    Date.parse('2026-03-08T00:00:00Z'),
    Date.parse('2026-03-09T00:00:00Z'),
  )
  expect(absent.occurrences).toHaveLength(0)
  const fall = validateSchedule({ timezone: 'America/New_York', time: '01:30', missed: 'catch_up' })
  const repeated = dueOccurrences(
    fall,
    Date.parse('2026-11-01T00:00:00Z'),
    Date.parse('2026-11-02T00:00:00Z'),
  )
  expect(repeated.occurrences).toHaveLength(1)
  expect(repeated.occurrences[0]?.at).toBe(Date.parse('2026-11-01T05:30:00Z'))
  const later = dueOccurrences(
    { ...fall, repeatedTime: 'later' },
    Date.parse('2026-11-01T00:00:00Z'),
    Date.parse('2026-11-02T00:00:00Z'),
  )
  expect(later.occurrences[0]?.at).toBe(Date.parse('2026-11-01T06:30:00Z'))
  expect(later.occurrences[0]?.key).toBe(repeated.occurrences[0]?.key)
  const missed = dueOccurrences(
    fall,
    Date.parse('2026-01-01T00:00:00Z'),
    Date.parse('2026-10-15T12:00:00Z'),
  )
  expect(missed.truncated).toBe(true)
  expect(missed.occurrences).toHaveLength(3)
  expect(
    nextOccurrence(
      validateSchedule({ timezone: 'America/Sao_Paulo', time: '09:00' }),
      Date.parse('2026-10-15T12:00:00Z'),
    ).at,
  ).toBe(Date.parse('2026-10-16T12:00:00Z'))
})
