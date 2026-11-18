import { z } from 'zod'
import {
  DefinicaoDeConjuntoSchema,
  LIMITES_CONJUNTOS,
  MontagemDeConjuntoSchema,
} from './conjuntos-schema'
import { AguaSchema } from './entidades-schema'
import { FragmentoBasicoSchema } from './fragmento-base-schema'

export { PrefixoDeColagemSchema } from './fragmento-base-schema'

/** Clipboard conserva cópias vivas; definições contêm somente o fragmento básico, sem recursão. */
export const FragmentoDeCenarioSchema = FragmentoBasicoSchema.extend({
  aguas: z.array(AguaSchema).min(1).max(256).optional(),
  definicoesConjuntos: z
    .array(DefinicaoDeConjuntoSchema)
    .min(1)
    .max(LIMITES_CONJUNTOS.definicoes)
    .optional(),
  montagens: z.array(MontagemDeConjuntoSchema).min(1).max(LIMITES_CONJUNTOS.montagens).optional(),
}).strict()
export type FragmentoDeCenario = z.infer<typeof FragmentoDeCenarioSchema>
