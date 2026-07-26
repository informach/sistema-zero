/**
 * Contrato de domínio da categoria Canvas 3D. Definições, curadoria,
 * seletores, allowlist, geração e validação leem estes metadados para que um
 * bloco novo não precise ser classificado à mão em cada camada.
 */
export const CANVAS3D_BLOCK_TYPES = [
  'sz_t3d_import',
  'sz_t3d_new_var',
  'sz_t3d_new',
  'sz_t3d_import_named',
  'sz_t3d_scene_create',
  'sz_t3d_renderer_create',
  'sz_t3d_camera_create',
  'sz_t3d_light_create',
  'sz_t3d_set_position',
  'sz_t3d_set_rotation',
  'sz_t3d_rotate_axis',
  'sz_t3d_set_scale',
  'sz_t3d_look_at',
  'sz_t3d_set_visible',
  'sz_t3d_add_to',
  'sz_t3d_set_color',
  'sz_t3d_set_background',
  'sz_t3d_set_fog',
  'sz_t3d_lerp_position',
  'sz_t3d_set_shadow',
  'sz_t3d_set_intensity',
  'sz_t3d_renderer_size',
  'sz_t3d_enable_shadows',
  'sz_t3d_render',
  'sz_t3d_mount_renderer',
  'sz_t3d_set_matrix_at',
  'sz_t3d_instances_dirty',
  'sz_t3d_load_model',
  'sz_t3d_load_sound',
  'sz_t3d_traverse',
  'sz_t3d_renderer_config',
  'sz_t3d_renderer_responsive',
  'sz_t3d_load_environment',
  'sz_t3d_dispose_object',
  'sz_t3d_bloom_setup',
  'sz_t3d_render_effects',
  'sz_t3d_particles',
  'sz_t3d_water',
  'sz_t3d_water_wave',
  'sz_t3d_grass',
  'sz_t3d_sign',
  'sz_t3d_grass_wave',
  'sz_t3d_primitive',
  'sz_t3d_terrain',
  'sz_t3d_road',
  'sz_t3d_building',
  'sz_t3d_city',
  'sz_t3d_physics_setup',
  'sz_t3d_physics_static_box',
  'sz_t3d_physics_body',
  'sz_t3d_physics_static_sphere',
  'sz_t3d_physics_static_object',
  'sz_t3d_physics_static_city',
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
  'sz_t3d_debug_grid',
  'sz_t3d_debug_axes',
  'sz_t3d_set_wireframe',
  'sz_t3d_object_count',
] as const

export type Canvas3DBlockType = (typeof CANVAS3D_BLOCK_TYPES)[number]

/** Papéis dos recursos do Canvas 3D. Um nome pode cumprir mais de um papel. */
export type Canvas3DSymbolKind =
  | 'scene3d'
  | 'renderer3d'
  | 'camera3d'
  | 'perspective-camera3d'
  | 'light3d'
  | 'composer3d'
  | 'object3d'
  | 'loader3d'
  | 'model-loader3d'
  | 'audio-loader3d'
  | 'water3d'
  | 'grass3d'
  | 'instanced-mesh3d'
  | 'color-target3d'
  | 'shadow-caster3d'
  | 'shadow-receiver3d'
  | 'physics-collider3d'
  | 'physics-city3d'
  | 'physics-world'

export type Canvas3DReferenceKind =
  | Canvas3DSymbolKind
  | 'canvas'
  | 'function'
  | 'physics-body-id'
  | 'physics-character-id'
  | 'physics-resource-id'

export interface Canvas3DSymbolField {
  field: string
  kinds: readonly Canvas3DSymbolKind[]
}

export interface Canvas3DReferenceField {
  field: string
  kind: Canvas3DReferenceKind
  ownerField?: string
}

export interface Canvas3DPhysicsIdDeclarationField {
  field: string
  ownerField: string
  kinds: readonly ('body' | 'resource')[]
}

/** Declarações dos blocos amigáveis, usadas pelos seletores e pela validação da IR. */
export const CANVAS3D_BLOCK_DECLARATIONS_BY_KIND: Readonly<
  Record<Canvas3DSymbolKind, Readonly<Record<string, readonly string[]>>>
