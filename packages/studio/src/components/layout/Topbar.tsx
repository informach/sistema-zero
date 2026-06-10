import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { IDE_MODES, MODE_LABELS, t } from '#core'
import { Badge, Button } from '#ui'
import { saveCurrentProject } from '../../state/persistence'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useSettingsStore } from '../../state/settingsStore'
import { useUIStore } from '../../state/uiStore'
import { useStudioTheme } from '../../studio/theme'

export interface TopbarProps {
  /** Sai do editor (host decide o destino). Sem ela, logo vira estático e o botão "Projetos" some. */
  onExit?: () => void
  /** Mostra o toggle claro/escuro (false quando o host fixa o tema via prop). */
  canToggleTheme?: boolean
}

export function Topbar({ onExit, canToggleTheme }: TopbarProps): JSX.Element {
  const { hasProject, projectName, projectMode } = useProjectStore(
    useShallow((s) => ({
      hasProject: Boolean(s.project),
      projectName: s.project?.name ?? '',
      projectMode: s.project?.mode ?? 'blocks',
    })),
  )
  const isDirty = useProjectStore((s) => s.isDirty)
  const projectStoreApi = useProjectStoreApi()
  const saveError = useProjectStore((s) => s.saveError)
  const setMode = useProjectStore((s) => s.setMode)
  const rename = useProjectStore((s) => s.rename)
  const showExtensions = useUIStore((s) => s.showExtensions)
  const setShowExtensions = useUIStore((s) => s.setShowExtensions)
  const showPreview = useUIStore((s) => s.showPreview)
  const setShowPreview = useUIStore((s) => s.setShowPreview)
  const setBottomTab = useUIStore((s) => s.setBottomTab)
  const studioTheme = useStudioTheme()
  const setTheme = useSettingsStore((s) => s.setTheme)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(projectName)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(projectName)
  }, [editing, projectName])

  if (!hasProject) return <div />

  const exitToProjects = async () => {
    if (!onExit) return
    if (isDirty) {
      try {
        await saveCurrentProject(projectStoreApi)
      } catch {
        return
      }
    }
    onExit()
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveCurrentProject(projectStoreApi)
    } catch {
      // O erro persistente é exibido no badge; evita rejection não tratada no evento.
    } finally {
      setSaving(false)
    }
  }

  return (
    <header className="flex items-center gap-3 border-b border-sz-border bg-sz-panel px-4 py-2 text-sm">
      {onExit ? (
        <button
          type="button"
          onClick={() => void exitToProjects()}
          className="flex items-center gap-2 text-sz-fg hover:opacity-80"
          title="Voltar à lista de projetos"
        >
          <Logo />
          <strong>{t('app.name')}</strong>
        </button>
      ) : (
        <span className="flex items-center gap-2 text-sz-fg">
          <Logo />
          <strong>{t('app.name')}</strong>
        </span>
      )}
      <span className="text-sz-fg-mute">/</span>
      {editing ? (
        <input
          name="project-name"
          aria-label="Nome do projeto"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            rename(draft.trim() || 'Sem título')
            setEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') {
              setDraft(projectName)
              setEditing(false)
            }
          }}
          className="rounded border border-sz-border bg-sz-bg px-2.5 py-1 text-sm text-sz-fg"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(projectName)
            setEditing(true)
          }}
          className="text-sz-fg hover:underline"
          title={t('topbar.rename')}
        >
          {projectName}
        </button>
      )}
      <span title={saveError ?? undefined}>
        <Badge tone={saveError ? 'error' : isDirty ? 'warn' : 'success'}>
          {saveError ? 'Erro ao salvar' : isDirty ? t('project.unsaved') : t('project.saved')}
        </Badge>
      </span>

      <div className="ml-4 flex rounded-md border border-sz-border bg-sz-bg p-0.5">
        {IDE_MODES.map((m) => {
          const active = projectMode === m
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{ touchAction: 'manipulation' }}
              className={[
                'rounded px-4 py-1.5 text-sm font-medium leading-none transition-colors',
                active ? 'bg-sz-accent text-sz-bg' : 'text-sz-fg-soft hover:text-sz-fg',
              ].join(' ')}
            >
              {MODE_LABELS[m]}
            </button>
          )
        })}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {canToggleTheme && (
          <button
            type="button"
            onClick={() => void setTheme(studioTheme === 'dark' ? 'light' : 'dark')}
            title="Mudar tema"
            aria-label="Mudar tema"
            className="rounded p-1.5 text-sz-fg-soft transition-colors hover:bg-sz-bg hover:text-sz-fg"
          >
            {studioTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        )}
        {onExit && (
          <Button variant="ghost" size="sm" onClick={() => void exitToProjects()}>
            {t('topbar.projects')}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
          {showPreview ? 'Ocultar' : 'Mostrar'} {t('panel.preview')}
        </Button>
        <Button
          variant={showExtensions ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setShowExtensions(!showExtensions)}
        >
          {t('topbar.extensions')}
        </Button>
        {projectMode === 'code' && (
          <Button variant="ghost" size="sm" onClick={() => setBottomTab('ai')}>
            {t('topbar.ai')}
          </Button>
        )}
      </div>
    </header>
  )
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

function Logo() {
  return (
    <svg viewBox="0 0 64 64" className="h-6 w-6" role="img" aria-label="Sistema Zero Studio">
      <rect width="64" height="64" rx="12" fill="#0f172a" />
      <rect x="10" y="10" width="20" height="20" rx="3" fill="#22d3ee" />
      <rect x="34" y="10" width="20" height="20" rx="3" fill="#a78bfa" />
      <rect x="10" y="34" width="20" height="20" rx="3" fill="#34d399" />
      <rect x="34" y="34" width="20" height="20" rx="3" fill="#fbbf24" />
    </svg>
  )
}
