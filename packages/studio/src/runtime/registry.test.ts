import { describe, expect, test } from 'bun:test'
import { sha256Hex } from '@sistemazero/core/creations'
import {
  createStudioRuntimeCatalog,
  createStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { createStudioProjectDocument } from '../core/projectFactory'
import {
  createStudioRuntimeRegistry,
  type StudioRuntimeLoadInput,
  type StudioRuntimeRegistration,
} from './registry'
import type { StudioRuntimeProvider } from './types'

async function scenario(language: 'javascript' | 'python') {
  const release = await createStudioRuntimeRelease({
    manifestVersion: 1,
    profileId: `${language}-test`,
    releaseId: 'test-1',
    programmingLanguage: language,
    kinds: ['classic', 'pro'],
    modes: ['blocks', 'bridge', 'code'],
    capabilities: ['edit', 'execute', 'export-source'],
    extensions: [],
    sourceTargets: ['browser', 'desktop'],
    requiredBrowserFeatures: [],
    artifacts: [
      {
        path: 'test-runtime.txt',
        sha256: await sha256Hex('Registry test fixture; not executable.'),
      },
    ],
    ...(language === 'python'
      ? { python: { version: '3.14.2', packages: [], providedModules: [], features: [] } }
      : {}),
  })
  const catalog = await createStudioRuntimeCatalog({
    releases: [release],
    profiles: [
      {
        id: release.profileId,
        languages: [language],
        kinds: ['classic', 'pro'],
        modes: ['blocks', 'bridge', 'code'],
        levels: [],
        releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
      },
    ],
  })
  const project = await createStudioProjectDocument(
    language === 'python'
      ? { id: language, name: language, programmingLanguage: 'python' }
      : { id: language, name: language, programmingLanguage: 'javascript' },
    {
      catalog,
      releaseStatus: 'active',
      runtime: {
        profileId: release.profileId,
        releaseId: release.releaseId,
        manifestSha256: release.manifestSha256,
      },
    },
  )
  const input: StudioRuntimeLoadInput = {
    project,
    catalog,
    signal: new AbortController().signal,
    access: {
      releaseStatus: 'active',
      hostOperations: [{ capability: 'execute', state: 'available' }],
      grantedCapabilities: ['execute'],
      grantedExtensionIds: [],
      curation: null,
    },
  }
  const provider: StudioRuntimeProvider = {
    id: `${language}-provider`,
    prepare: async () => {
      throw new Error('Registry tests must not prepare or run code.')
    },
  }
  let loads = 0
  const registration: StudioRuntimeRegistration = {
    id: provider.id,
    profileId: release.profileId,
    programmingLanguage: language,
    kinds: ['classic', 'pro'],
    load: async () => {
      loads++
      return provider
    },
  }
  return { input, provider, registration, loads: () => loads }
}

describe('lazy runtime routing', () => {
  test('JavaScript loads no Python module and concurrent requests share only the module', async () => {
    const js = await scenario('javascript')
    const py = await scenario('python')
    const registry = createStudioRuntimeRegistry([js.registration, py.registration])
    expect(js.loads()).toBe(0)
    expect(py.loads()).toBe(0)
    const modules = await Promise.all([registry.load(js.input), registry.load(js.input)])
    expect(modules).toEqual([js.provider, js.provider])
    expect(js.loads()).toBe(1)
    expect(py.loads()).toBe(0)
    expect(await registry.load(py.input)).toBe(py.provider)
    expect(py.loads()).toBe(1)
  })

  test('registration metadata is captured, so later mutation cannot reroute a project', async () => {
    const js = await scenario('javascript')
    const registry = createStudioRuntimeRegistry([js.registration])
    js.registration.profileId = 'changed'
    js.registration.kinds = []
    js.registration.load = async () => {
      throw new Error('changed')
    }
    expect(await registry.load(js.input)).toBe(js.provider)
  })

  test('missing provider, revoked release, absent grant and checking host never import a module', async () => {
    const py = await scenario('python')
    await expect(createStudioRuntimeRegistry([]).load(py.input)).rejects.toMatchObject({
      reasonCode: 'runtime-provider-missing',
    })
    const registry = createStudioRuntimeRegistry([py.registration])
    for (const access of [
      { ...py.input.access, releaseStatus: 'revoked' as const },
      { ...py.input.access, grantedCapabilities: [] },
      {
        ...py.input.access,
        hostOperations: [
          {
            capability: 'execute' as const,
            state: 'checking' as const,
            reasonCode: 'browser-checking',
          },
        ],
      },
    ])
      await expect(registry.load({ ...py.input, access })).rejects.toThrow('execução')
    expect(py.loads()).toBe(0)
  })

  test('a runtime identity mismatch does not fall back to JavaScript', async () => {
    const js = await scenario('javascript')
    const py = await scenario('python')
    const registry = createStudioRuntimeRegistry([js.registration, py.registration])
    await expect(
      registry.load({
        ...py.input,
        project: {
          ...py.input.project,
          runtime: { ...py.input.project.runtime, manifestSha256: 'b'.repeat(64) },
        },
      }),
    ).rejects.toMatchObject({ reasonCode: 'runtime-not-approved' })
    expect(js.loads()).toBe(0)
    expect(py.loads()).toBe(0)
  })

  test('failed imports and wrong module identities are retryable, with a structured failure', async () => {
    const js = await scenario('javascript')
    let calls = 0
    const registry = createStudioRuntimeRegistry([
      {
        ...js.registration,
        load: async () => {
          calls++
          if (calls === 1) throw new Error('Network')
          if (calls === 2) return { ...js.provider, id: 'wrong-provider' }
          return js.provider
        },
      },
    ])
    for (let index = 0; index < 2; index++)
      await expect(registry.load(js.input)).rejects.toMatchObject({
        reasonCode: 'runtime-module-failed',
      })
    expect(await registry.load(js.input)).toBe(js.provider)
    expect(calls).toBe(3)
  })

  test('aborting one editor cancels its wait while another editor receives the module', async () => {
    const py = await scenario('python')
    let complete!: (provider: StudioRuntimeProvider) => void
    const module = new Promise<StudioRuntimeProvider>((resolve) => {
      complete = resolve
    })
    const registry = createStudioRuntimeRegistry([{ ...py.registration, load: () => module }])
    const abort = new AbortController()
    const canceled = registry.load({ ...py.input, signal: abort.signal })
    const live = registry.load(py.input)
    abort.abort()
    await expect(canceled).rejects.toMatchObject({ name: 'AbortError' })
    complete(py.provider)
    expect(await live).toBe(py.provider)
    expect(await registry.load(py.input)).toBe(py.provider)
  })

  test('an already canceled request cannot start an import', async () => {
    const py = await scenario('python')
    const abort = new AbortController()
    abort.abort()
    await expect(
      createStudioRuntimeRegistry([py.registration]).load({ ...py.input, signal: abort.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(py.loads()).toBe(0)
  })

  test('duplicate routes and IDs are rejected at host registration', async () => {
    const js = await scenario('javascript')
    expect(() => createStudioRuntimeRegistry([js.registration, js.registration])).toThrow()
    expect(() =>
      createStudioRuntimeRegistry([js.registration, { ...js.registration, id: 'another' }]),
    ).toThrow()
    expect(() =>
      createStudioRuntimeRegistry([{ ...js.registration, kinds: ['classic', 'classic'] }]),
    ).toThrow()
  })
})
