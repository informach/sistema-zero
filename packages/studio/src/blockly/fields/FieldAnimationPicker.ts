import * as Blockly from 'blockly/core'
import type { ProjectAsset, ProjectSpriteAnim } from '#core'

/**
 * Campo Blockly de ANIMAÇÃO do bloco "Animar sprite": mostra o NOME da animação e,
 * ao clicar, lista as animações da FOLHA (nomes vindos do Pinta) para a criança
 * escolher; ao escolher, PREENCHE os soquetes do quadro/velocidade (FROM/TO/FPS)
 * sozinho. É um campo de EXIBIÇÃO — `SERIALIZABLE = false`: não entra em
 * blocksState/IR/parser/allowlist (FROM/TO/FPS seguem a fonte da verdade, então o
 * round-trip fica idêntico). Sem metadado do Pinta (asset de upload / projeto
 * antigo) → estado vazio e a criança digita os quadros à mão, como sempre.
 */
interface AssetAccessor {
  __szAssets?: () => ProjectAsset[]
}

const LOAD_SPRITESHEET_TYPE = 'sz_g2d_load_spritesheet'

/** Reaplica o data-sz-theme do root no DropDownDiv portalado (mesmo do FieldAssetPicker). */
function applyThemeScope(field: Blockly.Field, content: HTMLElement): void {
  const workspace = field.getSourceBlock()?.workspace as { getInjectionDiv?(): unknown } | undefined
  const injectionDiv = workspace?.getInjectionDiv?.()
  const scope = injectionDiv instanceof HTMLElement ? injectionDiv.closest('[data-sz-theme]') : null
  const theme = scope?.getAttribute('data-sz-theme')
  if (theme) content.setAttribute('data-sz-theme', theme)
}

/**
 * Resolve as animações disponíveis: lê a FOLHA (`SHEET`) do bloco de animar, acha o
 * bloco "Carregar folha de quadros" que declara esse nome, lê a IMAGEM dele e
 * devolve `asset.sprite.animations` (metadado do Pinta). Vazio quando não resolve.
 */
export function resolveAnimations(field: Blockly.Field): ProjectSpriteAnim[] {
  const block = field.getSourceBlock()
  const ws = block?.workspace as (Blockly.Workspace & AssetAccessor) | undefined
  if (!block || !ws) return []
  const sheetName = block.getFieldValue('SHEET')
  if (!sheetName) return []
  const loader = ws
    .getAllBlocks(false)
    .find((b) => b.type === LOAD_SPRITESHEET_TYPE && b.getFieldValue('NAME') === sheetName)
  const imageName = loader?.getFieldValue('IMAGE')
  if (!imageName) return []
  const asset = (ws.__szAssets?.() ?? []).find((a) => a.name === imageName)
  return asset?.sprite?.animations ?? []
}

/**
 * Preenche FROM/TO/FPS a partir da animação escolhida. Escreve em SHADOW e em
 * literal REAL `sz_val_number` (a escolha explícita da criança é inequívoca; um
 * literal real aparece após um round-trip antigo pela Ponte). Nunca sobrescreve
 * variável/expressão plugada. Zero impacto no round-trip.
 */
export function fillFrames(field: Blockly.Field, anim: ProjectSpriteAnim): void {
  const block = field.getSourceBlock()
  if (!block) return
  const pairs: Array<[string, number]> = [
    ['FROM', anim.from],
    ['TO', anim.to],
    ['FPS', anim.fps],
  ]
  for (const [inputName, value] of pairs) {
    const target = block.getInput(inputName)?.connection?.targetBlock()
    if (target?.type === 'sz_val_number') {
      target.setFieldValue(String(value), 'NUM')
    }
  }
}

/** Texto default do campo (bloco recém-criado/reconstruído — nada escolhido). */
export const ANIM_PLACEHOLDER = '— escolher —'

/**
 * Lê o literal numérico plugado no soquete (shadow OU bloco real `sz_val_number`).
 * Variável/expressão → null (não dá para derivar o nome com segurança).
 */
function literalNumberAt(block: Blockly.Block, inputName: string): number | null {
  const target = block.getInput(inputName)?.connection?.targetBlock()
  if (target?.type !== 'sz_val_number') return null
  const num = Number(target.getFieldValue('NUM'))
  return Number.isFinite(num) ? num : null
}

