import { MOLDA_LIMITS, NEW_MODEL_TEXELS_PER_UNIT } from '../core/limits'
import { createModelAsset } from '../core/model'
import { findTemplate, type MoldaTemplateId } from '../templates/catalog'
import type { MoldaSceneDocument } from './document'
import { migrateLegacyModel } from './migrateLegacy'
import { resizeScenePaint } from './resizePaint'
import { record, requireScene, text } from './validation'

export type SceneProjectStart =
  | { kind: 'empty'; name: string }
  | { kind: 'template'; templateId: MoldaTemplateId; name: string }

/** New authorial name: trim edges, never truncate or silently replace an empty label. */
export function sceneProjectName(raw: unknown): string {
  requireScene(typeof raw === 'string', 'name', 'Dê um nome para sua criação.')
  return text(raw.trim(), 'name', MOLDA_LIMITS.maxNameChars)
}

/** Fresh creation only. No existing document, storage write or implicit demo identity. */
export function createSceneProject(input: unknown): MoldaSceneDocument {
  const row = record(input, 'start')
  requireScene(
    row.kind === 'empty' || row.kind === 'template',
    'start.kind',
    'Escolha como começar.',
  )
  record(row, 'start', row.kind === 'empty' ? ['kind', 'name'] : ['kind', 'name', 'templateId'])
  const name = sceneProjectName(row.name)
  if (row.kind === 'empty')
    return migrateLegacyModel(
      createModelAsset({ name, starter: false, texelsPerUnit: NEW_MODEL_TEXELS_PER_UNIT }),
    ).document
  requireScene(typeof row.templateId === 'string', 'start.templateId', 'Escolha um modelo pronto.')
  const template = findTemplate(row.templateId)
  requireScene(template !== null, 'start.templateId', 'Modelo pronto desconhecido.')
  const source = template.build()
  const { document, issues } = migrateLegacyModel({ ...source, name })
  // Authored built-ins are expected to migrate without losses; never hide a catalog defect.
  requireScene(issues.length === 0, 'start.templateId', 'Este modelo pronto precisa de um ajuste.')
  const fresh = {
    ...document,
    settings: { ...document.settings, texelsPerUnit: NEW_MODEL_TEXELS_PER_UNIT },
  }
  return resizeScenePaint(fresh, fresh, true)
}
