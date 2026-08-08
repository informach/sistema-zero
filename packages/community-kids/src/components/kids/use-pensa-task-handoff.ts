'use client'

import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'

const guideItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  hint: z.string().optional(),
  required: z.boolean(),
})

const guideSchema = z.object({
  steps: z.array(guideItemSchema),
  criteria: z.array(guideItemSchema),
})

const pintaContextSchema = z.object({
  kind: z.literal('pinta'),
  assetId: z.string(),
  artKind: z.enum(['sprite', 'background', 'tileset', 'tilemap']),
  style: z.enum(['pixel', 'vector', 'either']),
  preset: z.string().optional(),
  palette: z.array(z.object({ role: z.string(), color: z.string() })),
  appearance: z.string(),
  animations: z.array(z.string()),
  states: z.array(z.string()),
  usage: z.string(),
  requiresStudioUse: z.boolean(),
})

const studioContextSchema = z.object({
  kind: z.literal('studio'),
  dimension: z.enum(['2d', '3d']),
  visualAssetIds: z.array(z.string()),
  blockIds: z.array(z.string()),
  blocks: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      category: z.string(),
      subcategory: z.string(),
      area: z.enum(['structure', 'appearance', 'start', 'events', 'loops', 'value']),
      extension: z.string().nullable(),
    }),
  ),
  mechanicDocumentIds: z.array(z.string()),
  extensionIds: z.array(z.string()),
})

const pintaOutputRefSchema = z.object({
  kind: z.literal('pinta_asset'),
  assetId: z.string(),
  assetName: z.string().optional(),
  usedInStudioAt: z.string().optional(),
})

const studioOutputRefSchema = z.object({
  kind: z.literal('studio_project'),
  projectId: z.string(),
  saveRevision: z.string().optional(),
})

const commonProgressShape = {
  status: z.enum(['planned', 'in_progress', 'completed']),
  completedStepIds: z.array(z.string()),
  completedCriteriaIds: z.array(z.string()),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
}

const pintaProgressSchema = z.object({
  ...commonProgressShape,
  outputRef: pintaOutputRefSchema.nullable(),
})

const studioProgressSchema = z.object({
  ...commonProgressShape,
  outputRef: studioOutputRefSchema.nullable(),
})

const commonProgressUpdateShape = {
  status: z.enum(['planned', 'in_progress', 'completed']),
  completedStepIds: z.array(z.string()),
  completedCriteriaIds: z.array(z.string()),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
}

const pintaProgressUpdateSchema = z.object({
  ...commonProgressUpdateShape,
  outputRef: pintaOutputRefSchema.nullable(),
})

const studioProgressUpdateSchema = z.object({
  ...commonProgressUpdateShape,
  outputRef: studioOutputRefSchema.nullable(),
})

const commonTaskShape = {
  id: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  category: z.enum(['art', 'setup', 'gameplay', 'scene', 'ui', 'polish']),
  estimatedMinutes: z.number(),
  position: z.number(),
  dependencies: z.array(z.string()),
  guide: guideSchema,
  revision: z.number(),
  supersedesTaskId: z.string().nullable(),
}

const capabilitySchema = z.object({
  owned: z.boolean(),
  blockedReason: z.string().nullable(),
})

const handoffBaseShape = {
  project: z.object({ id: z.string(), name: z.string() }),
  cycle: z.object({ id: z.string(), number: z.number(), goal: z.string().nullable() }),
  capability: capabilitySchema,
}

const pintaHandoffSchema = z.object({
  ...handoffBaseShape,
  task: z.object({
    ...commonTaskShape,
    destination: z.literal('pinta'),
    context: pintaContextSchema,
    progress: pintaProgressSchema,
  }),
})

const studioHandoffSchema = z.object({
  ...handoffBaseShape,
  task: z.object({
    ...commonTaskShape,
    destination: z.literal('studio'),
    context: studioContextSchema,
    progress: studioProgressSchema,
  }),
})

const errorEnvelopeSchema = z.object({
  error: z.object({ message: z.string().optional() }).optional(),
})

export type PintaTaskProgressUpdate = z.infer<typeof pintaProgressUpdateSchema>
export type StudioTaskProgressUpdate = z.infer<typeof studioProgressUpdateSchema>
export type PintaTaskHandoff = z.infer<typeof pintaHandoffSchema>
export type StudioTaskHandoff = z.infer<typeof studioHandoffSchema>
type Destination = 'pinta' | 'studio'

