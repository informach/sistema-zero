import { afterEach, describe, expect, it } from 'bun:test'
import { SendGridEmailGateway } from '../../src/infrastructure/gateways/sendgrid/sendgrid.gateway'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function captureFetch(): { bodies: Array<Record<string, unknown>> } {
  const captured = { bodies: [] as Array<Record<string, unknown>> }
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    captured.bodies.push(JSON.parse(String(init?.body)))
    return new Response(null, { status: 202, headers: { 'x-message-id': 'sg-1' } })
  }) as typeof fetch
  return captured
}

const IMAGES = [
  {
    contentId: 'logo-sz-light',
    filename: 'light.png',
    mimeType: 'image/png',
    contentBase64: 'QUFB',
  },
  { contentId: 'logo-sz-dark', filename: 'dark.png', mimeType: 'image/png', contentBase64: 'QkJC' },
  { contentId: 'nunca-usada', filename: 'x.png', mimeType: 'image/png', contentBase64: 'Q0ND' },
]

function send(gateway: SendGridEmailGateway, html: string) {
  return gateway.sendEmail({
    to: 'a@b.com',
    toName: 'A',
    subject: 'Oi',
    html,
    from: 'no-reply@sz.com',
    fromName: 'SZ',
    replyTo: null,
  })
}

describe('SendGridEmailGateway — imagens inline (cid:)', () => {
  it('anexa SÓ as imagens referenciadas por cid: no html, com disposition inline', async () => {
    const captured = captureFetch()
    const gateway = new SendGridEmailGateway({ apiKey: 'SG.test', inlineImages: IMAGES })

    const result = await send(gateway, '<img src="cid:logo-sz-light"><img src="cid:logo-sz-dark">')
    expect(result.providerMessageId).toBe('sg-1')

    const body = captured.bodies[0] as { attachments?: Array<Record<string, unknown>> }
    expect(body.attachments).toHaveLength(2)
    expect(body.attachments?.[0]).toEqual({
      content: 'QUFB',
      filename: 'light.png',
      type: 'image/png',
      disposition: 'inline',
      content_id: 'logo-sz-light',
    })
    expect(body.attachments?.map((a) => a.content_id)).not.toContain('nunca-usada')
  })

  it('html sem cid: → sem campo attachments', async () => {
    const captured = captureFetch()
    const gateway = new SendGridEmailGateway({ apiKey: 'SG.test', inlineImages: IMAGES })
    await send(gateway, '<p>sem imagens</p>')
    expect(captured.bodies[0]).not.toHaveProperty('attachments')
  })
})

describe('SendGridEmailGateway — anexos por URL (disposition attachment)', () => {
  it('anexo de arquivo COEXISTE com a logo inline no mesmo array', async () => {
    const captured = captureFetch()
    const gateway = new SendGridEmailGateway({ apiKey: 'SG.test', inlineImages: IMAGES })

    await gateway.sendEmail({
      to: 'a@b.com',
      toName: 'A',
      subject: 'Sua nota fiscal',
      html: '<img src="cid:logo-sz-light"><p>NF anexa</p>',
      from: 'no-reply@sz.com',
      fromName: 'SZ',
      replyTo: null,
      attachments: [
        { filename: 'danfse.pdf', contentType: 'application/pdf', contentBase64: 'UERG' },
      ],
    })

    const body = captured.bodies[0] as { attachments?: Array<Record<string, unknown>> }
    expect(body.attachments).toHaveLength(2)
    expect(body.attachments?.[0]).toEqual({
      content: 'QUFB',
      filename: 'light.png',
      type: 'image/png',
      disposition: 'inline',
      content_id: 'logo-sz-light',
    })
    expect(body.attachments?.[1]).toEqual({
      content: 'UERG',
      filename: 'danfse.pdf',
      type: 'application/pdf',
      disposition: 'attachment',
    })
    // anexo "de verdade" NÃO leva content_id (não é inline).
    expect(body.attachments?.[1]).not.toHaveProperty('content_id')
  })

  it('anexos sem nenhum cid: no html → só o attachment', async () => {
    const captured = captureFetch()
    const gateway = new SendGridEmailGateway({ apiKey: 'SG.test', inlineImages: IMAGES })
    await gateway.sendEmail({
      to: 'a@b.com',
      toName: null,
      subject: 'Oi',
      html: '<p>sem logo</p>',
      from: 'no-reply@sz.com',
      fromName: 'SZ',
      replyTo: null,
      attachments: [
        { filename: 'danfse.pdf', contentType: 'application/pdf', contentBase64: 'UERG' },
      ],
    })
    const body = captured.bodies[0] as { attachments?: Array<Record<string, unknown>> }
    expect(body.attachments).toHaveLength(1)
    expect(body.attachments?.[0]?.disposition).toBe('attachment')
  })
})
