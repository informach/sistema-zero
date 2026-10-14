import { ValidationError } from '@sistemazero/core/errors'
import {
  type InteractiveBlock,
  isInteractiveBlock,
  publicInteractiveBlock,
} from '@sistemazero/core/learning'
import type { LiveLearningStep, LiveStudioConfig } from '@sistemazero/core/live'
import { validateLiveSnapshot } from './workspace-snapshot'

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i
/** Persist only the shared activity contract, retaining private grading fields on the server. */
export function sanitizeLiveSteps(
  input: LiveLearningStep[] | undefined,
): LiveLearningStep[] | undefined {
  if (input === undefined) return undefined
  if (!Array.isArray(input) || input.length > 24)
    throw new ValidationError('O roteiro permite até 24 etapas.')
  const stepIds = new Set<string>(),
    blockIds = new Set<string>()
  return input.map((step) => {
    if (
      !uuid.test(step.id) ||
      stepIds.has(step.id) ||
      !step.title.trim() ||
      step.title.length > 160 ||
      step.instructions.length > 10_000 ||
      !Array.isArray(step.blocks) ||
      step.blocks.length > 12
    )
      throw new ValidationError('Etapa inválida ou repetida.')
    stepIds.add(step.id)
    return {
      id: step.id,
      title: step.title.trim(),
      instructions: step.instructions.trim(),
      blocks: step.blocks.map((block) => {
        if (
          !uuid.test(block.id) ||
          !uuid.test(block.revision) ||
          blockIds.has(block.id) ||
          blockIds.size >= 48 ||
          !isInteractiveBlock(block.content)
        )
          throw new ValidationError('Atividade inválida, repetida ou acima do limite de 48 blocos.')
        blockIds.add(block.id)
        const raw = block.content,
          visible = publicInteractiveBlock(raw)
        const content: InteractiveBlock = {
          kind: 'interactive',
          title: raw.title,
          instructions: raw.instructions,
          hints: [...raw.hints],
          required: raw.required,
          activity: structuredClone(visible.activity),
          ...(raw.checkpoint ? { checkpoint: structuredClone(raw.checkpoint) } : {}),
          ...(raw.prediction ? { prediction: structuredClone(raw.prediction) } : {}),
          ...(raw.semPerguntaFinal ? { semPerguntaFinal: true as const } : {}),
        }
        if (content.activity.type === 'project-play') {
          const project = content.activity.project as Record<string, unknown>
          content.activity.project = validateLiveSnapshot(project, String(project.id))
        }
        if (!isInteractiveBlock(content))
          throw new ValidationError('Atividade inválida após preparação do roteiro.')
        return { id: block.id, revision: block.revision, content }
      }),
    }
  })
}

const STUDIO_MODES = new Set(['blocks', 'bridge', 'code'])
function studioList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (
    !Array.isArray(value) ||
    value.length > maxItems ||
    value.some((item) => typeof item !== 'string' || !item.trim() || item.trim().length > maxLength)
  )
    throw new ValidationError('Confira a lista de blocos e categorias do Estúdio.')
  return [...new Set(value.map((item: string) => item.trim()))]
}
/**
 * The classroom Studio curation (same knobs as the recorded lesson Studio block). Only the
 * known fields survive; `null` explicitly clears a previous curation.
 */
export function sanitizeLiveStudio(
  input: LiveStudioConfig | null | undefined,
): LiveStudioConfig | null | undefined {
  if (input === undefined || input === null) return input
  if (typeof input !== 'object' || Array.isArray(input))
    throw new ValidationError('Configuração do Estúdio inválida.')
  const studio: LiveStudioConfig = {}
  if (input.level !== undefined) {
    if (typeof input.level !== 'string' || !input.level.trim() || input.level.trim().length > 40)
      throw new ValidationError('Nível do Estúdio inválido.')
    studio.level = input.level.trim()
  }
  if (input.allowBlocks !== undefined) studio.allowBlocks = studioList(input.allowBlocks, 3000, 160)
  if (input.allowCategories !== undefined)
    studio.allowCategories = studioList(input.allowCategories, 80, 80)
  if (input.allowedModes !== undefined) {
    const modes = input.allowedModes
    if (
      !Array.isArray(modes) ||
      modes.length < 1 ||
      modes.length > 3 ||
      new Set(modes).size !== modes.length ||
      modes.some((mode) => !STUDIO_MODES.has(mode))
    )
      throw new ValidationError('Escolha de um a três modos do Estúdio, sem repetir.')
    studio.allowedModes = [...modes]
  }
  if (input.allowLevelReveal !== undefined) {
    if (typeof input.allowLevelReveal !== 'boolean')
      throw new ValidationError('Configuração do Estúdio inválida.')
    studio.allowLevelReveal = input.allowLevelReveal
  }
  return studio
}
