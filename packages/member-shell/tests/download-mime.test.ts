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
  test('determinística, sob watermarked/, INJETIVA por construção (sha256 da origem)', async () => {
    const { watermarkCacheKey } = await import('../src/lib/download-mime')
    const a = watermarkCacheKey('admin/attachments/abc-123.pdf', 'user-1')
    // Formato: watermarked/<sha256 hex 64>/<user>.pdf
    expect(a).toMatch(/^watermarked\/[0-9a-f]{64}\/user-1\.pdf$/)
    expect(watermarkCacheKey('admin/attachments/abc-123.pdf', 'user-1')).toBe(a) // determinística
    // Usuário diferente e arquivo diferente → keys diferentes.
    expect(watermarkCacheKey('admin/attachments/abc-123.pdf', 'user-2')).not.toBe(a)
    expect(watermarkCacheKey('admin/attachments/outro.pdf', 'user-1')).not.toBe(a)
    // SEM colisão: keys que a substituição lossy antiga colapsava agora diferem.
    expect(watermarkCacheKey('report v1.pdf', 'u')).not.toBe(
      watermarkCacheKey('report-v1.pdf', 'u'),
    )
    expect(watermarkCacheKey('a b/c.pdf', 'u')).not.toBe(watermarkCacheKey('a-b/c.pdf', 'u'))
    // O userId segue saneado (não-hex) — só [a-z0-9-] na parte do usuário.
    expect(watermarkCacheKey('x.pdf', 'u u')).toMatch(/\/u_u\.pdf$/)
  })

  test('com o ETag da origem, a VERSÃO entra na key (regravar na mesma key não serve o PDF velho)', async () => {
    const { watermarkCacheKey } = await import('../src/lib/download-mime')
    const src = 'admin/attachments/366b917b-9a65-4621-8739-86a3f60dd64c.pdf'
    const v1 = watermarkCacheKey(src, 'user-1', '7385eb79713a707c4eb518981aa01794')
    const v2 = watermarkCacheKey(src, 'user-1', '533f0073aaaaaaaaaaaaaaaaaaaaaaaa')
    // Formato: watermarked/<sha256 hex 64>/<etag>/<user>.pdf
    expect(v1).toMatch(/^watermarked\/[0-9a-f]{64}\/7385eb79713a707c4eb518981aa01794\/user-1\.pdf$/)
    // Incidente 07/09: o admin trocou o caderno do Corridino SOB A MESMA KEY —
    // sem a versão, o aluno seguiria recebendo a marca da versão antiga.
    expect(v2).not.toBe(v1)
    // Mesma origem, mesma versão, mesmo aluno → mesma key (determinística).
    expect(watermarkCacheKey(src, 'user-1', '7385eb79713a707c4eb518981aa01794')).toBe(v1)
    // O prefixo da origem é o mesmo com ou sem versão (lifecycle do bucket cobre os dois).
    expect(v1.split('/').slice(0, 2)).toEqual(
      watermarkCacheKey(src, 'user-1').split('/').slice(0, 2),
    )
    // ETag com caracteres fora de [a-zA-Z0-9-] é saneado (aspas/`-N` de multipart não viram path torto).
    expect(watermarkCacheKey(src, 'user-1', '"abc"-2')).toMatch(/\/_abc_-2\/user-1\.pdf$/)
    // null/vazio = legado: forma antiga, sem o segmento.
    expect(watermarkCacheKey(src, 'user-1', null)).toBe(watermarkCacheKey(src, 'user-1'))
    expect(watermarkCacheKey(src, 'user-1', '')).toBe(watermarkCacheKey(src, 'user-1'))
  })
})
