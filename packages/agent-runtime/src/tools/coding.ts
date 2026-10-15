import { z } from 'zod'
import type { Processes } from '../process/manager'
import type { Patches } from '../workspace/patch'
import { patchSchema } from '../workspace/patch'
import { tool } from './definition'
import { workspacePath } from './paths'

export function codingTools(processes: Processes, patches: Patches) {
  return [
    tool(
      'file_patch',
      'Apply validated UTF-8 edits. Requires current SHA-256, or null for new files. Replacements are literal and must match exactly once. Returns checkpoint.',
      'workspace',
      patchSchema,
      (input, context) => patches.apply(context.workspace, context.run.id, input, context.signal),
    ),
    tool(
      'checkpoint_restore',
      'Restore only changes belonging to a checkpoint. Refuses concurrent user edits.',
      'workspace',
      z.object({ id: z.string() }),
      (input, context) =>
        patches.restore(input.id, context.run.id, context.signal, context.workspace),
    ),
    tool(
      'process_run',
      'Run an executable with structured arguments. Requires approval. Shell syntax requires explicitly invoking a shell. Output/time are bounded.',
      'process',
      z.object({
        executable: z.string().min(1),
        args: z.array(z.string()).max(100),
        cwd: z.string().default('.'),
        timeoutMs: z.number().int().min(100).max(600000).default(120000),
        terminal: z
          .object({
            columns: z.number().int().min(2).max(500),
            rows: z.number().int().min(2).max(500),
          })
          .optional(),
        input: z.string().max(32000).optional(),
      }),
      async (input, context) => {
        const result = await processes.run(
          { ...input, cwd: await workspacePath(context.workspace, input.cwd) },
          context.signal,
        )
        if (result.code !== 0 || result.reason !== 'exited')
          throw new Error(
            `Process ${result.reason}, exit ${result.code}; log ${result.log}\n${result.output.slice(-12000)}`,
          )
        return result
      },
    ),
    tool(
      'git_inspect',
      'Inspect Git status, diff or log without mutating the repository.',
      'read',
      z.object({
        operation: z.enum(['status', 'diff', 'log']),
        cached: z.boolean().default(false),
      }),
      async (input, context) => {
        const args =
          input.operation === 'status'
            ? ['status', '--porcelain=v1', '-uall']
            : input.operation === 'log'
              ? ['log', '-10', '--oneline']
              : [
                  'diff',
                  '--no-ext-diff',
                  '--no-textconv',
                  ...(input.cached ? ['--cached'] : []),
                  '--stat',
                  '--patch',
                ]
        const result = await processes.run(
          { executable: 'git', args, cwd: context.workspace, maxBytes: 128000, timeoutMs: 15000 },
          context.signal,
        )
        if (result.code !== 0) throw new Error(result.output)
        return result
      },
    ),
  ]
}
