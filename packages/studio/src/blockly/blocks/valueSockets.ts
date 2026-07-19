/**
 * Mapa dos slots que são "tomadas de valor" (`input_value` com `check: 'JSValue'`):
 *   tipo do bloco → { nome do input → valor numérico padrão da sombra }
 *
 * É a fonte única usada por:
 *  - `toolbox.ts`: anexa um shadow `sz_val_number` com esse padrão ao arrastar
 *    o bloco da paleta (preserva a UX de digitar um número inline);
 *  - `workspaceState.ts`: ao reconstruir blocos a partir da IR, garante que um
 *    valor `num` vire um shadow editável e que slots vazios tenham padrão.
 */
export const VALUE_SOCKETS: Record<string, Record<string, number>> = {
  sz_canvas_fill_rect: { X: 10, Y: 10, W: 50, H: 50 },
  sz_canvas_arc: { X: 100, Y: 100, R: 20 },
  sz_canvas_fill_text: { X: 10, Y: 30 },
  sz_canvas_translate: { X: 0, Y: 0 },
  sz_canvas_draw_image: { X: 0, Y: 0, W: 100, H: 100 },
  sz_canvas_set_size: { W: 400, H: 300 },
  sz_canvas_rotate: { ANGLE: 0 },
  sz_canvas_scale: { SX: 1, SY: 1 },
  sz_canvas_gradient: { X0: 0, Y0: 0, X1: 200, Y1: 0 },
  sz_val_random: { MIN: 0, MAX: 100 },
  // Cor HSL: matiz (0–360) + saturação/luminosidade em % (0–100).
  sz_val_color_hsl: { H: 0, S: 50, L: 50 },
  // Comparação e lógica (condições): os dois lados são tomadas de valor.
  sz_val_compare: { LEFT: 0, RIGHT: 0 },
  sz_val_logic: { LEFT: 0, RIGHT: 0 },
  // Ternário: os dois ramos vêm como número editável (a condição é sombra de
  // comparação, definida em CUSTOM_SOCKETS).
  sz_val_ternary: { TRUE_VAL: 0, FALSE_VAL: 0 },
  sz_js_set_this_prop: { VALUE: 0 },
  sz_js_set_prop: { VALUE: 0 },
  // Objetos: o valor escrito numa propriedade (o objeto vai num shadow de variável).
  sz_js_member_set: { VALUE: 0 },
  sz_js_return: { VALUE: 0 },
  // Criar variável/constante e alterar variável: o valor agora é uma tomada.
  sz_js_var_create: { VALUE: 0 },
  sz_js_const_create: { VALUE: 0 },
  sz_js_var_assign: { VALUE: 1 },
  // Blocos de Matemática.
  sz_math_arithmetic: { A: 0, B: 0 },
  sz_math_function: { VALUE: 0 },
  sz_math_minmax: { A: 0, B: 0 },
  sz_math_trig: { VALUE: 0 },
  sz_math_atan2: { A: 0, B: 0 },
  sz_math_hypot: { A: 0, B: 0 },
  sz_math_angle_convert: { VALUE: 0 },
  // Vetores.
  sz_val_vector2d: { X: 0, Y: 0 },
  sz_val_vector3d: { X: 0, Y: 0, Z: 0 },
  // Listas.
  sz_js_array_push: { VALUE: 0 },
  sz_js_array_splice: { COUNT: 1, START: 0 },
  // Tempo.
  sz_js_set_timeout: { MS: 1000 },
  sz_js_set_interval: { MS: 1000 },
  // DOM dinâmico.
  sz_js_set_dataset: { VALUE: 0 },
  sz_js_set_property: { VALUE: 0 },
  // Item da lista por índice.
  sz_val_array_index: { INDEX: 0 },
  // For clássico (contar de/até/passo).
  sz_js_for_range: { FROM: 0, TO: 10, STEP: 1 },
  sz_js_repeat: { TIMES: 5 },
  // Armazenamento do navegador: o valor a guardar é uma tomada.
  sz_js_storage_set: { VALUE: 0 },
  // Canvas 3D — facilitadores do three.js (rótulo amigável sobre memberCall/
  // memberSet genérico; ver blocks/canvas3d.ts). Os defaults espelham o idioma
  // comum: escala nasce em 1 (tamanho normal), giro por quadro em 0.01, tela 800×600.
  sz_t3d_set_position: { X: 0, Y: 0, Z: 0 },
  sz_t3d_set_rotation: { X: 0, Y: 0, Z: 0 },
  sz_t3d_rotate_axis: { DELTA: 0.01 },
  sz_t3d_set_scale: { X: 1, Y: 1, Z: 1 },
  sz_t3d_look_at: { X: 0, Y: 0, Z: 0 },
  sz_t3d_lerp_position: { ALPHA: 0.1 },
  sz_t3d_set_intensity: { N: 1 },
  sz_t3d_set_fog: { NEAR: 10, FAR: 100 },
  sz_t3d_set_matrix_at: { I: 0 },
  sz_t3d_renderer_size: { W: 800, H: 600 },
  // Macro Brilho (bloom): força/espalhar/limiar do UnrealBloomPass (defaults do three).
  sz_t3d_bloom_setup: { STRENGTH: 1.5, RADIUS: 0.4, THRESHOLD: 0.85 },
  // Macro Partículas: quantidade de pontos, tamanho de cada e o quão longe espalham.
  sz_t3d_particles: { COUNT: 500, SIZE: 0.1, SPREAD: 20 },
  // Macro Água: o tamanho do plano d'água.
  sz_t3d_water: { SIZE: 2000 },
  // Macro Grama: nº de folhas, altura de cada e o tamanho do campo.
  sz_t3d_grass: { COUNT: 5000, SIZE: 1, SPREAD: 50 },
  // Macro Letreiro: a largura do plano do letreiro (a altura é metade).
  sz_t3d_sign: { SIZE: 4 },
  // Mundo procedural com primitivas — defaults leves o bastante para celular.
  sz_t3d_primitive: { W: 1, H: 1, D: 1 },
  sz_t3d_terrain: { SIZE: 160, SEGMENTS: 48, HILLS: 4, SMOOTH: 18 },
  sz_t3d_road: { X1: -20, Z1: 0, X2: 20, Z2: 0, WIDTH: 6 },
  sz_t3d_building: { X: 0, Z: 0, W: 8, H: 10, D: 8 },
  // Física própria: 3 subpassos protegem contra frames lentos sem espiral de CPU.
  sz_t3d_physics_setup: { GRAVITY: -22, SUBSTEPS: 3 },
  sz_t3d_physics_static_box: { X: 0, Y: 1, Z: 0, W: 2, H: 2, D: 2 },
  sz_t3d_physics_body: { W: 1, H: 2, D: 1, FRICTION: 0.82, BOUNCE: 0 },
  sz_t3d_physics_move: { X: 0, Z: 0, SPEED: 6 },
  sz_t3d_physics_jump: { SPEED: 7 },
  sz_t3d_physics_trigger: { X: 0, Y: 1, Z: 0, W: 6, H: 2, D: 6 },
  sz_t3d_physics_step: { DT: 0.0166667 },
}

