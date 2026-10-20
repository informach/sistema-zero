import { afterEach, expect, test } from 'bun:test'
import { resolveStudioProRemoteDependencies } from '@sistemazero/core/studio/pro-dependencies'
import { parseBuildRequest } from '../../../studio-runtime/src/contracts'
import { prepareRuntimeDependencyLock } from '../../../studio-runtime/src/dependency-lock'
import { createEmptyProject } from '../core/project'
import { updateLegacyProToolchainManifest } from '../core/proToolchain'
import { setProjectStorageNamespace } from './projectStorageRuntime'
import { createProjectStore } from './projectStore'
import { listProSessionApplications, undoProApplication } from './proRevision'
import { updateProToolchainBeforeExecution } from './proToolchainUpdate'

afterEach(() => setProjectStorageNamespace(''))
function fixture() {
  const store = createProjectStore()
  const manifest = {
    name: 'meu-jogo',
    private: true,
    type: 'module',
    scripts: { dev: 'vite --host 0.0.0.0', build: 'vite build', own: 'echo criativo' },
    author: 'Aluno',
    custom: { keep: [1, 'cor'] },
    dependencies: { three: '^0.180.0' },
    devDependencies: { vite: '8.0.16', typescript: '5.9.3' },
  }
  store.getState().setProject({
    ...createEmptyProject('legacy-pro', 'Meu jogo'),
    kind: 'pro',
    mode: 'code',
    proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
    tree: {
      'package.json': { kind: 'file', content: JSON.stringify(manifest) },
      'package-lock.json': {
        kind: 'file',
        content: '{"lockfileVersion":3,"legacy":"preserve on failure"}',
      },
      'index.html': { kind: 'file', content: '<main>Meu jogo</main>' },
      public: { kind: 'dir' },
      src: { kind: 'dir' },
      'src/main.ts': { kind: 'file', content: 'console.log("minha arte")' },
      'public/imagem.svg': { kind: 'file', content: '<svg xmlns="http://www.w3.org/2000/svg"/>' },
    },
  })
  return { store, manifest, original: store.getState().project! }
}
const prepare = async ({ packageJson }: { packageJson: string }) =>
  prepareRuntimeDependencyLock(packageJson)
const content = (
  tree: NonNullable<ReturnType<typeof fixture>['original']['tree']>,
  path: string,
) => {
  const file = tree[path]
  if (file?.kind !== 'file') throw new Error('fixture')
  return file.content
}

test('legacy RED control becomes a fully verified graph, changes only the pair and supports existing Undo', async () => {
  const { store, original, manifest } = fixture()
  expect(() =>
    resolveStudioProRemoteDependencies(
      content(original.tree!, 'package.json'),
      content(original.tree!, 'package-lock.json'),
    ),
  ).toThrow()
  const receipt = await updateProToolchainBeforeExecution(
    store,
    prepare,
    new AbortController().signal,
  )
  const current = store.getState().project!
  expect(JSON.parse(content(current.tree!, 'package.json'))).toEqual({
    ...manifest,
    devDependencies: { ...manifest.devDependencies, vite: '8.1.6' },
  })
  for (const [path, node] of Object.entries(original.tree!))
    if (!['package.json', 'package-lock.json'].includes(path))
      expect(current.tree![path]).toEqual(node)
  expect(current.assets).toEqual(original.assets)
  expect(current.proMeta).toEqual(original.proMeta)
  expect(() =>
    parseBuildRequest({
      executionId: 'builder-1234567890abcdef',
      parentOrigin: 'https://kids.test',
      templateId: 'vanilla-vite',
      files: Object.fromEntries(
        Object.entries(current.tree!).flatMap(([path, node]) =>
          node.kind === 'file' ? [[path, node.content]] : [],
        ),
      ),
    }),
  ).not.toThrow()
  expect(listProSessionApplications(store, original.id)).toHaveLength(1)
  expect(
    await updateProToolchainBeforeExecution(store, undefined, new AbortController().signal),
  ).toBeNull()
  await undoProApplication(store, original.id, receipt!.operationId)
  expect(store.getState().project!.tree).toEqual(original.tree)
})

test('preparation failure, invalid lock, cancellation and a missing host preserve both original files', async () => {
  for (const scenario of ['failure', 'lock', 'cancel', 'missing'] as const) {
    const { store, original } = fixture()
    const controller = new AbortController()
    const preparer =
      scenario === 'missing'
        ? undefined
        : async ({ packageJson }: { packageJson: string }) => {
            expect(store.getState().project).toBe(original)
            if (scenario === 'failure') throw new Error('preparador indisponível')
            if (scenario === 'cancel') controller.abort()
            return scenario === 'lock' ? '{}' : prepareRuntimeDependencyLock(packageJson)
          }
    await expect(
      updateProToolchainBeforeExecution(store, preparer, controller.signal),
    ).rejects.toThrow()
    expect(store.getState().project).toBe(original)
    expect(listProSessionApplications(store, original.id)).toHaveLength(0)
  }
})

test('concurrent source, profile and authorship changes cannot commit a prepared pair', async () => {
  for (const scenario of ['source', 'profile', 'observer'] as const) {
    const { store, original } = fixture()
    const prepareStale = async ({ packageJson }: { packageJson: string }) => {
      if (scenario === 'source')
        store.getState().setProject({ ...original, name: 'Edição simultânea' })
      if (scenario === 'profile') setProjectStorageNamespace('outro-perfil')
      if (scenario === 'observer') store.getState().setEditingAccess('observer')
      return prepareRuntimeDependencyLock(packageJson)
    }
    await expect(
      updateProToolchainBeforeExecution(store, prepareStale, new AbortController().signal),
    ).rejects.toThrow()
    expect(store.getState().project!.tree).toEqual(original.tree)
    expect(listProSessionApplications(store, original.id)).toHaveLength(0)
    setProjectStorageNamespace('')
  }
})

test('only the exact retired spec is repaired; malformed or oversized manifests are refused', () => {
  for (const version of ['8.1.6', '^8.0.16', 'latest', '8.0.15'])
    expect(
      updateLegacyProToolchainManifest(JSON.stringify({ devDependencies: { vite: version } })),
    ).toBeNull()
  for (const source of ['null', '[]', '{', JSON.stringify({ dependencies: [] }), ' '.repeat(16001)])
    expect(() => updateLegacyProToolchainManifest(source)).toThrow()
})
