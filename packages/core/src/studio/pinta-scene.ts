import { z } from 'zod'

/** Orçamento do destino JS; os documentos e os exportadores externos podem aceitar mais. */
export const PINTA_SCENE_MAX_CHARS = 2_097_152
export const PINTA_SCENE_LIMITS = {
  cols: 256,
  rows: 256,
  layers: 32,
  tiles: 256,
  cells: 2_097_152,
  objects: 512,
} as const
const id = z.string().min(1).max(200)
const finite = z.number().finite()
const point = z.strictObject({ x: finite, y: finite })
export const PINTA_SCENE_MAX_PROPERTIES = 16
export const PINTA_SCENE_PROPERTY_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/
export const PINTA_SCENE_COLOR_PATTERN = /^#[\da-f]{6}$/i
export const PINTA_SCENE_PROPERTY_COLOR_PATTERN = /^#[\da-f]{6}([\da-f]{2})?$/i
export const PintaScenePropertySchema = z.union([
  z.string().max(200),
  finite,
  z.boolean(),
  z
    .strictObject({
      type: z.enum(['int', 'float', 'color', 'object', 'asset']),
      value: z.union([id, finite]),
    })
    .refine(
      (p) =>
        p.type === 'int'
          ? typeof p.value === 'number' && Number.isInteger(p.value)
          : p.type === 'float'
            ? typeof p.value === 'number'
            : p.type === 'color'
              ? typeof p.value === 'string' && PINTA_SCENE_PROPERTY_COLOR_PATTERN.test(p.value)
              : typeof p.value === 'string',
      'Tipo e valor da propriedade não correspondem.',
    ),
])
const properties = z
  .record(z.string().regex(PINTA_SCENE_PROPERTY_KEY_PATTERN), PintaScenePropertySchema)
  .refine((v) => Object.keys(v).length <= PINTA_SCENE_MAX_PROPERTIES)
export const PintaSceneObjectSchema = z.strictObject({
  id,
  name: z.string().max(48),
  type: z.string().max(48),
  x: finite,
  y: finite,
  width: finite.nonnegative(),
  height: finite.nonnegative(),
  properties,
  shape: z.enum(['point', 'rect', 'ellipse', 'polygon', 'polyline', 'art', 'set']).optional(),
  points: z.array(point).max(256).optional(),
  rotation: finite.optional(),
  flipX: z.literal(true).optional(),
  flipY: z.literal(true).optional(),
  art: z
    .strictObject({
      assetId: id,
      tile: z.number().int().min(0).max(255).optional(),
      animationId: id.optional(),
    })
    .optional(),
  setId: id.optional(),
  role: z.enum(['start', 'danger', 'door', 'path', 'trigger', 'enemy', 'region']).optional(),
  collision: z.literal(true).optional(),
})
const common = {
  id,
  name: z.string().max(48),
  visible: z.boolean(),
  parentId: id.optional(),
  locked: z.literal(true).optional(),
  opacity: finite.min(0).max(1).optional(),
  offsetX: finite.optional(),
  offsetY: finite.optional(),
  parallaxX: finite.min(0).max(16).optional(),
  parallaxY: finite.min(0).max(16).optional(),
  properties: properties.optional(),
}
export const PintaSceneLayerSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...common,
    kind: z.literal('tiles'),
    tilesetId: id,
    cells: z.array(z.number().int().min(-1).max(32767)).max(65536),
    front: z.literal(true).optional(),
    collision: z.literal(true).optional(),
  }),
  z.strictObject({
    ...common,
    kind: z.literal('objects'),
    objects: z.array(PintaSceneObjectSchema).max(512),
  }),
  z.strictObject({ ...common, kind: z.literal('group') }),
])
const animation = z
  .array(
    z.strictObject({
      tile: z.number().int().min(0).max(255),
      duration: z.number().int().min(16).max(60000),
    }),
  )
  .min(1)
  .max(64)
