import type { JSX } from 'react'
import { useState } from 'react'
import type { StudioTaskSession } from './types'

export function TaskGuidePanel({ session }: { session: StudioTaskSession }): JSX.Element {
  const [updating, setUpdating] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const change = async (kind: 'step' | 'criterion', id: string, checked: boolean) => {
    if (updating || session.progress.status === 'completed') return
    setUpdating(true)
    const values =
      kind === 'step' ? session.progress.completedStepIds : session.progress.completedCriteriaIds
    const next = checked ? [...new Set([...values, id])] : values.filter((value) => value !== id)
    try {
      setSyncError(null)
      await session.onProgress(
        kind === 'step' ? { completedStepIds: next } : { completedCriteriaIds: next },
      )
    } catch {
      setSyncError('Não consegui salvar agora. Confira a internet e tente de novo.')
    } finally {
      setUpdating(false)
    }
  }
  const complete = async () => {
    setUpdating(true)
    setSyncError(null)
    try {
      await session.onProgress({ status: 'completed' })
    } catch {
      setSyncError('Não consegui concluir agora. Confira a internet e tente de novo.')
    } finally {
      setUpdating(false)
    }
  }
  const ready =
    !!session.progress.outputRef &&
    session.guide.steps
      .filter((item) => item.required)
      .every((item) => session.progress.completedStepIds.includes(item.id)) &&
    session.guide.criteria
      .filter((item) => item.required)
      .every((item) => session.progress.completedCriteriaIds.includes(item.id))
  return (
    <aside
      className="max-h-64 shrink-0 overflow-auto border-sz-border border-b bg-sz-surface p-3 text-sz-fg lg:max-h-none lg:w-80 lg:border-r lg:border-b-0"
      aria-label="Guia da tarefa"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sz-accent text-xs font-bold uppercase tracking-wide">Guia da tarefa</p>
          <h2 className="font-bold text-base">{session.title}</h2>
          {session.summary ? (
            <p className="mt-1 text-sz-fg-soft text-xs">{session.summary}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-sz-bg px-2 py-1 text-[10px] font-bold">
          {session.progress.status === 'planned'
            ? 'Planejada'
            : session.progress.status === 'in_progress'
              ? 'Em andamento'
              : 'Concluída'}
        </span>
      </div>
      <div className="grid gap-2 text-sm">
        {session.guide.steps.map((item) => (
          <label key={item.id} className="flex min-h-9 items-start gap-2 rounded-lg bg-sz-bg p-2">
            <input
              type="checkbox"
              className="mt-1"
              disabled={updating || session.progress.status === 'completed'}
              checked={session.progress.completedStepIds.includes(item.id)}
              onChange={(event) => void change('step', item.id, event.target.checked)}
            />
            <span>
              {item.text}
              {item.hint ? <small className="block text-sz-fg-soft">{item.hint}</small> : null}
            </span>
          </label>
        ))}
      </div>
      {session.blocks.length ? (
        <div className="my-3">
          <p className="mb-1 text-xs font-bold">Blocos úteis</p>
          <div className="flex flex-wrap gap-1">
            {session.blocks.map((block) => (
              <code
                key={block.id}
                className="rounded-md bg-sz-accent/10 px-2 py-1 text-[11px] text-sz-accent"
                title={`${block.category} › ${block.subcategory}`}
              >
                {block.label}
              </code>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-2 border-sz-border border-t pt-3 text-sm">
        {session.guide.criteria.map((item) => (
          <label key={item.id} className="flex min-h-9 items-start gap-2 font-semibold">
            <input
              type="checkbox"
              className="mt-1"
              disabled={updating || session.progress.status === 'completed'}
              checked={session.progress.completedCriteriaIds.includes(item.id)}
              onChange={(event) => void change('criterion', item.id, event.target.checked)}
            />
            <span>Pronto quando: {item.text}</span>
          </label>
        ))}
      </div>
      {session.progress.status !== 'completed' ? (
        <button
          type="button"
          className="mt-3 min-h-11 w-full rounded-lg bg-sz-accent px-3 font-bold text-white disabled:opacity-50"
          disabled={updating || !ready}
          onClick={() => void complete()}
        >
          Concluir tarefa
        </button>
      ) : null}
      {syncError ? (
        <p className="mt-2 text-xs font-bold text-sz-danger" role="alert">
          {syncError}
        </p>
      ) : null}
    </aside>
  )
}
