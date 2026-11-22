import { expect, test } from 'bun:test'
import {
  STUDIO_SEALED_STORAGE_PROTOCOL,
  STUDIO_SEALED_STORAGE_READER,
} from '@sistemazero/core/creations/studio-sealed-storage'
import { canonicalJson, sha256Hex } from '../src/lib/creations-cloud'
import { buildStudioCloudSnapshot, resolveStudioCloudDocument } from '../src/lib/studio-cloud'
import { createStudioCloudTransport } from '../src/lib/studio-cloud-transport'

test('material regional privado não gera manifesto multipart para o espelho', async () => {
  await expect(
    buildStudioCloudSnapshot({
      id: 'project',
      name: 'Mapa',
      updatedAt: 0,
      assets: [{ regional: {} }],
    }),
  ).rejects.toThrow('O original foi preservado')
})

for (const formatVersion of [2, 3]) {
  test(`o cliente atual exclui revisão conhecida de formato ${formatVersion}`, async () => {
    let sent: unknown
    const cloud = createStudioCloudTransport({
      viewerId: 'test-viewer',
      fetch: async (_url, init) => {
        expect(init?.method).toBe('DELETE')
        expect(new Headers(init?.headers).get('x-sz-viewer')).toBe('test-viewer')
        const body = JSON.parse(String(init?.body))
        sent = body
        return body.maxFormatVersion >= formatVersion
          ? Response.json({ deleted: true, revision: 8 })
          : Response.json({ error: { code: 'CREATION_CLIENT_OUTDATED' } }, { status: 409 })
      },
    })
    try {
      await expect(cloud.remove('test-project', 7)).resolves.toEqual({ revision: 8 })
      expect(sent).toEqual({ baseRevision: 7, maxFormatVersion: 3 })
    } finally {
      cloud.dispose()
    }
  })
}

test('o cliente não anuncia suporte a um formato futuro desconhecido', async () => {
  const cloud = createStudioCloudTransport({
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body))
      expect(body.maxFormatVersion).toBeLessThan(4)
      return Response.json({ error: { code: 'CREATION_CLIENT_OUTDATED' } }, { status: 409 })
    },
  })
  try {
    await expect(cloud.remove('future-project', 7)).rejects.toMatchObject({
      code: 'CREATION_CLIENT_OUTDATED',
    })
  } finally {
    cloud.dispose()
  }
})

async function simulateSealedRead(
  variant: 'accepted' | 'future' | 'manifest-changed' | 'different-part',
) {
  const itemId = 'sealed-project'
  const asset = { id: 'asset-1', name: 'Nave', dataUrl: 'data:image/png;base64,original' }
  const part = canonicalJson(asset)
  const hash = await sha256Hex(part)
  const requirements = { envelopeVersion: 2, projectFormat: 2, materials: 'legacy' }
  const program = {
    id: itemId,
    kind: 'classic',
    formatVersion: 2,
    files: { js: 'andar()' },
    assets: [],
  }
  const text = JSON.stringify({
    format: 'sz-studio-parts',
    version: 2,
    requirements,
    program,
    assets: [hash],
  })
  const manifestUrl = 'https://storage.test/project'
  const partUrl = 'https://storage.test/asset'
  const requests: string[] = []
  const cloud = createStudioCloudTransport({
    viewerId: 'qa-owner',
    fetch: async (input, init) => {
      const url = String(input)
      requests.push(url)
      if (url === manifestUrl)
        return new Response(Bun.gzipSync(variant === 'manifest-changed' ? `${text} ` : text))
      if (url === partUrl)
        return new Response(Bun.gzipSync(variant === 'different-part' ? `${part} ` : part))
      expect(url).toBe(
        `/api/creations/studio/${itemId}/download?studioReader=${STUDIO_SEALED_STORAGE_READER}`,
      )
      expect(new Headers(init?.headers).get('x-sz-viewer')).toBe('qa-owner')
      return Response.json({
        downloadUrl: manifestUrl,
        revision: 4,
        bytes: 55,
        item: {
          tool: 'studio',
          itemId,
          formatVersion: 2,
          name: 'Nave',
          kind: 'classic',
          revision: 4,
          bytes: 55,
          thumb: null,
          syncedAt: '2026-11-22T00:00:00.000Z',
          itemUpdatedAt: '2026-11-22T00:00:00.000Z',
        },
        parts: [{ hash, bytes: 20, url: partUrl }],
        studioSealReceipt: {
          protocol: STUDIO_SEALED_STORAGE_PROTOCOL,
          requirements:
            variant === 'future' ? { ...requirements, envelopeVersion: 3 } : requirements,
          nonce: '70000000-0000-4000-8000-000000000001',
          gzipSha256: 'e'.repeat(64),
          jsonSha256: await sha256Hex(text),
          manifestBytes: 35,
        },
      })
    },
  })
  try {
    const read = async () => {
      const download = await cloud.download(itemId)
      if (!download) throw new Error('fixture ausente')
      return resolveStudioCloudDocument(download, [])
    }
    if (variant === 'future') {
      await expect(read()).rejects.toMatchObject({ code: 'STUDIO_STORAGE_PROTOCOL_REQUIRED' })
      expect(requests).toHaveLength(1)
    } else if (variant === 'manifest-changed') {
      await expect(read()).rejects.toThrow('O projeto foi preservado')
      expect(requests).toHaveLength(2)
    } else if (variant === 'different-part') {
      await expect(read()).rejects.toMatchObject({ code: 'CREATION_PART_CORRUPT' })
      expect(requests).toHaveLength(3)
    } else {
      await expect(read()).resolves.toEqual({ ...program, assets: [asset] })
      expect(requests.slice(1)).toEqual([manifestUrl, partUrl])
    }
  } finally {
    cloud.dispose()
  }
}

test('a descida selada reconstrói no mesmo port o programa e os materiais na ordem verificada', async () => {
  await simulateSealedRead('accepted')
})

test('uma descida futura ou divergente não apresenta o projeto nem busca partes sem prova', async () => {
  await simulateSealedRead('future')
  await simulateSealedRead('manifest-changed')
  await simulateSealedRead('different-part')
})
