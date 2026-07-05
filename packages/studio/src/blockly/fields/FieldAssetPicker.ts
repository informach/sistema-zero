import * as Blockly from 'blockly/core'
import type { ProjectAsset } from '#core'

/**
 * Campo Blockly de IMAGEM: mostra o NOME do asset (string) e, ao clicar, abre um
 * DropDownDiv com a grade de imagens DO PROJETO para escolher — escopado POR
 * INSTÂNCIA via um acessor (`workspace.__szAssets`) que o BlocklyPanel anexa ao
 * injetar (multi-instância: nada de dropdown com acessor global, invariante #5).
 * Estende `FieldTextInput`, então o VALOR continua sendo uma string (o nome do
 * asset) — IR, round-trip e serialização ficam idênticos a um `field_input`; este
 * campo só troca o EDITOR por um seletor visual + um input de texto de fallback.
 */
interface AssetAccessor {
  __szAssets?: () => ProjectAsset[]
}

/**
 * Reaplica o `data-sz-theme` do root no conteúdo portalado do DropDownDiv (vive
 * sob document.body, fora do escopo de tema). Mesmo padrão do FieldColourSZ.
 */
function applyThemeScope(field: Blockly.Field, content: HTMLElement): void {
  const workspace = field.getSourceBlock()?.workspace as { getInjectionDiv?(): unknown } | undefined
  const injectionDiv = workspace?.getInjectionDiv?.()
  const scope = injectionDiv instanceof HTMLElement ? injectionDiv.closest('[data-sz-theme]') : null
  const theme = scope?.getAttribute('data-sz-theme')
  if (theme) content.setAttribute('data-sz-theme', theme)
}

export class FieldAssetPicker extends Blockly.FieldTextInput {
  static override fromJson(options: Blockly.FieldTextInputFromJsonConfig): FieldAssetPicker {
    // `new this(...)` NÃO é garantido na fromJson herdada (algumas hardcodam a
    // classe base) — sobrescrevemos para garantir a instância correta.
    return new FieldAssetPicker(`${options.text ?? ''}`)
  }

  protected override showEditor_(): void {
    const ws = this.getSourceBlock()?.workspace as unknown as AssetAccessor | undefined
    const assets = (ws?.__szAssets?.() ?? []).filter((a) => a && a.kind === 'image')

    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)

    const wrap = document.createElement('div')
    wrap.style.cssText =
      'padding:8px;width:260px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'

    if (assets.length === 0) {
      const empty = document.createElement('div')
      empty.textContent =
        'Nenhuma imagem no projeto ainda. Abra "Imagens" na barra de cima para adicionar.'
      empty.style.cssText =
        'font-size:12px;color:var(--color-sz-fg-soft);padding:2px 2px 8px;line-height:1.4;'
      wrap.appendChild(empty)
    } else {
      const grid = document.createElement('div')
      grid.style.cssText =
        'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;max-height:180px;overflow:auto;'
      for (const a of assets) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.title = a.name
        btn.style.cssText =
          'display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px;border:1px solid var(--color-sz-border);border-radius:6px;background:var(--color-sz-bg);cursor:pointer;'
        const im = document.createElement('img')
        im.src = a.dataUrl
        im.alt = a.name
        im.style.cssText = 'width:40px;height:40px;object-fit:contain;image-rendering:pixelated;'
        const label = document.createElement('span')
        label.textContent = a.name
        label.style.cssText =
          'font-size:9px;max-width:46px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--color-sz-fg);'
        btn.append(im, label)
        btn.addEventListener('click', () => {
          this.setValue(a.name)
          Blockly.DropDownDiv.hideIfOwner(this)
        })
        grid.appendChild(btn)
      }
      wrap.appendChild(grid)
    }

    // Fallback de texto livre (também serve para digitar um nome ainda não criado).
    const row = document.createElement('div')
    row.style.cssText =
      'display:flex;gap:6px;margin-top:8px;border-top:1px solid var(--color-sz-border);padding-top:8px;align-items:center;'
    const input = document.createElement('input')
    input.type = 'text'
    input.value = `${this.getValue() ?? ''}`
    input.placeholder = 'nome da imagem'
    input.spellcheck = false
    input.style.cssText =
      'flex:1;min-width:0;padding:3px 6px;border:1px solid var(--color-sz-border);background:var(--color-sz-bg);color:var(--color-sz-fg);border-radius:4px;font-size:12px;font-family:"JetBrains Mono",ui-monospace,monospace;outline:none;'
    const ok = document.createElement('button')
    ok.type = 'button'
    ok.textContent = 'OK'
    ok.style.cssText =
      'padding:3px 10px;background:var(--color-sz-accent);color:var(--color-sz-bg);border:0;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;'
    const apply = () => {
      this.setValue(input.value.trim())
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
    // `preventScroll`: não rolar a página até o input (ver FieldNamePicker).
    setTimeout(() => input.focus({ preventScroll: true }), 0)
  }
}

let registered = false

/** Registra o campo customizado uma única vez (idempotente). */
export function registerFieldAssetPicker(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_asset_picker', FieldAssetPicker)
  registered = true
}
