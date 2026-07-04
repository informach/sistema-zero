import * as Blockly from 'blockly/core'

/**
 * Campo Blockly de NOME (variável ou grupo/lista): mostra o NOME (string) e, ao
 * clicar, abre um DropDownDiv com a lista dos itens JÁ CRIADOS no programa para a
 * criança escolher — sem precisar redigitar a grafia igualzinha em cada bloco (à la
 * Scratch/MakeCode). Dois "sabores" pelo `kind`:
 *  - `variable` → variáveis simples (blocos que criam/declaram uma variável);
 *  - `group`    → grupos de sprites (Jogo 2D) E listas do núcleo (variáveis que
 *                 guardam uma lista `sz_val_array`) — "grupo ≡ lista".
 *
 * Estende `FieldTextInput` (NÃO `FieldDropdown`), então o VALOR continua sendo uma
 * string — IR, round-trip, serialização e allowlist ficam IDÊNTICOS a um
 * `field_input`; este campo só troca o EDITOR por um seletor visual + um input de
 * texto de fallback (para nomear algo ainda não criado, ou digitar livre). Coleta lê
 * o PRÓPRIO workspace do bloco (multi-instância, sem globais).
 *
 * ⚠️ `FieldDropdown` não serve: ele valida o valor contra a lista de opções e coage
 * um nome desconhecido para a 1ª opção → perderia o nome do aluno no round-trip.
 */
export type NameKind = 'variable' | 'group'

interface FieldNamePickerFromJsonConfig extends Blockly.FieldTextInputFromJsonConfig {
  kind?: NameKind
}

/**
 * Blocos que DECLARAM uma variável nomeada (a fonte da lista de variáveis), e em
 * quais campos está o nome. São os blocos que CRIAM o nome — os consumidores (ler/
 * alterar) é que ganham o seletor. ⚠️ Bloco novo que cria variável? Adicione aqui.
 */
const VARIABLE_DECL_BLOCKS: Record<string, string[]> = {
  // Núcleo: criar/declarar/alterar variável.
  sz_js_var_declare: ['NAME'],
  sz_js_var_create: ['NAME'],
  sz_js_const_create: ['NAME'],
  sz_js_var_assign: ['NAME'],
  // (Laços/tentar introduzem nomes LOCAIS — ver VARIABLE_LOOP_BINDERS abaixo.)
  // Canvas: teclado, imagem e gradiente guardam numa variável.
  sz_canvas_keyboard: ['NAME'],
  sz_js_new_image: ['VAR'],
  sz_canvas_gradient: ['NAME'],
  // DOM: "guardar em <variável>" ao buscar/criar/ler elementos.
  sz_js_get_element_by_id: ['NAME'],
  sz_js_query_selector: ['NAME'],
  sz_js_query_selector_all: ['NAME'],
  sz_js_get_property: ['NAME'],
  sz_js_get_attribute: ['NAME'],
  sz_js_create_element: ['NAME'],
  sz_js_create_element_ns: ['NAME'],
  // Jogo 2D: pontuação e resultado de colisão são variáveis.
  sz_g2d_score: ['NAME'],
  sz_g2d_collides: ['NAME'],
  sz_g2d_circle_collides: ['NAME'],
  // Kits que guardam um "objeto" nomeado numa variável (jogo do equilibrista/balão,
  // cidade dos gorilas) — os consumidores (GAME/CITY) redigitavam o nome.
  sz_g2d_create_stickhero: ['NAME'],
  sz_g2d_create_balloon: ['NAME'],
  sz_g2d_create_city: ['NAME'],
}

/**
 * Blocos de laço que dão um NOME LOCAL a uma variável no corpo (o "i" do contar, o
 * "item"/"posição" do para-cada, o "erro" do tentar). Esses nomes valem só DENTRO do
 * bloco, então entram no seletor apenas quando o campo está dentro dele (escopo por
 * ancestral). Os campos que aqui DECLARAM o nome seguem `field_input`.
 */
const VARIABLE_LOOP_BINDERS: Record<string, string[]> = {
  sz_js_for_range: ['VAR'],
  sz_js_for_of: ['ITEM'],
  sz_js_for_each: ['ITEM', 'INDEX'],
  sz_js_try_catch: ['ERR'],
  sz_val_array_map: ['ITEM'],
  sz_val_array_find: ['ITEM'],
}