export const PintaSceneTilesetSchema = z.strictObject({
  id,
  name: z.string().max(48),
  image: z.string().min(1).max(800000),
  columns: z.number().int().min(1).max(256),
  count: z.number().int().min(1).max(256),
  solid: z.array(z.number().int().min(0).max(255)).max(256),
  platform: z.array(z.number().int().min(0).max(255)).max(256),
  animations: z.record(z.string(), animation).optional(),
  tileProperties: z.record(z.string(), properties).optional(),
  terrains: z
    .array(
      z.strictObject({
        id,
        name: z.string().max(48),
        mode: z.enum(['corner', 'edge', 'mixed']),
        colors: z.array(z.string().regex(PINTA_SCENE_COLOR_PATTERN)).max(15),
        tiles: z.record(z.string(), z.array(z.number().int().min(0).max(15)).length(8)),
      }),
    )
    .max(16)
    .optional(),
})
const piece = {
  id,
  cols: z.number().int().min(1).max(256),
  rows: z.number().int().min(1).max(256),
  layers: z.array(PintaSceneLayerSchema).max(32),
}
export const PintaSceneSpriteSchema = z.strictObject({
  frameWidth: z.number().int().min(1).max(512),
  frameHeight: z.number().int().min(1).max(512),
  columns: z.number().int().min(1).max(64),
  animations: z
    .array(
      z.strictObject({
        id,
        name: z.string().max(48),
        loop: z.boolean(),
        frames: z
          .array(
            z.strictObject({
              tile: z.number().int().min(0).max(4095),
              duration: finite.positive().max(60000),
            }),
          )
          .min(1)
          .max(64),
      }),
    )
    .min(1)
    .max(64),
})
export const PintaSceneBaseSchema = z.strictObject({
  version: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  id,
  name: z.string().max(48),
  tileSize: z.number().int().min(1).max(128),
  cols: piece.cols,
  rows: piece.rows,
  tilesets: z.array(PintaSceneTilesetSchema).min(1).max(32),
  layers: piece.layers,
  sets: z.array(z.strictObject(piece)).max(64).optional(),
  art: z
    .array(
      z.strictObject({
        id,
        image: z.string().min(1).max(800000),
        width: z.number().positive(),
        height: z.number().positive(),
        sprite: PintaSceneSpriteSchema.optional(),
      }),
    )
    .max(128)
    .optional(),
  resources: z
    .array(z.strictObject({ id, sourceId: id, capturedAt: z.number().int().nonnegative() }))
    .max(32)
    .optional(),
})

/** Shared semantic checks; each cell format owns its shape, bounds and payload admission. */
export type PintaSceneCellsLayer<Cells> =
  | Exclude<z.infer<typeof PintaSceneLayerSchema>, { kind: 'tiles' }>
  | (Omit<Extract<z.infer<typeof PintaSceneLayerSchema>, { kind: 'tiles' }>, 'cells'> & {
      cells: Cells
    })
export type PintaSceneCellsDocument<Cells> = Omit<
  z.infer<typeof PintaSceneBaseSchema>,
  'version' | 'layers' | 'sets'
