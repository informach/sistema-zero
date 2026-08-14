import { resolveStudioTier } from '@sistemazero/member-shell/lib/studio-tier'

/**
 * Pode oferecer o atalho "abrir/criar no Estúdio" para esta criança?
 *
 * São DUAS condições, e esquecer a segunda foi um clique morto real: a **posse** do
 * produto (vendido à parte) e o **`freeStudio`** da carreira — o Estúdio LIVRE só abre no
 * Construtor. Uma Faísca com o produto comprado e o catálogo ainda vazio cai no estado
 * "Você está em dia!", e o botão a levava direto para a tela de Estúdio bloqueado pela
 * carreira.
 *
 * Vive num helper próprio porque o atalho aparece em três telas (mapa, trilha vazia e
 * "Minhas ferramentas") e a régua tem que ser a mesma nas três.
 */
export function canOpenFreeStudio(
  ownsStudio: boolean,
  levelSlug: string | undefined,
  role: string | undefined,
): boolean {
  if (!ownsStudio) return false
  return resolveStudioTier(levelSlug, role).freeStudio
}
