import { campaignEntityPropsIssue, isCampaignEntityKind } from './campaignEntityCatalog'
import type {
  GameKitCampaignStage,
  GameKitStageEntity,
  GameKitStageTrigger,
} from './runtimeContract'

export { CAMPAIGN_ENTITY_CATALOG, CAMPAIGN_ENTITY_KINDS } from './campaignEntityCatalog'

export type {
  GameKitCampaignStage,
  GameKitStageEntity,
  GameKitStageTrigger,
} from './runtimeContract'

export const CAMPAIGN_STAGE_SCHEMA_VERSION = 1 as const
export const CAMPAIGN_MAX_STAGES = 128
export const CAMPAIGN_MAX_WIDTH = 512
export const CAMPAIGN_MAX_HEIGHT = 512
export const CAMPAIGN_MAX_ENTITIES = 128
export const CAMPAIGN_MAX_TRIGGERS = 256
export const CAMPAIGN_TILE_CHARS = ['.', '#', '=', 'B', '?', '^', '~', 'H'] as const
export const CAMPAIGN_THEMES = [
  'campo',
  'caverna',
  'agua',
  'neve',
  'deserto',
  'castelo',
  'ceu',
  'vulcao',
] as const
const SAFE_ID = /^[A-Za-z0-9_-]+$/
const tileChars = new Set<string>(CAMPAIGN_TILE_CHARS)

function plainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function safeId(value: unknown, optional = false): string | null {
  if (optional && (value === undefined || value === '')) return ''
  if (typeof value !== 'string' || value.length < 1 || value.length > 64) return null
  return SAFE_ID.test(value) ? value : null
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function boundedInteger(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : null
}

function stageProps(value: unknown): Record<string, string | number | boolean> | null {
  if (value === undefined) return {}
  if (!plainRecord(value) || Object.keys(value).length > 32) return null
  const output: Record<string, string | number | boolean> = {}
  for (const [key, item] of Object.entries(value)) {
    if (key.length > 40) return null
    if (typeof item === 'string') {
      if (item.length > 200) return null
      output[key] = item
    } else if (typeof item === 'number') {
      if (!Number.isFinite(item)) return null
      output[key] = item
    } else if (typeof item === 'boolean') output[key] = item
    else return null
  }
  return output
}

function uniqueEntityId(base: string, usedIds: Set<string>): string {
  if (!usedIds.has(base)) return base
  let suffix = 2
  while (suffix <= CAMPAIGN_MAX_ENTITIES + 1) {
    const suffixText = `-${suffix}`
    const candidate = `${base.slice(0, 64 - suffixText.length)}${suffixText}`
    if (!usedIds.has(candidate)) return candidate
    suffix += 1
  }
  return `${base.slice(0, 59)}-${usedIds.size}`
}

function entityOf(
  value: unknown,
  index: number,
  usedIds: Set<string>,
  migrateLegacyIds: boolean,
): GameKitStageEntity | null {
  if (
    !plainRecord(value) ||
    !objectHasOnlyKeys(value, ['kind', 'id', 'x', 'y', 'variant', 'props'])
  ) {
    return null
  }
  if (!isCampaignEntityKind(value.kind)) return null
  const sourceId = safeId(value.id, true)
  const x = finiteNumber(value.x)
  const y = finiteNumber(value.y)
  const props = stageProps(value.props)
  if (
    sourceId === null ||
    x === null ||
    y === null ||
    props === null ||
    campaignEntityPropsIssue(value.kind, props)
  ) {
    return null
  }
  if (
    value.variant !== undefined &&
    (typeof value.variant !== 'string' || value.variant.length > 80)
  ) {
    return null
  }
  if ((!sourceId || usedIds.has(sourceId)) && !migrateLegacyIds) return null
  const id = uniqueEntityId(sourceId || `${value.kind}-${index + 1}`, usedIds)
  usedIds.add(id)
  return {
    kind: value.kind,
    id,
    x,
    y,
    ...(value.variant ? { variant: value.variant } : {}),
    ...(Object.keys(props).length > 0 ? { props } : {}),
  }
}

function triggerOf(value: unknown): GameKitStageTrigger | null {
  if (
    !plainRecord(value) ||
    !objectHasOnlyKeys(value, ['kind', 'x', 'y', 'w', 'h', 'target', 'value'])
  ) {
    return null
  }
  const kind = safeId(value.kind)
  const x = finiteNumber(value.x)
  const y = finiteNumber(value.y)
  const w = finiteNumber(value.w)
  const h = finiteNumber(value.h)
  const target = safeId(value.target, true)
  const triggerValue = value.value
  const supportedValue =
    triggerValue === undefined ||
    typeof triggerValue === 'string' ||
    typeof triggerValue === 'number' ||
    typeof triggerValue === 'boolean'
  if (
    kind === null ||
    x === null ||
    y === null ||
    w === null ||
    h === null ||
    w < 0 ||
    h < 0 ||
    target === null ||
    !supportedValue ||
    (typeof triggerValue === 'number' && !Number.isFinite(triggerValue)) ||
    (typeof triggerValue === 'string' && triggerValue.length > 200)
  ) {
    return null
  }
  return {
    kind,
    x,
    y,
    w,
    h,
    ...(target ? { target } : {}),
    ...(triggerValue !== undefined ? { value: triggerValue } : {}),
  }
}

export function objectHasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  const allowed = new Set(allowedKeys)
  return Object.keys(value).every((key) => allowed.has(key))
}

