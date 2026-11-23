/**
 * As peças de PNG que o mapa de alturas (`png-de-alturas.ts`) e os pesos do chão
 * (`png-de-pesos.ts`) dividem: o CRC dos pedaços, a compactação pelo `CompressionStream` (existe
 * no navegador, no Bun e no Node) e a montagem do arquivo. Nada de leitura de arquivo nem rede.
 */

export const ASSINATURA_PNG = [137, 80, 78, 71, 13, 10, 26, 10] as const

let tabela: Uint32Array | null = null
export function crc32(bytes: Uint8Array, de: number, ate: number): number {
  if (!tabela) {
    tabela = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      tabela[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (let i = de; i < ate; i++) c = tabela[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Passa os bytes pelo fluxo (compactar ou descompactar); passou do `limite`, chama `grandeDemais`. */
export async function passarPeloFluxo(
  bytes: Uint8Array<ArrayBuffer>,
  fluxo: CompressionStream | DecompressionStream,
  limite: number,
  grandeDemais: () => never,
): Promise<Uint8Array<ArrayBuffer>> {
  const escritor = fluxo.writable.getWriter()
  // Um PNG corrompido falha na escrita e na leitura; a leitura é quem informa o erro.
  escritor.write(bytes).catch(() => {})
  escritor.close().catch(() => {})
  const leitor = fluxo.readable.getReader(),
    partes: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await leitor.read()
    if (done) break
    total += value.byteLength
    if (total > limite) {
      await leitor.cancel()
      grandeDemais()
    }
    partes.push(value)
  }
  const r = new Uint8Array(total)
  let p = 0
  for (const parte of partes) {
    r.set(parte, p)
    p += parte.byteLength
  }
  return r
}

/** O arquivo PNG com o cabeçalho e os dados já compactados (um IDAT só). */
export function montarPng(
  largura: number,
  altura: number,
  bits: number,
  tipoDeCor: number,
  dados: Uint8Array,
): Uint8Array<ArrayBuffer> {
  const png = new Uint8Array(8 + 25 + 12 + dados.length + 12),
    v = new DataView(png.buffer)
  png.set(ASSINATURA_PNG)
  let p = 8
  const pedaco = (tipo: string, corpo: Uint8Array) => {
    v.setUint32(p, corpo.length)
    for (let i = 0; i < 4; i++) png[p + 4 + i] = tipo.charCodeAt(i)
    png.set(corpo, p + 8)
    v.setUint32(p + 8 + corpo.length, crc32(png, p + 4, p + 8 + corpo.length))
    p += 12 + corpo.length
  }
  const ihdr = new Uint8Array(13)
  new DataView(ihdr.buffer).setUint32(0, largura)
  new DataView(ihdr.buffer).setUint32(4, altura)
  ihdr[8] = bits
  ihdr[9] = tipoDeCor
  pedaco('IHDR', ihdr)
  pedaco('IDAT', dados)
  pedaco('IEND', new Uint8Array(0))
  return png
}
