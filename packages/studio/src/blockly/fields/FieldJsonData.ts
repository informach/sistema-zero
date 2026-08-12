import * as Blockly from 'blockly/core'
import { JSON_DATA_MAX_BYTES, normalizeJsonData } from './jsonData'

type FieldOptions = Blockly.FieldTextInputFromJsonConfig

function applyThemeScope(
  field: { getSourceBlock(): Blockly.Block | null },
  content: HTMLElement,
): void {
  const workspace = field.getSourceBlock()?.workspace as { getInjectionDiv?(): unknown } | undefined
  const injectionDiv = workspace?.getInjectionDiv?.()
  const scope = injectionDiv instanceof HTMLElement ? injectionDiv.closest('[data-sz-theme]') : null
  const theme = scope?.getAttribute('data-sz-theme')
  if (theme) content.setAttribute('data-sz-theme', theme)
}

function action(label: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = label
  button.style.cssText =
    'height:32px;padding:5px 11px;border:1px solid var(--color-sz-border);border-radius:7px;background:var(--color-sz-bg);color:var(--color-sz-fg);font:600 12px Inter,system-ui,sans-serif;cursor:pointer;'
  return button
}

/** Campo serializável com editor seguro para um literal JSON compacto. */
export class FieldJsonData extends Blockly.FieldTextInput {
  constructor(value = '{}') {
    super(normalizeJsonData(value)?.canonical ?? '{}')
  }

  static override fromJson(options: FieldOptions): FieldJsonData {
    return new FieldJsonData(`${options.text ?? '{}'}`)
  }

  protected override getText_(): string | null {
    const normalized = normalizeJsonData(this.getValue() ?? '{}')
    return normalized ? `JSON · ${normalized.summary}` : 'JSON inválido'
  }

  protected override doClassValidation_(newValue?: unknown): string | null {
    if (typeof newValue !== 'string') return null
    return normalizeJsonData(newValue)?.canonical ?? null
  }

  protected override showEditor_(): void {
    // DropDownDiv ainda tipa o proprietário como Field<unknown>, mas
    // FieldTextInput é Field<string> e seu validator torna o genérico invariante.
    // Em runtime ambos obedecem ao mesmo contrato nominal do Blockly.
    const owner = this as unknown as Blockly.Field
    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)

    const wrap = document.createElement('div')
    wrap.style.cssText =
      'box-sizing:border-box;width:min(760px,92vw);padding:13px;display:grid;gap:10px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'
    const heading = document.createElement('div')
    const title = document.createElement('strong')
    title.textContent = 'Editor de dados JSON'
    const help = document.createElement('div')
    help.textContent = `Use objetos, listas, textos, números e booleanos. Limite: ${Math.round(JSON_DATA_MAX_BYTES / 1024)} KB.`
    help.style.cssText = 'margin-top:3px;color:var(--color-sz-fg-soft);font-size:11px;'
    heading.append(title, help)

    const editor = document.createElement('textarea')
    const parsed = normalizeJsonData(this.getValue() ?? '{}')
    editor.value = parsed ? JSON.stringify(parsed.value, null, 2) : '{}'
    editor.spellcheck = false
    editor.setAttribute('aria-label', 'Dados JSON')
    editor.style.cssText =
      'box-sizing:border-box;width:100%;height:min(460px,60vh);resize:vertical;padding:10px;border:1px solid var(--color-sz-border);border-radius:8px;background:var(--color-sz-bg);color:var(--color-sz-fg);font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;tab-size:2;'

    const footer = document.createElement('div')
    footer.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:7px;'
    const status = document.createElement('span')
    status.setAttribute('role', 'alert')
    status.style.cssText =
      'margin-right:auto;color:var(--color-sz-danger,#ef4444);font:600 11px Inter,system-ui,sans-serif;'
    const format = action('Formatar')
    const cancel = action('Cancelar')
    const apply = action('Usar estes dados')
    apply.style.background = 'var(--color-sz-accent)'
    apply.style.color = '#fff'

    const validate = () => {
      const normalized = normalizeJsonData(editor.value)
      status.textContent = normalized ? '' : 'O JSON está inválido ou ultrapassa o limite.'
      return normalized
    }
    format.addEventListener('click', () => {
      const normalized = validate()
      if (normalized) editor.value = JSON.stringify(normalized.value, null, 2)
    })
    cancel.addEventListener('click', () => Blockly.DropDownDiv.hideIfOwner(owner))
    apply.addEventListener('click', () => {
      const normalized = validate()
      if (!normalized) return
      this.setValue(normalized.canonical)
      Blockly.DropDownDiv.hideIfOwner(owner)
    })
    editor.addEventListener('input', validate)
    footer.append(status, format, cancel, apply)
    wrap.append(heading, editor, footer)
    content.appendChild(wrap)
    Blockly.DropDownDiv.showPositionedByField(owner, () => {})
    editor.focus()
  }
}

let registered = false

export function registerFieldJsonData(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_json_data', FieldJsonData)
  registered = true
}
