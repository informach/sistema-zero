import * as Blockly from 'blockly/core'

/**
 * Campo do bloco "criar … = novo …" (`sz_t3d_new_var`/`sz_t3d_new`): em vez de a
 * criança DIGITAR a classe do three (`Scene`/`Mesh`/`PerspectiveCamera`…), ela
 * ESCOLHE numa lista curada e agrupada. O VALOR é a REFERÊNCIA COMPLETA — `THREE.Scene`
 * para as classes do core, ou só `GLTFLoader` para as de ADDON (que se criam SEM
 * `THREE.`: `new GLTFLoader()`). Assim não há campo NS separado nem um ponto solto na
 * tela quando o namespace é vazio.
 *
 * Estende `FieldTextInput` (NÃO `FieldDropdown`): o VALOR continua string → o buildIR
 * quebra no 1º ponto (namespace + className) e o round-trip fica idêntico; só troca o
 * EDITOR por um seletor + input livre (classe fora da lista). Grafia ATUAL do three
 * (nunca `Geometry` legada; `BoxGeometry`, não `BoxBufferGeometry`).
 */

/** Uma classe three com o namespace de criação ('THREE' = core; '' = addon bare). */
interface ClassItem {
  name: string
  ns: 'THREE' | ''
}

/** Classes three comuns dos projetos, agrupadas. Namespace por item. */
export const COMMON_CLASSES: ReadonlyArray<{ group: string; items: readonly ClassItem[] }> = [
  {
    group: '🎬 Cena · câmera · renderizador',
    items: [
      { name: 'Scene', ns: 'THREE' },
      { name: 'PerspectiveCamera', ns: 'THREE' },
      { name: 'OrthographicCamera', ns: 'THREE' },
      { name: 'WebGLRenderer', ns: 'THREE' },
    ],
  },
  {
    group: '🧊 Objetos',
    items: [
      { name: 'Mesh', ns: 'THREE' },
      { name: 'Group', ns: 'THREE' },
      { name: 'Object3D', ns: 'THREE' },
      { name: 'InstancedMesh', ns: 'THREE' },
      { name: 'Points', ns: 'THREE' },
      { name: 'LineSegments', ns: 'THREE' },
      { name: 'Sprite', ns: 'THREE' },
    ],
  },
  {
    group: '📐 Geometrias',
    items: [
      { name: 'BoxGeometry', ns: 'THREE' },
      { name: 'PlaneGeometry', ns: 'THREE' },
      { name: 'SphereGeometry', ns: 'THREE' },
      { name: 'CylinderGeometry', ns: 'THREE' },
      { name: 'ConeGeometry', ns: 'THREE' },
      { name: 'TorusGeometry', ns: 'THREE' },
      { name: 'BufferGeometry', ns: 'THREE' },
    ],
  },
  {
    group: '🎨 Materiais',
    items: [
      { name: 'MeshStandardMaterial', ns: 'THREE' },
      { name: 'MeshBasicMaterial', ns: 'THREE' },
      { name: 'MeshLambertMaterial', ns: 'THREE' },
      { name: 'MeshPhongMaterial', ns: 'THREE' },
      { name: 'ShaderMaterial', ns: 'THREE' },
      { name: 'PointsMaterial', ns: 'THREE' },
      { name: 'SpriteMaterial', ns: 'THREE' },
    ],
  },
  {
    group: '💡 Luzes',
    items: [
      { name: 'DirectionalLight', ns: 'THREE' },
      { name: 'AmbientLight', ns: 'THREE' },
      { name: 'HemisphereLight', ns: 'THREE' },
      { name: 'PointLight', ns: 'THREE' },
      { name: 'SpotLight', ns: 'THREE' },
    ],
  },
  {
    group: '🧮 Vetores · matemática',
    items: [
      { name: 'Vector3', ns: 'THREE' },
      { name: 'Vector2', ns: 'THREE' },
      { name: 'Quaternion', ns: 'THREE' },
      { name: 'Euler', ns: 'THREE' },
      { name: 'Matrix4', ns: 'THREE' },
      { name: 'Color', ns: 'THREE' },
      { name: 'Raycaster', ns: 'THREE' },
      { name: 'Box3', ns: 'THREE' },
    ],
  },
  {
    group: '🖼️ Texturas · som · ambiente',
    items: [
      { name: 'TextureLoader', ns: 'THREE' },
      { name: 'CubeTextureLoader', ns: 'THREE' },
      { name: 'CanvasTexture', ns: 'THREE' },
      { name: 'AudioLoader', ns: 'THREE' },
      { name: 'AudioListener', ns: 'THREE' },
      { name: 'Audio', ns: 'THREE' },
      { name: 'PositionalAudio', ns: 'THREE' },
      { name: 'LoadingManager', ns: 'THREE' },
      { name: 'Fog', ns: 'THREE' },
      { name: 'FogExp2', ns: 'THREE' },
    ],
  },
  {
    group: '🎞️ Animação · tempo',
    items: [
      { name: 'AnimationMixer', ns: 'THREE' },
      { name: 'Clock', ns: 'THREE' },
    ],
  },
  {
    group: '🔌 Do addon (sem THREE.)',
    items: [
      { name: 'GLTFLoader', ns: '' },
      { name: 'FBXLoader', ns: '' },
      { name: 'OrbitControls', ns: '' },
      { name: 'PointerLockControls', ns: '' },
      { name: 'RGBELoader', ns: '' },
      { name: 'EffectComposer', ns: '' },
      { name: 'RenderPass', ns: '' },
      { name: 'UnrealBloomPass', ns: '' },
      { name: 'OutputPass', ns: '' },
      { name: 'Water', ns: '' },
      { name: 'Line2', ns: '' },
      { name: 'LineGeometry', ns: '' },
      { name: 'LineMaterial', ns: '' },
    ],
  },
]

