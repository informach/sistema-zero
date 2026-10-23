import { canonical, environmentTemplateSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import bunTemplate from '../../templates/bun-linux.json'
import type { Processes } from '../process/manager'
import { hash, readBounded, workspacePath } from '../tools/paths'

export async function inspectImage(
  processes: Processes,
  cwd: string,
  image: string,
  signal: AbortSignal,
) {
  if (!/^[a-zA-Z0-9./:@_-]{1,250}$/.test(image)) throw new Error('Invalid image name')
  const result = await processes.run(
    {
      executable: 'docker',
      args: [
        'image',
        'inspect',
        '--format',
        '{"Id":{{json .Id}},"Os":{{json .Os}},"Architecture":{{json .Architecture}}}',
        image,
      ],
      cwd,
      timeoutMs: 15000,
      maxBytes: 8000,
      logMode: 'stdout',
    },
    signal,
  )
  if (result.code !== 0 || result.reason !== 'exited')
    throw new Error('Image unavailable locally; pull the chosen version explicitly first')
  const info = z
    .object({
      Id: z.string().regex(/^sha256:[a-f0-9]{64}$/),
      Os: z.string(),
      Architecture: z.string(),
    })
    .parse(JSON.parse(result.output))
  if (info.Os !== 'linux') throw new Error('Only Linux containers are homologated')
  return { image: info.Id, os: info.Os, architecture: info.Architecture }
}
export async function discoverTemplates(workspace: string) {
  let manifest: unknown = { version: 1, templates: [] }
  try {
    manifest = JSON.parse(
      (
        await readBounded(await workspacePath(workspace, '.sistemazero/environments.json'), 64000)
      ).toString('utf8'),
    )
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
  }
  const parsed = z
    .object({ version: z.literal(1), templates: z.array(environmentTemplateSchema).max(20) })
    .parse(manifest)
  let scripts: Record<string, string> = {}
  try {
    scripts = z
      .object({ scripts: z.record(z.string(), z.string()).default({}) })
      .parse(
        JSON.parse(
          (await readBounded(await workspacePath(workspace, 'package.json'), 256000)).toString(
            'utf8',
          ),
        ),
      ).scripts
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
  }
  return {
    isolation: {
      containerRootReadOnly: true,
      workspaceDiskQuota: false,
      hostProcessesAreSandboxed: false,
    },
    templates: [
      environmentTemplateSchema.parse({ name: 'local' }),
      environmentTemplateSchema.parse(bunTemplate),
      ...parsed.templates,
    ].map((template) => ({
      ...template,
      digest: hash(canonical(template)),
    })),
    scripts,
    commandsRun: false,
  }
}
