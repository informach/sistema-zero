import { useEffect, useMemo, useState } from 'react'
import type { PensaHostAdapter, PensaStageView, PensaTaskView } from '../core/types'

export interface TaskPlanProps {
  adapter: PensaHostAdapter
  stage: PensaStageView
  busy: string | null
  editable: boolean
  run(key: string, action: () => Promise<void>): Promise<void>
  refresh(): Promise<void>
}

const draftId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

function useUnsavedChanges(active: boolean) {
  useEffect(() => {
    if (!active) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [active])
}

export function TaskPlan(props: TaskPlanProps) {
  const titleById = useMemo(
    () => new Map(props.stage.tasks.map((task) => [task.id, task.title])),
    [props.stage.tasks],
  )
  return (
    <ol className="pensa-task-plan">
      {props.stage.tasks.map((task) => (
        <TaskCard
          {...props}
          key={task.id}
          task={task}
          titles={titleById}
          next={props.stage.nextTaskId === task.id}
        />
      ))}
    </ol>
  )
}

function TaskCard(
  props: TaskPlanProps & {
    task: PensaTaskView
    titles: Map<string, string>
    next: boolean
  },
) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(props.task.title)
  const [summary, setSummary] = useState(props.task.summary ?? '')
  const [minutes, setMinutes] = useState(props.task.estimatedMinutes)
  const [category, setCategory] = useState(props.task.category)
  const [position, setPosition] = useState(props.task.position)
  const [dependencies, setDependencies] = useState(props.task.dependencies)
  const [guide, setGuide] = useState(props.task.guide)
  const dirty =
    title !== props.task.title ||
    summary !== (props.task.summary ?? '') ||
    minutes !== props.task.estimatedMinutes ||
    category !== props.task.category ||
    position !== props.task.position ||
    JSON.stringify(dependencies) !== JSON.stringify(props.task.dependencies) ||
    JSON.stringify(guide) !== JSON.stringify(props.task.guide)
  useUnsavedChanges(editing && dirty)

  const reset = () => {
    setTitle(props.task.title)
    setSummary(props.task.summary ?? '')
    setMinutes(props.task.estimatedMinutes)
    setCategory(props.task.category)
    setPosition(props.task.position)
    setDependencies(props.task.dependencies)
    setGuide(props.task.guide)
  }
  const owned =
    props.task.destination === 'pinta'
      ? props.adapter.capabilities.pintaOwned
      : props.adapter.capabilities.studioOwned
  const save = () =>
    props.run(`task-${props.task.id}`, async () => {
      await props.adapter.transport.request(`/tasks/${props.task.id}`, {
        method: 'PATCH',
        body: {
          title,
          summary: summary || null,
          estimatedMinutes: minutes,
          category,
          position,
          dependencies,
          guide,
        },
      })
      setEditing(false)
      await props.refresh()
    })
  const remove = () => {
    if (!window.confirm(`Apagar o cartão “${props.task.title}”?`)) return
    void props.run(`task-${props.task.id}`, async () => {
      await props.adapter.transport.request(`/tasks/${props.task.id}`, { method: 'DELETE' })
      await props.refresh()
    })
  }

  return (
    <li className={`pensa-task ${props.next ? 'is-next' : ''}`}>
      <div className="pensa-task-order">
        <span>{props.task.position + 1}</span>
        {props.task.dependencies.length ? <i aria-hidden="true">↳</i> : null}
      </div>
      <article>
        <header>
          <span data-destination={props.task.destination}>
            {props.task.destination === 'pinta' ? 'PINTA' : 'ESTÚDIO'}
          </span>
          <em data-status={props.task.progress.status}>
            {props.task.progress.status === 'planned'
              ? 'Planejada'
              : props.task.progress.status === 'in_progress'
                ? 'Em andamento'
                : 'Concluída'}
          </em>
          {props.next ? <b>PRÓXIMA</b> : null}
        </header>
        {editing ? (
          <TaskEditor
            task={props.task}
            stage={props.stage}
            title={title}
            summary={summary}
            minutes={minutes}
            category={category}
            position={position}
            dependencies={dependencies}
            guide={guide}
            onTitle={setTitle}
            onSummary={setSummary}
            onMinutes={setMinutes}
            onCategory={setCategory}
            onPosition={(nextPosition) => {
              setPosition(nextPosition)
              const allowed = new Set(
                props.stage.tasks
                  .filter(
                    (candidate) =>
                      candidate.id !== props.task.id && candidate.position < nextPosition,
                  )
                  .map((candidate) => candidate.id),
              )
              setDependencies((current) => current.filter((id) => allowed.has(id)))
            }}
            onDependencies={setDependencies}
            onGuide={setGuide}
          />
        ) : (
          <>
            <h3>{props.task.title}</h3>
            {props.task.summary ? <p>{props.task.summary}</p> : null}
          </>
        )}
        <div className="pensa-task-meta">
          <span>◷ {props.task.estimatedMinutes} min</span>
          <span>{props.task.category}</span>
          <span>rev. {props.task.revision}</span>
        </div>
        {props.task.dependencies.length ? (
          <p className="pensa-dependencies">
            Depois de: {props.task.dependencies.map((id) => props.titles.get(id) ?? id).join(', ')}
          </p>
        ) : null}
        <TaskGuidePreview task={props.task} />
        <footer>
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  if (dirty && !window.confirm('Descartar as mudanças deste cartão?')) return
                  reset()
                  setEditing(false)
                }}
              >
                Cancelar
              </button>
              <button type="button" className="primary" onClick={save} disabled={!dirty}>
                {props.task.progress.status === 'planned' ? 'Salvar' : 'Criar revisão'}
              </button>
            </>
          ) : null}
          {!editing && props.editable ? (
            <>
              <button
                type="button"
                onClick={() => {
                  reset()
                  setEditing(true)
                }}
              >
                {props.task.progress.status === 'planned' ? 'Editar cartão' : 'Criar revisão'}
              </button>
              {props.task.progress.status === 'planned' ? (
                <button type="button" onClick={remove}>
                  Apagar cartão
                </button>
              ) : null}
            </>
          ) : null}
          {!editing ? (
            <button
              type="button"
              className="primary"
              disabled={!owned || (props.task.progress.status === 'planned' && !props.next)}
              title={
                !owned
                  ? `Você ainda não possui ${props.task.destination === 'pinta' ? 'o Pinta' : 'o Estúdio Completo'}.`
                  : undefined
              }
              onClick={() =>
                props.adapter.onOpenTask({
                  taskId: props.task.id,
                  destination: props.task.destination,
                })
              }
            >
              {owned
                ? `Abrir no ${props.task.destination === 'pinta' ? 'Pinta' : 'Estúdio'} →`
                : 'Ferramenta não liberada'}
            </button>
          ) : null}
        </footer>
      </article>
    </li>
  )
}

