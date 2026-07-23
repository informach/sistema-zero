import * as Blockly from 'blockly/core'
import {
  CANVAS3D_BLOCK_DECLARATIONS_BY_KIND,
  CANVAS3D_FUNCTION_DECLARATION_FIELDS,
  CANVAS3D_OBJECT_BRANCH_BINDERS,
  CANVAS3D_PHYSICS_BODY_DECLARATION_FIELDS,
  CANVAS3D_PHYSICS_RESOURCE_DECLARATION_FIELDS,
  CANVAS3D_VARIABLE_BRANCH_BINDERS,
  CANVAS3D_VARIABLE_DECLARATION_FIELDS,
  type Canvas3DSymbolKind,
  canvas3DSymbolKindsForClass,
} from '../../three/canvas3dContract'
import {
  type BlockScanner,
  classMethodNames,
  classOfInstance,
  classPropertyNames,
  enclosingClass,
  superClassMethodNames,
} from '../blocks/classIntrospection'

type NameFieldRegistry = Readonly<Record<string, readonly string[]>>
type ScopedBinder = readonly string[] | Readonly<Record<string, readonly string[]>>
type ScopedBinderRegistry = Readonly<Record<string, ScopedBinder>>

/**
 * Campo Blockly de NOME: mostra o NOME (string) e, ao clicar, abre um DropDownDiv com
 * a lista dos itens JÁ CRIADOS no programa para a criança escolher — sem precisar
 * redigitar a grafia igualzinha em cada bloco (à la Scratch/MakeCode). "Sabores" pelo
 * `kind`:
 *  - `variable` → variáveis simples (blocos que criam/declaram uma variável);
 *  - `mutable-variable` → somente variáveis que podem receber outro valor;
 *  - `group`    → grupos de sprites (Jogo 2D) E listas do núcleo (variáveis que
 *                 guardam uma lista `sz_val_array`) — "grupo ≡ lista";
 *  - `class`    → nomes de classe (`sz_js_class`);
 *  - `function` → nomes de função (`sz_js_function`);
 *  - `property` → propriedades de classe, ESCOPADAS pela classe em contexto (a que
 *                 envolve o bloco, ou a do objeto no campo/tomada `OBJ`); cai na lista
 *                 global de propriedades quando não dá para resolver a classe;
 *  - `method`   → métodos de classe, mesma lógica de escopo do `property`;
 *  - `super-method` → somente métodos da classe-mãe e dos ancestrais dela;
 *  - `canvas`   → id de uma tela de desenho (`sz_html_canvas`);
 *  - `canvas-context` → pincéis Canvas 2D declarados ou recebidos pelo corpo atual;
 *  - `form-control` → ids de campos que podem receber um rótulo HTML;
 *  - `selector` → partes da página já criadas (`body`, `#id` e `.classe`);
 *  - `svg-reference` → ids de formas SVG reutilizáveis, já com o prefixo `#`;
 *  - `font`     → fontes importadas por um bloco do Google Fonts;
 *  - `animation` → animações CSS declaradas por blocos de keyframes;
 *  - `spritesheet` → folha de quadros do Jogo 2D (`sz_g2d_load_spritesheet`);
 *  - `tilemap`  → mapa de tiles do Jogo 2D (`sz_g2d_create_tilemap`);
 *  - `board` / `stored-value` → tabuleiros e valores persistidos do Jogo 2D Avançado;
 *  - `combat-move` / `fight-move` → golpes declarados nos dois sistemas de luta;
 *  - `scene3d`  → cena Three.js crua criada pelos blocos Canvas 3D;
 *  - `g3d-world` → mundo completo criado pela extensão Jogo 3D;
 *  - `object3d` → objeto/malha do Jogo 3D (caixa/bola/modelo…); tem locais de laço
 *                 (o "item" do "para cada no enxame");
 *  - `group3d`  → grupo simples do Jogo 3D (`criar grupo de objetos`).
 *  - `swarm3d`  → enxame de cópias do Jogo 3D (`criar enxame`).
 *  - `physics-body` / `physics-resource` → IDs declarados na física leve do
 *                 Canvas 3D, filtrados pelo mundo físico escolhido.
 *  - `shadow-target3d` → objetos compatíveis com o modo "projeta/recebe" escolhido.
 *
 * Estende `FieldTextInput` (NÃO `FieldDropdown`), então o VALOR continua sendo uma
 * string — IR, round-trip, serialização e allowlist ficam IDÊNTICOS a um
 * `field_input`; este campo só troca o EDITOR por um seletor visual. Campos que
 * consomem um símbolo (`group`, `class`, `function` e `mutable-variable`) exigem uma
 * declaração visível; campos declaradores continuam sendo `field_input`.
 *
 * ⚠️ `FieldDropdown` não serve: ele valida o valor contra a lista de opções e coage
 * um nome desconhecido para a 1ª opção → perderia o nome do aluno no round-trip.
 */
export type NameKind =
  | 'variable'
  | 'mutable-variable'
  | 'group'
  | 'class'
  | 'function'
  | 'optional-function'
  | 'property'
  | 'method'
  | 'super-method'
  | 'canvas'
  | 'canvas3d-canvas'
  | 'canvas-context'
  | 'form-control'
  | 'dom-target'
  | 'selector'
  | 'svg-reference'
  | 'font'
  | 'animation'
  | 'spritesheet'
  | 'tilemap'
  | 'board'
  | 'stored-value'
  | 'combat-move'
  | 'fight-move'
  | 'enemytype'
  | 'shape'
  | 'scene3d'
  | 'g3d-world'
  | 'renderer3d'
  | 'camera3d'
  | 'perspective-camera3d'
  | 'light3d'
  | 'composer3d'
  | 'loader3d'
  | 'model-loader3d'
  | 'audio-loader3d'
  | 'water3d'
  | 'grass3d'
  | 'instanced-mesh3d'
  | 'color-target3d'
  | 'shadow-target3d'
  | 'physics-collider3d'
  | 'physics-city3d'
  | 'physics-world'
  | 'object3d'
  | 'g3d-object'
  | 'group3d'
  | 'swarm3d'
  | 'physics-body'
  | 'physics-character'
  | 'physics-resource'
  | 'character'
  | 'screen'
  | 'gamestate'
  | 'mold'
  | 'battler'
  | 'combatant'
  | 'enemy-combatant'
  | 'effect'
  | 'event'
  | 'look'
  | 'sound'
  | 'npc'
  | 'flag'
  | 'item'
  | 'map'
  | 'entity3d'
  | 'mold3d'
  | 'effect3d'
  | 'entitystate'
  | 'region'
  | 'pkmcreature'
  | 'pkmtype'
  | 'path'
  | 'w3dpoint'
  | 'w3dnpc'
  | 'w3dquest'
  | 'w3dachieve'

const DECLARED_NAME_KINDS: ReadonlySet<NameKind> = new Set([
  'variable',
  'mutable-variable',
  'group',
  'class',
  'function',
  'optional-function',
  'super-method',
  'dom-target',
  'canvas3d-canvas',
  'canvas-context',
  'board',
  'stored-value',
  'combat-move',
  'fight-move',
  'enemy-combatant',
  'scene3d',
  'g3d-world',
  'renderer3d',
  'camera3d',
  'perspective-camera3d',
  'light3d',
  'composer3d',
  'loader3d',
  'model-loader3d',
  'audio-loader3d',
  'water3d',
  'grass3d',
  'instanced-mesh3d',
  'color-target3d',
  'shadow-target3d',
  'physics-collider3d',
  'physics-city3d',
  'physics-world',
  'object3d',
  'g3d-object',
  'group3d',
  'swarm3d',
  'physics-body',
  'physics-character',
  'physics-resource',
])

export function nameKindAllowsFreeText(kind: NameKind): boolean {
  return !DECLARED_NAME_KINDS.has(kind)
}

const NAME_KINDS: readonly NameKind[] = [
  'path',
  'w3dpoint',
  'w3dnpc',
  'w3dquest',
  'w3dachieve',
  'region',
  'pkmcreature',
  'pkmtype',
  'variable',
  'mutable-variable',
  'group',
  'class',
  'function',
  'optional-function',
  'property',
  'method',
  'super-method',
  'canvas',
  'canvas3d-canvas',
  'canvas-context',
  'form-control',
  'dom-target',
  'selector',
  'svg-reference',
  'font',
  'animation',
  'spritesheet',
  'tilemap',
  'board',
  'stored-value',
  'combat-move',
  'fight-move',
  'enemytype',
  'shape',
  'scene3d',
  'g3d-world',
  'renderer3d',
  'camera3d',
  'perspective-camera3d',
  'light3d',
  'composer3d',
  'loader3d',
  'model-loader3d',
  'audio-loader3d',
  'water3d',
  'grass3d',
  'instanced-mesh3d',
  'color-target3d',
  'shadow-target3d',
  'physics-collider3d',
  'physics-city3d',
  'physics-world',
  'object3d',
  'g3d-object',
  'group3d',
  'swarm3d',
  'physics-body',
  'physics-character',
  'physics-resource',
  'character',
  'screen',
  'gamestate',
  'mold',
  'battler',
  'combatant',
  'enemy-combatant',
  'effect',
  'event',
  'look',
  'sound',
  'npc',
  'flag',
  'item',
  'map',
  'entity3d',
  'mold3d',
  'effect3d',
  'entitystate',
]

/** Coage o `kind` cru da definição do bloco para um `NameKind` válido (default variável). */
function coerceKind(raw: unknown): NameKind {
  return NAME_KINDS.includes(raw as NameKind) ? (raw as NameKind) : 'variable'
}

interface FieldNamePickerFromJsonConfig extends Blockly.FieldTextInputFromJsonConfig {
  kind?: NameKind
}

/**
 * Blocos que DECLARAM uma variável nomeada (a fonte da lista de variáveis), e em
 * quais campos está o nome. São os blocos que CRIAM o nome — os consumidores (ler/
 * alterar) é que ganham o seletor. ⚠️ Bloco novo que cria variável? Adicione aqui.
 */
const VARIABLE_DECL_BLOCKS: NameFieldRegistry = {
  // Núcleo: criar/declarar variável. Alterar consome um nome existente.
  sz_js_var_declare: ['NAME'],
  sz_js_var_create: ['NAME'],
  sz_js_const_create: ['NAME'],
  ...CANVAS3D_VARIABLE_DECLARATION_FIELDS,
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
  // OOP: `criar pessoa = novo Pessoa` guarda a instância numa variável — os campos
  // OBJ que a referenciam (chamar método, definir/ler propriedade) ganham o seletor.
  sz_js_new_var: ['VARNAME'],
  // O contexto Canvas continua sendo uma variável JavaScript legível em blocos
  // genéricos. Consumidores de desenho usam o registro mais estreito abaixo.
  sz_canvas_setup: ['CTX'],
}

/** Contextos Canvas 2D declarados explicitamente no fluxo do programa. */
const CANVAS_CONTEXT_DECL_BLOCKS: NameFieldRegistry = {
  sz_canvas_setup: ['CTX'],
}

/** Declarações cujo vínculo pode receber outro valor por atribuição. */
const MUTABLE_VARIABLE_DECL_BLOCKS: Record<string, string[]> = {
  sz_js_var_declare: ['NAME'],
  sz_js_var_create: ['NAME'],
  sz_g2d_score: ['NAME'],
}

