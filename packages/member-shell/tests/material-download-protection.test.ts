import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))
const { createShellRoutes } = await import('../src/routes')

const user = {
  id: 'comprador-1',
  email: 'comprador@example.com',
  firstName: 'Comprador',
  lastName: 'Teste',
  role: 'customer',
  status: 'active',
}

function routes(
  storageRef: string,
  fileType: string | null,
  record?: () => Promise<{ status: number; body: unknown }>,
) {
  return createShellRoutes({
    media: { requireUploadSession: async () => user },
    members: {
      resolveAttachment: async () => ({
        status: 200,
        body: { label: 'Arquivo', storageRef, fileType },
      }),
      recordMaterialDownload: record ?? (async () => ({ status: 200, body: { required: true } })),
      resolveEbook: async () => ({ status: 200, body: { storageRef } }),
    },
  } as never)
}

const request = new Request('https://community.test/api/members/courses/c/aulas/a/anexos/x')
const attachmentParams = {
  params: Promise.resolve({ slug: 'curso', lessonId: 'aula', attachmentId: 'anexo' }),
}
const ebookParams = {
  params: Promise.resolve({ slug: 'curso', lessonId: 'aula', blockId: 'livro' }),
}

describe('download protegido de materiais', () => {
  test('evidência só é registrada depois de preparar a entrega; falha no registro bloqueia o arquivo', async () => {
    const ids = {
      blockId: '11111111-1111-4111-8111-111111111111',
      itemId: '22222222-2222-4222-8222-222222222222',
      viewerId: user.id,
      blockRevision: 'b'.repeat(32),
    }
    const tracked = new Request(`${request.url}?${new URLSearchParams(ids)}`)
    let recorded = 0
    const record = async () => {
      recorded++
      return { status: 200, body: { required: true } }
    }
    const pdf = await routes(
      'https://files.example/caderno.pdf',
      'application/pdf',
      record,
    ).attachmentDownload.GET(tracked, attachmentParams)
    expect(pdf.status).toBe(503)
    expect(recorded).toBe(0)
    const zip = await routes(
      'https://files.example/projeto.zip',
      'application/zip',
      record,
    ).attachmentDownload.GET(tracked, attachmentParams)
    expect(zip.status).toBe(302)
    expect(recorded).toBe(1)
    const refused = await routes(
      'https://files.example/projeto.zip',
      'application/zip',
      async () => ({
        status: 503,
        body: { error: { code: 'UNAVAILABLE', message: 'Tente de novo' } },
      }),
    ).attachmentDownload.GET(tracked, attachmentParams)
    expect(refused.status).toBe(503)
    expect(refused.headers.get('location')).toBeNull()
  })
  test('PDF externo não contorna a marca d’água pelo redirect do anexo', async () => {
    const res = await routes(
      'https://files.example/caderno.pdf?token=abc',
      null,
    ).attachmentDownload.GET(request, attachmentParams)
    expect(res.status).toBe(503)
    expect(res.headers.get('location')).toBeNull()
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'WATERMARK_UNAVAILABLE' } })
  })

  test('arquivo externo sem marcação, como ZIP, continua baixável', async () => {
    const res = await routes(
      'https://files.example/projeto.zip',
      'application/zip',
    ).attachmentDownload.GET(request, attachmentParams)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://files.example/projeto.zip')
  })

  test('livro 3D externo é bloqueado porque não recebe a marca do comprador', async () => {
    const res = await routes(
      'https://files.example/livro.pdf',
      'application/pdf',
    ).ebookDownload.GET(request, ebookParams)
    expect(res.status).toBe(503)
    expect(res.headers.get('location')).toBeNull()
  })
})
