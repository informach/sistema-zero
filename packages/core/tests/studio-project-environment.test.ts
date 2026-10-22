import { describe, expect, test } from 'bun:test'
import {
  isStudioPortablePath,
  STUDIO_DEFAULT_PROJECT_LANGUAGE,
  StudioDependencyLockSchema,
  StudioProjectEnvironmentSchema,
  StudioPythonEntrypointSchema,
  studioPortableFileConflict,
} from '../src/studio/project-environment'
import {
  createStudioRuntimeCatalog,
  createStudioRuntimeRelease,
  type StudioRuntimeManifest,
  studioDependencyLockIssue,
} from '../src/studio/runtime-catalog'

const digest = 'a'.repeat(64)
const selection = { profileId: 'python-browser', releaseId: 'python-1', manifestSha256: digest }
const emptyLock = {
  lockVersion: 1 as const,
  target: 'browser' as const,
  pythonVersion: '3.14.2',
  runtimeManifestSha256: digest,
  requirementsSha256: digest,
  packages: [],
}
const packageA = {
  distribution: 'example-a',
  version: '1.0.0',
  imports: ['example_a'],
  requires: [],
  artifacts: [{ path: 'wheels/example_a.whl', sha256: digest }],
}

function manifest(): StudioRuntimeManifest {
  return {
    manifestVersion: 1,
    profileId: 'python-browser',
    releaseId: 'python-1',
    programmingLanguage: 'python',
    kinds: ['classic', 'pro'],
    modes: ['blocks', 'bridge', 'code'],
    capabilities: ['edit', 'execute', 'export-source'],
    extensions: [],
    sourceTargets: ['browser', 'desktop'],
    requiredBrowserFeatures: ['wasm', 'worker', 'jspi', 'trusted-types'],
    artifacts: [{ path: 'runtime/bootstrap.mjs', sha256: digest }],
    python: { version: '3.14.2', packages: [], providedModules: [], features: [] },
  }
}

describe('project environment boundary', () => {
  test('JavaScript is a creation default, never a parser fallback', () => {
    expect(STUDIO_DEFAULT_PROJECT_LANGUAGE).toBe('javascript')
    expect(
      StudioProjectEnvironmentSchema.safeParse({
        programmingLanguage: 'python',
        runtime: selection,
      }).success,
    ).toBe(true)
    for (const programmingLanguage of [undefined, null, 'Python', 'typescript', 'rust']) {
      expect(
        StudioProjectEnvironmentSchema.safeParse({ programmingLanguage, runtime: selection })
          .success,
      ).toBe(false)
    }
    expect(
      StudioProjectEnvironmentSchema.safeParse({
        programmingLanguage: 'python',
        runtime: { ...selection, url: 'https://evil.invalid/worker.js' },
      }).success,
    ).toBe(false)
    expect(
      StudioProjectEnvironmentSchema.safeParse({
        programmingLanguage: 'python',
        runtime: { ...selection, manifestSha256: 'latest' },
      }).success,
    ).toBe(false)
  })

  test('portable paths reject traversal, alternate separators and Windows aliases', () => {
    for (const path of ['main.py', 'app/__init__.py', 'assets/turtle-1.png', '.python-version'])
      expect(isStudioPortablePath(path)).toBe(true)
    for (const path of [
      '',
      '/main.py',
      'C:/main.py',
      '../main.py',
      'app/./main.py',
      'app//main.py',
      'app\\main.py',
      'con.py',
      'app/NUL.txt',
      'name./main.py',
      '.git/config',
      'constructor/helper.py',
      'PROTOTYPE/hero.gif',
      'app/__proto__/main.py',
      `${'a/'.repeat(17)}main.py`,
      'a\0.py',
      'a.py:stream',
    ])
      expect(isStudioPortablePath(path)).toBe(false)
    expect(StudioPythonEntrypointSchema.safeParse('src/main.py').success).toBe(true)
    expect(StudioPythonEntrypointSchema.safeParse('main.js').success).toBe(false)
  })

  test('dependency locks are exact, closed and portable', () => {
    expect(StudioDependencyLockSchema.safeParse(emptyLock).success).toBe(true)
    expect(
      StudioDependencyLockSchema.safeParse({ ...emptyLock, packages: [packageA] }).success,
    ).toBe(true)
    for (const version of ['latest', '^1.0', '>=1', 'https://x.invalid/a.whl', '1; import os']) {
      expect(
        StudioDependencyLockSchema.safeParse({ ...emptyLock, packages: [{ ...packageA, version }] })
          .success,
      ).toBe(false)
    }
    expect(
      StudioDependencyLockSchema.safeParse({
        ...emptyLock,
        packages: [{ ...packageA, requires: ['absent'] }],
      }).success,
    ).toBe(false)
    expect(
      StudioDependencyLockSchema.safeParse({ ...emptyLock, packages: [packageA, packageA] })
        .success,
    ).toBe(false)
    expect(
      StudioDependencyLockSchema.safeParse({
        ...emptyLock,
        packages: [
          {
            ...packageA,
            artifacts: [packageA.artifacts[0], { path: 'wheels/EXAMPLE_A.whl', sha256: digest }],
          },
        ],
      }).success,
    ).toBe(false)
  })
})

