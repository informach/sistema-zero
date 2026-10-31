import { z } from 'zod'
import type { Festa } from './festas'
import { MORADORES_DOS_PEDIDOS, type MoradorDoPedido } from './pedidos-entrega'
import type { Salvamento } from './salvamento'
import { VESTUARIO_DAS_FESTAS } from './vestuario-festas'

/**
 * As roupas que se conquistam no jogo (§6.28, A21; a proposta: a amizade "libera receitas, roupas
 * e a página do diário"; as festas trazem "roupas de época que voltam todo ano"). São peças do
 * avatar que já existem no catálogo do Members; a posse é dele (o mesmo inventário da loja do
 * avatar). O serviço do jogo confere a conquista pelo salvamento guardado e pede a concessão.
 */
export const CORACOES_DA_ROUPA = 3

/** Uma peça por morador, aos três corações (escolha editorial, peças pagas do catálogo). */
export const ROUPAS_DA_AMIZADE: Readonly<Record<MoradorDoPedido, string>> = {
  capi: 'acc-09',
  bento: 'top-04',
  mare: 'glasses-05',
  floco: 'hat-01',
  jade: 'hat-04',
  irie: 'outfit-02',
  nico: 'hat-02',
}

/** As roupas da festa em vigor: as duas feitas para ela (B16); as outras são só sugestões. */
export function roupasDaFesta(festa: Festa | null): readonly string[] {
  return festa ? VESTUARIO_DAS_FESTAS[festa].conquista : []
}

/** Tudo o que a criança já conquistou: as roupas da amizade e as da festa em vigor. */
export function roupasConquistadas(s: Salvamento, festa: Festa | null): string[] {
  const pecas = new Set<string>(roupasDaFesta(festa))
  for (const quem of MORADORES_DOS_PEDIDOS)
    if (Math.floor(s.moradores[quem].amizade / 100) >= CORACOES_DA_ROUPA)
      pecas.add(ROUPAS_DA_AMIZADE[quem])
  return [...pecas].sort()
}

/** De onde veio a peça (para a fala do Zappy). */
export function origemDaRoupa(
  peca: string,
): { tipo: 'amizade'; quem: MoradorDoPedido } | { tipo: 'festa' } {
  const quem = MORADORES_DOS_PEDIDOS.find((m) => ROUPAS_DA_AMIZADE[m] === peca)
  return quem ? { tipo: 'amizade', quem } : { tipo: 'festa' }
}

const Peca = z.string().regex(/^[a-z]+-[a-z0-9]+$/)

/** `POST /arquipelago/roupas/sincronizar`: as peças que chegaram agora ao avatar. */
export const RoupasConcedidasSchema = z.strictObject({
  versao: z.literal(1),
  novas: z.array(Peca).max(20),
})
export type RoupasConcedidas = z.infer<typeof RoupasConcedidasSchema>

/** A porta S2S do Members (`POST /members/internal/arquipelago/avatar/pecas`). */
export const PedidoDeRoupasSchema = z.strictObject({
  userId: z.uuid(),
  accountId: z.uuid(),
  audience: z.enum(['kids', 'adult']),
  pecas: z.array(Peca).min(1).max(20),
})
export type PedidoDeRoupas = z.infer<typeof PedidoDeRoupasSchema>

export const RespostaDasRoupasSchema = z.union([
  z.strictObject({ ok: z.literal(true), concedidas: z.array(Peca).max(20) }),
  z.strictObject({ ok: z.literal(false), code: z.string().min(1).max(60) }),
])
export type RespostaDasRoupas = z.infer<typeof RespostaDasRoupasSchema>
