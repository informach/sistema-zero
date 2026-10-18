import { beforeAll, describe, expect, test } from 'bun:test'
import {
  resolveStudioProjectCapabilities,
  type StudioCapabilityResolutionInput,
} from '../src/studio/project-capabilities'
import {
  createStudioRuntimeCatalog,
  createStudioRuntimeRelease,
} from '../src/studio/runtime-catalog'

let base: StudioCapabilityResolutionInput
beforeAll(async () => {
  const release = await createStudioRuntimeRelease({
    manifestVersion: 1,
    profileId: 'python-browser',
    releaseId: 'python-1',
    programmingLanguage: 'python',
    kinds: ['classic', 'pro'],
    modes: ['blocks', 'bridge', 'code'],
    capabilities: ['edit', 'execute', 'publish', 'export-source', 'python-repl', 'assist'],
    extensions: [{ id: 'python-turtle', versions: ['1.0.0'] }],
    sourceTargets: ['browser', 'desktop'],
    requiredBrowserFeatures: ['wasm', 'worker', 'jspi', 'trusted-types'],
    artifacts: [{ path: 'runtime/worker.mjs', sha256: 'a'.repeat(64) }],
    python: { version: '3.14.2', packages: [] },
  })
  const profile = {
    id: 'python-browser',
    languages: ['python'] as const,
    kinds: ['classic', 'pro'] as const,
    modes: ['blocks', 'bridge', 'code'] as const,
    levels: ['iniciante', 'intermediario', 'avancado'],
    releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
  }
  const catalog = await createStudioRuntimeCatalog({ profiles: [profile], releases: [release] })
  base = {
    project: {
      programmingLanguage: 'python',
      kind: 'classic',
      runtime: {
        profileId: release.profileId,
        releaseId: release.releaseId,
        manifestSha256: release.manifestSha256,
      },
      installedExtensions: [],
    },
    profile: catalog.profiles[0]!,
    release: catalog.releases[0]!,
    releaseStatus: 'active',
    hostOperations: release.manifest.capabilities.map((capability) => ({
      capability,
      state: 'available',
    })),
    grantedCapabilities: release.manifest.capabilities,
    grantedExtensionIds: ['python-turtle'],
    curation: null,
  }
})