interface TaskEditorProps {
  task: PensaTaskView
  stage: PensaStageView
  title: string
  summary: string
  minutes: number
  category: PensaTaskView['category']
  position: number
  dependencies: string[]
  guide: PensaTaskView['guide']
  onTitle(value: string): void
  onSummary(value: string): void
  onMinutes(value: number): void
  onCategory(value: PensaTaskView['category']): void
  onPosition(value: number): void
  onDependencies(value: string[]): void
  onGuide(value: PensaTaskView['guide']): void
}

function TaskEditor(props: TaskEditorProps) {
  const candidates = props.stage.tasks.filter(
    (candidate) => candidate.id !== props.task.id && candidate.position < props.position,
  )
  return (
    <div className="pensa-task-edit">
      <label>
        Título
        <input value={props.title} onChange={(event) => props.onTitle(event.target.value)} />
      </label>
      <label>
        Resumo
        <textarea value={props.summary} onChange={(event) => props.onSummary(event.target.value)} />
      </label>
      <label className="pensa-task-time">
        Tempo{' '}
        <input
          type="number"
          min={5}
          max={240}
          value={props.minutes}
          onChange={(event) => props.onMinutes(Number(event.target.value))}
        />{' '}
        min
      </label>
      <label>
        Categoria
        <select
          value={props.category}
          onChange={(event) => props.onCategory(event.target.value as PensaTaskView['category'])}
        >
          <option value="art">Arte</option>
          <option value="setup">Preparação</option>
          <option value="gameplay">Jogabilidade</option>
          <option value="scene">Cena</option>
          <option value="ui">Interface</option>
          <option value="polish">Polimento</option>
        </select>
      </label>
      <label className="pensa-task-time">
        Posição no plano
        <input
          type="number"
          min={0}
          max={props.stage.tasks.length - 1}
          value={props.position}
          onChange={(event) => props.onPosition(Number(event.target.value))}
        />
      </label>
      <fieldset className="pensa-task-dependency-edit">
        <legend>Precisa destas tarefas antes</legend>
        {candidates.map((candidate) => (
          <label key={candidate.id}>
            <input
              type="checkbox"
              checked={props.dependencies.includes(candidate.id)}
              onChange={(event) =>
                props.onDependencies(
                  event.target.checked
                    ? [...new Set([...props.dependencies, candidate.id])]
                    : props.dependencies.filter((id) => id !== candidate.id),
                )
              }
            />
            {candidate.title}
          </label>
        ))}
        {candidates.length === 0 ? <small>Nenhuma tarefa anterior nesta posição.</small> : null}
      </fieldset>
      <GuideEditor value={props.guide} onChange={props.onGuide} />
      <div className="pensa-context-lock">
        <strong>Destino: {props.task.destination === 'pinta' ? 'Pinta' : 'Estúdio'}</strong>
        <small>
          O brief e as referências oficiais ficam protegidos. Recrie o plano para trocar o destino,
          assets, blocos ou extensões.
        </small>
      </div>
      {props.task.progress.status !== 'planned' ? (
        <p className="pensa-revision-note" role="note">
          Este cartão já começou. Ao salvar, o histórico será preservado e uma nova revisão
          planejada será criada — inclusive para cartões posteriores afetados.
        </p>
      ) : null}
    </div>
  )
}

