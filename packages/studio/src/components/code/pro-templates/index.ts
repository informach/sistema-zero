import {
  STUDIO_PRO_TEMPLATES,
  type StudioProTemplateId,
  type StudioProTemplateMetadata,
} from '@sistemazero/core/studio/pro-templates'
import type { Project, ProjectAsset, ProjectTree } from '#core'

/** Metadata only. Game sources are separate chunks loaded on creation. */
export type ProTemplate = StudioProTemplateMetadata
export const PRO_TEMPLATES = Object.fromEntries(
  STUDIO_PRO_TEMPLATES.map((template) => [template.id, template]),
) as Record<StudioProTemplateId, ProTemplate>
export function listProTemplates(): ProTemplate[] {
  return [...STUDIO_PRO_TEMPLATES]
}
export function getProTemplate(id: string): ProTemplate | undefined {
  return Object.hasOwn(PRO_TEMPLATES, id) ? PRO_TEMPLATES[id as StudioProTemplateId] : undefined
}
export async function loadProTemplate(
  id: string,
): Promise<ProTemplate & { tree: ProjectTree; assets: ProjectAsset[] }> {
  const template = getProTemplate(id)
  if (!template) throw new Error(`Template profissional desconhecido: ${id}`)
  if (template.id === 'canvas-survival') {
    const { createCanvasSurvivalTemplate } = await import('./games/canvas-survival')
    return { ...template, ...createCanvasSurvivalTemplate() }
  }
  const tree = template.kitVersion
    ? await (await import('./games')).createGameTree(template)
    : (await import('./base')).BASE_TREES[template.id]
  if (!tree) throw new Error(`Fontes do modelo indisponíveis: ${id}`)
  return {
    ...template,
    tree: Object.fromEntries(Object.entries(tree).map(([path, node]) => [path, { ...node }])),
    assets: [],
  }
}
export async function createProProject(
  id: string,
  name: string,
  templateId: string,
): Promise<Project> {
  const template = await loadProTemplate(templateId)
  const { buildProProject } = await import('../../../core/proProject')
  return {
    ...buildProProject(id, name, template.tree, template.devScript, template.id),
    assets: template.assets,
  }
}