/** Blocos que DECLARAM uma classe / uma função (fonte das listas de classe/função). */
const CLASS_DECL_BLOCKS: Record<string, string[]> = { sz_js_class: ['NAME'] }
const FUNCTION_DECL_BLOCKS: NameFieldRegistry = {
  sz_js_function: ['NAME'],
  ...CANVAS3D_FUNCTION_DECLARATION_FIELDS,
}
/** Telas de desenho declaradas (`sz_html_canvas` id) — fonte do seletor de canvas. */
const CANVAS_DECL_BLOCKS: Record<string, string[]> = { sz_html_canvas: ['ID'] }

function collectPhysicsNames(
  workspace: Blockly.Workspace | null | undefined,
  registry: NameFieldRegistry,
  useBlock: Blockly.Block | null | undefined,
): string[] {
  const ownerFields = Object.fromEntries(Object.keys(registry).map((type) => [type, 'WORLD']))
  return collectOwnedDeclaredNames(
    workspace,
    registry,
    ownerFields,
    useBlock?.getFieldValue('WORLD'),
    useBlock,
  )
}

export function collectCanvas3DPhysicsBodies(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  return collectPhysicsNames(workspace, CANVAS3D_PHYSICS_BODY_DECLARATION_FIELDS, useBlock)
}

export function collectCanvas3DPhysicsCharacters(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  const ownerFields = { sz_t3d_physics_body: 'WORLD' }
  return collectOwnedDeclaredNames(
    workspace,
    CANVAS3D_PHYSICS_BODY_DECLARATION_FIELDS,
    ownerFields,
    useBlock?.getFieldValue('WORLD'),
    useBlock,
    (block) => block.getFieldValue('KIND') === 'character',
  )
}

export function collectCanvas3DPhysicsResources(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  return collectPhysicsNames(workspace, CANVAS3D_PHYSICS_RESOURCE_DECLARATION_FIELDS, useBlock)
}

/** Fontes e animações CSS que outros blocos podem consumir sem redigitar. */
const CSS_FONT_DECL_BLOCKS: Record<string, string[]> = { sz_css_google_font: ['FONT'] }
const CSS_ANIMATION_DECL_BLOCKS: Record<string, string[]> = {
  sz_css_keyframes: ['NAME'],
  sz_css_keyframes_steps: ['NAME'],
}

/**
 * Partes da página disponíveis para o CSS. `body` sempre existe; ids viram
 * `#id` e cada classe vira `.classe`. O texto livre continua disponível para
 * seletores avançados e para elementos que serão criados depois por JavaScript.
 */
export function collectCSSSelectors(workspace: Blockly.Workspace | null | undefined): string[] {
  const seen = new Set<string>(['body'])
  const ordered = ['body']
  if (!workspace) return ordered

  const add = (selector: string): void => {
    const normalized = selector.trim()
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    ordered.push(normalized)
  }

  for (const block of workspace.getAllBlocks(false)) {
    if (!block.type.startsWith('sz_html_') && !block.type.startsWith('sz_svg_')) continue
    const id = block.getField('ID') ? `${block.getFieldValue('ID') ?? ''}`.trim() : ''
    if (id) add(`#${id}`)
    const classes = block.getField('CLASS')
      ? `${block.getFieldValue('CLASS') ?? ''}`.trim().split(/\s+/)
      : []
    for (const className of classes) {
      if (className) add(`.${className}`)
    }
  }
  return ordered
}

/** IDs crus de elementos HTML/SVG que os blocos de DOM podem referenciar. */
export function collectDomElementIds(workspace: Blockly.Workspace | null | undefined): string[] {
  if (!workspace) return []
  const seen = new Set<string>()
  const ids: string[] = []
  for (const block of workspace.getAllBlocks(false)) {
    if (!block.type.startsWith('sz_html_') && !block.type.startsWith('sz_svg_')) continue
    if (!block.getField('ID')) continue
    const id = `${block.getFieldValue('ID') ?? ''}`.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

/** IDs de controles que podem ser associados pelo atributo `for` de um label. */
export function collectFormControlIds(workspace: Blockly.Workspace | null | undefined): string[] {
  if (!workspace) return []
  const accepted = new Set(['sz_html_input', 'sz_html_textarea', 'sz_html_button'])
  const seen = new Set<string>()
  const ids: string[] = []
  for (const block of workspace.getAllBlocks(false)) {
    if (!accepted.has(block.type) || !block.getField('ID')) continue
    const id = `${block.getFieldValue('ID') ?? ''}`.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

const REUSABLE_SVG_BLOCK_TYPES = new Set([
  'sz_svg_symbol',
  'sz_svg_group',
  'sz_svg_path',
  'sz_svg_circle',
  'sz_svg_ellipse',
  'sz_svg_line',
  'sz_svg_rect',
  'sz_svg_polyline',
  'sz_svg_polygon',
  'sz_svg_text',
])

/**
 * IDs de peças gráficas que `<use>` pode reutilizar, já como `#nome`.
 *
 * Raiz, metadados, `<defs>` e outros `<use>` não são formas. Também retiramos
 * os ancestrais do consumidor: reutilizar o grupo/símbolo que contém o próprio
 * bloco criaria uma referência circular e um desenho invisível.
 */
export function collectSVGReferences(
  workspace: Blockly.Workspace | null | undefined,
  consumer?: Blockly.Block | null,
): string[] {
  if (!workspace) return []
  const forbiddenIds = new Set<string>()
  let ancestor = consumer?.getSurroundParent() ?? null
  while (ancestor) {
    const id = ancestor.getField('ID') ? `${ancestor.getFieldValue('ID') ?? ''}`.trim() : ''
    if (id) forbiddenIds.add(id)
    ancestor = ancestor.getSurroundParent()
  }
  const seen = new Set<string>()
  const references: string[] = []
  for (const block of workspace.getAllBlocks(false)) {
    if (!REUSABLE_SVG_BLOCK_TYPES.has(block.type) || block === consumer) continue
    if (!block.getField('ID')) continue
    const id = `${block.getFieldValue('ID') ?? ''}`.trim()
    if (forbiddenIds.has(id)) continue
    const reference = id ? `#${id}` : ''
    if (!reference || seen.has(reference)) continue
    seen.add(reference)
    references.push(reference)
  }
  return references
}

export function collectCSSFonts(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, CSS_FONT_DECL_BLOCKS)
}

export function collectCSSAnimations(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, CSS_ANIMATION_DECL_BLOCKS)
}
/** Folhas de quadros / mapas de tiles do Jogo 2D (fonte dos seletores SHEET/MAP). */
const SPRITESHEET_DECL_BLOCKS: Record<string, string[]> = { sz_g2d_load_spritesheet: ['NAME'] }
const TILEMAP_DECL_BLOCKS: Record<string, string[]> = {
  sz_g2d_create_tilemap: ['NAME'],
  sz_g2d_create_tilemap_from_asset: ['NAME'],
  // Jogo 2D Avançado (Kit): "Carregar mapa … do meu desenho" também declara um nome de mapa.
  sz_gk_load_tilemap: ['NAME'],
  sz_gk_create_empty_tilemap: ['NAME'],
}

/** Figuras (desenho por código) do Jogo 2D — fonte do seletor SHAPE. */
const SHAPE_DECL_BLOCKS: Record<string, string[]> = { sz_g2d_define_shape: ['NAME'] }
function collectShapes(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, SHAPE_DECL_BLOCKS)
}

/** Personagens do Jogo 2D Avançado — fonte dos seletores CHAR/A/B. */
const CHARACTER_DECL_BLOCKS: Record<string, string[]> = {
  sz_gk_create_character: ['NAME'],
  sz_gk_spawn_named: ['NAME'],
}
function collectCharacters(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, CHARACTER_DECL_BLOCKS)
}
/** O "item" do "para cada vivo do molde" — e o par do "para cada que encostar" —
 * são personagens LOCAIS (escopo por ancestral). */
/** 👾 Kit Monstrinhos. ⭐ O tipo é TEXTO LIVRE (é o ponto: gelo, doce, dinossauro
 * — não só os da Nintendo). Sem o seletor, a criança escreve "Fogo" na criatura e
 * "fogo" na tabela → a vantagem NUNCA dispara, sem erro e sem aviso, e o jogo só
 * fica "estranho". O runtime ainda normaliza (trim+minúsculas) como 2ª defesa. */
const PKM_CREATURE_DECL_BLOCKS: Record<string, string[]> = {
  sz_gk_pkm_creature: ['NAME'],
}
const PKM_TYPE_DECL_BLOCKS: Record<string, string[]> = {
  sz_gk_pkm_creature: ['TYPE'],
  sz_gk_pkm_move: ['TYPE'],
  sz_gk_pkm_type_chart: ['A', 'B'],
}
/** 🧭 As regiões (R15). */
const REGION_DECL_BLOCKS: Record<string, string[]> = {
  sz_gk_define_region: ['NAME'],
}
// 🛤️ R25 — o "Criar o caminho" declara o nome (só o container declara).
const PATH_DECL_BLOCKS: Record<string, string[]> = {
  sz_gk_define_path: ['NAME'],
}
function collectPaths(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, PATH_DECL_BLOCKS)
}

const CHARACTER_LOOP_BINDERS: Record<string, string[]> = {
  sz_gk_for_each_active: ['ITEM'],
  sz_gk_overlap_groups: ['A_NAME', 'B_NAME'],
}

/**
 * Telas do Jogo 2D Avançado: as 5 PRONTAS (sempre existem no runtime) + as que a
 * criança criou com "Criar a tela". A semente vem primeiro — são as telas que o
 * kit garante mesmo sem nenhum bloco de criação.
 */
const GK_BUILTIN_SCREENS = ['menu', 'pausa', 'carregando', 'fim', 'vitoria'] as const
const SCREEN_DECL_BLOCKS: Record<string, string[]> = {
  sz_gk_create_screen: ['NAME'],
  // Jogo 3D Avançado: mesmas telas prontas, mesma semântica — o kind é compartilhado.
  sz_g3k_create_screen: ['NAME'],
}
function collectScreens(workspace: Blockly.Workspace | null | undefined): string[] {
  const declared = collectDeclaredNames(workspace, SCREEN_DECL_BLOCKS)
  const seen = new Set<string>(GK_BUILTIN_SCREENS)
  return [...GK_BUILTIN_SCREENS, ...declared.filter((n) => !seen.has(n))]
}

/**
 * Estados do Jogo 2D Avançado: os 5 FIXOS (com comportamento automático) + os que
 * a criança inventou. Um estado "existe" por USO — os próprios campos de estado
 * (mudar/quando entrar/é?) são a fonte da lista.
 */
const GK_BUILTIN_STATES = ['menu', 'jogando', 'pausado', 'fim', 'vitoria'] as const
const GAMESTATE_DECL_BLOCKS: Record<string, string[]> = {
  sz_g2d_set_scene: ['SCENE'],
  sz_g2d_scene_is: ['SCENE'],
  sz_gk_set_state: ['STATE'],
  sz_gk_on_enter_state: ['STATE'],
  sz_gk_state_is: ['STATE'],
  // Jogo 3D Avançado: mesmos estados fixos do jogo (kind compartilhado).
  sz_g3k_set_state: ['STATE'],
  sz_g3k_on_enter_state: ['STATE'],
  sz_g3k_state_is: ['STATE'],
}
function collectGameStates(workspace: Blockly.Workspace | null | undefined): string[] {
  const used = collectDeclaredNames(workspace, GAMESTATE_DECL_BLOCKS)
  const seen = new Set<string>(GK_BUILTIN_STATES)
  return [...GK_BUILTIN_STATES, ...used.filter((n) => !seen.has(n))]
}

