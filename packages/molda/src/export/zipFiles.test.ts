import { expect, test } from 'bun:test'
import { File as NativeFile } from 'node:buffer'
import { Inflate, zipSync } from 'fflate'
import { readZipFiles } from './backupFile'
import { zipFilesBlob } from './zip'

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

test('escritor compartilhado conserva arquivos exatos, sem acrescentar backup ou guia da galeria', async () => {
  const b = await zipFilesBlob(
      [
        { path: 'cenario.json', bytes: new TextEncoder().encode('{"nome":"Ilha"}') },
        { path: 'modelos/a.glb', bytes: new Uint8Array([1, 3, 5, 7]) },
      ],
      { yieldBetween: null },
    ),
    r = await readZipFiles(new File([b], 'cenario.zip'), { maxBytes: 100, maxEntries: 2 })
  expect(r.ok && r.files.map((f) => f.path)).toEqual(['cenario.json', 'modelos/a.glb'])
  expect(r.ok && [...r.files[1]!.bytes]).toEqual([1, 3, 5, 7])
})

test('escritor compartilhado recusa colisões/caminhos hostis, orçamentos e cancelamento', async () => {
  const f = (path: string) => ({ path, bytes: new Uint8Array([1, 2, 3]) })
  for (const path of ['../fora', '/fora', 'C:/fora', 'a/../fora'])
    await expect(zipFilesBlob([f(path)], { yieldBetween: null })).rejects.toThrow()
  await expect(zipFilesBlob([f('A.glb'), f('a.glb')], { yieldBetween: null })).rejects.toThrow(
    /repetido/,
  )
  await expect(zipFilesBlob([f('a')], { maxReadyBytes: 2, yieldBetween: null })).rejects.toThrow(
    /limite/,
  )
  const c = new AbortController()
  await expect(
    zipFilesBlob([f('a'), f('b')], {
      yieldBetween: null,
      signal: c.signal,
      onProgress: () => c.abort(),
    }),
  ).rejects.toThrow(/cancelada/)
  await expect(zipFilesBlob([f('a')], { maxEntries: NaN })).rejects.toThrow(/limites/)
  await expect(zipFilesBlob([f('a')], { maxReadyBytes: Infinity })).rejects.toThrow(/limites/)
})

test('leitura de várias entradas conserva bytes/ordem sem reler a cauda do arquivo a cada recurso', async () => {
  const original = new Uint8Array(256 * 1024)
  let seed = 0x12345678,
    bytesLidos = 0
  for (let i = 0; i < original.length; i++) {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    original[i] = seed & 255
  }
  const entradas = Object.fromEntries(
      Array.from({ length: 32 }, (_, i) => [
        `partes/${i}.glb`,
        original.subarray(i * 8192, (i + 1) * 8192),
      ]),
    ),
    arquivo = new NativeFile(
      [new Uint8Array(zipSync(entradas)).buffer],
      'partes.zip',
    ) as unknown as File,
    alimentar = Inflate.prototype.push
  // Instrumenta o codec real sem alterar seus resultados. Mede a quantidade de
  // bytes comprimidos efetivamente recebida, não uma expectativa de chamadas.
  Inflate.prototype.push = function (chunk, final) {
    bytesLidos += chunk.byteLength
    return alimentar.call(this, chunk, final)
  }
  let r: Awaited<ReturnType<typeof readZipFiles>>
  try {
    r = await readZipFiles(arquivo, { maxBytes: original.length, maxEntries: 32 })
  } finally {
    Inflate.prototype.push = alimentar
  }
  expect(r.ok).toBe(true)
  if (r.ok) {
    expect(r.files.map((f) => f.path)).toEqual(Object.keys(entradas))
    for (const f of r.files) expect(f.bytes).toEqual(entradas[f.path]!)
  }
  // O descompactador não deve receber diretório/cabeçalhos ou bytes de outras entradas.
  // Bun 1.3.11 stream() de Blob fatiado entrega a cauda inteira, excedendo esse orçamento.
  expect(bytesLidos).toBeLessThan(arquivo.size)
})
