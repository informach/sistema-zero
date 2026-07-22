import {
  CANVAS3D_CONTINUOUS_BLOCK_TYPES,
  CANVAS3D_RESOURCE_CREATOR_BLOCK_TYPES,
  CANVAS3D_START_ONLY_BLOCK_TYPES,
} from '../../three/canvas3dContract'
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
 * Três tipos de bloco convivem:
 *  1. BASE (`sz_t3d_import`/`sz_t3d_new_var`/`sz_t3d_new`) — o import + o `new` com
 *     namespace. Têm IR própria (`importStar`/`newInstance`/`newExpr` com namespace).
 *  2. FACILITADORES DIRETOS (`sz_t3d_set_position`, `sz_t3d_rotate_axis`,
 *     `sz_t3d_render`…) — rótulos amigáveis que compilam para IR genérica
 *     (`memberCall`/`memberSet`/`newExpr`).
 *  3. RECEITAS SEMÂNTICAS (`sz_t3d_renderer_create`, `sz_t3d_terrain`, física…) —
 *     blocos que expandem mais de uma linha e têm IR/schema próprios. Marcadores
 *     versionados em `canvas3dMacroCodec.ts` preservam o round-trip sem esconder o
 *     Three.js real mostrado na Ponte.
 *
 * Presença de qualquer bloco `sz_t3d_*` dispara o import automático do three.js no
 * preview (ver `preview/coreImports.ts`). Os facilitadores ficam no intermediário 3D;
 * somente as peças técnicas permanecem no avançado 3D.
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
    placement: 'start-declaration',
    message0: 'usar a biblioteca 3D como %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'THREE' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Prepara a biblioteca 3D para o projeto. Use no início quando quiser montar objetos com as peças técnicas.',
  },

  // ─────────────────────── 🎬 Inicialização manual ──────────────────────────
  {
    type: 'sz_t3d_scene_create',
    placement: 'resource-creator',
    message0: 'criar cena 3D %1',
    args0: [{ type: 'field_input', name: 'SCENE', text: 'cena' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Cria o espaço que reúne objetos, luzes e câmera antes de desenhar o mundo.',
  },
  {
    type: 'sz_t3d_renderer_create',
    placement: 'resource-creator',
    message0: 'preparar tela 3D %1',
    args0: [{ type: 'field_input', name: 'RENDERER', text: 'renderizador' }],
    message1: 'usando o canvas %1',
    args1: [{ type: 'field_name_picker', name: 'CANVAS', text: 'tela', kind: 'canvas' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Liga o desenho 3D a uma tela criada antes na categoria Canvas.',
  },
  {
    type: 'sz_t3d_camera_create',
    placement: 'resource-creator',
    message0: 'criar câmera %1 para o canvas %2',
    args0: [
      { type: 'field_input', name: 'CAMERA', text: 'camera' },
      { type: 'field_name_picker', name: 'CANVAS', text: 'tela', kind: 'canvas' },
    ],
    message1: 'visão %1° · perto %2 · longe %3',
    args1: [
      { type: 'input_value', name: 'FOV', check: 'JSValue' },
      { type: 'input_value', name: 'NEAR', check: 'JSValue' },
      { type: 'input_value', name: 'FAR', check: 'JSValue' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Cria o ponto de vista da cena com a proporção da tela escolhida.',
  },
  {
    type: 'sz_t3d_light_create',
    placement: 'resource-creator',
    message0: 'criar luz %1 na cena %2',
    args0: [
      { type: 'field_input', name: 'LIGHT', text: 'luz' },
      { type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'scene3d' },
    ],
    message1: 'tipo %1 · cor %2 · intensidade %3',
    args1: [
      {
        type: 'field_dropdown',
        name: 'KIND',
        options: [
          ['ambiente', 'ambient'],
          ['direcional', 'directional'],
        ],
      },
      { type: 'input_value', name: 'COLOR', check: 'JSValue' },
      { type: 'input_value', name: 'INTENSITY', check: 'JSValue' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Cria uma luz e a coloca na cena. A luz ambiente ilumina tudo por igual.',
  },
  {
    // Statement: `const cena = new THREE.Scene(args)`. NS = o nome da lib (THREE),
    // CLASS = o construtor real do three.js (Scene, Mesh, PerspectiveCamera…).
    // O args-mutator (+/−) adiciona as tomadas de argumento.
    type: 'sz_t3d_new_var',
    placement: 'resource-creator',
    message0: 'criar %1 = novo %2',
    args0: [
      { type: 'field_input', name: 'VARNAME', text: 'cena' },
      { type: 'field_class_picker', name: 'CLASS', text: 'THREE.Scene' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    mutator: 'sz_args_mutator',
    tooltip:
      'Cria um objeto 3D, deixa você escolher seu tipo e guarda o resultado com o nome escolhido.',
  },
  {
    // Valor: `new THREE.Vector3(1,2,3)` numa tomada (argumento de método, etc.).
    type: 'sz_t3d_new',
    message0: 'novo %1',
    args0: [{ type: 'field_class_picker', name: 'CLASS', text: 'THREE.Vector3' }],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    mutator: 'sz_args_mutator',
    tooltip:
      'Cria um objeto 3D para encaixar diretamente em outro bloco. Clique no tipo para escolher.',
  },
  {
    // Import nomeado de um addon: `import { GLTFLoader } from 'three/addons/…'`.
    type: 'sz_t3d_import_named',
    placement: 'start-declaration',
    message0: 'usar %1',
    args0: [{ type: 'field_addon_picker', name: 'NAMES', text: 'GLTFLoader' }],
    message1: 'da biblioteca %1',
    args1: [{ type: 'field_input', name: 'MODULE', text: 'automático' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Adiciona uma ferramenta 3D extra, como carregador, controle ou efeito. Clique no nome para escolher.',
  },

  // ───────────────────────── 🎯 Transformar (Object3D) ────────────────────────
  {
    // `obj.position.set(x, y, z)`
    type: 'sz_t3d_set_position',
    placement: 'command',
    message0: 'posição de %1 → x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Coloca o objeto, a luz ou a câmera em um ponto do espaço 3D.',
  },
  {
    // `obj.rotation.set(x, y, z)` (em radianos)
    type: 'sz_t3d_set_rotation',
    placement: 'command',
    message0: 'rotação de %1 → x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Gira o objeto até o ângulo escolhido em cada direção.',
  },
  {
    // `obj.rotation.<axis> += delta` — o idioma da animação (girar um pouco por quadro).
    type: 'sz_t3d_rotate_axis',
    placement: 'command',
    message0: 'girar %1 no eixo %2 em %3',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
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
    tooltip: 'Gira o objeto um pouco mais na direção escolhida. Use em cada quadro para animar.',
  },
  {
    // `obj.scale.set(x, y, z)`
    type: 'sz_t3d_set_scale',
    placement: 'command',
    message0: 'escala de %1 → x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Estica ou encolhe o objeto em cada direção. O valor 1 mantém o tamanho normal.',
  },
  {
    // `obj.lookAt(x, y, z)`
    type: 'sz_t3d_look_at',
    placement: 'command',
    message0: '%1 olhar para → x %2 y %3 z %4',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'camera', kind: 'camera3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Aponta o objeto ou a câmera para um lugar do espaço.',
  },
  {
    // `obj.visible = true/false`
    type: 'sz_t3d_set_visible',
    placement: 'command',
    message0: '%1 %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
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
    tooltip: 'Mostra ou esconde o objeto na cena.',
  },

  // ───────────────────────── 🎬 Cena e material ───────────────────────────────
  {
    // `target.add(obj)` — pôr um objeto dentro da cena (ou de um grupo).
    type: 'sz_t3d_add_to',
    placement: 'command',
    message0: 'adicionar %1 em %2',
    args0: [
      { type: 'input_value', name: 'OBJ', check: 'JSValue' },
      { type: 'field_name_picker', name: 'TARGET', text: 'cena', kind: 'object3d' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Coloca o objeto dentro da cena ou de um grupo para ele aparecer.',
  },
  {
    // `mat.color.set(cor)` — a cor de um material.
    type: 'sz_t3d_set_color',
    placement: 'command',
    message0: 'cor de %1 → %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'material', kind: 'variable' },
      { type: 'input_value', name: 'COLOR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Muda a cor de uma peça ou de uma luz.',
  },
  {
    // `scene.background = new THREE.Color(cor)`
    type: 'sz_t3d_set_background',
    placement: 'command',
    message0: 'fundo da cena %1 → cor %2',
    args0: [
      { type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'scene3d' },
      { type: 'input_value', name: 'COLOR', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Pinta o fundo da cena com a cor escolhida.',
  },
  {
    // `scene.fog = new THREE.Fog(cor, perto, longe)`
    type: 'sz_t3d_set_fog',
    placement: 'command',
    message0: 'névoa na cena %1',
    args0: [{ type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'scene3d' }],
    message1: 'com a cor %1',
    args1: [{ type: 'input_value', name: 'COLOR', check: 'JSValue' }],
    message2: 'começa em %1 e termina em %2',
    args2: [
      { type: 'input_value', name: 'NEAR', check: 'JSValue' },
      { type: 'input_value', name: 'FAR', check: 'JSValue' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma névoa que esconde aos poucos os objetos distantes e dá profundidade ao mundo.',
  },
  {
    // `obj.position.lerp(alvo, velocidade)` — o idioma nº 1 de câmera que segue.
    type: 'sz_t3d_lerp_position',
    placement: 'command',
    message0: 'mover %1 devagar',
    args0: [{ type: 'field_name_picker', name: 'OBJ', text: 'camera', kind: 'camera3d' }],
    message1: 'até %1',
    args1: [{ type: 'input_value', name: 'TARGET', check: 'JSValue' }],
    message2: 'suavidade %1',
    args2: [{ type: 'input_value', name: 'ALPHA', check: 'JSValue' }],
    message3: 'tempo do quadro %1',
    args3: [{ type: 'input_value', name: 'DT', check: 'JSValue' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Desliza o objeto suavemente até o ponto escolhido. Use o tempo recebido pelo laço de animação.',
  },

  // ───────────────────────── 💡 Luz e sombra ──────────────────────────────────
  {
    // `obj.castShadow = bool` / `obj.receiveShadow = bool`
    type: 'sz_t3d_set_shadow',
    placement: 'command',
    message0: '%1 %2 sombra: %3',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'objeto', kind: 'object3d' },
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
    tooltip: 'Escolhe se o objeto projeta ou recebe sombra.',
  },
  {
    // `light.intensity = n`
    type: 'sz_t3d_set_intensity',
    placement: 'command',
    message0: 'intensidade da luz %1 → %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'luz', kind: 'light3d' },
      { type: 'input_value', name: 'N', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Deixa a luz mais forte ou mais fraca.',
  },

  // ───────────────────────── 🖥️ Tela 3D ──────────────────────────────────────
  {
    // `renderer.setSize(w, h)`
    type: 'sz_t3d_renderer_size',
    placement: 'command',
    message0: 'tamanho da tela 3D %1',
    args0: [{ type: 'field_name_picker', name: 'R', text: 'renderizador', kind: 'renderer3d' }],
    message1: 'largura %1 · altura %2',
    args1: [
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Define a largura e a altura da imagem 3D na página.',
  },
  {
    // `renderer.shadowMap.enabled = true`
    type: 'sz_t3d_enable_shadows',
    placement: 'command',
    message0: 'ligar sombras na tela 3D %1',
    args0: [{ type: 'field_name_picker', name: 'R', text: 'renderizador', kind: 'renderer3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Permite que a tela 3D desenhe as sombras da cena.',
  },
  {
    // `renderer.render(scene, camera)`
    type: 'sz_t3d_render',
    placement: 'command',
    message0: 'desenhar a cena %1',
    args0: [{ type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'scene3d' }],
    message1: 'com a câmera %1',
    args1: [{ type: 'field_name_picker', name: 'CAMERA', text: 'camera', kind: 'camera3d' }],
    message2: 'na tela 3D %1',
    args2: [{ type: 'field_name_picker', name: 'R', text: 'renderizador', kind: 'renderer3d' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desenha um quadro da cena visto pela câmera. Use dentro do laço de animação.',
  },
  {
    // `document.body.appendChild(renderer.domElement)` — pôr a tela 3D na página.
    type: 'sz_t3d_mount_renderer',
    placement: 'command',
    message0: 'mostrar a tela 3D %1 na página',
    args0: [{ type: 'field_name_picker', name: 'R', text: 'renderizador', kind: 'renderer3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Coloca a imagem 3D dentro da página para a cena aparecer.',
  },

  // ───────────────────────── 🌳 Cópias em massa ───────────────────────────────
  {
    // `malha.setMatrixAt(i, molde.matrix)` — o miolo do InstancedMesh.
    type: 'sz_t3d_set_matrix_at',
    placement: 'command',
    message0: 'gravar a pose do molde %1',
    args0: [{ type: 'field_name_picker', name: 'DUMMY', text: 'molde', kind: 'object3d' }],
    message1: 'na cópia %1 de %2',
    args1: [
      { type: 'input_value', name: 'I', check: 'JSValue' },
      { type: 'field_name_picker', name: 'MESH', text: 'copias', kind: 'object3d' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Copia a posição, o giro e o tamanho do molde para uma das muitas cópias. Ideal para florestas e multidões.',
  },
  {
    // `malha.instanceMatrix.needsUpdate = true`
    type: 'sz_t3d_instances_dirty',
    placement: 'command',
    message0: 'avisar que as cópias de %1 mudaram',
    args0: [{ type: 'field_name_picker', name: 'MESH', text: 'copias', kind: 'object3d' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Atualiza todas as cópias depois de mudar suas poses. Use uma vez, após terminar o laço.',
  },

  // ───────────────────────── 📦 Modelos e texturas ────────────────────────────
  {
    // `carregador.load(url, (modelo) => { … })` — carregamento async de um recurso.
    type: 'sz_t3d_load_model',
    placement: 'resource-creator',
    bodyExecution: 'deferred-callback',
    message0: 'carregar modelo %1',
    args0: [
      {
        type: 'field_asset_picker',
        name: 'URL',
        text: 'modelo',
        kind: '3d',
        filter: 'model3d',
      },
    ],
    message1: 'usando %1',
    args1: [{ type: 'field_name_picker', name: 'LOADER', text: 'carregador', kind: 'loader3d' }],
    message2: 'deu certo: %1 %2',
    args2: [
      { type: 'field_input', name: 'PARAM', text: 'modelo' },
      { type: 'input_statement', name: 'DO' },
    ],
    message3: 'deu erro: %1 %2',
    args3: [
      { type: 'field_input', name: 'ERROR_PARAM', text: 'erro' },
      { type: 'input_statement', name: 'DO_ERROR' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Carrega um modelo 3D do projeto. Executa um ramo quando ficar pronto e outro se houver erro.',
  },
  {
    // `carregadorSom.load('nome', (buffer) => { … })` — MESMO nó `loaderLoad` do
    // modelo (buildIR idêntico); só muda o rótulo e o seletor de asset (som). O
    // reverso (código→bloco) escolhe ESTE bloco quando o carregador foi declarado
    // como AudioLoader (latch `audioLoaderVars` no workspaceState).
    type: 'sz_t3d_load_sound',
    placement: 'resource-creator',
    bodyExecution: 'deferred-callback',
    message0: 'carregar som %1',
    args0: [{ type: 'field_asset_picker', name: 'URL', text: 'som', kind: 'audio' }],
    message1: 'usando %1',
    args1: [{ type: 'field_name_picker', name: 'LOADER', text: 'carregadorSom', kind: 'loader3d' }],
    message2: 'deu certo: %1 %2',
    args2: [
      { type: 'field_input', name: 'PARAM', text: 'buffer' },
      { type: 'input_statement', name: 'DO' },
    ],
    message3: 'deu erro: %1 %2',
    args3: [
      { type: 'field_input', name: 'ERROR_PARAM', text: 'erro' },
      { type: 'input_statement', name: 'DO_ERROR' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Carrega um som do projeto. Executa um ramo quando ficar pronto e outro se houver erro.',
  },
  {
    // `objeto.traverse((parte) => { … })` — percorrer cada parte de um objeto/modelo.
    type: 'sz_t3d_traverse',
    placement: 'command',
    bodyExecution: 'sync-callback',
    message0: 'para cada parte de %1',
    args0: [{ type: 'input_value', name: 'OBJ', check: 'JSValue' }],
    message1: 'com a parte em %1, fazer %2',
    args1: [
      { type: 'field_input', name: 'PARAM', text: 'parte' },
      { type: 'input_statement', name: 'DO' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Visita cada parte de um objeto ou modelo. Use para ligar sombras ou mudar várias peças de uma vez.',
  },
  {
    // Modernização do renderizador em 1 bloco: cada dropdown vira a grafia ATUAL do
    // three.js (setPixelRatio / shadowMap.type / outputColorSpace / toneMapping).
    type: 'sz_t3d_renderer_config',
    placement: 'command',
    message0: 'melhorar a imagem',
    message1: 'na tela 3D %1',
    args1: [{ type: 'field_name_picker', name: 'R', text: 'renderizador', kind: 'renderer3d' }],
    message2: 'nitidez %1 · sombras %2',
    args2: [
      {
        type: 'field_dropdown',
        name: 'PIXELS',
        options: [
          ['retina (nítido)', 'device'],
          ['não mexer', 'off'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'SHADOWS',
        options: [
          ['macias', 'soft'],
          ['duras', 'hard'],
          ['não mexer', 'off'],
        ],
      },
    ],
    message3: 'cores %1 · brilho %2',
    args3: [
      {
        type: 'field_dropdown',
        name: 'COLORSPACE',
        options: [
          ['vivas (sRGB)', 'srgb'],
          ['não mexer', 'off'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'TONE',
        options: [
          ['cinema (ACES)', 'aces'],
          ['não mexer', 'off'],
        ],
      },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Ajusta nitidez, sombras, cores e brilho da imagem. Escolha “não mexer” para manter uma opção como está.',
  },
  {
    type: 'sz_t3d_renderer_responsive',
    placement: 'resource-creator',
    message0: 'adaptar tela 3D %1',
    args0: [{ type: 'field_name_picker', name: 'R', text: 'renderizador', kind: 'renderer3d' }],
    message1: 'com câmera %1',
    args1: [{ type: 'field_name_picker', name: 'CAMERA', text: 'camera', kind: 'camera3d' }],
    message2: 'efeitos opcionais %1',
    args2: [{ type: 'field_name_picker', name: 'COMPOSER', text: '', kind: 'composer3d' }],
    message3: 'guardar limpeza em %1',
    args3: [{ type: 'field_input', name: 'CLEANUP', text: 'pararResponsivo' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Adapta o tamanho da imagem, da câmera e dos efeitos quando o espaço disponível mudar.',
  },
  {
    type: 'sz_t3d_load_environment',
    placement: 'resource-creator',
    message0: 'carregar céu 360° %1',
    args0: [
      {
        type: 'field_asset_picker',
        name: 'URL',
        text: 'ceu',
        kind: '3d',
        filter: 'environment3d',
      },
    ],
    message1: 'na cena %1',
    args1: [{ type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'scene3d' }],
    message2: 'usar também como fundo %1',
    args2: [
      {
        type: 'field_dropdown',
        name: 'BACKGROUND',
        options: [
          ['sim', 'true'],
          ['não', 'false'],
        ],
      },
    ],
    message3: 'guardar textura em %1',
    args3: [{ type: 'field_input', name: 'TEXTURE', text: 'ceuHDR' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Carrega um céu 360° e usa sua luz para criar reflexos nos objetos da cena.',
  },
  {
    type: 'sz_t3d_dispose_object',
    placement: 'command',
    message0: 'remover e liberar objeto 3D %1',
    args0: [{ type: 'field_name_picker', name: 'OBJECT', text: 'objeto', kind: 'object3d' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Remove o objeto da cena e libera a memória usada por suas peças e imagens.',
  },

  // ───────────────────────── ✨ Efeitos ───────────────────────────────────────
  {
    // Macro "Brilho (bloom)": arma EffectComposer + RenderPass + UnrealBloomPass +
    // OutputPass. Os imports do pós-processamento entram sozinhos (gerador).
    type: 'sz_t3d_bloom_setup',
    placement: 'resource-creator',
    message0: 'ligar Brilho ✨ na tela 3D %1',
    args0: [{ type: 'field_name_picker', name: 'R', text: 'renderizador', kind: 'renderer3d' }],
    message1: 'da cena %1 com a câmera %2',
    args1: [
      { type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'scene3d' },
      { type: 'field_name_picker', name: 'CAMERA', text: 'camera', kind: 'camera3d' },
    ],
    message2: 'força %1 · espalhar %2 · brilho mínimo %3 · guardar em %4',
    args2: [
      { type: 'input_value', name: 'STRENGTH', check: 'JSValue' },
      { type: 'input_value', name: 'RADIUS', check: 'JSValue' },
      { type: 'input_value', name: 'THRESHOLD', check: 'JSValue' },
      { type: 'field_input', name: 'COMPOSER', text: 'composer' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Faz as partes claras brilharem, como neon, sol e lâmpadas. Depois use “desenhar a cena com efeitos”.',
  },
  {
    // `composer.render()` — desenhar passando pela esteira de efeitos (no lugar de
    // `renderer.render(cena, camera)`). Facilitador → memberCall genérico.
    type: 'sz_t3d_render_effects',
    placement: 'command',
    message0: 'desenhar a cena com efeitos %1',
    args0: [{ type: 'field_name_picker', name: 'COMPOSER', text: 'composer', kind: 'composer3d' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desenha um quadro com os efeitos ligados. Use dentro do laço de animação.',
  },
  {
    // Macro "Partículas": cria um sistema de Points (BufferGeometry aleatória +
    // PointsMaterial). Forward-only; o gerador expande a receita.
    type: 'sz_t3d_particles',
    placement: 'resource-creator',
    message0: 'criar partículas ✨ na cena %1',
    args0: [{ type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'scene3d' }],
    message1: 'quantidade %1 · tamanho %2',
    args1: [
      { type: 'input_value', name: 'COUNT', check: 'JSValue' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
    ],
    message2: 'espalhar %1 · cor %2 · guardar em %3',
    args2: [
      { type: 'input_value', name: 'SPREAD', check: 'JSValue' },
      { type: 'input_value', name: 'COLOR', check: 'JSValue' },
      { type: 'field_input', name: 'PARTICLES', text: 'particulas' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria pontinhos para estrelas, poeira, fogo ou neve. Escolha quantidade, tamanho, espaço e cor.',
  },
  {
    // Macro "Água": plano d'água com reflexo (addon Water) + normal map procedural
    // (sem depender de arquivo externo). Forward-only; o gerador expande a receita.
    type: 'sz_t3d_water',
    placement: 'resource-creator',
    message0: 'criar água 🌊 na cena %1',
    args0: [{ type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'scene3d' }],
    message1: 'tamanho %1 · cor %2 · guardar em %3',
    args1: [
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
      { type: 'input_value', name: 'COLOR', check: 'JSValue' },
      { type: 'field_input', name: 'WATER', text: 'agua' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um lago ou oceano que reflete a cena. Depois use “fazer a água ondular” no laço.',
  },
  {
    type: 'sz_t3d_water_wave',
    placement: 'loop-command',
    message0: 'fazer a água %1 ondular',
    args0: [{ type: 'field_name_picker', name: 'WATER', text: 'agua', kind: 'object3d' }],
    message1: 'tempo do quadro %1',
    args1: [{ type: 'input_value', name: 'DT', check: 'JSValue' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Move as ondas no laço de animação. Use o tempo do quadro para manter a velocidade constante.',
  },
  {
    // Macro "Grama": campo de grama INSTANCIADA (milhares de folhas num desenho) com
    // shader de vento (GLSL escondido). Forward-only; o gerador expande a receita.
    type: 'sz_t3d_grass',
    placement: 'resource-creator',
    message0: 'criar grama 🌿 na cena %1',
    args0: [{ type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'scene3d' }],
    message1: 'folhas %1 · altura %2',
    args1: [
      { type: 'input_value', name: 'COUNT', check: 'JSValue' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
    ],
    message2: 'espalhar %1 · cor %2 · guardar em %3',
    args2: [
      { type: 'input_value', name: 'SPREAD', check: 'JSValue' },
      { type: 'input_value', name: 'COLOR', check: 'JSValue' },
      { type: 'field_input', name: 'GRASS', text: 'grama' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria um campo com muitas folhas de grama. Depois use “fazer a grama balançar” no laço.',
  },
  {
    // Macro "Letreiro 3D": o jeito FOLIO de texto no mundo — desenha o texto num
    // canvas oculto, vira CanvasTexture num plano transparente (só as letras têm
    // alfa). Forward-only; o gerador expande a receita (12 linhas, todas 0-raw).
    type: 'sz_t3d_sign',
    placement: 'resource-creator',
    message0: 'criar letreiro 🪧 na cena %1',
    args0: [{ type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'scene3d' }],
    message1: 'texto %1 · largura %2',
    args1: [
      { type: 'field_input', name: 'TEXT', text: 'Oi!' },
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
    ],
    message2: 'cor %1 · guardar em %2',
    args2: [
      { type: 'input_value', name: 'COLOR', check: 'JSValue' },
      { type: 'field_input', name: 'SIGN', text: 'placa' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma placa flutuante com seu texto e sua cor. Depois use o bloco de posição para colocá-la.',
  },
  {
    type: 'sz_t3d_grass_wave',
    placement: 'loop-command',
    message0: 'fazer a grama %1 balançar',
    args0: [{ type: 'field_name_picker', name: 'GRASS', text: 'grama', kind: 'object3d' }],
    message1: 'tempo do quadro %1',
    args1: [{ type: 'input_value', name: 'DT', check: 'JSValue' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Move a grama no laço de animação. Use o tempo do quadro para manter o vento constante.',
  },

  // ───────────────────────── 🧱 Mundo automático ─────────────────────────────
  {
    type: 'sz_t3d_primitive',
    placement: 'resource-creator',
    message0: 'criar forma 3D %1 na cena %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SHAPE',
        options: [
          ['cubo', 'box'],
          ['esfera', 'sphere'],
          ['cilindro', 'cylinder'],
          ['cone', 'cone'],
          ['cápsula', 'capsule'],
        ],
      },
      { type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'scene3d' },
    ],
    message1: 'tamanho x %1 y %2 z %3',
    args1: [
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'input_value', name: 'D', check: 'JSValue' },
    ],
    message2: 'cor %1 · guardar em %2',
    args2: [
      { type: 'input_value', name: 'COLOR', check: 'JSValue' },
      { type: 'field_input', name: 'MESH', text: 'objeto' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma forma colorida pronta. Junte várias para montar árvores, personagens, veículos e prédios.',
  },
  {
    type: 'sz_t3d_terrain',
    placement: 'resource-creator',
    message0: 'criar terreno automático na cena %1',
    args0: [{ type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'scene3d' }],
    message1: 'tamanho %1 · divisões %2 · morros %3 · suavidade %4',
    args1: [
      { type: 'input_value', name: 'SIZE', check: 'JSValue' },
      { type: 'input_value', name: 'SEGMENTS', check: 'JSValue' },
      { type: 'input_value', name: 'HILLS', check: 'JSValue' },
      { type: 'input_value', name: 'SMOOTH', check: 'JSValue' },
    ],
    message2: 'cor %1 · guardar em %2 · altura em %3',
    args2: [
      { type: 'input_value', name: 'COLOR', check: 'JSValue' },
      { type: 'field_input', name: 'TERRAIN', text: 'terreno' },
      { type: 'field_input', name: 'HEIGHT_FN', text: 'alturaChao' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Monta um terreno de primitivas com morros determinísticos e cria uma função que informa a altura em qualquer x/z. Essa mesma função pode alimentar a física leve.',
  },
  {
    type: 'sz_t3d_road',
    placement: 'resource-creator',
    message0: 'construir estrada na cena %1',
    args0: [{ type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'scene3d' }],
    message1: 'começar em x %1 z %2 · terminar em x %3 z %4',
    args1: [
      { type: 'input_value', name: 'X1', check: 'JSValue' },
      { type: 'input_value', name: 'Z1', check: 'JSValue' },
      { type: 'input_value', name: 'X2', check: 'JSValue' },
      { type: 'input_value', name: 'Z2', check: 'JSValue' },
    ],
    message2: 'largura %1 · divisões %2 · seguir altura %3',
    args2: [
      { type: 'input_value', name: 'WIDTH', check: 'JSValue' },
      { type: 'input_value', name: 'SEGMENTS', check: 'JSValue' },
      { type: 'field_name_picker', name: 'HEIGHT_FN', text: 'alturaChao', kind: 'function' },
    ],
    message3: 'cor %1 · guardar em %2',
    args3: [
      { type: 'input_value', name: 'COLOR', check: 'JSValue' },
      { type: 'field_input', name: 'ROAD', text: 'estrada' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria uma estrada segmentada que acompanha a função de altura do terreno. Combine várias para formar quarteirões e trajetos.',
  },
  {
    type: 'sz_t3d_building',
    placement: 'resource-creator',
    message0: 'construir prédio na cena %1 em x %2 z %3',
    args0: [
      { type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'scene3d' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    message1: 'largura %1 · altura %2 · profundidade %3',
    args1: [
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'input_value', name: 'D', check: 'JSValue' },
    ],
    message2: 'parede %1 · telhado %2 · seguir altura %3 · guardar em %4',
    args2: [
      { type: 'input_value', name: 'COLOR', check: 'JSValue' },
      { type: 'input_value', name: 'ROOF', check: 'JSValue' },
      { type: 'field_name_picker', name: 'HEIGHT_FN', text: 'alturaChao', kind: 'function' },
      { type: 'field_input', name: 'BUILDING', text: 'predio' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Monta um prédio com corpo, telhado, porta e janelas. As mesmas medidas podem deixá-lo sólido na física.',
  },
  {
    type: 'sz_t3d_city',
    placement: 'resource-creator',
    message0: 'criar cidade automática na cena %1',
    args0: [{ type: 'field_name_picker', name: 'SCENE', text: 'cena', kind: 'scene3d' }],
    message1: 'seguindo altura %1',
    args1: [{ type: 'field_name_picker', name: 'HEIGHT_FN', text: 'alturaChao', kind: 'function' }],
    message2: 'quarteirões x %1 z %2',
    args2: [
      { type: 'input_value', name: 'BLOCKS_X', check: 'JSValue' },
      { type: 'input_value', name: 'BLOCKS_Z', check: 'JSValue' },
    ],
    message3: 'espaçamento %1 · rua %2',
    args3: [
      { type: 'input_value', name: 'SPACING', check: 'JSValue' },
      { type: 'input_value', name: 'ROAD_WIDTH', check: 'JSValue' },
    ],
    message4: 'altura mínima %1 · máxima %2 · semente %3',
    args4: [
      { type: 'input_value', name: 'MIN_HEIGHT', check: 'JSValue' },
      { type: 'input_value', name: 'MAX_HEIGHT', check: 'JSValue' },
      { type: 'input_value', name: 'SEED', check: 'JSValue' },
    ],
    message5: 'paredes %1 · telhados %2 · guardar em %3',
    args5: [
      { type: 'input_value', name: 'COLOR', check: 'JSValue' },
      { type: 'input_value', name: 'ROOF', check: 'JSValue' },
      { type: 'field_input', name: 'CITY', text: 'cidade' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Monta ruas e prédios variados com a mesma semente. O resultado pode ser repetido e continua leve.',
  },

  // ───────────────────────── 🧲 Física leve ──────────────────────────────────
  {
    type: 'sz_t3d_physics_setup',
    placement: 'resource-creator',
    message0: 'criar física leve %1 usando altura %2',
    args0: [
      { type: 'field_input', name: 'WORLD', text: 'fisica' },
      { type: 'field_name_picker', name: 'HEIGHT_FN', text: 'alturaChao', kind: 'function' },
    ],
    message1: 'gravidade %1 · passos extras no máximo %2',
    args1: [
      { type: 'input_value', name: 'GRAVITY', check: 'JSValue' },
      { type: 'input_value', name: 'SUBSTEPS', check: 'JSValue' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Prepara movimento, gravidade e colisões. Use a altura criada pelo terreno automático.',
  },
  {
    type: 'sz_t3d_physics_static_box',
    placement: 'resource-creator',
    message0: 'na física %1 adicionar parede %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' },
      { type: 'field_input', name: 'ID', text: 'parede' },
    ],
    message1: 'posição x %1 y %2 z %3',
    args1: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    message2: 'tamanho x %1 y %2 z %3',
    args2: [
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'input_value', name: 'D', check: 'JSValue' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Cria uma parede ou caixa sólida para casas, postes, pontes e limites.',
  },
  {
    type: 'sz_t3d_physics_body',
    placement: 'resource-creator',
    message0: 'na física %1 tornar %2 o corpo %3',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' },
      { type: 'field_name_picker', name: 'OBJECT', text: 'objeto', kind: 'object3d' },
      { type: 'field_input', name: 'ID', text: 'jogador' },
    ],
    message1: 'tipo %1 · tamanho x %2 y %3 z %4',
    args1: [
      {
        type: 'field_dropdown',
        name: 'KIND',
        options: [
          ['personagem', 'character'],
          ['objeto empurrável', 'dynamic'],
        ],
      },
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'input_value', name: 'D', check: 'JSValue' },
    ],
    message2: 'atrito %1 · quique %2',
    args2: [
      { type: 'input_value', name: 'FRICTION', check: 'JSValue' },
      { type: 'input_value', name: 'BOUNCE', check: 'JSValue' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Conecta uma primitiva visual a um corpo físico simples. Personagem recebe movimento e salto; objeto empurrável recebe gravidade, impulso e rotação visual.',
  },
  {
    type: 'sz_t3d_physics_static_sphere',
    placement: 'resource-creator',
    message0: 'na física %1 adicionar esfera sólida %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' },
      { type: 'field_input', name: 'ID', text: 'rocha' },
    ],
    message1: 'posição x %1 y %2 z %3',
    args1: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    message2: 'raio %1',
    args2: [{ type: 'input_value', name: 'RADIUS', check: 'JSValue' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Cria um obstáculo redondo e sólido para rochas, copas e bolas.',
  },
  {
    type: 'sz_t3d_physics_static_object',
    placement: 'resource-creator',
    message0: 'na física %1 %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' },
      { type: 'input_end_row' },
    ],
    message1: 'deixar %1 sólido %2',
    args1: [
      { type: 'field_name_picker', name: 'OBJECT', text: 'predio', kind: 'object3d' },
      { type: 'input_end_row' },
    ],
    message2: 'com nome %1',
    args2: [{ type: 'field_input', name: 'ID', text: 'predioSolido' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Reaproveita automaticamente as dimensões da primitiva ou prédio, sem duplicar medidas.',
  },
  {
    type: 'sz_t3d_physics_static_city',
    placement: 'resource-creator',
    message0: 'na física %1 %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' },
      { type: 'input_end_row' },
    ],
    message1: 'tornar cidade %1 sólida %2',
    args1: [
      { type: 'field_name_picker', name: 'CITY', text: 'cidade', kind: 'object3d' },
      { type: 'input_end_row' },
    ],
    message2: 'com prefixo %1',
    args2: [{ type: 'field_input', name: 'PREFIX', text: 'cidade' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Deixa sólidos os prédios da cidade sem repetir posições ou medidas.',
  },
  {
    type: 'sz_t3d_physics_move',
    placement: 'command',
    message0: 'mover personagem %1 na física %2',
    args0: [
      { type: 'field_name_picker', name: 'ID', text: 'jogador', kind: 'physics-body' },
      { type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' },
    ],
    message1: 'direção x %1 z %2 · velocidade %3',
    args1: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
      { type: 'input_value', name: 'SPEED', check: 'JSValue' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Define a direção desejada do personagem; o motor normaliza diagonais e suaviza a velocidade.',
  },
  {
    type: 'sz_t3d_physics_jump',
    placement: 'command',
    message0: 'personagem %1 pular',
    args0: [{ type: 'field_name_picker', name: 'ID', text: 'jogador', kind: 'physics-body' }],
    message1: 'na física %1',
    args1: [{ type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' }],
    message2: 'com força %1',
    args2: [{ type: 'input_value', name: 'SPEED', check: 'JSValue' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Faz o personagem saltar somente quando estiver apoiado no chão.',
  },
  {
    type: 'sz_t3d_physics_trigger',
    placement: 'resource-creator',
    message0: 'na física %1 criar área %2',
    args0: [
      { type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' },
      { type: 'field_input', name: 'ID', text: 'praca' },
    ],
    message1: 'posição x %1 y %2 z %3',
    args1: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    message2: 'tamanho x %1 y %2 z %3',
    args2: [
      { type: 'input_value', name: 'W', check: 'JSValue' },
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'input_value', name: 'D', check: 'JSValue' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Cria uma área invisível para missões, portas, checkpoints e mudanças de distrito.',
  },
  {
    type: 'sz_t3d_physics_step',
    placement: 'loop-command',
    message0: 'atualizar física %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' }],
    message1: 'tempo do quadro %1',
    args1: [{ type: 'input_value', name: 'DT', check: 'JSValue' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Avança a física com passo fixo. Use uma vez dentro do laço de animação.',
  },
  {
    type: 'sz_t3d_physics_velocity',
    placement: 'command',
    message0: 'definir velocidade de %1 na física %2',
    args0: [
      { type: 'field_name_picker', name: 'ID', text: 'caixa', kind: 'physics-body' },
      { type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' },
    ],
    message1: 'velocidade x %1 y %2 z %3',
    args1: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Troca diretamente a velocidade linear de um corpo.',
  },
  {
    type: 'sz_t3d_physics_impulse',
    placement: 'command',
    message0: 'dar impulso em %1 na física %2',
    args0: [
      { type: 'field_name_picker', name: 'ID', text: 'caixa', kind: 'physics-body' },
      { type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' },
    ],
    message1: 'força x %1 y %2 z %3',
    args1: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Soma um impulso à velocidade atual para empurrões, explosões e arremessos.',
  },
  {
    type: 'sz_t3d_physics_teleport',
    placement: 'command',
    message0: 'teleportar %1 na física %2',
    args0: [
      { type: 'field_name_picker', name: 'ID', text: 'jogador', kind: 'physics-body' },
      { type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' },
    ],
    message1: 'destino x %1 y %2 z %3',
    args1: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Move corpo e objeto juntos e zera sua velocidade.',
  },
  {
    type: 'sz_t3d_physics_remove',
    placement: 'command',
    message0: 'remover %1 da física %2',
    args0: [
      { type: 'field_name_picker', name: 'ID', text: 'objeto', kind: 'physics-resource' },
      { type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Remove corpo, parede, esfera ou área e atualiza a grade espacial.',
  },
  {
    type: 'sz_t3d_physics_clear',
    placement: 'command',
    message0: 'limpar física %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Libera corpos, colisores, áreas e eventos registrados nesse mundo.',
  },
  {
    type: 'sz_t3d_physics_on_collision',
    placement: 'event',
    message0: 'quando houver colisão na física %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' }],
    message1: 'corpo em %1',
    args1: [{ type: 'field_input', name: 'BODY_PARAM', text: 'corpoId' }],
    message2: 'obstáculo em %1',
    args2: [{ type: 'field_input', name: 'COLLIDER_PARAM', text: 'obstaculoId' }],
    message3: 'fazer %1',
    args3: [{ type: 'input_statement', name: 'DO', check: 'JSStmt' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Executa uma vez por contato detectado, incluindo colisões entre corpos empurráveis.',
  },
  {
    type: 'sz_t3d_physics_on_trigger',
    placement: 'event',
    message0: 'quando uma área mudar na física %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' }],
    message1: 'corpo %1 · área %2',
    args1: [
      { type: 'field_input', name: 'BODY_PARAM', text: 'corpoId' },
      { type: 'field_input', name: 'TRIGGER_PARAM', text: 'areaId' },
    ],
    message2: 'entrou? %1',
    args2: [{ type: 'field_input', name: 'ENTERING_PARAM', text: 'entrou' }],
    message3: 'fazer %1',
    args3: [{ type: 'input_statement', name: 'DO', check: 'JSStmt' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Informa entrada e saída de áreas para missões, checkpoints e portais.',
  },
  {
    type: 'sz_t3d_physics_raycast',
    placement: 'command',
    message0: 'ver o que está à frente na física %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' }],
    message1: 'começar em x %1 y %2 z %3',
    args1: [
      { type: 'input_value', name: 'OX', check: 'JSValue' },
      { type: 'input_value', name: 'OY', check: 'JSValue' },
      { type: 'input_value', name: 'OZ', check: 'JSValue' },
    ],
    message2: 'seguir na direção x %1 y %2 z %3',
    args2: [
      { type: 'input_value', name: 'DX', check: 'JSValue' },
      { type: 'input_value', name: 'DY', check: 'JSValue' },
      { type: 'input_value', name: 'DZ', check: 'JSValue' },
    ],
    message3: 'distância máxima %1 · guardar resultado em %2',
    args3: [
      { type: 'input_value', name: 'MAX', check: 'JSValue' },
      { type: 'field_input', name: 'RESULT', text: 'acerto' },
    ],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Encontra o primeiro obstáculo à frente e guarda seu nome e sua distância.',
  },
  {
    type: 'sz_t3d_physics_body_state',
    placement: 'command',
    message0: 'ler corpo %1 %2',
    args0: [
      { type: 'field_name_picker', name: 'ID', text: 'jogador', kind: 'physics-body' },
      { type: 'input_end_row' },
    ],
    message1: 'da física %1 %2',
    args1: [
      { type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' },
      { type: 'input_end_row' },
    ],
    message2: 'guardar em %1',
    args2: [{ type: 'field_input', name: 'RESULT', text: 'estadoCorpo' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Obtém posição, velocidade e se o corpo está no chão.',
  },
  {
    type: 'sz_t3d_physics_stats',
    placement: 'command',
    message0: 'ler estatísticas da física %1',
    args0: [{ type: 'field_name_picker', name: 'WORLD', text: 'fisica', kind: 'physics-world' }],
    message1: 'guardar em %1',
    args1: [{ type: 'field_input', name: 'RESULT', text: 'estadoFisica' }],
    inputsInline: false,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Obtém contagens e limites do mundo para diagnóstico de desempenho.',
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
      'sz_t3d_lerp_position',
      'sz_t3d_set_visible',
    ],
  },
  {
    name: '🎬 Cena e material',
    colour: C,
    types: [
      'sz_t3d_scene_create',
      'sz_t3d_add_to',
      'sz_t3d_set_color',
      'sz_t3d_set_background',
      'sz_t3d_set_fog',
    ],
  },
  {
    name: '💡 Luz e sombra',
    colour: C,
    types: ['sz_t3d_light_create', 'sz_t3d_set_shadow', 'sz_t3d_set_intensity'],
  },
  {
    name: '🖥️ Tela 3D',
    colour: C,
    types: [
      'sz_t3d_renderer_create',
      'sz_t3d_camera_create',
      'sz_t3d_renderer_size',
      'sz_t3d_renderer_config',
      'sz_t3d_renderer_responsive',
      'sz_t3d_enable_shadows',
      'sz_t3d_mount_renderer',
      'sz_t3d_render',
    ],
  },
  {
    name: '🌳 Cópias em massa',
    colour: C,
    types: ['sz_t3d_set_matrix_at', 'sz_t3d_instances_dirty'],
  },
  {
    name: '📦 Modelos e sons',
    colour: C,
    types: [
      'sz_t3d_load_model',
      'sz_t3d_load_environment',
      'sz_t3d_load_sound',
      'sz_t3d_traverse',
      'sz_t3d_dispose_object',
    ],
  },
  {
    name: '✨ Efeitos',
    colour: C,
    types: [
      'sz_t3d_bloom_setup',
      'sz_t3d_render_effects',
      'sz_t3d_particles',
      'sz_t3d_water',
      'sz_t3d_water_wave',
      'sz_t3d_grass',
      'sz_t3d_grass_wave',
      'sz_t3d_sign',
    ],
  },
  {
    name: '🧱 Mundo automático',
    colour: C,
    types: ['sz_t3d_primitive', 'sz_t3d_terrain', 'sz_t3d_road', 'sz_t3d_building', 'sz_t3d_city'],
  },
  {
    name: '🧲 Física leve',
    colour: C,
    types: [
      'sz_t3d_physics_setup',
      'sz_t3d_physics_static_box',
      'sz_t3d_physics_static_sphere',
      'sz_t3d_physics_static_object',
      'sz_t3d_physics_static_city',
      'sz_t3d_physics_body',
      'sz_t3d_physics_move',
      'sz_t3d_physics_jump',
      'sz_t3d_physics_trigger',
      'sz_t3d_physics_step',
      'sz_t3d_physics_velocity',
      'sz_t3d_physics_impulse',
      'sz_t3d_physics_teleport',
      'sz_t3d_physics_remove',
      'sz_t3d_physics_clear',
      'sz_t3d_physics_on_collision',
      'sz_t3d_physics_on_trigger',
      'sz_t3d_physics_raycast',
      'sz_t3d_physics_body_state',
      'sz_t3d_physics_stats',
    ],
  },
]

// Cada sub-grupo recebe um tom do teal da categoria (padrão de canvas.ts).
const SHADES = categoryShades(C, CANVAS3D_GROUPS.length)
CANVAS3D_GROUPS.forEach((g, i) => {
  g.colour = SHADES[i] ?? C
})
const COLOUR_BY_TYPE = new Map<string, string>(
  CANVAS3D_GROUPS.flatMap((group) => group.types.map((type) => [type, group.colour] as const)),
)
for (const block of CANVAS3D_BLOCKS) {
  const colour = COLOUR_BY_TYPE.get(block.type)
  if (colour) block.colour = colour
}

// O contrato central vence as anotações locais: nível, toolbox e lifecycle
// passam a ler a mesma classificação quando um bloco novo é acrescentado.
const START_ONLY_TYPES = new Set<string>(CANVAS3D_START_ONLY_BLOCK_TYPES)
const RESOURCE_CREATOR_TYPES = new Set<string>(CANVAS3D_RESOURCE_CREATOR_BLOCK_TYPES)
const CONTINUOUS_TYPES = new Set<string>(CANVAS3D_CONTINUOUS_BLOCK_TYPES)
for (const block of CANVAS3D_BLOCKS) {
  if (START_ONLY_TYPES.has(block.type)) block.placement = 'start-declaration'
  else if (RESOURCE_CREATOR_TYPES.has(block.type)) block.placement = 'resource-creator'
  else if (CONTINUOUS_TYPES.has(block.type)) block.placement = 'loop-command'
}