/** Moldes do Jogo 2D Avançado (tipo data-driven) — fonte do seletor MOLD. */
const MOLD_DECL_BLOCKS: Record<string, string[]> = { sz_gk_define_mold: ['NAME'] }
function collectMolds(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, MOLD_DECL_BLOCKS)
}
// ⚔️ Fichas de inimigo de batalha por turnos (vida/força/defesa/imagem reutilizáveis).
const BATTLER_DECL_BLOCKS: Record<string, string[]> = { sz_gk_rpg_define_battler: ['NAME'] }
function collectBattlers(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, BATTLER_DECL_BLOCKS)
}
// ⚔️ QUALQUER combatente por nome (p/ "Ensinar o golpe para…", "a vida de…", a IA de
// chefe): o herói "Você" + todos os aliados/inimigos/chefões/fichas nomeados. É o
// CONSUMIDOR (referencia), ≠ do `battler` (que lista só as fichas, p/ "batalha contra").
const COMBATANT_DECL_BLOCKS: Record<string, string[]> = {
  sz_gk_rpg_add_ally: ['NAME'],
  sz_gk_rpg_add_foe: ['NAME'],
  sz_gk_rpg_add_boss: ['NAME'],
  sz_gk_rpg_battle_start: ['NAME'],
  sz_gk_rpg_define_battler: ['NAME'],
}
function collectCombatants(workspace: Blockly.Workspace | null | undefined): string[] {
  const seen = new Set<string>(['Você']) // o herói entra sempre
  for (const n of collectDeclaredNames(workspace, COMBATANT_DECL_BLOCKS)) seen.add(n)
  return [...seen]
}
// ⚔️ Somente o lado INIMIGO. Os blocos de IA não podem oferecer "Você" nem
// aliados: além de confundir a criança, os comandos de ataque têm outro alvo.
const ENEMY_COMBATANT_DECL_BLOCKS: Record<string, string[]> = {
  sz_gk_rpg_add_foe: ['NAME'],
  sz_gk_rpg_add_boss: ['NAME'],
  sz_gk_rpg_battle_start: ['NAME'],
  sz_gk_rpg_define_battler: ['NAME'],
}
export function collectEnemyCombatants(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, ENEMY_COMBATANT_DECL_BLOCKS)
}

/** Efeitos de faísca (partículas data-driven) — fonte do seletor EFFECT. */
const EFFECT_DECL_BLOCKS: Record<string, string[]> = { sz_gk_define_effect: ['NAME'] }
function collectEffects(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, EFFECT_DECL_BLOCKS)
}

/** Aparências vetoriais (o look de um molde) — fonte do seletor LOOK. */
const LOOK_DECL_BLOCKS: Record<string, string[]> = { sz_gk_define_look: ['NAME'] }
function collectLooks(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, LOOK_DECL_BLOCKS)
}

/** Sons importados (carregados por nome) — fonte do seletor de som a TOCAR. */
const SOUND_DECL_BLOCKS: Record<string, string[]> = {
  sz_gk_load_sound: ['NAME'],
  sz_g3k_load_sound: ['NAME'],
  sz_w3d_load_sound: ['NAME'],
}
function collectSounds(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, SOUND_DECL_BLOCKS)
}
function collectRegions(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, REGION_DECL_BLOCKS)
}
function collectPkmCreatures(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, PKM_CREATURE_DECL_BLOCKS)
}
function collectPkmTypes(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, PKM_TYPE_DECL_BLOCKS)
}

/**
 * Avisos do event bus: "existem por USO" — tanto quem AVISA (emit) quanto quem
 * OUVE (quando chegar o aviso) são a fonte da lista. Sem builtins; o fallback de
 * texto cobre o primeiro uso.
 */
const EVENT_DECL_BLOCKS: Record<string, string[]> = {
  sz_gk_on_event: ['NAME'],
  sz_gk_emit: ['NAME'],
  sz_g3k_on_event: ['NAME'],
  sz_g3k_emit: ['NAME'],
}
function collectEvents(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, EVENT_DECL_BLOCKS)
}

/** 🧙 Kit RPG: NPCs (declarados por "Criar o NPC") — fonte do seletor NPC. */
const NPC_DECL_BLOCKS: Record<string, string[]> = { sz_gk_rpg_create_npc: ['NAME'] }
function collectNpcs(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, NPC_DECL_BLOCKS)
}
/** Flags de história "existem por USO" (marcar OU perguntar), como os avisos. */
const FLAG_DECL_BLOCKS: Record<string, string[]> = {
  sz_gk_rpg_add_flag: ['FLAG'],
  sz_gk_rpg_has_flag: ['FLAG'],
}
function collectFlags(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, FLAG_DECL_BLOCKS)
}
/** Itens: quem DECLARA é o "Ganhar o item" (os demais consomem). */
const ITEM_DECL_BLOCKS: Record<string, string[]> = {
  sz_gk_rpg_give_item: ['NAME'],
  sz_w3d_inventory_give: ['ITEM'],
}
function collectItems(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, ITEM_DECL_BLOCKS)
}
/** Mapas: somente "Criar o mapa" declara; eventos, viagem e portas consomem. */
const MAP_DECL_BLOCKS: Record<string, string[]> = { sz_gk_rpg_create_map: ['MAP'] }
function collectMaps(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, MAP_DECL_BLOCKS)
}

/** Recursos nomeados do Jogo 2D Avançado que antes exigiam redigitação exata. */
const BOARD_DECL_BLOCKS: NameFieldRegistry = { sz_gk_board_create: ['NAME'] }
export function collectBoards(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, BOARD_DECL_BLOCKS)
}
const STORED_VALUE_DECL_BLOCKS: NameFieldRegistry = { sz_gk_save_value: ['NAME'] }
export function collectStoredValues(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, STORED_VALUE_DECL_BLOCKS)
}
const COMBAT_MOVE_DECL_BLOCKS: NameFieldRegistry = {
  sz_gk_rpg_teach_move: ['MOVE'],
  sz_gk_rpg_teach_heal: ['MOVE'],
}
const COMBAT_MOVE_OWNER_FIELDS: Readonly<Record<string, string>> = {
  sz_gk_rpg_teach_move: 'WHO',
  sz_gk_rpg_teach_heal: 'WHO',
}
export function collectCombatMoves(
  workspace: Blockly.Workspace | null | undefined,
  consumer?: Blockly.Block | null,
): string[] {
  return collectOwnedDeclaredNames(
    workspace,
    COMBAT_MOVE_DECL_BLOCKS,
    COMBAT_MOVE_OWNER_FIELDS,
    consumer?.getFieldValue('NAME'),
  )
}
const FIGHT_MOVE_DECL_BLOCKS: NameFieldRegistry = { sz_gk_luta_move: ['NAME'] }
const FIGHT_MOVE_OWNER_FIELDS: Readonly<Record<string, string>> = { sz_gk_luta_move: 'WHO' }
export function collectFightMoves(
  workspace: Blockly.Workspace | null | undefined,
  consumer?: Blockly.Block | null,
): string[] {
  return collectOwnedDeclaredNames(
    workspace,
    FIGHT_MOVE_DECL_BLOCKS,
    FIGHT_MOVE_OWNER_FIELDS,
    consumer?.getFieldValue('WHO'),
  )
}

/**
 * Jogo 3D Avançado — entidades NOMEADAS (o "Nascer… chamando de" e o "Guardar em
 * … quem está mais perto" declaram; os pickers CHAR/WHO/TARGET/A/B consomem).
 */
const ENTITY3D_DECL_BLOCKS: Record<string, string[]> = {
  sz_g3k_spawn_named: ['NAME'],
  sz_g3k_store_nearest: ['NAME'],
  sz_g3k_pick: ['NAME'],
}
function collectEntities3d(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, ENTITY3D_DECL_BLOCKS)
}
/** O "item"/"ela"/"vizinho" dos ganchos do kit 3D é uma entidade LOCAL (escopo por ancestral). */
const ENTITY3D_LOOP_BINDERS: Record<string, string[]> = {
  sz_g3k_for_each_alive: ['ITEM'],
  sz_g3k_for_each_near: ['ITEM'],
  sz_g3k_on_enter_entity_state: ['ITEM'],
  sz_g3k_on_entity_state_update: ['ITEM'],
  sz_g3k_on_exit_entity_state: ['ITEM'],
  sz_g3k_on_entity_death: ['ITEM'],
  // A zona e quem encostou nela são entidades LOCAIS do gancho de sobreposição.
  sz_g3k_on_overlap: ['ZONE', 'WHO'],
}

/** Moldes 3D (a receita de peças) — fonte do seletor MOLD do kit 3D. */
const MOLD3D_DECL_BLOCKS: Record<string, string[]> = { sz_g3k_define_mold: ['NAME'] }
/** Pontos interativos + áreas do Mundo 3D — fonte dos seletores de "Quando E/entrar". */
const W3DPOINT_DECL_BLOCKS: Record<string, string[]> = {
  sz_w3d_point: ['NAME'],
  sz_w3d_zone: ['NAME'],
}
function collectW3dPoints(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, W3DPOINT_DECL_BLOCKS)
}
/** Amigos (NPCs) do Mundo 3D — fonte dos seletores dos blocos de conversa. */
const W3DNPC_DECL_BLOCKS: Record<string, string[]> = {
  sz_w3d_npc: ['NAME'],
}
function collectW3dNpcs(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, W3DNPC_DECL_BLOCKS)
}
/** Missões do Mundo 3D — fonte dos seletores de completar/quando-completar. */
const W3DQUEST_DECL_BLOCKS: Record<string, string[]> = {
  sz_w3d_quest: ['NAME'],
}
function collectW3dQuests(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, W3DQUEST_DECL_BLOCKS)
}
/** Conquistas do Mundo 3D — fonte dos seletores de quando-ganhar/ganhou?. */
const W3DACHIEVE_DECL_BLOCKS: Record<string, string[]> = {
  sz_w3d_achievement: ['NAME'],
}
function collectW3dAchievements(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, W3DACHIEVE_DECL_BLOCKS)
}
function collectMolds3d(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, MOLD3D_DECL_BLOCKS)
}

/** Efeitos 3D (faíscas data-driven) — fonte do seletor EFFECT do kit 3D. */
const EFFECT3D_DECL_BLOCKS: Record<string, string[]> = {
  sz_g3k_define_effect: ['NAME'],
  sz_g3k_define_emitter: ['NAME'],
}
function collectEffects3d(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, EFFECT3D_DECL_BLOCKS)
}

/**
 * Estados de ENTIDADE do kit 3D (a FSM do curso): existem por USO — todos os
 * campos de estado são a fonte da lista. Semente: toda entidade nasce 'parado'.
 */
const G3K_BUILTIN_ENTITY_STATES = ['parado'] as const
const ENTITYSTATE_DECL_BLOCKS: Record<string, string[]> = {
  sz_g3k_set_entity_state: ['STATE'],
  sz_g3k_entity_state_is: ['STATE'],
  sz_g3k_on_enter_entity_state: ['STATE'],
  sz_g3k_on_entity_state_update: ['STATE'],
  sz_g3k_on_exit_entity_state: ['STATE'],
  sz_g3k_state_timer: ['STATE', 'NEXT'],
  sz_g3k_state_anim: ['STATE'],
}
function collectEntityStates(workspace: Blockly.Workspace | null | undefined): string[] {
  const used = collectDeclaredNames(workspace, ENTITYSTATE_DECL_BLOCKS)
  const seen = new Set<string>(G3K_BUILTIN_ENTITY_STATES)
  return [...G3K_BUILTIN_ENTITY_STATES, ...used.filter((n) => !seen.has(n))]
}

