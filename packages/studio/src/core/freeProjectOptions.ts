import { StudioFreeOptionsSchema } from '@sistemazero/core/studio/authoring-catalog'
import { prepareStudioAuthoringOptions, studioAuthoringChoices } from './authoringOptions'
import type { StudioProjectFactoryContext } from './projectFactory'

export interface PythonProjectCreationEnvironment {
  key: string
  label: string
  kind: 'classic' | 'pro'
  context: StudioProjectFactoryContext
}

/** Discovery is verified separately from the fresh authorization required by every runtime operation. */
export async function prepareStudioFreeOptions(raw: unknown) {
  const options = StudioFreeOptionsSchema.parse(raw)
  const prepared = await prepareStudioAuthoringOptions({
    legacyJavaScript: options.legacyJavaScript,
    catalog: options.catalog,
  })
  const environments: PythonProjectCreationEnvironment[] = []
  if (prepared.catalog) {
    for (const kind of ['classic', 'pro'] as const) {
      if (kind === 'pro' && !options.canCreatePro) continue
      for (const choice of studioAuthoringChoices(prepared, kind)) {
        if (choice.language !== 'python' || !choice.policy) continue
        environments.push({
          key: choice.key,
          label: 'Python',
          kind,
          context: {
            catalog: prepared.catalog,
            runtime: choice.policy.runtime,
            releaseStatus: choice.policy.status,
          },
        })
      }
    }
  }
  return { options, environments }
}
