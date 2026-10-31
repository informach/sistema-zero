import { z } from 'zod'

/**
 * As roupas de cada festa (§6.28, A21 e B16, 31/10/2026):
 * - `conquista`: uma peça de cabeça e uma de corpo feitas para a festa, que a festa em vigor
 *   concede no avatar pelo serviço (`roupas.ts`);
 * - `pecas`: as sugestões de peças que já existiam, para combinar (escolha e compra são da pessoa).
 * A carteira e o catálogo continuam do Members.
 */
export const VESTUARIO_DAS_FESTAS = {
  carnaval: {
    titulo: 'Ideias para o Carnaval',
    conquista: ['hat-08', 'top-07'],
    pecas: ['face-08', 'enfeite-03'],
  },
  junina: {
    titulo: 'Ideias para a Festa Junina',
    conquista: ['hat-09', 'outfit-07'],
    pecas: ['top-06', 'enfeite-01'],
  },
  lanternas: {
    titulo: 'Ideias para a Noite das Lanternas',
    conquista: ['enfeite-06', 'top-08'],
    pecas: ['enfeite-04', 'outfit-06'],
  },
  'fim-de-ano': {
    titulo: 'Ideias para o fim de ano',
    conquista: ['hat-10', 'top-09'],
    pecas: ['acc-10', 'top-05'],
  },
} as const

export const MoldeDoVestuarioSchema = z.strictObject({
  versao: z.literal(1),
  festa: z.enum(['carnaval', 'junina', 'lanternas', 'fim-de-ano']),
})
export type MoldeDoVestuario = z.infer<typeof MoldeDoVestuarioSchema>