/** Mundos completos da extensão Jogo 3D (fonte do seletor WORLD). */
const G3D_WORLD_DECL_BLOCKS: Record<string, string[]> = {
  sz_g3d_create_scene: ['NAME'],
  sz_g3d_create_fullscreen_scene: ['NAME'],
  sz_g3d_create_crossing_scene: ['NAME'],
  sz_g3d_create_race_scene: ['NAME'],
  sz_g3d_create_stack_scene: ['NAME'],
}
/** Objetos/malhas do Jogo 3D (fonte dos seletores OBJ/A/B/FOLLOW/GROUND/MODEL/PART/ORIGINAL). */
const OBJECT3D_DECL_BLOCKS: Record<string, string[]> = {
  sz_g3d_create_box: ['NAME'],
  sz_g3d_create_sphere: ['NAME'],
  sz_g3d_create_block: ['NAME'],
  sz_g3d_create_crosser: ['NAME'],
  sz_g3d_create_race_car: ['NAME'],
  sz_g3d_create_cylinder: ['NAME'],
  sz_g3d_create_cone: ['NAME'],
  sz_g3d_create_plane: ['NAME'],
  sz_g3d_create_torus: ['NAME'],
  sz_g3d_create_model: ['NAME'],
}
const GAME3D_OBJECT_VALUE_HOLDERS: NameFieldRegistry = {
  sz_js_var_create: ['NAME'],
  sz_js_const_create: ['NAME'],
}
const GAME3D_OBJECT_VALUE_BLOCKS: ReadonlySet<string> = new Set([
  'sz_g3d_pick_at_mouse',
  'sz_g3d_aim_ahead',
])
const GAME3D_OBJECT_DECL_BLOCKS: NameFieldRegistry = {
  ...OBJECT3D_DECL_BLOCKS,
  ...GAME3D_OBJECT_VALUE_HOLDERS,
}
/** O "item" do "para cada no enxame" e a "parte" do traverse são nomes LOCAIS de objeto 3D. */
const OBJECT3D_LOOP_BINDERS: ScopedBinderRegistry = {
  sz_g3d_for_each_swarm: ['ITEM'],
  ...CANVAS3D_OBJECT_BRANCH_BINDERS,
}
/** Grupos simples do kit Desvie (fonte do seletor GROUP). */
const GROUP3D_DECL_BLOCKS: Record<string, string[]> = {
  sz_g3d_create_group: ['NAME'],
}
/** Enxames de cópias (fonte dos seletores SWARM). */
const SWARM3D_DECL_BLOCKS: Record<string, string[]> = {
  sz_g3d_create_swarm: ['NAME'],
}
/** Métodos declarados (fallback global do seletor de método, quando não há classe em contexto). */
const METHOD_DECL_BLOCKS: Record<string, string[]> = { sz_js_class_method: ['NAME'] }
/**
 * Blocos que ESCREVEM uma propriedade nomeada (fallback global do seletor de
 * propriedade). `sz_val_object` guarda as chaves em campos dinâmicos `KEY0..KEYn`
 * (tratados à parte em `collectPropertyNames`).
 */
const PROPERTY_WRITE_BLOCKS: Record<string, string[]> = {
  sz_js_set_this_prop: ['NAME'],
  sz_js_set_prop: ['NAME'],
  sz_js_member_set: ['NAME'],
}

/**
 * Blocos de laço que dão um NOME LOCAL a uma variável no corpo (o "i" do contar, o
 * "item"/"posição" do para-cada, o "erro" do tentar). Esses nomes valem só DENTRO do
 * bloco, então entram no seletor apenas quando o campo está dentro dele (escopo por
 * ancestral). Os campos que aqui DECLARAM o nome seguem `field_input`.
 */
const VARIABLE_LOOP_BINDERS: ScopedBinderRegistry = {
  sz_js_for_range: { DO: ['VAR'] },
  sz_js_for_of: { DO: ['ITEM'] },
  sz_js_for_each: { DO: ['ITEM', 'INDEX'] },
  sz_js_try_catch: { HANDLER: ['ERR'] },
  sz_js_fetch_json: { BODY: ['OK'], CATCH: ['ERR'] },
  sz_val_array_map: { TRANSFORM: ['ITEM'] },
  sz_val_array_find: { COND: ['ITEM'] },
  sz_val_array_filter: { COND: ['ITEM'] },
  // Callbacks do Canvas 2D: o parâmetro do próximo quadro e os nomes opcionais
  // do laço de animação existem somente dentro de seus respectivos corpos.
  sz_canvas_request_frame_do: { DO: ['PARAM'] },
  sz_canvas_anim_loop: { BODY: ['HANDLE', 'TIME_VAR', 'DELTA_VAR'] },
  ...CANVAS3D_VARIABLE_BRANCH_BINDERS,
  // O evento de ponteiro do Jogo 2D fornece as coordenadas somente ao seu corpo.
  sz_g2d_on_pointer: { BODY: ['PX', 'PY'] },
  // Ganchos do Jogo 2D Avançado: o tempo (dt), o pincel (ctx) e a posição do
  // clique (px/py) são nomes LOCAIS dos corpos dos ganchos.
  sz_gk_on_update: ['DT'],
  sz_gk_on_draw: ['PARAM'],
  sz_gk_on_draw_hud: ['PARAM'],
  sz_gk_on_game_click: ['PX', 'PY'],
  sz_gk_define_look: ['CTX'],
  // Ganchos do Jogo 3D Avançado: o tempo (dt) é nome LOCAL do corpo.
  sz_g3k_on_update: ['DT'],
  sz_g3k_on_entity_state_update: ['DT'],
}

/** Pincéis Canvas 2D recebidos pelos corpos dos blocos de jogo. */
const CANVAS_CONTEXT_LOCAL_BINDERS: ScopedBinderRegistry = {
  sz_gk_on_draw: { BODY: ['PARAM'] },
  sz_gk_on_draw_hud: { BODY: ['PARAM'] },
  sz_gk_rpg_create_map: { BODY: ['PARAM'] },
  sz_gk_define_look: { BODY: ['CTX'] },
}

/** A figura 2D usa um contexto implícito, sem campo declarador no bloco. */
const CANVAS_CONTEXT_LITERAL_BINDERS: ScopedBinderRegistry = {
  sz_g2d_define_shape: { BODY: ['ctx'] },
}

/** Funções locais introduzidas por valores com corpo de comandos. */
const FUNCTION_LOCAL_BINDERS: ScopedBinderRegistry = {
  sz_val_new_promise: { DO: ['PARAM'] },
}

/**
 * Blocos que DECLARAM um grupo de sprites nomeado (Jogo 2D). O TIPO de inimigo
 * também entra aqui: ele É um grupo estendido (tem .items) — os blocos de grupo
 * (para cada / contar / colisões / tirar) funcionam direto no tipo.
 */
const GROUP_DECL_BLOCKS: Record<string, string[]> = {
  sz_g2d_create_group: ['NAME'],
  sz_g2d_define_enemy_type: ['NAME'],
}

/** Blocos que DECLARAM um TIPO de inimigo nomeado (Jogo 2D). */
const ENEMYTYPE_DECL_BLOCKS: Record<string, string[]> = {
  sz_g2d_define_enemy_type: ['NAME'],
}

/** Tipos de inimigo criados no workspace, na ordem dos blocos, sem repetir. */
function collectEnemyTypes(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, ENEMYTYPE_DECL_BLOCKS)
}

/**
 * Blocos que criam/atribuem uma variável cujo VALOR pode ser uma lista. Só entram na
 * lista de "grupos/listas" quando o valor conectado é um `sz_val_array` (uma lista de
 * verdade) — assim o menu de LISTA não mistura variáveis simples.
 */
const LIST_VALUE_HOLDERS: Record<string, string> = {
  sz_js_var_create: 'NAME',
  sz_js_const_create: 'NAME',
}

interface KindUI {
  icon: string
  placeholder: string
  empty: string
}

