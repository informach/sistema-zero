/**
 * Quadro de missões: 4 colunas kids (Missões/Fazendo agora/Hora de testar/
 * Prontas) com contadores; no mobile as colunas viram ABAS horizontais. O
 * caminho primário é o botão de ESTADO do card (touch e desktop); a regra
 * "só 1 em Fazendo agora" pergunta num Dialog antes de trocar (a atual volta
 * para o backlog). O 1º card do backlog é a "próxima recomendada".
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { useId, useState } from 'react'
import { useStore } from 'zustand'
import type { PensaTaskColumn, PensaTaskView } from '../../core/types'
import type { PensaStageRStore } from '../../state/stageRStore'
import { usePensaApp } from '../appContext'
import { Dialog } from '../common/Dialog'
import { useMediaQuery } from '../common/useMediaQuery'
import { MissionCard } from './MissionCard'

const COLUMNS: readonly PensaTaskColumn[] = ['backlog', 'doing', 'review', 'done'] as const

const COLUMN_EMOJI: Record<PensaTaskColumn, string> = {
  backlog: '🗺️',
  doing: '🔨',
  review: '🔍',
  done: '🏆',
}

/** Coluna seguinte do caminho primário (done não tem ação). */
const NEXT_COLUMN: Record<PensaTaskColumn, PensaTaskColumn | null> = {
  backlog: 'doing',
  doing: 'review',
  review: 'done',
  done: null,
}

function byColumn(tasks: PensaTaskView[], column: PensaTaskColumn): PensaTaskView[] {
  return tasks.filter((task) => task.column === column).sort((a, b) => a.position - b.position)
}

export function KanbanBoard({
  store,
  onOpenMission,
}: {
  store: PensaStageRStore
  onOpenMission: (taskId: string) => void
}): JSX.Element | null {
  const { copy } = usePensaApp()
  const c = copy.stageR
  const tasks = useStore(store, (s) => s.tasks)
  const movingTaskId = useStore(store, (s) => s.movingTaskId)
  const moveError = useStore(store, (s) => s.moveError)
  // Mobile: colunas viram abas horizontais (uma coluna visível por vez).
  const wide = useMediaQuery('(min-width: 768px)')
  const [tab, setTab] = useState<PensaTaskColumn>('backlog')
  // Card do backlog aguardando a confirmação de troca (regra 1-em-doing).
  const [swapTaskId, setSwapTaskId] = useState<string | null>(null)
  const panelId = useId()

  if (!tasks) return null

  const recommendedId = byColumn(tasks, 'backlog')[0]?.id ?? null
  const busy = movingTaskId !== null

  const handleAction = (task: PensaTaskView): void => {
    const target = NEXT_COLUMN[task.column]
    if (!target) return
    if (target === 'doing' && tasks.some((t) => t.column === 'doing' && t.id !== task.id)) {
      setSwapTaskId(task.id)
      return
    }
    void store.getState().moveTask(task.id, target)
  }

  const handleSwapConfirm = (): void => {
    const taskId = swapTaskId
    setSwapTaskId(null)
    if (taskId) void store.getState().swapDoing(taskId)
  }

  const renderColumn = (column: PensaTaskColumn, withHeader: boolean): JSX.Element => {
    const columnTasks = byColumn(tasks, column)
    return (
      <div key={column} data-board-column={column} className="flex min-w-0 flex-col gap-2">
        {withHeader ? (
          <h4 className="flex items-center gap-1.5 px-1 text-sm font-extrabold text-pz-text">
            <span aria-hidden="true">{COLUMN_EMOJI[column]}</span>
            {copy.kanban[column]}
            <span className="ml-auto rounded-full bg-pz-bg px-2 py-0.5 text-xs font-bold text-pz-muted">
              {columnTasks.length}
            </span>
          </h4>
        ) : null}
        <div className="flex flex-col gap-2 rounded-2xl bg-pz-bg p-2">
          {columnTasks.map((task) => (
            <MissionCard
              key={task.id}
              task={task}
              recommended={task.id === recommendedId}
              busy={busy}
              onOpen={() => onOpenMission(task.id)}
              onAction={() => handleAction(task)}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <section aria-label={c.boardLabel} className="flex flex-col gap-3">
      {moveError ? (
        <p
          role="alert"
          className="rounded-2xl border-2 border-pz-warn bg-pz-surface px-4 py-2.5 font-semibold text-pz-warn"
        >
          {moveError}
        </p>
      ) : null}

      {wide ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {COLUMNS.map((column) => renderColumn(column, true))}
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label={c.columnsLabel}
            className="flex gap-1.5 overflow-x-auto pb-1"
          >
            {COLUMNS.map((column) => (
              <button
                key={column}
                type="button"
                role="tab"
                aria-selected={tab === column}
                aria-controls={panelId}
                onClick={() => setTab(column)}
                className={clsx(
                  'flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl border-2 px-3 text-sm font-bold transition',
                  tab === column
                    ? 'border-pz-accent bg-pz-accent/10 text-pz-accent'
                    : 'border-pz-border text-pz-muted hover:border-pz-accent',
                )}
              >
                <span aria-hidden="true">{COLUMN_EMOJI[column]}</span>
                {copy.kanban[column]}
                <span className="rounded-full bg-pz-bg px-1.5 text-xs">
                  {byColumn(tasks, column).length}
                </span>
              </button>
            ))}
          </div>
          <div id={panelId} role="tabpanel">
            {renderColumn(tab, false)}
          </div>
        </>
      )}

      <Dialog open={swapTaskId !== null} onClose={() => setSwapTaskId(null)} title={c.swapTitle}>
        <div className="flex flex-col gap-4">
          <p className="text-pz-muted">{c.swapBody}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setSwapTaskId(null)}
              className="min-h-11 rounded-2xl border-2 border-pz-border px-5 font-semibold text-pz-muted transition hover:bg-pz-bg hover:text-pz-text"
            >
              {c.swapCancel}
            </button>
            <button
              type="button"
              onClick={handleSwapConfirm}
              className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105"
            >
              {c.swapConfirm}
            </button>
          </div>
        </div>
      </Dialog>
    </section>
  )
}
