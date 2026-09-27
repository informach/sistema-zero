import { lazy, Suspense, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { MOLDA_LIMITS } from '../../../core/limits'
import { type SceneProjectStart, sceneProjectName } from '../../../scene/createProject'
import { isStorageBudgetError } from '../../../state/persistence'
import type { SceneViewportFactory } from '../../../viewport/sceneViewportTypes'
import { TemplatePicker } from '../../gallery/TemplatePicker'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import type { RestoreSceneProject } from './SceneProjectRestore'
import { SCENE_APPEARANCE_FIELD } from './sceneAppearanceForm'
import { type SceneProjectLibrary, useSceneProjectList } from './useSceneProjectList'

const PAGE_SIZE = 9
const SceneProjectRestore = lazy(() =>
  import('./SceneProjectRestore').then((module) => ({ default: module.SceneProjectRestore })),
)
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function ProjectDate({ updatedAt }: { updatedAt: number }) {
  const date = new Date(updatedAt)
  if (!Number.isFinite(date.valueOf())) return <span>{COPY.scene.start.unknownDate}</span>
  return <time dateTime={date.toISOString()}>{dateFormat.format(date)}</time>
}

function NewProjectForm({
  draft,
  onCreate,
  onCancel,
}: {
  draft: SceneProjectStart
  onCreate(input: SceneProjectStart, signal: AbortSignal): Promise<void>
  onCancel(): void
}) {
  const copy = COPY.scene.start
  const [name, setName] = useState(draft.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invalidName, setInvalidName] = useState(false)
  const field = useRef<HTMLInputElement>(null)
  const task = useRef<AbortController | null>(null)
  const errorId = useId()
  useLayoutEffect(() => {
    field.current?.focus()
    return () => {
      task.current?.abort()
    }
  }, [])
  async function submit() {
    if (task.current) return
    let normalized: string
    try {
      normalized = sceneProjectName(name)
    } catch {
      setInvalidName(true)
      setError(copy.nameError(MOLDA_LIMITS.maxNameChars))
      field.current?.focus()
      return
    }
    const controller = new AbortController()
    task.current = controller
    setBusy(true)
    setInvalidName(false)
    setError(null)
    try {
      await onCreate({ ...draft, name: normalized }, controller.signal)
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(isStorageBudgetError(failure) ? COPY.gallery.storageBudget : copy.createError)
    } finally {
      if (task.current === controller) task.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  return (
    <form
      className="flex max-w-xl flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <p className="text-mld-text-soft">
        {draft.kind === 'empty'
          ? copy.emptyHint
          : COPY.templates.items[draft.templateId].description}
      </p>
      <label className="flex flex-col gap-2 text-sm font-bold">
        {copy.name}
        <input
          name="sceneProjectName"
          ref={field}
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            if (invalidName) {
              setInvalidName(false)
              setError(null)
            }
          }}
          maxLength={MOLDA_LIMITS.maxNameChars}
          disabled={busy}
          aria-invalid={invalidName ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={SCENE_APPEARANCE_FIELD}
          autoComplete="off"
        />
      </label>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-mld-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? copy.creating : copy.create}
        </Button>
        <Button disabled={busy} onClick={onCancel}>
          {copy.chooseAgain}
        </Button>
      </div>
      {busy && (
        <p role="status" className="text-sm text-mld-muted">
          {copy.creating}
        </p>
      )}
    </form>
  )
}

/** The internal library lists summaries; only opening a project loads its document. */
export function SceneStart({
  persistence,
  onCreate,
  onOpen,
  onRestore,
  viewportFactory,
}: {
  persistence: SceneProjectLibrary
  onCreate(input: SceneProjectStart, signal: AbortSignal): Promise<void>
  onOpen(id: string): void
  onRestore?: RestoreSceneProject
  viewportFactory?: SceneViewportFactory
}) {
  const copy = COPY.scene.start
  const { listing, error, refresh } = useSceneProjectList(persistence)
  const [choice, setChoice] = useState<{
    owner: SceneProjectLibrary
    draft: SceneProjectStart | null
  }>({ owner: persistence, draft: null })
  const draft = choice.owner === persistence ? choice.draft : null
  const setDraft = (next: SceneProjectStart | null) =>
    setChoice({ owner: persistence, draft: next })
  const [pagination, setPagination] = useState({ owner: persistence, page: 0 })
  const page = pagination.owner === persistence ? pagination.page : 0
  const setPage = (next: number) => setPagination({ owner: persistence, page: next })
  const createHeading = useId(),
    recentHeading = useId()
  const choose = useRef<HTMLButtonElement>(null)
  const restoreTrigger = useRef<HTMLButtonElement>(null)
  const [restoring, setRestoring] = useState<SceneProjectLibrary | null>(null)
  const startSection = useRef<HTMLElement>(null)
  const restoreFocus = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (draft || restoreFocus.current === null) return
    const label = restoreFocus.current
    restoreFocus.current = null
    const target =
      label === 'empty'
        ? choose.current
        : Array.from(startSection.current?.querySelectorAll('button') ?? []).find(
            (button) => button.getAttribute('aria-label') === label,
          )
    target?.focus()
  }, [draft])
  const projects = useMemo(
    () =>
      [...(listing?.summaries ?? [])].sort(
        (a, b) => b.updatedAt - a.updatedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      ),
    [listing],
  )
  const pages = Math.max(1, Math.ceil(projects.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages - 1)
  return (
    <section aria-label={copy.title} className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="space-y-2">
          <h1 tabIndex={-1} className="mld-display text-2xl text-mld-text">
            {copy.title}
          </h1>
          <p className="max-w-2xl text-mld-text-soft">{copy.intro}</p>
        </header>
        <section
          ref={startSection}
          aria-labelledby={createHeading}
          className="space-y-4 rounded-2xl border border-mld-border bg-mld-surface p-4 sm:p-6"
        >
          <h2 id={createHeading} className="mld-display text-xl">
            {draft ? copy.nameTitle : copy.newTitle}
          </h2>
          {draft ? (
            <NewProjectForm
              draft={draft}
              onCreate={onCreate}
              onCancel={() => {
                restoreFocus.current =
                  draft.kind === 'empty'
                    ? 'empty'
                    : COPY.a11y.templateCard(COPY.templates.items[draft.templateId].title)
                setDraft(null)
              }}
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  ref={choose}
                  variant="primary"
                  onClick={() => setDraft({ kind: 'empty', name: '' })}
                >
                  {copy.empty}
                </Button>
                {onRestore && (
                  <Button ref={restoreTrigger} onClick={() => setRestoring(persistence)}>
                    {COPY.scene.restore.open}
                  </Button>
                )}
              </div>
              <div>
                <h3 className="mld-display text-lg">{COPY.templates.stepTitle}</h3>
                <TemplatePicker
                  onPick={(template) =>
                    setDraft({
                      kind: 'template',
                      templateId: template.id,
                      name: COPY.templates.items[template.id].title,
                    })
                  }
                />
              </div>
            </>
          )}
        </section>
        <section aria-labelledby={recentHeading} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id={recentHeading} className="mld-display text-xl">
              {copy.recent}
            </h2>
            <Button onClick={() => void refresh()}>{copy.refresh}</Button>
          </div>
          <p className="text-sm text-mld-muted">{copy.localOnly}</p>
          {error && (
            <p role="alert" className="text-sm text-mld-danger">
              {copy.listError}
            </p>
          )}
          {listing && listing.issues.length > 0 && (
            <p role="alert" className="text-sm text-mld-warn">
              {copy.listIssues(listing.issues.length)}
            </p>
          )}
          {!listing && !error && <p role="status">{copy.loading}</p>}
          {listing && projects.length === 0 && (
            <p className="rounded-xl border border-dashed border-mld-border p-6 text-mld-muted">
              {copy.noProjects}
            </p>
          )}
          {projects.length > 0 && (
            <>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {projects
                  .slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
                  .map((project) => (
                    <li key={project.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(project.id)}
                        aria-label={copy.open(project.name)}
                        className="flex min-h-11 w-full flex-col gap-2 rounded-xl border border-mld-border bg-mld-surface p-4 text-left hover:border-mld-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent"
                      >
                        <span className="mld-display w-full truncate text-lg text-mld-text">
                          {project.name}
                        </span>
                        <span className="text-sm text-mld-muted">
                          <ProjectDate updatedAt={project.updatedAt} />
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
              {pages > 1 && (
                <nav aria-label={copy.pages} className="flex flex-wrap items-center gap-2">
                  <Button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
                    {copy.previous}
                  </Button>
                  <span role="status" className="text-sm text-mld-muted">
                    {copy.page(currentPage + 1, pages)}
                  </span>
                  <Button
                    disabled={currentPage + 1 === pages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    {copy.next}
                  </Button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
      {onRestore && (
        <Dialog
          open={restoring === persistence}
          title={COPY.scene.restore.title}
          wide
          onClose={() => setRestoring(null)}
          returnFocusTo={restoreTrigger}
        >
          <Suspense fallback={<p role="status">{COPY.scene.restore.reading}</p>}>
            <SceneProjectRestore
              onRestore={onRestore}
              viewportFactory={viewportFactory}
              onClose={() => setRestoring(null)}
            />
          </Suspense>
        </Dialog>
      )}
    </section>
  )
}
