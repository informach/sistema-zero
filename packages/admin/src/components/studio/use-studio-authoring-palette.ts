'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PreparedStudioAuthoringOptions } from '../../lib/studio-authoring-options'
import {
  loadStudioAuthoringPalette,
  type StudioAuthoringPalette,
  type StudioPaletteProject,
} from '../../lib/studio-authoring-palette'

export function useStudioAuthoringPalette(
  enabled: boolean,
  project: StudioPaletteProject | null,
  prepared: PreparedStudioAuthoringOptions | null,
) {
  // Source edits do not reload metadata or import the catalogs again.
  const key = JSON.stringify(
    project && {
      programmingLanguage: project.programmingLanguage,
      runtime: project.runtime,
      installedExtensions: project.installedExtensions,
    },
  )
  const snapshot = useMemo(() => JSON.parse(key) as StudioPaletteProject | null, [key])
  const [loaded, setLoaded] = useState<{
    snapshot: typeof snapshot
    prepared: typeof prepared
    palette?: StudioAuthoringPalette
    error?: string
  } | null>(null)
  useEffect(() => {
    if (!enabled) return
    let active = true
    void loadStudioAuthoringPalette(snapshot, prepared).then(
      (palette) => {
        if (active) setLoaded({ snapshot, prepared, palette })
      },
      (error) => {
        if (active)
          setLoaded({
            snapshot,
            prepared,
            error: error instanceof Error ? error.message : 'Não foi possível carregar os blocos.',
          })
      },
    )
    return () => {
      active = false
    }
  }, [enabled, snapshot, prepared])
  const current = loaded?.snapshot === snapshot && loaded?.prepared === prepared ? loaded : null
  return { palette: current?.palette ?? null, error: current?.error ?? null }
}
