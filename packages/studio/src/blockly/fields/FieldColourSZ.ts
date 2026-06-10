import { FieldColour, type FieldColourFromJsonConfig } from '@blockly/field-colour'
import * as Blockly from 'blockly/core'
import { SZ_PALETTE_COLOURS, SZ_PALETTE_COLUMNS, SZ_PALETTE_TITLES } from '../colorPalette'

const HEX_RE = /^#[0-9a-fA-F]{6}$/

/**
 * Campo de cor do Sistema Zero. Usa a paleta MakeCode-like definida em
 * colorPalette.ts e injeta um input HEX no rodapé do dropdown para permitir
 * cor livre quando a paleta não é suficiente.
 */
export class FieldColourSZ extends FieldColour {
  static override fromJson(options: FieldColourFromJsonConfig): FieldColourSZ {
    return new FieldColourSZ(options.colour ?? undefined)
  }

  constructor(value?: string) {
    super(value)
    this.setColours(SZ_PALETTE_COLOURS, SZ_PALETTE_TITLES)
    this.setColumns(SZ_PALETTE_COLUMNS)
  }

  protected override showEditor_(): void {
    super.showEditor_()
    const content = Blockly.DropDownDiv.getContentDiv()
    if (!content || content.querySelector('.sz-hex-input-row')) return

    const row = document.createElement('div')
    row.className = 'sz-hex-input-row'
    row.style.cssText =
      'display:flex;gap:6px;padding:8px 6px 4px;border-top:1px solid #232b4a;align-items:center;background:#11172a;'

    const label = document.createElement('span')
    label.textContent = 'HEX'
    label.style.cssText =
      'font-size:12px;color:#aab1cf;font-family:Inter,system-ui,sans-serif;font-weight:500;'

    const input = document.createElement('input')
    input.type = 'text'
    input.placeholder = '#22d3ee'
    input.value = (this.getValue() ?? '#000000') as string
    input.maxLength = 7
    input.spellcheck = false
    input.style.cssText =
      'flex:1;padding:3px 6px;border:1px solid #232b4a;background:#0b1020;color:#e6e9f5;border-radius:4px;font-size:12px;font-family:"JetBrains Mono",ui-monospace,monospace;outline:none;'

    const applyBtn = document.createElement('button')
    applyBtn.textContent = 'OK'
    applyBtn.type = 'button'
    applyBtn.style.cssText =
      'padding:3px 10px;background:#22d3ee;color:#0b1020;border:0;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;'

    const setError = (msg: string | null) => {
      input.style.borderColor = msg ? '#f87171' : '#232b4a'
      input.title = msg ?? ''
    }

    const apply = () => {
      const val = input.value.trim()
      if (!HEX_RE.test(val)) {
        setError('Use o formato #rrggbb')
        return
      }
      this.setValue(val.toLowerCase())
      Blockly.DropDownDiv.hideIfOwner(this)
    }

    input.addEventListener('input', () => setError(null))
    input.addEventListener('keydown', (ev) => {
      ev.stopPropagation()
      if (ev.key === 'Enter') {
        ev.preventDefault()
        apply()
      }
    })
    applyBtn.addEventListener('click', apply)

    row.append(label, input, applyBtn)
    content.appendChild(row)
    Blockly.DropDownDiv.repositionForWindowResize()
    setTimeout(() => input.focus(), 0)
  }
}

let registered = false

/** Registra o campo customizado uma única vez (idempotente). */
export function registerFieldColourSZ(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_colour_sz', FieldColourSZ)
  registered = true
}
