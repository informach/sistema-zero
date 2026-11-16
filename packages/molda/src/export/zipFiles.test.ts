import { expect, test } from 'bun:test'
import { zipSync } from 'fflate'
import { readZipFiles } from './backupFile'

function arquivo(entries: Record<string, Uint8Array>) {
  const bytes = zipSync(entries)
  return new File([new Uint8Array(bytes).buffer], 'modelos.zip')
}
test('ZIP binário conserva modelos e imagens e confere o orçamento antes da extração', async () => {
  const a = arquivo({
    'Aventura/arvore.glb': new Uint8Array([1, 2, 3, 255]),
    'Aventura/textura.png': new Uint8Array([137, 80, 78, 71]),
  })
  const r = await readZipFiles(a, { maxBytes: 8, maxEntries: 2 })
  expect(r.ok).toBe(true)
  if (r.ok) expect([...r.files[0]!.bytes]).toEqual([1, 2, 3, 255])
  expect(await readZipFiles(a, { maxBytes: 7, maxEntries: 2 })).toEqual({
    ok: false,
    reason: 'too-large',
  })
  expect(await readZipFiles(a, { maxBytes: 8, maxEntries: 1 })).toEqual({
    ok: false,
    reason: 'too-large',
  })
})
test('ZIP de pacote recusa traversal, caminho absoluto e duplicata normalizada', async () => {
  for (const path of ['../fora.glb', 'C:/fora.glb', '/fora.glb', 'pasta/../fora.glb'])
    expect(
      (
        await readZipFiles(arquivo({ [path]: new Uint8Array([1]) }), {
          maxBytes: 100,
          maxEntries: 10,
        })
      ).ok,
    ).toBe(false)
  const r = await readZipFiles(
    arquivo({ 'a/b.glb': new Uint8Array([1]), 'a\\b.glb': new Uint8Array([2]) }),
    { maxBytes: 100, maxEntries: 10 },
  )
  expect(r).toEqual({ ok: false, reason: 'duplicate-backup' })
})
test('entradas de diretório do Windows não viram arquivos vazios da biblioteca', async () => {
  const r = await readZipFiles(
    arquivo({ 'pasta\\': new Uint8Array(), 'pasta\\a.glb': new Uint8Array([1]) }),
    { maxBytes: 10, maxEntries: 2 },
  )
  expect(r.ok && r.files.map((f) => f.path)).toEqual(['pasta/a.glb'])
})
