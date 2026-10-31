import { z } from 'zod'
import { GALERIA, IDS_DA_GALERIA, type IdDaGaleria } from './galeria'

/** A identidade é da posse, não do arquivo 3D. IDs de aparência dos saves não mudam. */
export const ITEM_DA_APARENCIA = {
  'geladeira-classica': 'arquipelago:geladeira-classica',
  'forno-classico': 'arquipelago:forno-classico',
  'aquario-classico': 'aquario',
  'lareira-classica': 'arquipelago:lareira-classica',
  'banda-classica': 'arquipelago:banda-classica',
  'fliperama-classico': 'fliperama',
  'museu-classico': 'arquipelago:museu-classico',
  'casinha-classica': 'arquipelago:casinha-classica',
  'planta-interior-classica': 'planta',
  // As versões retrô e moderna (B8) são só do Arquipélago.
  'geladeira-retro': 'arquipelago:geladeira-retro',
  'geladeira-moderna': 'arquipelago:geladeira-moderna',
  'forno-retro': 'arquipelago:forno-retro',
  'forno-moderno': 'arquipelago:forno-moderno',
  'aquario-retro': 'arquipelago:aquario-retro',
  'aquario-moderno': 'arquipelago:aquario-moderno',
  'lareira-retro': 'arquipelago:lareira-retro',
  'lareira-moderna': 'arquipelago:lareira-moderna',
  'banda-retro': 'arquipelago:banda-retro',
  'banda-moderna': 'arquipelago:banda-moderna',
  'fliperama-retro': 'arquipelago:fliperama-retro',
  'fliperama-moderno': 'arquipelago:fliperama-moderno',
  'museu-retro': 'arquipelago:museu-retro',
  'museu-moderno': 'arquipelago:museu-moderno',
  'casinha-retro': 'arquipelago:casinha-retro',
  'casinha-moderna': 'arquipelago:casinha-moderna',
  'planta-interior-retro': 'arquipelago:planta-interior-retro',
  'planta-interior-moderna': 'arquipelago:planta-interior-moderna',
} as const satisfies Record<IdDaGaleria, string>

export type ItemDaGaleria = (typeof ITEM_DA_APARENCIA)[IdDaGaleria]

export function destinosDaAparencia(id: IdDaGaleria): readonly ('quarto' | 'arquipelago')[] {
  return ITEM_DA_APARENCIA[id].startsWith('arquipelago:')
    ? ['arquipelago']
    : ['quarto', 'arquipelago']
}

export function aparenciaDoItem(itemId: string): IdDaGaleria | undefined {
  return IDS_DA_GALERIA.find((id) => ITEM_DA_APARENCIA[id] === itemId)
}

/** Preço único: o menor dos preços anteriores, sem cobrar diferença de quem já comprou. */
export function precoDoItemCompartilhado(itemId: string): number | undefined {
  const id = aparenciaDoItem(itemId)
  return id ? GALERIA[id].preco : undefined
}

export const DonoDaGaleriaSchema = z.strictObject({
  userId: z.uuid(),
  accountId: z.uuid(),
  audience: z.enum(['kids', 'adult']),
})
export type DonoDaGaleria = z.infer<typeof DonoDaGaleriaSchema>

/** Apenas S2S. O privilégio vem da identidade confiável do serviço, nunca do corpo público. */
export const PedidoDePosseDaGaleriaSchema = DonoDaGaleriaSchema.extend({
  aparencia: z.enum(IDS_DA_GALERIA),
  equipe: z.boolean(),
})
export type PedidoDePosseDaGaleria = z.infer<typeof PedidoDePosseDaGaleriaSchema>

export const PosseDaGaleriaSchema = z.strictObject({
  versao: z.literal(1),
  possuidas: z
    .array(z.enum(IDS_DA_GALERIA))
    .max(IDS_DA_GALERIA.length)
    .refine((ids) => new Set(ids).size === ids.length, 'Aparência repetida'),
  saldo: z.number().int().min(0),
})
export type PosseDaGaleria = z.infer<typeof PosseDaGaleriaSchema>

export const ResultadoDaCompraDaGaleriaSchema = z.discriminatedUnion('ok', [
  z.strictObject({ ok: z.literal(true), posse: PosseDaGaleriaSchema, jaPossuia: z.boolean() }),
  z.strictObject({
    ok: z.literal(false),
    codigo: z.enum(['SALDO_INSUFICIENTE', 'DONO_DIFERENTE']),
  }),
])
export type ResultadoDaCompraDaGaleria = z.infer<typeof ResultadoDaCompraDaGaleriaSchema>
