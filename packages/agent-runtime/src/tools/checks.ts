import { canonical, ToolRejected } from '@sistemazero/agent-core'
import { z } from 'zod'
import type { Processes } from '../process/manager'
import { tool } from './definition'
import { hash, readBounded, workspacePath } from './paths'

const manifestSchema = z.object({
  packageManager: z.string().optional(),
  scripts: z.record(z.string(), z.string()).default({}),
})
async function checks(workspace: string) {
  const manifest = manifestSchema.parse(
    JSON.parse(
      (await readBounded(await workspacePath(workspace, 'package.json'), 256000)).toString('utf8'),
    ),
  )
  const manager = manifest.packageManager?.split('@')[0] ?? 'bun'
  if (!['bun', 'npm', 'pnpm', 'yarn'].includes(manager))
    throw new Error('Unsupported package manager for project checks')
  return Object.entries(manifest.scripts)
    .filter(([name]) => /^(test|check|lint|typecheck|build)(:|$)/.test(name))
    .map(([name, script]) => ({
      name,
      script,
      manager,
      digest: hash(canonical({ name, script, manager })),
    }))
}
export function checkTools(processes: Processes) {
  return [
    tool(
      'project_checks',
      'Discover declared package scripts for tests, lint, typecheck and build without executing them.',
      'read',
      z.object({}),
      (_input, context) => checks(context.workspace),
    ),
    tool(
      'project_check_run',
      'Execute one exact reviewed project check; script digest must still match. Uses the same owned process limits and requires approval.',
      'process',
      z.object({
        name: z.string(),
        expectedDigest: z.string().regex(/^[a-f0-9]{64}$/),
        timeoutMs: z.number().int().min(100).max(600000).default(120000),
      }),
      async (input, context) => {
        const check = (await checks(context.workspace)).find((check) => check.name === input.name)
        if (!check || check.digest !== input.expectedDigest)
          throw new ToolRejected(
            'CHECK_CHANGED',
            'Project check is missing or changed since review',
          )
        const result = await processes.run(
          {
            executable: check.manager,
            args: ['run', check.name],
            cwd: context.workspace,
            timeoutMs: input.timeoutMs,
          },
          context.signal,
        )
        if (result.reason !== 'exited' || result.code !== 0)
          throw new Error(`Check failed: ${result.output}; log ${result.log}`)
        return { ...result, check }
      },
    ),
  ]
}