> = {
  scene3d: { sz_t3d_scene_create: ['SCENE'] },
  renderer3d: { sz_t3d_renderer_create: ['RENDERER'] },
  camera3d: { sz_t3d_camera_create: ['CAMERA'] },
  'perspective-camera3d': { sz_t3d_camera_create: ['CAMERA'] },
  light3d: { sz_t3d_light_create: ['LIGHT'] },
  composer3d: { sz_t3d_bloom_setup: ['COMPOSER'] },
  object3d: {
    sz_t3d_scene_create: ['SCENE'],
    sz_t3d_camera_create: ['CAMERA'],
    sz_t3d_light_create: ['LIGHT'],
    sz_t3d_particles: ['PARTICLES'],
    sz_t3d_water: ['WATER'],
    sz_t3d_grass: ['GRASS'],
    sz_t3d_sign: ['SIGN'],
    sz_t3d_primitive: ['MESH'],
    sz_t3d_terrain: ['TERRAIN'],
    sz_t3d_road: ['ROAD'],
    sz_t3d_building: ['BUILDING'],
    sz_t3d_city: ['CITY'],
  },
  loader3d: {},
  'model-loader3d': {},
  'audio-loader3d': {},
  water3d: { sz_t3d_water: ['WATER'] },
  grass3d: { sz_t3d_grass: ['GRASS'] },
  'instanced-mesh3d': { sz_t3d_grass: ['GRASS'] },
  'color-target3d': { sz_t3d_light_create: ['LIGHT'] },
  'shadow-caster3d': {
    sz_t3d_light_create: ['LIGHT'],
    sz_t3d_water: ['WATER'],
    sz_t3d_grass: ['GRASS'],
    sz_t3d_sign: ['SIGN'],
    sz_t3d_primitive: ['MESH'],
    sz_t3d_terrain: ['TERRAIN'],
  },
  'shadow-receiver3d': {
    sz_t3d_primitive: ['MESH'],
    sz_t3d_terrain: ['TERRAIN'],
  },
  'physics-collider3d': {
    sz_t3d_primitive: ['MESH'],
    sz_t3d_building: ['BUILDING'],
  },
  'physics-city3d': { sz_t3d_city: ['CITY'] },
  'physics-world': { sz_t3d_physics_setup: ['WORLD'] },
}

/** Declarações equivalentes depois que os blocos viram IR semântica. */
export const CANVAS3D_SEMANTIC_DECLARATION_FIELDS: Readonly<
  Record<string, readonly Canvas3DSymbolField[]>
> = {
  threeSceneSetup: [{ field: 'scene', kinds: ['scene3d', 'object3d'] }],
  threeRendererSetup: [{ field: 'renderer', kinds: ['renderer3d'] }],
  threeCameraSetup: [{ field: 'camera', kinds: ['camera3d', 'perspective-camera3d', 'object3d'] }],
  threeLightSetup: [{ field: 'light', kinds: ['light3d', 'object3d', 'color-target3d'] }],
  bloomSetup: [{ field: 'composer', kinds: ['composer3d'] }],
  particlesSetup: [{ field: 'particles', kinds: ['object3d'] }],
  waterSetup: [{ field: 'water', kinds: ['object3d', 'water3d'] }],
  grassSetup: [{ field: 'grass', kinds: ['object3d', 'grass3d', 'instanced-mesh3d'] }],
  signSetup: [{ field: 'sign', kinds: ['object3d'] }],
  primitiveSetup: [{ field: 'mesh', kinds: ['object3d', 'physics-collider3d'] }],
  terrainSetup: [{ field: 'terrain', kinds: ['object3d'] }],
  roadSetup: [{ field: 'road', kinds: ['object3d'] }],
  buildingSetup: [{ field: 'building', kinds: ['object3d', 'physics-collider3d'] }],
  citySetup: [{ field: 'city', kinds: ['object3d', 'physics-city3d'] }],
  physicsLiteSetup: [{ field: 'world', kinds: ['physics-world'] }],
}

/** Referências que só aceitam recursos do papel indicado. */
export const CANVAS3D_SEMANTIC_REFERENCE_FIELDS: Readonly<
  Record<string, readonly Canvas3DReferenceField[]>
