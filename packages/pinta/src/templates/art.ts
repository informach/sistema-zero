/**
 * Autoria dos MODELOS PRONTOS como STRINGS legíveis (mesmo dialeto dos fixtures
 * de teste): `.` = transparente (índice 0), `1`–`9` = índices 1–9, `a`–`f` =
 * 10–15. Puro e testado — nunca roda sobre entrada externa (só sobre os nossos
 * templates). É a MESMA implementação que `testing/fixtures.ts bmp()` usa.
 */
import type { PintaBitmap } from '../core/project'

/** `.` = 0, `1`–`9` = 1–9, `a`–`f` = 10–15 (`X` é apelido do 1, o branco). */
export function artCharToIndex(char: string): number {
  if (char === '.') return 0
  if (char === 'X') return 1
  if (char >= '1' && char <= '9') return char.charCodeAt(0) - 48
  if (char >= 'a' && char <= 'f') return char.charCodeAt(0) - 87
  throw new Error(`caractere de arte inválido: "${char}"`)
}

/** Linhas de arte → bitmap indexado (todas as linhas com a mesma largura). */
export function bitmapFromArt(lines: string[]): PintaBitmap {
  const height = lines.length
  const width = lines[0]?.length ?? 0
  const data = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    const line = lines[y] ?? ''
    if (line.length !== width) throw new Error('arte com linhas de larguras diferentes')
    for (let x = 0; x < width; x += 1) {
      data[y * width + x] = artCharToIndex(line[x] ?? '.')
    }
  }
  return { width, height, data }
}

/**
 * Linhas de células de MAPA (tokens por espaço, `.` = vazio `-1`) → grade. Mesmo
 * dialeto do `studioGrid` (`"0 1 1 .;. . 2 ."`), mas já como `Int16Array`.
 */
export function cellsFromArt(rows: string[]): { cols: number; rows: number; cells: Int16Array } {
  const parsed = rows.map((line) =>
    line
      .trim()
      .split(/\s+/)
      .map((token) => (token === '.' || token === '-' ? -1 : Number.parseInt(token, 10))),
  )
  const rowCount = parsed.length
  const cols = parsed[0]?.length ?? 0
  const cells = new Int16Array(cols * rowCount).fill(-1)
  for (let r = 0; r < rowCount; r += 1) {
    const row = parsed[r] ?? []
    if (row.length !== cols) throw new Error('mapa de arte com linhas de larguras diferentes')
    for (let c = 0; c < cols; c += 1) {
      const v = row[c] ?? -1
      cells[r * cols + c] = Number.isFinite(v) && v >= 0 ? v : -1
    }
  }
  return { cols, rows: rowCount, cells }
}
