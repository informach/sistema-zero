import type { RefObject } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface SelectableAsset {
  id: string
}

export interface GallerySelectionSnapshot {
  readonly ids: ReadonlySet<string>
}

/** Estado e ciclo de vida do modo que monta um pack a partir da galeria. */
export function useGallerySelection(
  assets: readonly SelectableAsset[],
  searchInputRef: RefObject<HTMLInputElement | null>,
) {
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())
  const selectedIdsRef = useRef(selectedIds)
  selectedIdsRef.current = selectedIds

  const enterSelection = useCallback(() => setSelectionMode(true), [])
  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])
  const exitSelection = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }, [])
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Remove ids que saíram da nuvem. A poda muda a identidade do Set, então um
  // download em voo não fecha uma sessão que mudou por fora.
  useEffect(() => {
    setSelectedIds((current) => {
      if (current.size === 0) return current
      const alive = new Set(assets.map((asset) => asset.id))
      const next = new Set([...current].filter((id) => alive.has(id)))
      return next.size === current.size ? current : next
    })
  }, [assets])

  const selectedCount = useMemo(
    () => assets.reduce((count, asset) => count + Number(selectedIds.has(asset.id)), 0),
    [assets, selectedIds],
  )

  useEffect(() => {
    if (!selectionMode) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      // Busca com texto e diálogo aberto consomem seu próprio Escape.
      if (event.target === searchInputRef.current && searchInputRef.current?.value) return
      if (document.querySelector('[data-pinta-dialog]')) return
      event.preventDefault()
      exitSelection()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectionMode, searchInputRef, exitSelection])

  const captureSelection = useCallback(
    (): GallerySelectionSnapshot => ({ ids: selectedIdsRef.current }),
    [],
  )
  const exitSelectionIfUnchanged = useCallback(
    (snapshot: GallerySelectionSnapshot): boolean => {
      if (selectedIdsRef.current !== snapshot.ids) return false
      exitSelection()
      return true
    },
    [exitSelection],
  )

  return {
    selectionMode,
    selectedIds,
    selectedCount,
    enterSelection,
    exitSelection,
    clearSelection,
    toggleSelection,
    captureSelection,
    exitSelectionIfUnchanged,
  }
}