/** Nome da classe → namespace ('THREE' ou ''). Fonte da verdade do NS por classe. */
export const CLASS_NAMESPACE: Record<string, 'THREE' | ''> = Object.fromEntries(
  COMMON_CLASSES.flatMap((g) => g.items.map((i) => [i.name, i.ns] as const)),
)

/** Classes de ADDON (namespace vazio) — usadas pelo reconhecedor de `new` bare. */
export const ADDON_CLASSES: ReadonlySet<string> = new Set(
  COMMON_CLASSES.flatMap((g) => g.items.filter((i) => i.ns === '').map((i) => i.name)),
)

/** Reaplica o data-sz-theme do root no DropDownDiv portalado. */
function applyThemeScope(field: Blockly.Field, content: HTMLElement): void {
  const workspace = field.getSourceBlock()?.workspace as { getInjectionDiv?(): unknown } | undefined
  const injectionDiv = workspace?.getInjectionDiv?.()
  const scope = injectionDiv instanceof HTMLElement ? injectionDiv.closest('[data-sz-theme]') : null
  const theme = scope?.getAttribute('data-sz-theme')
  if (theme) content.setAttribute('data-sz-theme', theme)
}

export class FieldClassPicker extends Blockly.FieldTextInput {
  static override fromJson(options: Blockly.FieldTextInputFromJsonConfig): FieldClassPicker {
    return new FieldClassPicker(`${options.text ?? ''}`)
  }

  /** Escolher a classe: grava a REFERÊNCIA completa (`THREE.Scene` ou `GLTFLoader`). */
  private pick(name: string, ns: 'THREE' | ''): void {
    this.setValue(ns ? `${ns}.${name}` : name)
    Blockly.DropDownDiv.hideIfOwner(this)
  }

  protected override showEditor_(): void {
    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)

    const wrap = document.createElement('div')
    wrap.style.cssText =
      'padding:8px;width:250px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'

    const listBox = document.createElement('div')
    listBox.style.cssText = 'max-height:260px;overflow:auto;'
    for (const grp of COMMON_CLASSES) {
      const head = document.createElement('div')
      head.textContent = grp.group
      head.style.cssText =
        'font-size:10px;font-weight:700;color:var(--color-sz-fg-soft);margin:6px 2px 3px;text-transform:uppercase;letter-spacing:.03em;'
      listBox.appendChild(head)
      const grid = document.createElement('div')
      grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;'
      for (const item of grp.items) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.textContent = item.name
        btn.style.cssText =
          'padding:4px 8px;border:1px solid var(--color-sz-border);border-radius:6px;background:var(--color-sz-bg);color:var(--color-sz-fg);cursor:pointer;font-size:11px;'
        btn.addEventListener('click', () => this.pick(item.name, item.ns))
        grid.appendChild(btn)
      }
      listBox.appendChild(grid)
    }
    wrap.appendChild(listBox)

    // Fallback de texto livre (classe fora da lista). Se casar uma conhecida, também
    // ajusta o NS; senão mantém o NS atual (a criança edita se for addon bare).
    const row = document.createElement('div')
    row.style.cssText =
      'display:flex;gap:6px;margin-top:8px;border-top:1px solid var(--color-sz-border);padding-top:8px;align-items:center;'
    const input = document.createElement('input')
    input.type = 'text'
    input.value = `${this.getValue() ?? ''}`
    input.placeholder = 'outra classe'
    input.spellcheck = false
    input.style.cssText =
      'flex:1;min-width:0;padding:3px 6px;border:1px solid var(--color-sz-border);background:var(--color-sz-bg);color:var(--color-sz-fg);border-radius:4px;font-size:12px;font-family:"JetBrains Mono",ui-monospace,monospace;outline:none;'
    const ok = document.createElement('button')
    ok.type = 'button'
    ok.textContent = 'OK'
    ok.style.cssText =
      'padding:3px 10px;background:var(--color-sz-accent);color:var(--color-sz-bg);border:0;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;'
    const apply = () => {
      // Texto livre: a criança pode escrever só o nome de uma classe conhecida
      // (`Scene`) — completamos com o namespace certo; senão vale como digitado
      // (`THREE.Xxx`, `MinhaClasse`, addon custom…).
      const raw = input.value.trim()
      const ns = CLASS_NAMESPACE[raw]
      this.setValue(ns ? `${ns}.${raw}` : raw)
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
export function registerFieldClassPicker(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_class_picker', FieldClassPicker)
  registered = true
}
