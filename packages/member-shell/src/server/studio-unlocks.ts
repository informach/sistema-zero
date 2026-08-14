import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'

/**
 * Deriva as EXTENSÕES a partir dos blocos conquistados.
 *
 * Regra da usuária: "se tiver blocos daquela extensão que eu tô liberando, automaticamente
 * vai estar liberando aquela extensão" — ou seja, ninguém declara extensão à mão; a lista
 * de blocos decide. O vínculo bloco→extensão vem do catálogo do próprio Studio
 * (`SERVER_BLOCK_CATALOG.extension`), então não há mapa duplicado para drifar aqui.
 *
 * ⚠️ Este módulo vive em `server/` de propósito: ele importa o catálogo INTEIRO de blocos,
 * que é grande. O `lib/studio-tier.ts` é importado por componentes de CLIENTE (a checagem
 * de remix no Mural) e não pode arrastar isso para o bundle do navegador — por isso quem
 * resolve as extensões é a página (Server Component), que passa o resultado pronto.
 */
const EXTENSION_BY_BLOCK = new Map(
  SERVER_BLOCK_CATALOG.filter((entry) => entry.extension).map((entry) => [
    entry.type,
    entry.extension as string,
  ]),
)

export function extensionsForBlocks(blocks: readonly string[]): string[] {
  const extensions = new Set<string>()
  for (const type of blocks) {
    const extension = EXTENSION_BY_BLOCK.get(type)
    if (extension) extensions.add(extension)
  }
  return [...extensions]
}

/** Uma "gaveta" da caixa de ferramentas, do jeito que a criança a vê na paleta. */
export interface StudioDrawer {
  /** Nome da gaveta com emoji, ex.: `💥 Colisões`, `🚀 Kit espaço`. */
  name: string
  /** Quantos blocos conquistados moram nela. */
  count: number
}

/**
 * O nome que a criança REALMENTE lê na paleta: a folha do `palettePath` (ex.:
 * `Programação › 🏷️ Variáveis` → `🏷️ Variáveis`). `subcategory`/`category` são o
 * fallback — `palettePath` fica vazio p/ bloco que não mora em paleta nenhuma.
 */
const DRAWER_BY_BLOCK = new Map(
  SERVER_BLOCK_CATALOG.map((entry) => [
    entry.type,
    entry.palettePath.at(-1) || entry.subcategory || entry.category,
  ]),
)

/**
 * Agrupa os blocos conquistados nas GAVETAS da caixa de ferramentas — é assim que a
 * recompensa fica legível p/ criança ("você ganhou 💥 Colisões"), em vez de uma lista de
 * ids. Ordenado da gaveta mais cheia p/ a mais vazia; bloco fora do catálogo é ignorado
 * (id velho de um currículo antigo não vira gaveta fantasma).
 */
export function drawersForBlocks(blocks: readonly string[]): StudioDrawer[] {
  const byDrawer = new Map<string, number>()
  for (const type of blocks) {
    const drawer = DRAWER_BY_BLOCK.get(type)
    if (!drawer) continue
    byDrawer.set(drawer, (byDrawer.get(drawer) ?? 0) + 1)
  }
  return [...byDrawer]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'))
}
