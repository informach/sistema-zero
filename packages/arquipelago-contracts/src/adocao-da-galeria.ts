import { z } from 'zod'
import { IDS_DA_GALERIA } from './galeria'

/** Transferência operacional entre serviços. Nunca aceitar este arquivo em rota de jogador. */
export const CompraHistoricaDaGaleriaSchema = z.strictObject({
  jogadorId: z.uuid(),
  publico: z.enum(['kids', 'adulto']).nullable(),
  contaId: z.uuid().nullable(),
  aparencia: z.enum(IDS_DA_GALERIA),
  moedas: z.number().int().min(0).max(1_000_000),
  chave: z.uuid(),
  situacao: z.enum(['pendente', 'paga']),
  criadaEm: z.iso.datetime({ offset: true }),
  pagaEm: z.iso.datetime({ offset: true }).nullable(),
})
export type CompraHistoricaDaGaleria = z.infer<typeof CompraHistoricaDaGaleriaSchema>
export const TransferenciaDaGaleriaSchema = z
  .strictObject({
    formato: z.literal('arquipelago-posse'),
    versao: z.literal(1),
    exportadoEm: z.iso.datetime({ offset: true }),
    compras: z.array(CompraHistoricaDaGaleriaSchema).max(100_000),
  })
  .superRefine((arquivo, ctx) => {
    const chaves = new Set<string>(),
      itens = new Set<string>()
    arquivo.compras.forEach((compra, i) => {
      const item = `${compra.jogadorId}:${compra.aparencia}`
      if (chaves.has(compra.chave) || itens.has(item))
        ctx.addIssue({
          code: 'custom',
          path: ['compras', i],
          message: 'Compra repetida na transferência',
        })
      chaves.add(compra.chave)
      itens.add(item)
    })
  })