type HandoffState<T> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: string }

type HandoffResult<T, P> = HandoffState<T> & {
  retry: () => void
  updateProgress: (progress: P) => void
}

class HandoffLoadError extends Error {}

const copy = {
  pinta: {
    network: 'Não consegui carregar o brief desta tarefa. Tente de novo.',
    wrong: 'Esta tarefa não pertence ao Pinta.',
  },
  studio: {
    network: 'Não consegui carregar o guia desta tarefa. Tente de novo.',
    wrong: 'Esta tarefa não pertence ao Estúdio.',
  },
} satisfies Record<Destination, { network: string; wrong: string }>

interface HandoffConfig<T, P> {
  destination: Destination
  schema: z.ZodType<T>
  progressSchema: z.ZodType<P>
  networkCopy: string
  wrongCopy: string
  mergeProgress: (data: T, progress: P) => T
}

const pintaConfig: HandoffConfig<PintaTaskHandoff, PintaTaskProgressUpdate> = {
  destination: 'pinta',
  schema: pintaHandoffSchema,
  progressSchema: pintaProgressUpdateSchema,
  networkCopy: copy.pinta.network,
  wrongCopy: copy.pinta.wrong,
  mergeProgress: (data, progress) => ({
    ...data,
    task: { ...data.task, progress: { ...data.task.progress, ...progress } },
  }),
}

const studioConfig: HandoffConfig<StudioTaskHandoff, StudioTaskProgressUpdate> = {
  destination: 'studio',
  schema: studioHandoffSchema,
  progressSchema: studioProgressUpdateSchema,
  networkCopy: copy.studio.network,
  wrongCopy: copy.studio.wrong,
  mergeProgress: (data, progress) => ({
    ...data,
    task: { ...data.task, progress: { ...data.task.progress, ...progress } },
  }),
}

function useTaskHandoff<T, P>(
  taskId: string | null,
  config: HandoffConfig<T, P>,
): HandoffResult<T, P> {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<HandoffState<T>>(
    taskId
      ? { status: 'loading', data: null, error: null }
      : { status: 'idle', data: null, error: null },
  )

  useEffect(() => {
    if (!taskId) {
      setState({ status: 'idle', data: null, error: null })
      return
    }

    const controller = new AbortController()
    setState({ status: 'loading', data: null, error: null })
    void (async () => {
      try {
        const response = await fetch(`/api/pensa/tasks/${encodeURIComponent(taskId)}/handoff`, {
          signal: controller.signal,
          cache: attempt === 0 ? 'default' : 'reload',
        })
        let body: unknown = null
        try {
          body = await response.json()
        } catch {
          if (!response.ok) throw new HandoffLoadError(config.networkCopy)
        }
        if (!response.ok) {
          const envelope = errorEnvelopeSchema.safeParse(body)
          throw new HandoffLoadError(
            envelope.success
              ? (envelope.data.error?.message ?? config.networkCopy)
              : config.networkCopy,
          )
        }
        const parsed = config.schema.safeParse(body)
        if (!parsed.success) throw new HandoffLoadError(config.wrongCopy)
        if (!controller.signal.aborted) {
          setState({ status: 'success', data: parsed.data, error: null })
        }
      } catch (cause) {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          data: null,
          error: cause instanceof HandoffLoadError ? cause.message : config.networkCopy,
        })
      }
    })()

    return () => controller.abort()
  }, [attempt, config, taskId])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const updateProgress = useCallback(
    (progress: P) => {
      setState((current) => {
        if (current.status !== 'success') return current
        const parsed = config.progressSchema.safeParse(progress)
        if (!parsed.success) return current
        return { ...current, data: config.mergeProgress(current.data, parsed.data) }
      })
    },
    [config],
  )

  return { ...state, retry, updateProgress }
}

export function usePintaTaskHandoff(
  taskId: string | null,
): HandoffResult<PintaTaskHandoff, PintaTaskProgressUpdate> {
  return useTaskHandoff(taskId, pintaConfig)
}

export function useStudioTaskHandoff(
  taskId: string | null,
): HandoffResult<StudioTaskHandoff, StudioTaskProgressUpdate> {
  return useTaskHandoff(taskId, studioConfig)
}
