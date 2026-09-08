'use client'

import type { MoldaAsset } from '@sistemazero/molda/assets'
import { useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import type { MoldaPersistenceLike } from '@/lib/molda-cloud-persistence'
import { type MoldaGuideForm, moldaDraftKey, readMoldaGuideDraft } from './molda-task-draft'
import type { MoldaTaskHandoff, MoldaTaskProgressUpdate } from './use-pensa-task-handoff'

const button =
  'inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 py-2 font-bold disabled:opacity-50'
type GuideAsset = Pick<MoldaAsset, 'id' | 'name' | 'kind'>
export type MoldaGuidePersistence = Pick<MoldaPersistenceLike, 'load' | 'loadAll' | 'subscribe'> & {
  listSummaries?: () => Promise<GuideAsset[]>
}
export function MoldaTaskGuide({
  profileId,
  handoff,
  persistence,
  onProgress,
  onOpenAsset,
  onReturn,
  hasOpenCreation,
}: {
  profileId: string | null
  handoff: MoldaTaskHandoff
  persistence: MoldaGuidePersistence
  onProgress: (progress: MoldaTaskProgressUpdate) => void
  onOpenAsset: (id: string) => void
  onReturn: () => void
  hasOpenCreation: () => Promise<boolean>
}) {
  const { task } = handoff
  const [assets, setAssets] = useState<GuideAsset[]>([])
  const [initialDraft] = useState(() => readMoldaGuideDraft(profileId, task))
  const [form, setForm] = useState(initialDraft.form)
  const { steps, criteria, assetId } = form
  const [draftError, setDraftError] = useState(initialDraft.error)
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const [error, setError] = useState<string | null>(null)
  function updateForm(change: Partial<MoldaGuideForm>) {
    const next = { ...form, ...change }
    setForm(next)
    if (!profileId) return
    try {
      localStorage.setItem(
        moldaDraftKey(profileId, task.id),
        JSON.stringify({
          ...next,
          revision: task.revision,
          updatedAt: task.progress.updatedAt,
        }),
      )
      setDraftError(false)
    } catch {
      setDraftError(true)
    }
  }
  const dirty =
    JSON.stringify(steps) !== JSON.stringify(task.progress.completedStepIds) ||
    JSON.stringify(criteria) !== JSON.stringify(task.progress.completedCriteriaIds) ||
    assetId !== (task.progress.outputRef?.assetId ?? '')
  const loadAssets = useCallback(async () => {
    const all = persistence.listSummaries
      ? await persistence.listSummaries()
      : (await persistence.loadAll()).map(({ id, name, kind }) => ({ id, name, kind }))
    return all.filter((asset) => asset.kind === task.context.artKind)
  }, [persistence, task.context.artKind])
  useEffect(() => {
    let active = true
    const reload = () => {
      void loadAssets()
        .then((value) => {
          if (active) setAssets(value)
        })
        .catch(() => {
          if (active)
            setError(
              'Não conseguimos consultar suas criações. Tente guardar o progresso novamente.',
            )
        })
    }
    reload()
    const unsubscribe = persistence.subscribe?.((event) => {
      if (event.type === 'changed' || event.type === 'sync-end') reload()
    })
    return () => {
      active = false
      unsubscribe?.()
    }
  }, [loadAssets, persistence])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function save(complete = false): Promise<boolean> {
    if (saving.current) return false
    saving.current = true
    setBusy(true)
    setError(null)
    try {
      if (complete && (await hasOpenCreation()))
        throw new Error(
          'Use Voltar na barra do Molda para guardar e fechar a criação antes de concluir a tarefa.',
        )
      // Only bind a readable, saved creation of the requested kind in this profile's namespace.
      const selected = assetId ? await persistence.load(assetId) : null
      if (assetId && (!selected || selected.kind !== task.context.artKind))
        throw new Error(
          'Essa criação não está disponível aqui. Escolha uma criação guardada na sua galeria.',
        )
      const outputRef = selected
        ? {
            kind: 'molda_asset',
            assetId: selected.id,
            assetName: selected.name,
            assetKind: selected.kind,
          }
        : null
      const response = await fetch(`/api/pensa/tasks/${encodeURIComponent(task.id)}/progress`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: complete
            ? 'completed'
            : task.progress.status === 'planned'
              ? 'in_progress'
              : task.progress.status,
          completedStepIds: steps,
          completedCriteriaIds: criteria,
          outputRef,
          expectedUpdatedAt: task.progress.updatedAt,
        }),
      })
      if (!response.ok)
        throw new Error(
          response.status === 409
            ? 'O plano mudou em outra aba. Volte ao Pensa para consultar a versão atual.'
            : 'Não conseguimos guardar o progresso no plano. Tente novamente.',
        )
      const raw: unknown = await response.json()
      const parsed = moldaProgressResponseSchema.safeParse(raw)
      if (!parsed.success)
        throw new Error(
          'A confirmação do plano não chegou completa. Consulte o plano antes de continuar.',
        )
      onProgress(parsed.data.task.progress)
      if (profileId) {
        try {
          localStorage.removeItem(moldaDraftKey(profileId, task.id))
          setDraftError(false)
        } catch {
          setDraftError(true)
        }
      }
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não conseguimos guardar o progresso.')
      return false
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  const ready =
    Boolean(assetId) &&
    task.guide.steps.every((item) => !item.required || steps.includes(item.id)) &&
    task.guide.criteria.every((item) => !item.required || criteria.includes(item.id))
  const done = task.progress.status === 'completed'
  async function navigate(action: () => void) {
    try {
      if (await hasOpenCreation()) {
        setError('Use Voltar na barra do Molda para guardar e fechar a criação antes de sair.')
        return
      }
      if (dirty && !(await save())) return
      if (await hasOpenCreation()) {
        setError('Use Voltar na barra do Molda para guardar e fechar a criação antes de sair.')
        return
      }
      action()
    } catch {
      setError('Não conseguimos conferir o salvamento. Volte à galeria do Molda e tente novamente.')
    }
  }
  const toggle = (values: string[], id: string) =>
    values.includes(id) ? values.filter((value) => value !== id) : [...values, id]
  return (
    <details open className="mb-3 shrink-0 rounded-2xl border border-primary/25 bg-card">
      <summary className="min-h-11 cursor-pointer px-5 py-3 font-bold">
        {task.title} · {done ? 'Tarefa concluída' : 'Guia do Pensa'}
      </summary>
      <div className="max-h-80 space-y-4 overflow-y-auto px-5 pb-5">
        <p className="text-sm text-muted-foreground">{task.context.appearance}</p>
        <p className="text-sm">
          <strong>No jogo:</strong> {task.context.usage}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              title: 'Passos',
              items: task.guide.steps,
              values: steps,
              update: (steps: string[]) => updateForm({ steps }),
            },
            {
              title: 'Confira sua criação',
              items: task.guide.criteria,
              values: criteria,
              update: (criteria: string[]) => updateForm({ criteria }),
            },
          ].map((group) => (
            <fieldset key={group.title} disabled={busy || done}>
              <legend className="font-bold">{group.title}</legend>
              {group.items.map((item) => (
                <label key={item.id} className="flex min-h-11 items-center gap-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={group.values.includes(item.id)}
                    onChange={() => group.update(toggle(group.values, item.id))}
                    className="size-5 shrink-0 accent-primary"
                  />
                  <span>
                    {item.text}
                    {item.required ? '' : ' (opcional)'}
                    {item.hint ? (
                      <small className="block text-muted-foreground">{item.hint}</small>
                    ) : null}
                  </span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
        <label className="block text-sm font-bold" htmlFor="molda-task-asset">
          Criação que você guardou
        </label>
        <select
          id="molda-task-asset"
          disabled={busy || done}
          value={assetId}
          onChange={(event) => updateForm({ assetId: event.target.value })}
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3"
        >
          <option value="">Escolha depois de salvar na galeria</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name}
            </option>
          ))}
        </select>
        {assetId && !assets.some((asset) => asset.id === assetId) ? (
          <p role="status" className="text-sm">
            A criação vinculada ainda não está disponível nesta galeria.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {!done ? (
            <>
              <button type="button" className={button} disabled={busy} onClick={() => save()}>
                {busy
                  ? 'Guardando…'
                  : task.progress.status === 'planned'
                    ? 'Começar tarefa'
                    : 'Guardar progresso'}
              </button>
              <button
                type="button"
                className={`${button} bg-primary text-primary-foreground`}
                disabled={busy || !ready || task.progress.status === 'planned'}
                onClick={() => save(true)}
              >
                Concluir tarefa
              </button>
            </>
          ) : null}
          {assetId && assets.some((asset) => asset.id === assetId) ? (
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={async () => {
                await navigate(() => onOpenAsset(assetId))
              }}
            >
              Abrir criação vinculada
            </button>
          ) : null}
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={async () => {
              await navigate(onReturn)
            }}
          >
            Voltar ao plano
          </button>
        </div>
        <p role="status" className="text-xs text-muted-foreground">
          {dirty
            ? draftError || !profileId
              ? 'Guarde o progresso antes de sair: este navegador não conseguiu manter seu rascunho.'
              : 'Rascunho guardado neste navegador. Guarde o progresso para atualizar o plano.'
            : 'O progresso do guia está guardado no plano.'}{' '}
          A criação continua com o mesmo nome e identificação na galeria.
        </p>
      </div>
    </details>
  )
}

const moldaProgressResponseSchema = z.object({
  task: z.object({
    progress: z.object({
      status: z.enum(['planned', 'in_progress', 'completed']),
      completedStepIds: z.array(z.string()),
      completedCriteriaIds: z.array(z.string()),
      outputRef: z
        .object({
          kind: z.literal('molda_asset'),
          assetId: z.string(),
          assetName: z.string().optional(),
          assetKind: z.enum(['model', 'texture', 'sky']),
        })
        .nullable(),
      startedAt: z.string().nullable(),
      completedAt: z.string().nullable(),
      updatedAt: z.string().nullable(),
    }),
  }),
})