describe('host-owned runtime catalog', () => {
  test('artifacts cannot be both file and directory or alias a parent on Windows', async () => {
    for (const paths of [
      ['runtime', 'runtime/worker.mjs'],
      ['runtime/worker.mjs', 'runtime'],
      ['Runtime', 'runtime/worker.mjs'],
      ['Runtime/a.mjs', 'runtime/b.mjs'],
    ]) {
      expect(studioPortableFileConflict(paths)).not.toBeNull()
      const value = manifest()
      value.artifacts = paths.map((path) => ({ path, sha256: digest }))
      await expect(createStudioRuntimeRelease(value)).rejects.toThrow()
      expect(
        StudioDependencyLockSchema.safeParse({
          ...emptyLock,
          packages: paths.map((path, index) => ({
            ...packageA,
            distribution: `example-${index}`,
            artifacts: [{ path, sha256: digest }],
          })),
        }).success,
      ).toBe(false)
    }
    expect(studioPortableFileConflict(['runtime/a.mjs', 'runtime/b.mjs', 'runtime-v2'])).toBeNull()
  })
  test('manifest contents, not a mutable descriptive label, determine identity', async () => {
    const release = await createStudioRuntimeRelease(manifest())
    const again = await createStudioRuntimeRelease(manifest())
    expect(again.manifestSha256).toBe(release.manifestSha256)
    const changed = manifest()
    changed.artifacts[0]!.sha256 = 'b'.repeat(64)
    expect((await createStudioRuntimeRelease(changed)).manifestSha256).not.toBe(
      release.manifestSha256,
    )
    expect(Object.isFrozen(release.manifest.artifacts[0])).toBe(true)
    expect(Object.isFrozen(release.manifest.capabilities)).toBe(true)
    const profile = {
      id: 'python-browser',
      languages: ['python'] as const,
      kinds: ['classic', 'pro'] as const,
      modes: ['blocks', 'bridge', 'code'] as const,
      levels: ['iniciante'],
      releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
    }
    const catalog = await createStudioRuntimeCatalog({ profiles: [profile], releases: [release] })
    expect(catalog.releases).toHaveLength(1)
    expect(Object.isFrozen(catalog.profiles[0]!.releases)).toBe(true)
    await expect(
      createStudioRuntimeCatalog({
        profiles: [profile],
        releases: [{ ...release, manifest: { ...release.manifest, sourceTargets: ['browser'] } }],
      }),
    ).rejects.toThrow('hash')
    await expect(createStudioRuntimeCatalog({ profiles: [profile], releases: [] })).rejects.toThrow(
      'ausente',
    )
    await expect(
      createStudioRuntimeCatalog({ profiles: [profile, profile], releases: [release] }),
    ).rejects.toThrow('repetidas')
  })

  test('a lock cannot inject an unapproved wheel or another runtime', async () => {
    const release = await createStudioRuntimeRelease(manifest())
    const lock = { ...emptyLock, runtimeManifestSha256: release.manifestSha256 }
    expect(studioDependencyLockIssue(lock, release, digest)).toBeNull()
    expect(studioDependencyLockIssue({ ...lock, packages: [packageA] }, release, digest)).toBe(
      'dependency-not-approved',
    )
    expect(studioDependencyLockIssue({ ...lock, pythonVersion: '3.13.0' }, release, digest)).toBe(
      'dependency-runtime-mismatch',
    )
    expect(studioDependencyLockIssue(lock, release, 'b'.repeat(64))).toBe(
      'dependency-requirements-mismatch',
    )
    const withPackage = manifest()
    withPackage.python!.packages = [packageA]
    await expect(createStudioRuntimeRelease(withPackage)).rejects.toThrow()
    withPackage.artifacts.push(packageA.artifacts[0]!)
    const approved = await createStudioRuntimeRelease(withPackage)
    const resolved = {
      ...lock,
      runtimeManifestSha256: approved.manifestSha256,
      packages: [packageA],
    }
    expect(studioDependencyLockIssue(resolved, approved, digest)).toBeNull()
    expect(
      studioDependencyLockIssue(
        { ...resolved, packages: [{ ...packageA, imports: ['unapproved'] }] },
        approved,
        digest,
      ),
    ).toBe('dependency-not-approved')
  })
})