> = {
  threeRendererSetup: [{ field: 'canvas', kind: 'canvas' }],
  threeCameraSetup: [{ field: 'canvas', kind: 'canvas' }],
  threeLightSetup: [{ field: 'scene', kind: 'scene3d' }],
  rendererConfig: [{ field: 'renderer', kind: 'renderer3d' }],
  rendererResponsive: [
    { field: 'renderer', kind: 'renderer3d' },
    { field: 'camera', kind: 'perspective-camera3d' },
    { field: 'composer', kind: 'composer3d' },
  ],
  environmentLoad: [{ field: 'scene', kind: 'scene3d' }],
  disposeObject: [{ field: 'object', kind: 'object3d' }],
  lerpPosition: [{ field: 'object', kind: 'object3d' }],
  bloomSetup: [
    { field: 'renderer', kind: 'renderer3d' },
    { field: 'scene', kind: 'scene3d' },
    { field: 'camera', kind: 'camera3d' },
  ],
  particlesSetup: [{ field: 'scene', kind: 'scene3d' }],
  waterSetup: [{ field: 'scene', kind: 'scene3d' }],
  waterTime: [{ field: 'water', kind: 'water3d' }],
  grassSetup: [{ field: 'scene', kind: 'scene3d' }],
  grassTime: [{ field: 'grass', kind: 'grass3d' }],
  signSetup: [{ field: 'scene', kind: 'scene3d' }],
  primitiveSetup: [{ field: 'scene', kind: 'scene3d' }],
  terrainSetup: [{ field: 'scene', kind: 'scene3d' }],
  roadSetup: [
    { field: 'scene', kind: 'scene3d' },
    { field: 'heightFunction', kind: 'function' },
  ],
  buildingSetup: [
    { field: 'scene', kind: 'scene3d' },
    { field: 'heightFunction', kind: 'function' },
  ],
  citySetup: [
    { field: 'scene', kind: 'scene3d' },
    { field: 'heightFunction', kind: 'function' },
  ],
  physicsLiteSetup: [{ field: 'heightFunction', kind: 'function' }],
  physicsLiteStaticBox: [{ field: 'world', kind: 'physics-world' }],
  physicsLiteStaticSphere: [{ field: 'world', kind: 'physics-world' }],
  physicsLiteStaticObject: [
    { field: 'world', kind: 'physics-world' },
    { field: 'object', kind: 'physics-collider3d' },
  ],
  physicsLiteStaticCity: [
    { field: 'world', kind: 'physics-world' },
    { field: 'city', kind: 'physics-city3d' },
  ],
  physicsLiteBody: [
    { field: 'world', kind: 'physics-world' },
    { field: 'object', kind: 'object3d' },
  ],
  physicsLiteMove: [
    { field: 'world', kind: 'physics-world' },
    { field: 'id', kind: 'physics-character-id', ownerField: 'world' },
  ],
  physicsLiteJump: [
    { field: 'world', kind: 'physics-world' },
    { field: 'id', kind: 'physics-character-id', ownerField: 'world' },
  ],
  physicsLiteTrigger: [{ field: 'world', kind: 'physics-world' }],
  physicsLiteStep: [{ field: 'world', kind: 'physics-world' }],
  physicsLiteVelocity: [
    { field: 'world', kind: 'physics-world' },
    { field: 'id', kind: 'physics-body-id', ownerField: 'world' },
  ],
  physicsLiteImpulse: [
    { field: 'world', kind: 'physics-world' },
    { field: 'id', kind: 'physics-body-id', ownerField: 'world' },
  ],
  physicsLiteTeleport: [
    { field: 'world', kind: 'physics-world' },
    { field: 'id', kind: 'physics-body-id', ownerField: 'world' },
  ],
  physicsLiteRemove: [
    { field: 'world', kind: 'physics-world' },
    { field: 'id', kind: 'physics-resource-id', ownerField: 'world' },
  ],
  physicsLiteClear: [{ field: 'world', kind: 'physics-world' }],
  physicsLiteCollisionEvent: [{ field: 'world', kind: 'physics-world' }],
  physicsLiteTriggerEvent: [{ field: 'world', kind: 'physics-world' }],
  physicsLiteRaycast: [{ field: 'world', kind: 'physics-world' }],
  physicsLiteBodyState: [
    { field: 'world', kind: 'physics-world' },
    { field: 'id', kind: 'physics-body-id', ownerField: 'world' },
  ],
  physicsLiteStats: [{ field: 'world', kind: 'physics-world' }],
  mountRenderer: [{ field: 'renderer', kind: 'renderer3d' }],
}

/** IDs que passam a existir dentro de um mundo físico após cada declaração. */
export const CANVAS3D_SEMANTIC_PHYSICS_ID_DECLARATION_FIELDS: Readonly<
  Record<string, readonly Canvas3DPhysicsIdDeclarationField[]>
