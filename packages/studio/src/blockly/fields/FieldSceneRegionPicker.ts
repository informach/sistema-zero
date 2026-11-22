import * as Blockly from 'blockly/core'
import type { ProjectAsset } from '#core'
import { applyThemeScope } from './FieldAnimationPicker'

/**
 * Campo do NOME DA REGIÃO do bloco "Quando ⟨obj⟩ entrar na região ⟨nome⟩"
 * (`field_scene_region_picker`, lote 6 da conclusão, 22/11/2026). Ao clicar, lista as regiões dos
 * cenários do Molda trazidos para o projeto. Sem regiões, diz onde desenhá-las.
 *
 * ⚠️ `extends FieldTextInput`, como o seletor de clipes: o VALOR é uma string livre, então IR,
 * Ponte e código ficam iguais; um nome que nenhum cenário tem aparece com ⚠️ e continua valendo
 * (o jogo avisa uma vez). As regiões são lidas do envelope sem conferir (só para mostrar): quem
 * confere o cenário é a importação e o motor.
 */
interface AssetAccessor {
  __szAssets?: () => ProjectAsset[]
}

/** Os nomes das regiões dos cenários do projeto, na ordem, sem repetir. */
export function regionNamesOfProject(assets: readonly ProjectAsset[]): string[] {
  const nomes: string[] = []
  for (const asset of assets) {
    if (asset.kind !== 'scene3d') continue
    try {
      const comma = asset.dataUrl.indexOf(',')
      const texto = new TextDecoder().decode(
        Uint8Array.from(atob(asset.dataUrl.slice(comma + 1)), (c) => c.charCodeAt(0)),
      )
      const regioes = (JSON.parse(texto) as { cena?: { regioes?: { nome?: unknown }[] } }).cena
        ?.regioes
      for (const r of regioes ?? [])
        if (typeof r.nome === 'string' && r.nome && !nomes.includes(r.nome)) nomes.push(r.nome)
    } catch {
      // Um cenário ilegível não tira os nomes dos outros.
    }
  }
  return nomes
}

export interface SceneRegionPickerState {
  names: string[]
  current: string
  /** O valor atual não é o nome de nenhuma região dos cenários do projeto. */
  unknownCurrent: boolean
}

export function sceneRegionPickerState(field: Blockly.Field): SceneRegionPickerState {
  const ws = field.getSourceBlock()?.workspace as (Blockly.Workspace & AssetAccessor) | undefined
  const current = String(field.getValue() ?? '')
  const names = regionNamesOfProject(ws?.__szAssets?.() ?? [])
  return { names, current, unknownCurrent: current !== '' && !names.includes(current) }
}

const ROW_STYLE =
  'display:flex;align-items:center;gap:8px;padding:5px 7px;border-radius:6px;background:var(--color-sz-bg);cursor:pointer;text-align:left;font-size:13px;color:var(--color-sz-fg);'
const HINT_STYLE = 'font-size:12px;color:var(--color-sz-fg-soft);padding:2px;line-height:1.4;'

/** O conteúdo do pop-up (separado do `showEditor_` para os testes sem o DropDownDiv). */
export function buildSceneRegionPickerContent(field: Blockly.FieldTextInput): HTMLElement {
  const { names, current, unknownCurrent } = sceneRegionPickerState(field)
  const wrap = document.createElement('div')
  wrap.className = 'sz-region-picker'
  wrap.tabIndex = -1
  wrap.setAttribute('role', 'group')
  wrap.setAttribute('aria-label', 'Escolher a região do cenário')
  wrap.style.cssText =
    'padding:8px;width:240px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'
  const choose = (value: string): void => {
    field.setValue(value)
    Blockly.DropDownDiv.hideIfOwner(field)
  }
  const hint = (text: string, extra = ''): void => {
    const el = document.createElement('div')
    el.className = 'sz-region-picker__hint'
    el.textContent = text
    el.style.cssText = `${HINT_STYLE}${extra}`
    wrap.appendChild(el)
  }
  if (unknownCurrent)
    hint(
      `⚠️ Nenhum cenário do projeto tem a região "${current}". Confira o nome no Molda Cenários.`,
      'color:var(--color-sz-fg);padding-bottom:6px;',
    )
  if (names.length === 0) hint('Desenhe as regiões no Molda Cenários, na aba Jogo.')
  else {
    const list = document.createElement('div')
    list.className = 'sz-region-picker__list'
    list.style.cssText =
      'display:flex;flex-direction:column;gap:4px;max-height:220px;overflow:auto;margin-top:4px;'
    for (const name of names) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'sz-region-picker__option'
      btn.dataset.region = name
      const selected = name === current
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false')
      btn.style.cssText = `${ROW_STYLE}border:1px solid ${selected ? 'var(--color-sz-accent)' : 'var(--color-sz-border)'};`
      btn.textContent = `🗺️ ${name}`
      btn.addEventListener('click', () => choose(name))
      list.appendChild(btn)
    }
    wrap.appendChild(list)
  }
  // Entrada livre: o cenário pode chegar depois.
  const row = document.createElement('div')
  row.style.cssText =
    'display:flex;gap:6px;margin-top:8px;border-top:1px solid var(--color-sz-border);padding-top:8px;align-items:center;'
  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'sz-region-picker__input'
  input.autocomplete = 'off'
  input.spellcheck = false
  input.value = current
  input.placeholder = 'nome da região'
  input.setAttribute('aria-label', 'Nome da região')
  input.style.cssText =
    'flex:1;min-width:0;padding:3px 6px;border:1px solid var(--color-sz-border);background:var(--color-sz-bg);color:var(--color-sz-fg);border-radius:4px;font-size:12px;'
  const ok = document.createElement('button')
  ok.type = 'button'
  ok.className = 'sz-region-picker__confirm'
  ok.textContent = 'Usar'
  ok.setAttribute('aria-label', 'Usar este nome de região')
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

export class FieldSceneRegionPicker extends Blockly.FieldTextInput {
  static override fromJson(options: Blockly.FieldTextInputFromJsonConfig): FieldSceneRegionPicker {
    return new FieldSceneRegionPicker(`${options.text ?? ''}`)
  }

  protected override showEditor_(): void {
    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)
    const wrap = buildSceneRegionPickerContent(this)
    content.appendChild(wrap)
    Blockly.DropDownDiv.showPositionedByField(this, () => {})
    const focusTarget =
      wrap.querySelector<HTMLElement>('.sz-region-picker__option[aria-pressed="true"]') ??
      wrap.querySelector<HTMLElement>('.sz-region-picker__option') ??
      wrap
    setTimeout(() => focusTarget.focus({ preventScroll: true }), 0)
  }
}

let registered = false

/** Registra o campo uma única vez (idempotente). */
export function registerFieldSceneRegionPicker(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_scene_region_picker', FieldSceneRegionPicker)
  registered = true
}
