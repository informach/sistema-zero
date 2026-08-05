import {
  BLOCK_LEVELS,
  SERVER_BLOCK_CATALOG,
  type ServerBlockCatalogEntry,
} from '@sistemazero/studio/server-catalog'
import {
  SERVER_MECHANIC_DOCUMENTS,
  type ServerMechanicDocument,
} from '@sistemazero/studio/server-knowledge'
import { z } from 'zod'
import type { StudioTier } from '../../lib/studio-tier'
import type { PensaStudioBlockReference, PensaTaskContext, PensaTaskGuide } from '../../lib/types'

const Id = z.string().trim().min(1).max(100)
const Short = z.string().trim().min(1).max(200)
const Text = z.string().trim().min(1).max(1200)

export const IdeaArtifactSchema = z.strictObject({
  title: z.string().trim().min(2).max(80),
  idea: Text,
  objective: Text,
  controls: z.array(Short).min(1).max(8),
  victory: Text,
  defeat: Text,
  dimension: z.enum(['2d', '3d']),
})

export const GameDesignArtifactSchema = z.strictObject({
  coreLoop: z.array(Short).min(2).max(8),
  scenes: z
    .array(z.strictObject({ id: Id, name: Short, purpose: Text }))
    .min(1)
    .max(12),
  screens: z
    .array(z.strictObject({ id: Id, name: Short, purpose: Text }))
    .min(1)
    .max(12),
  camera: Text,
})

const AssetInventoryItemSchema = z.strictObject({
  id: Id,
  name: Short,
  kind: z.enum(['sprite', 'background', 'tileset', 'tilemap', 'model', 'world', 'material']),
  appearance: Text,
  animations: z.array(Short).max(12),
  states: z.array(Short).max(12),
  usage: Text,
})

