import { afterEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  importSourceIsText,
  inventoryDigestInput,
  inventorySchema,
  inventorySummary,
  relativeSourcePathSchema,
} from '@sistemazero/marketing-contracts'
import { confinedSource, scanInventory, sourceTextBytes, verifySource } from '../src/inventory-node'
import { classifySource } from '../src/inventory-policy'

const owned: string[] = []
afterEach(async () => {
  for (const dir of owned.splice(0)) await rm(dir, { recursive: true, force: true })
})
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'marketing-inventory-'))
  owned.push(root)
  await mkdir(path.join(root, 'docs/marketing'), { recursive: true })
  await mkdir(path.join(root, 'output'), { recursive: true })
  const put = async (name: string, text: string | Buffer) => {
    const target = path.join(root, name)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, text)
  }
  return {
    root,
    put,
    scan: () =>
      scanInventory({ root, origin: 'sistema-zero', signal: new AbortController().signal }),
  }
}
describe('inventory and provenance', () => {
  test('licenças sem extensão preservam bytes e limite textual sem incorporar código', async () => {
    const f = await fixture()
    const filename = 'docs/marketing/kids/comunidade-dos-criadores/instagram/LICENSE-Nunito'
    const content = 'Licença da fonte original.\r\nCopyright preservado.\r\n'
    await f.put(filename, content)
    const entry = (await f.scan()).entries.find((value) => value.path === filename)
    if (!entry) throw new Error('Licença não inventariada')
    expect(importSourceIsText(entry)).toBe(true)
    expect(await sourceTextBytes(f.root, entry, new AbortController().signal)).toEqual(
      Buffer.from(content),
    )
    expect(importSourceIsText({ ...entry, bytes: 196609 })).toBe(false)
    expect(importSourceIsText({ ...entry, category: 'production-source' })).toBe(false)
    expect(importSourceIsText({ ...entry, path: `${filename}.exe` })).toBe(false)
  })
  test('freezes all eligible versions, reports duplicates without merging and excludes subtrees', async () => {
    const f = await fixture()
    await f.put(
      'docs/marketing/kids/comunidade-dos-criadores/instagram/postagens/P01.md',
      'copy da versão A',
    )
    await f.put(
      'docs/marketing/kids/comunidade-dos-criadores/instagram/historico/P01.md',
      'copy da versão A',
    )
    await f.put('output/instagram/node_modules/private/package.json', '{}')
    await f.put('docs/marketing/propostas/engine.md', 'engineering')
    await f.put('output/.env.local', 'not read')
    const a = await f.scan(),
      b = await f.scan()
    expect(a.digest).toBe(b.digest)
    expect(a.entries).toHaveLength(5)
    expect(inventorySummary(a)).toMatchObject({ eligible: 2, excluded: 3, duplicates: 1 })
    expect(a.entries.find((e) => e.path.includes('historico'))).toMatchObject({
      validity: 'historical',
      product: 'comunidade-dos-criadores',
    })
    expect(JSON.stringify(a)).not.toContain(f.root)
    expect(JSON.stringify(a)).not.toContain('private/package.json')
    expect(a.digest).toBe(
      createHash('sha256')
        .update(
          inventoryDigestInput({
            origin: a.origin,
            entries: a.entries,
            policyVersion: a.policyVersion,
          }),
        )
        .digest('hex'),
    )
    expect(inventorySchema.safeParse({ ...a, entries: [...a.entries, ...a.entries] }).success).toBe(
      false,
    )
  })
  test('content change is detected and original remains untouched', async () => {
    const f = await fixture(),
      name = 'docs/marketing/copy.md'
    await f.put(name, 'original')
    const a = await f.scan(),
      entry = a.entries[0]
    if (!entry) throw new Error('missing fixture')
    expect(await verifySource(f.root, entry, new AbortController().signal)).toBe(
      path.join(f.root, name),
    )
    expect(
      (await sourceTextBytes(f.root, entry, new AbortController().signal)).toString('utf8'),
    ).toBe('original')
    await f.put(name, 'revision')
    await expect(verifySource(f.root, entry, new AbortController().signal)).rejects.toThrow('mudou')
    expect((await f.scan()).digest).not.toBe(a.digest)
    expect(await readFile(path.join(f.root, name), 'utf8')).toBe('revision')
  })
  test('does not inspect excluded credentials and detects a credential across read chunks', async () => {
    const f = await fixture()
    await f.put('docs/marketing/credentials.json', '{ secret }')
    await f.put('output/report.md', `${'a'.repeat(256 * 1024 - 10)}\napi_key: "${'X'.repeat(40)}"`)
    const result = await f.scan()
    expect(result.entries.every((e) => e.disposition === 'excluded' && e.sha256 === null)).toBe(
      true,
    )
    expect(JSON.stringify(result)).not.toContain('X'.repeat(40))
  })
  test('junctions are never followed, including an ancestor of an allowed scope', async () => {
    const f = await fixture(),
      other = await fixture()
    await other.put('output/copy.md', 'outside')
    await symlink(
      path.join(other.root, 'output'),
      path.join(f.root, 'output/link'),
      process.platform === 'win32' ? 'junction' : 'dir',
    )
    const result = await f.scan()
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.disposition).toBe('excluded')
    await expect(confinedSource(f.root, 'output/link/copy.md')).rejects.toThrow('simbólico')
  })
  test('rejects traversal, aborts and partial budget inventories', async () => {
    for (const value of ['../a', 'x/../a', 'C:/file', '/abs', 'x\\a', 'a//b', 'a/./b'])
      expect(relativeSourcePathSchema.safeParse(value).success).toBe(false)
    const f = await fixture()
    await f.put('output/copy.md', 'content')
    await expect(
      scanInventory({ root: f.root, origin: 'sistema-zero', signal: AbortSignal.abort() }),
    ).rejects.toThrow()
    await expect(
      scanInventory({
        root: f.root,
        origin: 'sistema-zero',
        signal: new AbortController().signal,
        limits: { entries: 100, fileBytes: 100, totalBytes: 1 },
      }),
    ).rejects.toThrow('orçamento')
  })
  test('old products and price claims do not become current directions; scripts are never executed', () => {
    expect(
      classifySource(
        'sistema-zero',
        'docs/marketing/kids/cade-todo-mundo/direcao-copy-e-provas.md',
        false,
      ).product,
    ).toBe('cade-todo-mundo')
    expect(
      classifySource('fluxo-criativo', 'meus-produtos/produto-novo/perfil.md', false).product,
    ).toBe('produto-novo')
    expect(
      classifySource(
        'sistema-zero',
        'docs/marketing/kids/comunidade-dos-criadores/instagram/postagens/00-direcao.md',
        false,
      ).category,
    ).toBe('direction')
    expect(
      classifySource('sistema-zero', 'output/instagram/p57/vite-cache', true).disposition,
    ).toBe('excluded')
    expect(
      classifySource(
        'sistema-zero',
        'docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p01/apoio/01.png',
        false,
      ).category,
    ).toBe('support-media')
    expect(
      classifySource(
        'sistema-zero',
        'docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p01/01-p01.png',
        false,
      ).category,
    ).toBe('final-media')
    expect(
      classifySource('fluxo-criativo', 'meus-produtos/programando-com-diversao/preco.md', false),
    ).toMatchObject({
      product: 'programando-com-diversao',
      validity: 'historical',
      disposition: 'review',
    })
    expect(
      classifySource(
        'fluxo-criativo',
        'meus-produtos/comunidade-dos-criadores/projeto/aulas/01.md',
        false,
      ),
    ).toMatchObject({ category: 'pedagogy', validity: 'reference' })
    expect(classifySource('sistema-zero', 'output/instagram/p07/prepare.mjs', false)).toMatchObject(
      { category: 'production-source', validity: 'reference' },
    )
  })
})
