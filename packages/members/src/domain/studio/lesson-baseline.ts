import { createHash } from 'node:crypto'
import type { LiveStudioConfig } from '@sistemazero/core/live'
import { createBlankProjectSnapshot } from '@sistemazero/studio/blank-project'
import { validateLiveSnapshot } from '../live/workspace-snapshot'
import { ValidationError } from '../shared/errors'
import { stableJson } from '../shared/stable-json'

/** Authoring configuration, never the student's source. Shared by all learners of a revision. */
export type StudioLessonConfiguration = LiveStudioConfig & {
  initialProject: unknown
  chain?: string
}

export interface StudioLessonBaseline {
  id: string
  blockId: string
  lessonId: string
  courseId: string
  configuration: StudioLessonConfiguration & { initialProject: Record<string, unknown> }
}

/** Only call with published authoring read by the server, never with a client-supplied seed. */
export function studioLessonBaseline(input: {
  blockId: string
  lessonId: string
  courseId: string
  configuration: StudioLessonConfiguration
}): StudioLessonBaseline {
  const initial = input.configuration.initialProject ?? {
    ...createBlankProjectSnapshot(input.blockId, 'Meu projeto'),
    createdAt: 0,
    updatedAt: 0,
  }
  if (typeof initial !== 'object' || Array.isArray(initial))
    throw new ValidationError('O projeto inicial desta aula é inválido.')
  const initialProject = validateLiveSnapshot({ ...initial, id: input.blockId }, input.blockId)
  // Explicit projection: new authoring fields cannot accidentally become an execution grant.
  const {
    level,
    pythonLevel,
    allowBlocks,
    allowCategories,
    allowedModes,
    allowLevelReveal,
    chain,
  } = input.configuration
  const configuration = JSON.parse(
    JSON.stringify({
      initialProject,
      level,
      allowBlocks,
      allowCategories,
      allowedModes,
      allowLevelReveal,
      pythonLevel,
      chain,
    }),
  ) as StudioLessonBaseline['configuration']
  const body = {
    blockId: input.blockId,
    lessonId: input.lessonId,
    courseId: input.courseId,
    configuration,
  }
  return { ...body, id: createHash('sha256').update(stableJson(body)).digest('hex') }
}
