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
 * Assets que a grade do seletor deve listar, por FAMÍLIA (`kind` do bloco):
 * `'3d'` = modelo .glb + céu .hdr; `'audio'` = som; `'image'` = imagens (com o
 * sub-filtro `'tilemap'` opcional, só mapas). Puro — a UI e o teste compartilham.
 */
export function filterAssetsForPicker(
  assets: readonly ProjectAsset[],
  kind: 'image' | '3d' | 'audio',
  filter?: 'tilemap' | 'model3d' | 'environment3d',
): ProjectAsset[] {
  return assets.filter((a) => {
    if (!a) return false
    if (kind === '3d') {
      if (filter === 'model3d') return a.kind === 'model3d'
      if (filter === 'environment3d') return a.kind === 'environment3d'
      return a.kind === 'model3d' || a.kind === 'environment3d'
    }
    if (kind === 'audio') return a.kind === 'audio'
    return a.kind === 'image' && (filter !== 'tilemap' || Boolean(a.tilemap))
  })
}

/**
 * Fator de ampliação sugerido para um asset: pixel art pequena (16/32) sobe
 * para perto de ~48–64px por MÚLTIPLO INTEIRO (nítido com o nearest do
 * runtime); imagem já grande fica no tamanho real. Um fator só para W e H —
 * preserva a proporção de assets não-quadrados.
 */
export function suggestedSpriteSize(
  width: number,
  height: number,
): { w: number; h: number } | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  const factor = Math.max(1, Math.round(48 / Math.max(width, height)))
  return { w: width * factor, h: height * factor }
}

/**
 * Preenche os soquetes W/H do bloco com o tamanho sugerido do asset escolhido.
 * SÓ mexe em SHADOW `sz_val_number`: valor que a criança plugou ou editou (o
 * shadow editado materializa em bloco real) nunca é sobrescrito. Zero impacto
 * no round-trip — é o mesmo que digitar o número no soquete.
 */
function applySuggestedSize(field: Blockly.Field, asset: ProjectAsset): void {
  const block = field.getSourceBlock()
  if (!block) return
  // Mapa de tiles: preenche o "tamanho do tile" com o tamanho do tile NA ARTE (do
  // Pinta) — é o que fatia o tileset certo; o tamanho NA TELA é auto (encaixa no canvas).
  // ⚠️ Escolher um asset de MAPA (com metadado tilemap) aqui NÃO auto-preenche
  // GRID/SOLID de propósito: neste bloco a IMAGE é a FOLHA a fatiar, e o asset de
  // mapa é o PNG ACHATADO — preencher deixaria a imagem errada sem nenhum erro.
  // O caminho "mapa pronto" é o bloco "Criar mapa do meu desenho".
  if (block.type === 'sz_g2d_create_tilemap') {
    const tileSize = asset.tileset?.tileSize
    if (tileSize && tileSize > 0) setNumberShadow(block, 'TILE', tileSize)
    return
  }
  if (!asset.width || !asset.height) return
  const size = suggestedSpriteSize(asset.width, asset.height)
  if (!size) return
  setNumberShadow(block, 'W', size.w)
  setNumberShadow(block, 'H', size.h)
}

