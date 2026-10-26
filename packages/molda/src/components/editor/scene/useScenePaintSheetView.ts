import { useState } from 'react'
import type { SceneTextureView } from './SceneTextureViewport'

/** View state belongs to the workshop session, surviving closing the sheet and switching tools. */
export function useScenePaintSheetView() {
  const [view, setView] = useState<SceneTextureView | null>(null)
  const [uvView, setUvView] = useState<SceneTextureView | null>(null)
  const [width, setWidth] = useState(38)
  const [expanded, setExpanded] = useState(false)
  const [showModel, setShowModel] = useState(false)
  return {
    view,
    setView,
    uvView,
    setUvView,
    width,
    setWidth,
    expanded,
    setExpanded,
    showModel,
    setShowModel,
  }
}