const KIND_UI: Record<NameKind, KindUI> = {
  path: {
    icon: '🛤️',
    placeholder: 'nome do caminho',
    empty: 'Nenhum caminho ainda — crie um com "Criar o caminho" (a trilha do inimigo, a rota…).',
  },
  region: {
    icon: '🧭',
    placeholder: 'nome da região',
    empty: 'Nenhuma região ainda — crie uma com "Criar a região" (a grama alta, a porta…).',
  },
  pkmcreature: {
    icon: '👾',
    placeholder: 'nome da criatura',
    empty: 'Nenhuma criatura ainda — crie uma com o bloco "Criatura".',
  },
  pkmtype: {
    icon: '🔥',
    placeholder: 'tipo (fogo, água…)',
    empty:
      'Nenhum tipo ainda — o tipo é INVENTADO por você: escreva o que quiser (fogo, gelo, doce, dinossauro) numa Criatura ou num golpe.',
  },
  variable: {
    icon: '🔤',
    placeholder: 'nome da variável',
    empty:
      'Nenhuma variável no programa ainda — crie uma (ex.: "Criar variável") ou digite o nome abaixo.',
  },
  'mutable-variable': {
    icon: '✏️',
    placeholder: 'variável para alterar',
    empty: 'Nenhuma variável mutável neste lugar — crie uma variável primeiro.',
  },
  group: {
    icon: '📋',
    placeholder: 'nome do grupo ou lista',
    empty:
      'Nenhum grupo ou lista ainda — crie um (ex.: "Criar grupo de sprites" ou uma lista) ou digite o nome abaixo.',
  },
  class: {
    icon: '🏛️',
    placeholder: 'nome da classe',
    empty: 'Nenhuma classe ainda — crie uma (bloco "Classe") ou digite o nome abaixo.',
  },
  function: {
    icon: '🧩',
    placeholder: 'nome da função',
    empty: 'Nenhuma função ainda — crie uma (bloco "função") ou digite o nome abaixo.',
  },
  'optional-function': {
    icon: '⛰️',
    placeholder: 'função de altura opcional',
    empty: 'Use terreno plano ou prepare um terreno para acompanhar seus morros.',
  },
  property: {
    icon: '🏷️',
    placeholder: 'nome da propriedade',
    empty:
      'Nenhuma propriedade ainda — defina uma (ex.: "definir minha propriedade") ou digite o nome abaixo.',
  },
  method: {
    icon: '⚙️',
    placeholder: 'nome do método',
    empty: 'Nenhum método ainda — crie um (bloco "método") ou digite o nome abaixo.',
  },
  'super-method': {
    icon: '⬆️',
    placeholder: 'método da classe-mãe',
    empty: 'A classe-mãe ainda não tem métodos disponíveis.',
  },
  canvas: {
    icon: '🖼️',
    placeholder: 'id da tela de desenho',
    empty:
      'Nenhuma tela de desenho ainda — crie uma ("Criar tela de desenho") ou digite o id abaixo.',
  },
  'canvas3d-canvas': {
    icon: '🖼️',
    placeholder: 'tela para o mundo 3D',
    empty: 'Nenhuma tela disponível. Crie uma tela de desenho antes de preparar o 3D.',
  },
  'canvas-context': {
    icon: '🖌️',
    placeholder: 'pincel da tela',
    empty:
      'Nenhum pincel disponível aqui — pegue o contexto de uma tela antes deste bloco ou desenhe dentro de um corpo que fornece um pincel.',
  },
  'form-control': {
    icon: '🏷️',
    placeholder: 'id do campo',
    empty: 'Nenhum campo com id ainda — dê um id ao campo ou digite o nome aqui.',
  },
  'dom-target': {
    icon: '🌐',
    placeholder: 'id ou variável do elemento',
    empty:
      'Nenhum elemento disponível ainda — crie uma parte da página ou guarde um elemento numa variável.',
  },
  selector: {
    icon: '🎯',
    placeholder: 'body, #caixa ou .cartao',
    empty:
      'Ainda não achei uma parte da página. Crie uma caixa no HTML ou escreva body para estilizar a página toda.',
  },
  'svg-reference': {
    icon: '🧩',
    placeholder: '#nome-da-forma',
    empty:
      'Nenhuma forma com nome ainda. Preencha o campo “id” de uma forma ou crie uma peça reutilizável.',
  },
  font: {
    icon: '🔤',
    placeholder: 'nome da fonte',
    empty: 'Nenhuma fonte importada ainda. Use o bloco “Buscar fonte do Google” primeiro.',
  },
  animation: {
    icon: '✨',
    placeholder: 'nome da animação',
    empty: 'Nenhuma animação ainda. Crie uma com o bloco “Criar animação” primeiro.',
  },
  spritesheet: {
    icon: '🎞️',
    placeholder: 'nome da folha de quadros',
    empty:
      'Nenhuma folha de quadros ainda — crie uma ("Carregar folha de quadros") ou digite o nome abaixo.',
  },
  tilemap: {
    icon: '🗺️',
    placeholder: 'nome do mapa de tiles',
    empty: 'Nenhum mapa de tiles ainda — crie um ("Criar mapa de tiles") ou digite o nome abaixo.',
  },
  board: {
    icon: '🧩',
    placeholder: 'nome do tabuleiro',
    empty: 'Nenhum tabuleiro ainda — crie um com “Criar o tabuleiro”.',
  },
  'stored-value': {
    icon: '💾',
    placeholder: 'nome do valor guardado',
    empty: 'Nenhum valor guardado ainda — use “Guardar o valor” primeiro.',
  },
  'combat-move': {
    icon: '⚔️',
    placeholder: 'nome do golpe da batalha',
    empty: 'Nenhum golpe de batalha ainda — ensine um golpe a um combatente primeiro.',
  },
  'fight-move': {
    icon: '🥊',
    placeholder: 'nome do golpe de luta',
    empty: 'Nenhum golpe de luta ainda — crie um com o bloco “Golpe”.',
  },
  shape: {
    icon: '🎨',
    placeholder: 'nome da figura',
    empty: 'Nenhuma figura ainda — crie uma (bloco "Desenhar a figura") ou digite o nome abaixo.',
  },
  enemytype: {
    icon: '😈',
    placeholder: 'nome do tipo de inimigo',
    empty:
      'Nenhum tipo de inimigo ainda — crie um (bloco "Criar tipo de inimigo") ou digite o nome abaixo.',
  },
  scene3d: {
    icon: '🌐',
    placeholder: 'nome da cena Three.js',
    empty: 'Nenhuma cena Three.js ainda. Crie uma cena com os blocos Canvas 3D.',
  },
  'g3d-world': {
    icon: '🌍',
    placeholder: 'nome do mundo do jogo',
    empty: 'Nenhum mundo do Jogo 3D ainda. Crie uma cena 3D antes de usar este bloco.',
  },
  renderer3d: {
    icon: '🖼️',
    placeholder: 'renderizador 3D',
    empty: 'Nenhum renderizador ainda — prepare uma tela 3D primeiro.',
  },
  camera3d: {
    icon: '📷',
    placeholder: 'câmera 3D',
    empty: 'Nenhuma câmera ainda — crie uma câmera primeiro.',
  },
  'perspective-camera3d': {
    icon: '📷',
    placeholder: 'câmera de perspectiva 3D',
    empty: 'Nenhuma câmera de perspectiva ainda — crie uma câmera 3D primeiro.',
  },
  light3d: {
    icon: '💡',
    placeholder: 'luz 3D',
    empty: 'Nenhuma luz ainda — crie uma luz primeiro.',
  },
  composer3d: {
    icon: '✨',
    placeholder: 'efeitos 3D',
    empty: 'Nenhum conjunto de efeitos ainda — prepare o brilho primeiro.',
  },
  loader3d: {
    icon: '📦',
    placeholder: 'carregador 3D',
    empty: 'Nenhum carregador ainda — crie um carregador com as peças técnicas.',
  },
  'model-loader3d': {
    icon: '📦',
    placeholder: 'carregador de modelo 3D',
    empty:
      'Nenhum carregador de modelo disponível. Crie um GLTFLoader ou outro carregador de modelo.',
  },
  'audio-loader3d': {
    icon: '🔊',
    placeholder: 'carregador de áudio 3D',
    empty: 'Nenhum carregador de áudio disponível. Crie um AudioLoader primeiro.',
  },
  water3d: {
    icon: '🌊',
    placeholder: 'água 3D',
    empty: 'Nenhuma água 3D disponível. Crie a água antes de animar as ondas.',
  },
  grass3d: {
    icon: '🌿',
    placeholder: 'grama 3D',
    empty: 'Nenhuma grama 3D disponível. Crie a grama antes de animá-la.',
  },
  'instanced-mesh3d': {
    icon: '🧩',
    placeholder: 'malha com cópias',
    empty: 'Nenhuma malha com cópias disponível. Crie uma InstancedMesh primeiro.',
  },
  'color-target3d': {
    icon: '🎨',
    placeholder: 'objeto com cor',
    empty: 'Nenhum material, luz ou objeto compatível com cor está disponível.',
  },
  'shadow-target3d': {
    icon: '🌗',
    placeholder: 'objeto compatível com sombra',
    empty: 'Nenhum objeto compatível com este tipo de sombra está disponível.',
  },
  'physics-collider3d': {
    icon: '🧱',
    placeholder: 'objeto com colisão',
    empty: 'Nenhuma primitiva ou prédio compatível com colisão está disponível.',
  },
  'physics-city3d': {
    icon: '🏙️',
    placeholder: 'cidade com colisão',
    empty: 'Nenhuma cidade automática está disponível.',
  },
  'physics-world': {
    icon: '🧲',
    placeholder: 'mundo físico',
    empty: 'Nenhum mundo físico ainda — prepare a física primeiro.',
  },
  'physics-character': {
    icon: '🧍',
    placeholder: 'personagem físico',
    empty: 'Nenhum personagem físico ainda — crie um corpo do tipo personagem primeiro.',
  },
  object3d: {
    icon: '🧊',
    placeholder: 'nome do objeto 3D',
    empty: 'Nenhum objeto 3D ainda — crie uma peça, câmera, luz ou cena primeiro.',
  },
  'g3d-object': {
    icon: '🧊',
    placeholder: 'objeto deste mundo do jogo',
    empty: 'Nenhum objeto do Jogo 3D ainda. Crie uma peça nesse mundo primeiro.',
  },
  group3d: {
    icon: '👾',
    placeholder: 'nome do grupo de objetos',
    empty: 'Nenhum grupo de objetos ainda. Crie um com "Criar grupo de objetos".',
  },
  swarm3d: {
    icon: '👯',
    placeholder: 'nome do enxame',
    empty: 'Nenhum enxame ainda. Crie um com "Criar enxame".',
  },
  'physics-body': {
    icon: '🧍',
    placeholder: 'corpo da física',
    empty: 'Nenhum corpo nessa física — conecte um objeto com “tornar o corpo” primeiro.',
  },
  'physics-resource': {
    icon: '🧲',
    placeholder: 'item da física',
    empty: 'Nenhum item nessa física — adicione um corpo, obstáculo ou área primeiro.',
  },
  character: {
    icon: '🧍',
    placeholder: 'nome do personagem',
    empty:
      'Nenhum personagem ainda — crie um (bloco "Criar o personagem") ou digite o nome abaixo.',
  },
  screen: {
    icon: '🖼️',
    placeholder: 'nome da tela',
    empty:
      'As telas prontas são menu, pausa, carregando e fim — ou crie a sua ("Criar a tela") e digite o nome abaixo.',
  },
  gamestate: {
    icon: '🚦',
    placeholder: 'nome do estado',
    empty:
      'Os estados prontos são menu, jogando, pausado e fim — ou invente o seu (ex.: loja) digitando abaixo.',
  },
  mold: {
    icon: '👾',
    placeholder: 'nome do molde',
    empty: 'Nenhum molde ainda — crie um (bloco "Criar o molde") ou digite o nome abaixo.',
  },
  battler: {
    icon: '⚔️',
    placeholder: 'nome do inimigo',
    empty:
      'Nenhuma ficha de inimigo ainda — crie uma (bloco "Criar a ficha do inimigo") ou digite o nome abaixo.',
  },
  combatant: {
    icon: '⚔️',
    placeholder: 'nome do combatente',
    empty:
      'O herói é "Você". Aliados e inimigos aparecem quando você os adiciona/cria — ou digite o nome abaixo.',
  },
  'enemy-combatant': {
    icon: '👿',
    placeholder: 'nome do inimigo',
    empty: 'Nenhum inimigo ainda — adicione um inimigo, um chefão ou crie uma ficha primeiro.',
  },
  effect: {
    icon: '✨',
    placeholder: 'nome do efeito',
    empty: 'Nenhum efeito ainda — crie um (bloco "Criar o efeito") ou digite o nome abaixo.',
  },
  event: {
    icon: '📢',
    placeholder: 'nome do aviso',
    empty:
      'Nenhum aviso ainda — invente um nome (ex.: inimigo:morreu) aqui; quem "avisa" e quem "ouve" usam o mesmo.',
  },
  look: {
    icon: '🎨',
    placeholder: 'nome da aparência',
    empty:
      'Nenhuma aparência ainda — crie uma (bloco "Criar a aparência") ou digite o nome abaixo.',
  },
  sound: {
    icon: '🔊',
    placeholder: 'nome do som',
    empty:
      'Nenhum som carregado ainda — use "Carregar o som" (importe em "Imagens e sons") ou digite o nome abaixo.',
  },
  npc: {
    icon: '🧙',
    placeholder: 'nome do NPC',
    empty: 'Nenhum NPC ainda — crie um (bloco "Criar o NPC") ou digite o nome abaixo.',
  },
  flag: {
    icon: '🚩',
    placeholder: 'nome do acontecimento',
    empty:
      'Nenhuma marca da história ainda — use "Marcar que … aconteceu" ou digite o nome abaixo.',
  },
  item: {
    icon: '🎒',
    placeholder: 'nome do item',
    empty: 'Nenhum item ainda — use "Ganhar o item" ou digite o nome abaixo.',
  },
  map: {
    icon: '🗺️',
    placeholder: 'nome do mapa',
    empty: 'Nenhum mapa ainda — use “Criar o mapa” antes de escolher um nome.',
  },
  entity3d: {
    icon: '🤖',
    placeholder: 'nome da entidade',
    empty:
      'Nenhuma entidade nomeada ainda — use "Nascer… chamando de" ou "Guardar em… quem está mais perto", ou digite o nome abaixo.',
  },
  mold3d: {
    icon: '🧊',
    placeholder: 'nome do molde 3D',
    empty: 'Nenhum molde 3D ainda — crie um (bloco "Criar o molde 3D") ou digite o nome abaixo.',
  },
  effect3d: {
    icon: '💥',
    placeholder: 'nome do efeito 3D',
    empty: 'Nenhum efeito 3D ainda — crie um (bloco "Criar o efeito 3D") ou digite o nome abaixo.',
  },
  entitystate: {
    icon: '🚥',
    placeholder: 'nome do estado da entidade',
    empty:
      'Toda entidade nasce no estado "parado" — invente os seus (mirar, atirar, recarregar) digitando abaixo.',
  },
  w3dpoint: {
    icon: '📍',
    placeholder: 'nome do ponto ou área',
    empty:
      'Nenhum ponto ou área ainda — crie um ("Criar o ponto interativo" ou "Criar a área mágica") ou digite o nome abaixo.',
  },
  w3dnpc: {
    icon: '🧑‍🤝‍🧑',
    placeholder: 'nome do amigo',
    empty: 'Nenhum amigo ainda — crie um com "Criar o amigo" ou digite o nome abaixo.',
  },
  w3dquest: {
    icon: '⭐',
    placeholder: 'nome da missão',
    empty: 'Nenhuma missão ainda — crie uma com "Criar a missão" ou digite o nome abaixo.',
  },
  w3dachieve: {
    icon: '🏆',
    placeholder: 'nome da conquista',
    empty: 'Nenhuma conquista ainda — dê uma com "Dar a conquista" ou digite o nome abaixo.',
  },
}

