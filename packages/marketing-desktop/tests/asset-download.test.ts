import { expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { AssetManifest } from '@sistemazero/marketing-contracts'
import { LocalAssets } from '../src/main/assets'
import { downloadAsset } from '../src/main/sync/asset-download'

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'marketing-download-'))
  if (
    path.dirname(root) !== path.resolve(os.tmpdir()) ||
    !path.basename(root).startsWith('marketing-download-')
  )
    throw new Error('Pasta inesperada')
  const assets = new LocalAssets(root)
  await assets.start()
  const bytes = Buffer.from('original imutável da equipe'),
    id = randomUUID(),
    projectId = randomUUID()
  const manifest: AssetManifest = {
    schemaVersion: 1,
    id,
    projectId,
    name: 'referência.txt',
    size: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    mime: 'text/plain',
    role: 'original',
    sourceAssetId: null,
    width: null,
    height: null,
    durationMs: null,
    codec: null,
    rotation: null,
  }
  const transport = {
    request: async () => ({
      manifest,
      url: `https://${'a'.repeat(32)}.r2.cloudflarestorage.com/file`,
    }),
  }
  return {
    root,
    assets,
    bytes,
    id,
    projectId,
    manifest,
    transport,
    partial: path.join(root, `${id}.download.partial`),
    signal: new AbortController().signal,
    close: async () => {
      assets.close()
      await rm(root, { recursive: true, force: true })
    },
  }
}
test('download retoma resposta curta, reinicia quando Range não é atendido e recupera cache ausente', async () => {
  const f = await fixture()
  try {
    await expect(
      downloadAsset(
        f.projectId,
        f.id,
        f.assets,
        f.transport,
        f.signal,
        async () => new Response(f.bytes.subarray(0, 5)),
      ),
    ).rejects.toThrow('partes recebidas')
    expect((await readFile(f.partial)).length).toBe(5)
    const result = await downloadAsset(
      f.projectId,
      f.id,
      f.assets,
      f.transport,
      f.signal,
      async (_url, offset) => {
        expect(offset).toBe(5)
        return new Response(f.bytes)
      },
    )
    expect(result.sha256).toBe(f.manifest.sha256)
    await unlink(f.assets.get(f.id).path)
    const recovered = await downloadAsset(
      f.projectId,
      f.id,
      f.assets,
      f.transport,
      f.signal,
      async (_url, offset) => {
        expect(offset).toBe(0)
        return new Response(f.bytes)
      },
    )
    expect(recovered.id).toBe(f.id)
    expect(await f.assets.bytes(f.id)).toEqual(f.bytes)
  } finally {
    await f.close()
  }
})
test('hash divergente descarta parcial; cache danificado e destino órfão são substituídos por original confirmado', async () => {
  const f = await fixture()
  try {
    await expect(
      downloadAsset(
        f.projectId,
        f.id,
        f.assets,
        f.transport,
        f.signal,
        async () => new Response(Buffer.alloc(f.bytes.length, 42)),
      ),
    ).rejects.toThrow('corrompido')
    expect(await Bun.file(f.partial).exists()).toBe(false)
    await writeFile(path.join(f.root, `${f.id}.source.txt`), 'arquivo órfão incompleto')
    await downloadAsset(
      f.projectId,
      f.id,
      f.assets,
      f.transport,
      f.signal,
      async () => new Response(f.bytes),
    )
    await writeFile(f.assets.get(f.id).path, 'arquivo danificado')
    await downloadAsset(
      f.projectId,
      f.id,
      f.assets,
      f.transport,
      f.signal,
      async () => new Response(f.bytes),
    )
    expect(await f.assets.bytes(f.id)).toEqual(f.bytes)
  } finally {
    await f.close()
  }
})
