import { z } from 'zod'

/**
 * As peças de época de cada festa. Desde 31/10/2026 (§6.28, A21) as da festa em vigor são
 * concedidas no avatar pelo serviço (`roupas.ts`); a carteira e o catálogo continuam do Members.
 */
export const VESTUARIO_DAS_FESTAS = {
  carnaval: { titulo: 'Ideias para o Carnaval', pecas: ['face-08', 'enfeite-03'] },
  junina: { titulo: 'Ideias para a Festa Junina', pecas: ['top-06', 'enfeite-01'] },
  lanternas: { titulo: 'Ideias para a Noite das Lanternas', pecas: ['enfeite-04', 'outfit-06'] },
  'fim-de-ano': { titulo: 'Ideias para o fim de ano', pecas: ['acc-10', 'top-05'] },
} as const

export const MoldeDoVestuarioSchema = z.strictObject({
  versao: z.literal(1),
  festa: z.enum(['carnaval', 'junina', 'lanternas', 'fim-de-ano']),
})
export type MoldeDoVestuario = z.infer<typeof MoldeDoVestuarioSchema>
