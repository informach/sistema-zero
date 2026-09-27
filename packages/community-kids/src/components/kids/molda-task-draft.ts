import { z } from 'zod'
import type { MoldaTaskHandoff } from './use-pensa-task-handoff'

const draftSchema = z.object({
  revision: z.number().int(),
  updatedAt: z.string().nullable(),
  steps: z.array(z.string()).max(100),
  criteria: z.array(z.string()).max(100),
  assetId: z.string(),
})
export type MoldaGuideForm = Pick<z.infer<typeof draftSchema>, 'steps' | 'criteria' | 'assetId'>
export const moldaDraftKey = (profileId: string, taskId: string) =>
  `sz-molda-guide:${profileId}:${taskId}`

/** A local draft cannot overwrite progress from a newer plan or another tab. */
export function readMoldaGuideDraft(profileId: string | null, task: MoldaTaskHandoff['task']) {
  const saved: MoldaGuideForm = {
    steps: task.progress.completedStepIds,
    criteria: task.progress.completedCriteriaIds,
    assetId: task.progress.outputRef?.assetId ?? '',
  }
  if (!profileId || task.progress.status === 'completed') return { form: saved, error: false }
  try {
    const raw = localStorage.getItem(moldaDraftKey(profileId, task.id))
    if (!raw) return { form: saved, error: false }
    const draft = draftSchema.safeParse(JSON.parse(raw))
    if (!draft.success) return { form: saved, error: true }
    if (draft.data.revision !== task.revision || draft.data.updatedAt !== task.progress.updatedAt)
      return { form: saved, error: false }
    return {
      form: {
        steps: draft.data.steps.filter((id) => task.guide.steps.some((item) => item.id === id)),
        criteria: draft.data.criteria.filter((id) =>
          task.guide.criteria.some((item) => item.id === id),
        ),
        assetId: draft.data.assetId,
      },
      error: false,
    }
  } catch {
    return { form: saved, error: true }
  }
}
