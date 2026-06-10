import * as Blockly from 'blockly/core'
import { dynamicCategoryBlockTypes } from './paramsFlyout'

/**
 * O plugin `@blockly/toolbox-search` registra a categoria `search` colocando um
 * <input> dentro da LINHA da categoria (substituindo o rótulo) e com textos em
 * inglês. Aqui re-registramos sobre o mesmo `kind: 'search'` para:
 *  - mostrar só o título "Pesquisar" na linha, alinhado com as outras categorias;
 *  - mover o campo de busca para DENTRO do flyout (drawer), estilizado e sem
 *    cobrir o conteúdo (empurramos o conteúdo do flyout para baixo);
 *  - traduzir os textos para PT-BR;
 *  - corrigir o "primeiro clique não ativa" (reposiciona até o flyout existir).
 */
const KIND = 'search'

interface SearchCategoryInstance {
  createDom_(): HTMLElement
  createIconDom_(): Element
  createLabelDom_(name: string): HTMLElement
  getName(): string
  matchBlocks(): void
  initBlockSearcher(): void
  onClick(e: Event): void
  setSelected(isSelected: boolean): void
  registerShortcut?(): void
  dispose(): void
  searchField?: HTMLInputElement
  flyoutItems_: Array<{ kind: string; text?: string; type?: string }>
  // Blockly 12: devolve FlyoutItemInfo prontos (`{ kind: 'block', type, ... }`),
  // não mais `string[]` como no Blockly 11.
  blockSearcher?: {
    blockTypesMatching(query: string): Array<{ kind: string; type?: string }>
    indexBlocks(blocks: Array<{ kind: string; type?: string }>): void
  }
  rowContents_?: HTMLElement | null
  workspace_?: { getInjectionDiv?(): HTMLElement } | null
  parentToolbox_?: {
    refreshSelection?(): void
    getFlyout(): {
      svgGroup_?: SVGGraphicsElement
      getWorkspace?(): { getCanvas?(): SVGElement | null } | null
    } | null
  } | null
}

type SearchCategoryCtor = new (...args: unknown[]) => SearchCategoryInstance

let registered = false

function isSearchCategoryCtor(value: unknown): value is SearchCategoryCtor {
  return typeof value === 'function'
}

function supportsSearchCategoryOverrides(Base: SearchCategoryCtor): boolean {
  const prototype = Base.prototype as Record<string, unknown>
  return [
    'createDom_',
    'createIconDom_',
    'createLabelDom_',
    'getName',
    'setSelected',
    'dispose',
  ].every((method) => typeof prototype[method] === 'function')
}

function getInjectionDiv(category: SearchCategoryInstance): HTMLElement | null {
  const getInjectionDiv = category.workspace_?.getInjectionDiv
  if (typeof getInjectionDiv !== 'function') return null
  const injectionDiv = getInjectionDiv.call(category.workspace_)
  return injectionDiv instanceof HTMLElement ? injectionDiv : null
}

