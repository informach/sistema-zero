import * as Blockly from 'blockly/core'
import type { ProjectAsset } from '#core'
import { applyThemeScope } from './FieldAnimationPicker'
import { type ModelClipOptions, resolveModelClipOptions } from './modelClipResolution'

/**
 * Campo do NOME DA ANIMAÇÃO dos blocos 3D que tocam clipes de um modelo do Molda
 * (`field_model_clip_picker`). Ao clicar, lista os clipes lidos do próprio `.glb`
 * (🎬), agrupados por modelo; a resolução bloco → modelo mora em
 * `modelClipResolution.ts` (pura).
 *
 * ⚠️ `extends FieldTextInput`, NUNCA `FieldDropdown`: o VALOR continua uma string
 * livre, então IR, Ponte, round-trip e allowlist ficam idênticos ao `field_input`
 * de antes. Um nome que não está na lista (modelo ainda não trazido, digitado à
 * mão) aparece com ⚠️ e continua valendo e editável.
 */
interface AssetAccessor {
  __szAssets?: () => ProjectAsset[]
}

/** Blocos em que o nome vazio tem sentido ("parado"). */
const EMPTY_MEANS_STILL = new Set(['sz_w3d_place_model'])

export interface ModelClipPickerState {
  options: ModelClipOptions
  /** Valor atual do campo. */
  current: string
  /** O valor atual não está em nenhum clipe listado (e não é vazio). */
  unknownCurrent: boolean
  /** O bloco aceita "sem animação" (valor vazio). */
  allowsEmpty: boolean
}

/** O que o seletor mostra para este campo (sem DOM). */
export function modelClipPickerState(field: Blockly.Field): ModelClipPickerState {
  const block = field.getSourceBlock()
  const ws = block?.workspace as (Blockly.Workspace & AssetAccessor) | undefined
  const current = String(field.getValue() ?? '')
  const allowsEmpty = !!block && EMPTY_MEANS_STILL.has(block.type)
  if (!block || !ws) {
    return {
      options: { resolved: false, groups: [] },
      current,
      unknownCurrent: current !== '',
      allowsEmpty,
    }
  }
  const options = resolveModelClipOptions(block, ws.getAllBlocks(false), ws.__szAssets?.() ?? [])
  const known = options.groups.some((group) => group.clips?.includes(current) ?? false)
  return { options, current, unknownCurrent: current !== '' && !known, allowsEmpty }
}

/** Rótulo de clipe com até 48 letras (o nome inteiro vai no title e no valor). */
export const CLIP_LABEL_MAX = 48
function clipLabel(clip: string): string {
  return clip.length > CLIP_LABEL_MAX ? `${clip.slice(0, CLIP_LABEL_MAX - 1)}…` : clip
}

const ROW_STYLE =
  'display:flex;align-items:center;gap:8px;padding:5px 7px;border-radius:6px;background:var(--color-sz-bg);cursor:pointer;text-align:left;'
const HINT_STYLE = 'font-size:12px;color:var(--color-sz-fg-soft);padding:2px;line-height:1.4;'

/**
 * Monta o conteúdo do pop-up (separado do `showEditor_` para os testes headless
 * acharem a lista, o ⚠️ e a entrada livre sem o DropDownDiv).
 */