/**
 * Slots de valor que aceitam COR: tipo do bloco → { nome do input → cor padrão }.
 * A sombra é `sz_val_color` (seletor inline), substituível por uma variável/valor.
 */
export const COLOR_SOCKETS: Record<string, Record<string, string>> = {
  sz_canvas_fill_style: { COLOR: '#22d3ee' },
  // Os outros dois blocos com slot COLOR também pré-enchem um seletor de cor (senão
  // o slot vinha VAZIO da paleta, sem o chip clicável do fill_style). O default
  // espelha o fallback do buildIR (#000000) p/ o round-trip ficar idêntico quando
  // o aluno não mexe na cor.
  sz_canvas_stroke_style: { COLOR: '#000000' },
  sz_canvas_shadow: { COLOR: '#000000' },
  // Canvas 3D: cor de um material e cor de fundo da cena.
  sz_t3d_set_color: { COLOR: '#ff8844' },
  sz_t3d_set_background: { COLOR: '#101830' },
  sz_t3d_set_fog: { COLOR: '#aabbcc' },
  // Macro Partículas: cor dos pontinhos (branco = estrelas/poeira).
  sz_t3d_particles: { COLOR: '#ffffff' },
  // Macro Água: a cor da água (azul-esverdeado profundo).
  sz_t3d_water: { COLOR: '#0a3d5c' },
  // Macro Grama: o verde da grama.
  sz_t3d_grass: { COLOR: '#4a7c2a' },
  // Macro Letreiro: a cor das letras (branco = destaca em qualquer céu).
  sz_t3d_sign: { COLOR: '#ffffff' },
  sz_t3d_primitive: { COLOR: '#38bdf8' },
  sz_t3d_terrain: { COLOR: '#65a30d' },
  sz_t3d_road: { COLOR: '#334155' },
  sz_t3d_building: { COLOR: '#f59e0b', ROOF: '#b91c1c' },
}

