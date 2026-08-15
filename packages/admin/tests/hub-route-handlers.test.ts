import { beforeEach, describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

let pendingResult: { status: number; body: unknown }
let reportsResult: { status: number; body: unknown }
let attachmentResult: { status: number; body: unknown }
let pendingArgs: unknown
let reportArgs: unknown
let resolvedAttachmentId: string | null
let presignArgs: unknown

mock.module('@/server/hub', () => ({
  listPending: async (args: unknown) => {
    pendingArgs = args
    return pendingResult
  },
  listReports: async (args: unknown) => {
    reportArgs = args
    return reportsResult
  },
  resolveAttachment: async (id: string) => {
    resolvedAttachmentId = id
    return attachmentResult
  },
}))

mock.module('@/server/hub-moderation', () => ({
  hydratePendingItems: async (items: Array<{ id: string }>) =>
    items.map((item) => ({ ...item, hydrated: 'pending' })),
  hydrateReportItems: async (items: Array<{ id: string }>) =>
    items.map((item) => ({ ...item, hydrated: 'report' })),
}))

mock.module('@/server/forward', () => ({
  forwardUpstream: ({ status, body }: { status: number; body: unknown }) =>
    Response.json(body, { status }),
}))

// Superfície completa — mesma armadilha descrita no mock de `@/server/media` abaixo.
mock.module('@/server/r2', () => ({
  r2PresignGetUgc: async (key: string, options: unknown) => {
    presignArgs = { key, options }
    return 'https://ugc.example.test/private-object'
  },
  r2ReadPrivateObject: async () => new Uint8Array(),
}))

// ⚠️ `mock.module` do bun é GLOBAL AO RUN: este mock parcial vaza para os arquivos SEGUINTES, e
// quem importar um símbolo que ele não exporta quebra com `SyntaxError: Export named 'X' not
// found` — um erro entre testes, longe daqui, que não parece vir deste arquivo. Por isso o mock
// cobre a SUPERFÍCIE que as outras suítes importam de `@/server/media`, não só o que este usa.
// (Foi assim que as 3 suítes do Zappy quebraram quando este arquivo nasceu.)
mock.module('@/server/media', () => ({
  mediaErrorResponse: () => Response.json({ error: 'media' }, { status: 500 }),
  syncVimeoTranscript: async () => null,
}))

const { GET: getPending } = await import('../src/app/api/hub/admin/pending/route')
const { GET: getReports } = await import('../src/app/api/hub/admin/reports/route')
const { GET: getAttachment } = await import('../src/app/api/hub/attachments/[id]/route')

beforeEach(() => {
  pendingResult = { status: 200, body: { items: [{ id: 'pending-1' }], total: 1 } }
  reportsResult = { status: 200, body: { items: [{ id: 'report-1' }], total: 1 } }
  attachmentResult = {
    status: 200,
    body: {
      id: '00000000-0000-4000-8000-000000000001',
      storageRef: 'r2ugc:hub/desenho-original',
      mime: 'image/png',
      kind: 'image',
      originalName: 'Meu desenho',
      sizeBytes: 42,
    },
  }
  pendingArgs = null
  reportArgs = null
  resolvedAttachmentId = null
  presignArgs = null
})

describe('Route Handlers da moderação do Hub', () => {
  test('pending limita paginação, preserva o envelope e hidrata os itens', async () => {
    const response = await getPending(
      new Request('https://admin.test/api/hub/admin/pending?spaceId=space-1&limit=999&offset=7'),
    )

    expect(response.status).toBe(200)
    expect(pendingArgs).toEqual({ spaceId: 'space-1', limit: 100, offset: 7 })
    expect(await response.json()).toEqual({
      items: [{ id: 'pending-1', hydrated: 'pending' }],
      total: 1,
    })
  })

  test('reports encaminha filtros e hidrata denunciante/conteúdo', async () => {
    const response = await getReports(
      new Request(
        'https://admin.test/api/hub/admin/reports?spaceId=space-2&status=open&limit=20&offset=3',
      ),
    )

    expect(response.status).toBe(200)
    expect(reportArgs).toEqual({
      spaceId: 'space-2',
      status: 'open',
      limit: 20,
      offset: 3,
    })
    expect(await response.json()).toEqual({
      items: [{ id: 'report-1', hydrated: 'report' }],
      total: 1,
    })
  })

  test('resposta inválida do Hub vira 502 em vez de quebrar o handler', async () => {
    pendingResult = { status: 200, body: { total: 1 } }
    const response = await getPending(new Request('https://admin.test/api/hub/admin/pending'))
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ error: { code: 'UPSTREAM_ERROR' } })
  })

  test('anexo validado é resolvido no Hub, assinado no R2 e redirecionado sem vazar storageRef', async () => {
    const id = '00000000-0000-4000-8000-000000000001'
    const response = await getAttachment(
      new Request(`https://admin.test/api/hub/attachments/${id}`),
      {
        params: Promise.resolve({ id }),
      },
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://ugc.example.test/private-object')
    expect(resolvedAttachmentId).toBe(id)
    expect(presignArgs).toEqual({
      key: 'hub/desenho-original',
      options: {
        responseContentDisposition: 'inline; filename="Meu-desenho.png"',
        responseContentType: 'image/png',
      },
    })
  })

  test('id de anexo inválido é rejeitado antes de consultar o Hub', async () => {
    const response = await getAttachment(
      new Request('https://admin.test/api/hub/attachments/invalido'),
      { params: Promise.resolve({ id: 'invalido' }) },
    )
    expect(response.status).toBe(400)
    expect(resolvedAttachmentId).toBeNull()
  })
})
