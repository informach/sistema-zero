import type { JSX, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { MODE_LABELS, modesForKind, t } from '#core'
import {
  Badge,
  BrandLogo,
  BrandWordmark,
  ConfirmDialog,
  cn,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconGraduation,
  IconGrid,
  IconMessageSquare,
  IconMoon,
  IconMore,
  IconPuzzle,
  IconSave,
  IconSparkles,
  IconSun,
  IconTerminal,
  Menu,
  type MenuItem,
  type MenuSection,
} from '#ui'
import { useProjectStore } from '../../state/projectStore'
import { useSettingsStore } from '../../state/settingsStore'
import { useStudioPersistence } from '../../state/studioStores'
import { useUIStore } from '../../state/uiStore'
import { useStudioConfig } from '../../studio/config'
import { useStudioLayout } from '../../studio/layoutContext'
import { useStudioTheme } from '../../studio/theme'
import { ExportDialog } from './ExportDialog'

export interface TopbarProps {
  /** Sai do editor (host decide o destino). Sem ela, logo vira estático e o item "Projetos" some. */
  onExit?: () => void
  /** Mostra o controle claro/escuro (false quando o host fixa o tema via prop). */
  canToggleTheme?: boolean
}

/** Botão de ação só-ícone, com tooltip — o padrão da Topbar compacta. */
function IconButton({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: ReactNode
}): JSX.Element {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      style={{ touchAction: 'manipulation' }}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md text-sz-fg-soft transition-colors hover:bg-sz-bg hover:text-sz-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-sz-accent/60 disabled:cursor-not-allowed disabled:opacity-50',
        active && 'bg-sz-accent/15 text-sz-accent hover:bg-sz-accent/20',
      )}
    >
      {children}
    </button>
  )
}

