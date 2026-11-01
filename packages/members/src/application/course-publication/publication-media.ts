import {
  type CoursePublicationMediaPlan,
  CoursePublicationMediaPlanSchema,
  CoursePublicationMediaResultSchema,
  CoursePublicationMediaTaskSchema,
} from '@sistemazero/core/course/publication'
import { chaveDeVoz } from '@sistemazero/core/learning/scene'
import {
  type CourseSnapshot,
  hash,
  type MediaProof,
  type Snapshot,
  sourceHash,
} from '../../domain/course-publication/course-sync'
import type {
  CoursePublicationMediaPort,
  PublicationWorkTask,
} from '../../domain/ports/course-publication.port'

/** Reject a provider response that is valid JSON but belongs to another resource. */
export function publicationMediaProof(
  snapshot: Snapshot,
  tasks: readonly PublicationWorkTask[],
  now: Date,
): MediaProof {
  const manifest = tasks.filter((task) => task.kind === 'media-plan')
  if (manifest.length !== 1 || tasks.some((task) => task.status !== 'completed'))
    throw new Error('A preparação ainda não terminou')
  const plan = CoursePublicationMediaPlanSchema.parse({
    tasks: tasks
      .filter((task) => task.kind !== 'media-plan')
      .map((task) => ({ id: task.taskKey, input: task.input })),
    voices: manifest[0]!.result?.voices,
    profileHash: manifest[0]!.result?.profileHash,
  })
  const keys = manifest[0]!.result?.taskKeys
  if (
    !Array.isArray(keys) ||
    new Set(keys).size !== keys.length ||
    keys.length !== plan.tasks.length ||
    plan.tasks.some((task) => !keys.includes(task.id))
  )
    throw new Error('A preparação perdeu uma referência')
  const results = new Map(
    tasks
      .filter((task) => task.kind !== 'media-plan')
      .map((task) => {
        const input = CoursePublicationMediaTaskSchema.parse(task.input)
        const result = CoursePublicationMediaResultSchema.parse(task.result)
        if (
          input.kind !== result.kind ||
          (input.kind === 'voice' &&
            result.kind === 'voice' &&
            chaveDeVoz(input.speechText) !== result.key) ||
          (input.kind === 'video' && result.kind === 'video' && input.videoId !== result.videoId) ||
          (input.kind === 'knowledge' &&
            result.kind === 'knowledge' &&
            (input.sourceRef !== result.sourceRef ||
              input.sourceType !== result.sourceType ||
              (input.extraction.kind === 'text' && input.extraction.content !== result.content)))
        )
          throw new Error('O resultado de mídia pertence a outro recurso')
        return [task.taskKey, result] as const
      }),
  )
  const voices: MediaProof['voices'] = {}
  for (const [block, taskKeys] of Object.entries(plan.voices)) {
    voices[block] = Object.fromEntries(
      taskKeys.map((key) => {
        const result = results.get(key)
        if (result?.kind !== 'voice') throw new Error('Falta uma fala do Zappy')
        return [result.key, result.url]
      }),
    )
  }
  const values = [...results.values()]
  return {
    environment: snapshot.environment,
    sourceHash: sourceHash(snapshot),
    checkedAt: now.toISOString(),
    voices,
    readyVideoIds: values.flatMap((result) => (result.kind === 'video' ? [result.videoId] : [])),
    generated: values.filter((result) => result.kind === 'voice' && result.generated).length,
    reused: values.filter((result) => result.kind === 'voice' && !result.generated).length,
    knowledge: {
      sourceHash: sourceHash(snapshot),
      sources: values.flatMap((result) =>
        result.kind === 'knowledge'
          ? [
              {
                sourceRef: result.sourceRef,
                sourceType: result.sourceType,
                content: result.content,
              },
            ]
          : [],
      ),
    },
  }
}

export async function preparePublicationMedia(
  media: CoursePublicationMediaPort,
  source: CourseSnapshot,
  signal: AbortSignal,
): Promise<CoursePublicationMediaPlan> {
  const merged: CoursePublicationMediaPlan = { tasks: [], voices: {}, profileHash: '' }
  // A course can be large. Transfer one published lesson at a time, never its learner data.
  for (const lesson of source.lessons) {
    const plan = await media.plan([lesson.published], signal)
    if (merged.profileHash && merged.profileHash !== plan.profileHash)
      throw new Error('A configuração de mídia mudou durante a preparação')
    merged.profileHash = plan.profileHash
    merged.tasks.push(...plan.tasks)
    Object.assign(merged.voices, plan.voices)
  }
  const unique = new Map<string, CoursePublicationMediaPlan['tasks'][number]>()
  for (const entry of merged.tasks) {
    if (unique.has(entry.id) && hash(unique.get(entry.id)!.input) !== hash(entry.input))
      throw new Error('Recurso repetido com conteúdo diferente')
    unique.set(entry.id, entry)
  }
  return CoursePublicationMediaPlanSchema.parse({
    ...merged,
    tasks: [...unique.values()],
  })
}
