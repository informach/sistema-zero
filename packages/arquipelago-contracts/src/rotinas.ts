import { z } from 'zod'

/**
 * A rotina de um Lumi (fase2-07): a sequência de cartões que a criança monta no painel "Rotina",
 * com os cartões de controle aninhando outros. Cada cartão é um dos `CARTAS_LUMI` (o `c` é o id
 * do cartão). O formato é curto de propósito: as rotinas de todos os Lumis entram no salvamento,
 * que tem teto de 64 KB, e o pior caso do resto já ocupa quase tudo (teste em
 * `tests/salvamento-v10.test.ts`).
 *
 * As chaves de cada cartão:
 * - `c`: o id do cartão (`CARTAS_LUMI`);
 * - `a`: aonde o "Voar até" vai (`LUGARES_DA_ROTINA`);
 * - `n`: o número do cartão (as vezes do "Repetir", os segundos do "Esperar", o número do "Guardar
 *   na memória" e o limite da condição "lembra menos que");
 * - `se`: a condição do "Se" e do "Enquanto" (`CONDICOES_DA_ROTINA`);
 * - `d`: os cartões de dentro (pelo menos um);
 * - `casos`: os cartões de cada caso do "Escolha" (`CASOS_DA_ESCOLHA`), pelo menos um caso.
 *
 * O jogo confere o resto (os de controle conquistados, onde o Lumi está) em
 * `arquipelago/src/sistemas/rotina.ts`; regras em `docs/arquipelago-regras.md` §8.2.
 */

/** Para onde o Lumi voa: a horta da ilha central (o primeiro canteiro) e a geladeira da casa. */
export const LUGARES_DA_ROTINA = ['horta', 'geladeira'] as const
export type LugarDaRotina = (typeof LUGARES_DA_ROTINA)[number]

/**
 * As condições do "Se" e do "Enquanto": o canteiro em que o Lumi está tem algo maduro, tem semente
 * sem água, o Lumi carrega alguma coisa, ou o número que ele lembra é menor que `n`.
 */
export const CONDICOES_DA_ROTINA = [
  'maduro',
  'precisa-de-agua',
  'carregando',
  'lembra-menos-que',
] as const
export type CondicaoDaRotina = (typeof CONDICOES_DA_ROTINA)[number]

/** Os casos do "Escolha": como está o canteiro em que o Lumi está. */
export const CASOS_DA_ESCOLHA = ['vazio', 'precisa-de-agua', 'crescendo', 'maduro'] as const
export type CasoDaEscolha = (typeof CASOS_DA_ESCOLHA)[number]

/** Os tetos da rotina (cabem nos 64 KB com todo o resto no pior caso). */
export const LIMITES_DA_ROTINA = {
  /** Cartões de controle um dentro do outro (o terceiro nível é o último). */
  profundidade: 3,
  /** Cartões numa rotina, contando os de dentro. */
  cartoesPorRotina: 16,
  /** Cartões somando as rotinas de todos os Lumis. */
  cartoesNasRotinas: 32,
  vezes: { min: 2, max: 9 },
  segundos: { min: 1, max: 10 },
  memoria: { min: 0, max: 99 },
} as const

export type CartaoDaRotina =
  | { c: 'quando-amanhecer' | 'quando-anoitecer' | 'regar' | 'colher' | 'guardar' | 'contar' }
  | { c: 'voar-ate'; a: LugarDaRotina }
  | { c: 'repetir'; n: number; d: CartaoDaRotina[] }
  | { c: 'para-cada'; d: CartaoDaRotina[] }
  | { c: 'enquanto' | 'se'; se: CondicaoDaRotina; n?: number; d: CartaoDaRotina[] }
  | { c: 'escolha'; casos: Partial<Record<CasoDaEscolha, CartaoDaRotina[]>> }
  | { c: 'esperar'; n: number }
  | { c: 'guardar-na-memoria'; n: number }

export type QuandoDaRotina = 'quando-amanhecer' | 'quando-anoitecer'
export const QUANDOS_DA_ROTINA: readonly QuandoDaRotina[] = ['quando-amanhecer', 'quando-anoitecer']

const L = LIMITES_DA_ROTINA
const inteiro = (min: number, max: number) => z.number().int().min(min).max(max)

