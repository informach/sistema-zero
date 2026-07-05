import * as Blockly from 'blockly/core'
import type { ProjectAsset } from '#core'

/**
 * Campo Blockly de SPRITE: mostra o NOME do sprite (string) e, ao clicar, abre um
 * DropDownDiv com a lista dos sprites JÁ CRIADOS no programa (por QUALQUER bloco que
 * cria sprite — "Criar sprite", "Criar nave", "Criar dinossauro", "Pôr o gorila"…) — cada um com uma
 * miniatura (swatch da cor, ou a imagem do asset). Acaba com o erro de digitação
 * silencioso de digitar o nome do sprite igualzinho em cada bloco (à la Scratch/
 * MakeCode, onde o sprite é escolhido num menu, nunca digitado).
 *
 * Estende `FieldTextInput`, então o VALOR continua sendo uma string (o nome do
 * sprite) — IR, round-trip e serialização ficam IDÊNTICOS a um `field_input`; este
 * campo só troca o EDITOR por um seletor visual + um input de texto de fallback
 * (para nomear um sprite ainda não criado, ou digitar livre). Multi-instância: lê
 * os sprites do PRÓPRIO workspace do bloco e o acessor `__szAssets` da instância.
 */
interface AssetAccessor {
  __szAssets?: () => ProjectAsset[]
}

/**
 * Blocos que CRIAM um sprite nomeado (a fonte da lista do dropdown), e em qual
 * campo está a cor/imagem para a miniatura. Inclui os criadores genéricos E os dos
 * KITS (nave, dino, gorila) — senão a criança cria um sprite com "Criar nave" e o
 * seletor diz, ERRADO, que não há sprite nenhum. Todos guardam o nome no campo
 * `NAME`. ⚠️ Bloco novo que cria sprite nomeado? Adicione aqui.
 */
const SPRITE_DECL_BLOCKS: Record<string, { color?: string; image?: string }> = {
  sz_g2d_create_sprite: { color: 'COLOR' },
  sz_g2d_create_image_sprite: { image: 'IMAGE' },
  sz_g2d_create_ship: { color: 'BODY' }, // criar nave (Kit espaço)
  sz_g2d_create_dino: { color: 'COLOR' }, // criar dinossauro (Kit dino)
  sz_g2d_place_thrower: { color: 'COLOR' }, // pôr o gorila (Kit gorilas)
}

interface SpriteOption {
  name: string
  color?: string
  image?: string
}

/** Coleta os sprites criados no workspace, na ordem dos blocos, sem repetir nome. */
export function collectSprites(workspace: Blockly.Workspace | null | undefined): SpriteOption[] {
  if (!workspace) return []
  const byName = new Map<string, SpriteOption>()
  for (const block of workspace.getAllBlocks(false)) {
    const decl = SPRITE_DECL_BLOCKS[block.type]
    if (!decl) continue
    const name = block.getFieldValue('NAME')
    if (!name || byName.has(name)) continue
    const color =
      decl.color && block.getField(decl.color) ? block.getFieldValue(decl.color) : undefined
    const image =
      decl.image && block.getField(decl.image) ? block.getFieldValue(decl.image) : undefined
    byName.set(name, { name, color: color ?? undefined, image: image ?? undefined })
  }
  return [...byName.values()]
}

/**
 * Blocos de laço do Jogo 2D que dão um NOME LOCAL a cada sprite no corpo (o
 * sprite "da vez", ex.: "para cada sprite …", "… encostar (chamado asteroide)").
 * Esses nomes valem só DENTRO do bloco, então entram no seletor apenas quando o
 * campo está dentro dele (escopo por ancestral). Campos que aqui DECLARAM o nome
 * seguem `field_input` — só os consumidores viram seletor.
 */
const SPRITE_LOOP_BINDERS: Record<string, string[]> = {
  sz_g2d_for_each_in_group: ['ITEM'],
  sz_g2d_prune_offscreen: ['ITEM'],
  sz_g2d_on_group_overlap: ['ANAME', 'BNAME'],
  sz_g2d_on_sprite_group_overlap: ['ANAME'],
}

/**
 * Nomes de sprite LOCAIS em escopo no ponto do campo: sobe pelos blocos que
 * ENVOLVEM o bloco do campo (`getSurroundParent`) e coleta os nomes dados por
 * laços. Só aparecem dentro do laço que os declara.
 */
export function collectScopedSpriteNames(block: Blockly.Block | null | undefined): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  let cur = block?.getSurroundParent() ?? null
  while (cur) {
    const fields = SPRITE_LOOP_BINDERS[cur.type]
    if (fields) {
      for (const f of fields) {
        if (!cur.getField(f)) continue
        const name = cur.getFieldValue(f)
        if (name && !seen.has(name)) {
          seen.add(name)
          ordered.push(name)
        }
      }
    }
    cur = cur.getSurroundParent() ?? null
  }
  return ordered
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

