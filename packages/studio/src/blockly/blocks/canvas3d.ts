import { categoryShades } from '../colorShades'
import { CATEGORY_COLORS } from '../theme'
import type { BlockDefinition } from './types'

/**
 * Canvas 3D — categoria NÚCLEO que ensina three.js CRU (não é extensão). O aluno
 * monta a cena com os construtores reais da biblioteca (`new THREE.Scene()`,
 * `new THREE.Mesh(...)`) e vê o código idêntico no modo Ponte/Monaco. Diferente
 * das extensões Jogo 3D (que achatam o three atrás de uma facade), aqui é a lib
 * de verdade — o objetivo é aprender a programar do jeito real.
 *
 * DOIS tipos de bloco convivem:
 *  1. BASE (`sz_t3d_import`/`sz_t3d_new_var`/`sz_t3d_new`) — o import + o `new` com
 *     namespace. Têm IR própria (`importStar`/`newInstance`/`newExpr` com namespace).
 *  2. FACILITADORES (`sz_t3d_set_position`, `sz_t3d_rotate_axis`, `sz_t3d_render`…) —
 *     um rótulo amigável sobre os idiomas mais comuns, para o aluno NÃO ter que
 *     digitar "position", "rotation", ".set" na mão. Eles NÃO têm IR própria:
 *     `buildIR.ts` os compila para a MESMA IR genérica (`memberCall`/`memberSet`/
 *     `newExpr`) que os blocos manuais — então o código gerado é o three.js real e
 *     idêntico. O round-trip de volta (código→bloco amigável) vive só no
 *     `workspaceState.ts` (uma camada de RECONHECIMENTO das formas canônicas),
 *     ativa apenas quando o projeto importa three (senão `Set.add`/`Map.set` de um
 *     projeto 2D não viraria bloco 3D). Zero mexida em schema/parser.
 *
 * Presença de qualquer bloco `sz_t3d_*` dispara o import automático do three.js no
 * preview (ver `preview/coreImports.ts`). Prefixo de tipo `sz_t3d_`, todos AVANÇADO.
 * Os sockets numéricos/de-cor têm sombra-default em `valueSockets.ts` e round-trip
 * de sombra via `migrateValueFields.ts` (LEGACY_VALUE_FIELDS).
 */
const C = CATEGORY_COLORS.canvas3d

