import { DEFAULT_FUNNEL } from './registry'

/**
 * Um cookie de lead so pode ser reaproveitado dentro do mesmo funil. A excecao e
 * lead legado sem `funnel`, que pertence ao funil default pre-multifunil.
 */
export function leadBelongsToFunnel(
  leadFunnel: string | null | undefined,
  funnelKey: string,
): boolean {
  return leadFunnel === funnelKey || (!leadFunnel && funnelKey === DEFAULT_FUNNEL.key)
}