/** Blocos que DECLARAM um grupo de sprites nomeado (Jogo 2D). */
const GROUP_DECL_BLOCKS: Record<string, string[]> = {
  sz_g2d_create_group: ['NAME'],
}

/**
 * Blocos que criam/atribuem uma variável cujo VALOR pode ser uma lista. Só entram na
 * lista de "grupos/listas" quando o valor conectado é um `sz_val_array` (uma lista de
 * verdade) — assim o menu de LISTA não mistura variáveis simples.
 */
const LIST_VALUE_HOLDERS: Record<string, string> = {
  sz_js_var_create: 'NAME',
  sz_js_const_create: 'NAME',
  sz_js_var_assign: 'NAME',
}

interface KindUI {
  icon: string
  placeholder: string
  empty: string
}

const KIND_UI: Record<NameKind, KindUI> = {
  variable: {
    icon: '🔤',
    placeholder: 'nome da variável',
    empty:
      'Nenhuma variável no programa ainda — crie uma (ex.: "Criar variável") ou digite o nome abaixo.',
  },
  group: {
    icon: '📋',
    placeholder: 'nome do grupo ou lista',
    empty:
      'Nenhum grupo ou lista ainda — crie um (ex.: "Criar grupo de sprites" ou uma lista) ou digite o nome abaixo.',
  },
}

/** Anda o workspace e coleta os nomes declarados nos campos do registro, sem repetir. */
function collectDeclaredNames(
  workspace: Blockly.Workspace | null | undefined,
  registry: Record<string, string[]>,
): string[] {
  if (!workspace) return []
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const block of workspace.getAllBlocks(false)) {
    const fields = registry[block.type]
    if (!fields) continue
    for (const f of fields) {
      if (!block.getField(f)) continue
      const name = block.getFieldValue(f)
      if (!name || seen.has(name)) continue
      seen.add(name)
      ordered.push(name)
    }
  }
  return ordered
}

/** Variáveis simples criadas no workspace, na ordem dos blocos, sem repetir. */
export function collectVariables(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, VARIABLE_DECL_BLOCKS)
}

/**
 * Nomes de variável LOCAIS em escopo no ponto do campo: sobe pelos blocos que
 * ENVOLVEM o bloco do campo (`getSurroundParent`) e coleta os nomes dados por laços
 * (o "i" do contar, o "item" do para-cada…). Só aparecem dentro do laço que os declara.
 */
