import { expect, test } from 'bun:test'
import { parseStudioBuildSubmission } from '../src/studio/build-contract'
import { createStudioProRevision } from '../src/studio/pro-revision'
import { isStudioProBuildMaterialPath } from '../src/studio/pro-runtime-capabilities'
import {
  readStudioProScene3DModule,
  renderStudioProScene3DModule,
  type StudioProScene3DMaterial,
} from '../src/studio/pro-scene3d'

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

const SDK = 'a'.repeat(64)
const material: StudioProScene3DMaterial = {
  id: 'praia',
  name: 'Praia',
  kind: 'scene3d',
  source: 'upload',
  dado3d: { versao: 1, cena: { pecas: [{ id: 'mar', x: 1 }] } },
  url: 'studio-assets/0f.json',
  mime: 'application/json',
  bytes: 120,
  sha256: 'b'.repeat(64),
}

test('o módulo do cenário sai sempre do mesmo modelo e volta com os mesmos dados (R3)', () => {
  const module = renderStudioProScene3DModule([material], SDK)
  expect(
    module.startsWith(`// SDK ${SDK}\nimport { criarSDKPro } from './molda-cenarios-runtime.mjs'`),
  ).toBe(true)
  expect(readStudioProScene3DModule(module)).toEqual([material])
  // Um material com acento no nome do arquivo antigo continua valendo.
  const antigo = { ...material, url: 'imagens/Herói da praia.glb', mime: 'model/gltf-binary' }
  expect(readStudioProScene3DModule(renderStudioProScene3DModule([antigo], SDK))).toEqual([antigo])
})

test('o servidor recusa o módulo com código além do modelo ou dados fora da regra (R3)', () => {
  const module = renderStudioProScene3DModule([material], SDK)
  for (const forged of [
    `${module}fetch('https://exemplo.test')\n`,
    `alert(1)\n${module}`,
    module.replace('JSON.parse(', 'JSON.parse(globalThis.x||'),
    renderStudioProScene3DModule([{ ...material, url: 'https://exemplo.test/x.glb' }], SDK),
    renderStudioProScene3DModule([{ ...material, url: '../segredo.json' }], SDK),
    renderStudioProScene3DModule([{ ...material, url: '/raiz.json' }], SDK),
    renderStudioProScene3DModule([{ ...material, sha256: 'curto' }], SDK),
    renderStudioProScene3DModule(
      [{ ...material, extra: 'chave estranha' } as unknown as StudioProScene3DMaterial],
      SDK,
    ),
  ])
    expect(readStudioProScene3DModule(forged)).toBeNull()
  expect(() => renderStudioProScene3DModule([material], 'nao-e-hash')).toThrow()
})
