import * as Blockly from 'blockly/core'
import type { ProjectAsset } from '#core'

/**
 * Campo Blockly de SOM: mostra o NOME do asset de áudio (string) e, ao clicar,
 * abre um DropDownDiv com a lista dos sons DO PROJETO — cada um com um ▶ para
 * ouvir. Espelha o `FieldAssetPicker` (imagem), mas lista `kind==='audio'` e usa
 * um item de áudio no lugar da miniatura `<img>`. Estende `FieldTextInput`: o
 * VALOR continua string (o nome do som) → IR/round-trip/serialização idênticos a
 * um `field_input`; escopado POR INSTÂNCIA via `workspace.__szAssets`.
 */
interface AssetAccessor {
  __szAssets?: () => ProjectAsset[]
}

/** Reaplica o `data-sz-theme` do root no conteúdo portalado (fora do escopo de tema). */
function applyThemeScope(field: Blockly.Field, content: HTMLElement): void {
  const workspace = field.getSourceBlock()?.workspace as { getInjectionDiv?(): unknown } | undefined
  const injectionDiv = workspace?.getInjectionDiv?.()
  const scope = injectionDiv instanceof HTMLElement ? injectionDiv.closest('[data-sz-theme]') : null
  const theme = scope?.getAttribute('data-sz-theme')
  if (theme) content.setAttribute('data-sz-theme', theme)
}

export class FieldSoundPicker extends Blockly.FieldTextInput {
  static override fromJson(options: Blockly.FieldTextInputFromJsonConfig): FieldSoundPicker {
    return new FieldSoundPicker(`${options.text ?? ''}`)
  }

  protected override showEditor_(): void {
    const ws = this.getSourceBlock()?.workspace as unknown as AssetAccessor | undefined
    const sounds = (ws?.__szAssets?.() ?? []).filter((a) => a && a.kind === 'audio')

    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)

    const wrap = document.createElement('div')
    wrap.style.cssText =
      'padding:8px;width:260px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'

    if (sounds.length === 0) {
      const empty = document.createElement('div')
      empty.textContent =
        'Nenhum som no projeto ainda. Abra "Imagens e sons" na barra de cima e toque em "Enviar som".'
      empty.style.cssText =
        'font-size:12px;color:var(--color-sz-fg-soft);padding:2px 2px 8px;line-height:1.4;'
      wrap.appendChild(empty)
    } else {
      const list = document.createElement('div')
      list.style.cssText =
        'display:flex;flex-direction:column;gap:4px;max-height:200px;overflow:auto;'
      for (const a of sounds) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.title = a.name
        btn.style.cssText =
          'display:flex;align-items:center;gap:6px;padding:5px 6px;border:1px solid var(--color-sz-border);border-radius:6px;background:var(--color-sz-bg);cursor:pointer;text-align:left;'
        const icon = document.createElement('span')
        icon.textContent = '🔊'
        icon.style.cssText = 'font-size:14px;'
        const label = document.createElement('span')
        label.textContent = a.name
        label.style.cssText =
          'flex:1;min-width:0;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--color-sz-fg);'
        // ▶ ouvir: não escolhe o som, só toca uma prévia.
        const play = document.createElement('span')
        play.textContent = '▶'
        play.title = 'Ouvir'
        play.style.cssText =
          'font-size:11px;color:var(--color-sz-accent);padding:0 4px;border-radius:4px;'
        play.addEventListener('click', (ev) => {
          ev.stopPropagation()
          try {
            const audio = new Audio(a.dataUrl)
            audio.currentTime = 0
            void audio.play().catch(() => {})
          } catch {}
        })
        btn.append(icon, label, play)
        btn.addEventListener('click', () => {
          this.setValue(a.name)
          Blockly.DropDownDiv.hideIfOwner(this)
        })
        list.appendChild(btn)
      }
      wrap.appendChild(list)
    }

    // Fallback de texto livre (nome ainda não criado / digitar à mão).
    const row = document.createElement('div')
    row.style.cssText =
      'display:flex;gap:6px;margin-top:8px;border-top:1px solid var(--color-sz-border);padding-top:8px;align-items:center;'
    const input = document.createElement('input')
    input.type = 'text'
    input.value = `${this.getValue() ?? ''}`
    input.placeholder = 'nome do som'
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
    setTimeout(() => input.focus({ preventScroll: true }), 0)
  }
}

let registered = false

/** Registra o campo customizado uma única vez (idempotente). */
export function registerFieldSoundPicker(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_sound_picker', FieldSoundPicker)
  registered = true
}