export function collectScopedVariableNames(block: Blockly.Block | null | undefined): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  let cur = block?.getSurroundParent() ?? null
  while (cur) {
    const fields = VARIABLE_LOOP_BINDERS[cur.type]
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
 * Grupos de sprites (Jogo 2D) + listas de verdade (variáveis que guardam um
 * `sz_val_array`), na ordem dos blocos, sem repetir. "Grupo ≡ lista".
 */
export function collectGroupsAndLists(workspace: Blockly.Workspace | null | undefined): string[] {
  if (!workspace) return []
  const seen = new Set<string>()
  const ordered: string[] = []
  const add = (name: string | null): void => {
    if (!name || seen.has(name)) return
    seen.add(name)
    ordered.push(name)
  }
  for (const block of workspace.getAllBlocks(false)) {
    const groupFields = GROUP_DECL_BLOCKS[block.type]
    if (groupFields) {
      for (const f of groupFields) {
        if (block.getField(f)) add(block.getFieldValue(f))
      }
      continue
    }
    const listField = LIST_VALUE_HOLDERS[block.type]
    if (listField && block.getInputTargetBlock('VALUE')?.type === 'sz_val_array') {
      add(block.getFieldValue(listField))
    }
  }
  return ordered
}

/**
 * Reaplica o `data-sz-theme` do root no conteúdo portalado do DropDownDiv (vive sob
 * document.body, fora do escopo de tema). Mesmo padrão do FieldSpritePicker.
 */
function applyThemeScope(field: Blockly.Field, content: HTMLElement): void {
  const workspace = field.getSourceBlock()?.workspace as { getInjectionDiv?(): unknown } | undefined
  const injectionDiv = workspace?.getInjectionDiv?.()
  const scope = injectionDiv instanceof HTMLElement ? injectionDiv.closest('[data-sz-theme]') : null
  const theme = scope?.getAttribute('data-sz-theme')
  if (theme) content.setAttribute('data-sz-theme', theme)
}

export class FieldNamePicker extends Blockly.FieldTextInput {
  readonly kind: NameKind

  constructor(value?: string, kind: NameKind = 'variable') {
    super(value)
    this.kind = kind
  }

  static override fromJson(options: FieldNamePickerFromJsonConfig): FieldNamePicker {
    // `new this(...)` NÃO é garantido na fromJson herdada (algumas hardcodam a classe
    // base) — sobrescrevemos para garantir a instância correta E carregar o `kind`. O
    // `kind` vem da DEFINIÇÃO do bloco (args0) e chega aqui em toda instanciação
    // (inclusive ao desserializar projeto salvo e no copiar/colar) — é estrutural,
    // nunca precisa ser salvo no estado.
    return new FieldNamePicker(
      `${options.text ?? ''}`,
      options.kind === 'group' ? 'group' : 'variable',
    )
  }

  protected override showEditor_(): void {
    const block = this.getSourceBlock()
    const ws = block?.workspace
    const globals = this.kind === 'group' ? collectGroupsAndLists(ws) : collectVariables(ws)
    const globalSet = new Set(globals)
    // Variáveis LOCAIS em escopo (nome dado por um laço que ENVOLVE este campo). Só o
    // seletor de variável tem locais — grupos/listas não têm binder de laço.
    const locals =
      this.kind === 'variable'
        ? collectScopedVariableNames(block).filter((n) => !globalSet.has(n))
        : []
    const ui = KIND_UI[this.kind]

    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)

    const wrap = document.createElement('div')
    wrap.style.cssText =
      'padding:8px;width:240px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'

    if (globals.length === 0 && locals.length === 0) {
      const empty = document.createElement('div')
      empty.textContent = ui.empty
      empty.style.cssText =
        'font-size:12px;color:var(--color-sz-fg-soft);padding:2px 2px 8px;line-height:1.4;'
      wrap.appendChild(empty)
    } else {
      const list = document.createElement('div')
      list.style.cssText =
        'display:flex;flex-direction:column;gap:4px;max-height:200px;overflow:auto;'
      // Uma linha selecionável. `loop` = variável local do laço: swatch 🔁 tracejado +
      // marca "no laço" (mesma linguagem visual do seletor de sprite).
      const addRow = (name: string, loop: boolean): void => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.title = loop ? `${name} — variável deste laço (local)` : name
        const selected = name === this.getValue()
        btn.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 7px;border:1px solid ${selected ? 'var(--color-sz-accent)' : 'var(--color-sz-border)'};border-radius:6px;background:var(--color-sz-bg);cursor:pointer;text-align:left;`
        const icon = document.createElement('span')
        icon.textContent = loop ? '🔁' : ui.icon
        icon.style.cssText = loop
          ? 'flex:none;width:22px;height:22px;border-radius:5px;border:1px dashed var(--color-sz-border);display:flex;align-items:center;justify-content:center;font-size:12px;'
          : 'flex:none;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:15px;'
        const label = document.createElement('span')
        label.textContent = name
        label.style.cssText =
          'flex:1;min-width:0;font-size:13px;color:var(--color-sz-fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
        btn.append(icon, label)
        if (loop) {
          const tag = document.createElement('span')
          tag.textContent = 'no laço'
          tag.style.cssText = 'flex:none;font-size:11px;color:var(--color-sz-fg-soft);'
          btn.appendChild(tag)
        }
        btn.addEventListener('click', () => {
          this.setValue(name)
          Blockly.DropDownDiv.hideIfOwner(this)
        })
        list.appendChild(btn)
      }
      for (const name of globals) addRow(name, false)
      for (const name of locals) addRow(name, true)
      wrap.appendChild(list)
    }

    // Fallback de texto livre (nomear algo ainda não criado, ou digitar livre).
    const row = document.createElement('div')
    row.style.cssText =
      'display:flex;gap:6px;margin-top:8px;border-top:1px solid var(--color-sz-border);padding-top:8px;align-items:center;'
    const input = document.createElement('input')
    input.type = 'text'
    input.value = `${this.getValue() ?? ''}`
    input.placeholder = ui.placeholder
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
    setTimeout(() => input.focus(), 0)
  }
}

let registered = false

/** Registra o campo customizado uma única vez (idempotente). */
export function registerFieldNamePicker(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_name_picker', FieldNamePicker)
  registered = true
}