export const CartaoDaRotinaSchema: z.ZodType<CartaoDaRotina> = z.lazy(() =>
  z.discriminatedUnion('c', [
    z.strictObject({
      c: z.enum(['quando-amanhecer', 'quando-anoitecer', 'regar', 'colher', 'guardar', 'contar']),
    }),
    z.strictObject({ c: z.literal('voar-ate'), a: z.enum(LUGARES_DA_ROTINA) }),
    z.strictObject({
      c: z.literal('repetir'),
      n: inteiro(L.vezes.min, L.vezes.max),
      d: z.array(CartaoDaRotinaSchema).min(1),
    }),
    z.strictObject({ c: z.literal('para-cada'), d: z.array(CartaoDaRotinaSchema).min(1) }),
    z
      .strictObject({
        c: z.enum(['enquanto', 'se']),
        se: z.enum(CONDICOES_DA_ROTINA),
        n: inteiro(1, L.memoria.max).optional(),
        d: z.array(CartaoDaRotinaSchema).min(1),
      })
      .refine(
        (x) => (x.se === 'lembra-menos-que') === (x.n !== undefined),
        'só "lembra menos que" leva número',
      ),
    z.strictObject({
      c: z.literal('escolha'),
      casos: z
        .partialRecord(z.enum(CASOS_DA_ESCOLHA), z.array(CartaoDaRotinaSchema).min(1))
        .refine((casos) => Object.keys(casos).length > 0, 'pelo menos um caso'),
    }),
    z.strictObject({ c: z.literal('esperar'), n: inteiro(L.segundos.min, L.segundos.max) }),
    z.strictObject({
      c: z.literal('guardar-na-memoria'),
      n: inteiro(L.memoria.min, L.memoria.max),
    }),
  ]),
)

/** Os cartões de dentro de um cartão (os do "Escolha", caso a caso, na ordem dos casos). */
export function cartoesDeDentro(c: CartaoDaRotina): readonly CartaoDaRotina[][] {
  if ('d' in c) return [c.d]
  if (c.c === 'escolha') return CASOS_DA_ESCOLHA.flatMap((k) => (c.casos[k] ? [c.casos[k]] : []))
  return []
}

/** Quantos cartões há na lista, contando os de dentro. */
export function contarCartoes(lista: readonly CartaoDaRotina[]): number {
  let n = 0
  for (const c of lista) {
    n++
    for (const d of cartoesDeDentro(c)) n += contarCartoes(d)
  }
  return n
}

/** Quantos níveis de cartão dentro de cartão (uma lista sem controle é 0). */
export function profundidadeDaRotina(lista: readonly CartaoDaRotina[]): number {
  let p = 0
  for (const c of lista)
    for (const d of cartoesDeDentro(c)) p = Math.max(p, 1 + profundidadeDaRotina(d))
  return p
}

/** Algum QUANDO fora do primeiro lugar da rotina (dentro de outro cartão ou depois do começo). */
function quandoForaDoComeco(lista: readonly CartaoDaRotina[], topo: boolean): boolean {
  return lista.some(
    (c, i) =>
      ((!topo || i > 0) && QUANDOS_DA_ROTINA.includes(c.c as QuandoDaRotina)) ||
      cartoesDeDentro(c).some((d) => quandoForaDoComeco(d, false)),
  )
}

/**
 * A rotina guardada: começa com UM cartão QUANDO (e só ele é QUANDO), tem pelo menos um cartão
 * depois dele e respeita os tetos.
 */
export const RotinaSchema = z
  .array(CartaoDaRotinaSchema)
  .min(2)
  .superRefine((lista, ctx) => {
    const primeiro = lista[0]
    if (!primeiro || !QUANDOS_DA_ROTINA.includes(primeiro.c as QuandoDaRotina))
      ctx.addIssue({ code: 'custom', message: 'a rotina começa com um cartão QUANDO' })
    if (quandoForaDoComeco(lista, true))
      ctx.addIssue({ code: 'custom', message: 'só o primeiro cartão é QUANDO' })
    if (contarCartoes(lista) > L.cartoesPorRotina)
      ctx.addIssue({ code: 'custom', message: 'cartões demais na rotina' })
    if (profundidadeDaRotina(lista) > L.profundidade)
      ctx.addIssue({ code: 'custom', message: 'cartões um dentro do outro demais' })
  })