/**
 * Slots de valor que aceitam TEXTO exibido ao usuário: tipo do bloco →
 * { nome do input → texto padrão }. A sombra é `sz_val_text` (campo editável
 * inline), substituível por variável/"juntar texto"/função.
 */
export const TEXT_SOCKETS: Record<string, Record<string, string>> = {
  sz_canvas_fill_text: { TEXT: 'Olá' },
}

interface CompareSeed {
  type: 'sz_val_compare'
  fields: { OP: string }
  inputs: { LEFT: SocketShadow; RIGHT: SocketShadow }
}

/** Sombra de um slot de valor: número/texto editável, seletor de cor, ou comparação. */
export type SocketShadow =
  | { shadow: { type: 'sz_val_number'; fields: { NUM: number } } }
  | { shadow: { type: 'sz_val_text'; fields: { TEXT: string } } }
  | { shadow: { type: 'sz_val_color'; fields: { COLOR: string } } }
  | { shadow: CompareSeed }
  // Comparação como bloco REAL (não sombra): usada nas CONDIÇÕES (Se/enquanto/…).
  // Um bloco de valor real NÃO pode ser encaixado dentro de um input de SOMBRA
  // (Blockly proíbe), então uma comparação-sombra travava os operandos LEFT/RIGHT.
  // Como bloco real, os operandos (sombras) voltam a ser substituíveis um a um.
  | { block: CompareSeed }
  | { shadow: { type: 'sz_val_variable'; fields: { NAME: string } } }

/**
 * Sombras dos slots que NÃO são número/cor (condições, etc.): tipo do bloco →
 * { input → sombra }. Mantido separado de `VALUE_SOCKETS`/`COLOR_SOCKETS` porque
 * a sombra é um bloco composto (ex.: o "Se" já vem com uma comparação `x > 0`).
 */
/** Sombra padrão de um soquete de OBJETO: variável editável chamada "objeto". */
const OBJ_VAR_SHADOW: SocketShadow = {
  shadow: { type: 'sz_val_variable', fields: { NAME: 'objeto' } },
}

