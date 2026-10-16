import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startMcpServer } from '@sistemazero/agent-integrations/mcp'
import { z } from 'zod'
import { CodexBackend } from '../src/backends/codex'
import { Processes } from '../src/process/manager'

const directory = await mkdtemp(join(tmpdir(), 'zero-mcp-native-'))
const signal = AbortSignal.timeout(30000)
const bridge = await startMcpServer({
  signal,
  tools: [
    {
      name: 'fixture_read',
      description: 'Fixture',
      effect: 'read',
      input: { type: 'object', properties: {} },
    },
  ],
  invoke: async () => ({ kind: 'ok', value: 'fixture', artifacts: [] }),
})
const connection = await new CodexBackend(new Processes(directory)).connect(directory, signal, true)
try {
  const { rpc } = connection
  rpc.onNotification = (method, params) => {
    if (method.toLowerCase().includes('mcp')) console.log(JSON.stringify({ method, params }))
  }
  const configuration = z
    .object({ config: z.object({ mcp_servers: z.record(z.string(), z.unknown()).optional() }) })
    .parse(await rpc.request('config/read', { includeLayers: false, cwd: directory }))
  const disabled = Object.fromEntries(
    Object.keys(configuration.config.mcp_servers ?? {}).map((name) => [name, { enabled: false }]),
  )
  const response = z.object({ thread: z.object({ id: z.string() }) }).parse(
    await rpc.request('thread/start', {
      cwd: directory,
      model: 'gpt-6.1-sol',
      sandbox: 'read-only',
      approvalPolicy: 'never',
      config: {
        mcp_servers: {
          ...disabled,
          sistemazero: {
            enabled: true,
            url: bridge.url,
            http_headers: { Authorization: `Bearer ${bridge.token}` },
          },
        },
      },
    }),
  )
  for (let attempt = 0; attempt < 5; attempt++) {
    console.log(
      JSON.stringify(
        await rpc.request('mcpServerStatus/list', { threadId: response.thread.id, limit: 100 }),
      ),
    )
    await Bun.sleep(500)
  }
} finally {
  await connection.close()
  await bridge.close()
}
