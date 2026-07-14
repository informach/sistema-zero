import * as Blockly from 'blockly/core'
import {
  type BlockScanner,
  classMethodNames,
  classOfInstance,
  classPropertyNames,
  enclosingClass,
} from '../blocks/classIntrospection'

/**
 * Campo Blockly de NOME: mostra o NOME (string) e, ao clicar, abre um DropDownDiv com
 * a lista dos itens JÁ CRIADOS no programa para a criança escolher — sem precisar
 * redigitar a grafia igualzinha em cada bloco (à la Scratch/MakeCode). "Sabores" pelo
 * `kind`:
 *  - `variable` → variáveis simples (blocos que criam/declaram uma variável);
 *  - `group`    → grupos de sprites (Jogo 2D) E listas do núcleo (variáveis que
 *                 guardam uma lista `sz_val_array`) — "grupo ≡ lista";
 *  - `class`    → nomes de classe (`sz_js_class`);
 *  - `function` → nomes de função (`sz_js_function`);
 *  - `property` → propriedades de classe, ESCOPADAS pela classe em contexto (a que
 *                 envolve o bloco, ou a do objeto no campo/tomada `OBJ`); cai na lista
 *                 global de propriedades quando não dá para resolver a classe;
 *  - `method`   → métodos de classe, mesma lógica de escopo do `property`;
 *  - `canvas`   → id de uma tela de desenho (`sz_html_canvas`);
 *  - `spritesheet` → folha de quadros do Jogo 2D (`sz_g2d_load_spritesheet`);
 *  - `tilemap`  → mapa de tiles do Jogo 2D (`sz_g2d_create_tilemap`);
 *  - `scene3d`  → cena/mundo do Jogo 3D (blocos `criar cena…`);
 *  - `object3d` → objeto/malha do Jogo 3D (caixa/bola/modelo…); tem locais de laço
 *                 (o "item" do "para cada no enxame");
 *  - `group3d`  → grupo/enxame do Jogo 3D (`criar grupo`/`criar enxame`).
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
export type NameKind =
  | 'variable'
  | 'group'
  | 'class'
  | 'function'
  | 'property'
  | 'method'
  | 'canvas'
  | 'spritesheet'
  | 'tilemap'
  | 'enemytype'
  | 'shape'
  | 'scene3d'
  | 'object3d'
  | 'group3d'
  | 'character'
  | 'screen'
  | 'gamestate'
  | 'mold'
  | 'effect'
  | 'event'
  | 'look'
  | 'sound'
  | 'npc'
  | 'flag'
  | 'item'
  | 'map'

const NAME_KINDS: readonly NameKind[] = [
  'variable',
  'group',
  'class',
  'function',
  'property',
  'method',
  'canvas',
  'spritesheet',
  'tilemap',
  'enemytype',
  'shape',
  'scene3d',
  'object3d',
  'group3d',
  'character',
  'screen',
  'gamestate',
  'mold',
  'effect',
  'event',
  'look',
  'sound',
  'npc',
  'flag',
  'item',
  'map',
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
  // OOP: `criar pessoa = novo Pessoa` guarda a instância numa variável — os campos
  // OBJ que a referenciam (chamar método, definir/ler propriedade) ganham o seletor.
  sz_js_new_var: ['VARNAME'],
  // Canvas: "Pegar canvas … e guardar contexto em CTX" — o ctx é uma variável e os
  // ~40 blocos de desenho que o consomem (campo CTX) ganham o seletor.
  sz_canvas_setup: ['CTX'],
}

/** Blocos que DECLARAM uma classe / uma função (fonte das listas de classe/função). */
const CLASS_DECL_BLOCKS: Record<string, string[]> = { sz_js_class: ['NAME'] }
const FUNCTION_DECL_BLOCKS: Record<string, string[]> = { sz_js_function: ['NAME'] }
/** Telas de desenho declaradas (`sz_html_canvas` id) — fonte do seletor de canvas. */
const CANVAS_DECL_BLOCKS: Record<string, string[]> = { sz_html_canvas: ['ID'] }
/** Folhas de quadros / mapas de tiles do Jogo 2D (fonte dos seletores SHEET/MAP). */
const SPRITESHEET_DECL_BLOCKS: Record<string, string[]> = { sz_g2d_load_spritesheet: ['NAME'] }
const TILEMAP_DECL_BLOCKS: Record<string, string[]> = {
  sz_g2d_create_tilemap: ['NAME'],
  sz_g2d_create_tilemap_from_asset: ['NAME'],
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
/** O "item" do "para cada vivo do molde" é um personagem LOCAL (escopo por ancestral). */
const CHARACTER_LOOP_BINDERS: Record<string, string[]> = { sz_gk_for_each_active: ['ITEM'] }

/**
 * Telas do Jogo 2D Avançado: as 5 PRONTAS (sempre existem no runtime) + as que a
 * criança criou com "Criar a tela". A semente vem primeiro — são as telas que o
 * kit garante mesmo sem nenhum bloco de criação.
 */
const GK_BUILTIN_SCREENS = ['menu', 'pausa', 'carregando', 'fim', 'vitoria'] as const
const SCREEN_DECL_BLOCKS: Record<string, string[]> = { sz_gk_create_screen: ['NAME'] }
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
  sz_gk_set_state: ['STATE'],
  sz_gk_on_enter_state: ['STATE'],
  sz_gk_state_is: ['STATE'],
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
const SOUND_DECL_BLOCKS: Record<string, string[]> = { sz_gk_load_sound: ['NAME'] }
function collectSounds(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, SOUND_DECL_BLOCKS)
}

