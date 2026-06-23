import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { t } from '#core'
import { BrandWordmark, Button } from '#ui'
import { listProTemplates } from '../components/code/pro-templates'
import { ThemeToggle } from '../components/layout/ThemeToggle'
import { ImportButton } from '../components/projects/ImportButton'
import {
  type NewProjectCreateOptions,
  NewProjectModal,
} from '../components/projects/NewProjectModal'
import { ProjectCard } from '../components/projects/ProjectCard'
import { listAllProjects, type ProjectSummary } from '../state/persistence'
import { useProjectStore } from '../state/projectStore'
import { useSettingsStore } from '../state/settingsStore'
import { type StudioTheme, StudioThemeProvider } from '../studio/theme'

export interface ProjectListProps {
  /** Chamado quando um projeto deve abrir no editor (criado, importado ou clicado). */
  onOpenProject: (projectId: string) => void
  /** Habilita a criação de projetos profissionais (host com COOP/COEP). */
  professional?: boolean
  /**
   * Tema FIXADO pelo host (ex.: a comunidade controla claro/escuro). Quando
   * definido, a lista segue ESTE tema e ESCONDE o botão de alternar — assim o
   * Estúdio embarcado não destoa do app ao redor. Ausente = preferência do
   * usuário (settingsStore), com o toggle visível (uso standalone/playground).
   */
  theme?: StudioTheme
}

export function ProjectList({
  onOpenProject,
  professional = false,
  theme: themeProp,
}: ProjectListProps): JSX.Element {
  const createProject = useProjectStore((s) => s.createProject)
  const createProProject = useProjectStore((s) => s.createProProject)
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  // A lista vive FORA do <Studio>, então aplica o tema por conta própria: o host
  // pode FIXAR o tema (`themeProp`); senão cai na preferência do settingsStore
  // (singleton compartilhado com o editor), carregada no mount.
  const settingsTheme = useSettingsStore((s) => s.theme)
  const theme = themeProp ?? settingsTheme
  const loadSettings = useSettingsStore((s) => s.load)

  const reload = useCallback(async () => {
    const list = await listAllProjects()
    setProjects(list)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const filtered = useMemo(() => {
    if (!projects) return null
    const q = search.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p) => p.name.toLowerCase().includes(q))
  }, [projects, search])

  const defaultName = useMemo(() => {
    const base = 'Meu projeto'
    if (!projects?.length) return base
    const used = new Set(projects.map((p) => p.name))
    let n = projects.length + 1
    while (used.has(`${base} ${n}`)) n++
    return `${base} ${n}`
  }, [projects])

  const handleCreate = async (name: string, opts?: NewProjectCreateOptions) => {
    const created =
      opts?.kind === 'pro'
        ? await createProProject(name, opts.templateId)
        : await createProject(name)
    setModalOpen(false)
    onOpenProject(created.id)
  }

  const handleImported = (id: string) => {
    onOpenProject(id)
  }

  return (
    <StudioThemeProvider value={theme}>
      <div
        data-sz-theme={theme}
        className="flex h-full flex-col bg-sz-bg text-sz-fg"
        style={{ fontFamily: 'var(--font-family-sans)' }}
      >
        <header className="flex items-center gap-3 border-b border-sz-border bg-sz-panel px-6 py-4">
          <div className="flex flex-col gap-1">
            <BrandWordmark className="h-5 w-auto" />
            <p className="text-xs text-sz-fg-soft">{t('projects.subtitle')}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {themeProp === undefined && <ThemeToggle />}
            <ImportButton onImported={handleImported} />
            <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
              + {t('projects.new')}
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-6 py-6">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">{t('projects.title')}</h2>
              <input
                name="project-search"
                aria-label={t('projects.search')}
                autoComplete="off"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('projects.search')}
                className="w-72 rounded-md border border-sz-border bg-sz-panel px-3 py-2 text-sm text-sz-fg outline-none focus:border-sz-accent focus-visible:ring-2 focus-visible:ring-sz-accent/60"
              />
            </div>

            {filtered === null ? (
              <p className="text-sm text-sz-fg-soft">Carregando…</p>
            ) : filtered.length === 0 && projects?.length === 0 ? (
              <EmptyState onCreate={() => setModalOpen(true)} />
            ) : filtered.length === 0 ? (
              <p className="text-sm text-sz-fg-soft">{t('projects.emptySearch')}</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((summary) => (
                  <ProjectCard
                    key={summary.id}
                    summary={summary}
                    onChanged={() => void reload()}
                    onOpen={() => onOpenProject(summary.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        <NewProjectModal
          open={modalOpen}
          defaultName={defaultName}
          onClose={() => setModalOpen(false)}
          onCreate={handleCreate}
          professionalAvailable={professional}
          templates={professional ? listProTemplates() : undefined}
        />
      </div>
    </StudioThemeProvider>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-sz-border bg-sz-panel/40 px-6 py-16 text-center">
      <p className="mb-4 text-sm text-sz-fg-soft">{t('projects.empty')}</p>
      <Button variant="primary" size="md" onClick={onCreate}>
        + {t('projects.new')}
      </Button>
    </div>
  )
}