describe('shared capability resolution', () => {
  test('Python core does not install Turtle; classic and Pro have distinct modes', () => {
    const classic = resolveStudioProjectCapabilities(base)
    expect(classic.valid).toBe(true)
    expect(classic.modes).toEqual(['blocks', 'bridge'])
    expect(classic.extensionIds).toEqual([])
    expect(classic.capabilities).not.toContain('python-repl')
    expect(classic.capabilities).not.toContain('install-dependencies')
    const pro = resolveStudioProjectCapabilities({
      ...base,
      project: { ...base.project, kind: 'pro' },
    })
    expect(pro.modes).toEqual(['code'])
    expect(pro.capabilities).toContain('python-repl')
    expect(pro.capabilities).not.toContain('terminal')
  })

  test('unknown environment values cannot silently become JavaScript or execute', () => {
    for (const runtime of [
      { ...base.project.runtime, profileId: 'javascript-web' },
      { ...base.project.runtime, releaseId: 'unapproved' },
      { ...base.project.runtime, manifestSha256: 'b'.repeat(64) },
    ]) {
      const result = resolveStudioProjectCapabilities({
        ...base,
        project: { ...base.project, runtime },
      })
      expect(result.valid).toBe(false)
      expect(result.capabilities).toEqual([])
      expect(result.issues.length).toBeGreaterThan(0)
    }
    expect(
      resolveStudioProjectCapabilities({
        ...base,
        project: { ...base.project, programmingLanguage: 'javascript' },
      }).valid,
    ).toBe(false)
    expect(
      resolveStudioProjectCapabilities({
        ...base,
        project: { ...base.project, programmingLanguage: undefined },
      } as unknown as StudioCapabilityResolutionInput).valid,
    ).toBe(false)
  })

  test('curation that eliminates all valid modes is an authoring error', () => {
    for (const allowedModes of [[], ['blocks']] as const) {
      expect(
        resolveStudioProjectCapabilities({
          ...base,
          project: { ...base.project, kind: 'pro' },
          curation: { allowedModes: [...allowedModes] },
        }).valid,
      ).toBe(false)
    }
    expect(
      resolveStudioProjectCapabilities({
        ...base,
        curation: { allowedModes: ['bridge'], allowBlocks: [] },
      }).modes,
    ).toEqual(['bridge'])
    expect(
      resolveStudioProjectCapabilities({ ...base, curation: { level: 'unknown' } }).valid,
    ).toBe(false)
    expect(
      resolveStudioProjectCapabilities({ ...base, curation: { level: 'iniciante' } }).valid,
    ).toBe(true)
  })

  test('extensions need both release compatibility and independent contextual grants', () => {
    const project = {
      ...base.project,
      installedExtensions: [{ id: 'python-turtle', version: '1.0.0' }],
    }
    expect(resolveStudioProjectCapabilities({ ...base, project }).extensionIds).toEqual([
      'python-turtle',
    ])
    const denied = resolveStudioProjectCapabilities({ ...base, project, grantedExtensionIds: [] })
    expect(denied.valid).toBe(true)
    expect(denied.capabilities).not.toContain('execute')
    expect(denied.capabilities).toContain('export-source')
    expect(
      denied.operations.find((operation) => operation.capability === 'publish')?.reasonCode,
    ).toBe('extension-not-granted')
    for (const extension of [
      { id: 'python-turtle', version: '2.0.0' },
      { id: 'pygame-ce', version: '1.0.0' },
    ]) {
      expect(
        resolveStudioProjectCapabilities({
          ...base,
          project: { ...project, installedExtensions: [extension] },
        }).valid,
      ).toBe(false)
    }
    expect(
      resolveStudioProjectCapabilities({
        ...base,
        project: {
          ...project,
          installedExtensions: [...project.installedExtensions, ...project.installedExtensions],
        },
      }).valid,
    ).toBe(false)
  })

  test('missing host operations deny execution without preventing source export', () => {
    const missing = resolveStudioProjectCapabilities({
      ...base,
      hostOperations: [{ capability: 'export-source', state: 'available' }],
    })
    expect(missing.valid).toBe(true)
    expect(missing.capabilities).toEqual(['export-source'])
    expect(
      missing.operations.find((operation) => operation.capability === 'execute')?.reasonCode,
    ).toBe('host-operation-missing')
    const checking = resolveStudioProjectCapabilities({
      ...base,
      hostOperations: [{ capability: 'execute', state: 'checking', reasonCode: 'loading-runtime' }],
    })
    expect(checking.capabilities).not.toContain('execute')
    expect(checking.operations.find((operation) => operation.capability === 'execute')?.state).toBe(
      'checking',
    )
    const denied = resolveStudioProjectCapabilities({ ...base, grantedCapabilities: [] })
    expect(denied.capabilities).toEqual([])
  })

  test('retirement preserves existing projects; revocation preserves editing and export only', () => {
    expect(
      resolveStudioProjectCapabilities({ ...base, releaseStatus: 'retired' }).capabilities,
    ).toContain('execute')
    const revoked = resolveStudioProjectCapabilities({ ...base, releaseStatus: 'revoked' })
    expect(revoked.valid).toBe(true)
    expect(revoked.capabilities).toContain('edit')
    expect(revoked.capabilities).toContain('export-source')
    expect(revoked.capabilities).not.toContain('execute')
    expect(revoked.capabilities).not.toContain('publish')
  })

  test('conflicting host entries never choose the more permissive first match', () => {
    const result = resolveStudioProjectCapabilities({
      ...base,
      hostOperations: [
        { capability: 'execute', state: 'available' },
        { capability: 'execute', state: 'unavailable', reasonCode: 'runtime-down' },
      ],
    })
    expect(result.valid).toBe(false)
    expect(result.capabilities).toEqual([])
  })
})