> & {
  version: number
  layers: PintaSceneCellsLayer<Cells>[]
  sets?: Array<{ id: string; cols: number; rows: number; layers: PintaSceneCellsLayer<Cells>[] }>
}
export function validatePintaSceneCells<Cells>(
  s: PintaSceneCellsDocument<Cells>,
  ctx: Pick<z.RefinementCtx, 'addIssue'>,
  policy: {
    count(cells: Cells): number
    valid(cells: Cells, cols: number, rows: number, tileCount: number): boolean
  },
): void {
  const allLayers = [s.layers, ...(s.sets ?? []).map((v) => v.layers)].flat()
  if (
    s.version < 3 &&
    allLayers.some(
      (layer) => layer.kind === 'objects' && layer.objects.some((object) => object.collision),
    )
  )
    ctx.addIssue({ code: 'custom', message: 'Colisão de objeto exige cena 3.' })
  if (
    s.version === 1 &&
    (s.resources?.length ||
      s.art?.some((a) => a.sprite) ||
      allLayers.some((l) => l.kind === 'objects' && l.objects.some((o) => o.art?.animationId)))
  )
    ctx.addIssue({
      code: 'custom',
      message: 'Animações de objetos e versões de recursos exigem cena 2.',
    })
  for (const a of s.art ?? []) {
    if (!a.sprite) continue
    const sprite = a.sprite
    const animationIds = sprite.animations.map((v) => v.id)
    if (
      new Set(animationIds).size !== animationIds.length ||
      a.width % sprite.frameWidth ||
      a.height % sprite.frameHeight ||
      a.width !== sprite.columns * sprite.frameWidth ||
      sprite.animations.some((v) =>
        v.frames.some((f) => f.tile >= (sprite.columns * a.height) / sprite.frameHeight),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'A folha de animação do objeto é inválida.' })
  }
  if (
    s.resources &&
    (new Set(s.resources.map((r) => r.id)).size !== s.resources.length ||
      s.resources.some(
        (r) => r.id === r.sourceId || ![...s.tilesets, ...(s.art ?? [])].some((a) => a.id === r.id),
      ))
  )
    ctx.addIssue({ code: 'custom', message: 'Versões de recursos inválidas.' })
  const sets = new Set(s.tilesets.map((t) => t.id))
  const unique = (values: string[]) => new Set(values).size === values.length
  if (
    !unique([...s.tilesets.map((t) => t.id), ...(s.art ?? []).map((a) => a.id)]) ||
    !unique((s.sets ?? []).map((v) => v.id))
  )
    ctx.addIssue({ code: 'custom', message: 'Referências de desenhos duplicadas.' })
  for (const t of s.tilesets) {
    const indices = [
      ...t.solid,
      ...t.platform,
      ...Object.keys(t.animations ?? {}).map(Number),
      ...Object.values(t.animations ?? {}).flatMap((a) => a.map((f) => f.tile)),
      ...Object.keys(t.tileProperties ?? {}).map(Number),
      ...(t.terrains ?? []).flatMap((g) => Object.keys(g.tiles).map(Number)),
    ]
    if (
      indices.some((n) => !Number.isInteger(n) || n < 0 || n >= t.count) ||
      (t.terrains ?? []).some((g) =>
        Object.values(g.tiles).some((v) => v.some((c) => c > g.colors.length)),
      )
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Metadados apontam para peças ou cores inexistentes.',
      })
  }
  const validate = (cols: number, rows: number, layers: PintaSceneCellsLayer<Cells>[]) => {
    const groups = new Set<string>(),
      ids = new Set<string>()
    let cells = 0
    for (const l of layers) {
      if (ids.has(l.id) || (l.parentId && !groups.has(l.parentId)))
        ctx.addIssue({ code: 'custom', message: 'Árvore de camadas inválida.' })
      ids.add(l.id)
      if (l.kind === 'group') groups.add(l.id)
      if (l.kind === 'objects') {
        if (!unique(l.objects.map((o) => o.id)))
          ctx.addIssue({ code: 'custom', message: 'Objetos duplicados.' })
        for (const o of l.objects) {
          if (
            o.art?.animationId &&
            !(s.art ?? []).some(
              (a) =>
                a.id === o.art!.assetId &&
                a.sprite?.animations.some((v) => v.id === o.art!.animationId),
            )
          )
            ctx.addIssue({ code: 'custom', message: 'A animação do objeto não foi encontrada.' })
          if (
            (o.setId && !(s.sets ?? []).some((v) => v.id === o.setId)) ||
            (o.art &&
              !sets.has(o.art.assetId) &&
              !(s.art ?? []).some((a) => a.id === o.art!.assetId))
          )
            ctx.addIssue({ code: 'custom', message: 'Desenho do objeto não encontrado.' })
          if (
            o.art?.tile != null &&
            sets.has(o.art.assetId) &&
            o.art.tile >= (s.tilesets.find((t) => t.id === o.art!.assetId)?.count ?? 0)
          )
            ctx.addIssue({ code: 'custom', message: 'Peça do objeto não encontrada.' })
        }
      }
      if (l.kind === 'tiles') {
        cells += policy.count(l.cells)
        const ts = s.tilesets.find((t) => t.id === l.tilesetId)
        if (!sets.has(l.tilesetId) || !policy.valid(l.cells, cols, rows, ts?.count ?? 0))
          ctx.addIssue({ code: 'custom', message: 'Peças ou dimensões da camada inválidas.' })
      }
    }
    if (cells > PINTA_SCENE_LIMITS.cells)
      ctx.addIssue({ code: 'custom', message: 'O cenário passou do orçamento de células.' })
  }
  validate(s.cols, s.rows, s.layers)
  for (const set of s.sets ?? []) {
    validate(set.cols, set.rows, set.layers)
    if (set.layers.some((l) => l.kind === 'objects' && l.objects.some((o) => o.setId)))
      ctx.addIssue({ code: 'custom', message: 'Conjuntos não podem conter outros conjuntos.' })
  }
}

export const PintaSceneSchema = PintaSceneBaseSchema.superRefine((scene, ctx) =>
  validatePintaSceneCells(scene, ctx, {
    count: (cells) => cells.length,
    valid: (cells, cols, rows, tileCount) =>
      cells.length === cols * rows &&
      !cells.some((cell) => cell >= 0 && (cell & 4095) >= tileCount),
  }),
)

export type PintaScene = z.infer<typeof PintaSceneSchema>
export type PintaSceneLayer = z.infer<typeof PintaSceneLayerSchema>
export type PintaSceneObject = z.infer<typeof PintaSceneObjectSchema>

export function readPintaScene(raw: unknown): PintaScene | null {
  const parsed = PintaSceneSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function sceneFitsStudio(scene: PintaScene): boolean {
  return JSON.stringify(scene).length <= PINTA_SCENE_MAX_CHARS
}
