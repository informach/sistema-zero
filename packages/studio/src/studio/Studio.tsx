import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { setLocale } from '#core'
import { Shell } from '../components/layout/Shell'
import { bootstrapPersistence } from '../state/persistence'
import { sanitizeProjectForHost, useProjectStore } from '../state/projectStore'
import { useSettingsStore } from '../state/settingsStore'
import { useUIStore } from '../state/uiStore'
import { StudioThemeProvider } from './theme'
import type { StudioProps } from './types'

/**
 * Editor embarcável do Sistema Zero Studio (modos Blocos/Ponte/Código).
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
export function Studio({
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
    const cleanup = bootstrapPersistence()
    void loadSettings()
    return cleanup
  }, [loadSettings])

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
            <p className="text-sm">Projeto inválido — confira o initialProject passado ao Studio.</p>
          </div>
        ) : hasProject ? (
          <Shell onExit={onExit} />
        ) : null}
      </div>
    </StudioThemeProvider>
  )
}
