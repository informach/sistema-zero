import * as Blockly from 'blockly/core'
import {
  CANVAS3D_ADDON_MODULES,
  CANVAS3D_AUTO_ADDON_MODULE,
  CANVAS3D_STUDIO_ADDON_GROUPS,
} from '../../three/canvas3dAddons'

/**
 * Campo Blockly do bloco "usar … da biblioteca" (`sz_t3d_import_named`): em vez de a
 * criança DIGITAR o caminho `three/addons/loaders/GLTFLoader.js`, ela ESCOLHE o addon
 * numa lista curada e o caminho é preenchido SOZINHO no campo irmão `MODULE`.
 *
 * Estende `FieldTextInput` (NÃO `FieldDropdown`): o VALOR continua a string dos NAMES
 * (ex.: "GLTFLoader") → IR (`importNamed`), round-trip, serialização e allowlist ficam
 * IDÊNTICOS a um `field_input`; só troca o EDITOR por um seletor + input de texto livre
 * (para um addon fora da lista). Como o valor exibido JÁ é o nome escolhido (e o MODULE
 * é um campo serializado), não precisa de derivação reversa — o round-trip restaura os
 * dois campos direto. Espelha `FieldAssetPicker`.
 */

/** Addons comuns dos projetos three.js, agrupados; caminhos canônicos `three/addons/…`. */
export const COMMON_ADDONS = CANVAS3D_STUDIO_ADDON_GROUPS

/** Nome do addon → módulo canônico (o auto-preenchimento do campo MODULE). */
export const ADDON_MODULES = CANVAS3D_ADDON_MODULES

/** Reaplica o data-sz-theme do root no DropDownDiv portalado (mesmo do FieldAssetPicker). */
function applyThemeScope(field: Blockly.Field, content: HTMLElement): void {
  const workspace = field.getSourceBlock()?.workspace as { getInjectionDiv?(): unknown } | undefined
  const injectionDiv = workspace?.getInjectionDiv?.()
  const scope = injectionDiv instanceof HTMLElement ? injectionDiv.closest('[data-sz-theme]') : null
  const theme = scope?.getAttribute('data-sz-theme')
  if (theme) content.setAttribute('data-sz-theme', theme)
}

export class FieldAddonPicker extends Blockly.FieldTextInput {
  static override fromJson(options: Blockly.FieldTextInputFromJsonConfig): FieldAddonPicker {
    return new FieldAddonPicker(`${options.text ?? ''}`)
  }

  /** Escolher um addon: grava o NOME neste campo e o CAMINHO no campo irmão MODULE. */
  private pick(name: string, module: string): void {
    this.setValue(name)
    this.getSourceBlock()?.setFieldValue(
      ADDON_MODULES[name] === module ? CANVAS3D_AUTO_ADDON_MODULE : module,
      'MODULE',
    )
    Blockly.DropDownDiv.hideIfOwner(this)
  }

  protected override showEditor_(): void {
    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)

    const wrap = document.createElement('div')
    wrap.style.cssText =
      'padding:8px;width:min(280px,calc(100vw - 24px));background:var(--color-sz-panel);font-family:Nunito,system-ui,sans-serif;'

    const list = document.createElement('div')
    list.style.cssText =
      'display:flex;flex-direction:column;gap:4px;max-height:min(230px,calc(100vh - 150px));overflow:auto;'
    for (const grp of COMMON_ADDONS) {
      const head = document.createElement('div')
      head.textContent = grp.group
      head.style.cssText =
        'font-size:10px;font-weight:700;color:var(--color-sz-fg-soft);margin:6px 2px 2px;text-transform:uppercase;letter-spacing:.03em;'
      list.appendChild(head)
      for (const item of grp.items) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.style.cssText =
          'display:flex;min-height:45px;flex-direction:column;align-items:flex-start;justify-content:center;gap:1px;padding:7px 8px;border:1px solid var(--color-sz-border);border-radius:8px;background:var(--color-sz-bg);cursor:pointer;text-align:left;'
        const nm = document.createElement('span')
        nm.textContent = item.name
        nm.style.cssText = 'font-size:13px;font-weight:600;color:var(--color-sz-fg);'
        btn.append(nm)
        btn.addEventListener('click', () => this.pick(item.name, item.module))
        list.appendChild(btn)
      }
    }
    wrap.appendChild(list)

    // Fallback de texto livre: um addon fora da lista (a criança digita o nome; o
    // MODULE fica com o que já estiver, para ela ajustar). Preserva round-trip de custom.
    const row = document.createElement('div')
    row.style.cssText =
      'display:flex;gap:6px;margin-top:8px;border-top:1px solid var(--color-sz-border);padding-top:8px;align-items:center;'
    const input = document.createElement('input')
    input.type = 'text'
    input.value = `${this.getValue() ?? ''}`
    input.placeholder = 'outro (nome da classe)'
    input.spellcheck = false
    input.style.cssText =
      'flex:1;min-width:0;min-height:44px;padding:8px;border:1px solid var(--color-sz-border);background:var(--color-sz-bg);color:var(--color-sz-fg);border-radius:6px;font-size:12px;font-family:"JetBrains Mono",ui-monospace,monospace;outline:none;'
    const ok = document.createElement('button')
    ok.type = 'button'
    ok.textContent = 'OK'
    ok.style.cssText =
      'min-width:44px;min-height:45px;padding:8px 10px;background:var(--color-sz-accent);color:var(--color-sz-bg);border:0;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;'
    const apply = () => {
      const name = input.value.trim()
      // Se casar um addon conhecido, também auto-preenche o módulo.
      if (ADDON_MODULES[name]) {
        this.getSourceBlock()?.setFieldValue(CANVAS3D_AUTO_ADDON_MODULE, 'MODULE')
      }
      this.setValue(name)
      Blockly.DropDownDiv.hideIfOwner(this)
    }
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

    content.appendChild(wrap)
    Blockly.DropDownDiv.showPositionedByField(this, () => {})
    setTimeout(() => input.focus({ preventScroll: true }), 0)
  }
}

let registered = false

/** Registra o campo customizado uma única vez (idempotente). */
export function registerFieldAddonPicker(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_addon_picker', FieldAddonPicker)
  registered = true
}
