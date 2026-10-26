import { expect, spyOn, test } from 'bun:test'
import {
  studioPythonDeploymentRoute,
  studioPythonLogicalFiles,
  studioPythonRuntimeRoute,
  verifyStudioPythonDeployment,
} from '@sistemazero/core/studio/python-runtime-distribution'
import {
  createStudioRuntimeCatalog,
  createStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import {
  createPythonDistributionRegistry,
  storePythonRuntimeDistribution,
} from '../../../../studio-runtime/src/python-distributions'
import { pythonDistributionFixture } from '../../../../studio-runtime/tests/python-distribution-fixture'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { buildPythonWebFiles } from '../pythonWeb'

for (const kind of ['classic', 'pro'] as const)
  test(`compressed ${kind} web export uses the real registry and preserves full approval with exact logical bytes`, async () => {
    const { project, environment } = await pythonEnvironmentFixture(kind)
    const runtime = await pythonDistributionFixture({
      standalone: true,
      boot: true,
      compressed: true,
    })
    const release = await createStudioRuntimeRelease({
      ...environment.catalog.releases[0]!.manifest,
      python: {
        ...environment.catalog.releases[0]!.manifest.python!,
        features: runtime.deployment.distribution.features,
      },
      artifacts: runtime.deployment.distribution.files.map(({ path, sha256 }) => ({
        path,
        sha256,
      })),
    })
    const deployment = { release, distribution: runtime.deployment.distribution }
    project.runtime = {
      profileId: release.profileId,
      releaseId: release.releaseId,
      manifestSha256: release.manifestSha256,
    }
    project.python.dependencyLock.runtimeManifestSha256 = release.manifestSha256
    environment.catalog = await createStudioRuntimeCatalog({
      releases: [release],
      profiles: environment.catalog.profiles.map((profile) => ({
        ...profile,
        releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
      })),
    })
    // Real upload/marker/hash verification and the same public registry used by production.
    await storePythonRuntimeDistribution({
      bucket: runtime.bucket,
      deployment,
      read: async (path) => runtime.contents.get(path)!,
    })
    const registry = await createPythonDistributionRegistry({
      approvedDeployments: [deployment],
      parentOrigins: ['https://app.example'],
      status: () => 'active',
    })
    const host = {
      metadataURL: `https://runtime.test${studioPythonDeploymentRoute(release.manifestSha256)}`,
      directoryURL: `https://runtime.test${studioPythonRuntimeRoute(release.manifestSha256)}`,
    }
    environment.resolvePythonWebExport = async () => ({ ...host })
    const seen: string[] = []
    const fetch = spyOn(globalThis, 'fetch')
    fetch.mockImplementation(
      Object.assign(
        async (
          input: Parameters<typeof globalThis.fetch>[0],
          init?: Parameters<typeof globalThis.fetch>[1],
        ) => {
          const request = new Request(input, init)
          seen.push(request.url)
          return registry.serve(request, runtime.bucket)
        },
        { preconnect: globalThis.fetch.preconnect },
      ),
    )
    let result: Awaited<ReturnType<typeof buildPythonWebFiles>>
    try {
      result = await buildPythonWebFiles(project, environment, new AbortController().signal)
      await result.revalidate()
    } finally {
      fetch.mockRestore()
    }
    const metadata = JSON.parse(String(result.files['runtime-deployment.json']))
    expect(metadata).toEqual(deployment)
    expect((await verifyStudioPythonDeployment(metadata)).release.manifestSha256).toBe(
      project.runtime.manifestSha256,
    )
    const logical = studioPythonLogicalFiles(deployment.distribution)
    expect(Object.keys(result.files).filter((path) => path.startsWith('runtime/'))).toHaveLength(
      logical.length,
    )
    for (const file of logical)
      expect(result.files[`runtime/${release.manifestSha256}/${file.path}`]).toEqual(
        runtime.contents.get(file.path)!,
      )
    expect(seen.some((url) => url.includes('/_http/'))).toBe(false)
    const internal = deployment.distribution.httpRepresentations![0]!.artifactPath
    expect(
      (await registry.serve(new Request(host.directoryURL + internal), runtime.bucket)).status,
    ).toBe(404)
  })