/** Laços que introduzem nomes LOCAIS, por `kind` de seletor (escopo por ancestral). */
const LOOP_BINDERS_BY_KIND: Partial<Record<NameKind, ScopedBinderRegistry>> = {
  variable: VARIABLE_LOOP_BINDERS,
  'mutable-variable': VARIABLE_LOOP_BINDERS,
  function: FUNCTION_LOCAL_BINDERS,
  object3d: OBJECT3D_LOOP_BINDERS,
  'g3d-object': OBJECT3D_LOOP_BINDERS,
  'shadow-target3d': OBJECT3D_LOOP_BINDERS,
  character: CHARACTER_LOOP_BINDERS,
  entity3d: ENTITY3D_LOOP_BINDERS,
}

/** Anda o workspace e coleta os nomes declarados nos campos do registro, sem repetir. */
function collectDeclaredNames(
  workspace: Blockly.Workspace | null | undefined,
  registry: NameFieldRegistry,
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

/** Variante para recursos que pertencem a outro nome (golpe → combatente). */
function collectOwnedDeclaredNames(
  workspace: Blockly.Workspace | null | undefined,
  registry: NameFieldRegistry,
  ownerFields: Readonly<Record<string, string>>,
  requestedOwner: unknown,
  useBlock?: Blockly.Block | null,
  declarationFilter?: (block: Blockly.Block) => boolean,
): string[] {
  if (!workspace) return []
  const owner = `${requestedOwner ?? ''}`.trim()
  const visibleScopes = useBlock ? new Set(variableScopeKeys(useBlock)) : null
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const block of workspace.getAllBlocks(false)) {
    const fields = registry[block.type]
    const ownerField = ownerFields[block.type]
    if (!fields || !ownerField) continue
    if (declarationFilter && !declarationFilter(block)) continue
    if (owner && `${block.getFieldValue(ownerField) ?? ''}`.trim() !== owner) continue
    if (visibleScopes && useBlock) {
      const declarationScope = variableScopeKeys(block)[0] ?? 'global'
      if (!visibleScopes.has(declarationScope)) continue
      if (!declarationPrecedesUse(block, useBlock, declarationScope)) continue
    }
    for (const field of fields) {
      if (!block.getField(field)) continue
      const name = `${block.getFieldValue(field) ?? ''}`.trim()
      if (!name || seen.has(name)) continue
      seen.add(name)
      ordered.push(name)
    }
  }
  return ordered
}

type NameLookupTarget = Blockly.Workspace | Blockly.Block | null | undefined

function nameLookupContext(target: NameLookupTarget): {
  workspace: Blockly.Workspace | null
  useBlock: Blockly.Block | null
} {
  if (!target) return { workspace: null, useBlock: null }
  if (typeof (target as Blockly.Block).getSurroundParent === 'function') {
    const useBlock = target as Blockly.Block
    return { workspace: useBlock.workspace ?? null, useBlock }
  }
  return { workspace: target as Blockly.Workspace, useBlock: null }
}

function containingInput(parent: Blockly.Block, child: Blockly.Block): Blockly.Input | null {
  for (const input of parent.inputList) {
    let current = input.connection?.targetBlock() ?? null
    while (current) {
      if (current === child) return input
      current = current.getNextBlock()
    }
  }
  return null
}

/**
 * Chaves dos escopos léxicos que envolvem um bloco, do mais interno ao global.
 * Cada boca de comandos é distinta; THEN e ELSE, ou dois eventos, não dividem
 * por engano as variáveis criadas dentro deles.
 */
function variableScopeKeys(block: Blockly.Block | null | undefined): string[] {
  const keys: string[] = []
  let child = block ?? null
  let parent = child?.getSurroundParent() ?? null
  while (child && parent) {
    const input = containingInput(parent, child)
    if (
      input?.connection?.type === Blockly.ConnectionType.NEXT_STATEMENT &&
      !parent.type.startsWith('sz_frame_') &&
      input.name !== 'MEMBERS'
    ) {
      keys.push(`${parent.id}:${input.name}`)
    }
    child = parent
    parent = parent.getSurroundParent()
  }
  keys.push('global')
  return keys
}

function enclosingProjectArea(block: Blockly.Block): Blockly.Block | null {
  let current: Blockly.Block | null = block
  while (current) {
    if (current.type.startsWith('sz_frame_')) return current
    current = current.getSurroundParent()
  }
  return null
}

/** Bloco diretamente pertencente ao escopo informado. */
function blockAtScope(block: Blockly.Block, scope: string): Blockly.Block | null {
  let child: Blockly.Block | null = block
  let parent = child.getSurroundParent()
  while (child && parent) {
    const input = containingInput(parent, child)
    if (scope === 'global' && parent.type.startsWith('sz_frame_')) return child
    if (scope === `${parent.id}:${input?.name ?? ''}`) return child
    child = parent
    parent = parent.getSurroundParent()
  }
  return scope === 'global' ? child : null
}

function appearsBeforeInStatementChain(declaration: Blockly.Block, use: Blockly.Block): boolean {
  let current: Blockly.Block | null = declaration
  while (current) {
    if (current === use) return true
    current = current.getNextBlock()
  }
  return false
}

/**
 * `let`/`const` só entram no seletor depois do comando declarador. Para usos em
 * outra Área, Ao iniciar acontece antes de Eventos/Loops e é o único lugar que
 * pode introduzir globais guiadas.
 */
function declarationPrecedesUse(
  declaration: Blockly.Block,
  use: Blockly.Block,
  scope: string,
): boolean {
  const declarationAtScope = blockAtScope(declaration, scope)
  const useAtScope = blockAtScope(use, scope)
  if (!declarationAtScope || !useAtScope || declarationAtScope === useAtScope) return false

  const declarationArea = enclosingProjectArea(declarationAtScope)
  const useArea = enclosingProjectArea(useAtScope)
  if (!declarationArea && !useArea) {
    if (appearsBeforeInStatementChain(declarationAtScope, useAtScope)) return true
    if (appearsBeforeInStatementChain(useAtScope, declarationAtScope)) return false
    return true
  }
  if (scope === 'global' && declarationArea !== useArea) {
    return declarationArea?.type === 'sz_frame_start'
  }
  return appearsBeforeInStatementChain(declarationAtScope, useAtScope)
}

function collectVariableDeclarations(
  workspace: Blockly.Workspace,
  registry: NameFieldRegistry,
  visibleScopes: ReadonlySet<string>,
  useBlock?: Blockly.Block | null,
  acceptsDeclaration: (block: Blockly.Block) => boolean = () => true,
): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const declaration of workspace.getAllBlocks(false)) {
    const fields = registry[declaration.type]
    if (!fields) continue
    if (!acceptsDeclaration(declaration)) continue
    const declarationScope = variableScopeKeys(declaration)[0] ?? 'global'
    if (!visibleScopes.has(declarationScope)) continue
    if (useBlock && !declarationPrecedesUse(declaration, useBlock, declarationScope)) continue
    for (const field of fields) {
      const name = declaration.getFieldValue(field)
      if (!name || seen.has(name)) continue
      seen.add(name)
      ordered.push(name)
    }
  }
  return ordered
}

/** Variáveis globais criadas no workspace, na ordem dos blocos, sem repetir. */
export function collectVariables(workspace: Blockly.Workspace | null | undefined): string[] {
  if (!workspace) return []
  return collectVariableDeclarations(workspace, VARIABLE_DECL_BLOCKS, new Set(['global']))
}

function collectVisibleVariables(
  block: Blockly.Block | null | undefined,
  registry: NameFieldRegistry,
): string[] {
  const workspace = block?.workspace
  if (!workspace) return []
  return collectVariableDeclarations(workspace, registry, new Set(variableScopeKeys(block)), block)
}

/** Variáveis legíveis no ponto do bloco, incluindo constantes e escopos externos. */
export function collectReadableVariables(block: Blockly.Block | null | undefined): string[] {
  return collectVisibleVariables(block, VARIABLE_DECL_BLOCKS)
}

/** Variáveis que podem receber outro valor no ponto do bloco. */
export function collectMutableVariables(block: Blockly.Block | null | undefined): string[] {
  return collectVisibleVariables(block, MUTABLE_VARIABLE_DECL_BLOCKS)
}

/**
 * Nomes LOCAIS em escopo no ponto do campo: sobe pelos blocos que ENVOLVEM o bloco do
 * campo (`getSurroundParent`) e coleta os nomes dados pelos laços do registro `binders`
 * (o "i" do contar, o "item" do para-cada / do enxame…). Só aparecem dentro do laço
 * que os declara.
 */
function collectScopedNames(
  block: Blockly.Block | null | undefined,
  binders: ScopedBinderRegistry,
  literalBinders: ScopedBinderRegistry = {},
): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  let child = block ?? null
  let parent = child?.getSurroundParent() ?? null
  while (child && parent) {
    const inputName = containingInput(parent, child)?.name
    const namesForInput = (binder: ScopedBinder | undefined): readonly string[] | undefined =>
      Array.isArray(binder)
        ? binder
        : inputName && binder
          ? (binder as Readonly<Record<string, readonly string[]>>)[inputName]
          : undefined
    const fields = namesForInput(binders[parent.type])
    if (fields) {
      for (const f of fields) {
        if (!parent.getField(f)) continue
        const name = parent.getFieldValue(f)
        if (name && !seen.has(name)) {
          seen.add(name)
          ordered.push(name)
        }
      }
    }
    const literals = namesForInput(literalBinders[parent.type])
    if (literals) {
      for (const name of literals) {
        if (!name || seen.has(name)) continue
        seen.add(name)
        ordered.push(name)
      }
    }
    child = parent
    parent = parent.getSurroundParent() ?? null
  }
  return ordered
}

/** Nomes de variável LOCAIS (o "i" do contar, o "item" do para-cada…) em escopo. */
export function collectScopedVariableNames(block: Blockly.Block | null | undefined): string[] {
  return collectScopedNames(block, VARIABLE_LOOP_BINDERS)
}

/** Funções locais disponíveis no ponto atual (ex.: `resolve` de uma Promise). */
export function collectScopedFunctionNames(block: Blockly.Block | null | undefined): string[] {
  return collectScopedNames(block, FUNCTION_LOCAL_BINDERS)
}

/** Pincéis Canvas 2D locais disponíveis dentro do corpo atual. */
export function collectScopedCanvasContexts(block: Blockly.Block | null | undefined): string[] {
  return collectScopedNames(block, CANVAS_CONTEXT_LOCAL_BINDERS, CANVAS_CONTEXT_LITERAL_BINDERS)
}

