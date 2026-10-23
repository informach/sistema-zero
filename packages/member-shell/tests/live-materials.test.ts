import { describe, expect, test } from 'bun:test'
import {
  createLiveMaterialUploadHandler,
  type LiveMaterialUpload,
} from '../src/routes/live-materials'

function request(content = '%PDF-1.7\ntest', type = 'application/pdf') {
  const form = new FormData()
  form.set('file', new File([content], '../../guia.pdf', { type }))
  form.set('title', 'Guia da oficina')
  form.set('storageKey', 'private/secret')
  return new Request('http://localhost/api/media/live-materials', { method: 'POST', body: form })
}
describe('live material upload BFF', () => {
  test('requires the admin session and stores only a generated private object with verified bytes', async () => {
    const uploaded: string[] = []
    const registered: LiveMaterialUpload[] = []
    const handler = createLiveMaterialUploadHandler({
      session: async () => ({ id: 'admin' }),
      put: async (input) => {
        uploaded.push(input.key)
      },
      remove: async () => {},
      register: async (input) => {
        registered.push(input)
        return { status: 200, body: input }
      },
    })
    expect((await handler(request())).status).toBe(201)
    expect(uploaded[0]).toMatch(/^live\/materials\/[\da-f-]+\/guia.pdf$/)
    expect(registered[0]?.sha256).toHaveLength(64)
    expect(registered[0]?.uploadedBy).toBe('admin')
    expect((await handler(request('not a pdf'))).status).toBe(400)
    expect(uploaded).toHaveLength(1)
    const denied = createLiveMaterialUploadHandler({
      session: async () => new Response(null, { status: 403 }),
      put: async () => {
        throw new Error('must not run')
      },
      remove: async () => {},
      register: async () => {
        throw new Error('must not run')
      },
    })
    expect((await denied(request())).status).toBe(403)
  })
  test('failed registration removes the newly stored file', async () => {
    const removed: string[] = []
    const handler = createLiveMaterialUploadHandler({
      session: async () => ({ id: 'admin' }),
      put: async () => {},
      remove: async (key) => {
        removed.push(key)
      },
      register: async () => ({ status: 403, body: {} }),
    })
    expect((await handler(request())).status).toBe(503)
    expect(removed).toHaveLength(1)
  })
})
