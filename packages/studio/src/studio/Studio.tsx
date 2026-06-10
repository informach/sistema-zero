import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { setLocale } from '#core'
import { Shell } from '../components/layout/Shell'
import { bootstrapPersistence } from '../state/persistence'
import { sanitizeProjectForHost, useProjectStore, useProjectStoreApi } from '../state/projectStore'
import { useSettingsStore } from '../state/settingsStore'
import { StudioStoresContext } from '../state/storesContext'
import { createStudioStores } from '../state/studioStores'
import { useUIStore } from '../state/uiStore'
import { StudioThemeProvider } from './theme'
import type { StudioProps } from './types'

/**
 * Editor embarcável do Sistema Zero Studio (modos Blocos/Ponte/Código).
 *
 * Cada instância cria o próprio conjunto de stores (projeto/ui/console/
 * highlight/sourcemap) via StudioStoresContext — duas instâncias na mesma
 * página não compartilham estado, e cada montagem nasce limpa. As
 * configurações (tema/fonte/chave de IA) são preferência do usuário e
 * continuam compartilhadas.
 *
 * O componente é dono do lifecycle que no app standalone vivia em App.tsx +
 * EditorPage: hidrata o `initialProject` nos stores, liga a persistência
 * (autosave em IndexedDB) e o aviso de beforeunload, e escopa o tema via
 * data-sz-theme no root — sem tocar no <html> do host.
 *
 * Renderizar SOMENTE no client (Monaco/Blockly/IndexedDB não existem no
 * server): `next/dynamic(..., { ssr: false })` no Next, `client:only="react"`
 * no Astro.
 */
export function Studio(props: StudioProps): JSX.Element {
  // 1x por instância; StrictMode-safe (re-render descarta a duplicata).
  const [stores] = useState(() => createStudioStores())
  return (
    <StudioStoresContext.Provider value={stores}>
      <StudioBody {...props} />
    </StudioStoresContext.Provider>
  )
}

/** Corpo do Studio — DENTRO do provider, para os hooks lerem as stores da instância. */
function StudioBody({
  initialProject,
  theme,
  locale,
  onExit,
  blockUnloadWhenDirty = true,
  className,
  style,
}: StudioProps): JSX.Element {
  // Locale é estático por instância e precisa valer ANTES do primeiro render
  // dos filhos (há `t()` avaliado em escopo de módulo nos chunks lazy).
  useState(() => {
    if (locale) setLocale(locale)
  })

  const sanitized = useMemo(() => sanitizeProjectForHost(initialProject), [initialProject])

  const projectStoreApi = useProjectStoreApi()
  const hydrateProject = useProjectStore((s) => s.hydrateProject)
  const unloadProject = useProjectStore((s) => s.unloadProject)
  const isDirty = useProjectStore((s) => s.isDirty)
  const hasProject = useProjectStore((s) => Boolean(s.project))
  const setPreviewRunning = useUIStore((s) => s.setPreviewRunning)
  const loadSettings = useSettingsStore((s) => s.load)
  const settingsTheme = useSettingsStore((s) => s.theme)
  const effectiveTheme = theme ?? settingsTheme

  useEffect(() => {
    if (!sanitized) return
    hydrateProject(sanitized)
    setPreviewRunning(true)
    return () => unloadProject()
  }, [sanitized, hydrateProject, unloadProject, setPreviewRunning])

  useEffect(() => {
    const cleanup = bootstrapPersistence(projectStoreApi)
    void loadSettings()
    return cleanup
  }, [projectStoreApi, loadSettings])

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
