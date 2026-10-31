import type { AndarDeCima, PublicoJogo, Terreno } from '@sistemazero/arquipelago-contracts'
import type { Logger } from '@sistemazero/core/logging'
import type { RepositorioDaObraEstendida } from '../domain/obra-estendida.port'

/**
 * O andar de cima e o terreno moldado de quem é visitado (lacunas, 01/11/2026), da obra estendida
 * dele, só para ver. Sem o repositório (dev) ou com falha na leitura, a visita segue sem eles: a
 * casa de baixo continua aparecendo.
 */
export async function obraEstendidaNaVisita(
  obras: Pick<RepositorioDaObraEstendida, 'ler'> | null | undefined,
  jogadorId: string,
  publico: PublicoJogo,
  logger?: Logger,
): Promise<{ andar: AndarDeCima | null; terreno: Terreno | null }> {
  if (!obras) return { andar: null, terreno: null }
  try {
    const { obra } = await obras.ler(jogadorId, publico)
    return { andar: obra?.andar ?? null, terreno: obra?.terreno ?? null }
  } catch (erro) {
    logger?.warn('arquipelago.visitas.obra_estendida_indisponivel', {
      erro: erro instanceof Error ? erro.message : String(erro),
    })
    return { andar: null, terreno: null }
  }
}
