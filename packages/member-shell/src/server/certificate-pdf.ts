import 'server-only'
import { lookup as dnsLookup } from 'node:dns/promises'
import { PDFDocument, type PDFFont, type PDFImage, rgb, StandardFonts } from '@cantoo/pdf-lib'
import { toBuffer as qrToBuffer } from 'qrcode'
import sharp from 'sharp'
import type { CertificateConfig, CertificateView } from '../lib/types'

/**
 * Gera o PDF do certificado de conclusão SEM browser headless: texto vetorial via
 * @cantoo/pdf-lib (fontes built-in — nítidas e sem depender de fontconfig do host) + QR de
 * validação (lib `qrcode`). O members NÃO gera PDF (é backend); este é o renderizador do BFF,
 * alimentado pelo registro imutável + a config de autoria do bloco. Determinístico: o mesmo
 * certificado sempre gera o mesmo layout (cacheável no R2).
 *
 * **Dois layouts:** com `baseImageUrl` (26/06) a imagem base do CURSO (A4 paisagem, com
 * logo/título/decoração já desenhados) vira o fundo e o conteúdo dinâmico (abertura, NOME,
 * frase do curso, parágrafo, data, assinaturas, QR) é desenhado POR CIMA, no miolo central.
 * Sem imagem base → layout "marca" antigo (moldura + título + nome + curso), p/ compatibilidade.
 */

const A4_W = 841.89 // A4 paisagem (pt)
const A4_H = 595.28
const DEFAULT_ACCENT = '#0891B2' // cyan da marca (fallback)
const INK = rgb(0.05, 0.07, 0.09) // #0D1117 (texto principal)
const MUTED = rgb(0.42, 0.45, 0.5)

/**
 * Posições do conteúdo sobre a imagem base, como FRAÇÃO da altura (do topo p/ baixo) ou da
 * largura. A imagem base deve manter o MIOLO CENTRAL livre (logo/título no topo, decoração nas
 * bordas). Ajuste fino aqui se o conteúdo bater na arte de um curso específico.
 */
const OVERLAY = {
  introY: 0.405, // "Certificamos que o aluno"
  nameY: 0.475, // nome do aluno (grande)
  phraseY: 0.55, // frase curta do curso
  bodyTopY: 0.6, // 1ª linha do parágrafo
  bodyLeading: 15, // pt entre linhas do parágrafo
  dateY: 0.665, // "Concluído em DD/MM/AAAA"
  sigTopY: 0.715, // topo das imagens de assinatura
  sigCentersX: [0.35, 0.64] as const, // centros das 2 colunas (Helena + à esq., Julio afastado da antena)
  sigColW: 110, // largura da coluna/linha de assinatura (pt) — estreita p/ não tocar a antena
  sigImgH: 38, // altura máx da imagem de assinatura (pt)
  contentW: 430, // largura útil do texto central (nome/frase, pt)
  bodyW: 430, // largura de quebra do parágrafo (pt)
  qrTopY: 0.33, // topo do QR (canto superior direito, mais alto p/ clarear a menina)
  qrSize: 80,
  qrRightMargin: 92,
} as const

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

// Fuso FIXO de São Paulo (como a gamificação) — determinístico (locale+TZ fixos) e correto p/ o
// público BR: uma emissão à noite (BRT) não "pula" para o dia seguinte, como acontecia com UTC.
const DATE_FMT = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** Data ISO → `DD/MM/AAAA` no fuso de São Paulo (determinístico). */
function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return DATE_FMT.format(d)
}

/** Maior tamanho de fonte (≤ ideal) que faz o texto caber em `maxWidth`. */
function fitSize(font: PDFFont, text: string, ideal: number, maxWidth: number): number {
  let size = ideal
  while (size > 8 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1
  return size
}

/** Quebra `text` em linhas que cabem em `maxWidth` (por palavra). */
function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (cur && font.widthOfTextAtSize(test, size) > maxWidth) {
      lines.push(cur)
      cur = w
    } else {
      cur = test
    }
  }
  if (cur) lines.push(cur)
  return lines
}

/** IP LITERAL (v4/v6) em faixa loopback/privada/link-local/ULA/CGNAT? */
function isPrivateAddress(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '')
  if (h.includes(':')) {
    // IPv6: loopback (::1), link-local (fe80::/10), ULA (fc00::/7).
    if (h === '::1') return true
    if (['fe8', 'fe9', 'fea', 'feb'].some((p) => h.startsWith(p))) return true
    if (h.startsWith('fc') || h.startsWith('fd')) return true
    // IPv4-mapeado (`::ffff:a.b.c.d`) → revalida a parte v4.
    if (h.includes('.')) return isPrivateAddress(h.slice(h.lastIndexOf(':') + 1))
    return false
  }
  const m = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(h)
  if (!m) return false
  const a = Number(m[1])
  const b = Number(m[2])
  if (a === 0 || a === 127 || a === 10) return true
  if (a === 169 && b === 254) return true // link-local / metadados de nuvem
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  return false
}

