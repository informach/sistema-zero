import { afterEach, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { InventoryStore } from '../src/main/imports/inventory-store'

const owned: string[] = []
afterEach(async () => {
  for (const directory of owned.splice(0)) await rm(directory, { recursive: true, force: true })
})
test('inventory survives process/store restart with opaque identity and isolated project directories', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'marketing-import-store-'))
  owned.push(directory)
  const source = path.join(directory, 'source'),
    local = path.join(directory, 'account-a/project-a/imports')
  await mkdir(path.join(source, 'meus-produtos'), { recursive: true })
  await writeFile(path.join(source, 'meus-produtos', 'direcao.md'), 'Referência anterior')
  const original = await new InventoryStore(local).prepare(
    source,
    'fluxo-criativo',
    new AbortController().signal,
    () => {},
  )
  const restarted = new InventoryStore(local)
  expect((await restarted.list()).items).toEqual([original])
  expect((await restarted.page(original.id)).entries).toHaveLength(1)
  expect(JSON.stringify(await restarted.page(original.id))).not.toContain(source)
  expect(
    (await new InventoryStore(path.join(directory, 'account-b/project-a/imports')).list()).items,
  ).toEqual([])
  const file = path.join(local, `${original.id}.json`)
  // Corrupt a digest without relying on source byte length or encoding.
  await writeFile(file, (await readFile(file, 'utf8')).replace(original.digest, 'a'.repeat(64)))
  await expect(restarted.page(original.id)).rejects.toThrow('divergente')
})

test('reconferir a pasta cria um novo retrato sem alterar o inventário anterior nem expor o caminho local', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'marketing-import-rescan-'))
  owned.push(directory)
  const root = path.join(directory, 'source'),
    local = path.join(directory, 'local'),
    folder = path.join(root, 'meus-produtos', 'produto')
  await mkdir(folder, { recursive: true })
  await writeFile(path.join(folder, 'copy.md'), 'Texto original')
  const store = new InventoryStore(local),
    signal = new AbortController().signal
  const previous = await store.prepare(root, 'fluxo-criativo', signal, () => {})
  const before = await readFile(path.join(local, `${previous.id}.json`), 'utf8')
  await writeFile(path.join(folder, 'copy.md'), 'Texto alterado')
  await writeFile(path.join(folder, 'nova.md'), 'Referência nova')
  const next = await new InventoryStore(local).rescan(previous.id, signal, () => {})
  expect(next.id).not.toBe(previous.id)
  expect(next.digest).not.toBe(previous.digest)
  expect(next.entryCount).toBe(2)
  expect(next.origin).toBe(previous.origin)
  expect(JSON.stringify(next)).not.toContain(root)
  expect(await readFile(path.join(local, `${previous.id}.json`), 'utf8')).toBe(before)
  const abort = new AbortController()
  abort.abort(new Error('Conferência cancelada'))
  await expect(store.rescan(previous.id, abort.signal, () => {})).rejects.toThrow('cancelada')
  expect((await store.list()).items).toHaveLength(2)
})

test('produção local confere hashes e origem sem servidor e recusa delta depois do inventário', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'marketing-production-store-'))
  owned.push(directory)
  const source = path.join(directory, 'source'),
    local = path.join(directory, 'account/project/imports')
  const base = 'docs/marketing/kids/produto/instagram',
    folder = `${base}/producao/postagens/p01-titulo`,
    canonical = `${base}/postagens/copy.md`
  await mkdir(path.join(source, folder, 'apoio'), { recursive: true })
  await mkdir(path.join(source, base, 'postagens'), { recursive: true })
  await mkdir(path.join(source, 'output'), { recursive: true })
  const contents = new Map([
    [
      canonical,
      '## P01 · Título\n**Formato:** Imagem única.\n### Arte\n> Público.\n### Legenda\n> Legenda.',
    ],
    [
      `${folder}/apoio/copy.json`,
      JSON.stringify({ id: 'P01', art: ['Público.'], caption: 'Legenda.', source: canonical }),
    ],
    [`${folder}/legenda.txt`, 'Legenda.'],
    [
      `${folder}/texto-alternativo.txt`,
      'IMAGEM ÚNICA\nCurto: Texto público.\nLongo: Imagem com texto público.',
    ],
    [
      `${folder}/01-p01.png`,
      'bytes-preservados; a conferência de vínculo não substitui decodificação visual',
    ],
  ])
  for (const [relative, text] of contents) await writeFile(path.join(source, relative), text)
  const store = new InventoryStore(local),
    signal = new AbortController().signal
  const prepared = await store.prepare(source, 'sistema-zero', signal, () => {})
  expect(await store.productionFolders(prepared.id)).toEqual([
    { path: folder, key: 'P01', product: 'produto' },
  ])
  const result = await new InventoryStore(local).reviewProduction(prepared.id, folder, signal)
  expect(result.inventoryDigest).toBe(prepared.digest)
  expect(result.review.state).toBe('ready-for-review')
  expect(result.review.files).toHaveLength(1)
  expect(JSON.stringify(result)).not.toContain(source)
  await expect(store.reviewProduction(prepared.id, '../outside', signal)).rejects.toThrow()
  const aborted = new AbortController()
  aborted.abort(new Error('cancelado'))
  await expect(store.reviewProduction(prepared.id, folder, aborted.signal)).rejects.toThrow(
    'cancelado',
  )
  await writeFile(path.join(source, folder, '01-p01.png'), 'delta posterior')
  await expect(store.reviewProduction(prepared.id, folder, signal)).rejects.toThrow('mudou')
})
