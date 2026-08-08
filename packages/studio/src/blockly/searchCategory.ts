import * as Blockly from 'blockly/core'
import type { LearningProfile } from '#core'
import { palettePathOf } from './paletteMap'
import { blockedDynamicSearchTypes, dynamicCategoryBlockTypes } from './paramsFlyout'
import { installSearchFlyoutMetrics } from './searchFlyoutMetrics'

// Perfil de aprendizado POR WORKSPACE para a busca respeitar o nível. A categoria
// de busca é um registro GLOBAL (singleton por origin) e indexa os tipos
// dinâmicos (Funções/Classes) sem perfil; o BlocklyPanel publica aqui o perfil de
// cada workspace para a busca filtrar a OFERTA por nível em match time. WeakMap:
// não retém workspaces descartados.
const searchProfiles = new WeakMap<object, LearningProfile>()

/** O BlocklyPanel chama isto quando tem o workspace + perfil (mount/troca de nível). */
export function setSearchProfileForWorkspace(
  workspace: object | null,
  profile: LearningProfile,
): void {
  if (workspace) searchProfiles.set(workspace, profile)
}

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

/**
 * Piso de largura do flyout da BUSCA, em px. O conteúdo de uma busca é BLOCO,
 * não texto: dimensionado só pelo rótulo de dica, o painel nascia estreito e
 * cortava os resultados. Cede em tela estreita (ver `fitFlyoutToContents`).
 */
const MIN_SEARCH_FLYOUT_WIDTH = 300

/** Altura presumida do campo quando ele ainda não tem layout (px). */
const DEFAULT_SEARCH_FIELD_HEIGHT = 34
/** Respiro entre o campo e o primeiro bloco do resultado (px). */
const SEARCH_FIELD_MARGIN = 14

// COMPATIBILIDADE: este arquivo depende de internos PRIVADOS do Blockly e do
// plugin de busca — campos com sufixo `_` (`flyoutItems_`, `rowContents_`,
// `parentToolbox_`, `workspace_`, `svgGroup_`) e métodos `createDom_`,
// `createIconDom_`, `createLabelDom_`, `matchBlocks`, `initBlockSearcher`,
// `blockSearcher`. Eles existem e têm esta forma em `blockly@12.5` /
// `@blockly/toolbox-search@3.1` (ver versões no package.json). Qualquer minor
// pode renomeá-los/removê-los. Por isso cada acesso a um interno é defendido:
// se um esperado sumir, NÃO quebramos o painel — degradamos (a busca perde
// aquele detalhe) e emitimos UM `console.warn` identificando o interno ausente,
// para o upgrade ser diagnosticável. Quando os internos existem, o comportamento
// é idêntico ao anterior.

let warnedIncompatible = false

/**
 * Emite UM ÚNICO `console.warn` por carga do módulo apontando qual interno do
 * Blockly/plugin não casou com a suposição de versão. Evita spam (a categoria de
 * busca recria DOM e roda matchBlocks a cada tecla) e dá um rastro claro de que
 * o upgrade quebrou um interno privado.
 */
function warnIncompatibility(detail: string): void {
  if (warnedIncompatible) return
  warnedIncompatible = true
  console.warn(
    `[sistema-zero/studio] Categoria de busca de blocos: interno do Blockly/@blockly/toolbox-search ` +
      `incompatível (${detail}). Esperado blockly@12.5 / @blockly/toolbox-search@3.1. ` +
      `A busca degrada graciosamente; verifique a versão do Blockly após o upgrade.`,
  )
}

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
  flyoutItems_: Array<{ kind: string; text?: string; type?: string; gap?: number }>
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
      /** Recalcula a largura do flyout a partir do conteúdo (público no Blockly). */
      reflow?(): void
      getWidth?(): number
      /** Redesenha o fundo/posição a partir de `width_` (público no Blockly). */
      position?(): void
      /** Interno do Blockly (`protected width_`) — só escrevemos com guarda. */
      width_?: number
      /** Público no Blockly; o par `setMetricsManager` é chamado pelo próprio Flyout. */
      getWorkspace?(): { setMetricsManager?(manager: unknown): void } | null
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

