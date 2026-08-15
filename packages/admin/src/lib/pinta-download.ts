import { assetToJson, pintaAssetFromWire } from '@sistemazero/pinta/assets'

export interface PreparedPintaDownload {
  filename: string
  content: string
}

/** Converte o formato HTTP/jsonb para o asset canônico exigido pelo exportador. */
export function preparePintaDownload(asset: unknown): PreparedPintaDownload | null {
  const canonical = pintaAssetFromWire(asset)
  if (!canonical) return null
  const safe = canonical.name.replace(/[^\w.-]+/g, '-').slice(0, 60) || 'desenho'
  return { filename: `${safe}.pinta.json`, content: assetToJson(canonical) }
}
