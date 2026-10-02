import { resolveStudioTier } from '@sistemazero/member-shell/lib/studio-tier'

/** A resposta de `getStudioUnlocksReadonly()`, ou `null` quando a busca falhou. */
export interface StudioUnlocksResult {
  status: number
  body?: { blocks: readonly string[] } | null
}

/**
 * Pode oferecer o atalho "abrir/criar no Estúdio" para esta criança?
 *
 * São TRÊS condições, e cada uma já foi um clique morto real:
 * - a **posse** do produto (vendido à parte);
 * - o **`freeStudio`** da jornada: o Estúdio LIVRE só abre no Construtor. Uma Faísca com o
 *   produto comprado e o catálogo vazio cai no estado "Você está em dia!", e o botão a levava
 *   direto para a tela de Estúdio bloqueado pela jornada;
 * - algum **bloco conquistado** nos cursos (desde 02/10/2026 eles são a paleta inteira, sem
 *   reserva). Sem a terceira, um Construtor sem nenhum bloco via o atalho e caía na porta
 *   trancada do `/estudio` (`studioGate`).
 *
 * ⚠️ A lista que NÃO chegou (soluço de rede) não esconde o atalho: o `/estudio` mostra o
 * "tente de novo", e esconder aqui faria a ferramenta sumir de quem já a conquistou.
 *
 * Vive num helper próprio porque o atalho aparece em várias telas (mapa, trilha, perfil,
 * ranking) e a régua tem que ser a mesma em todas.
 */
export function canOpenFreeStudio(
  ownsStudio: boolean,
  levelSlug: string | undefined,
  role: string | undefined,
  unlocks: StudioUnlocksResult | null,
): boolean {
  if (!ownsStudio) return false
  const blocks = unlocks?.status === 200 && unlocks.body ? unlocks.body.blocks : null
  const tier = resolveStudioTier(levelSlug, role, blocks ? { blocks, extensions: [] } : undefined)
  if (!tier.freeStudio) return false
  return blocks === null ? true : tier.hasPalette
}
