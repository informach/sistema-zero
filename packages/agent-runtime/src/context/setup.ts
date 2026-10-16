import { memorySchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import type { Dispatcher } from '../execution/dispatcher'
import type { Processes } from '../process/manager'
import { Artifacts } from '../store/artifacts'
import type { Supervisor } from '../supervisor'
import { tool } from '../tools/definition'
import { fetchTool } from '../tools/web'
import { webSearch } from '../tools/web-search'
import { ContextBuilder } from './builder'
import { setupHooks } from './hooks'
import { ProjectIndex } from './index'
import { TypeScriptService } from './typescript'
export function setupContext(supervisor: Supervisor, dispatcher: Dispatcher, processes: Processes) {
  const index = new ProjectIndex(processes, supervisor.directory)
  const typescript = new TypeScriptService(index)
  const builder = new ContextBuilder(supervisor.store)
  setupHooks(dispatcher)
  supervisor.cleanup.add(() => index.close())
  dispatcher.register(fetchTool)
  dispatcher.register(webSearch(supervisor.directory))
  dispatcher.register(
    tool(
      'file_find',
      'Find project paths, respecting Git ignore rules. Index refreshes after filesystem changes.',
      'read',
      z.object({ query: z.string().max(500) }),
      (input, context) => index.find(context.workspace, input.query, context.signal),
    ),
  )
  dispatcher.register(
    tool(
      'code_inspect',
      'TypeScript/JavaScript language-service diagnostics, symbols and definitions. Runs in a bounded worker; stale evidence is marked.',
      'read',
      z.object({
        path: z.string(),
        operation: z.enum(['diagnostics', 'symbols', 'definition']),
        position: z.number().int().nonnegative().default(0),
      }),
      (input, context) =>
        typescript.query(
          context.workspace,
          input.path,
          input.operation,
          input.position,
          context.signal,
        ),
    ),
  )
  supervisor.commands.set('context.inspect', async (raw) => {
    const input = z
      .object({ workspace: z.string(), sessionId: z.string(), input: z.string().default('') })
      .parse(raw)
    return builder.build(input.workspace, input.sessionId, input.input)
  })
  supervisor.commands.set('memory.search', async (raw) =>
    supervisor.store.call({
      op: 'memory.search',
      ...z
        .object({
          workspace: z.string(),
          sessionId: z.string().optional(),
          query: z.string().default(''),
          offset: z.number().int().nonnegative().default(0),
        })
        .parse(raw),
    }),
  )
  supervisor.commands.set('skills', async (raw) =>
    builder.skills(z.object({ workspace: z.string() }).parse(raw).workspace),
  )
  supervisor.commands.set('memory.update', async (raw) =>
    supervisor.store.call({
      op: 'memory.update',
      ...z
        .object({
          id: z.string(),
          workspace: z.string(),
          expectedUpdatedAt: z.string(),
          body: memorySchema.shape.body,
          evidence: memorySchema.shape.evidence,
        })
        .parse(raw),
    }),
  )
  supervisor.commands.set('memory.delete', async (raw) =>
    supervisor.store.call({
      op: 'memory.delete',
      ...z.object({ id: z.string(), workspace: z.string() }).parse(raw),
    }),
  )
  supervisor.commands.set('memory.export', async (raw) => {
    const { workspace } = z.object({ workspace: z.string() }).parse(raw)
    const records: unknown[] = []
    let bytes = 0
    for (let offset = 0; ; offset += 50) {
      const page = z
        .array(memorySchema)
        .parse(await supervisor.store.call({ op: 'memory.page', workspace, offset }))
      bytes += Buffer.byteLength(JSON.stringify(page))
      if (bytes > 8_000_000) throw new Error('Memory export exceeds 8 MB; narrow the workspace')
      records.push(...page)
      if (page.length < 50) break
    }
    return new Artifacts(supervisor.directory).put(
      JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records }, null, 2),
      'application/json',
    )
  })
}