/**
 * URL pública http(s)? Rejeita hosts internos por NOME (localhost/.internal) e por IP LITERAL
 * (loopback/privado/link-local — metadados de nuvem em 169.254.169.254) — defesa-em-profundidade
 * contra SSRF na config de autoria (o admin sobe baseImageUrl/assinaturas; o BFF as busca
 * server-side). Um hostname público que RESOLVE p/ IP privado (DNS rebinding) é pego à parte por
 * `resolvesToPublicAddress`. Redirects são seguidos manualmente e revalidados a cada salto.
 */
function isSafeRemoteUrl(url: string): boolean {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal'))
    return false
  return !isPrivateAddress(host)
}

/**
 * Resolve o hostname e exige que TODOS os endereços sejam públicos — fecha o DNS rebinding
 * (hostname público com A record apontando p/ 127.x / 169.254.169.254). Falha de DNS = trata
 * como inseguro (a imagem é best-effort, cai no fallback). IP literal cai aqui também: o lookup
 * devolve o próprio literal.
 */
async function resolvesToPublicAddress(host: string): Promise<boolean> {
  try {
    const addrs = await dnsLookup(host.replace(/^\[|\]$/g, ''), { all: true })
    return addrs.length > 0 && addrs.every((a) => !isPrivateAddress(a.address))
  } catch {
    return false
  }
}

const MAX_IMAGE_REDIRECTS = 3

async function fetchSafeRemoteImage(url: string): Promise<Response | null> {
  let current = url
  const signal = AbortSignal.timeout(6_000)
  for (let redirects = 0; redirects <= MAX_IMAGE_REDIRECTS; redirects += 1) {
    if (!isSafeRemoteUrl(current)) return null
    if (!(await resolvesToPublicAddress(new URL(current).hostname))) return null
    const res = await fetch(current, { redirect: 'manual', signal })
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location || redirects === MAX_IMAGE_REDIRECTS) return null
      current = new URL(location, current).toString()
      continue
    }
    return res
  }
  return null
}

/** Busca uma imagem remota (base/assinatura) e a embute — best-effort (null em falha). */
async function fetchImage(doc: PDFDocument, url: string | undefined): Promise<PDFImage | null> {
  if (!url || !isSafeRemoteUrl(url)) return null
  try {
    const res = await fetchSafeRemoteImage(url)
    if (!res) return null
    if (!res.ok) return null
    // Teto DECLARADO (content-length) antes de bufferizar — não deixa um corpo enorme
    // pressionar a memória da réplica única antes do teto pós-leitura abaixo.
    const declared = Number(res.headers.get('content-length') ?? '')
    if (Number.isFinite(declared) && declared > 5_000_000) return null
    const type = res.headers.get('content-type') ?? ''
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.byteLength > 5_000_000) return null // teto defensivo (imagem base é maior)
    if (type.includes('png') || (bytes[0] === 0x89 && bytes[1] === 0x50)) return doc.embedPng(bytes)
    if (type.includes('jpeg') || type.includes('jpg') || (bytes[0] === 0xff && bytes[1] === 0xd8)) {
      return doc.embedJpg(bytes)
    }
    if (type.includes('webp') || isWebp(bytes)) {
      const png = await sharp(bytes).png().toBuffer()
      return doc.embedPng(new Uint8Array(png))
    }
    return null
  } catch {
    return null
  }
}

function isWebp(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
}

export interface RenderCertificateInput {
  certificate: CertificateView
  config: CertificateConfig
  /** URL absoluta de validação (vai no QR). Vazio = sem QR (degradado). */
  verifyUrl: string
}

/** Gera o PNG do QR de validação (best-effort → null em falha). */
async function qrImage(doc: PDFDocument, verifyUrl: string): Promise<PDFImage | null> {
  if (!verifyUrl) return null
  try {
    const png = await qrToBuffer(verifyUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
      color: { dark: '#0D1117ff', light: '#FFFFFFff' },
    })
    return await doc.embedPng(new Uint8Array(png))
  } catch {
    return null
  }
}

export async function renderCertificatePdf(input: RenderCertificateInput): Promise<Uint8Array> {
  const { certificate, config } = input

  const doc = await PDFDocument.create()
  doc.setTitle(`Certificado — ${certificate.courseTitle}`)
  doc.setAuthor('Sistema Zero')

  const helv = await doc.embedFont(StandardFonts.Helvetica)
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const serif = await doc.embedFont(StandardFonts.TimesRomanBold)
  const fonts = { helv, helvBold, serif }

  const baseImage = await fetchImage(doc, config.baseImageUrl)
  if (baseImage) {
    await drawOverlayLayout(doc, baseImage, input, fonts)
  } else {
    await drawBrandedLayout(doc, input, fonts)
  }
  return doc.save()
}