/** Contextos Canvas 2D visíveis no ponto atual, globais e locais, sem misturar variáveis comuns. */
export function collectCanvasContexts(block: Blockly.Block | null | undefined): string[] {
  const globals = collectVisibleVariables(block, CANVAS_CONTEXT_DECL_BLOCKS)
  const seen = new Set(globals)
  return [...globals, ...collectScopedCanvasContexts(block).filter((name) => !seen.has(name))]
}

/**
 * Grupos de sprites (Jogo 2D) + listas de verdade (variáveis que guardam um
 * `sz_val_array`), na ordem dos blocos, sem repetir. "Grupo ≡ lista".
 */
export function collectGroupsAndLists(target: NameLookupTarget): string[] {
  const { workspace, useBlock } = nameLookupContext(target)
  if (!workspace) return []
  const visibleScopes = useBlock ? new Set(variableScopeKeys(useBlock)) : null
  const seen = new Set<string>()
  const ordered: string[] = []
  const add = (name: string | null): void => {
    if (!name || seen.has(name)) return
    seen.add(name)
    ordered.push(name)
  }
  for (const block of workspace.getAllBlocks(false)) {
    if (visibleScopes) {
      const declarationScope = variableScopeKeys(block)[0] ?? 'global'
      if (!visibleScopes.has(declarationScope)) continue
      if (!declarationPrecedesUse(block, useBlock as Blockly.Block, declarationScope)) continue
    }
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

/** Nomes de classe (`sz_js_class`) declarados no workspace, na ordem, sem repetir. */
export function collectClassNames(target: NameLookupTarget): string[] {
  const { workspace, useBlock } = nameLookupContext(target)
  if (!workspace) return []
  return collectVariableDeclarations(
    workspace,
    CLASS_DECL_BLOCKS,
    new Set(useBlock ? variableScopeKeys(useBlock) : ['global']),
    useBlock,
  )
}

/** Nomes de função (`sz_js_function`) declarados no workspace, na ordem, sem repetir. */
export function collectFunctionNames(target: NameLookupTarget): string[] {
  const { workspace, useBlock } = nameLookupContext(target)
  if (!workspace) return []
  // Declarações de função têm hoisting, mas não atravessam o limite léxico do ramo.
  return collectVariableDeclarations(
    workspace,
    FUNCTION_DECL_BLOCKS,
    new Set(useBlock ? variableScopeKeys(useBlock) : ['global']),
  )
}

/** Nomes de método (`sz_js_class_method`) de TODAS as classes — fallback global. */
export function collectMethodNames(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, METHOD_DECL_BLOCKS)
}

/** Ids das telas de desenho (`sz_html_canvas`) declaradas no workspace. */
export function collectCanvasIds(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, CANVAS_DECL_BLOCKS)
}

/** Nomes das folhas de quadros (`sz_g2d_load_spritesheet`) declaradas. */
export function collectSpritesheets(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, SPRITESHEET_DECL_BLOCKS)
}

/** Nomes dos mapas de tiles (`sz_g2d_create_tilemap`) declarados. */
export function collectTilemaps(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, TILEMAP_DECL_BLOCKS)
}

/** Nomes das cenas Three.js cruas declaradas pelos blocos Canvas 3D. */
export function collectScenes3d(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  return collectCanvas3DSymbolNames(useBlock ?? workspace, 'scene3d')
}

/** Nomes dos mundos completos criados pela extensão Jogo 3D. */
export function collectGame3DWorlds(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  const target = useBlock ?? workspace
  const context = nameLookupContext(target)
  if (!context.workspace) return []
  return collectVariableDeclarations(
    context.workspace,
    G3D_WORLD_DECL_BLOCKS,
    new Set(context.useBlock ? variableScopeKeys(context.useBlock) : ['global']),
    context.useBlock,
  )
}

function isGame3DObjectDeclaration(block: Blockly.Block): boolean {
  if (OBJECT3D_DECL_BLOCKS[block.type]) return true
  const valueType = block.getInputTargetBlock('VALUE')?.type
  return Boolean(valueType && GAME3D_OBJECT_VALUE_BLOCKS.has(valueType))
}

/** Objetos criados pelo Jogo 3D ou obtidos de uma seleção dentro dele. */
export function collectGame3DObjects(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  const target = useBlock ?? workspace
  const context = nameLookupContext(target)
  if (!context.workspace) return []
  return collectVariableDeclarations(
    context.workspace,
    GAME3D_OBJECT_DECL_BLOCKS,
    new Set(context.useBlock ? variableScopeKeys(context.useBlock) : ['global']),
    context.useBlock,
    isGame3DObjectDeclaration,
  )
}

/** Nomes dos objetos/malhas 3D declarados nas duas camadas Three.js. */
export function collectObjects3d(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  const target = useBlock ?? workspace
  return mergeNames(
    collectGame3DObjects(workspace, useBlock),
    collectCanvas3DSymbolNames(target, 'object3d'),
  )
}

function mergeNames(...groups: readonly string[][]): string[] {
  const seen = new Set<string>()
  return groups.flat().filter((name) => {
    if (seen.has(name)) return false
    seen.add(name)
    return true
  })
}

function canvas3DDeclarationSupportsKind(
  declaration: Blockly.Block,
  kind: Canvas3DSymbolKind,
): boolean {
  if (kind !== 'shadow-caster3d' && kind !== 'shadow-receiver3d') return true
  if (declaration.type === 'sz_t3d_primitive') {
    return declaration.getFieldValue('SHAPE') !== 'capsule'
  }
  if (kind === 'shadow-caster3d' && declaration.type === 'sz_t3d_light_create') {
    return declaration.getFieldValue('KIND') === 'directional'
  }
  return true
}

function collectCanvas3DSymbolNames(target: NameLookupTarget, kind: Canvas3DSymbolKind): string[] {
  const { workspace, useBlock } = nameLookupContext(target)
  if (!workspace) return []
  const visibleScopes = new Set(useBlock ? variableScopeKeys(useBlock) : ['global'])
  const declared = collectVariableDeclarations(
    workspace,
    CANVAS3D_BLOCK_DECLARATIONS_BY_KIND[kind],
    visibleScopes,
    useBlock,
    (declaration) => canvas3DDeclarationSupportsKind(declaration, kind),
  )
  const advanced: string[] = []
  const seen = new Set(declared)
  for (const block of workspace.getBlocksByType('sz_t3d_new_var', false)) {
    const declarationScope = variableScopeKeys(block)[0] ?? 'global'
    if (!visibleScopes.has(declarationScope)) continue
    if (useBlock && !declarationPrecedesUse(block, useBlock, declarationScope)) continue
    const className = `${block.getFieldValue('CLASS') ?? ''}`
    if (!canvas3DSymbolKindsForClass(className).includes(kind)) continue
    const name = `${block.getFieldValue('VARNAME') ?? ''}`.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    advanced.push(name)
  }
  return [...declared, ...advanced]
}

/** Objetos compatíveis com a operação de sombra escolhida no bloco consumidor. */
export function collectCanvas3DShadowTargets(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  const kind =
    useBlock?.getFieldValue('KIND') === 'receive' ? 'shadow-receiver3d' : 'shadow-caster3d'
  return collectCanvas3DSymbolNames(useBlock ?? workspace, kind)
}

export function collectRenderers3d(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  return collectCanvas3DSymbolNames(useBlock ?? workspace, 'renderer3d')
}

export function collectCameras3d(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  return collectCanvas3DSymbolNames(useBlock ?? workspace, 'camera3d')
}

export function collectPerspectiveCameras3d(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  return collectCanvas3DSymbolNames(useBlock ?? workspace, 'perspective-camera3d')
}

export function collectPhysicsColliders3d(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  return collectCanvas3DSymbolNames(useBlock ?? workspace, 'physics-collider3d')
}

export function collectPhysicsCities3d(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  return collectCanvas3DSymbolNames(useBlock ?? workspace, 'physics-city3d')
}

export function collectLights3d(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  return collectCanvas3DSymbolNames(useBlock ?? workspace, 'light3d')
}

export function collectComposers3d(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  return collectCanvas3DSymbolNames(useBlock ?? workspace, 'composer3d')
}

export function collectLoaders3d(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  return collectCanvas3DSymbolNames(useBlock ?? workspace, 'loader3d')
}

export function collectPhysicsWorlds(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  return collectCanvas3DSymbolNames(useBlock ?? workspace, 'physics-world')
}

/** Nomes dos grupos simples 3D declarados. */
export function collectGroups3d(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  const target = useBlock ?? workspace
  const context = nameLookupContext(target)
  if (!context.workspace) return []
  return collectVariableDeclarations(
    context.workspace,
    GROUP3D_DECL_BLOCKS,
    new Set(context.useBlock ? variableScopeKeys(context.useBlock) : ['global']),
    context.useBlock,
  )
}

/** Nomes dos enxames 3D declarados. */
export function collectSwarms3d(
  workspace: Blockly.Workspace | null | undefined,
  useBlock?: Blockly.Block | null,
): string[] {
  const target = useBlock ?? workspace
  const context = nameLookupContext(target)
  if (!context.workspace) return []
  return collectVariableDeclarations(
    context.workspace,
    SWARM3D_DECL_BLOCKS,
    new Set(context.useBlock ? variableScopeKeys(context.useBlock) : ['global']),
    context.useBlock,
  )
}

/**
 * TODAS as propriedades nomeadas no programa (fallback global do seletor de
 * propriedade, quando não há classe em contexto): escritas `this.x`/`obj.x` + as
 * chaves de qualquer objeto literal (`sz_val_object`, campos dinâmicos `KEY0..KEYn`).
 */
export function collectPropertyNames(workspace: Blockly.Workspace | null | undefined): string[] {
  if (!workspace) return []
  const ordered = collectDeclaredNames(workspace, PROPERTY_WRITE_BLOCKS)
  const seen = new Set(ordered)
  for (const block of workspace.getAllBlocks(false)) {
    if (block.type !== 'sz_val_object') continue
    for (let i = 0; block.getField(`KEY${i}`); i += 1) {
      const name = block.getFieldValue(`KEY${i}`)
      if (name && !seen.has(name)) {
        seen.add(name)
        ordered.push(name)
      }
    }
  }
  return ordered
}

/** Um scanner por tipo simples sobre o workspace (o pop-up abre no clique — O(N) basta). */
function workspaceScanner(ws: Blockly.Workspace | null | undefined): BlockScanner {
  return (type) => ws?.getBlocksByType(type, false) ?? []
}

/** O nome de variável lido por um reporter `sz_val_variable` (senão `''`). */
function variableNameOf(block: Blockly.Block | null | undefined): string {
  return block?.type === 'sz_val_variable' ? (block.getFieldValue('NAME') ?? '') : ''
}

/**
 * A classe em contexto para um seletor de propriedade/método, pela FORMA do bloco:
 *  - campo `OBJ` (nome de instância) → classe via `criar OBJ = novo Classe`;
 *  - tomada `OBJ` com um reporter de variável → idem pelo nome da variável;
 *  - sem `OBJ` ("minha propriedade") → a classe que ENVOLVE o bloco.
 * `null` quando não dá para resolver (o chamador cai na lista global).
 */
