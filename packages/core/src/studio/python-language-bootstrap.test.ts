import { expect, test } from 'bun:test'
import {
  currentPythonRelease,
  providedPythonRelease,
} from '../../tests/fixtures/python-provided-release'
import { canonicalJson } from '../creations/content-fingerprint'
import { StudioPythonLanguageOpenSchema } from './python-language-authorization'
import {
  assertPythonLanguageBootstrapSize,
  createPythonLanguageBootstrap,
  STUDIO_PYTHON_LANGUAGE_BOOTSTRAP_MAX_BYTES,
} from './python-language-bootstrap'
import { StudioRuntimeReleaseSchema } from './runtime-catalog'

test('Open and bootstrap require a release; declared metadata remains bound to its exact release', async () => {
  expect(
    StudioPythonLanguageOpenSchema.safeParse({ projectId: 'project', binding: 'a'.repeat(64) })
      .success,
  ).toBe(false)
  await expect(createPythonLanguageBootstrap({ protocolVersion: 1 })).rejects.toThrow()
  const current = await currentPythonRelease()
  const empty = await createPythonLanguageBootstrap({ protocolVersion: 1, runtimeRelease: current })
  expect(canonicalJson(empty.runtimeRelease)).toBe(canonicalJson(current))
  expect(empty.runtimeRelease!.manifest.python!.providedModules).toEqual([])
  const release = await providedPythonRelease()
  const input = { protocolVersion: 1, runtimeRelease: StudioRuntimeReleaseSchema.parse(release) }
  const pending = createPythonLanguageBootstrap(input)
  input.runtimeRelease.manifest.python!.providedModules = []
  const result = await pending
  expect(result.runtimeRelease!.manifest.python!.providedModules).toHaveLength(1)
  expect(Object.isFrozen(result.runtimeRelease!.manifest.python!.providedModules)).toBe(true)
})

test('bootstrap rejects forged release, canonical metadata and unexpected protocol fields', async () => {
  const release = await providedPythonRelease()
  await expect(
    createPythonLanguageBootstrap({
      protocolVersion: 1,
      runtimeRelease: { ...release, manifestSha256: '0'.repeat(64) },
    }),
  ).rejects.toThrow('hash')
  const changed = StudioRuntimeReleaseSchema.parse(release)
  changed.manifest.python!.providedModules = changed.manifest.python!.providedModules!.map(
    (module) => ({ ...module, descriptor: { ...module.descriptor, summary: 'forged' } }),
  )
  await expect(
    createPythonLanguageBootstrap({ protocolVersion: 1, runtimeRelease: changed }),
  ).rejects.toThrow()
  for (const value of [
    { protocolVersion: 2 },
    { protocolVersion: 1, extraPaths: ['/author'] },
    { protocolVersion: 1, runtimeRelease: null },
  ])
    await expect(createPythonLanguageBootstrap(value)).rejects.toThrow()
})

test('bootstrap byte ceiling counts UTF-8 rather than JS characters', () => {
  expect(() =>
    assertPythonLanguageBootstrapSize('a'.repeat(STUDIO_PYTHON_LANGUAGE_BOOTSTRAP_MAX_BYTES)),
  ).not.toThrow()
  expect(() =>
    assertPythonLanguageBootstrapSize('a'.repeat(STUDIO_PYTHON_LANGUAGE_BOOTSTRAP_MAX_BYTES + 1)),
  ).toThrow()
  expect(() =>
    assertPythonLanguageBootstrapSize(
      'é'.repeat(STUDIO_PYTHON_LANGUAGE_BOOTSTRAP_MAX_BYTES / 2 + 1),
    ),
  ).toThrow()
})