const CUSTOM_SOCKETS: Record<string, Record<string, SocketShadow>> = {
  // "parar animação": o id vem de uma variável "animId" por padrão (a mesma que
  // o bloco "A cada frame fazer" sugere ao guardar o id).
  sz_canvas_cancel_anim: {
    HANDLE: { shadow: { type: 'sz_val_variable', fields: { NAME: 'animId' } } },
  },
  // Objetos: a tomada OBJ vem com uma variável "objeto" por padrão (substituível
  // por "minha propriedade", outro objeto, etc.).
  sz_val_member_get: { OBJ: OBJ_VAR_SHADOW },
  sz_js_member_set: { OBJ: OBJ_VAR_SHADOW },
  sz_val_method_on: { OBJ: OBJ_VAR_SHADOW },
  sz_js_method_on: { OBJ: OBJ_VAR_SHADOW },
  // Canvas 3D "adicionar %1 em cena": o objeto a adicionar vem como uma variável
  // por padrão (substituível por "novo THREE.Mesh(…)" ou qualquer valor).
  sz_t3d_add_to: { OBJ: OBJ_VAR_SHADOW },
  // Canvas 3D "mover devagar até %1": o alvo é um Vector3 numa variável "alvo"
  // por padrão (substituível por "novo THREE.Vector3(…)" ou membro de outro obj).
  sz_t3d_lerp_position: {
    TARGET: { shadow: { type: 'sz_val_variable', fields: { NAME: 'alvo' } } },
  },
  // Distância: os dois objetos vêm como variáveis "player" e "enemy" por padrão.
  sz_val_distance: {
    OBJ1: { shadow: { type: 'sz_val_variable', fields: { NAME: 'player' } } },
    OBJ2: { shadow: { type: 'sz_val_variable', fields: { NAME: 'enemy' } } },
  },
  sz_js_if_else: {
    COND: {
      block: {
        type: 'sz_val_compare',
        fields: { OP: '>' },
        inputs: {
          LEFT: { shadow: { type: 'sz_val_variable', fields: { NAME: 'x' } } },
          RIGHT: { shadow: { type: 'sz_val_number', fields: { NUM: 0 } } },
        },
      },
    },
  },
  // while / do-while: a condição já vem como uma comparação `x > 0` (igual ao "Se").
  sz_js_while: {
    COND: {
      block: {
        type: 'sz_val_compare',
        fields: { OP: '>' },
        inputs: {
          LEFT: { shadow: { type: 'sz_val_variable', fields: { NAME: 'x' } } },
          RIGHT: { shadow: { type: 'sz_val_number', fields: { NUM: 0 } } },
        },
      },
    },
  },
  sz_js_do_while: {
    COND: {
      block: {
        type: 'sz_val_compare',
        fields: { OP: '>' },
        inputs: {
          LEFT: { shadow: { type: 'sz_val_variable', fields: { NAME: 'x' } } },
          RIGHT: { shadow: { type: 'sz_val_number', fields: { NUM: 0 } } },
        },
      },
    },
  },
  // Ternário: a condição já vem como uma comparação `x > 0` (igual ao "Se").
  sz_val_ternary: {
    COND: {
      block: {
        type: 'sz_val_compare',
        fields: { OP: '>' },
        inputs: {
          LEFT: { shadow: { type: 'sz_val_variable', fields: { NAME: 'x' } } },
          RIGHT: { shadow: { type: 'sz_val_number', fields: { NUM: 0 } } },
        },
      },
    },
  },
}

/**
 * Monta o mapa de sombras (`inputs`) de um bloco a partir de `VALUE_SOCKETS`,
 * `COLOR_SOCKETS` e `CUSTOM_SOCKETS`. Fonte única usada por `toolbox.ts` e
 * `paramsFlyout.ts` para o bloco já vir "preenchido" ao ser arrastado da paleta.
 * Devolve `undefined` se o bloco não tiver nenhum slot de valor.
 */
export function socketInputsFor(type: string): Record<string, SocketShadow> | undefined {
  const numeric = VALUE_SOCKETS[type]
  const colors = COLOR_SOCKETS[type]
  const texts = TEXT_SOCKETS[type]
  const custom = CUSTOM_SOCKETS[type]
  if (!numeric && !colors && !texts && !custom) return undefined
  const inputs: Record<string, SocketShadow> = {}
  for (const [name, value] of Object.entries(numeric ?? {})) {
    inputs[name] = { shadow: { type: 'sz_val_number', fields: { NUM: value } } }
  }
  for (const [name, colour] of Object.entries(colors ?? {})) {
    inputs[name] = { shadow: { type: 'sz_val_color', fields: { COLOR: colour } } }
  }
  for (const [name, text] of Object.entries(texts ?? {})) {
    inputs[name] = { shadow: { type: 'sz_val_text', fields: { TEXT: text } } }
  }
  for (const [name, shadow] of Object.entries(custom ?? {})) {
    inputs[name] = shadow
  }
  return inputs
}
