import { registerFieldColour } from '@blockly/field-colour'
// Plugin oficial que adiciona uma categoria "Buscar" à toolbox com filtro ao
// vivo dos blocos pelo texto (auto-registra a categoria `kind: 'search'`).
import '@blockly/toolbox-search'
import * as Blockly from 'blockly/core'
import * as PtBr from 'blockly/msg/pt-br'
import { hasClipboard, runCopyBlocks, runPasteBlocks } from './blockClipboard'
import { registerCoreBlocks } from './blocks'
import { registerAnimLoopMutator } from './blocks/animLoopMutator'
import { registerArgsMutator } from './blocks/argsMutator'
import { registerArrayMutator } from './blocks/arrayMutator'
import { registerExtendsMutator } from './blocks/extendsMutator'
import { registerIfElseMutator } from './blocks/ifElseMutator'
import { registerObjectMutator } from './blocks/objectMutator'
import { registerParamsMutator } from './blocks/paramsMutator'
import { FRAME_APPEARANCE, FRAME_BEHAVIOR, FRAME_STRUCTURE } from './buildIR'
import { registerFieldAddonPicker } from './fields/FieldAddonPicker'
import { registerFieldAnimationPicker } from './fields/FieldAnimationPicker'
import { registerFieldAssetPicker } from './fields/FieldAssetPicker'
import { registerFieldClassPicker } from './fields/FieldClassPicker'
import { registerFieldColourSZ } from './fields/FieldColourSZ'
import { registerFieldNamePicker } from './fields/FieldNamePicker'
import { registerFieldSolidTilesPicker } from './fields/FieldSolidTilesPicker'
import { registerFieldSoundPicker } from './fields/FieldSoundPicker'
import { registerFieldSpritePicker } from './fields/FieldSpritePicker'
import { registerFieldTileGrid } from './fields/FieldTileGrid'
import { organizeBlocks } from './organize'
import { exportWorkspaceImage } from './screenshot'
import { registerPtSearchCategory } from './searchCategory'
import { szTheme } from './theme'

let initialized = false

/** Contrato mínimo de um `Field` do Blockly que este patch toca. */
type FieldLike = {
  isFullBlockField: () => boolean
  getSourceBlock: () => { getSvgRoot?: () => SVGGElement | null } | null
  borderRect_?: SVGElement | null
  resizeEditor_?: unknown
}

/** Rect em coordenadas de PÁGINA (top/bottom/left/right + tamanho). */
type PageRect = {
  top: number
  bottom: number
  left: number
  right: number
  width: number
  height: number
}

/**
 * Rect AO VIVO que o editor de um campo deve cobrir, em coordenadas de **PÁGINA**
 * (viewport `getBoundingClientRect` + scroll da janela) — correto em posição E tamanho
 * no overlay `fixed` do **modo criação guiada** (onde o cálculo nativo do Blockly, por
 * `getPageOffset`, erra o X ~1 caractere à esquerda) E no **modo aula normal**, onde a
 * PÁGINA inteira rola. Dois casos:
 *  - campo **full-block** (nossos sockets OVAIS de valor: `borderRect_` de tamanho
 *    ZERO) → o editor cobre o BLOCO inteiro → rect do SVG do bloco-fonte;
 *  - campo de **texto comum** (`FieldInput`: tem `resizeEditor_` + `borderRect_`
 *    visível — nome de propriedade/variável/método etc.) → o editor cobre a CAIXA do
 *    campo → rect do `borderRect_`.
 * Demais campos (dropdown/checkbox/cor/imagem…) → `null` = cálculo nativo intacto
 * (não abrem `<input>` de texto; seu posicionamento nativo não estava quebrado).
 * O `DropDownDiv`/`WidgetDiv` do Blockly são `position: absolute` no `document.body`
 * (origem 0,0), então precisam de coords de PÁGINA. Antes usávamos só o viewport
 * (assumindo janela sem scroll) — isso jogava o pop-up sobre o vídeo no modo aula
 * normal; somar `scrollX/Y` conserta esse modo SEM mexer no guiado (lá scroll = 0).
 */
