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
  kind: z.enum(['sprite', 'background', 'tileset', 'tilemap', 'model', 'world', 'material', 'sky']),
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

// Campo sem valor é NULLABLE, nunca `.optional()`: o modo estrito do provider exige
// `required` com TODAS as chaves, e o z.toJSONSchema omite as opcionais (400 no OpenRouter).
const GuideItemSchema = z.strictObject({
  id: Id,
  text: z.string().trim().min(1).max(500),
  hint: z.string().trim().max(500).nullable(),
  required: z.boolean(),
})
export const TaskGuideSchema = z.strictObject({
  steps: z.array(GuideItemSchema).min(1).max(20),
  criteria: z.array(GuideItemSchema).min(1).max(10),
})

/**
 * A paleta de um CARTÃO vai ao members, que aceita no máximo 80 caracteres por papel (o DTO de
 * tarefa). Com o teto de 200 da Bíblia Visual, um papel longo virava 400 lá, depois da geração
 * inteira; aqui o próprio modo estrito do provider já o recusa e o reparo de JSON resolve.
 */
const CardPaletteSchema = z
  .array(
    z.strictObject({
      role: z.string().trim().min(1).max(80),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    }),
  )
  .max(16)

const PintaTaskContextSchema = z.strictObject({
  kind: z.literal('pinta'),
  assetId: Id,
  artKind: z.enum(['sprite', 'background', 'tileset', 'tilemap']),
  style: z.enum(['pixel', 'vector', 'either']),
  preset: z.string().trim().max(100).nullable(),
  palette: CardPaletteSchema,
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
        destination: z.enum(['pinta', 'studio', 'molda']),
        category: z.enum(['art', 'setup', 'gameplay', 'scene', 'ui', 'polish']),
        estimatedMinutes: z.number().int().min(5).max(60),
        dependencies: z.array(Id).max(20),
        guide: TaskGuideSchema,
        context: z.discriminatedUnion('kind', [
          PintaTaskContextSchema,
          StudioTaskContextDraftSchema,
          z.strictObject({
            kind: z.literal('molda'),
            assetId: Id,
            artKind: z.enum(['model', 'texture', 'sky']),
            appearance: Text,
            usage: Text,
            palette: CardPaletteSchema,
          }),
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

/** O modo estrito do provider não aceita `oneOf` (uniões discriminadas do Zod); `anyOf` é equivalente aqui. */
function strictCompatible(node: unknown): void {
  if (Array.isArray(node)) {
    for (const item of node) strictCompatible(item)
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  if ('oneOf' in record && !('anyOf' in record)) {
    record.anyOf = record.oneOf
    delete record.oneOf
  }
  for (const value of Object.values(record)) strictCompatible(value)
}

export const jsonSchemaFor = (schema: z.ZodType) => {
  const output = z.toJSONSchema(schema) as Record<string, unknown>
  strictCompatible(output)
  return output
}

export type IdeaArtifact = z.infer<typeof IdeaArtifactSchema>
export type GameDesignArtifact = z.infer<typeof GameDesignArtifactSchema>
export type VisualDirectionArtifact = z.infer<typeof VisualDirectionArtifactSchema>
export type TaskPlanDraft = z.infer<typeof TaskPlanDraftSchema>
export type PlanReviewArtifact = z.infer<typeof PlanReviewArtifactSchema>

export interface ResolvedPlanTask {
  key: string
  title: string
  summary: string | null
  destination: 'pinta' | 'studio' | 'molda'
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
  // Com a lista de blocos conquistados (criança), só ela vale, como na paleta: um bloco
  // conquistado acima do nível do posto entra no plano. O corte por nível é só da equipe.
  const allowBlocks = tier.allowBlocks ? new Set(tier.allowBlocks) : null
  const blocks = SERVER_BLOCK_CATALOG.filter((entry) => {
    if (!tier.allowedModes.includes('blocks')) return false
    if (!dimensionAllows(entry, dimension)) return false
    if (allowBlocks ? !allowBlocks.has(entry.type) : !blockLevelAllowed(entry, tier)) return false
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

type DraftGuideItem = z.infer<typeof GuideItemSchema>

function resolveGuideItem({ hint, ...item }: DraftGuideItem) {
  return { ...item, ...(hint ? { hint } : {}) }
}

/**
 * O draft usa null para "sem dica" (exigência do modo estrito); o contrato do members usa
 * ausência. E o members recusa o cartão com o mesmo id em dois passos/critérios: a repetição
 * ganha um sufixo, porque o id só precisa ser estável DEPOIS de gravado.
 */
function resolveGuide(guide: z.infer<typeof TaskGuideSchema>): PensaTaskGuide {
  const used = new Set<string>()
  const unique = (item: DraftGuideItem) => {
    let id = item.id
    for (let suffix = 2; used.has(id); suffix += 1) id = `${item.id.slice(0, 90)}-${suffix}`
    used.add(id)
    return resolveGuideItem({ ...item, id })
  }
  return { steps: guide.steps.map(unique), criteria: guide.criteria.map(unique) }
}

/** Valida IDs, disponibilidade pedagógica e ordem das dependências; nunca confia em rótulos da IA. */
export function resolveTaskPlan(
  raw: TaskPlanDraft,
  tier: StudioTier,
  dimension: '2d' | '3d',
  moldaAvailable = false,
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
    if (task.context.kind === 'molda') {
      if (!moldaAvailable || dimension !== '3d')
        throw new PensaCatalogDriftError('O Molda não está disponível para este plano.')
      return { ...task, guide: resolveGuide(task.guide), context: task.context }
    }
    if (task.context.kind === 'pinta') {
      const { preset, ...pintaContext } = task.context
      return {
        ...task,
        guide: resolveGuide(task.guide),
        context: { ...pintaContext, ...(preset ? { preset } : {}) },
      }
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
      guide: resolveGuide(task.guide),
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

type InventoryAsset = VisualDirectionArtifact['assets'][number]
type PintaArtKind = 'sprite' | 'background' | 'tileset' | 'tilemap'
type DraftTask = TaskPlanDraft['tasks'][number]

const isPintaArtKind = (kind: InventoryAsset['kind']): kind is PintaArtKind =>
  PINTA_ART_KINDS.has(kind)

/** O inventário diz `material`; o Molda chama o mesmo item de `texture`. */
const MOLDA_ART_KIND = { model: 'model', material: 'texture', sky: 'sky' } as const

/** Onde cada item da Bíblia Visual nasce: a régua de `validateVisualTaskCoverage`, dita ao modelo. */
export type VisualCard =
  | { tool: 'pinta'; artKind: PintaArtKind }
  | { tool: 'molda'; artKind: 'model' | 'texture' | 'sky' }
  | { tool: 'studio' }

/** `moldaUsable` = o Molda está liberado E o jogo é 3D (num jogo 2D ele nunca é destino). */
export function visualCardFor(asset: InventoryAsset, moldaUsable: boolean): VisualCard {
  if (isPintaArtKind(asset.kind)) return { tool: 'pinta', artKind: asset.kind }
  if (moldaUsable && asset.kind !== 'world')
    return { tool: 'molda', artKind: MOLDA_ART_KIND[asset.kind] }
  return { tool: 'studio' }
}

/**
 * A lista exata "item → ferramenta → tipo" que vai no pedido do plano. Sem ela o modelo
 * deduzia a ferramenta pelo nome do item e errava (um "fundo da tela de vitória" num jogo 3D
 * virou cartão do Molda, QA de 02/10/2026).
 */
export function visualCardChecklist(visual: VisualDirectionArtifact, moldaUsable: boolean): string {
  return [
    'CARTÕES DA BÍBLIA VISUAL (exatamente um cartão para cada item abaixo; nenhum outro assetId em tarefas pinta ou molda):',
    ...visual.assets.map((asset) => {
      const card = visualCardFor(asset, moldaUsable)
      const item = `- ${asset.id} (${asset.name}, ${asset.kind}) → `
      return card.tool === 'studio'
        ? `${item}uma única tarefa studio com "${asset.id}" em visualAssetIds`
        : `${item}tarefa ${card.tool} com assetId "${asset.id}" e artKind "${card.artKind}"`
    }),
  ].join('\n')
}

/** Corta por CARACTERE, nunca por unidade UTF-16: um emoji partido ao meio vira lixo no banco. */
export const clipText = (text: string, max: number) => {
  const chars = Array.from(text)
  return chars.length > max ? chars.slice(0, max).join('') : text
}

/** O que a lista do pedido diz sobre um item, dito ao modelo quando ele erra. */
function cardInstruction(asset: InventoryAsset, moldaUsable: boolean): string {
  const card = visualCardFor(asset, moldaUsable)
  return card.tool === 'studio'
    ? `"${asset.id}" (${asset.kind}) deve aparecer em visualAssetIds de uma única tarefa studio`
    : `"${asset.id}" (${asset.kind}) deve ser uma tarefa ${card.tool} com artKind "${card.artKind}"`
}

/**
 * Título e guia de um cartão que TROCOU de ferramenta. O texto do modelo falava da ferramenta
 * errada ("Abra o Molda e escolha uma forma 3D" num cartão que agora vai ao Pinta), então ele sai
 * inteiro e entra um texto feito só do inventário.
 */
function neutralCardText(asset: InventoryAsset, tool: 'pinta' | 'molda') {
  const where = tool === 'pinta' ? 'No Pinta' : 'No Molda'
  return {
    title: clipText(`${tool === 'pinta' ? 'Desenhar' : 'Modelar'} ${asset.name}`, 200),
    summary: null,
    guide: {
      steps: [
        {
          id: 'criar',
          text: clipText(`${where}, crie ${asset.name}: ${asset.appearance}`, 500),
          hint: null,
          required: true,
        },
      ],
      criteria: [
        {
          id: 'pronto',
          text: clipText(`${asset.name} ficou pronto para usar no jogo.`, 500),
          hint: null,
          required: true,
        },
      ],
    },
  }
}

/**
 * O modelo às vezes erra o artKind de um item que ele mesmo cita, ou manda a arte para a
 * ferramenta errada (um fundo 2D para o Molda). A Bíblia Visual é a fonte da verdade do TIPO:
 * - artKind errado na ferramenta CERTA é corrigido sempre, e o destino acompanha o contexto;
 * - ferramenta errada só é trocada com `switchTools` (a 2ª geração, último recurso), e aí o
 *   título e o guia viram texto neutro. Na 1ª geração ela segue como veio, a validação reprova e
 *   o motivo exato volta ao modelo: um cartão certo dele é melhor que um texto genérico nosso.
 * Item inexistente, mundo num cartão de arte e Molda fora do alcance seguem para a validação.
 */
export function normalizeArtCards(
  raw: TaskPlanDraft,
  visual: VisualDirectionArtifact,
  moldaUsable: boolean,
  options: { switchTools?: boolean } = {},
): TaskPlanDraft {
  const inventory = new Map(visual.assets.map((asset) => [asset.id, asset]))
  return {
    tasks: raw.tasks.map((task): DraftTask => {
      const { context } = task
      const aligned = { ...task, destination: context.kind }
      if (context.kind === 'studio') return aligned
      const asset = inventory.get(context.assetId)
      if (!asset) return aligned
      const card = visualCardFor(asset, moldaUsable)
      if (card.tool === 'pinta') {
        if (context.kind === 'pinta')
          return { ...aligned, context: { ...context, artKind: card.artKind } }
        if (!options.switchTools) return aligned
        return {
          ...task,
          ...neutralCardText(asset, 'pinta'),
          destination: 'pinta',
          context: {
            kind: 'pinta',
            assetId: asset.id,
            artKind: card.artKind,
            style: 'either',
            preset: null,
            palette: context.palette,
            appearance: context.appearance,
            animations: asset.animations,
            states: asset.states,
            usage: context.usage,
            requiresStudioUse: true,
          },
        }
      }
      if (card.tool === 'molda') {
        if (context.kind === 'molda')
          return { ...aligned, context: { ...context, artKind: card.artKind } }
        if (!options.switchTools) return aligned
        return {
          ...task,
          ...neutralCardText(asset, 'molda'),
          destination: 'molda',
          context: {
            kind: 'molda',
            assetId: asset.id,
            artKind: card.artKind,
            appearance: context.appearance,
            usage: context.usage,
            palette: context.palette,
          },
        }
      }
      return aligned
    }),
  }
}

/**
 * O modelo insiste em citar nas tarefas do Estúdio a arte que o jogo USA ("o jogo usa o
 * fundo"), e a referência redundante reprovava o plano INTEIRO ("ferramenta errada" ou "mais de
 * um cartão"; 3 gerações seguidas no QA de 08/2026). Sai de `visualAssetIds`:
 * - a arte 2D, que é cartão do Pinta;
 * - o item que já tem cartão do Molda;
 * - a segunda citação em diante de um item que só o Estúdio cria (ele nasce no primeiro cartão
 *   que o cita; os seguintes o usam).
 * A cobertura 1:1 continua garantida pela validação em seguida, e id desconhecido fica para ela
 * reprovar.
 */
export function stripRedundantArtFromStudioTasks(
  tasks: readonly ResolvedPlanTask[],
  visual: VisualDirectionArtifact,
): ResolvedPlanTask[] {
  const known = new Set(visual.assets.map((asset) => asset.id))
  const pintaArt = new Set(
    visual.assets.filter((asset) => PINTA_ART_KINDS.has(asset.kind)).map((asset) => asset.id),
  )
  const moldaCarded = new Set(
    tasks.flatMap((task) => (task.context.kind === 'molda' ? [task.context.assetId] : [])),
  )
  const created = new Set<string>()
  return tasks.map((task) => {
    if (task.context.kind !== 'studio') return task
    const visualAssetIds = task.context.visualAssetIds.filter((id) => {
      if (pintaArt.has(id) || moldaCarded.has(id)) return false
      if (!known.has(id)) return true
      if (created.has(id)) return false
      created.add(id)
      return true
    })
    return { ...task, context: { ...task.context, visualAssetIds } }
  })
}

/**
 * Garante um Cartão de Criação — e somente um — para cada item da Bíblia Visual. As mensagens
 * vão ao LOG e à 2ª geração (nunca à criança), então dizem ao modelo o cartão CERTO de cada item.
 */
export function validateVisualTaskCoverage(
  tasks: readonly ResolvedPlanTask[],
  visual: VisualDirectionArtifact,
  moldaUsable = false,
): void {
  const inventory = new Map(visual.assets.map((asset) => [asset.id, asset]))
  if (inventory.size !== visual.assets.length)
    throw new PensaCatalogDriftError('A Bíblia Visual possui IDs de asset repetidos')
  const missing = (key: string, assetId: string) =>
    new PensaCatalogDriftError(
      `A tarefa ${key} usa o assetId "${assetId}", que não existe na Bíblia Visual`,
    )
  const coverage = new Map<string, number>()
  for (const task of tasks) {
    if (task.context.kind === 'molda') {
      const asset = inventory.get(task.context.assetId)
      if (!asset) throw missing(task.key, task.context.assetId)
      const inventoryKind = task.context.artKind === 'texture' ? 'material' : task.context.artKind
      if (asset.kind !== inventoryKind)
        throw new PensaCatalogDriftError(
          `A tarefa ${task.key} não corresponde à criação 3D da Bíblia Visual: ${cardInstruction(asset, moldaUsable)}`,
        )
      coverage.set(asset.id, (coverage.get(asset.id) ?? 0) + 1)
      continue
    }
    if (task.context.kind === 'pinta') {
      const asset = inventory.get(task.context.assetId)
      if (!asset) throw missing(task.key, task.context.assetId)
      if (!PINTA_ART_KINDS.has(asset.kind) || asset.kind !== task.context.artKind) {
        throw new PensaCatalogDriftError(
          `A tarefa ${task.key} não corresponde a uma arte 2D da Bíblia Visual: ${cardInstruction(asset, moldaUsable)}`,
        )
      }
      coverage.set(asset.id, (coverage.get(asset.id) ?? 0) + 1)
      continue
    }
    for (const assetId of task.context.visualAssetIds) {
      const asset = inventory.get(assetId)
      if (!asset) throw missing(task.key, assetId)
      if (PINTA_ART_KINDS.has(asset.kind)) {
        throw new PensaCatalogDriftError(
          `A tarefa ${task.key} atribui a arte ${assetId} à ferramenta errada: ${cardInstruction(asset, moldaUsable)}`,
        )
      }
      coverage.set(asset.id, (coverage.get(asset.id) ?? 0) + 1)
    }
  }
  for (const asset of visual.assets) {
    if (coverage.get(asset.id) !== 1) {
      throw new PensaCatalogDriftError(
        `O asset ${asset.id} precisa de exatamente um Cartão de Criação: ${cardInstruction(asset, moldaUsable)}`,
      )
    }
  }
}

/**
 * Do rascunho da IA ao plano que vai ao members: arruma o que dá para arrumar sem inventar
 * nada, resolve no catálogo e confere a cobertura. Lança `PensaCatalogDriftError` com o motivo
 * técnico, que serve ao log e à segunda tentativa, NUNCA à criança.
 */
export function buildTaskPlan(
  raw: TaskPlanDraft,
  input: {
    visual: VisualDirectionArtifact
    tier: StudioTier
    dimension: '2d' | '3d'
    moldaAvailable: boolean
    /** Só na 2ª geração: cartão na ferramenta errada troca de ferramenta (ver `normalizeArtCards`). */
    switchTools?: boolean
  },
): ResolvedPlanTask[] {
  const moldaUsable = input.moldaAvailable && input.dimension === '3d'
  const tasks = stripRedundantArtFromStudioTasks(
    resolveTaskPlan(
      normalizeArtCards(raw, input.visual, moldaUsable, { switchTools: input.switchTools }),
      input.tier,
      input.dimension,
      input.moldaAvailable,
    ),
    input.visual,
  )
  validateVisualTaskCoverage(tasks, input.visual, moldaUsable)
  return tasks
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