export const VisualDirectionArtifactSchema = z.strictObject({
  style: Text,
  camera: Text,
  mood: Text,
  shapeLanguage: Text,
  palette: z
    .array(z.strictObject({ role: Short, color: z.string().regex(/^#[0-9A-Fa-f]{6}$/) }))
    .min(3)
    .max(12),
  visualRules: z.array(Short).min(2).max(12),
  screens: z
    .array(z.strictObject({ screenId: Id, description: Text }))
    .min(1)
    .max(12),
  assets: z.array(AssetInventoryItemSchema).min(1).max(40),
})

const GuideItemSchema = z.strictObject({
  id: Id,
  text: z.string().trim().min(1).max(500),
  hint: z.string().trim().max(500).optional(),
  required: z.boolean(),
})
export const TaskGuideSchema = z.strictObject({
  steps: z.array(GuideItemSchema).min(1).max(20),
  criteria: z.array(GuideItemSchema).min(1).max(10),
})

const PintaTaskContextSchema = z.strictObject({
  kind: z.literal('pinta'),
  assetId: Id,
  artKind: z.enum(['sprite', 'background', 'tileset', 'tilemap']),
  style: z.enum(['pixel', 'vector', 'either']),
  preset: z.string().trim().max(100).optional(),
  palette: z
    .array(z.strictObject({ role: Short, color: z.string().regex(/^#[0-9A-Fa-f]{6}$/) }))
    .max(16),
  appearance: Text,
  animations: z.array(Short).max(20),
  states: z.array(Short).max(20),
  usage: Text,
  requiresStudioUse: z.boolean(),
})

/** A IA retorna apenas IDs oficiais. Metadados dos blocos são sempre resolvidos no servidor. */
const StudioTaskContextDraftSchema = z.strictObject({
  kind: z.literal('studio'),
  dimension: z.enum(['2d', '3d']),
  visualAssetIds: z.array(Id).max(20),
  blockIds: z.array(z.string().trim().min(1).max(160)).max(40),
  mechanicDocumentIds: z.array(z.string().trim().min(1).max(100)).max(10),
  extensionIds: z.array(z.string().trim().min(1).max(100)).max(10),
})

export const TaskPlanDraftSchema = z.strictObject({
  tasks: z
    .array(
      z.strictObject({
        key: Id,
        title: z.string().trim().min(2).max(200),
        summary: z.string().trim().max(2000).nullable(),
        destination: z.enum(['pinta', 'studio']),
        category: z.enum(['art', 'setup', 'gameplay', 'scene', 'ui', 'polish']),
        estimatedMinutes: z.number().int().min(5).max(60),
        dependencies: z.array(Id).max(20),
        guide: TaskGuideSchema,
        context: z.discriminatedUnion('kind', [
          PintaTaskContextSchema,
          StudioTaskContextDraftSchema,
        ]),
      }),
    )
    .min(1)
    .max(60),
})

export const TaskPlanArtifactSchema = z.strictObject({
  taskIds: z.array(z.uuid()).min(1).max(60),
  generatedAt: z.iso.datetime(),
  catalog: z.literal('studio-official'),
})

export const PlanReviewArtifactSchema = z.strictObject({
  approved: z.boolean(),
  findings: z
    .array(
      z.strictObject({
        severity: z.enum(['info', 'warning', 'error']),
        message: z.string().trim().min(1).max(500),
        taskKey: Id.nullable(),
      }),
    )
    .max(60),
  recommendations: z.array(z.string().trim().min(1).max(500)).max(20),
  auditedAt: z.iso.datetime(),
})

export const jsonSchemaFor = (schema: z.ZodType) =>
  z.toJSONSchema(schema) as Record<string, unknown>

export type IdeaArtifact = z.infer<typeof IdeaArtifactSchema>
export type GameDesignArtifact = z.infer<typeof GameDesignArtifactSchema>
export type VisualDirectionArtifact = z.infer<typeof VisualDirectionArtifactSchema>
export type TaskPlanDraft = z.infer<typeof TaskPlanDraftSchema>
export type PlanReviewArtifact = z.infer<typeof PlanReviewArtifactSchema>

export interface ResolvedPlanTask {
  key: string
  title: string
  summary: string | null
  destination: 'pinta' | 'studio'
  category: 'art' | 'setup' | 'gameplay' | 'scene' | 'ui' | 'polish'
  estimatedMinutes: number
  dependencies: string[]
  guide: PensaTaskGuide
  context: PensaTaskContext
}

export class PensaCatalogDriftError extends Error {
  readonly code = 'PENSA_CATALOG_DRIFT'
}

function blockLevelAllowed(entry: ServerBlockCatalogEntry, tier: StudioTier): boolean {
  return BLOCK_LEVELS.indexOf(entry.level) <= BLOCK_LEVELS.indexOf(tier.level)
}

function dimensionAllows(entry: ServerBlockCatalogEntry, dimension: '2d' | '3d'): boolean {
  if (dimension === '3d') return true
  return (
    entry.extension !== 'game-3d' &&
    entry.extension !== 'game-3d-advanced' &&
    entry.extension !== 'world-3d' &&
    !entry.category.includes('3D')
  )
}

export function availablePlannerCatalog(tier: StudioTier, dimension: '2d' | '3d') {
  const allowBlocks = tier.allowBlocks ? new Set(tier.allowBlocks) : null
  const blocks = SERVER_BLOCK_CATALOG.filter((entry) => {
    if (!tier.allowedModes.includes('blocks')) return false
    if (!blockLevelAllowed(entry, tier) || !dimensionAllows(entry, dimension)) return false
    if (allowBlocks && !allowBlocks.has(entry.type)) return false
    return entry.extension === null || tier.allowedExtensions.includes(entry.extension)
  })
  const documents = SERVER_MECHANIC_DOCUMENTS.filter(
    (doc) =>
      tier.allowedExtensions.includes(doc.extension) &&
      (dimension === '3d' || !doc.extension.includes('3d')),
  )
  return { blocks, documents }
}

function resolveBlock(entry: ServerBlockCatalogEntry): PensaStudioBlockReference {
  return {
    id: entry.type,
    label: entry.label,
    category: entry.category,
    subcategory: entry.subcategory,
    area: entry.area,
    extension: entry.extension,
  }
}

function documentMap(documents: readonly ServerMechanicDocument[]) {
  return new Map(documents.map((document) => [document.extension, document]))
}

/** Valida IDs, disponibilidade pedagógica e ordem das dependências; nunca confia em rótulos da IA. */
export function resolveTaskPlan(
  raw: TaskPlanDraft,
  tier: StudioTier,
  dimension: '2d' | '3d',
): ResolvedPlanTask[] {
  const keys = new Set<string>()
  const seen = new Set<string>()
  for (const task of raw.tasks) {
    if (keys.has(task.key))
      throw new PensaCatalogDriftError(`Chave de tarefa duplicada: ${task.key}`)
    keys.add(task.key)
  }
  return raw.tasks.map((task) => {
    if (task.destination !== task.context.kind)
      throw new PensaCatalogDriftError('Destino e contexto divergem')
    if (task.dependencies.some((dependency) => !seen.has(dependency))) {
      throw new PensaCatalogDriftError(
        `A tarefa ${task.key} depende de uma tarefa inexistente ou posterior`,
      )
    }
    seen.add(task.key)
    if (task.context.kind === 'pinta') {
      return { ...task, context: task.context }
    }
    if (task.context.dimension !== dimension) {
      throw new PensaCatalogDriftError(`A tarefa ${task.key} usa a dimensão errada`)
    }
    const available = availablePlannerCatalog(tier, dimension)
    const blocks = new Map(available.blocks.map((entry) => [entry.type, entry]))
    const documents = documentMap(available.documents)
    const requestedBlocks = [...new Set(task.context.blockIds)]
    const resolvedBlocks = requestedBlocks.map((id) => {
      const entry = blocks.get(id)
      if (!entry) throw new PensaCatalogDriftError(`Bloco indisponível ou desconhecido: ${id}`)
      return resolveBlock(entry)
    })
    const requestedDocuments = [...new Set(task.context.mechanicDocumentIds)]
    for (const id of requestedDocuments) {
      if (!documents.has(id))
        throw new PensaCatalogDriftError(`Manual indisponível ou desconhecido: ${id}`)
    }
    const extensions = new Set(task.context.extensionIds)
    for (const block of resolvedBlocks) if (block.extension) extensions.add(block.extension)
    for (const id of requestedDocuments) extensions.add(id)
    for (const id of extensions) {
      if (!tier.allowedExtensions.includes(id))
        throw new PensaCatalogDriftError(`Extensão indisponível: ${id}`)
    }
    return {
      ...task,
      context: {
        kind: 'studio',
        dimension,
        visualAssetIds: [...new Set(task.context.visualAssetIds)],
        blockIds: requestedBlocks,
        blocks: resolvedBlocks,
        mechanicDocumentIds: requestedDocuments,
        extensionIds: [...extensions],
      },
    }
  })
}

const PINTA_ART_KINDS = new Set(['sprite', 'background', 'tileset', 'tilemap'])

/** Garante um Cartão de Criação — e somente um — para cada item da Bíblia Visual. */
export function validateVisualTaskCoverage(
  tasks: readonly ResolvedPlanTask[],
  visual: VisualDirectionArtifact,
): void {
  const inventory = new Map(visual.assets.map((asset) => [asset.id, asset]))
  if (inventory.size !== visual.assets.length)
    throw new PensaCatalogDriftError('A Bíblia Visual possui IDs de asset repetidos')
  const coverage = new Map<string, number>()
  for (const task of tasks) {
    if (task.context.kind === 'pinta') {
      const asset = inventory.get(task.context.assetId)
      if (!asset || !PINTA_ART_KINDS.has(asset.kind) || asset.kind !== task.context.artKind) {
        throw new PensaCatalogDriftError(
          `A tarefa ${task.key} não corresponde a uma arte 2D da Bíblia Visual`,
        )
      }
      coverage.set(asset.id, (coverage.get(asset.id) ?? 0) + 1)
      continue
    }
    for (const assetId of task.context.visualAssetIds) {
      const asset = inventory.get(assetId)
      if (!asset || PINTA_ART_KINDS.has(asset.kind)) {
        throw new PensaCatalogDriftError(
          `A tarefa ${task.key} atribui a arte ${assetId} à ferramenta errada`,
        )
      }
      coverage.set(asset.id, (coverage.get(asset.id) ?? 0) + 1)
    }
  }
  for (const asset of visual.assets) {
    if (coverage.get(asset.id) !== 1) {
      throw new PensaCatalogDriftError(
        `O asset ${asset.id} precisa de exatamente um Cartão de Criação`,
      )
    }
  }
}

export function plannerCatalogPrompt(tier: StudioTier, dimension: '2d' | '3d'): string {
  const { blocks, documents } = availablePlannerCatalog(tier, dimension)
  return [
    'BLOCOS OFICIAIS PERMITIDOS (use somente o ID antes de ::):',
    ...blocks.map(
      (block) =>
        `${block.type} :: ${block.label} :: ${block.category}/${block.subcategory} :: ${block.area}`,
    ),
    'MANUAIS/EXTENSÕES OFICIAIS PERMITIDOS (o ID é a extensão; siga apenas estas receitas):',
    ...documents.map((document) =>
      [
        `${document.extension} :: ${document.title}`,
        document.content,
        `FIM DO MANUAL ${document.extension}`,
      ].join('\n'),
    ),
  ].join('\n')
}
