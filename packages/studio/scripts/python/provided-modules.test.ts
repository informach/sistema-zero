import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { verifyPythonProvidedModuleArtifacts } from '@sistemazero/core/studio/python-provided-modules-render'
import { buildPythonProvidedModuleArtifacts } from './provided-modules'

const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const implementation = () =>
  new Map(
    ['worker.mjs', 'frame.mjs', 'standalone.mjs', 'playtest.mjs'].map((path) => [
      path,
      new TextEncoder().encode(`// ${path}\n`),
    ]),
  )

test('build metadata binds the emitted descriptor, stub and exact compiled implementation bytes', async () => {
  const contents = implementation()
  const before = [...contents].map(([path, bytes]) => [path, digest(bytes)])
  const built = await buildPythonProvidedModuleArtifacts(contents)
  expect([...contents].map(([path, bytes]) => [path, digest(bytes)])).toEqual(before)
  expect(built.files.size).toBe(2)
  expect(built.modules).toHaveLength(1)
  const artifacts = [...contents, ...built.files].map(([path, bytes]) => ({
    path,
    sha256: digest(bytes),
  }))
  const module = built.modules[0]!
  expect(await verifyPythonProvidedModuleArtifacts(module, artifacts)).toEqual(module)
  const descriptor = JSON.parse(
    new TextDecoder().decode(built.files.get(module.descriptorArtifact.path)),
  )
  expect(descriptor).toEqual(module.descriptor)
  expect(new TextDecoder().decode(built.files.get(module.typingArtifact.path))).toContain(
    'def play(path: str, *, loop: bool = False, volume: float = 1.0) -> int:',
  )
  const swapped = artifacts.map((entry) =>
    entry.path === 'worker.mjs' ? { ...entry, sha256: 'f'.repeat(64) } : entry,
  )
  await expect(verifyPythonProvidedModuleArtifacts(module, swapped)).rejects.toThrow('difere')
})

test('build refuses missing implementation or overwriting a pre-existing logical metadata file', async () => {
  const missing = implementation()
  missing.delete('frame.mjs')
  await expect(buildPythonProvidedModuleArtifacts(missing)).rejects.toThrow('frame.mjs')
  const occupied = implementation()
  occupied.set(
    'python-modules/sz_audio/1.0.0/__init__.pyi',
    new TextEncoder().encode('author bytes'),
  )
  await expect(buildPythonProvidedModuleArtifacts(occupied)).rejects.toThrow('ocupado')
  expect(new TextDecoder().decode(occupied.get('python-modules/sz_audio/1.0.0/__init__.pyi'))).toBe(
    'author bytes',
  )
})
