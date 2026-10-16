import type { DemonstrationSource } from '@sistemazero/marketing-contracts'
import { probeImage } from './probe-image'

export async function inspectDemonstrationImage(
  file: string,
  mime: string,
  source: Pick<DemonstrationSource, 'width' | 'height'>,
) {
  const metadata = await probeImage(file, mime)
  if (metadata.rotation !== 0)
    throw new Error('A demonstração exige uma cópia normalizada, sem rotação EXIF')
  if (metadata.width !== source.width || metadata.height !== source.height)
    throw new Error('As dimensões da imagem divergem da fonte da demonstração')
  return metadata
}