/**
 * Deriva o NOME da animação a partir dos soquetes FROM/TO/FPS — a direção
 * REVERSA do `fillFrames`. É o que restaura a seleção exibida depois de
 * qualquer reconstrução (reload do blocksState, Ponte→Blocos): o campo é
 * de exibição não-serializável, então o nome só existe se recalculado dos
 * números (que são a fonte da verdade). Match EXATO dos três; sem literais ou
 * sem match → null.
 */
export function deriveAnimationName(
  block: Blockly.Block,
  anims: ProjectSpriteAnim[],
): string | null {
  if (anims.length === 0) return null
  const from = literalNumberAt(block, 'FROM')
  const to = literalNumberAt(block, 'TO')
  const fps = literalNumberAt(block, 'FPS')
  if (from == null || to == null || fps == null) return null
  const match = anims.find((anim) => anim.from === from && anim.to === to && anim.fps === fps)
  return match?.name ?? null
}

/**
 * Blocos que usam o picker de animação (campo ANIM + SHEET + soquetes
 * FROM/TO/FPS — o resolveAnimations/fillFrames é genérico por NOME de campo,
 * então basta listar o tipo aqui para o watcher re-derivar o nome).
 */
const ANIM_PICKER_TYPES = new Set(['sz_g2d_animate_sprite', 'sz_g2d_set_state_anim'])

/** Estado de coalescimento do refresh por workspace (espelha o thumb-watcher). */
const animRefreshQueued = new WeakMap<Blockly.Workspace, boolean>()

/**
 * Re-deriva o nome exibido de TODOS os blocos "Animar sprite" do workspace
 * (coalescido num microtask). Regras anti-clobber:
 * - deriva um nome → exibe-o (se mudou);
 * - lista de animações resolvida mas números sem match → volta ao placeholder
 *   SÓ se o campo exibe um nome DESSA lista (números contradizem o rótulo);
 * - lista vazia/irresolvível (assets ainda não hidratados, folha desconhecida)
 *   → NUNCA mexe.
 * Escreve dentro de `Blockly.Events.disable()` — não gera BLOCK_CHANGE, então
 * não realimenta o próprio watcher nem o regenerate do BlocklyPanel.
 */
export function refreshAnimationNames(ws: Blockly.Workspace): void {
  if (animRefreshQueued.get(ws)) return
  animRefreshQueued.set(ws, true)
  queueMicrotask(() => {
    animRefreshQueued.set(ws, false)
    const blocks = ws.getAllBlocks(false).filter((b) => ANIM_PICKER_TYPES.has(b.type))
    if (blocks.length === 0) return
    for (const block of blocks) {
      const field = block.getField('ANIM')
      if (!field) continue
      const anims = resolveAnimations(field)
      if (anims.length === 0) continue
      const derived = deriveAnimationName(block, anims)
      const current = String(field.getValue() ?? '')
      const next =
        derived ?? (anims.some((anim) => anim.name === current) ? ANIM_PLACEHOLDER : null)
      if (next == null || next === current) continue
      Blockly.Events.disable()
      try {
        field.setValue(next)
      } finally {
        Blockly.Events.enable()
      }
    }
  })
}

/**
 * Eventos que podem mudar o nome derivado: fim de carga (reload/Ponte→Blocos),
 * criar/apagar bloco de animar ou de carregar folha, editar SHEET/NAME/IMAGE ou
 * um número plugado em FROM/TO/FPS. Filtros baratos primeiro; o refresh em si é
 * coalescido e varre só os blocos de animar.
 */
function isAnimNameEvent(
  e: { type: string } & Record<string, unknown>,
  ws: Blockly.Workspace,
): boolean {
  if (e.type === Blockly.Events.FINISHED_LOADING) return true
  if (e.type === Blockly.Events.BLOCK_CREATE || e.type === Blockly.Events.BLOCK_DELETE) {
    const json = e.type === Blockly.Events.BLOCK_CREATE ? e.json : e.oldJson
    return jsonHasAnimRelatedType(json)
  }
  if (e.type === Blockly.Events.BLOCK_CHANGE) {
    if (e.element !== 'field' || typeof e.blockId !== 'string') return false
    const block = ws.getBlockById(e.blockId)
    if (!block) return false
    if (ANIM_PICKER_TYPES.has(block.type)) return e.name === 'SHEET'
    if (block.type === LOAD_SPRITESHEET_TYPE) return e.name === 'NAME' || e.name === 'IMAGE'
    // Literal numérico plugado num soquete de um bloco de animar (shadow ou real).
    if (block.type === 'sz_val_number') {
      let parent = block.getParent()
      while (parent) {
        if (ANIM_PICKER_TYPES.has(parent.type)) return true
        parent = parent.getParent()
      }
    }
    return false
  }
  return false
}

