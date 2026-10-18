import type { StudioProjectKind } from '@sistemazero/core/studio/project-environment'
import type { EditableStudioProject } from '@sistemazero/studio'
import {
  type PreparedStudioAuthoringOptions,
  studioAuthoringChoices,
} from './studio-authoring-options'

type AuthoringSelection = { kind: StudioProjectKind; environmentKey: string; templateId: string }

/** Used before loading a template AND immediately before replacing existing authoring. */
export function resolveStudioAuthoringSelection(
  input: AuthoringSelection,
  prepared: PreparedStudioAuthoringOptions | null,
) {
  if (input.environmentKey === 'javascript') return null
  const choice =
    prepared &&
    studioAuthoringChoices(prepared, input.kind).find(
      (candidate) => candidate.key === input.environmentKey,
    )
  if (!choice?.policy || !prepared?.catalog)
    throw new Error('Este ambiente não está disponível para criar projetos. Atualize a lista.')
  const policy = choice.policy
  if (input.kind === 'pro' && !policy.proTemplateIds.includes(input.templateId))
    throw new Error('O modelo não está disponível neste ambiente.')
  return { choice, policy, catalog: prepared.catalog }
}

export async function createStudioAuthoringProject(
  input: AuthoringSelection & { id: string; name: string },
  prepared: PreparedStudioAuthoringOptions | null,
): Promise<EditableStudioProject> {
  const approved = resolveStudioAuthoringSelection(input, prepared)
  // Existing JS authoring remains available even if discovery is temporarily down.
  if (!approved) {
    const studio = await import('@sistemazero/studio')
    return input.kind === 'pro'
      ? studio.createProProject(input.id, input.name, input.templateId)
      : studio.createEmptyProject(input.id, input.name)
  }
  const { choice, policy, catalog } = approved
  const { createEditableStudioProject } = await import('@sistemazero/studio/project-factory')
  const identity = { id: input.id, name: input.name, kind: input.kind }
  const context = {
    catalog,
    runtime: policy.runtime,
    releaseStatus: policy.status,
  }
  if (choice.language === 'python')
    return createEditableStudioProject({ ...identity, programmingLanguage: 'python' }, context)
  if (input.kind === 'classic')
    return createEditableStudioProject({ ...identity, kind: 'classic' }, context)
  const { createProProject } = await import('@sistemazero/studio')
  const template = await createProProject(input.id, input.name, input.templateId)
  if (!template.tree || !template.proMeta) throw new Error('O modelo Pro é inválido.')
  return createEditableStudioProject(
    {
      ...identity,
      kind: 'pro',
      template: {
        tree: template.tree,
        devScript: template.proMeta.devScript,
        id: template.proMeta.templateId,
        assets: template.assets,
      },
    },
    context,
  )
}
