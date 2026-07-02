/**
 * Lista de projetos: header com título/subtítulo + botão grande de criar,
 * grid de cards (nome, "Versão N", mini-progresso das etapas, atualização
 * relativa) com menu Renomear/Arquivar, estado vazio amigável e erro gentil
 * com retry. Carrega via store (transport injetado) no primeiro mount.
 */
import { clsx } from 'clsx'
import type { FormEvent, JSX } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { versionLabel } from '../../core/copy'
import { formatRelativeTime } from '../../core/relativeTime'
import { STAGE_ORDER, stageIndex } from '../../core/stages'
import type { PensaProjectListView } from '../../core/types'
import { usePensaApp, usePensaStore } from '../appContext'
import { Dialog } from '../common/Dialog'
import { EmptyState } from '../common/EmptyState'
import { NewProjectDialog } from './NewProjectDialog'
import { STAGE_BG_CLASS } from './stageColors'

function StageProgress({ project }: { project: PensaProjectListView }): JSX.Element {
  const doneCount = stageIndex(project.stage)
  return (
    <div className="flex items-center gap-1.5">
      {STAGE_ORDER.map((stage, index) => (
        <span
          key={stage}
          aria-hidden="true"
          className={clsx(
            'h-2.5 w-2.5 rounded-full',
            index < doneCount
              ? STAGE_BG_CLASS[stage]
              : index === doneCount
                ? 'bg-pz-accent'
                : 'bg-pz-border',
          )}
        />
      ))}
      <span className="sr-only">{`${doneCount} de ${STAGE_ORDER.length} etapas concluídas`}</span>
    </div>
  )
}