/** A subárvore serializada contém bloco de animar/carregar folha? */
function jsonHasAnimRelatedType(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false
  const node = json as {
    type?: string
    inputs?: Record<string, { block?: unknown; shadow?: unknown }>
    next?: { block?: unknown; shadow?: unknown }
  }
  if ((node.type && ANIM_PICKER_TYPES.has(node.type)) || node.type === LOAD_SPRITESHEET_TYPE) {
    return true
  }
  if (node.inputs) {
    for (const wrapper of Object.values(node.inputs)) {
      if (jsonHasAnimRelatedType(wrapper?.block) || jsonHasAnimRelatedType(wrapper?.shadow)) {
        return true
      }
    }
  }
  return jsonHasAnimRelatedType(node.next?.block) || jsonHasAnimRelatedType(node.next?.shadow)
}

/**
 * Liga a re-derivação automática do nome da animação (espelho do
 * `attachSpriteThumbWatcher`): um watcher POR workspace; o retorno desregistra.
 * O BlocklyPanel também chama `refreshAnimationNames` quando `project.assets`
 * muda (metadado do Pinta chega/atualiza sem evento Blockly).
 */
export function attachAnimationNameWatcher(ws: Blockly.WorkspaceSvg): () => void {
  const listener = (e: Blockly.Events.Abstract) => {
    const raw = e as unknown as { type: string } & Record<string, unknown>
    if (!isAnimNameEvent(raw, ws)) return
    refreshAnimationNames(ws)
  }
  ws.addChangeListener(listener)
  return () => ws.removeChangeListener(listener)
}

export class FieldAnimationPicker extends Blockly.FieldTextInput {
  // Campo de EXIBIÇÃO: não serializa (FROM/TO/FPS são a fonte da verdade). ⚠️ O
  // Blockly SERIALIZA todo campo EDITÁVEL mesmo com SERIALIZABLE=false (só avisa no
  // console) — a trava real é sobrescrever `isSerializable()` p/ false. Sem isto o
  // ANIM entraria no blocksState (mudaria o round-trip; nenhum parser o recupera).
  override SERIALIZABLE = false

  override isSerializable(): boolean {
    return false
  }

  static override fromJson(options: Blockly.FieldTextInputFromJsonConfig): FieldAnimationPicker {
    return new FieldAnimationPicker(`${options.text ?? ''}`)
  }

  protected override showEditor_(): void {
    const anims = resolveAnimations(this)

    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)

    const wrap = document.createElement('div')
    wrap.style.cssText =
      'padding:8px;width:230px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'

    if (anims.length === 0) {
      const empty = document.createElement('div')
      empty.textContent =
        'Nenhuma animação nesta folha. Escreva os números dos quadros (do… ao…) nos soquetes.'
      empty.style.cssText =
        'font-size:12px;color:var(--color-sz-fg-soft);padding:2px;line-height:1.4;'
      wrap.appendChild(empty)
    } else {
      const list = document.createElement('div')
      list.style.cssText =
        'display:flex;flex-direction:column;gap:4px;max-height:200px;overflow:auto;'
      for (const anim of anims) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.style.cssText =
          'display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:6px 8px;border:1px solid var(--color-sz-border);border-radius:6px;background:var(--color-sz-bg);cursor:pointer;text-align:left;'
        const name = document.createElement('span')
        name.textContent = `🎞️ ${anim.name}`
        name.style.cssText = 'font-size:13px;font-weight:600;color:var(--color-sz-fg);'
        const meta = document.createElement('span')
        meta.textContent = `quadros ${anim.from}–${anim.to} · ${anim.fps} fps`
        meta.style.cssText = 'font-size:10px;color:var(--color-sz-fg-soft);'
        btn.append(name, meta)
        btn.addEventListener('click', () => {
          this.setValue(anim.name)
          fillFrames(this, anim)
          Blockly.DropDownDiv.hideIfOwner(this)
        })
        list.appendChild(btn)
      }
      wrap.appendChild(list)
    }

    content.appendChild(wrap)
    Blockly.DropDownDiv.showPositionedByField(this, () => {})
  }
}

let registered = false

/** Registra o campo customizado uma única vez (idempotente). */
export function registerFieldAnimationPicker(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_animation_picker', FieldAnimationPicker)
  registered = true
}