/** Item de toolbox que sabe (re)registrar o atalho global da busca. */
interface ShortcutAwareItem {
  registerShortcut?(): void
}

/** Toolbox (impl. padrão do Blockly) que expõe seus itens. */
interface ToolboxWithItems {
  getToolboxItems?(): unknown[]
}

/** Workspace que pode ter uma toolbox (apenas a principal de cada injeção tem). */
interface WorkspaceWithToolbox {
  getToolbox?(): ToolboxWithItems | null
}

/**
 * Devolve o atalho global "startSearch" a uma categoria de busca AINDA viva,
 * pulando a que está sendo descartada. Percorre todos os workspaces registrados
 * e suas toolboxes procurando uma categoria de busca (item com `registerShortcut`);
 * a primeira encontrada re-registra o atalho. Sem isso, desmontar a última
 * instância montada deixava as demais sem Ctrl+B (finding multi-instância).
 */
function handBackSearchShortcut(disposing: SearchCategoryInstance): void {
  const workspaces = Blockly.common.getAllWorkspaces() as WorkspaceWithToolbox[]
  for (const ws of workspaces) {
    const toolbox = ws.getToolbox?.()
    const items = toolbox?.getToolboxItems?.()
    if (!items) continue
    for (const item of items) {
      if (item === disposing) continue
      const candidate = item as ShortcutAwareItem
      if (typeof candidate.registerShortcut === 'function') {
        candidate.registerShortcut()
        return
      }
    }
  }
}

/** Balde final para bloco que não está em nenhuma paleta (não deve existir). */
const GRUPO_SEM_CAMINHO = 'Outros blocos'

/**
 * Intercala CABEÇALHOS de "categoria › subcategoria" nos resultados da busca.
 *
 * Pedido da dona do produto: *"colocar a informação de qual categoria e
 * subcategoria cada bloco pertence, para a criança ir aprendendo onde fica cada
 * bloco"*. Achar o bloco pela busca resolve o problema de agora; saber ONDE ele
 * mora resolve o da próxima vez.
 *
 * ⭐ Os grupos saem na ordem do seu MELHOR resultado, não em ordem alfabética: a
 * criança digitou uma palavra, então o primeiro grupo tem que ser o que ela quis.
 * O `Map` preserva a ordem de inserção, que é a ordem de relevância do plugin.
 *
 * O caminho vem do `palettePathOf` — o caminho REAL da paleta, e não o `category`
 * do catálogo (que é curadoria do admin e *mente* sobre onde o bloco mora; ver o
 * cabeçalho de `paletteMap.ts`). Função pura e sem DOM: dá para rodar a cada tecla.
 */