function liveEditorRect(field: FieldLike): PageRect | null {
  try {
    let r: DOMRect | undefined
    if (field.isFullBlockField()) {
      r = field.getSourceBlock()?.getSvgRoot?.()?.getBoundingClientRect()
    } else if (typeof field.resizeEditor_ === 'function' && field.borderRect_) {
      r = field.borderRect_.getBoundingClientRect()
    }
    if (!r || r.width <= 0 || r.height <= 0) return null
    const sx = window.scrollX
    const sy = window.scrollY
    return {
      top: r.top + sy,
      bottom: r.bottom + sy,
      left: r.left + sx,
      right: r.right + sx,
      width: r.width,
      height: r.height,
    }
  } catch {
    // Qualquer surpresa cai no cálculo nativo do Blockly.
  }
  return null
}

/**
 * Corrige o ANCORAMENTO do editor de campo (o `<input>` que abre ao clicar num campo
 * de texto/número) no **modo criação guiada**: dentro do overlay `fixed`, o Blockly
 * posiciona o editor por um caminho que ERRA o X (~1 caractere à esquerda) → o
 * `<input>` abre deslocado e se sobrepõe ao texto do SVG ("400" vira "4000" fantasma;
 * um nome vira um fantasma puxado p/ a esquerda), com o contorno de seleção torto.
 * Vale para os sockets OVAIS de valor (full-block) E para os campos retangulares de
 * texto (nome de propriedade/variável/método…) — ver `liveEditorRect`. Idempotente
 * (guardado por `initialized`). Ver [[studio-campos-valor-ovais]].
 */
function patchFieldEditorAnchor(): void {
  // `getScaledBBox`/`isFullBlockField` vivem na base `Field`. Sobrescrevemos o bbox
  // usado pelo posicionador do editor; `liveEditorRect` já decide quais campos tocar.
  const proto = Blockly.Field.prototype as unknown as FieldLike & {
    getScaledBBox: () => Blockly.utils.Rect
  }
  const original = proto.getScaledBBox
  proto.getScaledBBox = function (this: typeof proto): Blockly.utils.Rect {
    const rect = liveEditorRect(this)
    if (rect) return new Blockly.utils.Rect(rect.top, rect.bottom, rect.left, rect.right)
    return original.call(this)
  }

  // Mesmo com o bbox correto, o `resizeEditor_` do Blockly ainda desloca o WidgetDiv
  // uns px à esquerda no overlay `fixed` do modo guiado (a conta interna dele soma um
  // offset de scroll/scale que erra ali). Depois que ele posiciona, ENCAIXAMOS o
  // WidgetDiv EXATAMENTE sobre o rect ao vivo do campo (`liveEditorRect`: o bloco p/
  // oval, a caixa p/ campo de texto). `WidgetDiv` é absoluto no `document.body`
  // (origem 0,0), então o rect de PÁGINA (viewport + scroll) é a coordenada certa. `resizeEditor_` roda
  // a cada mudança do workspace enquanto edita, então o encaixe se mantém.
  // `FieldInput`/`FieldTextInput` não são exportados em runtime; pegamos a classe do
  // campo `field_number` pelo REGISTRY e subimos a cadeia de protótipos até quem
  // DEFINE `resizeEditor_` (o `FieldInput` base). Patch lá vale p/ número E texto.
  const numberFieldCls = Blockly.registry.getClass(Blockly.registry.Type.FIELD, 'field_number') as
    | (new (
        ...a: unknown[]
      ) => unknown)
    | null
  let inputProto: Record<string, unknown> | null = numberFieldCls?.prototype ?? null
  while (inputProto && !Object.hasOwn(inputProto, 'resizeEditor_')) {
    inputProto = Object.getPrototypeOf(inputProto)
  }
  if (inputProto && typeof inputProto.resizeEditor_ === 'function') {
    const originalResize = inputProto.resizeEditor_ as (this: FieldLike) => void
    inputProto.resizeEditor_ = function (this: FieldLike): void {
      originalResize.call(this)
      try {
        const rect = liveEditorRect(this)
        const div = Blockly.WidgetDiv.getDiv()
        if (div && rect) {
          div.style.left = `${rect.left}px`
          div.style.top = `${rect.top}px`
          div.style.width = `${rect.width}px`
          div.style.height = `${rect.height}px`
        }
      } catch {
        // Sem encaixe se algo faltar — o posicionamento nativo (já ~ok) permanece.
      }
    }
  }
}

