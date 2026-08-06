import type { JSX, ReactNode } from 'react'
import { useContext, useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { MODE_LABELS, modesForKind, type Project, t } from '#core'
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
  IconImage,
  IconMessageSquare,
  IconMoon,
  IconMore,
  IconPuzzle,
  IconRefresh,
  IconSave,
  IconShare,
  IconSparkles,
  IconSun,
  IconTerminal,
  Menu,
  type MenuItem,
  type MenuSection,
} from '#ui'
import { captureAndStoreProjectThumb } from '../../cover/thumbCapture'
import { exportProjectSource } from '../../export'
import { downloadProjectAsJSON, triggerDownload } from '../../export/download'
import { useProjectStore } from '../../state/projectStore'
import { useSettingsStore } from '../../state/settingsStore'
import { StudioStoresContext } from '../../state/storesContext'
import { useStudioPersistence } from '../../state/studioStores'
import { resolveConsoleVisibility, useUIStore } from '../../state/uiStore'
import { useStudioCloudSync } from '../../studio/cloud-sync'
import { useStudioConfig } from '../../studio/config'
import { useStudioLayout } from '../../studio/layoutContext'
import { useStudioShare, useStudioShareDisabledReason } from '../../studio/share'
import { useStudioTheme } from '../../studio/theme'
import { useStudioTutor } from '../../studio/tutor'
import { ExportDialog } from './ExportDialog'
import { ShareDialog } from './ShareDialog'

export interface TopbarProps {
  /** Sai do editor (host decide o destino). Sem ela, logo vira estático e o item "Projetos" some. */
  onExit?: () => void
  /** Executado após a promoção já ter sido salva no adapter. */
  onPromoteToPro?: (project: Project) => void | Promise<void>
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
        'inline-flex h-9 w-9 items-center justify-center rounded-xl text-sz-fg-soft transition-colors hover:bg-sz-bg hover:text-sz-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-sz-accent/60 disabled:cursor-not-allowed disabled:opacity-50',
        active && 'bg-sz-accent/15 text-sz-accent hover:bg-sz-accent/20',
      )}
    >
      {children}
    </button>
  )
}

