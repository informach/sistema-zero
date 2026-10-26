/**
 * Os DADOS do Pinta dentro do próprio PNG: um bloco `iTXt` logo depois do `IHDR`.
 *
 * Layout do bloco (PNG 1.2 §11.3.4.5), byte a byte, que o `pinta.py` do pygame lê:
 *
 *   keyword        `pinta` (5 bytes Latin-1)  + 0x00
 *   compression    0x01 (comprimido)
 *   method         0x00 (zlib/deflate)
 *   language tag   vazio                      + 0x00
 *   translated kw  vazio                      + 0x00
 *   text           zlib( UTF-8 do JSON )
 *
 * Bloco ANCILAR (primeira letra minúscula): todo decodificador de imagem o ignora, então o PNG
 * continua uma imagem comum para o `pygame.image.load`, o navegador e qualquer editor.
 * A compressão é a do fflate (determinística: os mesmos bytes de entrada dão os mesmos bytes
 * de saída em qualquer navegador), e é isso que deixa a SHA da imagem derivada estável.
 */

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  return crc >>> 0
})

/** CRC-32 do PNG (ISO 3309), sobre `bytes[start, end)`. */
export function pngCrc32(bytes: Uint8Array, start = 0, end = bytes.length): number {
  let crc = 0xffffffff
  for (let index = start; index < end; index++)
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[index]!) & 0xff]!
  return (crc ^ 0xffffffff) >>> 0
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]
/** Assinatura (8) + IHDR inteiro (4 tamanho + 4 tipo + 13 dados + 4 CRC). */
const AFTER_IHDR = 33

function latin1(text: string): Uint8Array {
  if (!/^[\x20-\x7e]{1,79}$/.test(text)) throw new Error('Palavra-chave PNG inválida.')
  return Uint8Array.from(text, (char) => char.charCodeAt(0))
}

/** Um bloco PNG completo: tamanho, tipo, dados e CRC (sobre tipo + dados). */
export function pngChunk(type: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
  const typeBytes = latin1(type)
  if (typeBytes.length !== 4) throw new Error('Tipo de bloco PNG inválido.')
  const chunk = new Uint8Array(12 + data.length)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, data.length)
  chunk.set(typeBytes, 4)
  chunk.set(data, 8)
  view.setUint32(8 + data.length, pngCrc32(chunk, 4, 8 + data.length))
  return chunk
}

/** Os dados de um `iTXt` comprimido, sem idioma nem palavra-chave traduzida. */
export function iTxtChunkData(keyword: string, compressedText: Uint8Array): Uint8Array {
  const key = latin1(keyword)
  // keyword \0 · compressão 1 · método 0 · idioma "" \0 · traduzida "" \0 · texto
  const data = new Uint8Array(key.length + 5 + compressedText.length)
  data.set(key, 0)
  data.set([0, 1, 0, 0, 0], key.length)
  data.set(compressedText, key.length + 5)
  return data
}

function assertPngWithIhdr(png: Uint8Array): DataView {
  if (png.length < AFTER_IHDR + 12 || !PNG_SIGNATURE.every((value, i) => png[i] === value))
    throw new Error('Arquivo PNG inválido.')
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  if (view.getUint32(8) !== 13 || view.getUint32(12) !== 0x49484452)
    throw new Error('Cabeçalho PNG inválido.')
  return view
}

/** O PNG com `chunk` inserido logo depois do IHDR (o resto, byte a byte, como estava). */
export function insertPngChunkAfterIhdr(
  png: Uint8Array,
  chunk: Uint8Array,
): Uint8Array<ArrayBuffer> {
  assertPngWithIhdr(png)
  const out = new Uint8Array(png.length + chunk.length)
  out.set(png.subarray(0, AFTER_IHDR), 0)
  out.set(chunk, AFTER_IHDR)
  out.set(png.subarray(AFTER_IHDR), AFTER_IHDR + chunk.length)
  return out
}

/** O PNG com o JSON do Pinta embutido (`iTXt` `pinta`, zlib), pronto para o projeto. */
export async function pngWithPintaData(
  png: Uint8Array,
  data: unknown,
  keyword = 'pinta',
): Promise<Uint8Array<ArrayBuffer>> {
  const { strToU8, zlibSync } = await import('fflate')
  const text = zlibSync(strToU8(JSON.stringify(data)), { level: 9 })
  return insertPngChunkAfterIhdr(png, pngChunk('iTXt', iTxtChunkData(keyword, text)))
}
