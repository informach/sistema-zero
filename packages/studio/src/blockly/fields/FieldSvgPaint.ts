import * as Blockly from 'blockly/core'
import { SZ_PALETTE_COLOURS, SZ_PALETTE_COLUMNS, SZ_PALETTE_TITLES } from '../colorPalette'
import { applyFieldDropdownTheme } from './dropdownTheme'

interface FieldSvgPaintFromJsonConfig extends Blockly.FieldTextInputFromJsonConfig {
  text?: string
}

const SPECIAL_PAINTS: ReadonlyArray<readonly [label: string, value: string]> = [
  ['Sem cor', 'none'],
  ['Transparente', 'transparent'],
]

/**
 * Cor SVG com paleta infantil e texto livre. Estende FieldTextInput para que
 * valores como `none`, `currentColor`, `var(--cor)` e paints importados nunca
 * sejam coagidos ou perdidos no round-trip.
 */
export class FieldSvgPaint extends Blockly.FieldTextInput {
  static override fromJson(options: FieldSvgPaintFromJsonConfig): FieldSvgPaint {
    return new FieldSvgPaint(`${options.text ?? ''}`)
  }

  protected override showEditor_(): void {
    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyFieldDropdownTheme(this, content)

    const wrap = document.createElement('div')
    wrap.style.cssText =
      'padding:10px;width:236px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'

    const palette = document.createElement('div')
    palette.setAttribute('role', 'listbox')
    palette.setAttribute('aria-label', 'Cores prontas')
    palette.style.cssText = `display:grid;grid-template-columns:repeat(${SZ_PALETTE_COLUMNS},1fr);gap:7px;`
    SZ_PALETTE_COLOURS.forEach((colour, index) => {
      const swatch = document.createElement('button')
      swatch.type = 'button'
      swatch.title = SZ_PALETTE_TITLES[index] ?? colour
      swatch.setAttribute('aria-label', swatch.title)
      swatch.style.cssText = `height:32px;border:2px solid var(--color-sz-border);border-radius:8px;background:${colour};cursor:pointer;`
      swatch.addEventListener('click', () => {
        this.setValue(colour)
        Blockly.DropDownDiv.hideIfOwner(this)
      })
      palette.appendChild(swatch)
    })
    wrap.appendChild(palette)

    const specials = document.createElement('div')
    specials.style.cssText = 'display:flex;gap:6px;margin-top:9px;'
    for (const [label, value] of SPECIAL_PAINTS) {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = label
      button.style.cssText =
        'flex:1;padding:5px;border:1px solid var(--color-sz-border);border-radius:7px;background:var(--color-sz-bg);color:var(--color-sz-fg);cursor:pointer;font-size:12px;'
      button.addEventListener('click', () => {
        this.setValue(value)
        Blockly.DropDownDiv.hideIfOwner(this)
      })
      specials.appendChild(button)
    }
    wrap.appendChild(specials)

    const row = document.createElement('div')
    row.style.cssText =
      'display:flex;gap:6px;margin-top:9px;padding-top:9px;border-top:1px solid var(--color-sz-border);'
    const input = document.createElement('input')
    input.type = 'text'
    input.value = `${this.getValue() ?? ''}`
    input.placeholder = '#a78bfa, none ou var(--cor)'
    input.spellcheck = false
    input.setAttribute('aria-label', 'Cor em texto')
    input.style.cssText =
      'flex:1;width:0;padding:5px 7px;border:1px solid var(--color-sz-border);border-radius:5px;background:var(--color-sz-bg);color:var(--color-sz-fg);font:12px "JetBrains Mono",ui-monospace,monospace;'
    const apply = document.createElement('button')
    apply.type = 'button'
    apply.textContent = 'OK'
    apply.style.cssText =
      'padding:5px 10px;border:0;border-radius:5px;background:var(--color-sz-accent);color:var(--color-sz-bg);font-weight:700;cursor:pointer;'
    const commit = (): void => {
      const value = input.value.trim()
      if (!value) {
        input.setAttribute('aria-invalid', 'true')
        input.title = 'Escolha uma cor ou use “Sem cor”.'
        return
      }
      this.setValue(value)
      Blockly.DropDownDiv.hideIfOwner(this)
    }
    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid')
      input.title = ''
    })
    input.addEventListener('keydown', (event) => {
      event.stopPropagation()
      if (event.key === 'Enter') {
        event.preventDefault()
        commit()
      }
    })
    apply.addEventListener('click', commit)
    row.append(input, apply)
    wrap.appendChild(row)

    content.appendChild(wrap)
    Blockly.DropDownDiv.showPositionedByField(this, () => {})
  }
}

let registered = false

export function registerFieldSvgPaint(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_svg_paint', FieldSvgPaint)
  registered = true
}