> = {
  physicsLiteStaticBox: [{ field: 'id', ownerField: 'world', kinds: ['resource'] }],
  physicsLiteStaticSphere: [{ field: 'id', ownerField: 'world', kinds: ['resource'] }],
  physicsLiteStaticObject: [{ field: 'id', ownerField: 'world', kinds: ['resource'] }],
  physicsLiteBody: [{ field: 'id', ownerField: 'world', kinds: ['body', 'resource'] }],
  physicsLiteTrigger: [{ field: 'id', ownerField: 'world', kinds: ['resource'] }],
}

const OBJECT3D_CLASS_NAMES = new Set([
  'Scene',
  'PerspectiveCamera',
  'OrthographicCamera',
  'Mesh',
  'Group',
  'Object3D',
  'InstancedMesh',
  'Points',
  'LineSegments',
  'Sprite',
  'DirectionalLight',
  'AmbientLight',
  'HemisphereLight',
  'PointLight',
  'SpotLight',
  'AudioListener',
  'Audio',
  'PositionalAudio',
  'Water',
  'Sky',
  'CSS2DObject',
  'Reflector',
  'Line2',
])

const MODEL_LOADER_CLASS_NAMES = new Set([
  'GLTFLoader',
  'FBXLoader',
  'OBJLoader',
  'ColladaLoader',
  'PLYLoader',
  'STLLoader',
])

const COLOR_TARGET_MATERIAL_CLASS_NAMES = new Set([
  'LineBasicMaterial',
  'LineDashedMaterial',
  'LineMaterial',
  'MeshBasicMaterial',
  'MeshLambertMaterial',
  'MeshMatcapMaterial',
  'MeshPhongMaterial',
  'MeshPhysicalMaterial',
  'MeshStandardMaterial',
  'MeshToonMaterial',
  'PointsMaterial',
  'ShadowMaterial',
  'SpriteMaterial',
])

/**
 * Objetos matemáticos pequenos não possuem lifecycle próprio e são seguros como
 * valores temporários. Os demais construtores Three/addon criam estado ou recursos
 * que precisam nascer fora do laço de animação.
 */
const CANVAS3D_TEMPORARY_VALUE_CLASS_NAMES: ReadonlySet<string> = new Set([
  'Box2',
  'Box3',
  'Color',
  'Cylindrical',
  'Euler',
  'Frustum',
  'Line3',
  'Matrix3',
  'Matrix4',
  'Plane',
  'Quaternion',
  'Ray',
  'Sphere',
  'Spherical',
  'Triangle',
  'Vector2',
  'Vector3',
  'Vector4',
])

export function isCanvas3DResourceCreatorExpression(
  expression: {
    type: string
    className?: string
    namespace?: string
  },
  importedClassNames: ReadonlySet<string> = new Set(),
): boolean {
  if (expression.type !== 'newExpr') return false
  const className = expression.className?.trim() ?? ''
  const namespace = expression.namespace?.trim() ?? ''
  const belongsToCanvas3D =
    namespace === 'THREE' || (!namespace && importedClassNames.has(className))
  return belongsToCanvas3D && !CANVAS3D_TEMPORARY_VALUE_CLASS_NAMES.has(className)
}

/** Classifica o construtor técnico sem depender da UI do seletor de classes. */
export function canvas3DSymbolKindsForClass(rawClass: string): readonly Canvas3DSymbolKind[] {
  const className = rawClass.trim().split('.').at(-1) ?? ''
  if (className === 'Scene') return ['scene3d', 'object3d']
  if (className === 'PerspectiveCamera') return ['camera3d', 'perspective-camera3d', 'object3d']
  if (className.endsWith('Camera')) return ['camera3d', 'object3d']
  if (className === 'WebGLRenderer' || className === 'WebGPURenderer') return ['renderer3d']
  if (className.endsWith('Light') || className.endsWith('LightProbe')) {
    const kinds: Canvas3DSymbolKind[] = ['light3d', 'object3d', 'color-target3d']
    if (['DirectionalLight', 'PointLight', 'SpotLight'].includes(className)) {
      kinds.push('shadow-caster3d')
    }
    return kinds
  }
  if (className === 'EffectComposer') return ['composer3d']
  if (className === 'AudioLoader') return ['loader3d', 'audio-loader3d']
  if (MODEL_LOADER_CLASS_NAMES.has(className)) return ['loader3d', 'model-loader3d']
  if (className.endsWith('Loader')) return ['loader3d']
  if (COLOR_TARGET_MATERIAL_CLASS_NAMES.has(className)) return ['color-target3d']
  if (className === 'InstancedMesh') {
    return ['object3d', 'instanced-mesh3d', 'shadow-caster3d', 'shadow-receiver3d']
  }
  if (className === 'Mesh') return ['object3d', 'shadow-caster3d', 'shadow-receiver3d']
  if (className === 'Water' || className === 'Reflector') {
    return ['object3d', 'shadow-caster3d']
  }
  return OBJECT3D_CLASS_NAMES.has(className) ? ['object3d'] : []
}