type Fonts = { helv: PDFFont; helvBold: PDFFont; serif: PDFFont }

/** Layout NOVO: conteúdo dinâmico desenhado sobre a imagem base do curso. */
async function drawOverlayLayout(
  doc: PDFDocument,
  baseImage: PDFImage,
  { certificate, config, verifyUrl }: RenderCertificateInput,
  { helv, helvBold }: Fonts,
): Promise<void> {
  // Página com a PROPORÇÃO da imagem base (sem distorcer/cortar): largura A4 paisagem.
  const ar = baseImage.width / baseImage.height || A4_W / A4_H
  const pageW = A4_W
  const pageH = Math.round((pageW / ar) * 100) / 100
  const page = doc.addPage([pageW, pageH])
  page.drawImage(baseImage, { x: 0, y: 0, width: pageW, height: pageH })

  // Cor de destaque do NOME (o resto fica escuro/discreto p/ legibilidade sobre o branco do
  // miolo). Vazio → escuro (INK), casando com o "vazio = escuro" do admin.
  const nameColor = config.accentColor?.trim() ? hexToRgb(config.accentColor) : INK
  const cx = pageW / 2
  // `frac` = fração do topo → y (baseline) em coordenadas do pdf-lib (origem embaixo).
  const yTop = (frac: number) => pageH * (1 - frac)
  const center = (text: string, font: PDFFont, size: number, frac: number, color = INK) => {
    const w = font.widthOfTextAtSize(text, size)
    page.drawText(text, { x: cx - w / 2, y: yTop(frac), size, font, color })
  }

  // 1) Linha de abertura.
  center((config.introLine || 'Certificamos que o aluno').trim(), helv, 13, OVERLAY.introY, MUTED)

  // 2) Nome do aluno (dinâmico — snapshot da emissão: perfil no kids, conta no adulto).
  const name = certificate.studentName
  center(name, helvBold, fitSize(helvBold, name, 30, OVERLAY.contentW), OVERLAY.nameY, nameColor)

  // 3) Frase curta do curso (o que concluiu).
  if (config.coursePhrase?.trim()) {
    const phrase = config.coursePhrase.trim()
    center(phrase, helv, fitSize(helv, phrase, 14, OVERLAY.contentW), OVERLAY.phraseY, INK)
  }

  // 4) Parágrafo (quebra em linhas).
  if (config.bodyText?.trim()) {
    const lines = wrapText(helv, config.bodyText.trim(), 11, OVERLAY.bodyW).slice(0, 4)
    lines.forEach((line, i) => {
      const w = helv.widthOfTextAtSize(line, 11)
      page.drawText(line, {
        x: cx - w / 2,
        y: yTop(OVERLAY.bodyTopY) - i * OVERLAY.bodyLeading,
        size: 11,
        font: helv,
        color: INK,
      })
    })
  }

  // 5) Data de conclusão (automática — data da emissão).
  const date = formatDate(certificate.issuedAt)
  if (date) center(`Concluído em ${date}`, helv, 11, OVERLAY.dateY, MUTED)

  // 6) Assinaturas (até 2), ladeando o centro: a IMAGEM (rabisco) fica ACIMA da linha e o NOME
  // sempre ABAIXO (rótulo). Sem imagem → só o nome abaixo (a imagem é o "certo"; o nome é a reserva).
  const signatures = (config.signatures ?? []).slice(0, 2)
  // Uma assinatura só → centralizada; duas → ladeiam o centro (constantes do OVERLAY).
  const sigCentersX: readonly number[] = signatures.length === 1 ? [0.5] : OVERLAY.sigCentersX
  for (const [i, sig] of signatures.entries()) {
    const colCx = pageW * (sigCentersX[i] ?? 0.5)
    const lineY = yTop(OVERLAY.sigTopY) - OVERLAY.sigImgH - 6
    const img = await fetchImage(doc, sig.imageUrl)
    if (img) {
      const ratio = img.width / img.height || 1
      let w = OVERLAY.sigColW
      let h = w / ratio
      if (h > OVERLAY.sigImgH) {
        h = OVERLAY.sigImgH
        w = h * ratio
      }
      page.drawImage(img, { x: colCx - w / 2, y: lineY + 6, width: w, height: h })
    }
    page.drawLine({
      start: { x: colCx - OVERLAY.sigColW / 2, y: lineY },
      end: { x: colCx + OVERLAY.sigColW / 2, y: lineY },
      thickness: 0.75,
      color: MUTED,
    })
    const sigName = sig.name?.trim()
    if (sigName) {
      const w = helvBold.widthOfTextAtSize(sigName, 10)
      page.drawText(sigName, {
        x: colCx - w / 2,
        y: lineY - 13,
        size: 10,
        font: helvBold,
        color: INK,
      })
    }
  }

  // 7) QR de validação + série (canto superior direito do miolo).
  const qr = await qrImage(doc, verifyUrl)
  const qSize = OVERLAY.qrSize
  const qx = pageW - OVERLAY.qrRightMargin - qSize
  const qTop = yTop(OVERLAY.qrTopY)
  if (qr) {
    page.drawImage(qr, { x: qx, y: qTop - qSize, width: qSize, height: qSize })
    const cap = 'Validar'
    page.drawText(cap, {
      x: qx + (qSize - helv.widthOfTextAtSize(cap, 8)) / 2,
      y: qTop - qSize - 11,
      size: 8,
      font: helv,
      color: MUTED,
    })
  }
  const serial = `Nº ${certificate.serial}`
  page.drawText(serial, {
    x: qx + (qSize - helv.widthOfTextAtSize(serial, 8)) / 2,
    y: qTop - qSize - (qr ? 22 : 0),
    size: 8,
    font: helv,
    color: MUTED,
  })
}

