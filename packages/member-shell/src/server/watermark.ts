import 'server-only'
import { PDFDocument, rgb, StandardFonts } from '@cantoo/pdf-lib'
import sharp from 'sharp'

/**
 * Marca d'água de rastreio nos materiais didáticos: o e-mail do aluno é estampado
 * em TODAS as páginas do PDF (rodapé discreto) ou no canto da imagem — uma cópia
 * que vazar identifica quem a forneceu. Funções puras (bytes→bytes), testáveis.
 */

/** Texto único da marca (PDF e imagem). */
export function watermarkText(email: string): string {
  return `${email} · Material de uso pessoal · Sistema Zero`
}

export function isWatermarkablePdf(mime: string | null): boolean {
  return mime === 'application/pdf'
}

const WATERMARKABLE_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

export function isWatermarkableImage(mime: string | null): boolean {
  return mime !== null && WATERMARKABLE_IMAGE_MIMES.has(mime)
}

// ── PDF (@cantoo/pdf-lib — fork ativo do pdf-lib, mesma API) ─────────────────

const PDF_FONT_SIZE = 7
const PDF_MARGIN_X = 16
const PDF_MARGIN_Y = 8

/**
 * Estampa o rodapé em todas as páginas. PDF cifrado: `ignoreEncryption` tenta
 * mesmo assim; se o draw/save falhar, o caller serve o original sem marca.
 */
export async function watermarkPdf(bytes: Uint8Array, email: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const text = watermarkText(email)
  const color = rgb(0.45, 0.45, 0.45)
  for (const page of pdf.getPages()) {
    page.drawText(text, {
      x: PDF_MARGIN_X,
      y: PDF_MARGIN_Y,
      size: PDF_FONT_SIZE,
      font,
      color,
      opacity: 0.6,
    })
  }
  return pdf.save()
}

// ── Imagens (sharp + overlay SVG — sem dependência de fontconfig do host) ────

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

/** Selo do canto: retângulo translúcido + texto branco (legível em fundo claro/escuro). */
function badgeSvg(text: string, fontSize: number): { svg: Buffer; width: number; height: number } {
  const padX = Math.round(fontSize * 0.8)
  const padY = Math.round(fontSize * 0.5)
  // Aproximação de largura p/ sans-serif (~0.62em por caractere) — folga, não corte.
  const width = Math.ceil(text.length * fontSize * 0.62) + padX * 2
  const height = fontSize + padY * 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" rx="${Math.round(height / 4)}" fill="rgba(0,0,0,0.45)"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}"
    fill="rgba(255,255,255,0.85)">${escapeXml(text)}</text>
</svg>`
  return { svg: Buffer.from(svg), width, height }
}

/**
 * Selo que CABE no frame (o sharp exige overlay ≤ base): encolhe a fonte até
 * caber; abaixo de 5px não há leitura — devolve `null` p/ o caller tentar um
 * texto mais curto ou desistir.
 */
function fittingBadge(
  text: string,
  idealSize: number,
  maxWidth: number,
  maxHeight: number,
): { svg: Buffer; width: number; height: number } | null {
  // width ≈ fontSize * (len*0.62 + 1.6) → maior fontSize que cabe na largura.
  const fit = Math.floor(maxWidth / (text.length * 0.62 + 1.6))
  const fontSize = Math.min(idealSize, fit)
  if (fontSize < 5) return null
  const badge = badgeSvg(text, fontSize)
  return badge.width <= maxWidth && badge.height <= maxHeight ? badge : null
}

/**
 * Estampa o selo no canto inferior direito, preservando o formato de entrada.
 * GIF animado: o sharp representa os frames como uma tira vertical — um overlay
 * com a ALTURA EXATA do frame + `tile` repete o selo alinhado em todos os frames.
 */
export async function watermarkImage(buffer: Buffer, mime: string, email: string): Promise<Buffer> {
  const animated = mime === 'image/gif'
  const base = sharp(buffer, { animated })
  const meta = await base.metadata()
  const frameWidth = meta.width ?? 0
  const frameHeight = meta.pageHeight ?? meta.height ?? 0
  if (!frameWidth || !frameHeight) throw new Error('Imagem sem dimensões')

  // Fonte proporcional à largura (legível sem dominar a imagem); em imagens
  // estreitas o texto completo não cabe → cai para só o e-mail.
  const idealSize = Math.min(24, Math.max(10, Math.round(frameWidth / 42)))
  const badge =
    fittingBadge(watermarkText(email), idealSize, frameWidth, frameHeight) ??
    fittingBadge(email, idealSize, frameWidth, frameHeight)
  if (!badge) throw new Error('Imagem pequena demais para o selo')
  const fontSize = Math.round(badge.height / 2)
  const margin = Math.round(fontSize / 2)

  let composited: sharp.Sharp
  if (animated && (meta.pages ?? 1) > 1) {
    // Frame inteiro com o selo posicionado no canto; tile repete frame a frame.
    const frame = `<svg xmlns="http://www.w3.org/2000/svg" width="${frameWidth}" height="${frameHeight}">
  <g transform="translate(${Math.max(0, frameWidth - badge.width - margin)}, ${Math.max(0, frameHeight - badge.height - margin)})">${badge.svg.toString()}</g>
</svg>`
    composited = base.composite([{ input: Buffer.from(frame), tile: true, gravity: 'northwest' }])
  } else {
    composited = base.composite([{ input: badge.svg, gravity: 'southeast' }])
  }

  switch (mime) {
    case 'image/png':
      return composited.png().toBuffer()
    case 'image/jpeg':
      return composited.jpeg({ quality: 90 }).toBuffer()
    case 'image/webp':
      return composited.webp({ quality: 90 }).toBuffer()
    case 'image/gif':
      return composited.gif().toBuffer()
    default:
      throw new Error(`Formato sem suporte a marca d'água: ${mime}`)
  }
}