function TaskGuidePreview({ task }: { task: PensaTaskView }) {
  return (
    <details>
      <summary>Ver guia e critérios</summary>
      <div className="pensa-guide">
        <ol>
          {task.guide.steps.map((step) => (
            <li key={step.id}>
              {step.text}
              {step.hint ? <small>{step.hint}</small> : null}
            </li>
          ))}
        </ol>
        <ul>
          {task.guide.criteria.map((criterion) => (
            <li key={criterion.id}>✓ {criterion.text}</li>
          ))}
        </ul>
        {task.context.kind === 'studio' && task.context.blocks.length ? (
          <div className="pensa-blocks">
            {task.context.blocks.map((block) => (
              <code key={block.id}>{block.label}</code>
            ))}
          </div>
        ) : null}
      </div>
    </details>
  )
}

function GuideEditor(props: {
  value: PensaTaskView['guide']
  onChange(value: PensaTaskView['guide']): void
}) {
  const section = (kind: 'steps' | 'criteria', label: string) => {
    const items = props.value[kind]
    return (
      <fieldset className="pensa-guide-edit">
        <legend>{label}</legend>
        {items.map((item, index) => (
          <div key={item.id}>
            <input
              aria-label={`${label}: item ${index + 1}`}
              value={item.text}
              onChange={(event) =>
                props.onChange({
                  ...props.value,
                  [kind]: items.map((current, itemIndex) =>
                    itemIndex === index ? { ...current, text: event.target.value } : current,
                  ),
                })
              }
            />
            <input
              aria-label={`${label}: dica ${index + 1}`}
              placeholder="Dica opcional"
              value={item.hint ?? ''}
              onChange={(event) =>
                props.onChange({
                  ...props.value,
                  [kind]: items.map((current, itemIndex) =>
                    itemIndex === index
                      ? { ...current, hint: event.target.value || undefined }
                      : current,
                  ),
                })
              }
            />
            <label>
              <input
                type="checkbox"
                checked={item.required}
                onChange={(event) =>
                  props.onChange({
                    ...props.value,
                    [kind]: items.map((current, itemIndex) =>
                      itemIndex === index
                        ? { ...current, required: event.target.checked }
                        : current,
                    ),
                  })
                }
              />
              Obrigatório
            </label>
            <button
              type="button"
              disabled={items.length === 1}
              onClick={() =>
                props.onChange({ ...props.value, [kind]: items.filter((_, i) => i !== index) })
              }
            >
              Remover
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            props.onChange({
              ...props.value,
              [kind]: [
                ...items,
                { id: draftId(kind === 'steps' ? 'passo' : 'criterio'), text: '', required: true },
              ],
            })
          }
        >
          Adicionar {kind === 'steps' ? 'passo' : 'critério'}
        </button>
      </fieldset>
    )
  }
  return (
    <>
      {section('steps', 'Passos do guia')}
      {section('criteria', 'Critérios de conclusão')}
    </>
  )
}
