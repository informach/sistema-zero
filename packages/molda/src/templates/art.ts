/**
 * Autoria das PELES dos modelos prontos como strings legíveis (o mesmo dialeto
 * dos fixtures do Pinta): `.` = 0 (na pele, "usa a cor base da peça"), `1`–`9`
 * = índices 1–9, `a`–`f` = 10–15. Só roda sobre os NOSSOS templates: lança em
 * vez de tolerar, para um erro de arte aparecer no teste e nunca na criança.
 */
import { createSkin, type MoldaSkin } from '../core/model'

export function artCharToIndex(char: string): number {
  if (char === '.') return 0
  if (char >= '1' && char <= '9') return char.charCodeAt(0) - 48
  if (char >= 'a' && char <= 'f') return char.charCodeAt(0) - 87
  throw new Error(`caractere de arte inválido: "${char}"`)
}

/** Linhas de arte → pele indexada (todas as linhas com a mesma largura). */
export function skinFromArt(lines: readonly string[]): MoldaSkin {
  const height = lines.length
  const width = lines[0]?.length ?? 0
  const skin = createSkin(width, height)
  for (let y = 0; y < height; y += 1) {
    const line = lines[y] ?? ''
    if (line.length !== width) throw new Error('arte com linhas de larguras diferentes')
    for (let x = 0; x < width; x += 1) {
      skin.data[y * width + x] = artCharToIndex(line[x] ?? '.')
    }
  }
  return skin
}
