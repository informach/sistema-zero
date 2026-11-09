import * as Blockly from 'blockly/core'

/**
 * "Mais blocos" no pé da paleta (redesenho do clássico, 11/2026; era "Extensões" no menu ⋯):
 * um item próprio da paleta, registrado como o "Pesquisar" (`TOOLBOX_ITEM`). Não é categoria,
 * não abre gaveta de blocos: é um botão que abre a janela "Mais blocos" do Estúdio pelo abridor
 * que o editor pendura no workspace. Só API pública do Blockly 12 (`ToolboxItem`).
 */
export const MORE_BLOCKS_KIND = 'sz_more_blocks'

/** O abridor da janela, por workspace (o editor liga quando o host oferece extensões). */
export interface MoreBlocksWorkspace {
  __szOpenExtensions?: () => void
}

type MoreBlocksDef = Blockly.utils.toolbox.ToolboxItemInfo & { text?: string }

class MoreBlocksItem extends Blockly.ToolboxItem {
  private row: HTMLDivElement | null = null

  override init(): void {
    const row = document.createElement('div')
    row.className = 'sz-more-blocks-row'
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'sz-more-blocks'
    const plus = document.createElement('span')
    plus.setAttribute('aria-hidden', 'true')
    plus.textContent = '+'
    button.append(
      plus,
      document.createTextNode((this.toolboxItemDef_ as MoreBlocksDef)?.text ?? 'Mais blocos'),
    )
    button.addEventListener('click', (event) => {
      // A paleta trata os cliques dos itens dela; este não seleciona nada.
      event.stopPropagation()
      ;(this.workspace_ as unknown as MoreBlocksWorkspace).__szOpenExtensions?.()
    })
    row.append(button)
    this.row = row
  }

  override getDiv(): Element | null {
    return this.row
  }

  override getClickTarget(): Element | null {
    return this.row?.firstElementChild ?? null
  }

  override dispose(): void {
    this.row?.remove()
    this.row = null
  }
}

let registered = false

export function registerMoreBlocksItem(): void {
  if (registered) return
  Blockly.registry.register(
    Blockly.registry.Type.TOOLBOX_ITEM,
    MORE_BLOCKS_KIND,
    MoreBlocksItem,
    true,
  )
  registered = true
}
