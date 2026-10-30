import { z } from 'zod'

/**
 * Os móveis da cozinha, da sala e do banheiro (`arte/casa/comodos.py`), postos pelo modo Construir
 * nos cômodos novos da casa (V20, 30/10/2026). O salvamento guarda cada um pelo índice nesta
 * lista: ela só cresce no fim, e a ordem nunca muda (`tests/salvamento-v20.test.ts` trava).
 */
export const MOVEIS = [
  // Cozinha
  'balcao-pia',
  'balcao',
  'armario-alto',
  'mesa-cozinha',
  'cadeira-cozinha',
  'prateleira-potes',
  // Sala
  'sofa',
  'poltrona',
  'mesinha-centro',
  'tapete',
  'estante-baixa',
  'luminaria-pe',
  'planta',
  'quadro',
  // Banheiro
  'banheira',
  'pia-banheiro',
  'espelho',
  'vaso-sanitario',
  'box-chuveiro',
  'tapetinho',
  'toalheiro',
] as const
export type Movel = (typeof MOVEIS)[number]

/** Quantos móveis a casa guarda (três cômodos bem mobiliados; o salvamento fica abaixo de 64 KB). */
export const MOVEIS_NA_CASA_MAXIMO = 24

/**
 * Um móvel na obra, em tupla para pesar pouco no salvamento: o índice em `MOVEIS`, a célula e o
 * giro em quartos de volta. Móvel de chão: a célula é o canto de x e z menores da área dele. Peça
 * de parede (quadro, espelho, prateleira, toalheiro): a célula na frente da parede, e o giro diz
 * de que lado da célula a parede fica.
 */
export const MovelNaObraSchema = z.tuple([
  z
    .number()
    .int()
    .min(0)
    .max(MOVEIS.length - 1),
  z.number().int().min(-60).max(60),
  z.number().int().min(-60).max(60),
  z.number().int().min(0).max(3),
])
export type MovelNaObra = z.infer<typeof MovelNaObraSchema>
