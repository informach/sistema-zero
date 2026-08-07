import * as Blockly from 'blockly/core'

/**
 * Devolve ao flyout a altura de rolagem que o Blockly descarta quando o conteúdo
 * não começa colado no topo.
 *
 * ## O defeito
 *
 * A busca reserva o espaço do campo de digitação com um separador no topo dos
 * resultados (`searchCategory.ts`). O separador do Blockly **não tem DOM** — ele
 * empurra o `cursorY` do layout, mas não existe no SVG. E a rolagem do flyout é
 * calculada a partir do *bounding box do canvas*, que só conhece o que foi
 * desenhado:
 *
 * ```js
 * getContentMetrics(a) { const b = this.getBoundingBox(); return { height: …, top: b.y * a, … } }
 * getScrollMetrics(a, b, c) {
 *   b = c || this.getContentMetrics();  c = this.flyout_.MARGIN * scale;
 *   return { height: (b.height + 2 * c) / a, …, top: 0, left: 0 }   // ← o `top` do conteúdo SOME
 * }
 * ```
 *
 * Com o conteúdo começando em `MARGIN + G` (G = o gap do separador) e a faixa
 * rolável indo de `0` a `altura + 2·MARGIN`, sobram **`G − MARGIN` pixels
 * inalcançáveis no rodapé** — na prática ~40px, o suficiente para cortar o último
 * bloco do resultado por mais que a criança role.
 *
 * ## Por que a conta é esta
 *
 * ⭐ `max(0, topo − MARGIN)` vale ZERO nas categorias normais, cujo conteúdo
 * começa exatamente em `MARGIN`. Isso importa porque **o flyout é um só**,
 * compartilhado por todas as categorias da toolbox: assim só a busca muda de
 * comportamento, sem número mágico e sem precisar perguntar "estou na busca?".
 *
 * ⚠️ Se um upgrade do Blockly mudar essas medidas, a conta degrada sozinha (não
 * finita ou ≤ 0 → devolve o cálculo original) em vez de quebrar a rolagem.
 */
export class SearchAwareFlyoutMetrics extends Blockly.FlyoutMetricsManager {
  override getScrollMetrics(
    getWorkspaceCoordinates?: boolean,
    viewMetrics?: Region,
    contentMetrics?: Region,
  ): Region {
    const base = super.getScrollMetrics(getWorkspaceCoordinates, viewMetrics, contentMetrics)
    const content = contentMetrics ?? this.getContentMetrics()
    const scale = this.workspace_.scale || 1
    // O `top` do conteúdo e a margem estão os dois em PIXELS aqui; o resultado
    // volta para coordenadas de workspace pelo mesmo divisor que o Blockly usa.
    const perdido = content.top - this.flyout_.MARGIN * scale
    if (!Number.isFinite(perdido) || perdido <= 0) return base
    return { ...base, height: base.height + perdido / (getWorkspaceCoordinates ? scale : 1) }
  }
}

/** Mesma forma do `ContainerRegion` (o `blockly/core` não reexporta o tipo). */
interface Region {
  height: number
  width: number
  top: number
  left: number
}

/** Flyouts já ajustados — o ajuste é idempotente, mas trocar o manager não é de graça. */
const ajustados = new WeakSet<object>()

/** Só o que o instalador toca (o `searchCategory` tipa o flyout estruturalmente). */
export interface FlyoutComWorkspace {
  getWorkspace?(): { setMetricsManager?(manager: unknown): void } | null
}

/**
 * Instala o cálculo corrigido no flyout, uma vez por workspace de flyout.
 *
 * Usa só API pública (`getWorkspace`/`setMetricsManager` — é o próprio construtor
 * do `Flyout` que chama o segundo), então não entra na lista de internos
 * defendidos do `searchCategory`. Ainda assim é tolerante: sem os métodos, a
 * busca fica como está hoje em vez de estourar.
 */
export function installSearchFlyoutMetrics(flyout: FlyoutComWorkspace | null | undefined): void {
  if (!flyout || typeof flyout.getWorkspace !== 'function') return
  const workspace = flyout.getWorkspace()
  if (!workspace || ajustados.has(workspace)) return
  if (typeof workspace.setMetricsManager !== 'function') return
  ajustados.add(workspace)
  workspace.setMetricsManager(
    new SearchAwareFlyoutMetrics(
      workspace as unknown as Blockly.WorkspaceSvg,
      flyout as unknown as Blockly.IFlyout,
    ),
  )
}
