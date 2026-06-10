import { describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server — neutraliza para testar a lógica pura.
mock.module('server-only', () => ({}))

const { PDFDocument } = await import('@cantoo/pdf-lib')
const sharp = (await import('sharp')).default
const { isWatermarkableImage, isWatermarkablePdf, watermarkImage, watermarkPdf, watermarkText } =
  await import('../src/server/watermark')

const EMAIL = 'aluno@teste.com'

describe('watermarkText', () => {
  test('inclui o e-mail e o aviso de uso pessoal', () => {
    const text = watermarkText(EMAIL)
    expect(text).toContain(EMAIL)
    expect(text).toContain('uso pessoal')
  })
})

describe('guards de MIME', () => {
  test('PDF e imagens comuns são marcáveis; office/zip/áudio não', () => {
    expect(isWatermarkablePdf('application/pdf')).toBe(true)
    expect(isWatermarkablePdf('application/zip')).toBe(false)
    expect(isWatermarkableImage('image/png')).toBe(true)
    expect(isWatermarkableImage('image/jpeg')).toBe(true)
    expect(isWatermarkableImage('image/webp')).toBe(true)
    expect(isWatermarkableImage('image/gif')).toBe(true)
    expect(isWatermarkableImage('application/pdf')).toBe(false)
    expect(isWatermarkableImage(null)).toBe(false)
  })
})

describe('watermarkPdf', () => {
  test('marca todas as páginas e o PDF continua válido', async () => {
    const src = await PDFDocument.create()
    src.addPage([595, 842])
    src.addPage([595, 842])
    const bytes = await src.save()

    const out = await watermarkPdf(bytes, EMAIL)

    const reloaded = await PDFDocument.load(out)
    expect(reloaded.getPageCount()).toBe(2)
    // O e-mail entra como texto literal no content stream (fonte standard, sem subset).
    expect(out.byteLength).toBeGreaterThan(bytes.byteLength)
  })

  test('bytes inválidos lançam (caller faz fallback p/ original)', async () => {
    const garbage = new TextEncoder().encode('isto não é um PDF')
    await expect(watermarkPdf(garbage, EMAIL)).rejects.toThrow()
  })
})

describe('watermarkImage', () => {
  test('PNG preserva dimensões e formato', async () => {
    const png = await sharp({
      create: { width: 400, height: 300, channels: 3, background: '#3366cc' },
    })
      .png()
      .toBuffer()

    const out = await watermarkImage(png, 'image/png', EMAIL)
    const meta = await sharp(out).metadata()
    expect(meta.format).toBe('png')
    expect(meta.width).toBe(400)
    expect(meta.height).toBe(300)
    // O selo muda os pixels (não devolveu o original intacto).
    expect(Buffer.compare(out, png)).not.toBe(0)
  })

  test('JPEG preserva formato', async () => {
    const jpeg = await sharp({
      create: { width: 320, height: 240, channels: 3, background: '#ffffff' },
    })
      .jpeg()
      .toBuffer()

    const out = await watermarkImage(jpeg, 'image/jpeg', EMAIL)
    const meta = await sharp(out).metadata()
    expect(meta.format).toBe('jpeg')
    expect(meta.width).toBe(320)
  })

  test('GIF animado preserva frames e dimensões do frame', async () => {
    // 2 frames 200×150 → GIF animado (join do sharp ≥0.33).
    const frame = (color: string) =>
      sharp({ create: { width: 200, height: 150, channels: 3, background: color } })
        .png()
        .toBuffer()
    const [a, b] = await Promise.all([frame('#ff0000'), frame('#00ff00')])
    const gif = await sharp([a, b], { join: { animated: true } })
      .gif()
      .toBuffer()
    const srcMeta = await sharp(gif, { animated: true }).metadata()
    expect(srcMeta.pages).toBe(2)

    const out = await watermarkImage(gif, 'image/gif', EMAIL)
    const meta = await sharp(out, { animated: true }).metadata()
    expect(meta.format).toBe('gif')
    expect(meta.width).toBe(200)
    expect(meta.pages).toBe(2)
    expect(meta.pageHeight).toBe(150)
  })

  test('imagem estreita cai para o selo curto (só o e-mail) sem estourar a base', async () => {
    const narrow = await sharp({
      create: { width: 160, height: 90, channels: 3, background: '#222222' },
    })
      .png()
      .toBuffer()

    const out = await watermarkImage(narrow, 'image/png', EMAIL)
    const meta = await sharp(out).metadata()
    expect(meta.width).toBe(160)
    expect(meta.height).toBe(90)
  })

  test('bytes inválidos lançam', async () => {
    await expect(watermarkImage(Buffer.from('nada'), 'image/png', EMAIL)).rejects.toThrow()
  })
})