/**
 * Registra o item "Organizar blocos" no menu de contexto do workspace —
 * arruma as pilhas HTML/CSS/JS em colunas que não se sobrepõem (ver
 * `organizeBlocks`). Idempotente: ignora se já registrado.
 */
function registerOrganizeContextMenu(): void {
  const registry = Blockly.ContextMenuRegistry.registry
  if (registry.getItem('sz_organize')) return
  registry.register({
    id: 'sz_organize',
    weight: 6,
    scopeType: Blockly.ContextMenuRegistry.ScopeType.WORKSPACE,
    displayText: () => 'Organizar blocos',
    preconditionFn: (scope) =>
      (scope.workspace?.getTopBlocks(false).length ?? 0) > 0 ? 'enabled' : 'disabled',
    callback: (scope) => organizeBlocks(scope.workspace),
  })
}

/**
 * Registra "Baixar imagem dos blocos" no menu de contexto do workspace — gera um
 * PNG de TODOS os blocos (inclusive os rolados para fora da tela), dispara o
 * download e copia para a área de transferência (ver `exportWorkspaceImage`).
 * Idempotente. Vale para `<StudioEditor>` E `<StudioLesson>` (registro global).
 */
function registerScreenshotContextMenu(): void {
  const registry = Blockly.ContextMenuRegistry.registry
  if (registry.getItem('sz_screenshot')) return
  registry.register({
    id: 'sz_screenshot',
    weight: 7,
    scopeType: Blockly.ContextMenuRegistry.ScopeType.WORKSPACE,
    displayText: () => 'Baixar imagem dos blocos',
    preconditionFn: (scope) =>
      (scope.workspace?.getTopBlocks(false).length ?? 0) > 0 ? 'enabled' : 'disabled',
    callback: (scope) => {
      const workspace = scope.workspace
      if (!workspace) return
      void exportWorkspaceImage(workspace).then((result) => {
        if (!result.downloaded) {
          window.alert(
            'Não consegui gerar a imagem dos blocos. Se algum bloco usa uma imagem da internet, isso pode bloquear a captura.',
          )
        }
      })
    },
  })
}

/** Os 3 frames-container (Estrutura/Aparência/Comportamento) não são copiáveis. */
const FRAME_TYPES = new Set<string>([FRAME_STRUCTURE, FRAME_APPEARANCE, FRAME_BEHAVIOR])

/**
 * "Copiar blocos" no menu de contexto de um BLOCO: guarda o bloco + tudo dentro
 * dele + a sequência abaixo numa área de transferência durável (ver
 * `blockClipboard`), para colar em OUTRO projeto. Escondido nos 3 frames (copiar
 * uma área inteira não faz sentido). Idempotente.
 */
function registerCopyBlocksContextMenu(): void {
  const registry = Blockly.ContextMenuRegistry.registry
  if (registry.getItem('sz_copy_blocks')) return
  registry.register({
    id: 'sz_copy_blocks',
    weight: 2,
    scopeType: Blockly.ContextMenuRegistry.ScopeType.BLOCK,
    displayText: () => 'Copiar blocos',
    preconditionFn: (scope) => {
      const block = scope.block
      if (!block || FRAME_TYPES.has(block.type)) return 'hidden'
      return 'enabled'
    },
    callback: (scope) => {
      if (scope.block) runCopyBlocks(scope.block as Blockly.BlockSvg)
    },
  })
}

