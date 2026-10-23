import { expect, test } from 'bun:test'
import { createStudioCloudTransport } from '../src/lib/studio-cloud-transport'

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