export const CANVAS3D_BLOCKS: BlockDefinition[] = [
  // ───────────────────────── 🧊 Biblioteca 3D (base) ─────────────────────────
  {
    // O bloco-raiz: a criança põe primeiro. Sua presença liga o importmap do
    // three.js no preview. `NAME` é o apelido da biblioteca (padrão THREE) — o
    // mesmo nome que aparece nos construtores (`new THREE.Scene()`).
    type: 'sz_t3d_import',
    message0: 'usar a biblioteca 3D (three.js) como %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'THREE' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Traz a biblioteca three.js para o projeto sob um nome (padrão THREE). Vira "import * as THREE from \'three\'" no topo do código. Ponha este bloco primeiro — todos os "novo THREE.…" usam este nome.',
  },
  {
    // Statement: `const cena = new THREE.Scene(args)`. NS = o nome da lib (THREE),
    // CLASS = o construtor real do three.js (Scene, Mesh, PerspectiveCamera…).
    // O args-mutator (+/−) adiciona as tomadas de argumento.
    type: 'sz_t3d_new_var',
    message0: 'criar %1 = novo %2 . %3',
    args0: [
      { type: 'field_input', name: 'VARNAME', text: 'cena' },
      { type: 'field_input', name: 'NS', text: 'THREE' },
      { type: 'field_input', name: 'CLASS', text: 'Scene' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    mutator: 'sz_args_mutator',
    tooltip:
      'Cria um objeto do three.js e guarda numa variável. Escreva a classe REAL da biblioteca (Scene, PerspectiveCamera, Mesh, SphereGeometry, MeshStandardMaterial, DirectionalLight, Vector3, Color…). Use + para passar argumentos. Vira "const cena = new THREE.Scene(…)".',
  },
  {
    // Valor: `new THREE.Vector3(1,2,3)` numa tomada (argumento de método, etc.).
    type: 'sz_t3d_new',
    message0: 'novo %1 . %2',
    args0: [
      { type: 'field_input', name: 'NS', text: 'THREE' },
      { type: 'field_input', name: 'CLASS', text: 'Vector3' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    mutator: 'sz_args_mutator',
    tooltip:
      'Cria um objeto do three.js para usar direto numa tomada de valor (ex.: argumento de "adicionar" ou de um método). Vira "new THREE.Vector3(…)".',
  },
  {
    // Import nomeado de um addon: `import { GLTFLoader } from 'three/addons/…'`.
    type: 'sz_t3d_import_named',
    message0: 'usar %1',
    args0: [{ type: 'field_input', name: 'NAMES', text: 'GLTFLoader' }],
    message1: 'da biblioteca %1',
    args1: [{ type: 'field_input', name: 'MODULE', text: 'three/addons/loaders/GLTFLoader.js' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Traz uma ferramenta extra da biblioteca 3D (ex.: o carregador de modelos GLTFLoader) para o projeto. Vira "import { GLTFLoader } from \'three/addons/…\'". Separe vários nomes por vírgula.',
  },

  // ───────────────────────── 🎯 Transformar (Object3D) ────────────────────────
  {
    // `obj.position.set(x, y, z)`
    type: 'sz_t3d_set_position',
    message0: 'posição de %1 → x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'variable' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Coloca o objeto (malha, luz, câmera…) num ponto do espaço 3D. Vira "objeto.position.set(x, y, z)".',
  },
  {
    // `obj.rotation.set(x, y, z)` (em radianos)
    type: 'sz_t3d_set_rotation',
    message0: 'rotação de %1 → x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'variable' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Gira o objeto para um ângulo fixo em cada eixo (em radianos). Vira "objeto.rotation.set(x, y, z)".',
  },
  {
    // `obj.rotation.<axis> += delta` — o idioma da animação (girar um pouco por quadro).
    type: 'sz_t3d_rotate_axis',
    message0: 'girar %1 no eixo %2 em %3',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'variable' },
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: [
          ['X', 'x'],
          ['Y', 'y'],
          ['Z', 'z'],
        ],
      },
      { type: 'input_value', name: 'DELTA', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Soma um pouquinho ao giro do objeto num eixo — é o que faz algo girar a cada quadro. Vira "objeto.rotation.y += 0.01".',
  },
  {
    // `obj.scale.set(x, y, z)`
    type: 'sz_t3d_set_scale',
    message0: 'escala de %1 → x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'variable' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Estica ou encolhe o objeto em cada eixo (1 = tamanho normal). Vira "objeto.scale.set(x, y, z)".',
  },
  {
    // `obj.lookAt(x, y, z)`
    type: 'sz_t3d_look_at',
    message0: '%1 olhar para → x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'camera', kind: 'variable' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Vira o objeto (normalmente a câmera) para mirar um ponto do espaço. Vira "camera.lookAt(x, y, z)".',
  },
  {
    // `obj.visible = true/false`
    type: 'sz_t3d_set_visible',
    message0: '%1 %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'variable' },
      {
        type: 'field_dropdown',
        name: 'VAL',
        options: [
          ['aparece', 'true'],
          ['some', 'false'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Mostra ou esconde o objeto na cena. Vira "objeto.visible = true" (ou false).',
  },

  // ───────────────────────── 🎬 Cena e material ───────────────────────────────
  {
    // `target.add(obj)` — pôr um objeto dentro da cena (ou de um grupo).
    type: 'sz_t3d_add_to',
    message0: 'adicionar %1 em %2',
    args0: [
      { type: 'input_value', name: 'OBJ', check: 'JSValue' },
      { type: 'field_name_picker', name: 'TARGET', text: 'cena', kind: 'variable' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Coloca o objeto dentro da cena (ou de um grupo) para ele aparecer. Vira "cena.add(objeto)".',
  },
  {
    // `mat.color.set(cor)` — a cor de um material.
    type: 'sz_t3d_set_color',
    message0: 'cor de %1 → %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'material', kind: 'variable' },
      { type: 'input_value', name: 'COLOR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Muda a cor de um material (ou de uma luz). Vira "material.color.set(\'#ff8844\')".',
  },
  {
    // `scene.background = new THREE.Color(cor)`
    type: 'sz_t3d_set_background',
    message0: 'fundo da cena %1 → cor %2',
    args0: [
      { type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'variable' },
      { type: 'input_value', name: 'COLOR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Pinta o fundo da cena de uma cor. Vira "cena.background = new THREE.Color(\'#101830\')".',
  },

  // ───────────────────────── 💡 Luz e sombra ──────────────────────────────────
  {
    // `obj.castShadow = bool` / `obj.receiveShadow = bool`
    type: 'sz_t3d_set_shadow',
    message0: '%1 %2 sombra: %3',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'variable' },
      {
        type: 'field_dropdown',
        name: 'KIND',
        options: [
          ['projeta', 'cast'],
          ['recebe', 'receive'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'VAL',
        options: [
          ['sim', 'true'],
          ['não', 'false'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Liga a projeção (ou o recebimento) de sombra num objeto. Vira "objeto.castShadow = true" (ou receiveShadow).',
  },
  {
    // `light.intensity = n`
    type: 'sz_t3d_set_intensity',
    message0: 'intensidade da luz %1 → %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'luz', kind: 'variable' },
      { type: 'input_value', name: 'N', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Deixa a luz mais forte ou mais fraca. Vira "luz.intensity = 2".',
  },

  // ───────────────────────── 🖥️ Renderizador ─────────────────────────────────
  {
    // `renderer.setSize(w, h)`
    type: 'sz_t3d_renderer_size',
    message0: 'tamanho do renderizador %1 → largura %2 altura %3',
    args0: [
      { type: 'field_name_picker', name: 'R', text: 'renderizador', kind: 'variable' },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Define o tamanho (em pixels) da imagem 3D desenhada na tela. Vira "renderizador.setSize(800, 600)".',
  },
  {
    // `renderer.shadowMap.enabled = true`
    type: 'sz_t3d_enable_shadows',
    message0: 'ligar sombras no renderizador %1',
    args0: [{ type: 'field_name_picker', name: 'R', text: 'renderizador', kind: 'variable' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Permite que o renderizador desenhe sombras (precisa disso + luz com sombra). Vira "renderizador.shadowMap.enabled = true".',
  },
  {
    // `renderer.render(scene, camera)`
    type: 'sz_t3d_render',
    message0: 'desenhar a cena %1 com a câmera %2 no renderizador %3',
    args0: [
      { type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'variable' },
      { type: 'field_name_picker', name: 'CAMERA', text: 'camera', kind: 'variable' },
      { type: 'field_name_picker', name: 'R', text: 'renderizador', kind: 'variable' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desenha um quadro da cena vista pela câmera. Ponha dentro de "A cada frame fazer". Vira "renderizador.render(cena, camera)".',
  },
  {
    // `document.body.appendChild(renderer.domElement)` — pôr a tela 3D na página.
    type: 'sz_t3d_mount_renderer',
    message0: 'mostrar o renderizador %1 na página',
    args0: [{ type: 'field_name_picker', name: 'R', text: 'renderizador', kind: 'variable' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Coloca a tela do renderizador (o canvas 3D) dentro da página, para o desenho aparecer. Vira "document.body.appendChild(renderizador.domElement)".',
  },

  // ───────────────────────── 📦 Modelos e texturas ────────────────────────────
  {
    // `carregador.load(url, (modelo) => { … })` — carregamento async de um recurso.
    type: 'sz_t3d_load_model',
    message0: 'com o carregador %1 carregar o modelo %2',
    args0: [
      { type: 'field_name_picker', name: 'LOADER', text: 'carregador', kind: 'variable' },
      { type: 'field_asset_picker', name: 'URL', text: 'modelo', kind: '3d' },
    ],
    message1: 'quando pronto, com o modelo em %1, fazer %2',
    args1: [
      { type: 'field_input', name: 'PARAM', text: 'modelo' },
      { type: 'input_statement', name: 'DO' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Carrega um modelo 3D (.glb) que você enviou em "Imagens" e, quando terminar, roda os blocos de dentro com o modelo pronto (ex.: "adicionar modelo.scene em cena"). Vira "carregador.load(\'nome\', (modelo) => { … })".',
  },
]

export const CANVAS3D_GROUPS: { name: string; colour: string; types: string[] }[] = [
  {
    name: '🧊 Biblioteca 3D',
    colour: C,
    types: ['sz_t3d_import', 'sz_t3d_import_named', 'sz_t3d_new_var', 'sz_t3d_new'],
  },
  {
    name: '🎯 Transformar',
    colour: C,
    types: [
      'sz_t3d_set_position',
      'sz_t3d_set_rotation',
      'sz_t3d_rotate_axis',
      'sz_t3d_set_scale',
      'sz_t3d_look_at',
      'sz_t3d_set_visible',
    ],
  },
  {
    name: '🎬 Cena e material',
    colour: C,
    types: ['sz_t3d_add_to', 'sz_t3d_set_color', 'sz_t3d_set_background'],
  },
  {
    name: '💡 Luz e sombra',
    colour: C,
    types: ['sz_t3d_set_shadow', 'sz_t3d_set_intensity'],
  },
  {
    name: '🖥️ Renderizador',
    colour: C,
    types: [
      'sz_t3d_renderer_size',
      'sz_t3d_enable_shadows',
      'sz_t3d_mount_renderer',
      'sz_t3d_render',
    ],
  },
  {
    name: '📦 Modelos',
    colour: C,
    types: ['sz_t3d_load_model'],
  },
]

// Cada sub-grupo recebe um tom do teal da categoria (padrão de canvas.ts).
const SHADES = categoryShades(C, CANVAS3D_GROUPS.length)
CANVAS3D_GROUPS.forEach((g, i) => {
  g.colour = SHADES[i] ?? C
})
for (const b of CANVAS3D_BLOCKS) b.colour = C
