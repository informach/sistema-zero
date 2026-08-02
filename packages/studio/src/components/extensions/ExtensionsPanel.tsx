import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { buildWorkspaceStateFromIR } from '#blockly'
import { type InstalledExtension, isCategoryAllowed, type LearningProfile, t } from '#core'
import {
  type ExtensionDefinition,
  type ExtensionExample,
  extensionMinLevel,
  loadExtensionExamples,
} from '#extensions'
import { generateProjectFiles } from '#generators'
import { OFFICIAL_CATALOG } from '#official-extensions'
import { Badge, Button, Modal } from '#ui'
import { CORE_EXAMPLES, type CoreExample } from '../../examples/core'
import {
  countExtensionBlocksInProject,
  installExtension,
  registerExtension,
  removeExtensionArtifacts,
} from '../../state/extensionsAdapter'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useSettingsStore } from '../../state/settingsStore'
import { useStudioConfig } from '../../studio/config'
import { useStudioExamplesVisible } from '../../studio/examples-visibility'
import { renderLessonMarkdown } from '../layout/lessonMarkdown'

export interface ExtensionsPanelProps {
  open: boolean
  onClose: () => void
}

const EMPTY_INSTALLED_EXTENSIONS: InstalledExtension[] = []

export function ExtensionsPanel({ open, onClose }: ExtensionsPanelProps): JSX.Element {
  const { hasProject, installedExtensions } = useProjectStore(
    useShallow((s) => ({
      hasProject: Boolean(s.project),
      installedExtensions: s.project?.installedExtensions ?? EMPTY_INSTALLED_EXTENSIONS,
    })),
  )
  const applyProjectState = useProjectStore((s) => s.applyProjectState)
  const projectStoreApi = useProjectStoreApi()
  // Exemplos prontos são material de teste do admin (podem estar desatualizados):
  // só aparecem quando o host libera (playground). Ver examples-visibility.ts.
  const showExamples = useStudioExamplesVisible()
  const [pendingRemoval, setPendingRemoval] = useState<{ id: string; count: number } | null>(null)
  // "📖 Saiba mais": a docs rica do manifest (nunca era exibida) abre num
  // expander por card — UM aberto por vez mantém o modal curto.
  const [docsOpenId, setDocsOpenId] = useState<string | null>(null)
  const [examplesByExtension, setExamplesByExtension] = useState<
    Record<string, readonly ExtensionExample[]>
  >({})
  const [examplesStatus, setExamplesStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  )
  const [examplesAttempt, setExamplesAttempt] = useState(0)

  // Nível de aprendizado (mesma fonte da paleta no BlocklyPanel): não adianta
  // OFERECER p/ instalar uma extensão cujos blocos o nível atual nem mostra —
  // a criança instalaria o Jogo 3D no iniciante, a categoria viria VAZIA e
  // pareceria um bug. Some da lista de instalar; se por algum motivo já estiver
  // instalada (aula/legado), continua visível p/ poder REMOVER.
  const learning = useStudioConfig().learning
  const revealAdvanced = useSettingsStore((s) => s.revealAdvanced)
  const profile = useMemo<LearningProfile>(
    () => ({
      level: learning.level,
      revealed: learning.allowLevelReveal && revealAdvanced,
      allowBlocks: learning.allowBlocks,
      allowCategories: learning.allowCategories,
    }),
    [learning, revealAdvanced],
  )

  useEffect(() => {
    // A tentativa é um nonce explícito: cada incremento refaz apenas este carregamento.
    void examplesAttempt
    if (!open || !showExamples) return
    let active = true
    setExamplesStatus('loading')

    void Promise.all(
      OFFICIAL_CATALOG.map(
        async (extension) =>
          [extension.manifest.id, await loadExtensionExamples(extension)] as const,
      ),
    ).then(
      (entries) => {
        if (!active) return
        setExamplesByExtension(Object.fromEntries(entries))
        setExamplesStatus('ready')
      },
      () => {
        if (active) setExamplesStatus('error')
      },
    )

    return () => {
      active = false
    }
  }, [examplesAttempt, open, showExamples])

  if (!hasProject)
    return (
      <Modal open={open} onClose={onClose} title="Extensões">
        {' '}
        —{' '}
      </Modal>
    )
  const installedIds = new Set(installedExtensions.map((e) => e.id))

  const handleInstall = (ext: ExtensionDefinition) => installExtension(ext, projectStoreApi)

  const handleRemoveClick = (extId: string) => {
    const project = projectStoreApi.getState().project
    if (!project) return
    const count = countExtensionBlocksInProject(project, extId)
    if (count > 0) setPendingRemoval({ id: extId, count })
    else removeAndClean(extId)
  }

  const confirmRemove = () => {
    if (!pendingRemoval) return
    removeAndClean(pendingRemoval.id)
    setPendingRemoval(null)
  }

  const removeAndClean = (extId: string) => {
    const project = projectStoreApi.getState().project
    if (!project) return
    const cleaned = removeExtensionArtifacts(project, extId)
    // NÃO desregistra os blocos do Blockly: o registro é global de módulo
    // compartilhado entre instâncias (invariante #5; ver removeExtension). A
    // categoria some porque a toolbox é reconstruída a partir do
    // installedExtensions abaixo, sem tocar no Blockly.Blocks.
    applyProjectState({
      ir: cleaned.ir,
      blocksState: cleaned.blocksState,
      installedExtensions: project.installedExtensions.filter(
        (extension) => extension.id !== extId,
      ),
      ...(cleaned.ir
        ? {
            files: generateProjectFiles({
              ir: cleaned.ir,
              projectName: project.name,
              jsHeader: '// Gerado pelo Sistema Zero Studio',
            }),
          }
        : {}),
    })
  }

  const handleLoadExample = (ext: ExtensionDefinition, exampleIndex: number) => {
    const project = projectStoreApi.getState().project
    if (!project) return
    const example = examplesByExtension[ext.manifest.id]?.[exampleIndex]
    if (!example) return
    const isInstalled = project.installedExtensions.some(
      (extension) => extension.id === ext.manifest.id,
    )
    if (!isInstalled) registerExtension(ext)
    applyProjectState({
      ir: example.ir,
      blocksState: buildWorkspaceStateFromIR(example.ir),
      installedExtensions: isInstalled
        ? project.installedExtensions
        : [
            ...project.installedExtensions,
            { id: ext.manifest.id, version: ext.manifest.version, installedAt: Date.now() },
          ],
      files: generateProjectFiles({
        ir: example.ir,
        projectName: project.name,
      }),
    })
    // Assets embutidos do exemplo (ex.: sprite do inimigo) — o patch acima não carrega
    // `assets`, então entram pelo addAsset (igual ao caminho dos exemplos clássicos).
    for (const asset of example.assets ?? []) {
      projectStoreApi.getState().addAsset({
        name: asset.name,
        dataUrl: asset.dataUrl,
        width: asset.width,
        height: asset.height,
        source: asset.source,
        libId: asset.libId,
      })
    }
  }

  // Exemplo CLÁSSICO (sem extensão): aplica a IR direto, sem registrar extensão.
  const handleLoadCoreExample = (example: CoreExample) => {
    const project = projectStoreApi.getState().project
    if (!project) return
    applyProjectState({
      ir: example.ir,
      blocksState: buildWorkspaceStateFromIR(example.ir),
      installedExtensions: project.installedExtensions,
      files: generateProjectFiles({ ir: example.ir, projectName: project.name }),
    })
    // Assets embutidos do exemplo (ex.: fundo por CSS): o patch acima não carrega
    // `assets`, então entram pelo addAsset. Nome já existente no projeto = já tem
    // uma imagem com esse nome referenciável pelo CSS — o erro é ignorado.
    for (const asset of example.assets ?? []) {
      projectStoreApi.getState().addAsset({
        name: asset.name,
        dataUrl: asset.dataUrl,
        width: asset.width,
        height: asset.height,
        source: asset.source,
        libId: asset.libId,
      })
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={t('panel.extensions')}
        className="w-[640px] max-w-[90vw]"
        footer={
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        }
      >
        <p className="mb-3 text-xs italic text-sz-fg-mute">{t('extensions.officialOnly')}</p>
        {showExamples && examplesStatus === 'loading' && (
          <p role="status" aria-live="polite" className="mb-3 text-xs text-sz-fg-soft">
            {t('extensions.examplesLoading')}
          </p>
        )}
        {showExamples && examplesStatus === 'error' && (
          <div
            role="alert"
            className="mb-3 flex items-center justify-between gap-3 text-xs text-sz-error"
          >
            <span>{t('extensions.examplesError')}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExamplesAttempt((attempt) => attempt + 1)}
            >
              {t('extensions.examplesRetry')}
            </Button>
          </div>
        )}
        <ul className="space-y-3">
          {OFFICIAL_CATALOG.filter(
            (ext) =>
              installedIds.has(ext.manifest.id) ||
              ((learning.allowExtensions === undefined ||
                learning.allowExtensions.includes(ext.manifest.id)) &&
                isCategoryAllowed(
                  ext.blockly.toolboxCategory.name,
                  extensionMinLevel(ext),
                  profile,
                )),
          ).map((ext) => {
            const installed = installedIds.has(ext.manifest.id)
            const conflictId = ext.conflictsWith?.find((id) => installedIds.has(id))
            const conflictName = OFFICIAL_CATALOG.find((item) => item.manifest.id === conflictId)
              ?.manifest.name
            const docsOpen = docsOpenId === ext.manifest.id
            return (
              <li
                key={ext.manifest.id}
                className="rounded-md border border-sz-border bg-sz-panel-soft p-3"
              >
                {/* Linha única: identidade à esquerda, ação à direita (card enxuto). */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <strong className="truncate text-sm text-sz-fg">{ext.manifest.name}</strong>
                    <span className="shrink-0 text-xs text-sz-fg-mute">
                      v{ext.manifest.version}
                    </span>
                    {installed && <Badge tone="success">{t('extensions.installed')}</Badge>}
                  </div>
                  <div className="shrink-0">
                    {installed ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveClick(ext.manifest.id)}
                      >
                        {t('extensions.remove')}
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={Boolean(conflictId)}
                        title={
                          conflictName
                            ? `Remova ${conflictName} antes de instalar ${ext.manifest.name}.`
                            : undefined
                        }
                        onClick={() => handleInstall(ext)}
                      >
                        {t('extensions.install')}
                      </Button>
                    )}
                  </div>
                </div>
                {!installed && conflictName && (
                  <p className="mt-2 text-xs text-sz-warning">
                    Para instalar {ext.manifest.name}, remova {conflictName}: as duas extensões
                    controlam a mesma tela.
                  </p>
                )}
                <p className="mt-1 line-clamp-2 text-xs text-sz-fg-soft">
                  {ext.manifest.description}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <span className="text-[10px] uppercase tracking-wide text-sz-fg-mute">
                    {t('extensions.permissions')}:
                  </span>
                  {ext.manifest.permissions.map((p) => (
                    <Badge key={p} tone="accent">
                      {p}
                    </Badge>
                  ))}
                  {ext.manifest.docs.trim().length > 0 && (
                    <button
                      type="button"
                      aria-expanded={docsOpen}
                      className="ml-auto shrink-0 text-xs font-medium text-sz-accent hover:underline"
                      onClick={() => setDocsOpenId(docsOpen ? null : ext.manifest.id)}
                    >
                      {docsOpen ? t('extensions.docsHide') : t('extensions.docsShow')}
                    </button>
                  )}
                </div>
                {docsOpen && (
                  <div
                    className="mt-2 flex max-h-[40vh] flex-col gap-2 overflow-y-auto rounded border border-sz-border bg-sz-panel p-3 text-xs text-sz-fg-soft"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML saneado por renderLessonMarkdown (escape-first + subconjunto seguro)
                    dangerouslySetInnerHTML={{ __html: renderLessonMarkdown(ext.manifest.docs) }}
                  />
                )}
                {showExamples && (examplesByExtension[ext.manifest.id]?.length ?? 0) > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-sz-border pt-2">
                    <span className="text-[10px] uppercase tracking-wide text-sz-fg-mute">
                      {t('extensions.loadExample')}:
                    </span>
                    {examplesByExtension[ext.manifest.id]?.map((example, i) => (
                      <Button
                        key={example.name}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLoadExample(ext, i)}
                      >
                        {example.name}
                      </Button>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {showExamples && CORE_EXAMPLES.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase text-sz-fg-mute">
              Exemplos clássicos (sem extensão)
            </p>
            <ul className="mt-2 space-y-2">
              {CORE_EXAMPLES.map((example: CoreExample) => (
                <li
                  key={example.name}
                  className="flex items-center justify-between gap-3 rounded-md border border-sz-border bg-sz-panel-soft p-3"
                >
                  <div className="min-w-0 flex-1">
                    <strong className="text-sm text-sz-fg">{example.name}</strong>
                    <p className="mt-1 text-xs text-sz-fg-soft">{example.description}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleLoadCoreExample(example)}>
                    Abrir
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>

      <Modal
        open={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        title={t('extensions.confirmRemove')}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPendingRemoval(null)}>
              {t('extensions.cancel')}
            </Button>
            <Button variant="danger" size="sm" onClick={confirmRemove}>
              {t('extensions.remove')}
            </Button>
          </>
        }
      >
        {pendingRemoval && t('extensions.removeWarning', { count: pendingRemoval.count })}
      </Modal>
    </>
  )
}