export function Topbar({ onExit, onPromoteToPro, canToggleTheme }: TopbarProps): JSX.Element {
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
  const showAssets = useUIStore((s) => s.showAssets)
  const setShowAssets = useUIStore((s) => s.setShowAssets)
  const showPreview = useUIStore((s) => s.showPreview)
  const setShowPreview = useUIStore((s) => s.setShowPreview)
  const consoleVisibilityOverride = useUIStore((s) => s.consoleVisibilityOverride)
  const setConsoleVisibilityOverride = useUIStore((s) => s.setConsoleVisibilityOverride)
  const showTerminal = useUIStore((s) => s.showTerminal)
  const setShowTerminal = useUIStore((s) => s.setShowTerminal)
  const showAI = useUIStore((s) => s.showAI)
  const setShowAI = useUIStore((s) => s.setShowAI)
  const config = useStudioConfig()
  const showConsole = resolveConsoleVisibility(projectMode, consoleVisibilityOverride)
  const { isNarrow, isCompact } = useStudioLayout()
  const theme = useStudioTheme()
  const setTheme = useSettingsStore((s) => s.setTheme)
  const share = useStudioShare()
  const tutor = useStudioTutor()
  // Motivo p/ desabilitar o Compartilhar (ex.: "envie ao professor primeiro"); null = ok.
  const shareDisabledReason = useStudioShareDisabledReason()
  // "Sincronizar com o enviado" (Estúdio da aula) — null = host não passou o callback.
  const onCloudSync = useStudioCloudSync()
  // Stores da INSTÂNCIA: usados só para LER o projeto sob demanda (no clique do
  // Baixar), sem assinar re-render a cada edição. Fora de um <Studio> (null), o
  // fallback lê a store default via a estática. Ver storesContext.ts.
  const stores = useContext(StudioStoresContext)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(projectName)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [showShare, setShowShare] = useState(false)
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
    // Miniatura do card: fire-and-forget (iframe próprio no body sobrevive ao
    // unmount; a gravação exige o meta local existir, então persistence 'none'
    // vira no-op). Nunca atrasa nem bloqueia a saída.
    if (persistence.hasAdapter) {
      const project = stores
        ? stores.project.getState().project
        : useProjectStore.getState().project
      if (project) void captureAndStoreProjectThumb(project)
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

  // Baixar a FONTE do projeto (ZIP para continuar no VSCode). Lê o projeto da
  // instância sob demanda (sem assinar re-render). Avisos não-fatais (ex.: um
  // extra .ts que não compilou) vão ao console — o arquivo é baixado mesmo assim.
  const handleDownload = async () => {
    if (downloading) return
    const project = stores ? stores.project.getState().project : useProjectStore.getState().project
    if (!project) return
    setDownloading(true)
    try {
      const { blob, filename, warnings } = await exportProjectSource(project)
      triggerDownload(blob, filename)
      if (warnings.length > 0) console.warn('Baixar projeto:', ...warnings)
    } catch (err) {
      console.error('Falha ao baixar o projeto:', err)
    } finally {
      setDownloading(false)
    }
  }

  // Exporta o projeto ATUAL como `.szproject.json` (mesmo formato da listagem) p/
  // levar ao Estúdio Completo. Lê o projeto sob demanda (sem assinar re-render).
  const handleExportStudio = () => {
    const project = stores ? stores.project.getState().project : useProjectStore.getState().project
    if (project) downloadProjectAsJSON(project)
  }

  const handleConvert = async () => {
    setConverting(true)
    try {
      await convertToPro()
      // O callback do host costuma fazer uma navegação completa para a rota
      // COOP/COEP. Salva antes para essa navegação nunca interromper a promoção.
      await persistence.save()
      const promoted = stores
        ? stores.project.getState().project
        : useProjectStore.getState().project
      if (promoted?.kind === 'pro') await onPromoteToPro?.(promoted)
      setShowConvert(false)
    } finally {
      setConverting(false)
    }
  }

  // Menu "⋯" agrupado: Arquivo / Exibição / Conta. Cada item dispara a MESMA
  // ação de store dos botões antigos. (Preview NÃO entra: no wide é ícone
  // primário; no narrow vira aba no NarrowLayout.)
  // Salvar e Baixar VIVEM aqui (no menu) — só o "Compartilhar" fica solto na Topbar
  // (decisão de UX: a Topbar do estúdio-produto exibe só a ação principal). O badge
  // de status ("Salvo"/"Não salvo") continua na Topbar comunicando o estado.
  const fileItems: MenuItem[] = [
    {
      id: 'save',
      label: saving ? t('topbar.saving') : t('topbar.save'),
      icon: <IconSave />,
      onSelect: () => {
        if (!saving) void handleSave()
      },
    },
  ]
  // "Sincronizar com o enviado" (só na aula — o host passa o callback). Logo após
  // Salvar: é uma ação de "recuperar do servidor" do mesmo grupo Arquivo.
  if (onCloudSync) {
    fileItems.push({
      id: 'sync',
      label: t('topbar.cloudSync'),
      icon: <IconRefresh />,
      onSelect: () => onCloudSync(),
    })
  }
  // "Exportar para o Estúdio" (.szproject.json) — SEM gate: vale no editor da aula
  // E no Estúdio Completo (a criança leva o projeto para importar no Completo).
  fileItems.push({
    id: 'exportStudio',
    label: t('topbar.exportStudio'),
    icon: <IconDownload />,
    onSelect: handleExportStudio,
  })
  if (config.download) {
    fileItems.push({
      id: 'download',
      label: downloading ? t('topbar.downloading') : t('topbar.download'),
      icon: <IconDownload />,
      onSelect: () => {
        if (!downloading) void handleDownload()
      },
    })
  }
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

  // Mostrar/esconder cada painel. O Console deriva do modo até a primeira ação
  // manual; depois, a preferência desta instância prevalece. As escolhas valem
  // nos dois layouts (no wide a barra inferior some quando tudo é escondido; no
  // narrow a aba some). O Preview tem ainda o ícone dedicado na própria Topbar.
  const viewItems: MenuItem[] = []
  if (config.console) {
    viewItems.push({
      id: 'console',
      label: t('panel.console'),
      icon: <IconMessageSquare />,
      active: showConsole,
      onSelect: () => setConsoleVisibilityOverride(!showConsole),
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
  // Gerenciador de imagens (assets) — disponível no editor básico (jogos). Pro
  // gerencia arquivos direto na árvore, não precisa do painel.
  if (projectMode !== 'code') {
    viewItems.push({
      id: 'assets',
      label: 'Imagens',
      icon: <IconImage />,
      active: showAssets,
      onSelect: () => setShowAssets(!showAssets),
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
          'flex items-center border-sz-border border-b-2 bg-sz-panel text-sm',
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
              'min-w-0 rounded-lg border border-sz-border bg-sz-bg px-2.5 py-1 text-sm text-sz-fg',
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
              'flex shrink-0 rounded-xl border border-sz-border bg-sz-bg p-0.5',
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
                    'rounded-lg text-sm leading-none transition-colors',
                    isCompact ? 'px-2.5 py-1.5' : 'px-4 py-1.5',
                    active
                      ? 'bg-sz-accent font-bold text-sz-bg shadow-sm'
                      : 'font-medium text-sz-fg-soft hover:bg-sz-bg/60 hover:text-sz-fg',
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
          {tutor.config ? (
            <button
              type="button"
              aria-label={tutor.open ? 'Fechar Zappy' : 'Abrir Zappy'}
              aria-expanded={tutor.open}
              aria-controls="sz-zappy-panel"
              onClick={() => tutor.setOpen(!tutor.open)}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 font-bold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sz-accent/60',
                tutor.open
                  ? 'bg-sz-accent text-sz-bg'
                  : 'bg-sz-accent/10 text-sz-accent hover:bg-sz-accent/20',
              )}
            >
              <IconSparkles />
              {!isCompact ? <span>Zappy</span> : null}
            </button>
          ) : null}
          {share && (
            // Wrapper `group` recebe hover/foco MESMO com o botão inerte (botão
            // `disabled` engole os eventos → a dica nunca aparecia, e nunca no toque).
            <span className="group relative inline-flex">
              <button
                type="button"
                onClick={() => {
                  if (!shareDisabledReason) setShowShare(true)
                }}
                // Não usar `disabled` nativo: bloqueia só a AÇÃO (guard no onClick) mas
                // mantém o botão focável/tocável p/ revelar a bolha de dica.
                aria-disabled={Boolean(shareDisabledReason)}
                aria-label={shareDisabledReason ?? t('share.action')}
                style={{ touchAction: 'manipulation' }}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sz-accent/60',
                  shareDisabledReason
                    ? 'cursor-not-allowed text-sz-fg-mute opacity-50'
                    : 'text-sz-accent hover:bg-sz-accent/15',
                )}
              >
                <IconShare />
                {!isCompact && <span className="text-sm font-medium">{t('share.action')}</span>}
              </button>
              {shareDisabledReason && (
                // Bolha visível (não depende do `title` nativo): aparece no hover/foco/toque.
                <span
                  role="tooltip"
                  className="pointer-events-none absolute right-0 top-full z-50 mt-1.5 w-56 rounded-lg border border-sz-border bg-sz-panel px-3 py-2 text-xs font-medium leading-snug text-sz-fg opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  {shareDisabledReason}
                </span>
              )}
            </span>
          )}
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
      <ShareDialog open={showShare} onClose={() => setShowShare(false)} adapter={share} />
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
