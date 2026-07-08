import * as Blockly from 'blockly/core'
import type { ProjectAsset } from '#core'

/**
 * Campo Blockly de TILES SÓLIDOS do bloco "Criar mapa de tiles": o VALOR continua
 * sendo a string `"0 1 2"` (serialização/IR/parser idênticos a `field_input` — só
 * troca o EDITOR). Ao clicar, mostra uma GRADE visual dos tiles (fatiados da imagem
 * do tileset) e a criança TOCA nos que bloqueiam (colisão), com os sólidos do Pinta
 * pré-selecionáveis. Sem metadado de tileset → cai no input de texto de sempre.
 */
interface AssetAccessor {
  __szAssets?: () => ProjectAsset[]
}

/** Reaplica o data-sz-theme do root no DropDownDiv portalado (mesmo do FieldAssetPicker). */
function applyThemeScope(field: Blockly.Field, content: HTMLElement): void {
  const workspace = field.getSourceBlock()?.workspace as { getInjectionDiv?(): unknown } | undefined
  const injectionDiv = workspace?.getInjectionDiv?.()
  const scope = injectionDiv instanceof HTMLElement ? injectionDiv.closest('[data-sz-theme]') : null
  const theme = scope?.getAttribute('data-sz-theme')
  if (theme) content.setAttribute('data-sz-theme', theme)
}

/** Índices como Set a partir da string "0 1 2" (mesma régua do runtime `parseSolidList`). */
function parseIndices(value: string): Set<number> {
  const set = new Set<number>()
  for (const token of value.split(/[\s,]+/)) {
    const n = Number.parseInt(token, 10)
    if (Number.isInteger(n) && n >= 0) set.add(n)
  }
  return set
}

interface TilesetInfo {
  asset: ProjectAsset
  tileSize: number
  solid: number[]
  cols: number
  count: number
}

/** Resolve o tileset da IMAGEM do bloco + a geometria (cols/count) das dimensões. */
export function resolveTileset(field: Blockly.Field): TilesetInfo | null {
  const block = field.getSourceBlock()
  const ws = block?.workspace as (Blockly.Workspace & AssetAccessor) | undefined
  if (!block || !ws) return null
  const imageName = block.getFieldValue('IMAGE')
  if (!imageName) return null
  const asset = (ws.__szAssets?.() ?? []).find((a) => a.name === imageName)
  if (!asset?.tileset || !asset.width || !asset.height) return null
  const tileSize = asset.tileset.tileSize
  if (tileSize <= 0) return null
  const cols = Math.max(1, Math.floor(asset.width / tileSize))
  const rows = Math.max(1, Math.floor(asset.height / tileSize))
  return { asset, tileSize, solid: asset.tileset.solid, cols, count: cols * rows }
}

export class FieldSolidTilesPicker extends Blockly.FieldTextInput {
  static override fromJson(options: Blockly.FieldTextInputFromJsonConfig): FieldSolidTilesPicker {
    return new FieldSolidTilesPicker(`${options.text ?? ''}`)
  }

  protected override showEditor_(): void {
    const info = resolveTileset(this)
    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)

    const wrap = document.createElement('div')
    wrap.style.cssText =
      'padding:8px;max-width:290px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'

    if (!info) {
      this.renderTextFallback(wrap)
      content.appendChild(wrap)
      Blockly.DropDownDiv.showPositionedByField(this, () => {})
      return
    }

    const selected = parseIndices(`${this.getValue() ?? ''}`)

    const help = document.createElement('div')
    help.textContent = 'Toque nos tiles que BLOQUEIAM o movimento (colisão).'
    help.style.cssText =
      'font-size:11px;color:var(--color-sz-fg-soft);padding:0 0 6px;line-height:1.4;'

