import type { IlhaId } from './ilhas'

/** Bits duráveis da V18. Nunca reordenar ou reutilizar um bit de ilha removida. */
export const BIT_DA_ILHA: Readonly<Record<IlhaId, number>> = {
  'sua-ilha': 1,
  bosque: 2,
  'vila-doce': 4,
  recife: 8,
  pico: 16,
  'vale-dos-dinos': 32,
  nuvens: 64,
  farol: 128,
}

export function ilhaVisitada(visitas: number, ilha: IlhaId): boolean {
  return (visitas & BIT_DA_ILHA[ilha]) !== 0
}
