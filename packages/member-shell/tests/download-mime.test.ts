import { describe, expect, test } from 'bun:test'
import { resolveDownloadMedia } from '../src/lib/download-mime'

describe('resolveDownloadMedia', () => {
  test('PDF com Content-Type correto do R2 → marca de PDF', () => {
    const media = resolveDownloadMedia({
      contentType: 'application/pdf',
      key: 'admin/attachments/x.pdf',
      fileType: 'application/pdf',
    })
    expect(media).toEqual({ mime: 'application/pdf', watermark: 'pdf' })
  })

  test("fileType TEXTO LIVRE do admin ('PDF') NÃO desliga a marca d'água", () => {
    // Cenário do achado: admin digitou "PDF" no dialog; o objeto no R2 tem o
    // Content-Type real — a marca engata pelos sinais reais.
    const media = resolveDownloadMedia({
      contentType: 'application/pdf',
      key: 'admin/attachments/apostila.pdf',
      fileType: 'PDF',
    })
    expect(media).toEqual({ mime: 'application/pdf', watermark: 'pdf' })
  })

  test('octet-stream no R2 + extensão .pdf → ainda marca (extensão é sinal)', () => {
    const media = resolveDownloadMedia({
      contentType: 'application/octet-stream',
      key: 'admin/attachments/apostila.pdf',
      fileType: null,
    })
    expect(media).toEqual({ mime: 'application/pdf', watermark: 'pdf' })
  })

  test('sinal divergente (Content-Type text/plain numa key .pdf) → PDF vence e o header acompanha', () => {
    const media = resolveDownloadMedia({
      contentType: 'text/plain',
      key: 'admin/attachments/apostila.pdf',
      fileType: null,
    })
    expect(media).toEqual({ mime: 'application/pdf', watermark: 'pdf' })
  })

  test('imagens marcáveis (png/jpeg/webp/gif) → marca de imagem com o MIME da imagem', () => {
    for (const [ext, mime] of [
      ['png', 'image/png'],
      ['jpg', 'image/jpeg'],
      ['webp', 'image/webp'],
      ['gif', 'image/gif'],
    ] as const) {
      const media = resolveDownloadMedia({
        contentType: mime,
        key: `admin/attachments/foto.${ext}`,
        fileType: null,
      })
      expect(media).toEqual({ mime, watermark: 'image' })
    }
  })

  test('formatos não-marcáveis (zip/office) → sem marca, MIME real preservado', () => {
    const media = resolveDownloadMedia({
      contentType: 'application/zip',
      key: 'admin/attachments/pacote.zip',
      fileType: 'application/zip',
    })
    expect(media).toEqual({ mime: 'application/zip', watermark: null })
  })

  test('Content-Type com parâmetros é normalizado', () => {
    const media = resolveDownloadMedia({
      contentType: 'Application/PDF; charset=binary',
      key: 'admin/attachments/sem-extensao',
      fileType: null,
    })
    expect(media).toEqual({ mime: 'application/pdf', watermark: 'pdf' })
  })

  test('nenhum sinal útil → octet-stream sem marca (header nunca sai inválido)', () => {
    const media = resolveDownloadMedia({
      contentType: null,
      key: 'admin/attachments/misterio',
      fileType: 'PDF', // texto livre inválido não vira header
    })
    expect(media).toEqual({ mime: 'application/octet-stream', watermark: null })
  })

  test('fileType como MIME válido vale como último recurso', () => {
    const media = resolveDownloadMedia({
      contentType: 'application/octet-stream',
      key: 'admin/attachments/sem-extensao',
      fileType: 'application/pdf',
    })
    expect(media).toEqual({ mime: 'application/pdf', watermark: 'pdf' })
  })
})

describe('watermarkCacheKey', () => {
  test('determinística, sob watermarked/, livre de colisão por construção', async () => {
    const { watermarkCacheKey } = await import('../src/lib/download-mime')
    const a = watermarkCacheKey('admin/attachments/abc-123.pdf', 'user-1')
    expect(a).toBe('watermarked/admin_attachments_abc-123.pdf/user-1.pdf')
    expect(watermarkCacheKey('admin/attachments/abc-123.pdf', 'user-1')).toBe(a)
    // Usuário diferente e arquivo diferente → keys diferentes.
    expect(watermarkCacheKey('admin/attachments/abc-123.pdf', 'user-2')).not.toBe(a)
    expect(watermarkCacheKey('admin/attachments/outro.pdf', 'user-1')).not.toBe(a)
    // Caracteres fora do safelist não vazam p/ a key.
    expect(watermarkCacheKey('/a b/ç.pdf', 'u u')).toBe('watermarked/a_b_.pdf/u_u.pdf')
  })
})
