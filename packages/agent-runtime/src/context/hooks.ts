import { z } from 'zod'
import type { Dispatcher } from '../execution/dispatcher'
import { tool } from '../tools/definition'
import { hash, readBounded, workspacePath } from '../tools/paths'

const hookSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  executable: z.string().min(1),
  args: z.array(z.string()).max(100),
  cwd: z.string().default('.'),
  timeoutMs: z.number().int().min(100).max(600000).default(120000),
})
async function manifest(workspace: string) {
  const data = await readBounded(await workspacePath(workspace, '.sistemazero/hooks.json'), 64000)
  const value = z
    .object({ version: z.literal(1), hooks: z.array(hookSchema).max(30) })
    .parse(JSON.parse(data.toString('utf8')))
  if (new Set(value.hooks.map((hook) => hook.name)).size !== value.hooks.length)
    throw new Error('Duplicate hook names')
  return { ...value, sha256: hash(data) }
}
export function setupHooks(dispatcher: Dispatcher) {
  dispatcher.register(
    tool(
      'hooks_list',
      'Read explicitly configured .sistemazero/hooks.json. Discovery never executes a hook.',
      'read',
      z.object({}),
      async (_input, context) => manifest(context.workspace),
    ),
  )
  dispatcher.register(
    tool(
      'hook_run',
      'Run one explicit project hook. Supply the full reviewed command and manifest hash; permissions, process ownership and deadlines are the same as process_run.',
      'process',
      hookSchema.extend({ sha256: z.string() }),
      async (input, context) => {
        const document = await manifest(context.workspace)
        const expected = document.hooks.find((hook) => hook.name === input.name)
        if (
          document.sha256 !== input.sha256 ||
          !expected ||
          JSON.stringify(expected) !== JSON.stringify(hookSchema.parse(input))
        )
          throw new Error('Hook manifest or command changed; inspect it again')
        const processTool = dispatcher.tools.get('process_run')
        if (!processTool) throw new Error('Process capability unavailable')
        return processTool.execute(
          {
            executable: input.executable,
            args: input.args,
            cwd: input.cwd,
            timeoutMs: input.timeoutMs,
          },
          context,
        )
      },
    ),
  )
}