export const CANVAS3D_START_ONLY_BLOCK_TYPES: readonly Canvas3DBlockType[] = [
  'sz_t3d_import',
  'sz_t3d_import_named',
]

/** Atualizações que precisam de um loop ou de uma função chamada por um loop. */
export const CANVAS3D_CONTINUOUS_BLOCK_TYPES = [
  'sz_t3d_water_wave',
  'sz_t3d_grass_wave',
  'sz_t3d_physics_step',
] as const satisfies readonly Canvas3DBlockType[]

/** Blocos que mantêm recursos e, portanto, não podem ser recriados por quadro. */
export const CANVAS3D_RESOURCE_CREATOR_BLOCK_TYPES: readonly Canvas3DBlockType[] = [
  'sz_t3d_new_var',
  'sz_t3d_scene_create',
  'sz_t3d_renderer_create',
  'sz_t3d_camera_create',
  'sz_t3d_light_create',
  'sz_t3d_renderer_responsive',
  'sz_t3d_load_environment',
  'sz_t3d_load_model',
  'sz_t3d_load_sound',
  'sz_t3d_bloom_setup',
  'sz_t3d_particles',
  'sz_t3d_water',
  'sz_t3d_grass',
  'sz_t3d_sign',
  'sz_t3d_primitive',
  'sz_t3d_terrain',
  'sz_t3d_road',
  'sz_t3d_building',
  'sz_t3d_city',
  'sz_t3d_physics_setup',
  'sz_t3d_physics_static_box',
  'sz_t3d_physics_static_sphere',
  'sz_t3d_physics_static_object',
  'sz_t3d_physics_static_city',
  'sz_t3d_physics_body',
  'sz_t3d_physics_trigger',
]

/** Campos que introduzem nomes globais visíveis nos seletores. */
export const CANVAS3D_VARIABLE_DECLARATION_FIELDS: Readonly<
  Partial<Record<Canvas3DBlockType, readonly string[]>>
> = {
  sz_t3d_new_var: ['VARNAME'],
  sz_t3d_scene_create: ['SCENE'],
  sz_t3d_renderer_create: ['RENDERER'],
  sz_t3d_camera_create: ['CAMERA'],
  sz_t3d_light_create: ['LIGHT'],
  sz_t3d_renderer_responsive: ['CLEANUP'],
  sz_t3d_load_environment: ['TEXTURE'],
  sz_t3d_bloom_setup: ['COMPOSER'],
  sz_t3d_particles: ['PARTICLES'],
  sz_t3d_water: ['WATER'],
  sz_t3d_grass: ['GRASS'],
  sz_t3d_sign: ['SIGN'],
  sz_t3d_primitive: ['MESH'],
  sz_t3d_terrain: ['TERRAIN'],
  sz_t3d_road: ['ROAD'],
  sz_t3d_building: ['BUILDING'],
  sz_t3d_city: ['CITY'],
  sz_t3d_physics_setup: ['WORLD'],
  sz_t3d_physics_raycast: ['RESULT'],
  sz_t3d_physics_body_state: ['RESULT'],
  sz_t3d_physics_stats: ['RESULT'],
}

/** IDs de corpos que aceitam movimento, impulso, teleporte e leitura de estado. */
export const CANVAS3D_PHYSICS_BODY_DECLARATION_FIELDS: Readonly<
  Partial<Record<Canvas3DBlockType, readonly string[]>>
> = {
  sz_t3d_physics_body: ['ID'],
}

/** IDs explícitos que podem ser removidos do mundo físico. */
export const CANVAS3D_PHYSICS_RESOURCE_DECLARATION_FIELDS: Readonly<
  Partial<Record<Canvas3DBlockType, readonly string[]>>
> = {
  sz_t3d_physics_static_box: ['ID'],
  sz_t3d_physics_static_sphere: ['ID'],
  sz_t3d_physics_static_object: ['ID'],
  sz_t3d_physics_body: ['ID'],
  sz_t3d_physics_trigger: ['ID'],
}

