import { z } from 'zod'
import type { Processes } from '../process/manager'
import { tool } from './definition'
import { workspacePath } from './paths'

export function searchTool(processes: Processes) {
  return tool(
    'text_search',
    'Search literal text with ripgrep, respecting ignore files. Results are bounded.',
    'read',
    z.object({ text: z.string().min(1).max(1000), path: z.string().default('.') }),
    async (input, context) => {
      const path = await workspacePath(context.workspace, input.path)
      const result = await processes.run(
        {
          executable: 'rg',
          args: [
            '--fixed-strings',
            '--line-number',
            '--no-heading',
            '--color',
            'never',
            '--max-count',
            '50',
            '--max-columns',
            '500',
            '--glob',
            '!.env*',
            '--glob',
            '!.git/**',
            '--',
            input.text,
            path,
          ],
          cwd: context.workspace,
          maxBytes: 64000,
          timeoutMs: 15000,
        },
        context.signal,
      )
      if (result.code !== 0 && result.code !== 1 && result.reason !== 'output_limit')
        throw new Error(`Search failed: ${result.output}`)
      return result
    },
  )
}
