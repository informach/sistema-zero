/**
 * Codificador de GIF89a animado — PURO: nenhum canvas, nenhum DOM, nenhuma
 * dependência nova. Roda (e é testável) no happy-dom, ao contrário de todo o
 * resto do `export/`, que precisa de canvas 2D de verdade.
 *
 * Existe porque o GIF é o único formato animado que a criança pode simplesmente
 * MANDAR para alguém: abre em qualquer lugar, anima sozinho, não precisa de
 * player. E o formato cai como uma luva no Pinta: o GIF é INDEXADO com uma
 * tabela de cores e um índice transparente, que é exatamente o modelo do bitmap
 * de pixel art (`PintaBitmap` = 1 byte de índice por pixel, índice 0 =
 * transparente). No caminho do pixel não existe conversão nem perda: os índices
 * do desenho VIRAM os índices do GIF.
 *
 * O que o formato NÃO tem, e o chamador precisa saber:
 * - **256 cores no máximo** por arquivo (aqui a tabela é GLOBAL, uma só para
 *   todos os quadros). A paleta do Pinta tem 16 + 48 extras = 64, folgado; o
 *   vetorial precisa quantizar antes (`quantize.ts`).
 * - **Transparência de 1 bit**: o pixel é opaco ou some, não existe meio
 *   caminho. Por isso o vetorial corta o alfa num limiar em vez de misturar.
 * - **Tempo em centésimos de segundo**, inteiro (ver `delayCs`).
 */

/** Um quadro já em índices da tabela de cores. */
export interface GifFrame {
  /** Índices row-major, `length = width * height`. */
  indices: Uint8Array
  /**
   * Quanto o quadro fica na tela, em CENTÉSIMOS de segundo (a unidade do
   * formato). Navegador trata 0 e 1 como "o autor não sabia" e troca por 10 —
   * por isso o mínimo real é 2.
   */
  delayCs: number
}

export interface GifInput {
  width: number
  height: number
  /** Tabela de cores `[r, g, b]` (0–255). No máximo 256 entradas. */
  palette: ReadonlyArray<readonly [number, number, number]>
  frames: readonly GifFrame[]
  /** Índice da tabela que vira "buraco", ou `null` para GIF sem transparência. */
  transparentIndex: number | null
  /** `false` toca uma vez e para no último quadro. */
  loop: boolean
}

/** O menor delay que o navegador respeita (0 e 1 viram 10 na prática). */
export const MIN_DELAY_CS = 2

/** Milissegundos → centésimos, com o piso que o navegador respeita. */
export function msToDelayCs(ms: number): number {
  return Math.max(MIN_DELAY_CS, Math.round(ms / 10))
}

/** Bits necessários para endereçar `n` cores (mínimo 1, máximo 8). */
function paletteBits(n: number): number {
  let bits = 1
  while (1 << bits < n && bits < 8) bits += 1
  return bits
}

/**
 * LZW do GIF (largura de código variável, bits em LSB-first).
 *
 * ⚠️ A ORDEM aqui é o coração do formato e não pode ser "melhorada": o código é
 * emitido na largura ATUAL, e só depois a largura cresce e a entrada nova entra
 * no dicionário. Trocar essa ordem gera um arquivo que ainda parece um GIF (e
 * passa em teste de cabeçalho) mas sai embaralhado no decodificador de verdade.
 */
function lzwEncode(indices: Uint8Array, minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize
  const endCode = clearCode + 1
  const codeMask = clearCode - 1

  const out: number[] = []
  let bitBuffer = 0
  let bitCount = 0
  let codeSize = minCodeSize + 1

  const emit = (code: number): void => {
    bitBuffer |= code << bitCount
    bitCount += codeSize
    while (bitCount >= 8) {
      out.push(bitBuffer & 0xff)
      bitBuffer >>= 8
      bitCount -= 8
    }
  }

  let dictionary = new Map<number, number>()
  let nextCode = endCode + 1
  emit(clearCode)

  if (indices.length > 0) {
    let prefix = (indices[0] ?? 0) & codeMask
    for (let i = 1; i < indices.length; i += 1) {
      const pixel = (indices[i] ?? 0) & codeMask
      const key = (prefix << 8) | pixel
      const known = dictionary.get(key)
      if (known !== undefined) {
        prefix = known
        continue
      }
      emit(prefix)
      if (nextCode === 4096) {
        // Dicionário cheio: zera dos dois lados (o decodificador faz o mesmo ao
        // ver o clearCode) e recomeça na largura inicial.
        emit(clearCode)
        dictionary = new Map()
        nextCode = endCode + 1
        codeSize = minCodeSize + 1
      } else {
        if (nextCode >= 1 << codeSize) codeSize += 1
        dictionary.set(key, nextCode)
        nextCode += 1
      }
      prefix = pixel
    }
    emit(prefix)
  }
  emit(endCode)

  if (bitCount > 0) out.push(bitBuffer & 0xff)
  return out
}

