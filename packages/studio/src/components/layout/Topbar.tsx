import type { JSX } from 'react'
import { lazy, Suspense, useContext, useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { modesForKind } from '#core'
import {
  ConfirmDialog,
  cn,
  IconBox,
  IconEye,
  IconEyeOff,
  IconFileOutput,
  IconGlobe,
  IconGraduation,
  IconGrid,
  IconImage,
  IconLaptop,
  IconMessageSquare,
  IconMoon,
  IconMore,
  IconPuzzle,
  IconRefresh,
  IconSave,
  IconShare,
  IconSparkles,
  IconSpeaker,
  IconSun,
  IconTerminal,
  Menu,
  type MenuItem,
  type MenuSection,
  Modal,
} from '#ui'
import type { EditableStudioProject as Project } from '../../core/editableProject'
import { downloadProjectAsJSON, triggerDownload } from '../../export/download'
import { flushProjectOperations } from '../../state/projectOperations'
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
import { useStudioMoldaLibrary } from '../../studio/molda-library'
import { useStudioShare, useStudioShareDisabledReason } from '../../studio/share'
import { useStudioTheme } from '../../studio/theme'
import { useStudioTutor } from '../../studio/tutor'
import { projectHas3DMaterials } from '../assets/has3DConsumer'
import { HostMenuButton } from './HostMenuButton'
import { LoadingScreen } from './LoadingViews'
import {
  STUDIO_BAR_COMPACT_MAX_PX,
  STUDIO_BAR_LABELS_MIN_PX,
  STUDIO_BAR_UNDO_MIN_PX,
  STUDIO_BRAND_MIN_PX,
} from './layoutBreakpoints'
import { ShareDialog } from './ShareDialog'
import { BackBrand } from './topbar/BackBrand'
import { BarIconButton } from './topbar/BarIconButton'
import { HostStatusSeal } from './topbar/HostStatusSeal'
import { ModeSegment } from './topbar/ModeSegment'
import { STUDIO_MENU_LAYOUT, type StudioMenuItemId } from './topbar/menuLayout'
import { ProjectNameField } from './topbar/ProjectNameField'
import { SavePill, type SaveTone } from './topbar/SavePill'
import { UndoRedo, undoRedoMenuItems, useUndoRedo } from './topbar/UndoRedo'

// The compiler/export workflow loads only when requested.
const ExportDialog = lazy(() =>
  import('./ExportDialog').then((module) => ({ default: module.ExportDialog })),
)

/** O que cada item do menu "⋯" FAZ. O nome, o grupo e a ordem vêm da árvore editorial. */
interface MenuItemBehavior {
  icon: MenuItem['icon']
  onSelect: () => void
  /** Sobrepõe o rótulo da árvore quando ele é dinâmico ("Salvando…", "Baixando…"). */
  label?: string
  active?: boolean
  disabled?: boolean
}

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
  const { hasProject, projectId, projectName, projectMode, projectKind, has3DInProject } =
    useProjectStore(
      useShallow((s) => ({
        hasProject: Boolean(s.project),
        projectId: s.project?.id,
        projectName: s.project?.name ?? '',
        projectMode: s.project?.mode ?? 'blocks',
        projectKind: s.project?.kind,
        // ⚠️ Um BOOLEAN, nunca a referência do projeto: o `useShallow` compara o que
        // sai daqui, e devolver `s.project` re-renderizaria a barra inteira a cada
        // tecla. A régua em si é memoizada por identidade do `blocksState` (ver
        // `has3DConsumer.ts`) — sem isso, este seletor faria um `JSON.stringify` do
        // estado dos blocos a cada `set()` da store.
        has3DInProject: projectHas3DMaterials(s.project, false),
      })),
    )
  const isDirty = useProjectStore((s) => s.isDirty)
  const persistence = useStudioPersistence()
  const saveError = useProjectStore((s) => s.saveError)
  const setMode = useProjectStore((s) => s.setMode)
  const rename = useProjectStore((s) => s.rename)
  const showExtensions = useUIStore((s) => s.showExtensions)
  const setShowExtensions = useUIStore((s) => s.setShowExtensions)
  const showAssets = useUIStore((s) => s.showAssets)
  const assetsTab = useUIStore((s) => s.assetsTab)
  const openAssetsTab = useUIStore((s) => s.openAssetsTab)
  const showPreview = useUIStore((s) => s.showPreview)
  const setShowPreview = useUIStore((s) => s.setShowPreview)
  const consoleVisibilityOverride = useUIStore((s) => s.consoleVisibilityOverride)
  const setConsoleVisibilityOverride = useUIStore((s) => s.setConsoleVisibilityOverride)
  const showTerminal = useUIStore((s) => s.showTerminal)
  const setShowTerminal = useUIStore((s) => s.setShowTerminal)
  const config = useStudioConfig()
  const showConsole = resolveConsoleVisibility(projectMode, consoleVisibilityOverride)
  const { width, isNarrow, isCompact } = useStudioLayout()
  const theme = useStudioTheme()
  const setTheme = useSettingsStore((s) => s.setTheme)
  const share = useStudioShare()
  const tutor = useStudioTutor()
  // Motivo p/ desabilitar o Compartilhar (ex.: "envie ao professor primeiro"); null = ok.
  const shareDisabledReason = useStudioShareDisabledReason()
  // "Trazer o que eu enviei" (Estúdio da aula) — null = host não passou o callback.
  const onCloudSync = useStudioCloudSync()
  // Botão do menu lateral + selo "Guardado na sua conta" do host (community-kids); null fora dele.
  const hostChrome = useStudioHostChrome()
  // "Trazer do Molda" — null quando o host não passa o adapter.
  // ⚠️ Em linha PRÓPRIA: dentro de um `||` o curto-circuito pularia a chamada
  // quando o lado esquerdo já fosse verdadeiro, e a ordem dos hooks mudaria de
  // um render para o outro (o biome pegou).
  const moldaLibrary = useStudioMoldaLibrary()
  // A porta "Modelos 3D" acompanha a ABA da janela pela FONTE ÚNICA da régua.
  const has3DMaterials = has3DInProject || Boolean(moldaLibrary)
  // Stores da INSTÂNCIA: usados só para LER o projeto sob demanda (no clique do
  // Baixar), sem assinar re-render a cada edição. Fora de um <Studio> (null), o
  // fallback lê a store default via a estática. Ver storesContext.ts.
  const stores = useContext(StudioStoresContext)
  // Desfazer/refazer do editor em uso (os blocos, o código ou, na Ponte, o último tocado).
  const undoRedo = useUndoRedo(projectMode)

  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const sourceDownload = useRef<AbortController | null>(null)
  const [downloadNotice, setDownloadNotice] = useState<{
    error: boolean
    messages: string[]
  } | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: changing document/instance cancels this instance-owned download even before its dynamic import completes.
  useEffect(() => {
    setDownloadNotice(null)
    setDownloading(false)
    return () => {
      sourceDownload.current?.abort()
      sourceDownload.current = null
    }
  }, [projectId, stores])
  const [showShare, setShowShare] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [converting, setConverting] = useState(false)
  const [conversionError, setConversionError] = useState<string | null>(null)

  const availableModes = modesForKind(projectKind).filter(
    (m) => projectKind === 'pro' || config.allowedModes.includes(m),
  )

  if (!hasProject) return <div />

  const exitToProjects = async () => {
    if (!onExit) return
    if (isDirty || projectKind === 'pro') {
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
  // instância sob demanda. Buffers, writers, snapshot e escopo são coordenados
  // pelo mesmo caminho; avisos e falhas aparecem para quem pediu o download.
  const handleDownload = async () => {
    if (sourceDownload.current) return
    const store = stores?.project ?? useProjectStore
    if (!store.getState().project) return
    const controller = new AbortController()
    sourceDownload.current = controller
    setDownloading(true)
    setDownloadNotice(null)
    try {
      const { prepareSourceDownload } = await import('../../export/sourceDownload')
      const { blob, filename, warnings } = await prepareSourceDownload(
        store,
        stores?.pendingEditorEdits,
        controller.signal,
      )
      controller.signal.throwIfAborted()
      triggerDownload(blob, filename)
      if (warnings.length > 0) setDownloadNotice({ error: false, messages: warnings })
    } catch (err) {
      if (!controller.signal.aborted)
        setDownloadNotice({
          error: true,
          messages: [err instanceof Error ? err.message : String(err)],
        })
    } finally {
      if (sourceDownload.current === controller) {
        sourceDownload.current = null
        setDownloading(false)
      }
    }
  }

  // Exporta o projeto ATUAL como `.szproject.json` (mesmo formato da listagem) p/
  // levar ao Estúdio Completo. Lê o projeto sob demanda (sem assinar re-render).
  const handleExportStudio = async () => {
    const store = stores?.project ?? useProjectStore
    const projectId = store.getState().project?.id
    if (!projectId) return
    try {
      await flushProjectOperations(store, projectId)
      const project = store.getState().project
      if (project?.id === projectId) downloadProjectAsJSON(project)
    } catch (error) {
      store.getState().markSaveFailed(error instanceof Error ? error.message : String(error))
    }
  }

  const handleConvert = async () => {
    setConverting(true)
    setConversionError(null)
    try {
      await persistence.promoteToPro()
      // O callback do host costuma fazer uma navegação completa para a rota
      // COOP/COEP. Salva antes para essa navegação nunca interromper a promoção.
      const promoted = stores
        ? stores.project.getState().project
        : useProjectStore.getState().project
      if (promoted?.kind === 'pro') await onPromoteToPro?.(promoted)
      setShowConvert(false)
    } catch (error) {
      setConversionError(error instanceof Error ? error.message : String(error))
    } finally {
      setConverting(false)
    }
  }

  // Menu "⋯": o comportamento de CADA item, indexado pelo id da árvore editorial
  // (`topbar/menuLayout.ts`). A lista que aparece é DERIVADA dali — é o mesmo par
  // dado-puro + derivação da paleta do Jogo 2D (`palette.ts` × `blocks.ts`), e é
  // o que permite o drift cobrar que nada apareça fora da árvore nem se perca dela.
  // Item AUSENTE deste mapa não aparece: é assim que as features desligadas pelo
  // host (aula, admin) somem, e por isso não há nenhum `if` de exibição abaixo.
  // (O Preview NÃO entra: no wide é ícone primário; no narrow vira aba no
  // NarrowLayout. Salvar e Baixar VIVEM aqui — só o "Compartilhar" fica solto na
  // Topbar, que exibe apenas a ação principal; o badge "Salvo"/"Não salvo" segue
  // na barra comunicando o estado.)
  const behaviors: Partial<Record<StudioMenuItemId, MenuItemBehavior>> = {}

  // Abaixo de `STUDIO_BAR_UNDO_MIN_PX` desfazer e refazer não cabem na barra: moram no "⋯".
  const undoInMenu = width < STUDIO_BAR_UNDO_MIN_PX
  if (undoRedo && undoInMenu) {
    for (const item of undoRedoMenuItems(undoRedo, t)) {
      behaviors[item.id] = {
        icon: item.icon,
        disabled: item.disabled,
        onSelect: item.onSelect,
      }
    }
  }

  behaviors.save = {
    label: saving ? t('topbar.saving') : undefined,
    icon: <IconSave />,
    onSelect: () => {
      if (!saving) void handleSave()
    },
  }
  // "Trazer o que eu enviei" (só na aula — o host passa o callback). Logo após
  // Salvar: é a ação de "recuperar do servidor" do mesmo grupo.
  if (onCloudSync) behaviors.sync = { icon: <IconRefresh />, onSelect: () => onCloudSync() }
  if (config.extensions) {
    behaviors.extensions = {
      icon: <IconPuzzle />,
      active: showExtensions,
      onSelect: () => setShowExtensions(!showExtensions),
    }
  }

  // As três portas dos materiais: a MESMA janela, cada uma na sua aba. Só no
  // editor básico (jogos) — o Pro gerencia arquivos direto na árvore e não
  // precisa da janela. Ligada fica só a porta da aba que está ABERTA: marcar as
  // três diria que há três janelas.
  if (projectMode !== 'code') {
    behaviors.assetsImages = {
      icon: <IconImage />,
      active: showAssets && assetsTab === 'images',
      onSelect: () => openAssetsTab('images'),
    }
    behaviors.assetsSounds = {
      icon: <IconSpeaker />,
      active: showAssets && assetsTab === 'sounds',
      onSelect: () => openAssetsTab('sounds'),
    }
    // A porta do 3D acompanha a ABA: ela existe com um consumidor 3D instalado
    // OU com algum arquivo 3D no projeto (um órfão precisa continuar gerenciável).
    if (has3DMaterials) {
      behaviors.assetsModels = {
        icon: <IconBox />,
        active: showAssets && assetsTab === 'models3d',
        onSelect: () => openAssetsTab('models3d'),
      }
    }
  }

  // Mostrar/esconder cada painel. O Console deriva do modo até a primeira ação
  // manual; depois, a preferência desta instância prevalece. As escolhas valem
  // nos dois layouts (no wide a barra inferior some quando tudo é escondido; no
  // narrow a aba some). O Preview tem ainda o ícone dedicado na própria Topbar.
  if (config.console) {
    behaviors.console = {
      icon: <IconMessageSquare />,
      active: showConsole,
      onSelect: () => setConsoleVisibilityOverride(!showConsole),
    }
  }
  if (projectMode === 'code' && config.terminal) {
    behaviors.terminal = {
      icon: <IconTerminal />,
      active: showTerminal,
      onSelect: () => setShowTerminal(!showTerminal),
    }
  }

  // "Levar para o Estúdio" (.szproject.json) — SEM gate: vale no editor da aula E
  // no Estúdio Completo (a criança leva o projeto para importar no Completo).
  behaviors.exportStudio = { icon: <IconFileOutput />, onSelect: handleExportStudio }
  if (config.download) {
    behaviors.download = {
      label: downloading ? t('topbar.downloading') : undefined,
      icon: <IconLaptop />,
      onSelect: () => {
        if (!downloading) void handleDownload()
      },
    }
  }
  if (config.export) behaviors.export = { icon: <IconGlobe />, onSelect: () => setShowExport(true) }
  if (config.professional && projectKind !== 'pro') {
    behaviors.convert = { icon: <IconGraduation />, onSelect: () => setShowConvert(true) }
  }

  if (canToggleTheme) {
    behaviors.theme = {
      icon: theme === 'dark' ? <IconSun /> : <IconMoon />,
      onSelect: () => void setTheme(theme === 'dark' ? 'light' : 'dark'),
    }
  }
  if (onExit) behaviors.projects = { icon: <IconGrid />, onSelect: () => void exitToProjects() }

  const sections: MenuSection[] = STUDIO_MENU_LAYOUT.map((group) => ({
    id: group.id,
    label: t(group.labelKey),
    items: group.items.flatMap((entry): MenuItem[] => {
      const behavior = behaviors[entry.id]
      if (!behavior) return []
      return [
        {
          id: entry.id,
          label: behavior.label ?? t(entry.labelKey),
          hint: 'hintKey' in entry ? t(entry.hintKey) : undefined,
          icon: behavior.icon,
          active: behavior.active,
          disabled: behavior.disabled,
          onSelect: behavior.onSelect,
        },
      ]
    }),
  })).filter((section) => section.items.length > 0)

  const saveTone: SaveTone = saveError ? 'danger' : isDirty ? 'warn' : 'ok'
  const saveStatusLabel = saveError
    ? 'Erro ao salvar'
    : isDirty
      ? t('project.unsaved')
      : t('project.saved')
  // A marca escrita só quando sobra espaço para o NOME do projeto (ver `STUDIO_BRAND_MIN_PX`);
  // abaixo disso fica o círculo da seta, com a marca no nome acessível.
  const showBrand = width >= STUDIO_BRAND_MIN_PX
  // A barra de 52px (estreito e compacto). As pílulas da direita e o segmentado também ficam só
  // no ícone no largo apertado (`STUDIO_BAR_LABELS_MIN_PX`), sem mudar a altura da barra.
  const tight = isNarrow || isCompact
  // O jeito compacto da BARRA começa antes do compacto do Studio (ver `STUDIO_BAR_COMPACT_MAX_PX`).
  const compactBar = isCompact || width < STUDIO_BAR_COMPACT_MAX_PX
  const iconOnly = tight || width < STUDIO_BAR_LABELS_MIN_PX

  return (
    <>
      <header className={cn('sz-bar', tight && 'sz-bar--tight', compactBar && 'sz-bar--compact')}>
        <div className="sz-bar__start">
          {/* Esconder/mostrar o menu da comunidade (host): PRIMEIRO da barra, no canto mais
              perto do painel que ele controla, na receita compartilhada das ferramentas. */}
          {hostChrome?.menu ? <HostMenuButton menu={hostChrome.menu} /> : null}
          <BackBrand
            onExit={onExit ? () => void exitToProjects() : undefined}
            showName={showBrand}
          />
          {showBrand ? <span aria-hidden="true" className="sz-bar-divider" /> : null}
          <ProjectNameField name={projectName} onRename={rename} showPencil={!compactBar} />
          <SavePill tone={saveTone} label={saveStatusLabel} error={saveError} dot={compactBar} />
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
          {undoRedo && !undoInMenu ? <UndoRedo state={undoRedo} /> : null}
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
      <Modal
        open={Boolean(downloadNotice)}
        title={downloadNotice?.error ? t('topbar.downloadFailed') : t('topbar.downloadWarnings')}
        onClose={() => setDownloadNotice(null)}
        footer={
          <button
            type="button"
            className="min-h-10 rounded border border-sz-border px-3"
            onClick={() => setDownloadNotice(null)}
          >
            {t('topbar.closeDownloadNotice')}
          </button>
        }
      >
        <ul className="list-disc space-y-2 pl-4" role={downloadNotice?.error ? 'alert' : 'status'}>
          {downloadNotice?.messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </Modal>
      <ShareDialog open={showShare} onClose={() => setShowShare(false)} adapter={share} />
      {showExport && (
        <Suspense
          fallback={
            <Modal open title={t('export.title')} onClose={() => setShowExport(false)}>
              <LoadingScreen message={t('app.loading')} />
            </Modal>
          }
        >
          <ExportDialog open onClose={() => setShowExport(false)} />
        </Suspense>
      )}
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
        {conversionError ? (
          <p role="alert" className="mt-3 text-sz-error">
            {conversionError}
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  )
}
