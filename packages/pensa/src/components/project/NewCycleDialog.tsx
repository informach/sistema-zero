/**
 * Fechamento de ciclo: dialog "O que vamos adicionar?" (goal 2..500) com 3
 * chips de sugestão FIXOS da copy (clicar preenche o campo; a criança pode
 * editar). Criar → projectStore.createCycle (POST /projects/:id/cycles) → o
 * detalhe absorvido volta o mapa para o Z da Versão N+1.
 */
import type { FormEvent, JSX } from 'react'
import { useId, useState } from 'react'
import { usePensaApp, usePensaStore } from '../appContext'
import { Dialog } from '../common/Dialog'

const GOAL_MIN = 2
const GOAL_MAX = 500

export function NewCycleDialog({
  open,
  projectId,
  onClose,
}: {
  open: boolean
  projectId: string
  onClose: () => void
}): JSX.Element | null {
  const { copy } = usePensaApp()
  const c = copy.newCycle
  const creatingCycle = usePensaStore((s) => s.creatingCycle)
  const createCycleError = usePensaStore((s) => s.createCycleError)
  const createCycle = usePensaStore((s) => s.createCycle)
  const [goal, setGoal] = useState('')
  const [goalError, setGoalError] = useState<string | null>(null)
  const fieldId = useId()

  const handleClose = (): void => {
    setGoalError(null)
    onClose()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (creatingCycle) return
    const trimmed = goal.trim()
    if (trimmed.length < GOAL_MIN || trimmed.length > GOAL_MAX) {
      setGoalError(c.tooShort)
      return
    }
    setGoalError(null)
    const created = await createCycle(projectId, trimmed)
    if (created) {
      setGoal('')
      onClose()
    }
  }

  const message = goalError ?? createCycleError

  return (
    <Dialog open={open} onClose={handleClose} title={c.dialogTitle}>
      <form
        onSubmit={(event) => {
          void handleSubmit(event)
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId} className="font-semibold text-pz-text">
            {c.goalLabel}
          </label>
          <textarea
            id={fieldId}
            value={goal}
            onChange={(event) => {
              setGoal(event.target.value)
              setGoalError(null)
            }}
            placeholder={c.goalPlaceholder}
            maxLength={GOAL_MAX}
            rows={2}
            className="w-full rounded-2xl border-2 border-pz-border bg-pz-bg px-4 py-2.5 text-pz-text outline-none placeholder:text-pz-muted focus:border-pz-accent"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {c.chips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                setGoal(chip)
                setGoalError(null)
              }}
              className="min-h-11 rounded-full border-2 border-pz-border px-4 font-semibold text-pz-text transition hover:border-pz-accent hover:text-pz-accent"
            >
              {chip}
            </button>
          ))}
        </div>
        {message ? (
          <p
            role="alert"
            className="rounded-2xl bg-pz-bg px-4 py-2.5 text-sm font-semibold text-pz-warn"
          >
            {message}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="min-h-11 rounded-2xl border-2 border-pz-border px-5 font-semibold text-pz-muted transition hover:bg-pz-bg hover:text-pz-text"
          >
            {c.cancel}
          </button>
          <button
            type="submit"
            disabled={creatingCycle}
            aria-busy={creatingCycle}
            className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {c.submit}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
