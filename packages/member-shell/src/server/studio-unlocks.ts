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
  /**
   * O `palettePath` INTEIRO — identidade estável e única da gaveta.
   *
   * ⚠️⚠️ NUNCA volte a chavear pela FOLHA do caminho. Medido no catálogo real (1467 blocos):
   * 182 nomes de folha distintos, dos quais **12 se repetem em famílias diferentes**, cobrindo
   * 176 blocos (12%). `🔊 Som` existe em QUATRO famílias (Jogo 2D, Jogo 2D Avançado, Jogo 3D e
   * Jogo 3D Avançado); `🎨 Aparência` e `🔤 Texto` em três. Chaveando pela folha as quatro
   * viravam UMA gaveta com a contagem somada, e a criança que abrisse o Jogo 3D veria a gaveta
   * do Jogo 2D "crescer" em vez de ganhar uma caixa nova.
   *
   * O caminho inteiro também cobre a colisão DENTRO de uma família: os kits do Jogo 2D/3D
   * Avançado têm três segmentos (`Jogo 2D Avançado › 🧙 Kit RPG › 💬 NPCs`), e a folha sozinha
   * jogava fora o segmento do meio, que é justamente o nome do kit.
   */
  key: string
  /**
   * `palettePath[0]`: a categoria de TOPO que a criança lê na paleta do Blockly
   * ("Jogo 2D", "Jogo 3D", "Programação"). É o que desambigua as gavetas homônimas na tela.
   *
   * ⚠️ Não confundir com o DEGRAU do curso ("Iniciante 2D"), que é vocabulário da equipe e não
   * pode aparecer para a criança. Este aqui é literalmente o rótulo que ela já vê no editor.
   */
  family: string
  /** O resto do caminho: `💥 Colisões`, ou `🧙 Kit RPG › 💬 NPCs` nos kits de três níveis. */
  label: string
  /** Quantos blocos conquistados moram nela. */
  count: number
}

/** Snapshot para detectar ganhos por identidade estável, sem usar o nome mutável da gaveta. */
export interface StudioDrawerSnapshot {
  key: string
  family: string
  label: string
  blockIds: string[]
}

/** Uma família com as gavetas que a criança conquistou dentro dela. */
export interface StudioDrawerFamily {
  family: string
  drawers: StudioDrawer[]
  drawerCount: number
  blockCount: number
}

interface DrawerIdentity {
  key: string
  family: string
  label: string
}

/** O separador que o próprio `palettePath` usa quando é mostrado como trilha. */
const PATH_SEPARATOR = ' › '

/**
 * Resolve a identidade da gaveta a partir do caminho da paleta.
 *
 * `subcategory`/`category` seguem como fallback para bloco que não mora em paleta nenhuma
 * (hoje são ZERO blocos, mas o fallback custa nada e evita gaveta fantasma se isso mudar).
 */
function drawerIdentityOf(entry: (typeof SERVER_BLOCK_CATALOG)[number]): DrawerIdentity {
  const path = entry.palettePath
  const family = path[0]
  if (family) {
    const rest = path.slice(1)
    return {
      key: path.join(PATH_SEPARATOR),
      family,
      // Caminho de UM segmento só (o `🗂️ Áreas do projeto`) não tem folha: a família é o rótulo.
      label: rest.length > 0 ? rest.join(PATH_SEPARATOR) : family,
    }
  }
  const fallback = entry.subcategory || entry.category
  return { key: fallback, family: fallback, label: fallback }
}

const DRAWER_BY_BLOCK = new Map(
  SERVER_BLOCK_CATALOG.map((entry) => [entry.type, drawerIdentityOf(entry)]),
)

/**
 * Agrupa os blocos conquistados nas GAVETAS da caixa de ferramentas — é assim que a
 * recompensa fica legível p/ criança ("você ganhou 💥 Colisões"), em vez de uma lista de
 * ids. Ordenado da gaveta mais cheia p/ a mais vazia; bloco fora do catálogo é ignorado
 * (id velho de um currículo antigo não vira gaveta fantasma).
 */
export function drawersForBlocks(blocks: readonly string[]): StudioDrawer[] {
  const byDrawer = new Map<string, StudioDrawer>()
  for (const type of blocks) {
    const drawer = DRAWER_BY_BLOCK.get(type)
    if (!drawer) continue
    const current = byDrawer.get(drawer.key)
    if (current) current.count += 1
    else byDrawer.set(drawer.key, { ...drawer, count: 1 })
  }
  return [...byDrawer.values()].sort(
    // ⚠️ O 3º critério é a CHAVE, não o rótulo: gavetas homônimas de famílias diferentes empatam
    // em `count` E em `label`, e sem ele a ordem cairia na de inserção (a ordem em que os blocos
    // do currículo chegaram), mudando de um curso para outro sem motivo visível.
    (a, b) =>
      b.count - a.count ||
      a.label.localeCompare(b.label, 'pt-BR') ||
      a.key.localeCompare(b.key, 'pt-BR'),
  )
}

/**
 * Agrupa as gavetas pela FAMÍLIA, que é como o perfil as mostra.
 *
 * Sem isto a lista cresce para sempre numa fileira só de pílulas (16 hoje, com UMA extensão)
 * e as gavetas homônimas de famílias diferentes ficam lado a lado sem nada as distinguindo.
 * A ordem das gavetas DENTRO da família é a que entrou (mais cheia primeiro).
 */
export function groupDrawersByFamily(drawers: readonly StudioDrawer[]): StudioDrawerFamily[] {
  const byFamily = new Map<string, StudioDrawer[]>()
  for (const drawer of drawers) {
    const current = byFamily.get(drawer.family)
    if (current) current.push(drawer)
    else byFamily.set(drawer.family, [drawer])
  }
  return [...byFamily]
    .map(([family, list]) => ({
      family,
      drawers: list,
      drawerCount: list.length,
      blockCount: list.reduce((sum, drawer) => sum + drawer.count, 0),
    }))
    .sort((a, b) => b.blockCount - a.blockCount || a.family.localeCompare(b.family, 'pt-BR'))
}

/**
 * Agrupa ids por gaveta para a revalidação eventual do watcher. Diferente de
 * `drawersForBlocks`, este payload não deve ir no perfil nem no chrome global.
 */
export function drawerSnapshotsForBlocks(blocks: readonly string[]): StudioDrawerSnapshot[] {
  const byDrawer = new Map<string, StudioDrawerSnapshot>()
  for (const type of new Set(blocks)) {
    const drawer = DRAWER_BY_BLOCK.get(type)
    if (!drawer) continue
    const current = byDrawer.get(drawer.key)
    if (current) current.blockIds.push(type)
    else byDrawer.set(drawer.key, { ...drawer, blockIds: [type] })
  }
  return [...byDrawer.values()]
    .map((drawer) => ({ ...drawer, blockIds: drawer.blockIds.sort() }))
    .sort(
      (a, b) =>
        b.blockIds.length - a.blockIds.length ||
        a.label.localeCompare(b.label, 'pt-BR') ||
        a.key.localeCompare(b.key, 'pt-BR'),
    )
}