/**
 * "Colar blocos" no menu de contexto do WORKSPACE: cola a subárvore copiada (de
 * qualquer projeto) como rascunho solto. Só aparece quando há algo copiado.
 * Idempotente.
 */
function registerPasteBlocksContextMenu(): void {
  const registry = Blockly.ContextMenuRegistry.registry
  if (registry.getItem('sz_paste_blocks')) return
  registry.register({
    id: 'sz_paste_blocks',
    weight: 5,
    scopeType: Blockly.ContextMenuRegistry.ScopeType.WORKSPACE,
    displayText: () => 'Colar blocos',
    preconditionFn: () => (hasClipboard() ? 'enabled' : 'hidden'),
    callback: (scope) => {
      if (scope.workspace) runPasteBlocks(scope.workspace)
    },
  })
}

/** Garante que os blocos core e o tema do Sistema Zero estão registrados. */
export function ensureBlocklyInitialized(): void {
  if (initialized) return
  // Traduz a UI nativa do Blockly (menu de contexto: Desfazer, Refazer,
  // "Arrumar Blocos", Recolher/Expandir, Excluir, etc.) para PT-BR.
  Blockly.setLocale(PtBr as unknown as Record<string, string>)
  // Blockly 11 removeu FieldColour do core — registramos o plugin oficial
  // para que `field_colour` continue funcionando (usado por extensões) e
  // adicionamos `field_colour_sz` com paleta MakeCode + input HEX.
  // Ancoramento correto do editor de campo full-block (ver função). Antes de qualquer
  // instância de campo abrir seu editor.
  patchFieldEditorAnchor()
  registerFieldColour()
  registerFieldColourSZ()
  // Campo de seleção de imagem (asset) dos blocos de Jogo 2D. Registrado ANTES da
  // definição dos blocos da extensão (que rodam na instalação) — senão Blockly
  // falha ao ver o tipo `field_asset_picker`.
  registerFieldAssetPicker()
  // Campo de seleção de SOM (asset de áudio, com ▶ para ouvir) — mesma exigência
  // de ordem do asset picker: registrado antes dos blocos da extensão.
  registerFieldSoundPicker()
  // Campo de seleção de SPRITE (lista os sprites já criados, com miniatura) — mesma
  // exigência de ordem do asset picker: registrado antes dos blocos da extensão.
  registerFieldSpritePicker()
  // Campo de seleção de ANIMAÇÃO (nomes vindos do Pinta) e de TILES SÓLIDOS (grade
  // visual) dos blocos de Jogo 2D — mesma exigência de ordem (registrados antes da
  // definição dos blocos da extensão, que veem esses tipos de campo).
  registerFieldAnimationPicker()
  registerFieldSolidTilesPicker()
  registerFieldTileGrid()
  // Campos de seleção do Canvas 3D (three.js): addon (import → caminho auto) e classe
  // three. Mesma exigência de ordem: registrados antes dos blocos que os usam.
  registerFieldAddonPicker()
  registerFieldClassPicker()
  // Campo de seleção de NOME (variável / grupo-lista já criados) — mesma exigência de
  // ordem: registrado antes dos blocos do núcleo e da extensão que o usam.
  registerFieldNamePicker()
  // Os mutators precisam estar registrados antes de qualquer instância dos
  // blocos que os usam ser criada (init aplica o mutator pelo nome).
  registerAnimLoopMutator()
  registerArgsMutator()
  registerArrayMutator()
  registerObjectMutator()
  registerParamsMutator()
  registerExtendsMutator()
  registerIfElseMutator()
  registerCoreBlocks()
  // Sobrescreve os textos em inglês da categoria de busca por PT-BR.
  registerPtSearchCategory()
  registerOrganizeContextMenu()
  registerScreenshotContextMenu()
  registerCopyBlocksContextMenu()
  registerPasteBlocksContextMenu()
  initialized = true
}

export { Blockly, szTheme }
