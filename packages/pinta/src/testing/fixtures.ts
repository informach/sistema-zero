/**
 * Fixtures de bitmap como STRINGS legíveis: '.' = transparente (0), '1'–'9' =
 * índices 1–9, 'a'–'f' = 10–15 ('X' é apelido do 1). `rows()` faz o caminho
 * inverso para asserções por snapshot visual.
 */
import type { PintaBitmap } from '../core/project'

function charToIndex(char: string): number {
  if (char === '.') return 0
  if (char === 'X') return 1
  if (char >= '1' && char <= '9') return char.charCodeAt(0) - 48
  if (char >= 'a' && char <= 'f') return char.charCodeAt(0) - 87
  throw new Error(`caractere de fixture inválido: "${char}"`)
}

function indexToChar(index: number): string {
  if (index === 0) return '.'
  if (index <= 9) return String.fromCharCode(48 + index)
  if (index <= 15) return String.fromCharCode(87 + index)
  return '?'
}

export function bmp(lines: string[]): PintaBitmap {
  const height = lines.length
  const width = lines[0]?.length ?? 0
  const data = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    const line = lines[y] ?? ''
    if (line.length !== width) throw new Error('fixture com linhas de larguras diferentes')
    for (let x = 0; x < width; x += 1) {
      data[y * width + x] = charToIndex(line[x] ?? '.')
    }
  }
  return { width, height, data }
}

export function rows(bitmap: PintaBitmap): string[] {
  const out: string[] = []
  for (let y = 0; y < bitmap.height; y += 1) {
    let line = ''
    for (let x = 0; x < bitmap.width; x += 1) {
      line += indexToChar(bitmap.data[y * bitmap.width + x] ?? 0)
    }
    out.push(line)
  }
  return out
}