/** Escreve `value` no shadow `sz_val_number` do input, se houver (não sobrescreve bloco real). */
function setNumberShadow(block: Blockly.Block, inputName: string, value: number): void {
  const target = block.getInput(inputName)?.connection?.targetBlock()
  if (target?.isShadow() && target.type === 'sz_val_number') {
    target.setFieldValue(String(value), 'NUM')
  }
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
  /**
   * Filtro opcional da grade: `'tilemap'` só lista assets com metadado de MAPA
   * (o bloco "Criar mapa do meu desenho" não deve oferecer imagens comuns).
   * Vem da DEFINIÇÃO do bloco (`filter` no JSON) — estrutural, não serializa.
   */
  private assetFilter?: 'tilemap' | 'model3d' | 'environment3d'
  /**
   * Que FAMÍLIA de asset a grade lista: `'image'` (padrão), `'3d'` (modelo .glb /
   * céu .hdr) ou `'audio'` (som). Vem da DEFINIÇÃO do bloco (`kind` no JSON) —
   * estrutural, não serializa. O VALOR do campo continua sendo só o nome (string).
   */
  private assetKind: 'image' | '3d' | 'audio'

  constructor(
    text: string,
    filter?: 'tilemap' | 'model3d' | 'environment3d',
    kind: 'image' | '3d' | 'audio' = 'image',
  ) {
    super(text)
    this.assetFilter = filter
    this.assetKind = kind
  }

  static override fromJson(
    options: Blockly.FieldTextInputFromJsonConfig & { filter?: string; kind?: string },
  ): FieldAssetPicker {
    // `new this(...)` NÃO é garantido na fromJson herdada (algumas hardcodam a
    // classe base) — sobrescrevemos para garantir a instância correta.
    const kind = options.kind === '3d' || options.kind === 'audio' ? options.kind : 'image'
    return new FieldAssetPicker(
      `${options.text ?? ''}`,
      options.filter === 'tilemap' ||
        options.filter === 'model3d' ||
        options.filter === 'environment3d'
        ? options.filter
        : undefined,
      kind,
    )
  }

  protected override showEditor_(): void {
    const ws = this.getSourceBlock()?.workspace as unknown as AssetAccessor | undefined
    const kind = this.assetKind
    const assets = filterAssetsForPicker(ws?.__szAssets?.() ?? [], kind, this.assetFilter)

    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)

    const wrap = document.createElement('div')
    wrap.style.cssText =
      'padding:8px;width:260px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'

    if (assets.length === 0) {
      const empty = document.createElement('div')
      empty.textContent =
        kind === '3d'
          ? 'Nenhum modelo 3D no projeto ainda. Abra "Imagens" na barra de cima e envie um .glb/.hdr.'
          : kind === 'audio'
            ? 'Nenhum som no projeto ainda. Abra "Imagens" na barra de cima e envie um áudio.'
            : this.assetFilter === 'tilemap'
              ? 'Nenhum mapa ainda. Desenhe um MAPA no Pinta e toque no foguete "Usar no Estúdio" (ou fatie uma imagem no painel Imagens).'
              : 'Nenhuma imagem no projeto ainda. Abra "Imagens" na barra de cima para adicionar.'
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
        // Miniatura: imagem real p/ `image`; um emoji p/ 3D/áudio (um .glb/.mp3
        // não renderiza como <img>). 📦 modelo · 🌅 céu HDR · 🔊 som.
        let thumb: HTMLElement
        if (a.kind === 'image') {
          const im = document.createElement('img')
          im.src = a.dataUrl
          im.alt = a.name
          im.style.cssText = 'width:40px;height:40px;object-fit:contain;image-rendering:pixelated;'
          thumb = im
        } else {
          const icon = document.createElement('span')
          icon.textContent = a.kind === 'environment3d' ? '🌅' : a.kind === 'audio' ? '🔊' : '📦'
          icon.style.cssText =
            'width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:26px;'
          thumb = icon
        }
        const label = document.createElement('span')
        label.textContent = a.name
        label.style.cssText =
          'font-size:9px;max-width:46px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--color-sz-fg);'
        btn.append(thumb, label)
        if (a.width && a.height) {
          const dims = document.createElement('span')
          dims.textContent = `${a.width}×${a.height}`
          dims.style.cssText = 'font-size:8px;color:var(--color-sz-fg-soft);'
          btn.appendChild(dims)
        }
        btn.addEventListener('click', () => {
          this.setValue(a.name)
          applySuggestedSize(this, a)
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
    input.placeholder =
      kind === '3d' ? 'nome do modelo' : kind === 'audio' ? 'nome do som' : 'nome da imagem'
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
