import { z } from 'zod'

/**
 * As roupas de cada festa (§6.28, A21 e B16, 31/10/2026; peças do pack Cute Characters desde
 * 13/11/2026, as mesmas oito refeitas pela arte):
 * - `conquista`: uma peça de cabeça e uma de corpo feitas para a festa, que a festa em vigor
 *   concede no avatar pelo serviço (`roupas.ts`); são da faixa `festa` do catálogo (não se
 *   compram);
 * - `pecas`: sugestões de peças da loja para combinar (escolha e compra são da pessoa).
 * A carteira e o catálogo continuam do Members.
 */
export const VESTUARIO_DAS_FESTAS = {
  carnaval: {
    titulo: 'Ideias para o Carnaval',
    conquista: ['chapeu_cartola_colorida_pacote', 'roupa_cima_colete_franjas'],
    pecas: ['nariz_palhaco_pacote', 'chapeu_coroa_flores'],
  },
  junina: {
    titulo: 'Ideias para a Festa Junina',
    conquista: ['chapeu_palha_fita_pacote', 'roupa_inteira_vestido_chita'],
    pecas: ['roupa_cima_sueter_listrado_vermelho_pacote', 'chapeu_laco'],
  },
  lanternas: {
    titulo: 'Ideias para a Noite das Lanternas',
    conquista: ['chapeu_tiara_lanterninhas', 'costas_capa_estrelas'],
    pecas: ['chapeu_presilhas_estrela', 'roupa_inteira_vestido_longo'],
  },
  'fim-de-ano': {
    titulo: 'Ideias para o fim de ano',
    conquista: ['chapeu_gorro_papai_noel_pacote', 'roupa_cima_sueter_estrela'],
    pecas: ['luvas_listradas_vermelhas_pacote', 'roupa_cima_moletom_cinza_capuz_pacote'],
  },
} as const

export const MoldeDoVestuarioSchema = z.strictObject({
  versao: z.literal(1),
  festa: z.enum(['carnaval', 'junina', 'lanternas', 'fim-de-ano']),
})
export type MoldeDoVestuario = z.infer<typeof MoldeDoVestuarioSchema>
