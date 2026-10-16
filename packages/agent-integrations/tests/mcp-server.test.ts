import { expect, test } from 'bun:test'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { startMcpServer } from '../src/mcp/server'

test('MCP binding authenticates, rejects foreign origins and exposes only scoped capabilities', async () => {
  const signal = new AbortController().signal
  const calls: unknown[] = []
  const bridge = await startMcpServer({
    tools: [
      {
        name: 'fixture_read',
        description: 'Read fixture',
        effect: 'read',
        input: { type: 'object', properties: {}, additionalProperties: false },
      },
    ],
    signal,
    invoke: async (name, input, requestId) => {
      calls.push({ name, input, requestId })
      return { kind: 'ok', value: { content: 'evidence' }, artifacts: [] }
    },
  })
  const client = new Client({ name: 'fixture', version: '1' }, { capabilities: {} })
  try {
    expect((await fetch(bridge.url, { method: 'POST', body: '{}' })).status).toBe(401)
    expect(
      (
        await fetch(bridge.url, {
          method: 'POST',
          headers: { authorization: `Bearer ${bridge.token}`, origin: 'https://foreign.invalid' },
          body: '{}',
        })
      ).status,
    ).toBe(403)
    await client.connect(
      new StreamableHTTPClientTransport(new URL(bridge.url), {
        requestInit: { headers: { authorization: `Bearer ${bridge.token}` } },
      }),
    )
    const list = await client.listTools()
    expect(list.tools.map((tool) => tool.name)).toEqual(['fixture_read'])
    const result = await client.callTool({ name: 'fixture_read', arguments: {} })
    expect(result.isError).toBe(false)
    expect(calls).toHaveLength(1)
    const second = new Client({ name: 'fixture-status', version: '1' }, { capabilities: {} })
    const secondTransport = new StreamableHTTPClientTransport(new URL(bridge.url), {
      requestInit: { headers: { authorization: `Bearer ${bridge.token}` } },
    })
    try {
      await second.connect(secondTransport)
      expect((await second.listTools()).tools).toHaveLength(1)
      expect((await client.callTool({ name: 'fixture_read', arguments: {} })).isError).toBe(false)
    } finally {
      await secondTransport.terminateSession()
      await second.close()
    }
    await expect(
      client.callTool({ name: 'arbitrary_other_run', arguments: { runId: 'stolen' } }),
    ).rejects.toThrow()
    expect(calls).toHaveLength(2)
  } finally {
    await client.close()
    await bridge.close()
  }
})
