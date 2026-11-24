import type { DocumentoDeCenario } from './documento'
import { volumeDaForma } from './formas'

export function volumeDaReferencia(
  doc: Partial<Pick<DocumentoDeCenario, 'modelos' | 'formas'>>,
  id: string | undefined,
) {
  const forma = doc.formas?.find((f) => f.id === id)
  return forma ? volumeDaForma(forma) : doc.modelos?.find((m) => m.id === id)?.volume
}