/**
 * Avisos do event bus: "existem por USO" — tanto quem AVISA (emit) quanto quem
 * OUVE (quando chegar o aviso) são a fonte da lista. Sem builtins; o fallback de
 * texto cobre o primeiro uso.
 */
const EVENT_DECL_BLOCKS: Record<string, string[]> = {
  sz_gk_on_event: ['NAME'],
  sz_gk_emit: ['NAME'],
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
const ITEM_DECL_BLOCKS: Record<string, string[]> = { sz_gk_rpg_give_item: ['NAME'] }
function collectItems(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, ITEM_DECL_BLOCKS)
}
/** Mapas: quem DECLARA é o "Quando chegar no mapa" (go_map/porta consomem). */
const MAP_DECL_BLOCKS: Record<string, string[]> = { sz_gk_rpg_on_map: ['MAP'] }
function collectMaps(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, MAP_DECL_BLOCKS)
}

/** Cenas/mundos do Jogo 3D (fonte do seletor WORLD). */
const SCENE3D_DECL_BLOCKS: Record<string, string[]> = {
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
/** O "item" do "para cada no enxame" é um nome LOCAL de objeto 3D (escopo por ancestral). */
const OBJECT3D_LOOP_BINDERS: Record<string, string[]> = { sz_g3d_for_each_swarm: ['ITEM'] }
/** Grupos/enxames do Jogo 3D (fonte dos seletores GROUP/SWARM). */
const GROUP3D_DECL_BLOCKS: Record<string, string[]> = {
  sz_g3d_create_group: ['NAME'],
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
const VARIABLE_LOOP_BINDERS: Record<string, string[]> = {
  sz_js_for_range: ['VAR'],
  sz_js_for_of: ['ITEM'],
  sz_js_for_each: ['ITEM', 'INDEX'],
  sz_js_try_catch: ['ERR'],
  sz_val_array_map: ['ITEM'],
  sz_val_array_find: ['ITEM'],
  // Ganchos do Jogo 2D Avançado: o tempo (dt), o pincel (ctx) e a posição do
  // clique (px/py) são nomes LOCAIS dos corpos dos ganchos.
  sz_gk_on_update: ['DT'],
  sz_gk_on_draw: ['PARAM'],
  sz_gk_on_draw_hud: ['PARAM'],
  sz_gk_on_game_click: ['PX', 'PY'],
  sz_gk_define_look: ['CTX'],
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
  canvas: {
    icon: '🖼️',
    placeholder: 'id da tela de desenho',
    empty:
      'Nenhuma tela de desenho ainda — crie uma ("Criar tela de desenho") ou digite o id abaixo.',
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
    placeholder: 'nome da cena / mundo',
    empty: 'Nenhuma cena 3D ainda — crie uma ("Criar cena/mundo…") ou digite o nome abaixo.',
  },
  object3d: {
    icon: '🧊',
    placeholder: 'nome do objeto 3D',
    empty: 'Nenhum objeto 3D ainda — crie um (caixa/bola/modelo…) ou digite o nome abaixo.',
  },
  group3d: {
    icon: '👾',
    placeholder: 'nome do grupo / enxame',
    empty:
      'Nenhum grupo ou enxame 3D ainda — crie um ("Criar grupo/enxame") ou digite o nome abaixo.',
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
    empty: 'Nenhum mapa ainda — crie um ("Quando chegar no mapa") ou digite o nome abaixo.',
  },
}

/** Laços que introduzem nomes LOCAIS, por `kind` de seletor (escopo por ancestral). */
const LOOP_BINDERS_BY_KIND: Partial<Record<NameKind, Record<string, string[]>>> = {
  variable: VARIABLE_LOOP_BINDERS,
  object3d: OBJECT3D_LOOP_BINDERS,
  character: CHARACTER_LOOP_BINDERS,
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
 * Nomes LOCAIS em escopo no ponto do campo: sobe pelos blocos que ENVOLVEM o bloco do
 * campo (`getSurroundParent`) e coleta os nomes dados pelos laços do registro `binders`
 * (o "i" do contar, o "item" do para-cada / do enxame…). Só aparecem dentro do laço
 * que os declara.
 */
function collectScopedNames(
  block: Blockly.Block | null | undefined,
  binders: Record<string, string[]>,
): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  let cur = block?.getSurroundParent() ?? null
  while (cur) {
    const fields = binders[cur.type]
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

/** Nomes de variável LOCAIS (o "i" do contar, o "item" do para-cada…) em escopo. */
export function collectScopedVariableNames(block: Blockly.Block | null | undefined): string[] {
  return collectScopedNames(block, VARIABLE_LOOP_BINDERS)
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

/** Nomes de classe (`sz_js_class`) declarados no workspace, na ordem, sem repetir. */
export function collectClassNames(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, CLASS_DECL_BLOCKS)
}

/** Nomes de função (`sz_js_function`) declarados no workspace, na ordem, sem repetir. */
export function collectFunctionNames(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, FUNCTION_DECL_BLOCKS)
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

/** Nomes das cenas/mundos 3D declarados. */
export function collectScenes3d(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, SCENE3D_DECL_BLOCKS)
}

/** Nomes dos objetos/malhas 3D declarados. */
export function collectObjects3d(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, OBJECT3D_DECL_BLOCKS)
}

/** Nomes dos grupos/enxames 3D declarados. */
export function collectGroups3d(workspace: Blockly.Workspace | null | undefined): string[] {
  return collectDeclaredNames(workspace, GROUP3D_DECL_BLOCKS)
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

  /** Nomes GLOBAIS a oferecer neste seletor, conforme o `kind` (+ contexto de classe). */
  private collectGlobals(
    block: Blockly.Block | null | undefined,
    ws: Blockly.Workspace | null,
  ): string[] {
    switch (this.kind) {
      case 'group':
        return collectGroupsAndLists(ws)
      case 'enemytype':
        return collectEnemyTypes(ws)
      case 'shape':
        return collectShapes(ws)
      case 'class':
        return collectClassNames(ws)
      case 'function':
        return collectFunctionNames(ws)
      case 'canvas':
        return collectCanvasIds(ws)
      case 'spritesheet':
        return collectSpritesheets(ws)
      case 'tilemap':
        return collectTilemaps(ws)
      case 'scene3d':
        return collectScenes3d(ws)
      case 'object3d':
        return collectObjects3d(ws)
      case 'group3d':
        return collectGroups3d(ws)
      case 'character':
        return collectCharacters(ws)
      case 'screen':
        return collectScreens(ws)
      case 'gamestate':
        return collectGameStates(ws)
      case 'mold':
        return collectMolds(ws)
      case 'effect':
        return collectEffects(ws)
      case 'event':
        return collectEvents(ws)
      case 'look':
        return collectLooks(ws)
      case 'sound':
        return collectSounds(ws)
      case 'npc':
        return collectNpcs(ws)
      case 'flag':
        return collectFlags(ws)
      case 'item':
        return collectItems(ws)
      case 'map':
        return collectMaps(ws)
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
    const locals = binders
      ? collectScopedNames(block, binders).filter((n) => !globalSet.has(n))
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
    // `preventScroll`: focar um input fora da vista rolaria a PÁGINA até ele (no modo
    // aula normal a página rola) — o pop-up "pulava" p/ o vídeo. Não rolar nada.
    setTimeout(() => input.focus({ preventScroll: true }), 0)
  }
}

let registered = false

/** Registra o campo customizado uma única vez (idempotente). */
export function registerFieldNamePicker(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_name_picker', FieldNamePicker)
  registered = true
}
