import type { PensaArtifactType } from './pensa'

type JsonRecord = Record<string, unknown>
const record = (value: unknown): JsonRecord | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null
const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0
const texts = (value: unknown, min = 0) =>
  Array.isArray(value) && value.length >= min && value.every(text)
const records = (value: unknown, min = 0) =>
  Array.isArray(value) && value.length >= min && value.every((item) => record(item) !== null)
const only = (value: JsonRecord, keys: readonly string[]) =>
  Object.keys(value).every((key) => keys.includes(key))
const uuid = (value: unknown) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const isoDate = (value: unknown) => typeof value === 'string' && !Number.isNaN(Date.parse(value))

function validIdea(value: JsonRecord) {
  return (
    only(value, ['title', 'idea', 'objective', 'controls', 'victory', 'defeat', 'dimension']) &&
    text(value.title) &&
    text(value.idea) &&
    text(value.objective) &&
    texts(value.controls, 1) &&
    text(value.victory) &&
    text(value.defeat) &&
    (value.dimension === '2d' || value.dimension === '3d')
  )
}

function validGameDesign(value: JsonRecord) {
  return (
    only(value, ['coreLoop', 'scenes', 'screens', 'camera']) &&
    texts(value.coreLoop, 2) &&
    records(value.scenes, 1) &&
    records(value.screens, 1) &&
    (value.scenes as unknown[]).every((item) => {
      const row = record(item)!
      return (
        only(row, ['id', 'name', 'purpose']) && text(row.id) && text(row.name) && text(row.purpose)
      )
    }) &&
    (value.screens as unknown[]).every((item) => {
      const row = record(item)!
      return (
        only(row, ['id', 'name', 'purpose']) && text(row.id) && text(row.name) && text(row.purpose)
      )
    }) &&
    text(value.camera)
  )
}

function validVisualDirection(value: JsonRecord) {
  const palette = value.palette as unknown[]
  const assets = value.assets as unknown[]
  return (
    only(value, [
      'style',
      'camera',
      'mood',
      'shapeLanguage',
      'palette',
      'visualRules',
      'screens',
      'assets',
    ]) &&
    text(value.style) &&
    text(value.camera) &&
    text(value.mood) &&
    text(value.shapeLanguage) &&
    records(palette, 3) &&
    palette.every((item) => {
      const row = record(item)!
      return (
        only(row, ['role', 'color']) &&
        text(row.role) &&
        typeof row.color === 'string' &&
        /^#[0-9a-fA-F]{6}$/.test(row.color)
      )
    }) &&
    texts(value.visualRules, 2) &&
    records(value.screens, 1) &&
    (value.screens as unknown[]).every((item) => {
      const row = record(item)!
      return only(row, ['screenId', 'description']) && text(row.screenId) && text(row.description)
    }) &&
    records(assets, 1) &&
    assets.every((item) => {
      const row = record(item)!
      return (
        only(row, ['id', 'name', 'kind', 'appearance', 'animations', 'states', 'usage']) &&
        text(row.id) &&
        text(row.name) &&
        ['sprite', 'background', 'tileset', 'tilemap', 'model', 'world', 'material'].includes(
          String(row.kind),
        ) &&
        text(row.appearance) &&
        texts(row.animations) &&
        texts(row.states) &&
        text(row.usage)
      )
    })
  )
}

function validTaskPlan(value: JsonRecord) {
  return (
    only(value, ['taskIds', 'generatedAt', 'catalog']) &&
    Array.isArray(value.taskIds) &&
    value.taskIds.length > 0 &&
    value.taskIds.every(uuid) &&
    isoDate(value.generatedAt) &&
    value.catalog === 'studio-official'
  )
}

function validPlanReview(value: JsonRecord) {
  return (
    only(value, ['approved', 'findings', 'recommendations', 'auditedAt']) &&
    typeof value.approved === 'boolean' &&
    Array.isArray(value.findings) &&
    value.findings.every((item) => {
      const row = record(item)
      return (
        !!row &&
        only(row, ['severity', 'message', 'taskKey']) &&
        ['info', 'warning', 'error'].includes(String(row.severity)) &&
        text(row.message) &&
        (row.taskKey === null || text(row.taskKey))
      )
    }) &&
    texts(value.recommendations) &&
    isoDate(value.auditedAt)
  )
}

/** Validação framework-free dos cinco contratos persistidos. */
export function isPensaArtifactContent(type: PensaArtifactType, content: unknown): boolean {
  const value = record(content)
  if (!value) return false
  if (type === 'idea') return validIdea(value)
  if (type === 'game_design') return validGameDesign(value)
  if (type === 'visual_direction') return validVisualDirection(value)
  if (type === 'task_plan') return validTaskPlan(value)
  return validPlanReview(value)
}