function resolveContextClass(
  block: Blockly.Block | null | undefined,
  scan: BlockScanner,
): Blockly.Block | null {
  if (!block) return null
  if (block.getField('OBJ')) {
    return classOfInstance(scan, block.getFieldValue('OBJ') ?? '')
  }
  if (block.getInput('OBJ')) {
    const varName = variableNameOf(block.getInputTargetBlock('OBJ'))
    return varName ? classOfInstance(scan, varName) : null
  }
  return enclosingClass(block)
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
    return new FieldNamePicker(`${options.text ?? ''}`, coerceKind(options.kind))
  }

  protected override getText_(): string | null {
    if (this.kind === 'optional-function' && !this.getValue()) return 'terreno plano'
    return super.getText_()
  }

  /** Nomes GLOBAIS a oferecer neste seletor, conforme o `kind` (+ contexto de classe). */
  private collectGlobals(
    block: Blockly.Block | null | undefined,
    ws: Blockly.Workspace | null,
  ): string[] {
    switch (this.kind) {
      case 'variable':
        return collectReadableVariables(block)
      case 'mutable-variable':
        return collectMutableVariables(block)
      case 'group':
        return collectGroupsAndLists(block)
      case 'enemytype':
        return collectEnemyTypes(ws)
      case 'shape':
        return collectShapes(ws)
      case 'class':
        return collectClassNames(block)
      case 'function':
      case 'optional-function':
        return collectFunctionNames(block)
      case 'canvas':
        return collectCanvasIds(ws)
      case 'canvas3d-canvas':
        return collectCanvasIds(ws)
      case 'canvas-context':
        return collectVisibleVariables(block, CANVAS_CONTEXT_DECL_BLOCKS)
      case 'form-control':
        return collectFormControlIds(ws)
      case 'dom-target': {
        const targetKind = block?.getFieldValue('TARGET_KIND')
        if (targetKind === 'var') return collectReadableVariables(block)
        if (targetKind === 'id') return collectDomElementIds(ws)
        if (targetKind === 'document' || targetKind === 'window') return [targetKind]
        const seen = new Set<string>()
        return [...collectDomElementIds(ws), ...collectReadableVariables(block)].filter((name) => {
          if (seen.has(name)) return false
          seen.add(name)
          return true
        })
      }
      case 'selector':
        return collectCSSSelectors(ws)
      case 'svg-reference':
        return collectSVGReferences(ws, block)
      case 'font':
        return collectCSSFonts(ws)
      case 'animation':
        return collectCSSAnimations(ws)
      case 'spritesheet':
        return collectSpritesheets(ws)
      case 'tilemap':
        return collectTilemaps(ws)
      case 'scene3d':
        return collectScenes3d(ws, block)
      case 'g3d-world':
        return collectGame3DWorlds(ws, block)
      case 'renderer3d':
        return collectRenderers3d(ws, block)
      case 'camera3d':
        return collectCameras3d(ws, block)
      case 'perspective-camera3d':
        return collectPerspectiveCameras3d(ws, block)
      case 'light3d':
        return collectLights3d(ws, block)
      case 'composer3d':
        return collectComposers3d(ws, block)
      case 'loader3d':
        return collectLoaders3d(ws, block)
      case 'model-loader3d':
      case 'audio-loader3d':
      case 'water3d':
      case 'grass3d':
      case 'instanced-mesh3d':
      case 'color-target3d':
        return collectCanvas3DSymbolNames(block ?? ws, this.kind)
      case 'physics-collider3d':
        return collectPhysicsColliders3d(ws, block)
      case 'physics-city3d':
        return collectPhysicsCities3d(ws, block)
      case 'shadow-target3d':
        return collectCanvas3DShadowTargets(ws, block)
      case 'physics-world':
        return collectPhysicsWorlds(ws, block)
      case 'object3d':
        return collectObjects3d(ws, block)
      case 'g3d-object':
        return collectGame3DObjects(ws, block)
      case 'group3d':
        return collectGroups3d(ws, block)
      case 'swarm3d':
        return collectSwarms3d(ws, block)
      case 'physics-body':
        return collectCanvas3DPhysicsBodies(ws, block)
      case 'physics-character':
        return collectCanvas3DPhysicsCharacters(ws, block)
      case 'physics-resource':
        return collectCanvas3DPhysicsResources(ws, block)
      case 'character':
        return collectCharacters(ws)
      case 'screen':
        return collectScreens(ws)
      case 'gamestate':
        return collectGameStates(ws)
      case 'mold':
        return collectMolds(ws)
      case 'battler':
        return collectBattlers(ws)
      case 'combatant':
        return collectCombatants(ws)
      case 'enemy-combatant':
        return collectEnemyCombatants(ws)
      case 'effect':
        return collectEffects(ws)
      case 'event':
        return collectEvents(ws)
      case 'look':
        return collectLooks(ws)
      case 'sound':
        return collectSounds(ws)
      case 'region':
        return collectRegions(ws)
      case 'path':
        return collectPaths(ws)
      case 'pkmcreature':
        return collectPkmCreatures(ws)
      case 'pkmtype':
        return collectPkmTypes(ws)
      case 'npc':
        return collectNpcs(ws)
      case 'flag':
        return collectFlags(ws)
      case 'item':
        return collectItems(ws)
      case 'map':
        return collectMaps(ws)
      case 'board':
        return collectBoards(ws)
      case 'stored-value':
        return collectStoredValues(ws)
      case 'combat-move':
        return collectCombatMoves(ws, block)
      case 'fight-move':
        return collectFightMoves(ws, block)
      case 'entity3d':
        return collectEntities3d(ws)
      case 'mold3d':
        return collectMolds3d(ws)
      case 'effect3d':
        return collectEffects3d(ws)
      case 'entitystate':
        return collectEntityStates(ws)
      case 'w3dpoint':
        return collectW3dPoints(ws)
      case 'w3dnpc':
        return collectW3dNpcs(ws)
      case 'w3dquest':
        return collectW3dQuests(ws)
      case 'w3dachieve':
        return collectW3dAchievements(ws)
      case 'super-method': {
        const scan = workspaceScanner(ws)
        return superClassMethodNames(scan, enclosingClass(block))
      }
      case 'property':
      case 'method': {
        const scan = workspaceScanner(ws)
        const cls = resolveContextClass(block, scan)
        if (cls) {
          // Classe em contexto resolvida → SÓ os membros dela (o "preciso").
          return this.kind === 'property'
            ? classPropertyNames(scan, cls)
            : classMethodNames(scan, cls)
        }
        // Sem classe resolvida → lista global de todas as propriedades/métodos.
        return this.kind === 'property' ? collectPropertyNames(ws) : collectMethodNames(ws)
      }
      default:
        return collectVariables(ws)
    }
  }

  protected override showEditor_(): void {
    const block = this.getSourceBlock()
    const ws = block?.workspace ?? null
    const globals = this.collectGlobals(block, ws)
    const globalSet = new Set(globals)
    // Nomes LOCAIS em escopo (dados por um laço que ENVOLVE este campo). Só os kinds
    // com binder de laço têm locais (variável e objeto 3D — ver LOOP_BINDERS_BY_KIND).
    const binders = LOOP_BINDERS_BY_KIND[this.kind]
    const scopedNames =
      this.kind === 'canvas-context'
        ? collectScopedCanvasContexts(block)
        : binders
          ? collectScopedNames(block, binders)
          : []
    const locals = scopedNames.filter((name) => !globalSet.has(name))
    const ui = KIND_UI[this.kind]

    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)

    const wrap = document.createElement('div')
    wrap.className = 'sz-name-picker'
    wrap.tabIndex = -1
    wrap.setAttribute('role', 'group')
    wrap.setAttribute('aria-label', `Escolher ${ui.placeholder}`)
    wrap.style.cssText =
      'padding:8px;width:240px;background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'
    let focusTarget: HTMLElement = wrap

    const hasFlatOption = this.kind === 'optional-function'
    if (globals.length === 0 && locals.length === 0 && !hasFlatOption) {
      const empty = document.createElement('div')
      empty.textContent = ui.empty
      empty.style.cssText =
        'font-size:12px;color:var(--color-sz-fg-soft);padding:2px 2px 8px;line-height:1.4;'
      wrap.appendChild(empty)
    } else {
      const list = document.createElement('div')
      list.className = 'sz-name-picker__list'
      list.style.cssText =
        'display:flex;flex-direction:column;gap:4px;max-height:200px;overflow:auto;'
      // Uma linha selecionável. `loop` = variável local do laço: swatch 🔁 tracejado +
      // marca "no laço" (mesma linguagem visual do seletor de sprite).
      const addRow = (name: string, loop: boolean, visibleName = name): void => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'sz-name-picker__option'
        btn.title = loop ? `${visibleName} — variável deste laço (local)` : visibleName
        const selected = name === this.getValue()
        btn.setAttribute('aria-pressed', selected ? 'true' : 'false')
        btn.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 7px;border:1px solid ${selected ? 'var(--color-sz-accent)' : 'var(--color-sz-border)'};border-radius:6px;background:var(--color-sz-bg);cursor:pointer;text-align:left;`
        const icon = document.createElement('span')
        icon.textContent = loop ? '🔁' : ui.icon
        icon.setAttribute('aria-hidden', 'true')
        icon.style.cssText = loop
          ? 'flex:none;width:22px;height:22px;border-radius:5px;border:1px dashed var(--color-sz-border);display:flex;align-items:center;justify-content:center;font-size:12px;'
          : 'flex:none;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:15px;'
        const label = document.createElement('span')
        label.textContent = visibleName
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
        if (focusTarget === wrap) focusTarget = btn
        list.appendChild(btn)
      }
      if (hasFlatOption) addRow('', false, 'terreno plano')
      for (const name of globals) addRow(name, false)
      for (const name of locals) addRow(name, true)
      wrap.appendChild(list)
    }

    // Consumidores de símbolos devem escolher uma declaração realmente em escopo.
    // Os demais seletores mantêm a entrada livre para criar nomes de domínio.
    if (nameKindAllowsFreeText(this.kind)) {
      const row = document.createElement('div')
      row.style.cssText =
        'display:flex;gap:6px;margin-top:8px;border-top:1px solid var(--color-sz-border);padding-top:8px;align-items:center;'
      const input = document.createElement('input')
      input.type = 'text'
      input.className = 'sz-name-picker__input'
      input.name = `blockly-name-${this.kind}`
      input.autocomplete = 'off'
      input.value = `${this.getValue() ?? ''}`
      input.placeholder = ui.placeholder
      input.setAttribute('aria-label', ui.placeholder)
      input.spellcheck = false
      input.style.cssText =
        'flex:1;min-width:0;padding:3px 6px;border:1px solid var(--color-sz-border);background:var(--color-sz-bg);color:var(--color-sz-fg);border-radius:4px;font-size:12px;font-family:"JetBrains Mono",ui-monospace,monospace;'
      const ok = document.createElement('button')
      ok.type = 'button'
      ok.className = 'sz-name-picker__confirm'
      ok.textContent = 'Usar'
      ok.setAttribute('aria-label', `Usar ${ui.placeholder}`)
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
      focusTarget = input
    }

    content.appendChild(wrap)
    Blockly.DropDownDiv.showPositionedByField(this, () => {})
    // `preventScroll`: focar um input fora da vista rolaria a PÁGINA até ele (no modo
    // aula normal a página rola) — o pop-up "pulava" p/ o vídeo. Não rolar nada.
    setTimeout(() => focusTarget.focus({ preventScroll: true }), 0)
  }
}

let registered = false

/** Registra o campo customizado uma única vez (idempotente). */
export function registerFieldNamePicker(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_name_picker', FieldNamePicker)
  registered = true
}
