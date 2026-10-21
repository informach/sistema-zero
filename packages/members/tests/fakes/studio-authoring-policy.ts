import { StudioAuthoringCatalogSchema } from '@sistemazero/core/studio/authoring-catalog'
import {
  createStudioRuntimeRelease,
  type StudioProjectCapability,
} from '@sistemazero/core/studio/runtime-catalog'
import { documentFixture } from '../../../studio/src/state/fixtures/projectDocuments'
import { createStudioAuthoringPolicy } from '../../src/domain/studio/authoring-policy'

/** Positive boundary tests declare publication and Zappy explicitly, as a real release must. */
export const FIXTURE_RELEASE_CAPABILITIES: readonly StudioProjectCapability[] = [
  'edit',
  'execute',
  'publish',
  'export-source',
  'assist',
]

/** Inert catalog for boundary tests; no interpreter or production approval is created. */
export async function authoringFixture(
  language: 'javascript' | 'python',
  kind: 'classic' | 'pro',
  capabilities: readonly StudioProjectCapability[] = FIXTURE_RELEASE_CAPABILITIES,
) {
  const release = await createStudioRuntimeRelease({
    manifestVersion: 1,
    profileId: `${language}-test`,
    releaseId: 'test-1',
    programmingLanguage: language,
    kinds: ['classic', 'pro'],
    modes: ['blocks', 'bridge', 'code'],
    capabilities: [...capabilities],
    extensions: [],
    sourceTargets: ['browser'],
    requiredBrowserFeatures: [],
    artifacts: [{ path: 'inert.txt', sha256: 'a'.repeat(64) }],
    ...(language === 'python' ? { python: { version: '3.14.2', packages: [] } } : {}),
  })
  const runtime = {
    profileId: release.profileId,
    releaseId: release.releaseId,
    manifestSha256: release.manifestSha256,
  }
  const project = documentFixture(language, kind)
  project.runtime = runtime
  project.assets = []
  delete project.coverAssetName
  if (project.programmingLanguage === 'python')
    project.python.dependencyLock.runtimeManifestSha256 = release.manifestSha256
  if (project.kind === 'pro' && language === 'javascript') project.proMeta.templateId = 'vanilla-js'
  const configuration = StudioAuthoringCatalogSchema.parse({
    version: 1,
    catalog: {
      profiles: [
        {
          id: release.profileId,
          languages: [language],
          kinds: ['classic', 'pro'],
          modes: ['blocks', 'bridge', 'code'],
          levels: ['avancado'],
          releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
        },
      ],
      releases: [release],
    },
    releases: [
      {
        runtime,
        status: 'active',
        proTemplateIds: ['vanilla-js', 'python-blank'],
        blockIds: [language === 'python' ? 'py_print' : 'sz_js_log'],
        categoryIds: [language === 'python' ? 'python-basics' : 'js'],
      },
    ],
  })
  return { project, configuration, policy: await createStudioAuthoringPolicy(configuration) }
}
