import { useEffect, useId, useRef, useState } from 'react'
import { getProAssistance } from '../../core/proAssistance'
import type { ProAssistanceMeta } from '../../core/proProject'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'

const questions = [
  'Qual é o objetivo do jogo?',
  'Como a pessoa joga e controla o personagem?',
  'Como saber que a partida terminou?',
]
const field = 'w-full rounded-lg border border-sz-border bg-sz-bg p-2 text-sm'
const button = 'rounded-lg border border-sz-border px-3 py-2 text-xs disabled:opacity-40'

/** Optional project notes. Nothing here starts a job or changes a Pensa mission. */
export function ProAssistancePanel({ projectId }: { projectId: string }) {
  const store = useProjectStoreApi()
  const project = useProjectStore((state) => state.project)
  const meta = project?.proMeta?.assistance
  const [briefing, setBriefing] = useState(meta?.briefing ?? '')
  const [baseline, setBaseline] = useState(meta?.briefing ?? '')
  const [decision, setDecision] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const scope = useRef(captureProjectStorageScope()).current
  const id = useId()
  useEffect(() => {
    // Preserve an unsaved note if another component changes metadata.
    if (briefing === baseline) {
      setBriefing(meta?.briefing ?? '')
      setBaseline(meta?.briefing ?? '')
    }
  }, [meta?.briefing, briefing, baseline])
  const update = (change: (current: ProAssistanceMeta) => ProAssistanceMeta) => {
    setError(null)
    setNotice(null)
    const current = store.getState().project
    if (
      captureProjectStorageScope() !== scope ||
      current?.id !== projectId ||
      current.kind !== 'pro'
    ) {
      setError('O projeto ou perfil mudou. Reabra as decisões no projeto atual.')
      return false
    }
    try {
      const issue = store.getState().setProAssistance(change(getProAssistance(current)))
      if (issue) throw new Error(issue)
      setNotice('Decisões atualizadas no projeto; acompanhe o indicador de salvamento do Studio.')
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar as decisões.')
      return false
    }
  }
  return (
    <details className="rounded-xl border border-sz-border p-3 text-sm">
      <summary className="cursor-pointer font-semibold">
        Ideias e decisões do projeto · opcional
      </summary>
      <p className="my-2 text-xs text-sz-fg-mute">
        Você pode programar e pedir ajuda sem preencher estas notas. Elas acompanham o projeto; não
        concluem tarefas do Pensa.
      </p>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          const saved = update((current) => {
            if ((current.briefing ?? '') !== baseline)
              throw new Error(
                'Estas notas mudaram enquanto você escrevia. Copie seu texto e reabra o projeto para comparar.',
              )
            return { ...current, briefing }
          })
          if (saved) setBaseline(briefing)
        }}
      >
        <label htmlFor={`${id}-briefing`}>Ideia do projeto</label>
        <textarea
          id={`${id}-briefing`}
          className={field}
          value={briefing}
          maxLength={2000}
          rows={3}
          onChange={(event) => setBriefing(event.target.value)}
        />
        <button type="submit" className={button} disabled={briefing === baseline}>
          Guardar ideia
        </button>
      </form>
      <ul className="my-3 space-y-2">
        {(meta?.decisions ?? []).map((item) => (
          <li key={item.id} className="rounded-lg bg-sz-bg p-2">
            <p className="whitespace-pre-wrap">{item.text}</p>
            <span className="text-xs text-sz-fg-mute">
              {
                {
                  learner: 'Sua decisão',
                  pensa: 'Referência do Pensa',
                  kit: 'Sugestão do kit',
                  suggestion: 'Sugestão',
                }[item.provenance]
              }{' '}
              · {item.confirmed ? 'confirmada' : 'a confirmar'}
            </span>
            <div className="mt-1 flex gap-2">
              {!item.confirmed && (
                <button
                  type="button"
                  className={button}
                  onClick={() =>
                    update((current) => ({
                      ...current,
                      decisions: current.decisions?.map((entry) =>
                        entry.id === item.id ? { ...entry, confirmed: true } : entry,
                      ),
                    }))
                  }
                >
                  Confirmar decisão
                </button>
              )}
              <button
                type="button"
                className={button}
                onClick={() =>
                  update((current) => ({
                    ...current,
                    decisions: current.decisions?.filter((entry) => entry.id !== item.id),
                  }))
                }
              >
                Remover decisão
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!decision.trim()) return
          if (
            update((current) => ({
              ...current,
              decisions: [
                ...(current.decisions ?? []),
                {
                  id: crypto.randomUUID(),
                  text: decision.trim(),
                  provenance: 'learner',
                  confirmed: true,
                },
              ],
            }))
          )
            setDecision('')
        }}
      >
        <label htmlFor={`${id}-decision`}>Uma regra ou escolha que quer preservar</label>
        <textarea
          id={`${id}-decision`}
          className={field}
          rows={2}
          value={decision}
          maxLength={1000}
          onChange={(event) => setDecision(event.target.value)}
        />
        <button
          type="submit"
          className={button}
          disabled={!decision.trim() || (meta?.decisions?.length ?? 0) >= 20}
        >
          Guardar decisão
        </button>
      </form>
      {!meta?.questions?.length && (
        <button
          type="button"
          className={`${button} mt-3`}
          onClick={() =>
            update((current) => ({
              ...current,
              questions: questions.map((text) => ({
                id: crypto.randomUUID(),
                text,
                status: 'pending',
              })),
            }))
          }
        >
          Quero ajuda para planejar
        </button>
      )}
      {(meta?.questions ?? []).map((item) => (
        <Question key={item.id} item={item} update={update} />
      ))}
      {notice && (
        <p role="status" className="mt-2 text-xs">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-sz-error">
          {error}
        </p>
      )}
    </details>
  )
}

function Question({
  item,
  update,
}: {
  item: NonNullable<ProAssistanceMeta['questions']>[number]
  update(change: (current: ProAssistanceMeta) => ProAssistanceMeta): boolean
}) {
  const [answer, setAnswer] = useState(item.answer ?? '')
  const id = useId()
  if (item.status !== 'pending')
    return (
      <p className="mt-3 text-xs">
        <strong>{item.text}</strong>{' '}
        {item.status === 'cancelled' ? 'Deixada para depois.' : item.answer}
      </p>
    )
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (answer.trim())
          update((current) => ({
            ...current,
            questions: current.questions?.map((entry) =>
              entry.id === item.id
                ? { ...entry, status: 'answered', answer: answer.trim() }
                : entry,
            ),
          }))
      }}
    >
      <label htmlFor={id}>{item.text}</label>
      <textarea
        id={id}
        className={field}
        value={answer}
        maxLength={1000}
        rows={2}
        onChange={(event) => setAnswer(event.target.value)}
      />
      <div className="flex gap-2">
        <button type="submit" className={button} disabled={!answer.trim()}>
          Guardar resposta
        </button>
        <button
          type="button"
          className={button}
          onClick={() =>
            update((current) => ({
              ...current,
              questions: current.questions?.map((entry) =>
                entry.id === item.id ? { ...entry, status: 'cancelled' } : entry,
              ),
            }))
          }
        >
          Pular pergunta
        </button>
      </div>
    </form>
  )
}
