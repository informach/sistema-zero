import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export interface DanfseFontFiles {
  arialRegular: Uint8Array
  arialBold: Uint8Array
  microsoftSansSerif: Uint8Array
}

const FONT_ASSETS = {
  arialRegular: {
    file: 'arial.ttf',
    sha256: 'B3658EADAE55E682B5F69EB64C439C1ECC8F196C0BB8D4756D145D13BC86476A',
  },
  arialBold: {
    file: 'arialbd.ttf',
    sha256: 'E8F4E3BAF6CC35FED6FCCE3A540E8B39E8F6CDA1D22A28F2EC8F526FEF7A43F5',
  },
  microsoftSansSerif: {
    file: 'micross.ttf',
    sha256: '89B42A12EA0379133FB2F4A1D1BD53058FB61E2343C1D509452D5761ACC85B7A',
  },
} as const

let cached: DanfseFontFiles | null = null

/**
 * Carrega os ativos empacotados e falha fechado se algum arquivo estiver
 * ausente ou diferente do inventário autorizado. Assim um deploy incompleto
 * não volta silenciosamente para outra família tipográfica.
 */
export function loadBundledDanfseFontFiles(): DanfseFontFiles {
  if (cached) return cached

  cached = {
    arialRegular: loadFont(FONT_ASSETS.arialRegular),
    arialBold: loadFont(FONT_ASSETS.arialBold),
    microsoftSansSerif: loadFont(FONT_ASSETS.microsoftSansSerif),
  }
  return cached
}

function loadFont(asset: { file: string; sha256: string }): Uint8Array {
  const path = fileURLToPath(new URL(`../../../assets/fonts/${asset.file}`, import.meta.url))
  const bytes = readFileSync(path)
  const actual = createHash('sha256').update(bytes).digest('hex').toUpperCase()
  if (actual !== asset.sha256) {
    throw new Error(`Fonte DANFSe inválida: ${asset.file} (SHA-256 ${actual})`)
  }
  return bytes
}
