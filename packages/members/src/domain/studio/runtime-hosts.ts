import type { StudioOperationAvailability } from '@sistemazero/core/studio/project-capabilities'
import { StudioRuntimeSelectionSchema } from '@sistemazero/core/studio/project-environment'
import { studioPythonRuntimeRoute } from '@sistemazero/core/studio/python-runtime-distribution'
import {
  type StudioProjectCapability,
  type StudioRuntimeCatalog,
  selectStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import type { StudioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { z } from 'zod'

const hostsSchema = z
  .array(z.strictObject({ runtime: StudioRuntimeSelectionSchema, origin: z.url() }))
  .max(1024)

/** Approved deployments only. Origin and content-addressed path are never taken from a project. */
export function createStudioRuntimeHosts(catalog: StudioRuntimeCatalog, raw: unknown) {
  const entries = hostsSchema.parse(raw)
  const hosts = new Map<string, { url: string; allowedOrigins: readonly string[] }>()
  for (const entry of entries) {
    const release = selectStudioRuntimeRelease(catalog, entry.runtime)
    const origin = new URL(entry.origin)
    if (
      release?.manifest.programmingLanguage !== 'python' ||
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      origin.pathname !== '/' ||
      (origin.protocol !== 'https:' &&
        !(
          origin.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
        ))
    )
      throw new Error(
        'O host precisa apontar para uma origem segura e uma release Python aprovada.',
      )
    if (hosts.has(release.manifestSha256)) throw new Error('Host de execução repetido.')
    hosts.set(release.manifestSha256, {
      url: `${origin.origin}${studioPythonRuntimeRoute(release.manifestSha256)}frame.html`,
      allowedOrigins: Object.freeze([origin.origin]),
    })
  }
  const frame = (project: Pick<StudioRuntimeSubject, 'runtime'>) => {
    if (!selectStudioRuntimeRelease(catalog, project.runtime)) return undefined
    const value = hosts.get(project.runtime.manifestSha256)
    return value ? { url: value.url, allowedOrigins: [...value.allowedOrigins] } : undefined
  }
  return {
    frame,
    operations(
      project: Pick<StudioRuntimeSubject, 'runtime'>,
    ): readonly StudioOperationAvailability[] {
      if (!frame(project)) return []
      // Browser implementation exists for the interpreter operations; publication and Zappy
      // assistance are implemented by the BFF for any hosted Python release. The manifest and
      // context narrow them further; installing packages and shell access are deliberately absent.
      const capabilities: readonly StudioProjectCapability[] = [
        'edit',
        'execute',
        'pause',
        'publish',
        'export-source',
        'python-repl',
        'assist',
      ]
      return capabilities.map((capability) => ({ capability, state: 'available' }))
    },
  }
}
export type StudioRuntimeHosts = ReturnType<typeof createStudioRuntimeHosts>
