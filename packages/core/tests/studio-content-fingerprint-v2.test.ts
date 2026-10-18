import { describe, expect, test } from 'bun:test'
import {
  isContentFingerprint,
  pintaContentFingerprint,
  studioContentFingerprint,
} from '../src/creations'

const runtime = {
  profileId: 'python-browser',
  releaseId: 'python-1',
  manifestSha256: 'a'.repeat(64),
}
const python = {
  entrypoint: 'main.py',
  dependencyLock: {
    lockVersion: 1,
    target: 'browser',
    runtimeManifestSha256: runtime.manifestSha256,
    requirementsSha256: 'b'.repeat(64),
    pythonVersion: '3.14.2',
    packages: [],
  },
}
const project = {
  formatVersion: 3,
  programmingLanguage: 'python',
  kind: 'classic',
  runtime,
  python,
  files: { 'main.py': 'import turtle\nturtle.forward(40)\n' },
  installedExtensions: [{ id: 'python-turtle', version: '1.0.0', installedAt: 1 }],
  assets: [{ id: 'hero', name: 'hero', source: 'upload', dataUrl: 'data:image/png;base64,YQ==' }],
}

describe('Studio content fingerprint v2', () => {
  test('legacy Studio and Pinta retain their exact bytes', async () => {
    expect(
      await studioContentFingerprint({
        kind: 'classic',
        files: { 'script.js': 'print(1)' },
        installedExtensions: [{ id: 'g2d', version: '1.0.0' }],
      }),
    ).toBe('v1:04263ca3a5bb381d7c560cacc115eb8059cb68cd8d5a54b49c88eb13658e2904')
    expect(
      await pintaContentFingerprint({
        id: 'a',
        name: 'drawing',
        kind: 'pixel-background',
        width: 2,
        height: 1,
        cels: [{ data: [0, 1] }],
      }),
    ).toBe('v1:7bcf9037092a005048ddf402adaa09a6a096fb2a891993871b62f0e705e23c94')
  })

  test('runtime, language, dependency resolution, extension version, source and assets affect equality', async () => {
    const base = await studioContentFingerprint(project)
    expect(base).toMatch(/^v2:[a-f0-9]{64}$/)
    for (const changed of [
      { ...project, runtime: { ...runtime, releaseId: 'python-2' } },
      { ...project, runtime: { ...runtime, manifestSha256: 'c'.repeat(64) } },
      { ...project, programmingLanguage: 'javascript', python: undefined },
      { ...project, python: { ...python, entrypoint: 'other.py' } },
      {
        ...project,
        python: {
          ...python,
          dependencyLock: { ...python.dependencyLock, requirementsSha256: 'c'.repeat(64) },
        },
      },
      {
        ...project,
        python: {
          ...python,
          dependencyLock: { ...python.dependencyLock, pythonVersion: '3.14.3' },
        },
      },
      {
        ...project,
        installedExtensions: [{ id: 'python-turtle', version: '1.0.1', installedAt: 1 }],
      },
      { ...project, files: { 'main.py': 'print(2)' } },
      { ...project, assets: [{ ...project.assets[0], dataUrl: 'data:image/png;base64,Yg==' }] },
    ])
      expect(await studioContentFingerprint(changed)).not.toBe(base)
  })

  test('editor-only state, install time and course-library additions do not request a new submission', async () => {
    const base = await studioContentFingerprint(project)
    expect(
      await studioContentFingerprint({
        ...project,
        name: 'Outro nome',
        updatedAt: 10,
        mode: 'bridge',
        blocksState: { moved: true },
        installedExtensions: [{ ...project.installedExtensions[0], installedAt: 99 }],
        assets: [
          ...project.assets,
          { id: 'course', source: 'library', dataUrl: 'data:image/png;base64,Yw==' },
        ],
      }),
    ).toBe(base)
  })

  test('Pro compares the real tree and language-specific run configuration', async () => {
    const pro = {
      ...project,
      kind: 'pro',
      files: undefined,
      tree: { 'main.py': { kind: 'file', content: 'print(1)' } },
      proMeta: { templateId: 'python-empty' },
    }
    expect(
      await studioContentFingerprint({
        ...pro,
        tree: { 'main.py': { kind: 'file', content: 'print(2)' } },
      }),
    ).not.toBe(await studioContentFingerprint(pro))
    const js = {
      ...pro,
      programmingLanguage: 'javascript',
      python: undefined,
      proMeta: { templateId: 'vite', devScript: 'dev' },
    }
    expect(
      await studioContentFingerprint({ ...js, proMeta: { ...js.proMeta, devScript: 'preview' } }),
    ).not.toBe(await studioContentFingerprint(js))
    expect(
      await studioContentFingerprint({
        ...js,
        proMeta: { ...js.proMeta, assistance: { version: 1, briefing: 'Minha ideia' } },
      }),
    ).toBe(await studioContentFingerprint(js))
  })

  test('unknown or missing environment never becomes a legacy JavaScript fingerprint', async () => {
    for (const invalid of [
      { ...project, formatVersion: 4 },
      { ...project, formatVersion: 2 },
      { ...project, programmingLanguage: undefined },
      { ...project, programmingLanguage: 'ruby' },
      { ...project, runtime: undefined },
      { ...project, python: undefined },
    ])
      expect(await studioContentFingerprint(invalid)).toBeNull()
    expect(isContentFingerprint(`v1:${'a'.repeat(64)}`)).toBe(true)
    expect(isContentFingerprint(`v2:${'a'.repeat(64)}`)).toBe(true)
    expect(isContentFingerprint(`v3:${'a'.repeat(64)}`)).toBe(false)
  })
})
