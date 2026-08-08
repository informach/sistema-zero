import type { JSX } from 'react'
import { useState } from 'react'
import type { PintaTaskSession } from '../core/types'

export function TaskBriefPanel({
  session,
  outputMissing = false,
  onRecreate,
  onRelink,
}: {
  session: PintaTaskSession
  outputMissing?: boolean
  onRecreate?: () => void
  onRelink?: () => void
}): JSX.Element {
  const [updating, setUpdating] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const toggle = async (kind: 'step' | 'criterion', id: string, checked: boolean) => {
    if (updating || session.progress.status === 'completed') return
    setUpdating(true)
    const current =
      kind === 'step' ? session.progress.completedStepIds : session.progress.completedCriteriaIds
    const next = checked ? [...new Set([...current, id])] : current.filter((value) => value !== id)
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
  const requiredDone =
    session.guide.steps
      .filter((item) => item.required)
      .every((item) => session.progress.completedStepIds.includes(item.id)) &&
    session.guide.criteria
      .filter((item) => item.required)
      .every((item) => session.progress.completedCriteriaIds.includes(item.id))
  const outputReady =
    !!session.progress.outputRef &&
    !outputMissing &&
    (!session.brief.requiresStudioUse ||
      (!session.studioUseBlockedReason && !!session.progress.outputRef.usedInStudioAt))
  return (
    <details
      open
      className="mx-2 mt-2 shrink-0 rounded-2xl border-2 border-pin-accent/40 bg-pin-surface px-3 py-2"
    >
      <summary className="cursor-pointer text-sm font-black text-pin-text">
        Brief do meu jogo · {session.title}
      </summary>
      <div className="mt-2 grid max-h-52 gap-3 overflow-auto text-sm md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
        <div>
          <p className="font-bold text-pin-text">Como deve parecer</p>
          <p className="text-pin-muted">{session.brief.appearance}</p>
          <p className="mt-1 text-pin-muted">
            <b>Uso:</b> {session.brief.usage}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {session.brief.palette.map((color) => (
              <span
                key={`${color.role}-${color.color}`}
                className="inline-flex items-center gap-1 rounded-full bg-pin-bg px-2 py-1 text-xs"
                title={color.role}
              >
                <i className="size-3 rounded-full" style={{ background: color.color }} />
                {color.role}
              </span>
            ))}
          </div>
        </div>
        <div className="grid content-start gap-1">
          {session.guide.steps.map((item) => (
            <label key={item.id} className="flex min-h-11 items-start gap-2 py-1">
              <input
                type="checkbox"
                name={`task-step-${item.id}`}
                className="mt-1"
                disabled={updating || session.progress.status === 'completed'}
                checked={session.progress.completedStepIds.includes(item.id)}
                onChange={(event) => void toggle('step', item.id, event.target.checked)}
              />
              <span>
                {item.text}
                {item.hint ? <small className="block text-pin-muted">{item.hint}</small> : null}
              </span>
            </label>
          ))}
          {session.guide.criteria.map((item) => (
            <label key={item.id} className="flex min-h-11 items-start gap-2 py-1 font-bold">
              <input
                type="checkbox"
                name={`task-criterion-${item.id}`}
                className="mt-1"
                disabled={updating || session.progress.status === 'completed'}
                checked={session.progress.completedCriteriaIds.includes(item.id)}
                onChange={(event) => void toggle('criterion', item.id, event.target.checked)}
              />
              <span>Pronto quando: {item.text}</span>
            </label>
          ))}
        </div>
        <div className="flex min-w-40 flex-col justify-center gap-2">
          <span className="rounded-full bg-pin-bg px-3 py-1 text-center text-xs font-bold">
            {session.progress.status === 'planned'
              ? 'Planejada'
              : session.progress.status === 'in_progress'
                ? 'Em andamento'
                : 'Concluída ✓'}
          </span>
          {session.progress.status !== 'completed' ? (
            <button
              type="button"
              className="min-h-11 rounded-xl bg-pin-accent px-3 font-black text-pin-accent-fg disabled:opacity-50"
              disabled={updating || !requiredDone || !outputReady}
              onClick={() => void complete()}
            >
              Concluir tarefa
            </button>
          ) : null}
          {!session.progress.outputRef ? (
            <small className="text-center text-pin-muted">
              Crie ou vincule um desenho neste aparelho.
            </small>
          ) : null}
          {outputMissing ? (
            <div
              className="grid gap-2 rounded-xl border border-pin-danger/40 bg-pin-bg p-2"
              role="alert"
            >
              <small className="text-center font-bold text-pin-danger">
                Este desenho não está neste aparelho.
              </small>
              <button
                type="button"
                className="min-h-11 rounded-lg border border-pin-accent font-bold"
                onClick={onRecreate}
              >
                Recriar com este brief
              </button>
              <button
                type="button"
                className="min-h-11 rounded-lg border border-pin-border font-bold"
                onClick={onRelink}
              >
                Vincular outro desenho
              </button>
              <small className="text-center text-pin-muted">
                Para vincular, abra um desenho da galeria e salve-o.
              </small>
            </div>
          ) : null}
          {session.studioUseBlockedReason ? (
            <small className="text-center font-bold text-pin-danger">
              {session.studioUseBlockedReason}
            </small>
          ) : null}
          {!session.studioUseBlockedReason &&
          session.brief.requiresStudioUse &&
          !session.progress.outputRef?.usedInStudioAt ? (
            <small className="text-center text-pin-muted">
              Use “Usar no Estúdio” para liberar a conclusão.
            </small>
          ) : null}
          {syncError ? (
            <small className="text-center font-bold text-pin-danger" role="alert">
              {syncError}
            </small>
          ) : null}
        </div>
      </div>
    </details>
  )
}
