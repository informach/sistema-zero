import { HABITANTES_DA_PRAIA, type HabitanteDaPraia } from '../sistemas/habitantes-da-praia'
import type { ColisorDaIlha } from './colisores-da-ilha'

/** Colisor em metros, fora da escala do desenho. Pinças, pontas e brilho ficam livres. */
export function colisoresDoHabitante(nome: HabitanteDaPraia): ColisorDaIlha[] {
  const { raio, altura } = HABITANTES_DA_PRAIA[nome]
  return [
    {
      forma: 'cilindro',
      nome: `col-morador-${nome}`,
      posicao: [0, altura / 2, 0],
      rotacao: [0, 0, 0, 1],
      raio,
      meiaAltura: altura / 2,
    },
  ]
}
