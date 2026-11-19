import { expect, test } from 'bun:test'
import { parseStudioBuildSubmission } from '../src/studio/build-contract'
import { createStudioProRevision } from '../src/studio/pro-revision'
import { isStudioProBuildMaterialPath } from '../src/studio/pro-runtime-capabilities'

const modules = [
  'studio-generated/molda-cenarios.mjs',
  'studio-generated/molda-cenarios.d.mts',
  'studio-generated/molda-cenarios-runtime.mjs',
]

test('o canal de materiais aceita somente os dois módulos derivados conhecidos', () => {
  for (const path of modules) expect(isStudioProBuildMaterialPath(path)).toBe(true)
  for (const path of [
    'studio-generated/other.mjs',
    'studio-generated/molda-cenarios.js',
    'Studio-generated/molda-cenarios.mjs',
    'studio-generated/../molda-cenarios.mjs',
    'public/scene.mjs',
    'public/__studio-proof.png',
  ])
    expect(isStudioProBuildMaterialPath(path)).toBe(false)
  expect(isStudioProBuildMaterialPath('public/sz-assets.js')).toBe(true)
})

test('a revisão inclui o hash dos módulos derivados sem permitir colisão com fontes', async () => {
  const input = {
    projectId: 'pro-cenario',
    templateId: 'vanilla-vite',
    devScript: 'dev',
    files: { 'src/main.ts': 'export {}' },
    directories: ['src'],
    assets: '{}',
    assetFiles: Object.fromEntries(modules.map((path) => [path, 'a'.repeat(64)])),
  }
  const revision = await createStudioProRevision(input)
  expect(revision.assetFiles).toEqual(input.assetFiles)
  await expect(
    createStudioProRevision({ ...input, files: { ...input.files, [modules[0]!]: 'meu codigo' } }),
  ).rejects.toThrow()
  await expect(
    createStudioProRevision({
      ...input,
      assetFiles: { 'studio-generated/other.mjs': 'a'.repeat(64) },
    }),
  ).rejects.toThrow()
})

test('o parser remoto preserva os três arquivos derivados com os limites e colisões existentes', () => {
  const binaries = Object.fromEntries(
    modules.map((p) => [p, { base64: 'eA==', sha256: 'a'.repeat(64) }]),
  )
  const request = {
    executionId: 'pro-cenario-123456789',
    templateId: 'vanilla-vite',
    parentOrigin: 'http://localhost:5413',
    files: { 'index.html': '<!doctype html><h1>Meu jogo</h1>' },
    binaries,
  }
  expect(parseStudioBuildSubmission(request).binaries).toEqual(binaries)
  expect(() =>
    parseStudioBuildSubmission({
      ...request,
      binaries: { 'studio-generated/other.mjs': binaries[modules[0]!] },
    }),
  ).toThrow()
  expect(() =>
    parseStudioBuildSubmission({
      ...request,
      files: { ...request.files, [modules[0]!]: 'meu codigo' },
    }),
  ).toThrow('colidem')
})