    const grid = document.createElement('div')
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${Math.min(
      info.cols,
      8,
    )},1fr);gap:4px;max-height:200px;overflow:auto;`

    const buttons: HTMLButtonElement[] = []
    const paint = (btn: HTMLButtonElement, idx: number) => {
      const on = selected.has(idx)
      btn.style.borderColor = on ? 'var(--color-sz-accent)' : 'var(--color-sz-border)'
      btn.style.boxShadow = on ? '0 0 0 2px var(--color-sz-accent) inset' : 'none'
      const badge = btn.querySelector('span')
      if (badge) badge.style.display = on ? 'block' : 'none'
    }
    for (let idx = 0; idx < info.count; idx += 1) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.title = `Tile ${idx}`
      btn.style.cssText =
        'position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border:2px solid var(--color-sz-border);border-radius:6px;background:var(--color-sz-bg);cursor:pointer;padding:0;'
      const canvas = document.createElement('canvas')
      canvas.width = 28
      canvas.height = 28
      canvas.style.cssText = 'image-rendering:pixelated;width:28px;height:28px;'
      const badge = document.createElement('span')
      badge.textContent = '🧱'
      badge.style.cssText = 'position:absolute;top:-6px;right:-6px;font-size:12px;display:none;'
      btn.append(canvas, badge)
      const num = document.createElement('small')
      num.textContent = String(idx)
      num.style.cssText =
        'position:absolute;bottom:0;right:1px;font-size:8px;color:var(--color-sz-fg-soft);'
      btn.appendChild(num)
      paint(btn, idx)
      btn.addEventListener('click', () => {
        if (selected.has(idx)) selected.delete(idx)
        else selected.add(idx)
        paint(btn, idx)
      })
      buttons.push(btn)
      grid.appendChild(btn)
    }

    // Desenha cada tile a partir da imagem do tileset (best-effort; CSP-safe: `new
    // Image()` com data URL passa em `img-src data:` — NUNCA `fetch('data:')`).
    const img = new Image()
    img.onload = () => {
      for (let idx = 0; idx < buttons.length; idx += 1) {
        const canvas = buttons[idx]?.querySelector('canvas')
        const ctx = canvas?.getContext('2d')
        if (!ctx) continue
        ctx.imageSmoothingEnabled = false
        const sx = (idx % info.cols) * info.tileSize
        const sy = Math.floor(idx / info.cols) * info.tileSize
        ctx.clearRect(0, 0, 28, 28)
        ctx.drawImage(img, sx, sy, info.tileSize, info.tileSize, 0, 0, 28, 28)
      }
    }
    img.src = info.asset.dataUrl

    const footer = document.createElement('div')
    footer.style.cssText =
      'display:flex;gap:6px;margin-top:8px;justify-content:space-between;align-items:center;'
    const usePinta = document.createElement('button')
    usePinta.type = 'button'
    usePinta.textContent = 'Sólidos do Pinta'
    usePinta.style.cssText =
      'padding:3px 8px;background:transparent;color:var(--color-sz-fg-soft);border:1px solid var(--color-sz-border);border-radius:4px;cursor:pointer;font-size:11px;'
    usePinta.addEventListener('click', () => {
      selected.clear()
      for (const i of info.solid) selected.add(i)
      buttons.forEach((b, i) => {
        paint(b, i)
      })
    })
    const apply = document.createElement('button')
    apply.type = 'button'
    apply.textContent = 'Aplicar'
    apply.style.cssText =
      'padding:3px 12px;background:var(--color-sz-accent);color:var(--color-sz-bg);border:0;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;'
    apply.addEventListener('click', () => {
      this.setValue([...selected].sort((a, b) => a - b).join(' '))
      Blockly.DropDownDiv.hideIfOwner(this)
    })
    footer.append(usePinta, apply)

    wrap.append(help, grid, footer)
    content.appendChild(wrap)
    Blockly.DropDownDiv.showPositionedByField(this, () => {})
  }

  /** Editor de texto livre (quando não há tileset com metadado) — comportamento de sempre. */
  private renderTextFallback(wrap: HTMLElement): void {
    const row = document.createElement('div')
    row.style.cssText = 'display:flex;gap:6px;align-items:center;width:220px;'
    const input = document.createElement('input')
    input.type = 'text'
    input.value = `${this.getValue() ?? ''}`
    input.placeholder = 'ex.: 0 1 2'
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
    setTimeout(() => input.focus({ preventScroll: true }), 0)
  }
}

let registered = false

/** Registra o campo customizado uma única vez (idempotente). */
export function registerFieldSolidTilesPicker(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_solid_tiles_picker', FieldSolidTilesPicker)
  registered = true
}
