import { expect, test } from 'bun:test'
import { sha256Hex } from '@sistemazero/core/creations'
import {
  PYTHON_MOLDA_RELEVO_FEATURE,
  PYTHON_MOLDA_SCENE_FEATURE,
} from '@sistemazero/core/studio/python-runtime-features'
import {
  createStudioRuntimeCatalog,
  createStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { scene3DRuntimeCompatible, scene3DRuntimeReadsRelevo } from './scene3dCompatibility'

/**
 * O relevo de mundo grande num projeto Python (plano "Mundos de 2 km", lote 6): o Estúdio só pede o
 * cenário em campo quando a versão do runtime do projeto declara o `cenario.py` que o lê; sem isso
 * (ou sem catálogo), o cenário vem com os lotes de terreno de sempre.
 */
async function ambiente(features: string[]) {
  const release = await createStudioRuntimeRelease({
    manifestVersion: 1,
    profileId: 'python-test',
    releaseId: 'test-1',
    programmingLanguage: 'python',
    kinds: ['classic'],
    modes: ['blocks', 'bridge', 'code'],
    capabilities: ['edit'],
    extensions: [],
    sourceTargets: ['browser'],
    requiredBrowserFeatures: [],
    artifacts: [{ path: 'test-runtime.txt', sha256: await sha256Hex('fixture') }],
    python: {
      version: '3.14.2',
      packages: [],
      providedModules: [],
      features: features as never,
    },
  })
  const catalog = await createStudioRuntimeCatalog({
    releases: [release],
    profiles: [
      {
        id: release.profileId,
        languages: ['python'],
        kinds: ['classic'],
        modes: ['blocks', 'bridge', 'code'],
        levels: [],
        releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
      },
    ],
  })
  return {
    catalog,
    runtime: {
      profileId: release.profileId,
      releaseId: release.releaseId,
      manifestSha256: release.manifestSha256,
    },
  }
}

test('o campo só vai ao Python com a versão que o lê', async () => {
  const com = await ambiente([PYTHON_MOLDA_SCENE_FEATURE, PYTHON_MOLDA_RELEVO_FEATURE])
  expect(scene3DRuntimeReadsRelevo(com.runtime, com.catalog)).toBe(true)
  const sem = await ambiente([PYTHON_MOLDA_SCENE_FEATURE])
  expect(scene3DRuntimeCompatible(sem.runtime, sem.catalog)).toBe(true)
  expect(scene3DRuntimeReadsRelevo(sem.runtime, sem.catalog)).toBe(false)
  // Sem catálogo (autoria só do código) ou sem runtime, nunca o campo.
  expect(scene3DRuntimeReadsRelevo(com.runtime, null)).toBe(false)
  expect(scene3DRuntimeReadsRelevo(undefined, com.catalog)).toBe(false)
})