export function buildModelClipPickerContent(field: Blockly.FieldTextInput): HTMLElement {
  const state = modelClipPickerState(field)
  const { options, current } = state
  const wrap = document.createElement('div')
  wrap.className = 'sz-clip-picker'
  wrap.tabIndex = -1
  wrap.setAttribute('role', 'group')
  wrap.setAttribute('aria-label', 'Escolher animação do modelo')
  wrap.style.cssText =
    'padding:8px;width:250px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'

  const choose = (value: string): void => {
    field.setValue(value)
    Blockly.DropDownDiv.hideIfOwner(field)
  }
  const addHint = (text: string): void => {
    const hint = document.createElement('div')
    hint.className = 'sz-clip-picker__hint'
    hint.textContent = text
    hint.style.cssText = HINT_STYLE
    wrap.appendChild(hint)
  }

  if (state.unknownCurrent) {
    const warn = document.createElement('div')
    warn.className = 'sz-clip-picker__unknown'
    warn.textContent = `⚠️ "${current}" não está nas animações do modelo. Confira o nome no Molda.`
    warn.style.cssText = `${HINT_STYLE}color:var(--color-sz-fg);padding-bottom:6px;`
    wrap.appendChild(warn)
  }

  if (options.groups.length === 0) {
    addHint(
      'Nenhum modelo 3D no projeto ainda. Traga um do Molda em "Modelos 3D", no menu ⋯, ou escreva o nome da animação abaixo.',
    )
  } else {
    if (!options.resolved) {
      addHint('Não achei o modelo deste bloco. Estas são as animações de todos os modelos.')
    }
    const list = document.createElement('div')
    list.className = 'sz-clip-picker__list'
    list.style.cssText =
      'display:flex;flex-direction:column;gap:4px;max-height:220px;overflow:auto;margin-top:4px;'
    // O valor é o nome INTEIRO (o runtime procura por ele); só o rótulo encurta. O nome
    // inteiro fica no `title`.
    const addRow = (value: string, label: string): void => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'sz-clip-picker__option'
      btn.dataset.clip = value
      btn.title = value || label
      const selected = value === current
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false')
      btn.style.cssText = `${ROW_STYLE}border:1px solid ${selected ? 'var(--color-sz-accent)' : 'var(--color-sz-border)'};font-size:13px;color:var(--color-sz-fg);`
      btn.textContent = label
      btn.addEventListener('click', () => choose(value))
      list.appendChild(btn)
    }
    if (state.allowsEmpty) addRow('', '⏸️ parado (sem animação)')
    for (const group of options.groups) {
      const title = document.createElement('div')
      title.className = 'sz-clip-picker__model'
      title.textContent = `📦 ${group.model}`
      title.style.cssText =
        'font-size:11px;font-weight:600;color:var(--color-sz-fg-soft);padding:4px 2px 0;'
      list.appendChild(title)
      if (group.clips === null || group.clips.length === 0) {
        const none = document.createElement('div')
        none.className = 'sz-clip-picker__none'
        none.textContent =
          group.clips === null
            ? 'Não consegui ler as animações deste modelo.'
            : 'Este modelo não tem animações.'
        none.style.cssText = `${HINT_STYLE}font-size:11px;`
        list.appendChild(none)
      }
      for (const clip of group.clips ?? []) addRow(clip, `🎬 ${clipLabel(clip)}`)
    }
    wrap.appendChild(list)
  }

  // Entrada livre: o nome pode ser de um modelo que ainda vai chegar.
  const row = document.createElement('div')
  row.style.cssText =
    'display:flex;gap:6px;margin-top:8px;border-top:1px solid var(--color-sz-border);padding-top:8px;align-items:center;'
  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'sz-clip-picker__input'
  input.autocomplete = 'off'
  input.spellcheck = false
  input.value = current
  input.placeholder = 'nome da animação'
  input.setAttribute('aria-label', 'Nome da animação')
  input.style.cssText =
    'flex:1;min-width:0;padding:3px 6px;border:1px solid var(--color-sz-border);background:var(--color-sz-bg);color:var(--color-sz-fg);border-radius:4px;font-size:12px;font-family:"JetBrains Mono",ui-monospace,monospace;'
  const ok = document.createElement('button')
  ok.type = 'button'
  ok.className = 'sz-clip-picker__confirm'
  ok.textContent = 'Usar'
  ok.setAttribute('aria-label', 'Usar este nome de animação')
  ok.style.cssText =
    'padding:3px 10px;background:var(--color-sz-accent);color:var(--color-sz-bg);border:0;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;'
  const apply = (): void => choose(input.value.trim())
  input.addEventListener('keydown', (ev) => {
    ev.stopPropagation()
    if (ev.key === 'Enter') {
      ev.preventDefault()
      apply()
    }
  })
  ok.addEventListener('click', apply)
  row.append(input, ok)
  wrap.appendChild(row)
  return wrap
}

export class FieldModelClipPicker extends Blockly.FieldTextInput {
  static override fromJson(options: Blockly.FieldTextInputFromJsonConfig): FieldModelClipPicker {
    return new FieldModelClipPicker(`${options.text ?? ''}`)
  }

  protected override showEditor_(): void {
    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)
    const wrap = buildModelClipPickerContent(this)
    content.appendChild(wrap)
    Blockly.DropDownDiv.showPositionedByField(this, () => {})
    const focusTarget =
      wrap.querySelector<HTMLElement>('.sz-clip-picker__option[aria-pressed="true"]') ??
      wrap.querySelector<HTMLElement>('.sz-clip-picker__option') ??
      wrap
    // `preventScroll`: focar fora da vista rolaria a página (mesmo cuidado do FieldNamePicker).
    setTimeout(() => focusTarget.focus({ preventScroll: true }), 0)
  }
}

let registered = false

/** Registra o campo uma única vez (idempotente). */
export function registerFieldModelClipPicker(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_model_clip_picker', FieldModelClipPicker)
  registered = true
}
