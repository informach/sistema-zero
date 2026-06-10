import type { JSX } from 'react'
import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { type Project, setLocale } from '#core'
import { Shell } from '../components/layout/Shell'
import { sanitizeProjectForHost, useProjectStore, useProjectStoreApi } from '../state/projectStore'
import { useSettingsStore } from '../state/settingsStore'
import { StudioStoresContext } from '../state/storesContext'
import { createStudioStores, useStudioPersistence } from '../state/studioStores'
import { useUIStore } from '../state/uiStore'
import { StudioThemeProvider } from './theme'
import type { StudioHandle, StudioProps } from './types'

/**
 * Editor embarcável do Sistema Zero Studio (modos Blocos/Ponte/Código).
 *
 * Cada instância cria o próprio conjunto de stores (projeto/ui/console/
 * highlight/sourcemap) + serviço de persistência via StudioStoresContext —
 * duas instâncias na mesma página não compartilham estado, e cada montagem
 * nasce limpa. As configurações (tema/fonte/chave de IA) são preferência do
 * usuário e continuam compartilhadas.
 *
 * Dados: uncontrolled — `initialProject` hidrata, `onChange` entrega snapshots
 * no debounce do autosave, `persistence` decide onde salvar ('local' |
 * 'none' | adapter). Acesso imperativo via `ref` (StudioHandle).
 *
 * Renderizar SOMENTE no client (Monaco/Blockly/IndexedDB não existem no
 * server): `next/dynamic(..., { ssr: false })` no Next, `client:only="react"`
 * no Astro.
 */
export function Studio(props: StudioProps): JSX.Element {
  // 1x por instância; StrictMode-safe (re-render descarta a duplicata).
  // `persistence` é estático por instância (lido só aqui).
  const [stores] = useState(() => createStudioStores({ persistence: props.persistence }))
  return (
    <StudioStoresContext.Provider value={stores}>
      <StudioBody {...props} />
    </StudioStoresContext.Provider>
  )
}

/** Corpo do Studio — DENTRO do provider, para os hooks lerem as stores da instância. */
function StudioBody({
  initialProject,
  onChange,
  onSave,
  onError,
  onModeChange,
  onReady,
  theme,
  locale,
  onExit,
  blockUnloadWhenDirty = true,
  className,
  style,
  ref,
}: StudioProps): JSX.Element {
  // Locale é estático por instância e precisa valer ANTES do primeiro render
  // dos filhos (há `t()` avaliado em escopo de módulo nos chunks lazy).
  useState(() => {
    if (locale) setLocale(locale)
  })

  // `replaceProject` (handle) troca o projeto sem mexer na prop.
  const [replacedProject, setReplacedProject] = useState<Project | null>(null)
  const sourceProject = replacedProject ?? initialProject
  const sanitized = useMemo(() => sanitizeProjectForHost(sourceProject), [sourceProject])

  const projectStoreApi = useProjectStoreApi()
  const persistence = useStudioPersistence()
  const hydrateProject = useProjectStore((s) => s.hydrateProject)
  const unloadProject = useProjectStore((s) => s.unloadProject)
  const isDirty = useProjectStore((s) => s.isDirty)
  const hasProject = useProjectStore((s) => Boolean(s.project))
  const setPreviewRunning = useUIStore((s) => s.setPreviewRunning)
  const loadSettings = useSettingsStore((s) => s.load)
  const settingsTheme = useSettingsStore((s) => s.theme)
  const effectiveTheme = theme ?? settingsTheme

  // Callbacks do host mudam por render — o serviço lê sempre a versão atual.
  useEffect(() => {
    persistence.handlers = { onChange, onSave, onError }
  }, [persistence, onChange, onSave, onError])

  useImperativeHandle(
    ref,
    (): StudioHandle => ({
      getProject: () => projectStoreApi.getState().project,
      save: () => persistence.save(),
      replaceProject: (project) => setReplacedProject(project),
      setMode: (mode) => projectStoreApi.getState().setMode(mode),
      isDirty: () => projectStoreApi.getState().isDirty,
    }),
    [projectStoreApi, persistence],
  )

  useEffect(() => {
    if (!sanitized) return
    hydrateProject(sanitized)
    setPreviewRunning(true)
    return () => unloadProject()
  }, [sanitized, hydrateProject, unloadProject, setPreviewRunning])

  useEffect(() => {
    const detach = persistence.attach()
    void loadSettings()
    return detach
  }, [persistence, loadSettings])

  // onReady: 1x, quando o projeto hidratou e o Shell pode renderizar.
  const readyFiredRef = useRef(false)
  useEffect(() => {
    if (!hasProject || readyFiredRef.current) return
    readyFiredRef.current = true
    onReady?.()
  }, [hasProject, onReady])

  // onModeChange: observa o modo do projeto na store da instância.
  const onModeChangeRef = useRef(onModeChange)
  onModeChangeRef.current = onModeChange
  useEffect(() => {
    return projectStoreApi.subscribe((state, prev) => {
      const mode = state.project?.mode
      const prevMode = prev.project?.mode
      if (mode && prevMode && mode !== prevMode && state.project?.id === prev.project?.id) {
        onModeChangeRef.current?.(mode)
      }
    })
  }, [projectStoreApi])

  useEffect(() => {
    if (!blockUnloadWhenDirty || !isDirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [blockUnloadWhenDirty, isDirty])

  return (
    <StudioThemeProvider value={effectiveTheme}>
      <div
        data-sz-theme={effectiveTheme}
        className={['h-full min-h-0', className].filter(Boolean).join(' ')}
        style={{ fontFamily: 'var(--font-family-sans)', ...style }}
      >
        {sanitized === null ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-sz-bg text-sz-fg-soft">
            <p className="text-sm">
              Projeto inválido — confira o initialProject passado ao Studio.
            </p>
          </div>
        ) : hasProject ? (
          <Shell onExit={onExit} canToggleTheme={theme === undefined} />
        ) : null}
      </div>
    </StudioThemeProvider>
  )
}
