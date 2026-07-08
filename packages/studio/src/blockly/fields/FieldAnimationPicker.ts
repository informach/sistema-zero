import * as Blockly from 'blockly/core'
import type { ProjectAsset, ProjectSpriteAnim } from '#core'

/**
 * Campo Blockly de ANIMAÇÃO do bloco "Animar sprite": mostra o NOME da animação e,
 * ao clicar, lista as animações da FOLHA (nomes vindos do Pinta) para a criança
 * escolher; ao escolher, PREENCHE os soquetes do quadro/velocidade (FROM/TO/FPS)
 * sozinho. É um campo de EXIBIÇÃO — `SERIALIZABLE = false`: não entra em
 * blocksState/IR/parser/allowlist (FROM/TO/FPS seguem a fonte da verdade, então o
 * round-trip fica idêntico). Sem metadado do Pinta (asset de upload / projeto
 * antigo) → estado vazio e a criança digita os quadros à mão, como sempre.
 */
interface AssetAccessor {
  __szAssets?: () => ProjectAsset[]
}

const LOAD_SPRITESHEET_TYPE = 'sz_g2d_load_spritesheet'

/** Reaplica o data-sz-theme do root no DropDownDiv portalado (mesmo do FieldAssetPicker). */
function applyThemeScope(field: Blockly.Field, content: HTMLElement): void {
  const workspace = field.getSourceBlock()?.workspace as { getInjectionDiv?(): unknown } | undefined
  const injectionDiv = workspace?.getInjectionDiv?.()
  const scope = injectionDiv instanceof HTMLElement ? injectionDiv.closest('[data-sz-theme]') : null
  const theme = scope?.getAttribute('data-sz-theme')
  if (theme) content.setAttribute('data-sz-theme', theme)
}

/**
 * Resolve as animações disponíveis: lê a FOLHA (`SHEET`) do bloco de animar, acha o
 * bloco "Carregar folha de quadros" que declara esse nome, lê a IMAGEM dele e
 * devolve `asset.sprite.animations` (metadado do Pinta). Vazio quando não resolve.
 */
export function resolveAnimations(field: Blockly.Field): ProjectSpriteAnim[] {
  const block = field.getSourceBlock()
  const ws = block?.workspace as (Blockly.Workspace & AssetAccessor) | undefined
  if (!block || !ws) return []
  const sheetName = block.getFieldValue('SHEET')
  if (!sheetName) return []
  const loader = ws
    .getAllBlocks(false)
    .find((b) => b.type === LOAD_SPRITESHEET_TYPE && b.getFieldValue('NAME') === sheetName)
  const imageName = loader?.getFieldValue('IMAGE')
  if (!imageName) return []
  const asset = (ws.__szAssets?.() ?? []).find((a) => a.name === imageName)
  return asset?.sprite?.animations ?? []
}

/**
 * Preenche FROM/TO/FPS a partir da animação escolhida. SÓ SHADOW `sz_val_number`
 * (nunca sobrescreve valor/variável plugada). Zero impacto no round-trip.
 */
function fillFrames(field: Blockly.Field, anim: ProjectSpriteAnim): void {
  const block = field.getSourceBlock()
  if (!block) return
  const pairs: Array<[string, number]> = [
    ['FROM', anim.from],
    ['TO', anim.to],
    ['FPS', anim.fps],
  ]
  for (const [inputName, value] of pairs) {
    const target = block.getInput(inputName)?.connection?.targetBlock()
    if (target?.isShadow() && target.type === 'sz_val_number') {
      target.setFieldValue(String(value), 'NUM')
    }
  }
}

export class FieldAnimationPicker extends Blockly.FieldTextInput {
  // Campo de EXIBIÇÃO: não serializa (FROM/TO/FPS são a fonte da verdade). ⚠️ O
  // Blockly SERIALIZA todo campo EDITÁVEL mesmo com SERIALIZABLE=false (só avisa no
  // console) — a trava real é sobrescrever `isSerializable()` p/ false. Sem isto o
  // ANIM entraria no blocksState (mudaria o round-trip; nenhum parser o recupera).
  override SERIALIZABLE = false

  override isSerializable(): boolean {
    return false
  }

  static override fromJson(options: Blockly.FieldTextInputFromJsonConfig): FieldAnimationPicker {
    return new FieldAnimationPicker(`${options.text ?? ''}`)
  }

  protected override showEditor_(): void {
    const anims = resolveAnimations(this)

    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)

    const wrap = document.createElement('div')
    wrap.style.cssText =
      'padding:8px;width:230px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'

    if (anims.length === 0) {
      const empty = document.createElement('div')
      empty.textContent =
        'Nenhuma animação nesta folha. Escreva os números dos quadros (do… ao…) nos soquetes.'
      empty.style.cssText =
        'font-size:12px;color:var(--color-sz-fg-soft);padding:2px;line-height:1.4;'
      wrap.appendChild(empty)
    } else {
      const list = document.createElement('div')
      list.style.cssText =
        'display:flex;flex-direction:column;gap:4px;max-height:200px;overflow:auto;'
      for (const anim of anims) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.style.cssText =
          'display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:6px 8px;border:1px solid var(--color-sz-border);border-radius:6px;background:var(--color-sz-bg);cursor:pointer;text-align:left;'
        const name = document.createElement('span')
        name.textContent = `🎞️ ${anim.name}`
        name.style.cssText = 'font-size:13px;font-weight:600;color:var(--color-sz-fg);'
        const meta = document.createElement('span')
        meta.textContent = `quadros ${anim.from}–${anim.to} · ${anim.fps} fps`
        meta.style.cssText = 'font-size:10px;color:var(--color-sz-fg-soft);'
        btn.append(name, meta)
        btn.addEventListener('click', () => {
          this.setValue(anim.name)
          fillFrames(this, anim)
          Blockly.DropDownDiv.hideIfOwner(this)
        })
        list.appendChild(btn)
      }
      wrap.appendChild(list)
    }

    content.appendChild(wrap)
    Blockly.DropDownDiv.showPositionedByField(this, () => {})
  }
}

let registered = false

/** Registra o campo customizado uma única vez (idempotente). */
export function registerFieldAnimationPicker(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_animation_picker', FieldAnimationPicker)
  registered = true
}
