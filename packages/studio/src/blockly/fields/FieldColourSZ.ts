import { FieldColour, type FieldColourFromJsonConfig } from '@blockly/field-colour'
import * as Blockly from 'blockly/core'
import { SZ_PALETTE_COLOURS, SZ_PALETTE_COLUMNS, SZ_PALETTE_TITLES } from '../colorPalette'
import { applyFieldDropdownTheme } from './dropdownTheme'

const HEX_RE = /^#[0-9a-fA-F]{6}$/
let colourErrorSequence = 0

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

    // O DropDownDiv é portalado para document.body, fora do [data-sz-theme] do
    // root do <Studio> — reaplica o atributo no conteúdo para os tokens da
    // paleta resolverem com o tema certo (mesma ideia do StudioThemeScope/Modal).
    applyFieldDropdownTheme(this, content)

    // Respiro CLARO entre a grade de cores e a linha do HEX (padding-top maior +
    // border-top) — pedido da dona: a caixinha não pode ficar colada nos swatches.
    const row = document.createElement('div')
    row.className = 'sz-hex-input-row'
    row.style.cssText =
      'display:flex;gap:6px;padding:12px 10px 8px;margin-top:4px;border-top:1px solid var(--color-sz-border);align-items:center;background:var(--color-sz-panel);'

    const label = document.createElement('span')
    label.textContent = 'HEX'
    label.style.cssText =
      'font-size:12px;color:var(--color-sz-fg);font-family:Inter,system-ui,sans-serif;font-weight:500;'

    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'sz-field-picker__input'
    input.placeholder = '#22d3ee'
    input.value = (this.getValue() ?? '#000000') as string
    input.maxLength = 7
    input.spellcheck = false
    input.autocomplete = 'off'
    input.setAttribute('aria-label', 'Cor em hexadecimal')
    // `width:0` tira a largura INTRÍNSECA do <input> (~170px), que era quem
    // esticava o pop-up e descolava a grade; o `min-width:88px` garante que o
    // código hexadecimal COMPLETO (#rrggbb, 7 chars mono) fique sempre visível —
    // a linha pode alargar o pop-up um pouco além da grade, e tudo bem.
    input.style.cssText =
      'flex:1;width:0;min-width:88px;padding:5px 8px;border:1px solid var(--color-sz-border);background:var(--color-sz-bg);color:var(--color-sz-fg);border-radius:4px;font-size:13px;font-family:"JetBrains Mono",ui-monospace,monospace;'

    // CÍRCULO CROMÁTICO (pedido da dona): o <input type=color> NATIVO é ao mesmo
    // tempo a "corzinha" de prévia da cor atual e o botão que abre o seletor LIVRE
    // do navegador — a paleta dá a cor pronta/fácil, o círculo dá QUALQUER cor.
    // Arrastar no seletor preenche o input com o hex ao vivo; confirmar aplica no
    // bloco. Estilo do swatch em studio.css (`.sz-hex-input-row input[type=color]`
    // — pseudo-elementos não entram em cssText inline).
    const picker = document.createElement('input')
    picker.type = 'color'
    picker.className = 'sz-field-picker__input'
    picker.title = 'Escolher qualquer cor'
    picker.setAttribute('aria-label', 'Escolher qualquer cor')
    const current = `${this.getValue() ?? ''}`
    picker.value = HEX_RE.test(current) ? current.toLowerCase() : '#22d3ee'

    const applyBtn = document.createElement('button')
    applyBtn.textContent = 'OK'
    applyBtn.type = 'button'
    applyBtn.className = 'sz-field-picker__button'
    applyBtn.style.cssText =
      'padding:5px 10px;background:var(--color-sz-accent);color:var(--color-sz-bg);border:0;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;'

    const error = document.createElement('span')
    error.id = `sz-colour-error-${++colourErrorSequence}`
    error.className = 'sz-field-picker__error'
    error.setAttribute('aria-live', 'polite')
    input.setAttribute('aria-describedby', error.id)

    const setError = (msg: string | null) => {
      input.style.borderColor = msg ? 'var(--color-sz-error)' : 'var(--color-sz-border)'
      input.title = msg ?? ''
      error.textContent = msg ?? ''
      if (msg) input.setAttribute('aria-invalid', 'true')
      else input.removeAttribute('aria-invalid')
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

    input.addEventListener('input', () => {
      setError(null)
      // Hex válido digitado → espelha na "corzinha" (prévia ao vivo).
      const val = input.value.trim()
      if (HEX_RE.test(val)) picker.value = val.toLowerCase()
    })
    input.addEventListener('keydown', (ev) => {
      ev.stopPropagation()
      if (ev.key === 'Enter') {
        ev.preventDefault()
        apply()
      }
    })
    // Arrastando no círculo: preenche o input com o código ao vivo (a prévia é o
    // próprio swatch). Confirmou (fechou o seletor nativo) → aplica no bloco e
    // fecha, igual ao clique numa cor da paleta.
    picker.addEventListener('input', () => {
      input.value = picker.value
      setError(null)
    })
    picker.addEventListener('change', () => {
      this.setValue(picker.value)
      Blockly.DropDownDiv.hideIfOwner(this)
    })
    applyBtn.addEventListener('click', apply)

    row.append(label, input, picker, applyBtn)
    content.append(row, error)
    Blockly.DropDownDiv.repositionForWindowResize()
  }
}

let registered = false

/** Registra o campo customizado uma única vez (idempotente). */
export function registerFieldColourSZ(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_colour_sz', FieldColourSZ)
  registered = true
}
