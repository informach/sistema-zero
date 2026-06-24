import 'server-only'
import { PDFDocument, type PDFFont, type PDFImage, rgb, StandardFonts } from '@cantoo/pdf-lib'
import { toBuffer as qrToBuffer } from 'qrcode'
import type { CertificateConfig, CertificateView } from '../lib/types'

/**
 * Gera o PDF do certificado de conclusão (A4 paisagem) SEM browser headless: texto
 * vetorial via @cantoo/pdf-lib (fontes built-in — nítidas e sem depender de fontconfig
 * do host) + QR de validação (lib `qrcode`). O members NÃO gera PDF (é backend); este é
 * o renderizador do BFF, alimentado pelo registro imutável + a config de autoria do bloco.
 * Determinístico: o mesmo certificado sempre gera o mesmo layout (cacheável no R2).
 */

const PAGE_W = 841.89 // A4 paisagem (pt)
const PAGE_H = 595.28
const DEFAULT_ACCENT = '#0891B2' // cyan da marca (fallback)
const INK = rgb(0.05, 0.07, 0.09) // #0D1117 (texto principal)
const MUTED = rgb(0.42, 0.45, 0.5)

/** `#RRGGBB` → rgb() do pdf-lib; inválido → cyan da marca. */
function hexToRgb(hex: string | undefined) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec((hex ?? '').trim())
  const h = m?.[1] ?? DEFAULT_ACCENT.slice(1)
  return rgb(
    Number.parseInt(h.slice(0, 2), 16) / 255,
    Number.parseInt(h.slice(2, 4), 16) / 255,
    Number.parseInt(h.slice(4, 6), 16) / 255,
  )
}

/** Data ISO → `DD/MM/AAAA` (UTC, determinístico). */
function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getUTCFullYear()}`
}

/** Maior tamanho de fonte (≤ ideal) que faz o texto caber em `maxWidth`. */
function fitSize(font: PDFFont, text: string, ideal: number, maxWidth: number): number {
  let size = ideal
  while (size > 8 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1
  return size
}

/** Busca uma imagem remota (logo/assinatura) e a embute — best-effort (null em falha). */
async function fetchImage(doc: PDFDocument, url: string | undefined): Promise<PDFImage | null> {
  if (!url || !/^https?:\/\//.test(url)) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.byteLength > 2_000_000) return null // teto defensivo
    if (type.includes('png') || (bytes[0] === 0x89 && bytes[1] === 0x50)) return doc.embedPng(bytes)
    if (type.includes('jpeg') || type.includes('jpg') || (bytes[0] === 0xff && bytes[1] === 0xd8)) {
      return doc.embedJpg(bytes)
    }
    return null
  } catch {
    return null
  }
}

export interface RenderCertificateInput {
  certificate: CertificateView
  config: CertificateConfig
  /** URL absoluta de validação (vai no QR). Vazio = sem QR (degradado). */
  verifyUrl: string
}

export async function renderCertificatePdf(input: RenderCertificateInput): Promise<Uint8Array> {
  const { certificate, config, verifyUrl } = input
  const accent = hexToRgb(config.accentColor)

  const doc = await PDFDocument.create()
  doc.setTitle(`Certificado — ${certificate.courseTitle}`)
  doc.setAuthor('Sistema Zero')
  const page = doc.addPage([PAGE_W, PAGE_H])

  const helv = await doc.embedFont(StandardFonts.Helvetica)
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const serif = await doc.embedFont(StandardFonts.TimesRomanBold)

  const center = (text: string, font: PDFFont, size: number, y: number, color = INK) => {
    const w = font.widthOfTextAtSize(text, size)
    page.drawText(text, { x: (PAGE_W - w) / 2, y, size, font, color })
  }

  // Moldura decorativa (borda externa grossa em destaque + linha interna fina).
  page.drawRectangle({
    x: 22,
    y: 22,
    width: PAGE_W - 44,
    height: PAGE_H - 44,
    borderColor: accent,
    borderWidth: 3,
  })
  page.drawRectangle({
    x: 32,
    y: 32,
    width: PAGE_W - 64,
    height: PAGE_H - 64,
    borderColor: accent,
    borderWidth: 0.75,
    opacity: 0,
    borderOpacity: 0.5,
  })

  const innerW = PAGE_W - 160 // margem p/ centralizar/medir

  // Logo (opcional) + título.
  const logo = await fetchImage(doc, config.logoUrl)
  if (logo) {
    const lw = 120
    const lh = (logo.height / logo.width) * lw
    page.drawImage(logo, { x: (PAGE_W - lw) / 2, y: PAGE_H - 70 - lh, width: lw, height: lh })
  }

  center((config.title || 'Certificado de Conclusão').toUpperCase(), helvBold, 30, 452, accent)
  center('Certificamos que', helv, 14, 412, MUTED)

  const name = certificate.studentName
  center(name, serif, fitSize(serif, name, 40, innerW), 358, INK)

  center('concluiu com êxito o curso', helv, 14, 318, MUTED)
  const courseTitle = certificate.courseTitle
  center(courseTitle, helvBold, fitSize(helvBold, courseTitle, 24, innerW), 284, INK)

  if (config.message?.trim()) {
    const msg = config.message.trim().slice(0, 160)
    center(msg, helv, fitSize(helv, msg, 12, innerW), 250, MUTED)
  }

  // Rodapé esquerdo: assinatura + emissor + data.
  const leftX = 90
  const signature = await fetchImage(doc, config.signatureImageUrl)
  if (signature) {
    const sw = 130
    const sh = Math.min(50, (signature.height / signature.width) * sw)
    page.drawImage(signature, { x: leftX, y: 122, width: sw, height: sh })
  }
  page.drawLine({
    start: { x: leftX, y: 116 },
    end: { x: leftX + 200, y: 116 },
    thickness: 1,
    color: MUTED,
  })
  if (config.issuerName?.trim()) {
    page.drawText(config.issuerName.trim().slice(0, 80), {
      x: leftX,
      y: 100,
      size: 12,
      font: helvBold,
      color: INK,
    })
  }
  page.drawText(`Emitido em ${formatDate(certificate.issuedAt)}`, {
    x: leftX,
    y: 84,
    size: 10,
    font: helv,
    color: MUTED,
  })

  // Rodapé direito: QR de validação + série.
  if (verifyUrl) {
    try {
      const qrPng = await qrToBuffer(verifyUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 320,
        color: { dark: '#0D1117ff', light: '#FFFFFFff' },
      })
      const qr = await doc.embedPng(new Uint8Array(qrPng))
      const qSize = 92
      const qx = PAGE_W - 90 - qSize
      page.drawImage(qr, { x: qx, y: 92, width: qSize, height: qSize })
      const cap = 'Validar autenticidade'
      page.drawText(cap, {
        x: qx + (qSize - helv.widthOfTextAtSize(cap, 8)) / 2,
        y: 82,
        size: 8,
        font: helv,
        color: MUTED,
      })
    } catch {
      // QR é best-effort — o certificado ainda sai com a série.
    }
  }
  const serialLabel = `Nº ${certificate.serial}`
  page.drawText(serialLabel, {
    x: PAGE_W - 90 - helv.widthOfTextAtSize(serialLabel, 9),
    y: 66,
    size: 9,
    font: helv,
    color: MUTED,
  })

  return doc.save()
}