/** Layout ANTIGO (sem imagem base): moldura + título + nome + curso. Compat p/ blocos legados. */
async function drawBrandedLayout(
  doc: PDFDocument,
  { certificate, config, verifyUrl }: RenderCertificateInput,
  { helv, helvBold, serif }: Fonts,
): Promise<void> {
  const accent = hexToRgb(config.accentColor)
  const page = doc.addPage([A4_W, A4_H])
  const center = (text: string, font: PDFFont, size: number, y: number, color = INK) => {
    const w = font.widthOfTextAtSize(text, size)
    page.drawText(text, { x: (A4_W - w) / 2, y, size, font, color })
  }

  page.drawRectangle({
    x: 22,
    y: 22,
    width: A4_W - 44,
    height: A4_H - 44,
    borderColor: accent,
    borderWidth: 3,
  })
  page.drawRectangle({
    x: 32,
    y: 32,
    width: A4_W - 64,
    height: A4_H - 64,
    borderColor: accent,
    borderWidth: 0.75,
    opacity: 0,
    borderOpacity: 0.5,
  })

  const innerW = A4_W - 160
  const logo = await fetchImage(doc, config.logoUrl)
  if (logo) {
    const lw = 120
    const lh = (logo.height / logo.width) * lw
    page.drawImage(logo, { x: (A4_W - lw) / 2, y: A4_H - 70 - lh, width: lw, height: lh })
  }

  center((config.title || 'Certificado de Conclusão').toUpperCase(), helvBold, 30, 452, accent)
  center((config.introLine || 'Certificamos que').trim(), helv, 14, 412, MUTED)
  const name = certificate.studentName
  center(name, serif, fitSize(serif, name, 40, innerW), 358, INK)
  center('concluiu com êxito o curso', helv, 14, 318, MUTED)
  const courseTitle = certificate.courseTitle
  center(courseTitle, helvBold, fitSize(helvBold, courseTitle, 24, innerW), 284, INK)

  const body = config.coursePhrase?.trim() || config.message?.trim()
  if (body) {
    const msg = body.slice(0, 160)
    center(msg, helv, fitSize(helv, msg, 12, innerW), 250, MUTED)
  }

  const leftX = 90
  const signature = await fetchImage(
    doc,
    config.signatures?.[0]?.imageUrl ?? config.signatureImageUrl,
  )
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
  const issuer = config.signatures?.[0]?.name?.trim() || config.issuerName?.trim()
  if (issuer) {
    page.drawText(issuer.slice(0, 80), { x: leftX, y: 100, size: 12, font: helvBold, color: INK })
  }
  page.drawText(`Emitido em ${formatDate(certificate.issuedAt)}`, {
    x: leftX,
    y: 84,
    size: 10,
    font: helv,
    color: MUTED,
  })

  const qr = await qrImage(doc, verifyUrl)
  if (qr) {
    const qSize = 92
    const qx = A4_W - 90 - qSize
    page.drawImage(qr, { x: qx, y: 92, width: qSize, height: qSize })
    const cap = 'Validar autenticidade'
    page.drawText(cap, {
      x: qx + (qSize - helv.widthOfTextAtSize(cap, 8)) / 2,
      y: 82,
      size: 8,
      font: helv,
      color: MUTED,
    })
  }
  const serialLabel = `Nº ${certificate.serial}`
  page.drawText(serialLabel, {
    x: A4_W - 90 - helv.widthOfTextAtSize(serialLabel, 9),
    y: 66,
    size: 9,
    font: helv,
    color: MUTED,
  })
}