export class FieldSpritePicker extends Blockly.FieldTextInput {
  static override fromJson(options: Blockly.FieldTextInputFromJsonConfig): FieldSpritePicker {
    return new FieldSpritePicker(`${options.text ?? ''}`)
  }

  protected override showEditor_(): void {
    const block = this.getSourceBlock()
    const ws = block?.workspace
    const sprites = collectSprites(ws)
    const globalNames = new Set(sprites.map((s) => s.name))
    // Sprites LOCAIS em escopo (nome dado por um laço que ENVOLVE este campo).
    const localNames = collectScopedSpriteNames(block).filter((n) => !globalNames.has(n))
    const assets = ((ws as unknown as AssetAccessor | undefined)?.__szAssets?.() ?? []).filter(
      (a) => a && a.kind === 'image',
    )
    const assetUrl = (name?: string): string | undefined =>
      name ? assets.find((a) => a.name === name)?.dataUrl : undefined

    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)

    const wrap = document.createElement('div')
    wrap.style.cssText =
      'padding:8px;width:240px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'

    if (sprites.length === 0 && localNames.length === 0) {
      const empty = document.createElement('div')
      empty.textContent =
        'Nenhum sprite no programa ainda — crie um (ex.: "Criar sprite", "Criar nave"…) ou digite o nome abaixo.'
      empty.style.cssText =
        'font-size:12px;color:var(--color-sz-fg-soft);padding:2px 2px 8px;line-height:1.4;'
      wrap.appendChild(empty)
    } else {
      const list = document.createElement('div')
      list.style.cssText =
        'display:flex;flex-direction:column;gap:4px;max-height:200px;overflow:auto;'
      for (const sprite of sprites) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.title = sprite.name
        const selected = sprite.name === this.getValue()
        btn.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 7px;border:1px solid ${selected ? 'var(--color-sz-accent)' : 'var(--color-sz-border)'};border-radius:6px;background:var(--color-sz-bg);cursor:pointer;text-align:left;`
        const swatch = document.createElement('span')
        swatch.style.cssText =
          'flex:none;width:22px;height:22px;border-radius:5px;border:1px solid var(--color-sz-border);background-size:cover;background-position:center;image-rendering:pixelated;'
        const url = assetUrl(sprite.image)
        if (url) swatch.style.backgroundImage = `url("${url}")`
        else swatch.style.background = sprite.color || '#22d3ee'
        const label = document.createElement('span')
        label.textContent = sprite.name
        label.style.cssText =
          'font-size:13px;color:var(--color-sz-fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
        btn.append(swatch, label)
        btn.addEventListener('click', () => {
          this.setValue(sprite.name)
          Blockly.DropDownDiv.hideIfOwner(this)
        })
        list.appendChild(btn)
      }
      // Sprites LOCAIS do laço (o sprite "da vez"): swatch de laço 🔁 + marca "no laço".
      for (const name of localNames) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.title = `${name} — sprite deste laço (local)`
        const selected = name === this.getValue()
        btn.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 7px;border:1px solid ${selected ? 'var(--color-sz-accent)' : 'var(--color-sz-border)'};border-radius:6px;background:var(--color-sz-bg);cursor:pointer;text-align:left;`
        const swatch = document.createElement('span')
        swatch.textContent = '🔁'
        swatch.style.cssText =
          'flex:none;width:22px;height:22px;border-radius:5px;border:1px dashed var(--color-sz-border);display:flex;align-items:center;justify-content:center;font-size:12px;'
        const label = document.createElement('span')
        label.textContent = name
        label.style.cssText =
          'flex:1;min-width:0;font-size:13px;color:var(--color-sz-fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
        const tag = document.createElement('span')
        tag.textContent = 'no laço'
        tag.style.cssText = 'flex:none;font-size:11px;color:var(--color-sz-fg-soft);'
        btn.append(swatch, label, tag)
        btn.addEventListener('click', () => {
          this.setValue(name)
          Blockly.DropDownDiv.hideIfOwner(this)
        })
        list.appendChild(btn)
      }
      wrap.appendChild(list)
    }

    // Fallback de texto livre (nomear um sprite ainda não criado, ou digitar livre).
    const row = document.createElement('div')
    row.style.cssText =
      'display:flex;gap:6px;margin-top:8px;border-top:1px solid var(--color-sz-border);padding-top:8px;align-items:center;'
    const input = document.createElement('input')
    input.type = 'text'
    input.value = `${this.getValue() ?? ''}`
    input.placeholder = 'nome do sprite'
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
export function registerFieldSpritePicker(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_sprite_picker', FieldSpritePicker)
  registered = true
}
