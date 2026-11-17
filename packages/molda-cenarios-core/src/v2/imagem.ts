/** Conferência pura de PNG/WebP estáticos, compartilhada pelo importador e pelo servidor. */
export class ImagemDeCenarioInvalida extends Error {}
function invalidar(mensagem: string): never {
  throw new ImagemDeCenarioInvalida(mensagem)
}

/** Limita a área que o navegador precisará decodificar, sem decodificar pixels no servidor. */
export function conferirImagemDeCenario(
  bytes: Uint8Array,
  mime: 'image/png' | 'image/webp',
): { largura: number; altura: number } {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let imagem: { largura: number; altura: number } | null = null
  const texto = (i: number, n: number) => new TextDecoder().decode(bytes.subarray(i, i + n))
  const dimensoes = (largura: number, altura: number) => {
    if (
      largura < 1 ||
      altura < 1 ||
      largura > 4096 ||
      altura > 4096 ||
      largura * altura > 8_388_608
    )
      invalidar('O retrato tem dimensões grandes demais')
    if (imagem && (imagem.largura !== largura || imagem.altura !== altura))
      invalidar('As dimensões declaradas da imagem não correspondem ao quadro')
    imagem = { largura, altura }
  }
  if (mime === 'image/png') {
    if (
      bytes.length < 33 ||
      ![137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b) ||
      v.getUint32(8) !== 13 ||
      texto(12, 4) !== 'IHDR'
    )
      invalidar('O retrato não é um PNG válido')
    dimensoes(v.getUint32(16), v.getUint32(20))
    let dados = false,
      fim = false
    let partes = 0
    for (let p = 8; p < bytes.length; ) {
      if (++partes > 65536) invalidar('A imagem tem partes demais')
      if (p + 12 > bytes.length) invalidar('O PNG está incompleto')
      const n = v.getUint32(p),
        tipo = texto(p + 4, 4),
        proximo = p + n + 12
      if (proximo > bytes.length || (tipo === 'IHDR' && p !== 8)) invalidar('O PNG está incompleto')
      if (['acTL', 'fcTL', 'fdAT'].includes(tipo)) invalidar('Use um retrato sem animação')
      if (tipo === 'IDAT') dados = true
      if (tipo === 'IEND') {
        if (n || proximo !== bytes.length) invalidar('O fim do PNG está incorreto')
        fim = true
      }
      p = proximo
    }
    if (!dados || !fim) invalidar('O PNG está incompleto')
    return imagem!
  }
  // Google WebP Container Specification: RIFF, VP8/VP8L/VP8X e dimensões do quadro.
  if (
    bytes.length < 20 ||
    texto(0, 4) !== 'RIFF' ||
    texto(8, 4) !== 'WEBP' ||
    v.getUint32(4, true) + 8 !== bytes.length
  )
    invalidar('O retrato não é um WebP válido')
  let quadros = 0
  let partes = 0
  for (let p = 12; p < bytes.length; ) {
    if (++partes > 65536) invalidar('A imagem tem partes demais')
    if (p + 8 > bytes.length) invalidar('O WebP está incompleto')
    const tipo = texto(p, 4),
      n = v.getUint32(p + 4, true),
      inicio = p + 8
    const proximo = inicio + n + (n % 2)
    if (proximo > bytes.length) invalidar('O WebP está incompleto')
    if (tipo === 'ANIM' || tipo === 'ANMF') invalidar('Use um retrato sem animação')
    if (tipo === 'VP8X') {
      if (n !== 10 || bytes[inicio]! & 2) invalidar('Use um retrato WebP sem animação')
      const u24 = (i: number) => bytes[i]! | (bytes[i + 1]! << 8) | (bytes[i + 2]! << 16)
      dimensoes(1 + u24(inicio + 4), 1 + u24(inicio + 7))
    } else if (tipo === 'VP8L') {
      if (n < 5 || bytes[inicio] !== 0x2f || bytes[inicio + 4]! >> 5)
        invalidar('O quadro WebP é inválido')
      dimensoes(
        1 + (bytes[inicio + 1]! | ((bytes[inicio + 2]! & 0x3f) << 8)),
        1 +
          ((bytes[inicio + 2]! >> 6) |
            (bytes[inicio + 3]! << 2) |
            ((bytes[inicio + 4]! & 15) << 10)),
      )
      quadros++
    } else if (tipo === 'VP8 ') {
      if (
        n < 10 ||
        bytes[inicio + 3] !== 0x9d ||
        bytes[inicio + 4] !== 1 ||
        bytes[inicio + 5] !== 0x2a ||
        bytes[inicio]! & 1
      )
        invalidar('O quadro WebP é inválido')
      dimensoes(v.getUint16(inicio + 6, true) & 0x3fff, v.getUint16(inicio + 8, true) & 0x3fff)
      quadros++
    }
    p = proximo
  }
  if (quadros !== 1) invalidar('O retrato precisa ter um único quadro WebP')
  return imagem!
}
