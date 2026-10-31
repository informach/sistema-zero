import { z } from 'zod'

/**
 * Os móveis da cozinha, da sala e do banheiro (`arte/casa/comodos.py`), postos pelo modo Construir
 * nos cômodos novos da casa (V20, 30/10/2026). O salvamento guarda cada um pelo índice nesta
 * lista: ela só cresce no fim, e a ordem nunca muda (`tests/salvamento-v20.test.ts` trava). Desde
 * 31/10/2026 vêm também o café, a banca de feira e a decoração de festa.
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
  // Café e banca de feira (B7, 31/10/2026; `arte/casa/cafe.py`)
  'cafe-mesa-redonda',
  'cafe-cadeira',
  'cafe-balcao',
  'cafe-vitrine-doces',
  'cafe-lousa-cardapio',
  'cafe-banca-feira',
  'cafe-caixote',
  // Decoração de festa (B9, 31/10/2026; `arte/casa/festas.py`)
  'festa-junina-bandeirinhas',
  'festa-junina-lanterna-papel',
  'festa-junina-fogueira',
  'festa-carnaval-serpentina',
  'festa-carnaval-mascara',
  'festa-carnaval-confete',
  'festa-fim-de-ano-arvore',
  'festa-fim-de-ano-guirlanda',
  'festa-fim-de-ano-estrela-janela',
  'festa-lanternas-lanterna-chao',
  'festa-lanternas-varal-de-luz',
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
