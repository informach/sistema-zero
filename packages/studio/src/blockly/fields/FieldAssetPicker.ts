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
 * Soquetes que o seletor pode preencher, por bloco, com o DEFAULT DE FÁBRICA
 * da sombra da paleta. É ALLOWLIST: bloco fora daqui (e fora do caso especial
 * do tilemap) nunca recebe escrita. Os valores são a régua de "este número
 * ainda é nosso": só um soquete no default de fábrica (ou na sugestão do
 * asset anterior) aceita sugestão nova — ver `applySuggestedSize`. O campo
 * core não importa extensão (mesmo precedente do `LEGACY_VALUE_FIELDS`); o
 * drift em `applySuggestedSize.test.ts` confere cada valor contra a sombra
 * REAL da toolbox e exige que todo bloco com seletor de imagem + soquete de
 * tamanho esteja aqui OU no `SUGGESTION_OPT_OUT`.
 */
export interface SuggestibleSockets {
  /** Tamanho do SPRITE na tela (sugestão frame-aware, com fator de ampliação). */
  size?: { W: number; H: number }
  /** Tamanho do QUADRO da folha (valor EXATO do metadado do Pinta, sem fator). */
  frame?: { FW: number; FH: number }
}

export const SUGGESTIBLE_SOCKET_DEFAULTS: Record<string, SuggestibleSockets> = {
  sz_g2d_create_image_sprite: { size: { W: 40, H: 40 } },
  sz_g2d_spawn_image_in_group: { size: { W: 32, H: 32 } },
  sz_g2d_define_enemy_type: { size: { W: 32, H: 32 } },
  sz_g2d_define_enemy_smart: { size: { W: 32, H: 32 } },
  sz_gk_create_character: { size: { W: 64, H: 64 } },
  sz_gk_define_mold: { size: { W: 40, H: 40 } },
  sz_canvas_draw_image: { size: { W: 100, H: 100 } },
  sz_g2d_load_spritesheet: { frame: { FW: 32, FH: 32 } },
  sz_gk_set_sheet: { frame: { FW: 32, FH: 32 } },
  sz_gk_set_walk_sheet: { frame: { FW: 16, FH: 16 } },
}

/**
 * Blocos com seletor de imagem E soquetes W/H em que sugerir tamanho em PIXEL
 * é sempre errado: ali W/H são unidades de MUNDO 3D (fábrica 3 no quadro do
 * Mundo, 1 na peça do molde). A escrita genérica antiga os alcançava e virava
 * paredão sem erro nenhum; a allowlist matou a classe, e este conjunto
 * registra a decisão para o drift não acusar bloco deliberadamente de fora.
 */
export const SUGGESTION_OPT_OUT: ReadonlySet<string> = new Set([
  'sz_w3d_totem_image',
  'sz_g3k_part',
])

/**
 * Tamanho sugerido para um asset: folha com metadado do Pinta sugere o QUADRO
 * (é um quadro por vez que aparece na tela), nunca a folha inteira — era isso
 * que sugeria "128 × 32" para um personagem animado.
 */
export function suggestedSizeForAsset(asset: ProjectAsset): { w: number; h: number } | null {
  const sprite = asset.sprite
  if (sprite) return suggestedSpriteSize(sprite.frameW, sprite.frameH)
  if (!asset.width || !asset.height) return null
  return suggestedSpriteSize(asset.width, asset.height)
}

/** Literal-sombra numérico do soquete; null = vazio, variável/expressão ou bloco REAL. */
function shadowNumberAt(block: Blockly.Block, inputName: string): number | null {
  const target = block.getInput(inputName)?.connection?.targetBlock()
  if (!target?.isShadow() || target.type !== 'sz_val_number') return null
  const value = Number(target.getFieldValue('NUM'))
  return Number.isFinite(value) ? value : null
}

interface SuggestedSlot {
  input: string
  /** O valor a escrever. */
  next: number
  /** Default de fábrica da sombra da paleta (`SUGGESTIBLE_SOCKET_DEFAULTS`). */
  factory: number
  /** Sugestão que ESTE campo teria calculado para o asset anterior, se houver. */
  previous: number | null
}

/**
 * Escreve um PAR de soquetes tudo-ou-nada: se qualquer um dos dois carrega um
 * número da criança (nem fábrica, nem sugestão anterior) — ou não é sombra
 * numérica (variável plugada, literal real pós-Ponte ainda sem cura) — nenhum
 * dos dois muda. Atualizar só metade misturaria a proporção sugerida com a
 * escolhida por ela.
 */
function applySuggestedPair(block: Blockly.Block, slots: SuggestedSlot[]): void {
  for (const slot of slots) {
    const current = shadowNumberAt(block, slot.input)
    if (current === null) return
    if (current !== slot.factory && current !== slot.previous) return
  }
  for (const slot of slots) setNumberShadow(block, slot.input, slot.next)
}

/**
 * Preenche os soquetes do bloco com o tamanho sugerido do asset escolhido na
 * grade. A sugestão só escreve por cima de um valor comprovadamente NOSSO — o
 * default de fábrica da sombra ou a sugestão calculada para o asset ANTERIOR
 * do campo; qualquer outro número foi a criança que pôs e nunca é tocado. A
 * régua é por VALOR porque shadow-ness não distingue nada: editar a sombra
 * NÃO a materializa em bloco real (Blockly 12) e a Ponte re-sombreia os
 * literais no load (`restoreShadowLiterals`). Zero impacto no round-trip —
 * escrever aqui é o mesmo que digitar o número no soquete.
 */
