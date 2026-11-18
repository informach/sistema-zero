/**
 * Reproduz a issue 026, sem nuvem, navegador ou artefatos .tmp preexistentes.
 *
 * Execute na árvore com dependências instaladas:
 *   bun docs/pinta-cenarios/revisao-2026-11-18/qa/repro-local-only-026.ts
 *
 * O teste APROVADO confirma a perda descrita na issue; não confirma uma correção.
 * Obtém a persistência e seu grafo relativo reais de 567b93f95 por `git show`.
 * Só grava em um diretório novo dentro de .tmp; não apaga nem migra nenhum banco.
 * O único IndexedDB usado é o mock funcional do repositório, em processo filho.
 */
import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'

const root = resolve(import.meta.dir, '../../../..')
const baseline = '567b93f95'
const temporaryRoot = join(root, '.tmp')
await mkdir(temporaryRoot, { recursive: true })
const temporary = await mkdtemp(join(temporaryRoot, 'pinta-local-only-026-'))
const extracted = join(temporary, 'baseline')
const copied = new Set<string>()

function gitShow(path: string): string | null {
  const result = Bun.spawnSync(['git', 'show', `${baseline}:${path}`], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return result.exitCode === 0 ? result.stdout.toString() : null
}

function relativeModule(parent: string, specifier: string): string {
  const path = relative(root, resolve(root, dirname(parent), specifier))
    .split(sep)
    .join('/')
  if (!path.startsWith('packages/pinta/src/'))
    throw new Error(`Dependência relativa saiu do pacote Pinta: ${path}`)
  const candidates = extname(path)
    ? [path]
    : [`${path}.ts`, `${path}.tsx`, `${path}.json`, `${path}/index.ts`, `${path}/index.tsx`]
  const found = candidates.find((candidate) => gitShow(candidate) !== null)
  if (!found) throw new Error(`Módulo não encontrado no baseline: ${path}`)
  return found
}

async function copyModule(path: string): Promise<void> {
  if (copied.has(path)) return
  copied.add(path)
  const source = gitShow(path)
  if (source === null) throw new Error(`git show falhou: ${baseline}:${path}`)
  const destination = resolve(extracted, path)
  if (!destination.startsWith(extracted + sep)) throw new Error('Destino fora de .tmp')
  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, source)
  // Imports/exports relativos, inclusive imports dinâmicos literais. Pacotes externos
  // usam as dependências instaladas; project/projectConfig do leitor antigo são reais.
  const imports = source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"](\.[^'"]+)['"]/g)
  for (const match of imports) await copyModule(relativeModule(path, match[1]!))
}

await copyModule('packages/pinta/src/state/persistence.ts')
await copyModule('packages/pinta/src/core/project.ts')
await symlink(
  join(root, 'packages/pinta/node_modules'),
  join(extracted, 'packages/pinta/node_modules'),
  process.platform === 'win32' ? 'junction' : 'dir',
)

const probe = join(temporary, 'local-only-026.test.ts')
await writeFile(
  probe,
  `import { expect, it } from 'bun:test'
import { clearIdbMock, idbMockDb } from '../../packages/pinta/src/testing/idbMock'
Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: undefined })
const old = await import('./baseline/packages/pinta/src/state/persistence')
const oldProject = await import('./baseline/packages/pinta/src/core/project')
const current = await import('../../packages/pinta/src/state/persistence')
const currentProject = await import('../../packages/pinta/src/core/project')

it('issue026: RAM4 antiga substitui o documento5 local sem recuperação', async () => {
  clearIdbMock()
  expect(oldProject.PINTA_MAX_SCHEMA).toBe(4)
  const namespace = 'issue026-local-only'
  const oldTab = old.createPintaPersistence({ namespace })
  const newTab = current.createPintaPersistence({ namespace })
  const base = oldProject.createTilemapAsset({ name: 'antes', tilesetId: 'folha', cols: 2, rows: 1 })
  base.id = 'same-authorial-map'
  base.layers.push({ id: 'objects', kind: 'objects', name: 'Lugares', visible: true, objects: [{
    id: 'danger', name: 'Lago', type: '', shape: 'ellipse', x: 0, y: 0,
    width: 16, height: 16, properties: {},
  }] })
  await oldTab.persistAsset(base)
  const oldRam = await oldTab.loadAssetById(base.id)
  expect(oldRam?.kind).toBe('tilemap')
  if (oldRam?.kind !== 'tilemap') throw new Error('Fixture inválida no leitor antigo')
  expect(oldRam.schema).toBe(4)
  const rich = currentProject.withPintaSchemaStamp({ ...structuredClone(oldRam),
    name: 'rico-promovido', updatedAt: base.updatedAt + 1,
    layers: oldRam.layers.map((layer, i) => i === 0 ? { ...layer, offsetX: 2.5 } : layer),
  })
  expect(rich.schema).toBe(5)
  await newTab.persistAsset(rich)
  expect((await newTab.loadAssetById(base.id))?.schema).toBe(5)
  expect(await oldTab.loadAssetById(base.id)).toBeNull()

  // A aba antiga não lê o 5: ela já abriu 4 ANTES da promoção.
  const delayed = { ...oldRam, name: 'edicao-aba-antiga', updatedAt: base.updatedAt + 2 }
  if ('cells' in delayed.layers[0]!) delayed.layers[0]!.cells![0] = 2
  await oldTab.persistAsset(delayed)

  const freshModule = await import('../../packages/pinta/src/state/persistence.ts?issue026-reopen')
  const reopened = freshModule.createPintaPersistence({ namespace })
  const loaded = await reopened.loadAssetById(base.id)
  const listed = await reopened.listAllAssets()
  const database = idbMockDb('sistema-zero-pinta-' + namespace)
  const physicalKeys = [...database.keys()]
  expect(loaded?.schema).toBe(4)
  expect(loaded?.name).toBe('edicao-aba-antiga')
  expect(loaded?.kind === 'tilemap' ? loaded.layers[0]?.offsetX : null).toBeUndefined()
  expect(listed).toHaveLength(1)
  expect(physicalKeys).toEqual(['pinta:asset:' + base.id])
  expect([...database.values()].some((value) => value?.schema === 5)).toBe(false)
  console.log(JSON.stringify({ baseline: '${baseline}', oldReaderMax: 4,
    promoted: { schema: rich.schema, offsetX: rich.layers[0]?.offsetX },
    oldColdReadOf5: null, oldDelayedWriteSucceeded: true,
    reopened: { schema: loaded?.schema, name: loaded?.name,
      offsetX: loaded?.kind === 'tilemap' ? loaded.layers[0]?.offsetX ?? null : null },
    physicalKeys, hasSchema5Checkpoint: false, cloudImported: false,
  }))
})
`,
)
console.log(
  `Baseline ${baseline}: ${copied.size} módulos reais; saída em ${relative(root, temporary)}`,
)
const result = Bun.spawnSync([process.execPath, 'test', probe], {
  cwd: root,
  stdout: 'inherit',
  stderr: 'inherit',
})
process.exit(result.exitCode)
