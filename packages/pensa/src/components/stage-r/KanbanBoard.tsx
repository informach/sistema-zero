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
import { MissionEditor } from './MissionEditor'

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
  projectId,
  onOpenMission,
}: {
  store: PensaStageRStore
  /** Id do projeto do Pensa (p/ "sugerir mais missões" via IA). */
  projectId: string
  onOpenMission: (taskId: string) => void
}): JSX.Element | null {
  const { copy } = usePensaApp()
  const c = copy.stageR
  const a = c.author
  const tasks = useStore(store, (s) => s.tasks)
  const movingTaskId = useStore(store, (s) => s.movingTaskId)
  const moveError = useStore(store, (s) => s.moveError)
  const savingTask = useStore(store, (s) => s.savingTask)
  const suggestingMore = useStore(store, (s) => s.suggestingMore)
  const taskActionError = useStore(store, (s) => s.taskActionError)
  // Mobile: colunas viram abas horizontais (uma coluna visível por vez).
  const wide = useMediaQuery('(min-width: 768px)')
  const [tab, setTab] = useState<PensaTaskColumn>('backlog')
  // Card do backlog aguardando a confirmação de troca (regra 1-em-doing).
  const [swapTaskId, setSwapTaskId] = useState<string | null>(null)
  // Editor de missão (autoria manual): 'new' = criar, task = editar, null = fechado.
  const [editorTask, setEditorTask] = useState<PensaTaskView | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PensaTaskView | null>(null)
  // Último move anunciado (aria-live) — visível só para leitores de tela.
  const [announce, setAnnounce] = useState<string | null>(null)
  const panelId = useId()

  if (!tasks) return null

  const recommendedId = byColumn(tasks, 'backlog')[0]?.id ?? null
  const busy = movingTaskId !== null

  // Feedback do move: no mobile o card "sumiria" da aba atual sem isto — a aba
  // segue o card; o anúncio cobre leitores de tela em qualquer largura.
  const followMove = (target: PensaTaskColumn): void => {
    setAnnounce(c.movedTo(copy.kanban[target]))
    if (!wide) setTab(target)
  }

  const handleAction = (task: PensaTaskView): void => {
    const target = NEXT_COLUMN[task.column]
    if (!target) return
    if (target === 'doing' && tasks.some((t) => t.column === 'doing' && t.id !== task.id)) {
      setSwapTaskId(task.id)
      return
    }
    void store
      .getState()
      .moveTask(task.id, target)
      .then((ok) => {
        if (ok) followMove(target)
      })
  }

  const handleSwapConfirm = (): void => {
    const taskId = swapTaskId
    setSwapTaskId(null)
    if (taskId) {
      void store
        .getState()
        .swapDoing(taskId)
        .then((ok) => {
          if (ok) followMove('doing')
        })
    }
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
          {columnTasks.map((task, index) => (
            <MissionCard
              key={task.id}
              task={task}
              recommended={task.id === recommendedId}
              busy={busy}
              onOpen={() => onOpenMission(task.id)}
              onAction={() => handleAction(task)}
              author={{
                onEdit: () => setEditorTask(task),
                onDelete: () => setDeleteTarget(task),
                onMoveUp: () => void store.getState().reorderTask(task.id, 'up'),
                onMoveDown: () => void store.getState().reorderTask(task.id, 'down'),
                canMoveUp: index > 0,
                canMoveDown: index < columnTasks.length - 1,
                onNotesSave: (notes) => void store.getState().setTaskNotes(task.id, notes),
              }}
            />
          ))}
          {columnTasks.length === 0 ? (
            <p className="px-2 py-3 text-center text-sm text-pz-muted">{c.emptyColumn[column]}</p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <section aria-label={c.boardLabel} className="flex flex-col gap-3">
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      {/* Autoria manual: a criança cria a sua missão OU pede mais pro Zappy. */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditorTask('new')}
          disabled={savingTask}
          className="min-h-11 rounded-2xl bg-pz-accent px-4 font-bold text-pz-accent-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true">➕ </span>
          {a.addMission}
        </button>
        <button
          type="button"
          onClick={() => void store.getState().suggestMoreMissions(projectId)}
          disabled={suggestingMore}
          aria-busy={suggestingMore || undefined}
          className="min-h-11 rounded-2xl border-2 border-pz-border px-4 font-semibold text-pz-text transition hover:border-pz-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true">✨ </span>
          {suggestingMore ? a.suggestingMore : a.suggestMore}
        </button>
      </div>

      {moveError || taskActionError ? (
        <p
          role="alert"
          className="rounded-2xl border-2 border-pz-warn bg-pz-surface px-4 py-2.5 font-semibold text-pz-warn"
        >
          {moveError ?? taskActionError}
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

      {/* Editor de missão (criar/editar à mão). `key` remonta ao trocar de alvo. */}
      {editorTask !== null ? (
        <MissionEditor
          key={editorTask === 'new' ? 'new' : editorTask.id}
          store={store}
          open
          task={editorTask === 'new' ? null : editorTask}
          onClose={() => setEditorTask(null)}
        />
      ) : null}

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={a.deleteTitle}
      >
        <div className="flex flex-col gap-4">
          <p className="text-pz-muted">{a.deleteBody}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="min-h-11 rounded-2xl border-2 border-pz-border px-5 font-semibold text-pz-muted transition hover:bg-pz-bg hover:text-pz-text"
            >
              {a.deleteCancel}
            </button>
            <button
              type="button"
              onClick={() => {
                const target = deleteTarget
                setDeleteTarget(null)
                if (target) void store.getState().removeTask(target.id)
              }}
              className="min-h-11 rounded-2xl bg-pz-warn px-5 font-bold text-pz-surface transition hover:brightness-105"
            >
              {a.deleteConfirm}
            </button>
          </div>
        </div>
      </Dialog>
    </section>
  )
}
