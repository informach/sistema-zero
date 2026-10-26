import {
  createStudioRuntimeCatalog,
  createStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { createStudioProjectDocument } from '../../core/projectFactory'
import type { StudioRuntimeEnvironment } from '../../runtime/environment'
import { PGZERO_EXTENSION } from '../../runtime/python/pgzero/contract'
import { PYGAME_EXTENSION } from '../../runtime/python/pygame/contract'
import { RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION } from '../../runtime/python/raylib/contract'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'
import { createStudioRuntimeRegistry } from '../../runtime/registry'
import { refinePythonProjectDocument } from '../pythonProjectValidation'

/** Host fixture approves only inert test bytes; it can never start an interpreter. */
export async function pythonEnvironmentFixture(kind: 'classic' | 'pro') {
  const release = await createStudioRuntimeRelease({
    manifestVersion: 1,
    profileId: 'python-test',
    releaseId: 'test-1',
    programmingLanguage: 'python',
    kinds: ['classic', 'pro'],
    modes: ['blocks', 'bridge', 'code'],
    capabilities: ['edit', 'execute', 'export-source', 'python-repl'],
    extensions: [
      { id: TURTLE_EXTENSION.id, versions: [TURTLE_EXTENSION.version] },
      { id: PGZERO_EXTENSION.id, versions: [PGZERO_EXTENSION.version] },
      { id: RAYLIB_2D_EXTENSION.id, versions: [RAYLIB_2D_EXTENSION.version] },
      { id: RAYLIB_3D_EXTENSION.id, versions: [RAYLIB_3D_EXTENSION.version] },
      { id: PYGAME_EXTENSION.id, versions: [PYGAME_EXTENSION.version] },
    ],
    sourceTargets: ['browser', 'desktop'],
    requiredBrowserFeatures: [],
    artifacts: [{ path: 'test.txt', sha256: 'a'.repeat(64) }],
    python: { version: '3.14.2', packages: [], providedModules: [], features: [] },
  })
  const catalog = await createStudioRuntimeCatalog({
    releases: [release],
    profiles: [
      {
        id: release.profileId,
        languages: ['python'],
        kinds: ['classic', 'pro'],
        modes: ['blocks', 'bridge', 'code'],
        levels: [],
        releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
      },
    ],
  })
  const project = await refinePythonProjectDocument(
    await createStudioProjectDocument(
      {
        id: `python-${kind}`,
        name: 'Meu projeto',
        programmingLanguage: 'python',
        kind,
      },
      {
        catalog,
        releaseStatus: 'active',
        runtime: {
          profileId: release.profileId,
          releaseId: release.releaseId,
          manifestSha256: release.manifestSha256,
        },
      },
    ),
  )
  const environment: StudioRuntimeEnvironment = {
    catalog,
    registry: createStudioRuntimeRegistry([]),
    access: () => ({
      releaseStatus: 'active',
      hostOperations: [{ capability: 'edit', state: 'available' }],
      grantedCapabilities: ['edit'],
      grantedExtensionIds: [TURTLE_EXTENSION.id],
      curation: null,
    }),
    resolvePythonAnalysis: async () => {
      throw new Error('No test runtime is executable.')
    },
  }
  return { project, environment }
}
