import type { JSX } from 'react'
import { useContext, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { modesForKind, type Project } from '#core'
import {
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
import { exportProjectSource } from '../../export'
import { downloadProjectAsJSON, triggerDownload } from '../../export/download'
import { useProjectStore } from '../../state/projectStore'
import { useSettingsStore } from '../../state/settingsStore'
import { StudioStoresContext } from '../../state/storesContext'
import { useStudioPersistence } from '../../state/studioStores'
import { resolveConsoleVisibility, useUIStore } from '../../state/uiStore'
import { useStudioCloudSync } from '../../studio/cloud-sync'
import { useStudioConfig } from '../../studio/config'
import { useStudioHostChrome } from '../../studio/host-chrome'
import { useT } from '../../studio/i18n'
import { useStudioLayout } from '../../studio/layoutContext'
import { useStudioShare, useStudioShareDisabledReason } from '../../studio/share'
import { useStudioTheme } from '../../studio/theme'
import { useStudioTutor } from '../../studio/tutor'
import { ExportDialog } from './ExportDialog'
import { HostMenuButton } from './HostMenuButton'
import { STUDIO_BRAND_MIN_PX } from './layoutBreakpoints'
import { ShareDialog } from './ShareDialog'
import { BackBrand } from './topbar/BackBrand'
import { BarIconButton } from './topbar/BarIconButton'
import { HostStatusSeal } from './topbar/HostStatusSeal'
import { ModeSegment } from './topbar/ModeSegment'
import { ProjectNameField } from './topbar/ProjectNameField'
import { SavePill, type SaveTone } from './topbar/SavePill'
import { UndoRedo, undoRedoMenuItems, useUndoRedo } from './topbar/UndoRedo'

export interface TopbarProps {
  /** Sai do editor (host decide o destino). Sem ela, logo vira estático e o item "Projetos" some. */
  onExit?: () => void
  /** Executado após a promoção já ter sido salva no adapter. */
  onPromoteToPro?: (project: Project) => void | Promise<void>
  /** Mostra o controle claro/escuro (false quando o host fixa o tema via prop). */
  canToggleTheme?: boolean
}

/**
 * A barra do editor no desenho da tela-modelo do Estúdio (11/09/2026): TRÊS grupos numa linha.
 * À esquerda [menu do host][← marca][nome ✎][Salvo][nuvem]; no MEIO o segmentado dos modos; à
 * direita [Zappy][desfazer][refazer][olho da prévia][⋯][Compartilhar] (no compacto desfazer e
 * refazer moram no "⋯"). As regras visuais são as `.sz-bar-*` do
 * `studio.css`: é o MESMO componente do Estúdio Completo, do bloco de aula, do admin e da
 * comunidade adulta, e só o kids importa o `tool-chrome.css`.
 *
 * Largo (a partir de 1024px) = 68px; estreito e compacto = 52px, com o segmentado e as pílulas
 * da direita só no ícone (o nome acessível não muda). O segmentado fica no meio do espaço livre
 * entre as pontas (como na tela-modelo); quando não sobra espaço, quem encolhe é o NOME do
 * projeto (reticências), nunca um botão.
 */
export function Topbar({ onExit, onPromoteToPro, canToggleTheme }: TopbarProps): JSX.Element {
  const t = useT()
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
  const { width, isNarrow, isCompact } = useStudioLayout()
  const theme = useStudioTheme()
  const setTheme = useSettingsStore((s) => s.setTheme)
  const share = useStudioShare()
  const tutor = useStudioTutor()
  // Motivo p/ desabilitar o Compartilhar (ex.: "envie ao professor primeiro"); null = ok.
  const shareDisabledReason = useStudioShareDisabledReason()
  // "Sincronizar com o enviado" (Estúdio da aula) — null = host não passou o callback.
  const onCloudSync = useStudioCloudSync()
  // Botão do menu lateral + selo "Guardado na sua conta" do host (community-kids); null fora dele.
  const hostChrome = useStudioHostChrome()
  // Stores da INSTÂNCIA: usados só para LER o projeto sob demanda (no clique do
  // Baixar), sem assinar re-render a cada edição. Fora de um <Studio> (null), o
  // fallback lê a store default via a estática. Ver storesContext.ts.
  const stores = useContext(StudioStoresContext)
  // Desfazer/refazer do editor em uso (os blocos, o código ou, na Ponte, o último tocado).
  const undoRedo = useUndoRedo(projectMode)

  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [converting, setConverting] = useState(false)

  const availableModes = modesForKind(projectKind).filter(
    (m) => projectKind === 'pro' || config.allowedModes.includes(m),
  )

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
    // A miniatura do card NÃO é tirada aqui: o gatilho mora no unmount do
    // `StudioCore`, que cobre TODOS os jeitos de sair (este botão, a navegação
    // do host, o voltar do navegador) em vez de só este. Capturar nos dois
    // lugares bootaria o jogo escondido duas vezes por saída.
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
    // No compacto desfazer e refazer não cabem na barra: abrem o "⋯".
    {
      id: 'edit',
      label: t('topbar.group.edit'),
      items: undoRedo && isCompact ? undoRedoMenuItems(undoRedo, t) : [],
    },
    { id: 'file', label: t('topbar.group.file'), items: fileItems },
    { id: 'view', label: t('topbar.group.view'), items: viewItems },
    { id: 'account', label: t('topbar.group.account'), items: accountItems },
  ].filter((s) => s.items.length > 0)

  const saveTone: SaveTone = saveError ? 'danger' : isDirty ? 'warn' : 'ok'
  const saveStatusLabel = saveError
    ? 'Erro ao salvar'
    : isDirty
      ? t('project.unsaved')
      : t('project.saved')
  // A marca escrita só quando sobra espaço para o NOME do projeto (ver `STUDIO_BRAND_MIN_PX`);
  // abaixo disso fica o círculo da seta, com a marca no nome acessível.
  const showBrand = width >= STUDIO_BRAND_MIN_PX
  // Abaixo do largo as pílulas da direita e o segmentado ficam só no ícone.
  const iconOnly = isNarrow || isCompact

  return (
    <>
      <header className={cn('sz-bar', iconOnly && 'sz-bar--tight', isCompact && 'sz-bar--compact')}>
        <div className="sz-bar__start">
          {/* Esconder/mostrar o menu da comunidade (host): PRIMEIRO da barra, no canto mais
              perto do painel que ele controla, na receita compartilhada das ferramentas. */}
          {hostChrome?.menu ? <HostMenuButton menu={hostChrome.menu} /> : null}
          <BackBrand
            onExit={onExit ? () => void exitToProjects() : undefined}
            showName={showBrand}
          />
          {showBrand ? <span aria-hidden="true" className="sz-bar-divider" /> : null}
          <ProjectNameField name={projectName} onRename={rename} showPencil={!isCompact} />
          <SavePill tone={saveTone} label={saveStatusLabel} error={saveError} dot={isCompact} />
          {/* "Guardado na sua conta" (host), ao lado do "Salvo" local: só a nuvem em repouso,
              a frase curta quando algo acontece, a bolinha abaixo do largo. */}
          {hostChrome?.status ? <HostStatusSeal status={hostChrome.status} dot={iconOnly} /> : null}
        </div>

        {availableModes.length > 0 ? (
          <div className="sz-bar__center">
            <ModeSegment
              modes={availableModes}
              active={projectMode}
              onSelect={setMode}
              iconOnly={iconOnly}
            />
          </div>
        ) : null}

        <div className="sz-bar__end">
          {tutor.config ? (
            <button
              type="button"
              aria-label={tutor.open ? 'Fechar Zappy' : 'Abrir Zappy'}
              aria-expanded={tutor.open}
              aria-controls="sz-zappy-panel"
              onClick={() => tutor.setOpen(!tutor.open)}
              className={cn('sz-bar-pill sz-bar-pill--soft', iconOnly && 'sz-bar-pill--icon')}
            >
              <IconSparkles />
              {!iconOnly ? <span>Zappy</span> : null}
            </button>
          ) : null}
          {undoRedo && !isCompact ? <UndoRedo state={undoRedo} /> : null}
          {/* No ESTREITO o preview é uma ABA, não um painel ao lado: o olhinho não
              teria o que esconder e a criança clicaria achando que o app quebrou.
              Some. Quem garante que a aba continua lá é o `previewAvailable` dos
              modos, que ignora a preferência de desktop no ramo NarrowPanels. */}
          {config.preview && !isNarrow ? (
            <BarIconButton
              label={showPreview ? t('topbar.hidePreview') : t('topbar.showPreview')}
              pressed={showPreview}
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <IconEye /> : <IconEyeOff />}
            </BarIconButton>
          ) : null}
          {sections.length > 0 ? (
            <Menu
              trigger={<IconMore size={18} />}
              label={t('topbar.more')}
              sections={sections}
              triggerVariant="bar"
            />
          ) : null}
          {share ? (
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
                className={cn('sz-bar-pill sz-bar-pill--primary', iconOnly && 'sz-bar-pill--icon')}
              >
                <IconShare />
                {!iconOnly ? <span>{t('share.action')}</span> : null}
              </button>
              {shareDisabledReason ? (
                // Bolha visível (não depende do `title` nativo): aparece no hover/foco/toque.
                <span
                  role="tooltip"
                  className="pointer-events-none absolute right-0 top-full z-50 mt-1.5 w-56 rounded-lg border border-sz-border bg-sz-panel px-3 py-2 text-xs font-medium leading-snug text-sz-fg opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  {shareDisabledReason}
                </span>
              ) : null}
            </span>
          ) : null}
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