export const CANVAS3D_FUNCTION_DECLARATION_FIELDS: Readonly<
  Partial<Record<Canvas3DBlockType, readonly string[]>>
> = {
  sz_t3d_terrain: ['HEIGHT_FN'],
}

export type Canvas3DBranchBinders = Readonly<Record<string, readonly string[]>>

/** Parâmetros locais de valor, separados pela boca que define seu escopo. */
export const CANVAS3D_VARIABLE_BRANCH_BINDERS: Readonly<
  Partial<Record<Canvas3DBlockType, Canvas3DBranchBinders>>
> = {
  sz_t3d_traverse: { DO: ['PARAM'] },
  sz_t3d_load_model: { DO: ['PARAM'], DO_ERROR: ['ERROR_PARAM'] },
  sz_t3d_load_sound: { DO: ['PARAM'], DO_ERROR: ['ERROR_PARAM'] },
  sz_t3d_physics_on_collision: { DO: ['BODY_PARAM', 'COLLIDER_PARAM'] },
  sz_t3d_physics_on_trigger: { DO: ['BODY_PARAM', 'TRIGGER_PARAM', 'ENTERING_PARAM'] },
}

/** Parâmetros que também representam um objeto 3D dentro do ramo. */
export const CANVAS3D_OBJECT_BRANCH_BINDERS: Readonly<
  Partial<Record<Canvas3DBlockType, Canvas3DBranchBinders>>
> = {
  sz_t3d_traverse: { DO: ['PARAM'] },
}

export const CANVAS3D_SEMANTIC_STATEMENT_TYPES = [
  'threeSceneSetup',
  'threeRendererSetup',
  'threeCameraSetup',
  'threeLightSetup',
  'rendererConfig',
  'rendererResponsive',
  'environmentLoad',
  'disposeObject',
  'lerpPosition',
  'bloomSetup',
  'particlesSetup',
  'waterSetup',
  'waterTime',
  'grassSetup',
  'grassTime',
  'signSetup',
  'primitiveSetup',
  'terrainSetup',
  'roadSetup',
  'buildingSetup',
  'citySetup',
  'physicsLiteSetup',
  'physicsLiteStaticBox',
  'physicsLiteStaticSphere',
  'physicsLiteStaticObject',
  'physicsLiteStaticCity',
  'physicsLiteBody',
  'physicsLiteMove',
  'physicsLiteJump',
  'physicsLiteTrigger',
  'physicsLiteStep',
  'physicsLiteVelocity',
  'physicsLiteImpulse',
  'physicsLiteTeleport',
  'physicsLiteRemove',
  'physicsLiteClear',
  'physicsLiteCollisionEvent',
  'physicsLiteTriggerEvent',
  'physicsLiteRaycast',
  'physicsLiteBodyState',
  'physicsLiteStats',
] as const

export const CANVAS3D_CONTINUOUS_STATEMENT_TYPES: ReadonlySet<string> = new Set([
  'waterTime',
  'grassTime',
  'physicsLiteStep',
])

export const CANVAS3D_RESOURCE_CREATOR_TYPES: ReadonlySet<string> = new Set([
  'threeSceneSetup',
  'threeRendererSetup',
  'threeCameraSetup',
  'threeLightSetup',
  'rendererResponsive',
  'bloomSetup',
  'particlesSetup',
  'waterSetup',
  'grassSetup',
  'signSetup',
  'primitiveSetup',
  'terrainSetup',
  'roadSetup',
  'buildingSetup',
  'citySetup',
  'environmentLoad',
  'loaderLoad',
  'physicsLiteSetup',
  'physicsLiteStaticBox',
  'physicsLiteStaticSphere',
  'physicsLiteStaticObject',
  'physicsLiteStaticCity',
  'physicsLiteBody',
  'physicsLiteTrigger',
])

/** Classifica recursos condicionais que compartilham um nó IR genérico. */
export function isCanvas3DResourceCreatorStatement(
  statement: {
    type: string
    namespace?: string
    className?: string
  },
  importedClassNames: ReadonlySet<string> = new Set(),
): boolean {
  return (
    CANVAS3D_RESOURCE_CREATOR_TYPES.has(statement.type) ||
    (statement.type === 'newInstance' &&
      isCanvas3DResourceCreatorExpression(
        {
          type: 'newExpr',
          namespace: statement.namespace,
          className: statement.className,
        },
        importedClassNames,
      ))
  )
}
