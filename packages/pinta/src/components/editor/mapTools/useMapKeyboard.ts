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

/**
 * A ferramenta que a letra liga agora, ou `null` quando ela não está na caixa. `availableTools`: a
 * caixa menor de um editor (o cenário grande, a janela focal), como na `TilemapToolbar`.
 */
export function shortcutTool(
  id: MapTool,
  mode: MapToolMode,
  level: MapLevel,
  allowTools: readonly string[] | undefined,
  availableTools?: readonly MapTool[],
): MapTool | null {
  if (!mapToolsFor(mode).some((entry) => entry.id === id)) return null
  if (availableTools && !availableTools.includes(id)) return null
  return isMapToolAvailable(level, allowTools, id) ? id : null
}

export function useMapKeyboard(options: {
  session: PintaSessionStore
  mode: MapToolMode
  level: MapLevel
  allowTools: readonly string[] | undefined
  /** A caixa menor deste editor; sem ela, todas as ferramentas do tipo da camada. */
  availableTools?: readonly MapTool[]
  /** Há um pedaço de peças selecionado? */
  hasSelection: () => boolean
  deleteSelectionRef: RefObject<() => void>
  /** Apaga os objetos escolhidos; devolve se a tecla foi usada. */
  deleteObjectRef: RefObject<() => boolean>
  /** Cancela o gesto ativo de pintura sem confirmar a prévia. */
  cancelGestureRef: RefObject<() => boolean>
}): void {
  const {
    session,
    mode,
    level,
    allowTools,
    availableTools,
    hasSelection,
    deleteSelectionRef,
    deleteObjectRef,
    cancelGestureRef,
  } = options
  // Zoom pelo teclado (Ctrl+= / Ctrl+- / Ctrl+0), como nos outros dois editores.
  useActionShortcuts([
    { combo: shortcut('zoomIn'), run: () => session.getState().zoomIn(), repeat: true },
    { combo: shortcut('zoomOut'), run: () => session.getState().zoomOut(), repeat: true },
    { combo: shortcut('zoomReset'), run: () => session.getState().setZoom(DEFAULT_TILEMAP_ZOOM) },
  ])
  useToolShortcuts(TOOL_SHORTCUTS, (id) => {
    const tool = shortcutTool(id, mode, level, allowTools, availableTools)
    if (tool) session.getState().setTool(tool)
  })
  // Delete apaga o pedaço selecionado ou, sem pedaço, os objetos escolhidos.
  // biome-ignore lint/correctness/useExhaustiveDependencies: as ações chegam por ref, o listener é um só
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Delete' && event.key !== 'Backspace' && event.key !== 'Escape') return
      if (event.ctrlKey || event.metaKey || event.defaultPrevented) return
      if (isTextEntryTarget(event.target)) return
      // Com uma janela do Pinta aberta, o desenho atrás dela fica quieto.
      if (isPintaModalOpen()) return
      if (event.key === 'Escape') {
        if (cancelGestureRef.current()) event.preventDefault()
        return
      }
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
