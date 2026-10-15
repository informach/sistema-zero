import { expect, test } from 'bun:test'
import { McpConnection } from '../src/mcp/client'
import { SchemaValidator } from '../src/mcp/schema'
import { startMcpServer } from '../src/mcp/server'

test('MCP HTTP validates input before remote dispatch and rejects obsolete schema identity', async () => {
  const signal = new AbortController().signal
  let calls = 0
  const bridge = await startMcpServer({
    signal,
    tools: [
      {
        name: 'fixture_echo',
        description: 'Fixture',
        effect: 'read',
        input: {
          type: 'object',
          properties: { value: { type: 'integer' } },
          required: ['value'],
          additionalProperties: false,
        },
      },
    ],
    invoke: async (_name, input) => {
      calls++
      return { kind: 'ok', value: input, artifacts: [] }
    },
  })
  const connection = await McpConnection.http(bridge.url, signal, { token: bridge.token })
  try {
    const tool = (await connection.discover(undefined, signal)).tools[0]
    if (!tool) throw new Error('No fixture tool')
    await expect(
      connection.call(tool.name, { value: 'not an integer' }, tool.digest, signal),
    ).rejects.toThrow()
    await expect(connection.call(tool.name, { value: 3 }, 'obsolete', signal)).rejects.toThrow(
      'schema changed',
    )
    expect(calls).toBe(0)
    expect((await connection.call(tool.name, { value: 3 }, tool.digest, signal)).isError).toBe(
      false,
    )
    expect(calls).toBe(1)
  } finally {
    await connection.close()
    await bridge.close()
  }
})
test('costly untrusted patterns run outside the main thread and subsequent validation remains usable', async () => {
  const validator = new SchemaValidator()
  let ticks = 0
  const timer = setInterval(() => ticks++, 100)
  try {
    await expect(
      validator.validate({ type: 'string', pattern: '^(a+)+$' }, `${'a'.repeat(100)}!`),
    ).rejects.toThrow()
    expect(ticks).toBeGreaterThan(0)
    await validator.validate({ type: 'number' }, 3)
  } finally {
    clearInterval(timer)
    validator.close()
  }
}, 10000)
