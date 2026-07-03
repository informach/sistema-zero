/**
 * Editor de missão à mão (autoria manual): nome + passos + sinais de "fica pronto".
 * Cria (addTask) ou edita (editTask) 1 card do kanban. Steps 1–12 e doneWhen 1–3
 * espelham o contrato (o members revalida). O host pré-preenche no modo editar.
 */
import type { JSX } from 'react'
import { useState } from 'react'
import { useStore } from 'zustand'
import type { PensaTaskView } from '../../core/types'
import type { PensaStageRStore, PensaTaskDraft } from '../../state/stageRStore'
import { usePensaApp } from '../appContext'
import { Dialog } from '../common/Dialog'

const MAX_STEPS = 12
const MAX_DONE = 3

/** Linhas iniciais a partir de uma task existente (editar) ou vazias (criar). */
function initialLines(task: PensaTaskView | null): {
  title: string
  steps: string[]
  done: string[]
} {
  if (!task) return { title: '', steps: [''], done: [''] }
  return {
    title: task.title,
    steps: task.mission.steps.length > 0 ? task.mission.steps.map((s) => s.text) : [''],
    done: task.mission.doneWhen.length > 0 ? [...task.mission.doneWhen] : [''],
  }
}

export function MissionEditor({
  store,
  open,
  task,
  onClose,
}: {
  store: PensaStageRStore
  open: boolean
  /** Task a editar; `null` = criar nova. */
  task: PensaTaskView | null
  onClose: () => void
}): JSX.Element {
  const { copy } = usePensaApp()
  const c = copy.stageR.author
  const saving = useStore(store, (s) => s.savingTask)
  const actionError = useStore(store, (s) => s.taskActionError)

  // Re-semeia quando o alvo muda (o `key` no pai também força a remontagem).
  const seed = initialLines(task)
  const [title, setTitle] = useState(seed.title)
  const [steps, setSteps] = useState<string[]>(seed.steps)
  const [done, setDone] = useState<string[]>(seed.done)
  const [error, setError] = useState<string | null>(null)

  const setAt = (
    list: string[],
    setList: (v: string[]) => void,
    index: number,
    value: string,
  ): void => {
    setList(list.map((item, i) => (i === index ? value : item)))
  }

  const handleSave = async (): Promise<void> => {
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setError(c.needTitle)
      return
    }
    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean)
    const cleanDone = done.map((d) => d.trim()).filter(Boolean)
    const draft: PensaTaskDraft = {
      title: cleanTitle,
      mission: {
        steps: (cleanSteps.length > 0 ? cleanSteps : ['Fazer esta parte']).map((text) => ({
          text,
        })),
        doneWhen: cleanDone.length > 0 ? cleanDone : ['Ficou do jeito que imaginei'],
      },
    }
    setError(null)
    const ok = task
      ? await store.getState().editTask(task.id, draft)
      : await store.getState().addTask(draft)
    if (ok) onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={task ? c.editorEditTitle : c.editorNewTitle}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleSave()
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-pz-text">{c.titleLabel}</span>
          <input
            type="text"
            value={title}
            maxLength={200}
            autoComplete="off"
            onChange={(e) => {
              setTitle(e.target.value)
              setError(null)
            }}
            placeholder={c.titlePlaceholder}
            className="min-h-11 rounded-2xl border-2 border-pz-border bg-pz-bg px-4 text-pz-text outline-none placeholder:text-pz-muted focus:border-pz-accent"
          />
        </label>

        <ListField
          label={c.stepsLabel}
          items={steps}
          setItems={setSteps}
          setAt={(i, v) => setAt(steps, setSteps, i, v)}
          placeholder={c.stepPlaceholder}
          addLabel={c.addStep}
          removeLabel={c.removeStep}
          max={MAX_STEPS}
          numbered
        />

        <ListField
          label={c.doneWhenLabel}
          items={done}
          setItems={setDone}
          setAt={(i, v) => setAt(done, setDone, i, v)}
          placeholder={c.donePlaceholder}
          addLabel={c.addDone}
          removeLabel={c.removeDone}
          max={MAX_DONE}
        />

        {error || actionError ? (
          <p role="alert" className="text-sm font-semibold text-pz-warn">
            {error ?? actionError}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-2xl border-2 border-pz-border px-5 font-semibold text-pz-muted transition hover:bg-pz-bg hover:text-pz-text"
          >
            {c.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            aria-busy={saving || undefined}
            className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? c.saving : c.save}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

function ListField({
  label,
  items,
  setItems,
  setAt,
  placeholder,
  addLabel,
  removeLabel,
  max,
  numbered,
}: {
  label: string
  items: string[]
  setItems: (v: string[]) => void
  setAt: (index: number, value: string) => void
  placeholder: string
  addLabel: string
  removeLabel: string
  max: number
  numbered?: boolean
}): JSX.Element {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="font-semibold text-pz-text">{label}</legend>
      {items.map((item, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: a posição É a identidade da linha do formulário.
          key={index}
          className="flex items-center gap-2"
        >
          {numbered ? (
            <span
              aria-hidden="true"
              className="w-5 shrink-0 text-right text-sm font-bold text-pz-muted"
            >
              {index + 1}.
            </span>
          ) : null}
          <input
            type="text"
            value={item}
            maxLength={300}
            autoComplete="off"
            onChange={(e) => setAt(index, e.target.value)}
            placeholder={placeholder}
            className="min-h-11 min-w-0 flex-1 rounded-2xl border-2 border-pz-border bg-pz-bg px-4 text-pz-text outline-none placeholder:text-pz-muted focus:border-pz-accent"
          />
          {items.length > 1 ? (
            <button
              type="button"
              onClick={() => setItems(items.filter((_, i) => i !== index))}
              aria-label={removeLabel}
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-2 border-pz-border text-pz-muted transition hover:border-pz-warn hover:text-pz-warn"
            >
              <span aria-hidden="true">✕</span>
            </button>
          ) : null}
        </div>
      ))}
      {items.length < max ? (
        <button
          type="button"
          onClick={() => setItems([...items, ''])}
          className="min-h-11 self-start rounded-2xl border-2 border-dashed border-pz-border px-4 font-semibold text-pz-muted transition hover:border-pz-accent hover:text-pz-accent"
        >
          <span aria-hidden="true">➕ </span>
          {addLabel}
        </button>
      ) : null}
    </fieldset>
  )
}