export function Topbar({ onExit, canToggleTheme }: TopbarProps): JSX.Element {
  const { hasProject, projectName, projectMode, projectKind } = useProjectStore(
    useShallow((s) => ({
      hasProject: Boolean(s.project),
      projectName: s.project?.name ?? '',
      projectMode: s.project?.mode ?? 'blocks',
      projectKind: s.project?.kind,
    })),
  )
  const isDirty = useProjectStore((s) => s.isDirty)
  const convertToPro = useProjectStore((s) => s.convertToPro)
  const persistence = useStudioPersistence()
  const saveError = useProjectStore((s) => s.saveError)
  const setMode = useProjectStore((s) => s.setMode)
  const rename = useProjectStore((s) => s.rename)
  const showExtensions = useUIStore((s) => s.showExtensions)
  const setShowExtensions = useUIStore((s) => s.setShowExtensions)
  const showPreview = useUIStore((s) => s.showPreview)
  const setShowPreview = useUIStore((s) => s.setShowPreview)
  const showConsole = useUIStore((s) => s.showConsole)
  const setShowConsole = useUIStore((s) => s.setShowConsole)
  const showTerminal = useUIStore((s) => s.showTerminal)
  const setShowTerminal = useUIStore((s) => s.setShowTerminal)
  const showAI = useUIStore((s) => s.showAI)
  const setShowAI = useUIStore((s) => s.setShowAI)
  const config = useStudioConfig()
  const { isNarrow, isCompact } = useStudioLayout()
  const theme = useStudioTheme()
  const setTheme = useSettingsStore((s) => s.setTheme)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(projectName)
  const [saving, setSaving] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [converting, setConverting] = useState(false)

  const availableModes = modesForKind(projectKind).filter(
    (m) => projectKind === 'pro' || config.allowedModes.includes(m),
  )

  useEffect(() => {
    if (!editing) setDraft(projectName)
  }, [editing, projectName])

  if (!hasProject) return <div />

  const exitToProjects = async () => {
    if (!onExit) return
    if (isDirty) {
      try {
        await persistence.save()
      } catch {
        return
      }
    }
    onExit()
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await persistence.save()
    } catch {
      // O erro persistente é exibido no badge; evita rejection não tratada no evento.
    } finally {
      setSaving(false)
    }
  }

  const handleConvert = async () => {
    setConverting(true)
    try {
      await convertToPro()
      setShowConvert(false)
    } finally {
      setConverting(false)
    }
  }

  // Menu "⋯" agrupado: Arquivo / Exibição / Conta. Cada item dispara a MESMA
  // ação de store dos botões antigos. (Preview NÃO entra: no wide é ícone
  // primário; no narrow vira aba no NarrowLayout.)
  const fileItems: MenuItem[] = []
  if (config.export) {
    fileItems.push({
      id: 'export',
      label: t('topbar.export'),
      icon: <IconDownload />,
      onSelect: () => setShowExport(true),
    })
  }
  if (config.professional && projectKind !== 'pro') {
    fileItems.push({
      id: 'convert',
      label: t('topbar.convertPro'),
      icon: <IconGraduation />,
      onSelect: () => setShowConvert(true),
    })
  }

  // Mostrar/esconder cada painel, no mesmo espírito do toggle do Preview — cada
  // um no contexto em que aparece (Console em todo modo; Terminal/IA só no
  // Código). As flags valem nos dois layouts (no wide a barra inferior some
  // quando tudo é escondido; no narrow a aba some). O Preview tem ainda o ícone
  // dedicado na própria Topbar.
  const viewItems: MenuItem[] = []
  if (config.console) {
    viewItems.push({
      id: 'console',
      label: t('panel.console'),
      icon: <IconMessageSquare />,
      active: showConsole,
      onSelect: () => setShowConsole(!showConsole),
    })
  }
  if (projectMode === 'code' && config.terminal) {
    viewItems.push({
      id: 'terminal',
      label: t('panel.terminal'),
      icon: <IconTerminal />,
      active: showTerminal,
      onSelect: () => setShowTerminal(!showTerminal),
    })
  }
  if (projectMode === 'code' && config.ai) {
    viewItems.push({
      id: 'ai',
      label: t('panel.ai'),
      icon: <IconSparkles />,
      active: showAI,
      onSelect: () => setShowAI(!showAI),
    })
  }
  if (config.extensions) {
    viewItems.push({
      id: 'extensions',
      label: t('topbar.extensions'),
      icon: <IconPuzzle />,
      active: showExtensions,
      onSelect: () => setShowExtensions(!showExtensions),
    })
  }

  const accountItems: MenuItem[] = []
  if (canToggleTheme) {
    accountItems.push({
      id: 'theme',
      label: t('topbar.theme'),
      icon: theme === 'dark' ? <IconSun /> : <IconMoon />,
      onSelect: () => void setTheme(theme === 'dark' ? 'light' : 'dark'),
    })
  }
  if (onExit) {
    accountItems.push({
      id: 'projects',
      label: t('topbar.projects'),
      icon: <IconGrid />,
      onSelect: () => void exitToProjects(),
    })
  }

  const sections: MenuSection[] = [
    { id: 'file', label: t('topbar.group.file'), items: fileItems },
    { id: 'view', label: t('topbar.group.view'), items: viewItems },
    { id: 'account', label: t('topbar.group.account'), items: accountItems },
  ].filter((s) => s.items.length > 0)

  const nameMaxW = isCompact ? 'max-w-[7rem]' : isNarrow ? 'max-w-[12rem]' : 'max-w-[20rem]'
  const saveStatusLabel = saveError
    ? 'Erro ao salvar'
    : isDirty
      ? t('project.unsaved')
      : t('project.saved')

  return (
    <>
      <header
        className={cn(
          'flex items-center border-b border-sz-border bg-sz-panel text-sm',
          isCompact ? 'gap-1.5 px-2 py-2' : 'gap-3 px-4 py-2',
        )}
      >
        {onExit ? (
          <button
            type="button"
            onClick={() => void exitToProjects()}
            className="flex shrink-0 items-center text-sz-fg hover:opacity-80"
            title="Voltar à lista de projetos"
          >
            {isCompact ? (
              <BrandLogo className="h-6 w-6" />
            ) : (
              <BrandWordmark className="h-5 w-auto" />
            )}
          </button>
        ) : (
          <span className="flex shrink-0 items-center text-sz-fg">
            {isCompact ? (
              <BrandLogo className="h-6 w-6" />
            ) : (
              <BrandWordmark className="h-5 w-auto" />
            )}
          </span>
        )}
        {!isCompact && <span className="shrink-0 text-sz-fg-mute">/</span>}
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
            className={cn(
              'min-w-0 rounded border border-sz-border bg-sz-bg px-2.5 py-1 text-sm text-sz-fg',
              nameMaxW,
            )}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(projectName)
              setEditing(true)
            }}
            className={cn('min-w-0 truncate text-sz-fg hover:underline', nameMaxW)}
            title={t('topbar.rename')}
          >
            {projectName}
          </button>
        )}
        {isCompact ? (
          <span
            role="status"
            aria-label={saveStatusLabel}
            title={saveError ?? saveStatusLabel}
            className={cn(
              'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
              saveError ? 'bg-sz-error' : isDirty ? 'bg-sz-warn' : 'bg-sz-success',
            )}
          />
        ) : (
          <span className="shrink-0" title={saveError ?? undefined}>
            <Badge tone={saveError ? 'error' : isDirty ? 'warn' : 'success'}>
              {saveStatusLabel}
            </Badge>
          </span>
        )}

        {availableModes.length > 0 && (
          <div
            className={cn(
              'flex shrink-0 rounded-md border border-sz-border bg-sz-bg p-0.5',
              isCompact ? 'ml-0.5' : 'ml-4',
            )}
          >
            {availableModes.map((m) => {
              const active = projectMode === m
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMode(m)}
                  style={{ touchAction: 'manipulation' }}
                  className={cn(
                    'rounded text-sm font-medium leading-none transition-colors',
                    isCompact ? 'px-2.5 py-1.5' : 'px-4 py-1.5',
                    active ? 'bg-sz-accent text-sz-bg' : 'text-sz-fg-soft hover:text-sz-fg',
                  )}
                >
                  {MODE_LABELS[m]}
                </button>
              )
            })}
          </div>
        )}

        <div
          className={cn('ml-auto flex shrink-0 items-center', isCompact ? 'gap-0.5' : 'gap-1.5')}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            title={t('topbar.save')}
            aria-label={t('topbar.save')}
            style={{ touchAction: 'manipulation' }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sz-fg-soft transition-colors hover:bg-sz-bg hover:text-sz-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-sz-accent/60 disabled:opacity-50"
          >
            <IconSave />
            {!isCompact && (
              <span className="text-sm">{saving ? t('topbar.saving') : t('topbar.save')}</span>
            )}
          </button>
          {config.preview && (
            <IconButton
              label={showPreview ? t('topbar.hidePreview') : t('topbar.showPreview')}
              active={showPreview}
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <IconEye /> : <IconEyeOff />}
            </IconButton>
          )}
          {sections.length > 0 && (
            <Menu trigger={<IconMore size={18} />} label={t('topbar.more')} sections={sections} />
          )}
        </div>
      </header>
      <ExportDialog open={showExport} onClose={() => setShowExport(false)} />
      <ConfirmDialog
        open={showConvert}
        title={t('convert.title')}
        confirmLabel={converting ? t('convert.working') : t('convert.confirm')}
        cancelLabel={t('convert.cancel')}
        busy={converting}
        onCancel={() => setShowConvert(false)}
        onConfirm={handleConvert}
      >
        {t('convert.body')}
      </ConfirmDialog>
    </>
  )
}