export function applySuggestedSize(
  field: Blockly.Field,
  asset: ProjectAsset,
  previousAssetName?: string,
): void {
  const block = field.getSourceBlock()
  if (!block) return
  // Mapa de tiles: preenche o "tamanho do tile" com o tamanho do tile NA ARTE (do
  // Pinta) — é o que fatia o tileset certo; o tamanho NA TELA é auto (encaixa no canvas).
  // ⚠️ EXCEÇÃO DELIBERADA à regra do "não sobrescrever o digitado": o tileSize é a
  // verdade OBJETIVA do fatiamento daquele desenho — um número divergente quebra a
  // grade inteira — então aqui o metadado vence inclusive um valor da criança.
  // ⚠️ Escolher um asset de MAPA (com metadado tilemap) aqui NÃO auto-preenche
  // GRID/SOLID de propósito: neste bloco a IMAGE é a FOLHA a fatiar, e o asset de
  // mapa é o PNG ACHATADO — preencher deixaria a imagem errada sem nenhum erro.
  // O caminho "mapa pronto" é o bloco "Criar mapa do meu desenho".
  if (block.type === 'sz_g2d_create_tilemap') {
    const tileSize = asset.tileset?.tileSize
    if (tileSize && tileSize > 0) setNumberShadow(block, 'TILE', tileSize)
    return
  }
  const plan = SUGGESTIBLE_SOCKET_DEFAULTS[block.type]
  if (!plan) return
  const assets = (block.workspace as unknown as AssetAccessor).__szAssets?.() ?? []
  const previous = previousAssetName
    ? assets.find((a) => a?.kind === 'image' && a.name === previousAssetName)
    : undefined

  if (plan.size) {
    const next = suggestedSizeForAsset(asset)
    if (next) {
      const before = previous ? suggestedSizeForAsset(previous) : null
      applySuggestedPair(block, [
        { input: 'W', next: next.w, factory: plan.size.W, previous: before?.w ?? null },
        { input: 'H', next: next.h, factory: plan.size.H, previous: before?.h ?? null },
      ])
    }
  }
  if (plan.frame) {
    const sprite = asset.sprite
    const validFrame =
      sprite &&
      Number.isFinite(sprite.frameW) &&
      sprite.frameW > 0 &&
      Number.isFinite(sprite.frameH) &&
      sprite.frameH > 0
    if (validFrame) {
      applySuggestedPair(block, [
        {
          input: 'FW',
          next: sprite.frameW,
          factory: plan.frame.FW,
          previous: previous?.sprite?.frameW ?? null,
        },
        {
          input: 'FH',
          next: sprite.frameH,
          factory: plan.frame.FH,
          previous: previous?.sprite?.frameH ?? null,
        },
      ])
    }
  }
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
    wrap.className = 'sz-asset-picker'
    wrap.tabIndex = -1
    wrap.setAttribute('role', 'group')
    wrap.setAttribute(
      'aria-label',
      kind === '3d' ? 'Escolher modelo 3D' : kind === 'audio' ? 'Escolher som' : 'Escolher imagem',
    )
    wrap.style.cssText =
      'padding:8px;width:260px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'

    if (assets.length === 0) {
      const empty = document.createElement('div')
      empty.textContent =
        kind === '3d'
          ? 'Nenhum modelo 3D no projeto ainda. Monte um no Molda e toque em "Trazer do Molda" no painel Imagens (ou envie um .glb/.hdr por lá).'
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
        btn.className = 'sz-asset-picker__option'
        btn.title = a.name
        btn.setAttribute('aria-label', a.name)
        btn.style.cssText =
          'display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px;border:1px solid var(--color-sz-border);border-radius:6px;background:var(--color-sz-bg);cursor:pointer;'
        // Miniatura: imagem real p/ `image`; um emoji p/ 3D/áudio (um .glb/.mp3
        // não renderiza como <img>). 📦 modelo · 🌅 céu HDR · 🔊 som.
        let thumb: HTMLElement
        if (a.kind === 'image') {
          const im = document.createElement('img')
          im.src = a.dataUrl
          im.alt = ''
          im.width = 40
          im.height = 40
          im.style.cssText = 'width:40px;height:40px;object-fit:contain;image-rendering:pixelated;'
          thumb = im
        } else {
          const icon = document.createElement('span')
          icon.setAttribute('aria-hidden', 'true')
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
          // O nome ANTERIOR é capturado antes do setValue: é ele que deixa a
          // sugestão reconhecer o número que ELA MESMA escreveu da outra vez e
          // acompanhar a troca de imagem — sem nunca tocar num valor digitado.
          const previousAssetName = `${this.getValue() ?? ''}`
          this.setValue(a.name)
          applySuggestedSize(this, a, previousAssetName)
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
    input.className = 'sz-asset-picker__input sz-field-picker__input'
    input.value = `${this.getValue() ?? ''}`
    input.placeholder =
      kind === '3d' ? 'nome do modelo' : kind === 'audio' ? 'nome do som' : 'nome da imagem'
    input.spellcheck = false
    input.autocomplete = 'off'
    input.setAttribute(
      'aria-label',
      kind === '3d' ? 'Nome do modelo' : kind === 'audio' ? 'Nome do som' : 'Nome da imagem',
    )
    input.style.cssText =
      'flex:1;min-width:0;padding:3px 6px;border:1px solid var(--color-sz-border);background:var(--color-sz-bg);color:var(--color-sz-fg);border-radius:4px;font-size:12px;font-family:"JetBrains Mono",ui-monospace,monospace;'
    const ok = document.createElement('button')
    ok.type = 'button'
    ok.textContent = 'OK'
    ok.className = 'sz-field-picker__button'
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
  }
}

let registered = false

/** Registra o campo customizado uma única vez (idempotente). */
export function registerFieldAssetPicker(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_asset_picker', FieldAssetPicker)
  registered = true
}
