import * as Blockly from 'blockly/core'

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
export const COMMON_ADDONS: ReadonlyArray<{
  group: string
  items: ReadonlyArray<{ name: string; module: string }>
}> = [
  {
    group: '📦 Carregadores',
    items: [
      { name: 'GLTFLoader', module: 'three/addons/loaders/GLTFLoader.js' },
      { name: 'FBXLoader', module: 'three/addons/loaders/FBXLoader.js' },
      { name: 'OBJLoader', module: 'three/addons/loaders/OBJLoader.js' },
      { name: 'RGBELoader', module: 'three/addons/loaders/RGBELoader.js' },
      { name: 'DRACOLoader', module: 'three/addons/loaders/DRACOLoader.js' },
      { name: 'KTX2Loader', module: 'three/addons/loaders/KTX2Loader.js' },
    ],
  },
  {
    group: '🎮 Controles',
    items: [
      { name: 'OrbitControls', module: 'three/addons/controls/OrbitControls.js' },
      { name: 'PointerLockControls', module: 'three/addons/controls/PointerLockControls.js' },
    ],
  },
  {
    group: '✨ Efeitos (pós-processamento)',
    items: [
      { name: 'EffectComposer', module: 'three/addons/postprocessing/EffectComposer.js' },
      { name: 'RenderPass', module: 'three/addons/postprocessing/RenderPass.js' },
      { name: 'ShaderPass', module: 'three/addons/postprocessing/ShaderPass.js' },
      { name: 'UnrealBloomPass', module: 'three/addons/postprocessing/UnrealBloomPass.js' },
      { name: 'OutputPass', module: 'three/addons/postprocessing/OutputPass.js' },
    ],
  },
  {
    group: '🌊 Objetos',
    items: [
      { name: 'Water', module: 'three/addons/objects/Water.js' },
      { name: 'Sky', module: 'three/addons/objects/Sky.js' },
    ],
  },
]

/** Nome do addon → módulo canônico (o auto-preenchimento do campo MODULE). */
export const ADDON_MODULES: Record<string, string> = Object.fromEntries(
  COMMON_ADDONS.flatMap((g) => g.items.map((i) => [i.name, i.module] as const)),
)

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
    this.getSourceBlock()?.setFieldValue(module, 'MODULE')
    Blockly.DropDownDiv.hideIfOwner(this)
  }

  protected override showEditor_(): void {
    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)

    const wrap = document.createElement('div')
    wrap.style.cssText =
      'padding:8px;width:280px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'

    const list = document.createElement('div')
    list.style.cssText =
      'display:flex;flex-direction:column;gap:2px;max-height:230px;overflow:auto;'
    for (const grp of COMMON_ADDONS) {
      const head = document.createElement('div')
      head.textContent = grp.group
      head.style.cssText =
        'font-size:10px;font-weight:700;color:var(--color-sz-fg-soft);margin:6px 2px 2px;text-transform:uppercase;letter-spacing:.03em;'
      list.appendChild(head)
      for (const item of grp.items) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.title = item.module
        btn.style.cssText =
          'display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:5px 8px;border:1px solid var(--color-sz-border);border-radius:6px;background:var(--color-sz-bg);cursor:pointer;text-align:left;'
        const nm = document.createElement('span')
        nm.textContent = item.name
        nm.style.cssText = 'font-size:13px;font-weight:600;color:var(--color-sz-fg);'
        const mod = document.createElement('span')
        mod.textContent = item.module.replace('three/addons/', '…/')
        mod.style.cssText =
          'font-size:9px;color:var(--color-sz-fg-soft);font-family:"JetBrains Mono",ui-monospace,monospace;'
        btn.append(nm, mod)
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
      'flex:1;min-width:0;padding:3px 6px;border:1px solid var(--color-sz-border);background:var(--color-sz-bg);color:var(--color-sz-fg);border-radius:4px;font-size:12px;font-family:"JetBrains Mono",ui-monospace,monospace;outline:none;'
    const ok = document.createElement('button')
    ok.type = 'button'
    ok.textContent = 'OK'
    ok.style.cssText =
      'padding:3px 10px;background:var(--color-sz-accent);color:var(--color-sz-bg);border:0;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;'
    const apply = () => {
      const name = input.value.trim()
      // Se casar um addon conhecido, também auto-preenche o módulo.
      if (ADDON_MODULES[name]) this.getSourceBlock()?.setFieldValue(ADDON_MODULES[name], 'MODULE')
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