/**
 * Escreve os bytes do LZW nos sub-blocos de até 255 do formato (0 encerra).
 *
 * ⚠️ Nada de `out.push(...bytes)` em lugar nenhum deste arquivo: um quadro
 * grande passa de 60 mil bytes e o spread estoura o limite de argumentos da
 * chamada — quebraria só no desenho grande, que é justo o que ninguém testa.
 */
function pushSubBlocks(out: number[], bytes: readonly number[]): void {
  for (let i = 0; i < bytes.length; i += 255) {
    const size = Math.min(255, bytes.length - i)
    out.push(size)
    for (let j = 0; j < size; j += 1) out.push(bytes[i + j] as number)
  }
  out.push(0)
}

function pushU16(out: number[], value: number): void {
  out.push(value & 0xff, (value >> 8) & 0xff)
}

/**
 * Monta o arquivo. Lança em entrada impossível (tamanho zero, paleta vazia ou
 * acima de 256, quadro com o número errado de pixels) — é erro de programação,
 * não de usuária, e o chamador do Pinta já cai no toast de "não consegui".
 */
export function encodeGif(input: GifInput): Uint8Array {
  const { width, height, palette, frames, transparentIndex, loop } = input
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('GIF: tamanho inválido')
  }
  if (width > 0xffff || height > 0xffff) throw new Error('GIF: tamanho acima do formato')
  if (palette.length < 1 || palette.length > 256) throw new Error('GIF: paleta fora de 1..256')
  if (frames.length < 1) throw new Error('GIF: sem quadros')
  const pixels = width * height
  const bits = paletteBits(palette.length)
  const tableSize = 1 << bits
  for (const frame of frames) {
    if (frame.indices.length !== pixels) throw new Error('GIF: quadro com tamanho diferente')
    // ⚠️ Índice fora da tabela NÃO pode passar: o LZW mascara o pixel na largura
    // do código (`& codeMask`) e ele viraria OUTRA COR, sem erro nenhum —
    // medido: numa tabela de 4, o índice 5 sai como 1 e o 7 sai como 3. Os
    // chamadores de hoje não produzem isso (o pixel filtra pelo `paintable` e o
    // quantize só emite índices que criou), mas cor trocada em silêncio é o pior
    // desfecho possível e sai caro de diagnosticar depois.
    for (let i = 0; i < frame.indices.length; i += 1) {
      if ((frame.indices[i] as number) >= tableSize) {
        throw new Error('GIF: índice de pixel fora da tabela de cores')
      }
    }
  }
  // O LZW do GIF não aceita código de 1 bit: paleta de 1–2 cores ainda codifica
  // com 2 (o formato manda; tabela de cores continua do tamanho declarado).
  const minCodeSize = Math.max(2, bits)

  const out: number[] = []
  // Assinatura: 89a (e não 87a) porque usamos extensões — transparência e laço.
  out.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)

  // Descritor de tela: tabela GLOBAL ligada (bit 7), resolução de cor e tamanho
  // da tabela nos 3 bits baixos (tabela = 2^(n+1)).
  pushU16(out, width)
  pushU16(out, height)
  out.push(0x80 | ((bits - 1) << 4) | (bits - 1), 0, 0)

  for (let i = 0; i < tableSize; i += 1) {
    const color = palette[i]
    out.push(color?.[0] ?? 0, color?.[1] ?? 0, color?.[2] ?? 0)
  }

  if (loop) {
    // Extensão NETSCAPE 2.0 — a única forma de dizer "repete para sempre".
    // Sem ela o GIF toca uma vez, mesmo com vários quadros.
    out.push(0x21, 0xff, 0x0b)
    for (const ch of 'NETSCAPE2.0') out.push(ch.charCodeAt(0))
    out.push(0x03, 0x01, 0x00, 0x00, 0x00)
  }

  const hasTransparent = transparentIndex !== null
  if (hasTransparent && (transparentIndex < 0 || transparentIndex >= tableSize)) {
    throw new Error('GIF: índice transparente fora da tabela')
  }
  // Descarte 2 ("volta ao fundo") limpa o quadro antes do próximo: sem isso o
  // desenho anterior aparece pelos buracos do seguinte e a animação vira rastro.
  // Sem transparência, 1 ("deixa como está") comprime melhor.
  const disposal = hasTransparent ? 2 : 1

  for (const frame of frames) {
    out.push(0x21, 0xf9, 0x04, (disposal << 2) | (hasTransparent ? 1 : 0))
    pushU16(out, Math.max(0, Math.min(0xffff, Math.round(frame.delayCs))))
    out.push(hasTransparent ? transparentIndex : 0, 0x00)

    out.push(0x2c)
    pushU16(out, 0)
    pushU16(out, 0)
    pushU16(out, width)
    pushU16(out, height)
    out.push(0x00)

    out.push(minCodeSize)
    pushSubBlocks(out, lzwEncode(frame.indices, minCodeSize))
  }

  out.push(0x3b)
  return Uint8Array.from(out)
}
