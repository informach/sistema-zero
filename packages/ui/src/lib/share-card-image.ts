import { DEFAULT_PALETTE } from '@sistemazero/core/palette'
import { toCanvas } from 'qrcode'
import { BRAND_LOGO_ART } from '../components/ui/brand-logo'
import { derive } from '../tokens/derive'

const palette = derive(DEFAULT_PALETTE)

export interface ShareCardContent {
  url: string
  title: string
  subtitle: string
  description: string
  notice?: string
}

/** Quebra inclusive endereços sem espaços, sem abreviar o destino impresso. */
function lines(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const result: string[] = []
  let line = ''
  for (const word of text.trim().split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width <= width) {
      line = candidate
      continue
    }
    if (line) result.push(line)
    line = ''
    for (const char of word) {
      if (line && ctx.measureText(line + char).width > width) {
        result.push(line)
        line = ''
      }
      line += char
    }
  }
  if (line) result.push(line)
  return result
}

function textBox(
  ctx: CanvasRenderingContext2D,
  text: string,
  top: number,
  height: number,
  size: number,
  weight = 400,
  color = palette.ink,
  family = 'sans-serif',
) {
  if (!text) return
  let wrapped: string[] = []
  let fontSize = size
  for (; fontSize >= 16; fontSize -= 2) {
    ctx.font = `${weight} ${fontSize}px ${family}`
    wrapped = lines(ctx, text, 920)
    if (wrapped.length * fontSize * 1.2 <= height) break
  }
  if (fontSize < 16) throw new Error('Texto longo demais para o cartão.')
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const start = top + (height - wrapped.length * fontSize * 1.2) / 2
  wrapped.forEach((line, index) => {
    ctx.fillText(line, 540, start + index * fontSize * 1.2)
  })
}

/** Arte exportável na paleta oficial, independente da preferência de cor do operador. */
export async function createShareCardImage(content: ShareCardContent): Promise<string> {
  const parsed = new URL(content.url)
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password)
    throw new Error('Link público inválido.')
  if (!content.title.trim() || !content.subtitle.trim()) throw new Error('Cartão sem título.')

  const styles = getComputedStyle(document.body)
  const display =
    styles.getPropertyValue('--font-bricolage').trim() ||
    styles.getPropertyValue('--font-baloo').trim() ||
    '"Bricolage Grotesque", sans-serif'
  const body =
    styles.getPropertyValue('--font-atkinson').trim() ||
    styles.getPropertyValue('--font-nunito').trim() ||
    '"Atkinson Hyperlegible Next", sans-serif'
  await Promise.all([
    document.fonts.load(`800 64px ${display}`),
    document.fonts.load(`400 32px ${body}`),
    document.fonts.load(`700 30px ${body}`),
  ])

  const qr = document.createElement('canvas')
  // Codifica a string original: parâmetros de atribuição e destino não são reescritos.
  await toCanvas(qr, content.url, { width: 512, margin: 4, errorCorrectionLevel: 'M' })
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível desenhar o cartão.')
  ctx.fillStyle = palette.ground
  ctx.fillRect(0, 0, 1080, 1350)
  // Contorno de tinta e pequenos acentos da casa, sem interferir na leitura do QR.
  ctx.fillStyle = palette.yellow
  ctx.beginPath()
  ctx.arc(1000, 214, 108, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = palette.lilac
  ctx.beginPath()
  ctx.arc(42, 460, 90, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = palette.card
  ctx.beginPath()
  ctx.roundRect(50, 38, 980, 1270, 34)
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = palette.ink
  ctx.stroke()
  // Mesmos caminhos usados pelo BrandLogo; não é uma imitação tipográfica da marca.
  const logo = BRAND_LOGO_ART.claro
  ctx.save()
  ctx.translate(215, 86)
  ctx.scale(650 / 515, 650 / 515)
  ctx.fillStyle = palette.ink
  for (const path of logo.letras) ctx.fill(new Path2D(path))
  ctx.fillStyle = palette['logo-zero']
  ctx.fill(new Path2D(logo.zero))
  ctx.fill(new Path2D(logo.estrela))
  ctx.restore()
  ctx.fillStyle = palette['yellow-surface']
  ctx.beginPath()
  ctx.roundRect(170, 176, 740, 58, 24)
  ctx.fill()
  textBox(ctx, content.subtitle, 181, 48, 30, 700, palette.ink, body)
  textBox(ctx, content.title, 247, 160, 64, 800, palette.ink, display)
  textBox(ctx, content.description, 421, 112, 32, 400, palette['ink-muted'], body)
  ctx.fillStyle = palette['card-step']
  ctx.beginPath()
  ctx.roundRect(270, 560, 548, 548, 28)
  ctx.fill()
  ctx.fillStyle = palette.card
  ctx.beginPath()
  ctx.roundRect(266, 552, 548, 548, 28)
  ctx.fill()
  ctx.stroke()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(qr, 284, 562, 512, 512)
  textBox(ctx, 'Aponte a câmera do celular para acessar', 1116, 42, 28, 700, palette.ink, body)
  textBox(ctx, content.notice ?? '', 1166, 65, 26, 400, palette['ink-muted'], body)
  textBox(ctx, content.url, 1240, 58, 25, 400, palette['ink-muted'], body)
  const image = canvas.toDataURL('image/png')
  if (!image.startsWith('data:image/png;')) throw new Error('Não foi possível exportar o cartão.')
  return image
}
