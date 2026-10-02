import { toBuffer } from 'qrcode'

/** QR local: nenhum link nem dado do usuário é enviado a um gerador externo. */
export function publicLinkQr(url: string): Promise<Buffer> {
  const parsed = new URL(url)
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Link público inválido')
  return toBuffer(parsed.href, { type: 'png', width: 640, margin: 4, errorCorrectionLevel: 'M' })
}
