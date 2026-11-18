/**
 * Os atalhos de teclado do editor de mapa: zoom, a letra de cada ferramenta e o Delete.
 *
 * A letra só liga uma ferramenta que está NA CAIXA de agora: do tipo da camada ativa, do
 * nível escolhido e permitida pela aula. Atalho não é porta dos fundos para o que foi escondido.
 */
import { type RefObject, useEffect } from 'react'
import { isTextEntryTarget } from '../../../core/dom'
import { shortcut } from '../../../core/shortcuts'
import type { PintaSessionStore } from '../../../state/sessionStore'
import { MAP_TOOLS, type MapTool, type MapToolMode, mapToolsFor } from '../TilemapPanels'
import { isPintaModalOpen, useActionShortcuts } from '../useActionShortcuts'
import { toolShortcutMap, useToolShortcuts } from '../useToolShortcuts'
import { isMapToolAvailable, type MapLevel } from './mapLevels'

const TOOL_SHORTCUTS = toolShortcutMap(MAP_TOOLS)

/** O zoom com que o mapa abre (`sessionDefaultsFor`); o "Ctrl+0" volta para ele. */
export const DEFAULT_TILEMAP_ZOOM = 2

/** A ferramenta que a letra liga agora, ou `null` quando ela não está na caixa. */
export function shortcutTool(
  id: MapTool,
  mode: MapToolMode,
  level: MapLevel,
  allowTools: readonly string[] | undefined,
): MapTool | null {
  if (!mapToolsFor(mode).some((entry) => entry.id === id)) return null
  return isMapToolAvailable(level, allowTools, id) ? id : null
}

export function useMapKeyboard(options: {
  session: PintaSessionStore
  mode: MapToolMode
  level: MapLevel
  allowTools: readonly string[] | undefined
  /** Há um pedaço de peças selecionado? */
  hasSelection: () => boolean
  deleteSelectionRef: RefObject<() => void>
  /** Apaga os objetos escolhidos; devolve se a tecla foi usada. */
  deleteObjectRef: RefObject<() => boolean>
}): void {
  const { session, mode, level, allowTools, hasSelection, deleteSelectionRef, deleteObjectRef } =
    options
  // Zoom pelo teclado (Ctrl+= / Ctrl+- / Ctrl+0), como nos outros dois editores.
  useActionShortcuts([
    { combo: shortcut('zoomIn'), run: () => session.getState().zoomIn(), repeat: true },
    { combo: shortcut('zoomOut'), run: () => session.getState().zoomOut(), repeat: true },
    { combo: shortcut('zoomReset'), run: () => session.getState().setZoom(DEFAULT_TILEMAP_ZOOM) },
  ])
  useToolShortcuts(TOOL_SHORTCUTS, (id) => {
    const tool = shortcutTool(id, mode, level, allowTools)
    if (tool) session.getState().setTool(tool)
  })
  // Delete apaga o pedaço selecionado ou, sem pedaço, os objetos escolhidos.
  // biome-ignore lint/correctness/useExhaustiveDependencies: as ações chegam por ref, o listener é um só
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (event.ctrlKey || event.metaKey || event.defaultPrevented) return
      if (isTextEntryTarget(event.target)) return
      // Com uma janela do Pinta aberta, o desenho atrás dela fica quieto.
      if (isPintaModalOpen()) return
      if (!hasSelection()) {
        if (deleteObjectRef.current()) event.preventDefault()
        return
      }
      event.preventDefault()
      deleteSelectionRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
