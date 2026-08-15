import * as Blockly from 'blockly/core'

/** Item sem DOM que reserva a faixa vertical do campo no flyout horizontal. */
const SEARCH_HEADER_KIND = 'sz_search_header'

export interface SearchHeaderInfo {
  kind: typeof SEARCH_HEADER_KIND
  gap: number
}

/** Definição consumida apenas pelo flyout horizontal customizado do Studio. */
export function searchHeaderInfo(gap: number): SearchHeaderInfo {
  return { kind: SEARCH_HEADER_KIND, gap }
}

/**
 * Marcador estrutural do cabeçalho da busca.
 *
 * O elemento não é desenhado nem participa da navegação. Sua altura é lida pelo
 * layout do flyout; o retângulo permanece vazio para que ele não vire conteúdo
 * rolável nem altere a largura horizontal.
 */
class SearchHeaderSpacer implements Blockly.IBoundedElement, Blockly.IFocusableNode {
  constructor(
    readonly height: number,
    private readonly focusTree: Blockly.IFocusableTree,
  ) {}

  getBoundingRectangle(): Blockly.utils.Rect {
    return new Blockly.utils.Rect(0, 0, 0, 0)
  }

  moveBy(): void {}

  getFocusableElement(): HTMLElement | SVGElement {
    throw new Error('O espaçador do cabeçalho da busca não recebe foco.')
  }

  getFocusableTree(): Blockly.IFocusableTree {
    return this.focusTree
  }

  onNodeFocus(): void {}

  onNodeBlur(): void {}

  canBeFocused(): boolean {
    return false
  }
}

function headerHeightFromState(state: object): number {
  if (!('gap' in state)) return 0
  const gap = state.gap
  return typeof gap === 'number' && Number.isFinite(gap) && gap > 0 ? gap : 0
}

class SearchHeaderInflater implements Blockly.IFlyoutInflater {
  load(state: object, flyout: Blockly.IFlyout): Blockly.FlyoutItem {
    const spacer = new SearchHeaderSpacer(headerHeightFromState(state), flyout.getWorkspace())
    return new Blockly.FlyoutItem(spacer, SEARCH_HEADER_KIND)
  }

  gapForItem(): number {
    return 0
  }

  disposeItem(): void {}

  getType(): string {
    return SEARCH_HEADER_KIND
  }
}

/**
 * Flyout horizontal que entende a faixa vertical reservada pela busca.
 *
 * No Blockly, `sep` acompanha o eixo do flyout: ele empurra Y no layout vertical,
 * mas empurra somente X no horizontal. Este flyout usa as extensões protegidas
 * oficiais (`getInflaterForType`, `layout_` e `reflowInternal_`) para expressar
 * a semântica correta. Sem o marcador da busca, o cálculo é o mesmo do Blockly.
 */
export class SearchAwareHorizontalFlyout extends Blockly.HorizontalFlyout {
  private readonly searchHeaderInflater = new SearchHeaderInflater()

  protected override getInflaterForType(type: string): Blockly.IFlyoutInflater | null {
    if (type === SEARCH_HEADER_KIND) return this.searchHeaderInflater
    return super.getInflaterForType(type)
  }

  private headerHeight(contents: Blockly.FlyoutItem[] = this.getContents()): number {
    for (const item of contents) {
      if (item.getType() !== SEARCH_HEADER_KIND) continue
      const element = item.getElement()
      if (element instanceof SearchHeaderSpacer) return element.height
    }
    return 0
  }

  protected override layout_(contents: Blockly.FlyoutItem[]): void {
    this.workspace_.scale = this.targetWorkspace.scale
    let cursorX = this.MARGIN + this.tabWidth_
    const cursorY = this.MARGIN + this.headerHeight(contents)
    const orderedContents = this.RTL ? [...contents].reverse() : contents

    for (const item of orderedContents) {
      if (item.getType() === SEARCH_HEADER_KIND) continue
      const element = item.getElement()
      const rect = element.getBoundingRectangle()
      const moveX = this.RTL ? cursorX + rect.getWidth() : cursorX
      element.moveBy(moveX, cursorY)
      cursorX += element.getBoundingRectangle().getWidth()
    }
  }

  protected override reflowInternal_(): void {
    this.workspace_.scale = this.getFlyoutScale()
    const contentHeight = this.getContents().reduce((maximum, item) => {
      if (item.getType() === SEARCH_HEADER_KIND) return maximum
      return Math.max(maximum, item.getElement().getBoundingRectangle().getHeight())
    }, 0)
    const workspaceHeight = contentHeight + this.headerHeight() + this.MARGIN * 1.5
    const flyoutHeight =
      workspaceHeight * this.workspace_.scale + Blockly.Scrollbar.scrollbarThickness

    if (this.getHeight() === flyoutHeight) return

    // Mantém o mesmo caso especial do HorizontalFlyout nativo para flyouts
    // permanentes sem scrollbar posicionados acima do workspace.
    if (
      !this.targetWorkspace.scrollbar &&
      !this.autoClose &&
      this.targetWorkspace.getFlyout() === this &&
      this.toolboxPosition_ === Blockly.TOOLBOX_AT_TOP
    ) {
      this.targetWorkspace.translate(
        this.targetWorkspace.scrollX,
        this.targetWorkspace.scrollY + flyoutHeight,
      )
    }

    this.height_ = flyoutHeight
    this.position()
    this.targetWorkspace.resizeContents()
    this.targetWorkspace.recordDragTargets()
  }
}