/** Re-registra a categoria de busca em português e com o input no flyout. */
export function registerPtSearchCategory(): void {
  if (registered) return
  const Base = Blockly.registry.getClass(Blockly.registry.Type.TOOLBOX_ITEM, KIND) as unknown
  if (!isSearchCategoryCtor(Base) || !supportsSearchCategoryOverrides(Base)) return

  class PtSearchCategory extends Base {
    // O plugin registra um atalho GLOBAL ("startSearch") no ShortcutRegistry e
    // LANÇA se ele já existir — a 2ª instância de <Studio> com o modo Blocos
    // aberto derrubava o painel inteiro. Desregistra o anterior antes de
    // delegar (último registrado fica com o atalho de teclado; limitação
    // conhecida de multi-instância, o resto da busca funciona normal).
    override registerShortcut(): void {
      const registry = Blockly.ShortcutRegistry.registry
      if (registry.getRegistry().startSearch) registry.unregister('startSearch')
      super.registerShortcut?.()
    }

    override createDom_(): HTMLElement {
      const dom = super.createDom_()
      const field = this.searchField
      if (field) {
        field.placeholder = 'Pesquisar blocos...'
        stylizeSearchField(field)
        // Move o input da LINHA para o flyout (flutua sobre o topo do drawer).
        getInjectionDiv(this)?.appendChild(field)
        field.style.display = 'none'
      }
      // Restaura ícone + rótulo na linha (igual às outras categorias) para que o
      // título "Pesquisar" fique alinhado, em vez de colado na esquerda.
      if (this.rowContents_) {
        this.rowContents_.replaceChildren(
          this.createIconDom_(),
          this.createLabelDom_(this.getName()),
        )
        // Centraliza verticalmente o ícone+rótulo (sem isso o título fica colado
        // na borda inferior da linha).
        this.rowContents_.style.display = 'flex'
        this.rowContents_.style.alignItems = 'center'
      }
      return dom
    }

    // O onClick do plugin alternava a seleção comparando com o item já
    // selecionado, o que no primeiro clique desfazia o foco. Aqui só impedimos
    // o comportamento padrão; a toolbox seleciona e chama setSelected(true).
    override onClick(e: Event): void {
      e.preventDefault()
      e.stopPropagation()
    }

    override setSelected(isSelected: boolean): void {
      super.setSelected(isSelected)
      const field = this.searchField
      if (!field) return
      if (isSelected) {
        field.style.display = ''
        field.style.visibility = 'hidden'
        this.matchBlocks()
        this.showFieldWhenReady()
      } else {
        field.style.display = 'none'
        field.style.visibility = 'hidden'
        field.value = ''
      }
    }

    override matchBlocks(): void {
      // Replica a lógica do plugin controlando o texto em PT-BR diretamente
      // (sem o "flash" em inglês que ocorre ao traduzir depois do super).
      const value = this.searchField?.value ?? ''
      // Blockly 12 (@blockly/toolbox-search v3): `blockTypesMatching` já devolve
      // os FlyoutItemInfo prontos (`{ kind: 'block', type, ... }`). Atribuímos
      // direto — o `.map()` antigo (era `string[]` no Blockly 11) embrulhava cada
      // item num `type` = objeto inválido e o flyout não renderizava nada.
      this.flyoutItems_ = value ? (this.blockSearcher?.blockTypesMatching(value) ?? []) : []
      if (this.flyoutItems_.length === 0) {
        this.flyoutItems_.push({
          kind: 'label',
          text: value.length < 3 ? 'Digite para pesquisar blocos' : 'Nenhum bloco encontrado',
        })
      }
      this.parentToolbox_?.refreshSelection?.()
      // O flyout re-renderiza (resetando o deslocamento) — reposiciona depois.
      requestAnimationFrame(() => this.positionField())
    }

    // O indexador do plugin só varre o `languageTree` ESTÁTICO; as categorias
    // dinâmicas (Funções/Classes, via `custom:`) ficavam de fora e seus blocos
    // não apareciam na busca. Indexamos esses tipos também.
    override initBlockSearcher(): void {
      super.initBlockSearcher()
      const extra = dynamicCategoryBlockTypes().map((type) => ({ kind: 'block', type }))
      this.blockSearcher?.indexBlocks(extra)
    }

    override dispose(): void {
      this.searchField?.remove()
      super.dispose()
    }

    /** Tenta posicionar o input por alguns frames até o flyout existir. */
    private showFieldWhenReady(tries = 0): void {
      if (this.positionField()) {
        this.searchField?.focus()
        return
      }
      if (tries < 15) requestAnimationFrame(() => this.showFieldWhenReady(tries + 1))
    }

    private positionField(): boolean {
      const field = this.searchField
      const inj = getInjectionDiv(this)
      const flyout = this.parentToolbox_?.getFlyout()
      const flyoutSvg = flyout?.svgGroup_
      if (!field || !inj || !flyout || !flyoutSvg) return false
      if (typeof flyoutSvg.getBoundingClientRect !== 'function') return false
      const fr = flyoutSvg.getBoundingClientRect()
      // Flyout ainda não renderizado/visível.
      if (fr.width === 0 || fr.height === 0) return false
      const ir = inj.getBoundingClientRect()
      field.style.left = `${fr.left - ir.left + 8}px`
      field.style.top = `${fr.top - ir.top + 8}px`
      field.style.width = `${Math.max(fr.width - 16, 100)}px`
      field.style.visibility = 'visible'
      // Empurra o conteúdo do flyout para baixo, para o input não cobri-lo.
      const offset = Math.round(field.getBoundingClientRect().height) + 14
      const canvas = flyout.getWorkspace?.()?.getCanvas?.()
      canvas?.setAttribute('transform', `translate(0, ${offset})`)
      return true
    }
  }

  Blockly.registry.register(Blockly.registry.Type.TOOLBOX_ITEM, KIND, PtSearchCategory, true)
  registered = true
}

/**
 * Visual do campo de busca dentro do flyout: sem outline, com padding. Usa os
 * tokens da paleta (o input vive dentro da injection div, que está sob o
 * [data-sz-theme] do root do Studio — claro/escuro acompanham o tema).
 */
function stylizeSearchField(field: HTMLInputElement): void {
  Object.assign(field.style, {
    position: 'absolute',
    zIndex: '90',
    boxSizing: 'border-box',
    margin: '0',
    padding: '8px 12px',
    border: 'none',
    outline: 'none',
    borderRadius: '8px',
    background: 'var(--color-sz-bg)',
    color: 'var(--color-sz-fg)',
    fontSize: '13px',
    fontFamily: 'var(--font-family-sans)',
    boxShadow: '0 0 0 1px var(--color-sz-border)',
  } satisfies Partial<CSSStyleDeclaration>)
}
