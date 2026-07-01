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
import { registerObjectMutator } from './blocks/objectMutator'
import { registerParamsMutator } from './blocks/paramsMutator'
import { FRAME_APPEARANCE, FRAME_BEHAVIOR, FRAME_STRUCTURE } from './buildIR'
import { registerFieldAssetPicker } from './fields/FieldAssetPicker'
import { registerFieldColourSZ } from './fields/FieldColourSZ'
import { registerFieldSpritePicker } from './fields/FieldSpritePicker'
import { organizeBlocks } from './organize'
import { exportWorkspaceImage } from './screenshot'
import { registerPtSearchCategory } from './searchCategory'
import { szTheme } from './theme'

let initialized = false

/**
 * Corrige o ANCORAMENTO do editor de campo (o `<input>` que abre ao clicar num campo
 * de texto/número). Nossos sockets OVAIS de valor são campos "full-block" (o
 * `borderRect_` do campo tem tamanho ZERO) → o Blockly calcula a posição do editor
 * por um caminho que ERRA o X quando o workspace está rolado horizontalmente dentro
 * do overlay `fixed` do **modo criação guiada**: o `<input>` abre deslocado (~1 dígito
 * à esquerda) e se sobrepõe ao número desenhado no SVG — "400" vira um "4000" fantasma,
 * com o contorno de seleção puxado p/ a esquerda. O bounding box AO VIVO do SVG do
 * campo (`getBoundingClientRect`) é sempre correto; ancoramos o editor nele. Só para
 * campos full-block (os demais já usam o `borderRect_` ao vivo e ficam intactos).
 * Idempotente (guardado por `initialized`). Ver [[studio-campos-valor-ovais]].
 */
function patchFieldEditorAnchor(): void {
  // `getScaledBBox`/`isFullBlockField` vivem na base `Field` (o `FieldInput` abstrato
  // não é exportado em runtime). O gate `isFullBlockField()` restringe a mudança aos
  // campos que ocupam o bloco inteiro (nossos sockets de valor); os demais seguem
  // pelo `borderRect_` ao vivo do Blockly, intactos.
  const proto = Blockly.Field.prototype as unknown as {
    getScaledBBox: () => Blockly.utils.Rect
    isFullBlockField: () => boolean
    getSvgRoot: () => SVGGElement | null
  }
  const original = proto.getScaledBBox
  proto.getScaledBBox = function (this: typeof proto): Blockly.utils.Rect {
    try {
      if (this.isFullBlockField()) {
        const rect = this.getSvgRoot()?.getBoundingClientRect()
        if (rect && rect.width > 0 && rect.height > 0) {
          return new Blockly.utils.Rect(rect.top, rect.bottom, rect.left, rect.right)
        }
      }
    } catch {
      // Qualquer surpresa cai no cálculo nativo do Blockly.
    }
    return original.call(this)
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
  // Campo de seleção de SPRITE (lista os sprites já criados, com miniatura) — mesma
  // exigência de ordem do asset picker: registrado antes dos blocos da extensão.
  registerFieldSpritePicker()
  // Os mutators precisam estar registrados antes de qualquer instância dos
  // blocos que os usam ser criada (init aplica o mutator pelo nome).
  registerAnimLoopMutator()
  registerArgsMutator()
  registerArrayMutator()
  registerObjectMutator()
  registerParamsMutator()
  registerExtendsMutator()
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