function parseCampaignStage(
  value: unknown,
  migrateLegacyIds: boolean,
): GameKitCampaignStage | null {
  if (
    !plainRecord(value) ||
    !objectHasOnlyKeys(value, [
      'schemaVersion',
      'id',
      'world',
      'order',
      'theme',
      'width',
      'height',
      'tiles',
      'entities',
      'triggers',
      'nextStage',
      'secretStage',
      'timeLimit',
    ]) ||
    value.schemaVersion !== CAMPAIGN_STAGE_SCHEMA_VERSION
  ) {
    return null
  }
  const id = safeId(value.id)
  const world = boundedInteger(value.world, 1, CAMPAIGN_MAX_STAGES)
  const order = boundedInteger(value.order, 1, CAMPAIGN_MAX_STAGES)
  const width = boundedInteger(value.width, 1, CAMPAIGN_MAX_WIDTH)
  const height = boundedInteger(value.height, 1, CAMPAIGN_MAX_HEIGHT)
  const nextStage = safeId(value.nextStage, true)
  const secretStage = safeId(value.secretStage, true)
  const timeLimit = value.timeLimit === undefined ? 300 : finiteNumber(value.timeLimit)
  if (
    id === null ||
    world === null ||
    order === null ||
    width === null ||
    height === null ||
    nextStage === null ||
    secretStage === null ||
    timeLimit === null ||
    timeLimit < 0 ||
    timeLimit > 3600 ||
    typeof value.theme !== 'string' ||
    value.theme.length < 1 ||
    value.theme.length > 40 ||
    !Array.isArray(value.tiles) ||
    value.tiles.length !== height ||
    !Array.isArray(value.entities) ||
    value.entities.length > CAMPAIGN_MAX_ENTITIES ||
    !Array.isArray(value.triggers) ||
    value.triggers.length > CAMPAIGN_MAX_TRIGGERS
  ) {
    return null
  }
  const tiles: string[] = []
  for (const row of value.tiles) {
    if (typeof row !== 'string' || row.length !== width) return null
    for (const char of row) if (!tileChars.has(char)) return null
    tiles.push(row)
  }
  const entities: GameKitStageEntity[] = []
  const usedEntityIds = new Set<string>()
  for (let index = 0; index < value.entities.length; index += 1) {
    const entity = entityOf(value.entities[index], index, usedEntityIds, migrateLegacyIds)
    if (!entity) return null
    entities.push(entity)
  }
  const triggers: GameKitStageTrigger[] = []
  for (const rawTrigger of value.triggers) {
    const trigger = triggerOf(rawTrigger)
    if (!trigger) return null
    triggers.push(trigger)
  }
  return {
    schemaVersion: CAMPAIGN_STAGE_SCHEMA_VERSION,
    id,
    world,
    order,
    theme: value.theme,
    width,
    height,
    tiles,
    entities,
    triggers,
    ...(nextStage ? { nextStage } : {}),
    ...(secretStage ? { secretStage } : {}),
    ...(timeLimit !== 300 ? { timeLimit } : {}),
  }
}

/** Valida dados novos sem consertar IDs ausentes ou duplicados silenciosamente. */
export function validateCampaignStage(value: unknown): GameKitCampaignStage | null {
  return parseCampaignStage(value, false)
}

/** Normaliza somente a identidade legada; os demais erros continuam inválidos. */
export function normalizeCampaignStage(value: unknown): GameKitCampaignStage | null {
  return parseCampaignStage(value, true)
}

export function cloneCampaignStage(stage: GameKitCampaignStage): GameKitCampaignStage {
  return structuredClone(stage)
}

export function createCampaignStage(id = 'fase-1'): GameKitCampaignStage {
  const width = 24
  const height = 12
  return {
    schemaVersion: CAMPAIGN_STAGE_SCHEMA_VERSION,
    id,
    world: 1,
    order: 1,
    theme: 'campo',
    width,
    height,
    tiles: Array.from({ length: height }, (_, row) =>
      row === height - 1 ? '#'.repeat(width) : '.'.repeat(width),
    ),
    entities: [
      { kind: 'hero', id: 'inicio', x: 2, y: height - 2 },
      { kind: 'exit', id: 'saida', x: width - 2, y: height - 2 },
    ],
    triggers: [],
  }
}

export function campaignStageSummary(stage: GameKitCampaignStage): string {
  return `${stage.id} · ${stage.width}×${stage.height} · ${stage.entities.length} itens`
}

export function isCampaignStageExtraState(
  value: unknown,
): value is { stage: GameKitCampaignStage } {
  return (
    plainRecord(value) &&
    objectHasOnlyKeys(value, ['stage']) &&
    validateCampaignStage(value.stage) !== null
  )
}