export function groupSearchResultsByPalette<T extends { kind: string; type?: string }>(
  items: readonly T[],
): (T | { kind: 'label'; text: string })[] {
  const grupos = new Map<string, T[]>()
  for (const item of items) {
    const caminho = item.kind === 'block' && item.type ? palettePathOf(item.type) : []
    const chave = caminho.length > 0 ? caminho.join(' › ') : GRUPO_SEM_CAMINHO
    const atual = grupos.get(chave)
    if (atual) atual.push(item)
    else grupos.set(chave, [item])
  }
  // O balde dos desconhecidos vai para o FIM, onde quer que o primeiro tenha
  // aparecido: ele é deriva do mapa de paletas, não uma resposta melhor.
  const semCaminho = grupos.get(GRUPO_SEM_CAMINHO)
  if (semCaminho) {
    grupos.delete(GRUPO_SEM_CAMINHO)
    grupos.set(GRUPO_SEM_CAMINHO, semCaminho)
  }
  const saida: (T | { kind: 'label'; text: string })[] = []
  for (const [titulo, blocos] of grupos) {
    saida.push({ kind: 'label', text: titulo }, ...blocos)
  }
  return saida
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
      const registry = Blockly.ShortcutRegistry?.registry
      // Sem o ShortcutRegistry esperado não dá pra desfazer o atalho global do
      // plugin antes de re-registrar; ainda assim tentamos delegar (a 2ª
      // instância pode quebrar, mas não derrubamos esta).
      if (registry && typeof registry.getRegistry === 'function') {
        if (registry.getRegistry().startSearch) registry.unregister('startSearch')
      } else {
        warnIncompatibility('ShortcutRegistry.registry.getRegistry ausente')
      }
      super.registerShortcut?.()
    }

    override createDom_(): HTMLElement {
      const dom = super.createDom_()
      const field = this.searchField
      if (field) {
        field.type = 'search'
        field.name = 'block-search'
        field.autocomplete = 'off'
        field.spellcheck = false
        field.setAttribute('aria-label', 'Pesquisar blocos')
        field.placeholder = 'Pesquisar blocos…'
        // ⚠️ O plugin dispara a busca no `keyup`, e o "×" nativo do
        // `<input type=search>` (assim como colar/recortar pelo mouse) NÃO gera
        // keyup: limpar o campo deixava os blocos da busca anterior na tela.
        // `input` cobre todos os caminhos; o `matchBlocks` ignora repetição, então
        // o keyup do plugin logo depois não re-renderiza à toa.
        field.addEventListener('input', () => this.matchBlocks())
        stylizeSearchField(field)
        // Move o input da LINHA para o flyout (flutua sobre o topo do drawer).
        getInjectionDiv(this)?.appendChild(field)
        field.style.display = 'none'
      }
      // Restaura ícone + rótulo na linha (igual às outras categorias) para que o
      // título "Pesquisar" fique alinhado, em vez de colado na esquerda.
      // `rowContents_` é interno do plugin: se sumir, mantemos o DOM que o
      // `super` já montou (sem o realinhamento) em vez de quebrar.
      if (this.rowContents_) {
        this.rowContents_.replaceChildren(
          this.createIconDom_(),
          this.createLabelDom_(this.getName()),
        )
        // Centraliza verticalmente o ícone+rótulo (sem isso o título fica colado
        // na borda inferior da linha).
        this.rowContents_.style.display = 'flex'
        this.rowContents_.style.alignItems = 'center'
      } else {
        warnIncompatibility('rowContents_ ausente na linha da categoria')
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
        // Reabrir precisa renderizar mesmo com a mesma consulta de antes.
        this.lastRenderedQuery = null
        this.matchBlocks()
        this.showFieldWhenReady()
      } else {
        field.style.display = 'none'
        field.style.visibility = 'hidden'
        field.value = ''
        this.lastRenderedQuery = null
      }
    }

    /** Última consulta já renderizada — evita re-render duplo (input + keyup). */
    private lastRenderedQuery: string | null = null

    override matchBlocks(): void {
      // `flyoutItems_` é o array interno que o flyout renderiza. Se o plugin o
      // renomear/remover, gravar nele seria escrever numa propriedade fantasma
      // (busca silenciosamente vazia). Avisamos e saímos sem tocar em internos
      // ausentes — o painel de blocos segue de pé, só a busca não popula.
      if (!Array.isArray(this.flyoutItems_)) {
        warnIncompatibility('flyoutItems_ ausente — busca de blocos indisponível')
        return
      }
      // Replica a lógica do plugin controlando o texto em PT-BR diretamente
      // (sem o "flash" em inglês que ocorre ao traduzir depois do super).
      const value = this.searchField?.value ?? ''
      // O `input` (nosso) e o `keyup` (do plugin) chegam os dois a cada tecla —
      // renderizar o flyout duas vezes por tecla pisca e custa caro com dezenas
      // de blocos. A consulta é a identidade do resultado: repetiu, sai.
      if (value === this.lastRenderedQuery) return
      this.lastRenderedQuery = value
      const searcher = this.blockSearcher
      if (value && typeof searcher?.blockTypesMatching !== 'function') {
        warnIncompatibility('blockSearcher.blockTypesMatching ausente')
      }
      // Blockly 12 (@blockly/toolbox-search v3): `blockTypesMatching` já devolve
      // os FlyoutItemInfo prontos (`{ kind: 'block', type, ... }`). Atribuímos
      // direto — o `.map()` antigo (era `string[]` no Blockly 11) embrulhava cada
      // item num `type` = objeto inválido e o flyout não renderizava nada.
      this.flyoutItems_ =
        value && typeof searcher?.blockTypesMatching === 'function'
          ? (searcher.blockTypesMatching(value) ?? [])
          : []
      // Respeita o nível do aluno: a busca indexa Funções/Classes GLOBALMENTE (eles
      // não estão no languageTree estático já filtrado), então a OFERTA não pode
      // vazar blocos acima do perfil deste workspace — o professor pode tê-los
      // ocultado para divulgação progressiva. Espelha o gate da paleta (pushCustom).
      const profile = this.workspace_ ? searchProfiles.get(this.workspace_) : undefined
      if (profile) {
        const blocked = blockedDynamicSearchTypes(profile)
        if (blocked.size > 0) {
          this.flyoutItems_ = this.flyoutItems_.filter(
            (item) => item.kind !== 'block' || !item.type || !blocked.has(item.type),
          )
        }
      }
      // Cabeçalhos "categoria › subcategoria" entre os resultados (ver a função).
      this.flyoutItems_ = groupSearchResultsByPalette(this.flyoutItems_)
      // ⚠️ Reserva o espaço do CAMPO como um separador de verdade, e não mais
      // deslocando o canvas por `transform`: aquele atributo é do Blockly, que o
      // reescreve ao rolar/re-renderizar — o deslocamento sumia e o primeiro
      // bloco ficava embaixo do input, sem como voltar. Sendo um item do flyout,
      // o Blockly conta esse espaço no layout E na rolagem.
      const fieldHeight = Math.round(this.searchField?.getBoundingClientRect().height ?? 0)
      this.flyoutItems_.unshift({
        kind: 'sep',
        gap: (fieldHeight || DEFAULT_SEARCH_FIELD_HEIGHT) + SEARCH_FIELD_MARGIN,
      })
      if (this.flyoutItems_.length === 1) {
        // Rótulos CURTOS de propósito: quando a busca não achou nada, este texto
        // é o ÚNICO conteúdo do flyout e portanto quem define a largura dele —
        // um texto comprido aqui deixava o painel largo e a dica cortada (a
        // instrução completa já está no placeholder do campo, logo acima).
        this.flyoutItems_.push({
          kind: 'label',
          text: value.length < 3 ? 'Escreva para achar' : 'Nada encontrado',
        })
      }
      this.parentToolbox_?.refreshSelection?.()
      requestAnimationFrame(() => {
        this.fitFlyoutToContents()
        // O flyout re-renderiza (resetando o deslocamento) — reposiciona depois.
        this.positionField()
      })
    }

    /**
     * Ajusta a largura do flyout da BUSCA ao conteúdo, com um piso.
     *
     * Dois problemas somados apareciam aqui: (1) o painel ficava preso na
     * largura de quando abriu — quando o único conteúdo era o rótulo de dica —
     * e os blocos do resultado saíam cortados; (2) mesmo recalculado, ele nascia
     * estreito demais, porque o conteúdo de uma busca é BLOCO, não texto. Como
     * o campo de digitação é dimensionado A PARTIR do flyout, parecia que era o
     * input que mandava no tamanho.
     *
     * `reflow()` recalcula a partir do conteúdo (público e idempotente); o piso
     * cobre o caso do rótulo sozinho. Tudo com guarda: se o Blockly mudar esses
     * membros, a busca só deixa de alargar — nada quebra.
     */
    private fitFlyoutToContents(): void {
      const flyout = this.parentToolbox_?.getFlyout()
      if (!flyout) return
      // ⚠️ O separador que reserva o espaço do campo (acima) não tem DOM, e a
      // rolagem do flyout sai do bounding box do SVG — sem isto o FIM da lista
      // fica inalcançável e o último bloco aparece cortado. Ver o arquivo.
      installSearchFlyoutMetrics(flyout)
      flyout.reflow?.()
      if (typeof flyout.getWidth !== 'function' || typeof flyout.position !== 'function') return
      // O piso cede em tela estreita: metade do editor, nunca o editor inteiro.
      const available = getInjectionDiv(this)?.getBoundingClientRect().width ?? 0
      const floor =
        available > 0 ? Math.min(MIN_SEARCH_FLYOUT_WIDTH, available * 0.5) : MIN_SEARCH_FLYOUT_WIDTH
      if (flyout.getWidth() >= floor) return
      flyout.width_ = floor
      flyout.position()
    }

    // O indexador do plugin só varre o `languageTree` ESTÁTICO; as categorias
    // dinâmicas (Funções/Classes, via `custom:`) ficavam de fora e seus blocos
    // não apareciam na busca. Indexamos esses tipos também.
    override initBlockSearcher(): void {
      super.initBlockSearcher()
      // `blockSearcher.indexBlocks` é interno do plugin; sem ele só perdemos a
      // indexação extra das categorias dinâmicas (Funções/Classes) — a busca do
      // languageTree estático que o `super` montou continua valendo.
      const indexBlocks = this.blockSearcher?.indexBlocks
      if (typeof indexBlocks !== 'function') {
        warnIncompatibility('blockSearcher.indexBlocks ausente')
        return
      }
      const extra = dynamicCategoryBlockTypes().map((type) => ({ kind: 'block', type }))
      indexBlocks.call(this.blockSearcher, extra)
    }

    override dispose(): void {
      this.searchField?.remove()
      // `super.dispose()` desregistra o atalho GLOBAL "startSearch" do plugin —
      // mesmo quando ESTA instância não era a dona dele. Resultado: depois de
      // montar A→B e desmontar B, NENHUMA instância ficava com o Ctrl+B, apesar
      // de A continuar viva. Após o dispose, devolvemos o atalho a uma categoria
      // de busca sobrevivente (re-chamando seu registerShortcut, que já faz o
      // desregistra-antes-de-registrar — rule 5).
      super.dispose()
      handBackSearchShortcut(this)
    }

    /** Tenta posicionar o input por alguns frames até o flyout existir. */
    private showFieldWhenReady(tries = 0): void {
      // Alarga ANTES de medir: o input é dimensionado a partir do flyout, então
      // a ordem importa — senão o campo nasceria estreito e só cresceria depois
      // da primeira busca.
      this.fitFlyoutToContents()
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
      // O espaço para o campo é reservado por um separador nos itens do flyout
      // (ver matchBlocks) — NÃO deslocar o canvas por `transform` aqui: aquele
      // atributo é do Blockly e some na primeira rolagem.
      return true
    }
  }

  Blockly.registry.register(Blockly.registry.Type.TOOLBOX_ITEM, KIND, PtSearchCategory, true)
  registered = true
}

/**
 * Visual do campo de busca dentro do flyout. O foco fica no CSS para acompanhar
 * tokens da paleta (o input vive dentro da injection div, que está sob o
 * [data-sz-theme] do root do Studio — claro/escuro acompanham o tema).
 */
function stylizeSearchField(field: HTMLInputElement): void {
  field.classList.add('sz-blockly-search-field')
  Object.assign(field.style, {
    position: 'absolute',
    zIndex: '90',
    boxSizing: 'border-box',
    margin: '0',
    padding: '8px 12px',
    border: 'none',
    borderRadius: '8px',
    background: 'var(--color-sz-bg)',
    color: 'var(--color-sz-fg)',
    fontSize: '13px',
    fontFamily: 'var(--font-family-sans)',
    boxShadow: '0 0 0 1px var(--color-sz-border)',
  } satisfies Partial<CSSStyleDeclaration>)
}