function RenameDialog({
  project,
  open,
  onClose,
}: {
  project: PensaProjectListView
  open: boolean
  onClose: () => void
}): JSX.Element | null {
  const { copy } = usePensaApp()
  const renameProject = usePensaStore((s) => s.renameProject)
  const busy = usePensaStore((s) => s.mutatingId === project.id)
  const [name, setName] = useState(project.name)
  const [nameError, setNameError] = useState<string | null>(null)
  const inputId = useId()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2 || trimmed.length > 120) {
      setNameError(copy.newProject.nameTooShort)
      return
    }
    setNameError(null)
    const renamed = await renameProject(project.id, trimmed)
    if (renamed) onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={copy.rename.title}>
      <form
        onSubmit={(event) => {
          void handleSubmit(event)
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="font-semibold text-pz-text">
            {copy.newProject.nameLabel}
          </label>
          <input
            id={inputId}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            autoComplete="off"
            className="min-h-11 w-full rounded-2xl border-2 border-pz-border bg-pz-bg px-4 py-2.5 text-pz-text outline-none placeholder:text-pz-muted focus:border-pz-accent"
          />
        </div>
        {nameError ? (
          <p role="alert" className="text-sm font-semibold text-pz-warn">
            {nameError}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-2xl border-2 border-pz-border px-5 font-semibold text-pz-muted transition hover:bg-pz-bg hover:text-pz-text"
          >
            {copy.rename.cancel}
          </button>
          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copy.rename.submit}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

function ProjectCard({ project }: { project: PensaProjectListView }): JSX.Element {
  const { copy } = usePensaApp()
  const openProject = usePensaStore((s) => s.openProject)
  const archiveProject = usePensaStore((s) => s.archiveProject)
  const busy = usePensaStore((s) => s.mutatingId === project.id)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fecha o menu do card ao clicar fora ou apertar Esc (sem handler em div
  // estática — listener no documento só enquanto o menu está aberto).
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  return (
    <article className="relative rounded-3xl border-2 border-pz-border bg-pz-surface p-5 transition hover:border-pz-accent">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0">
          <button
            type="button"
            onClick={() => {
              void openProject(project.id)
            }}
            aria-label={`${copy.card.open}: ${project.name}`}
            className="text-left text-lg leading-snug font-bold break-words text-pz-text after:absolute after:inset-0 after:rounded-3xl"
          >
            {project.name}
          </button>
        </h3>
        <div ref={menuRef} className="relative z-10">
          <button
            type="button"
            aria-label={copy.card.menuLabel}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            disabled={busy}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl text-xl font-bold text-pz-muted transition hover:bg-pz-bg hover:text-pz-text disabled:opacity-60"
          >
            <span aria-hidden="true">⋯</span>
          </button>
          {menuOpen ? (
            <div
              role="menu"
              aria-label={copy.card.menuLabel}
              className="absolute top-full right-0 z-20 mt-1 min-w-40 rounded-2xl border-2 border-pz-border bg-pz-surface p-1.5 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  setRenameOpen(true)
                }}
                className="block min-h-11 w-full rounded-xl px-4 text-left font-semibold text-pz-text transition hover:bg-pz-bg"
              >
                {copy.card.rename}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  void archiveProject(project.id)
                }}
                className="block min-h-11 w-full rounded-xl px-4 text-left font-semibold text-pz-text transition hover:bg-pz-bg"
              >
                {copy.card.archive}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-pz-accent/15 px-3 py-1 text-xs font-bold text-pz-accent">
          {versionLabel(project.cycleNumber)}
        </span>
        <StageProgress project={project} />
      </div>
      <p className="mt-3 text-xs text-pz-muted">
        Atualizado {formatRelativeTime(project.updatedAt)}
      </p>
      {renameOpen ? (
        <RenameDialog project={project} open={renameOpen} onClose={() => setRenameOpen(false)} />
      ) : null}
    </article>
  )
}

export function ProjectList(): JSX.Element {
  const { copy, store } = usePensaApp()
  const projects = usePensaStore((s) => s.projects)
  const projectsLoaded = usePensaStore((s) => s.projectsLoaded)
  const loadingList = usePensaStore((s) => s.loadingList)
  const listError = usePensaStore((s) => s.listError)
  const mutateError = usePensaStore((s) => s.mutateError)
  const loadProjects = usePensaStore((s) => s.loadProjects)
  const [newOpen, setNewOpen] = useState(false)

  useEffect(() => {
    const state = store.getState()
    if (!state.projectsLoaded && !state.loadingList) void state.loadProjects()
  }, [store])

  const createButton = (
    <button
      type="button"
      onClick={() => setNewOpen(true)}
      className="min-h-12 rounded-2xl bg-pz-accent px-6 text-lg font-bold text-pz-accent-fg shadow-md transition hover:brightness-105"
    >
      <span aria-hidden="true">✨ </span>
      {copy.list.create}
    </button>
  )

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-pz-text">{copy.list.title}</h1>
          <p className="mt-1 text-pz-muted">{copy.list.subtitle}</p>
        </div>
        {createButton}
      </header>

      {mutateError ? (
        <p
          role="alert"
          className="rounded-2xl border-2 border-pz-warn bg-pz-surface px-4 py-3 font-semibold text-pz-warn"
        >
          {mutateError}
        </p>
      ) : null}

      {listError ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-pz-border bg-pz-surface px-6 py-10 text-center">
          <span aria-hidden="true" className="text-4xl">
            🫧
          </span>
          <h2 className="text-lg font-bold text-pz-text">{copy.errors.title}</h2>
          <p role="alert" className="text-pz-muted">
            {listError}
          </p>
          <button
            type="button"
            onClick={() => {
              void loadProjects()
            }}
            className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105"
          >
            {copy.errors.retry}
          </button>
        </div>
      ) : loadingList && !projectsLoaded ? (
        <p aria-busy="true" className="py-10 text-center text-pz-muted">
          {copy.list.loading}
        </p>
      ) : projects.length === 0 ? (
        // Onboarding do primeiro uso: as 4 etapas do ZERO (nomes já existem na
        // copy das stages) + CTA próprio (rótulo distinto do botão do header).
        <EmptyState
          emoji="🚀"
          title={copy.list.emptyTitle}
          body={copy.list.emptyBody}
          action={
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {(['z', 'e', 'r', 'o'] as const).map((stage, index) => (
                  <span key={stage} className="flex items-center gap-1.5">
                    {index > 0 ? (
                      <span aria-hidden="true" className="font-bold text-pz-muted">
                        →
                      </span>
                    ) : null}
                    <span className="rounded-full bg-pz-accent/15 px-3 py-1 text-sm font-bold text-pz-accent">
                      {copy.stages[stage].name}
                    </span>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="min-h-12 rounded-2xl bg-pz-accent px-6 text-lg font-bold text-pz-accent-fg shadow-md transition hover:brightness-105"
              >
                <span aria-hidden="true">✨ </span>
                {copy.list.emptyCta}
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <NewProjectDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}
