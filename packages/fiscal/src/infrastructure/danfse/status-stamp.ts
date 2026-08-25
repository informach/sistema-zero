import { degrees, PDFDocument, rgb, StandardFonts } from '@cantoo/pdf-lib'

/**
 * Marca d'água de ESTADO do DANFSe (NT 008/2026 item 2.5): "CANCELADA" /
 * "SUBSTITUÍDA" na diagonal, ≥50pt, cinza K35. Aplicada NA HORA DE SERVIR
 * (rotas do PDF) quando a nota está CANCELLED/SUBSTITUTED — o bytea armazenado
 * na emissão fica IMUTÁVEL (é o registro do que foi enviado por e-mail), e o
 * overlay cobre de graça o estoque histórico, inclusive PDFs antigos baixados
 * do gerador do governo. Best-effort: qualquer falha devolve o ORIGINAL (servir
 * a nota nunca pode quebrar por causa do carimbo).
 */
export type DanfseStatusStamp = 'CANCELADA' | 'SUBSTITUÍDA'

export async function applyStatusStamp(
  bytes: Uint8Array,
  stamp: DanfseStatusStamp,
): Promise<Uint8Array> {
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const color = rgb(0.65, 0.65, 0.65) // K35 da NT
    for (const page of pdf.getPages()) {
      const { width, height } = page.getSize()
      const size = 86
      const textWidth = font.widthOfTextAtSize(stamp, size)
      const angle = Math.atan2(height, width)
      // Centraliza o texto rotacionado na diagonal da página.
      const cx = width / 2 - (textWidth / 2) * Math.cos(angle)
      const cy = height / 2 - (textWidth / 2) * Math.sin(angle) - (size / 2) * Math.cos(angle)
      // NT pede cinza K35 (rgb 0.65). Overlay por cima do conteúdo: 0.75 de
      // opacidade chega perto do tom exigido sem apagar o texto nos cruzamentos
      // (0.45 dava um cinza efetivo ~K16, claro demais — achado do review).
      page.drawText(stamp, {
        x: cx,
        y: cy,
        size,
        font,
        color,
        opacity: 0.75,
        rotate: degrees((angle * 180) / Math.PI),
      })
    }
    return await pdf.save()
  } catch {
    return bytes
  }
}

/** Carimbo correspondente ao status da nota — `null` = serve o PDF como está. */
export function stampForStatus(status: string): DanfseStatusStamp | null {
  if (status === 'CANCELLED') return 'CANCELADA'
  if (status === 'SUBSTITUTED') return 'SUBSTITUÍDA'
  return null
}
