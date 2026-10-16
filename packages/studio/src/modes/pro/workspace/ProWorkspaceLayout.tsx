import { type ReactNode, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  type ImperativePanelGroupHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels'
import { useUIStore } from '../../../state/uiStore'
import { useStudioLayout } from '../../../studio/layoutContext'
import { useStudioTutor } from '../../../studio/tutor'
import type { ProWorkspacePreferences } from './model'

const action =
  'min-h-10 rounded-md px-3 text-sm hover:bg-sz-panel aria-pressed:bg-sz-accent/15 aria-pressed:text-sz-accent focus-visible:outline focus-visible:outline-sz-accent disabled:opacity-40'

/** The same component tree survives every arrangement; only panel sizes/visibility change. */
export function ProWorkspaceLayout({
  navigator,
  editor,
  preview,
  tutor,
  bottom,
  preferences,
  change,
  gameRequest,
  searchRequest,
  codeRequest = 0,
}: {
  navigator: (showCode: () => void) => ReactNode
  editor: ReactNode
  preview: ReactNode
  tutor: ReactNode
  bottom: ReactNode
  preferences: ProWorkspacePreferences
  change: (update: (previous: ProWorkspacePreferences) => ProWorkspacePreferences) => void
  gameRequest: number
  searchRequest: number
  codeRequest?: number
}) {
  const { isNarrow } = useStudioLayout()
  const { open: tutorOpen, setOpen: setTutorOpen } = useStudioTutor()
  const showPreview = useUIStore((state) => state.showPreview)
  const setShowPreview = useUIStore((state) => state.setShowPreview)
  const [narrowView, setNarrowView] = useState<'files' | 'code' | 'game'>('code')
  const group = useRef<ImperativePanelGroupHandle>(null)
  const [panelsReady, setPanelsReady] = useState(false)
  const interacted = useRef(false)
  const id = useId()
  const hasPreview = Boolean(preview)
  const sizes = useMemo(() => {
    if (isNarrow)
      return narrowView === 'files'
        ? [100, 0, 0]
        : narrowView === 'game' && hasPreview
          ? [0, 0, 100]
          : [0, 100, 0]
    if (tutorOpen) return preferences.layout === 'split' ? preferences.sizes : [0, 60, 40]
    if (preferences.layout === 'game' && hasPreview) return [0, 0, 100]
    if (preferences.layout === 'code') return [0, 100, 0]
    return hasPreview && showPreview ? preferences.sizes : [24, 76, 0]
  }, [
    isNarrow,
    narrowView,
    hasPreview,
    preferences.layout,
    preferences.sizes,
    showPreview,
    tutorOpen,
  ])
  useLayoutEffect(() => {
    if (panelsReady) group.current?.setLayout(sizes)
  }, [sizes, panelsReady])
  useEffect(() => {
    if (!gameRequest) return
    setNarrowView('game')
    setShowPreview(true)
    setTutorOpen(false)
    change((previous) => ({ ...previous, layout: 'split' }))
  }, [gameRequest, setShowPreview, setTutorOpen, change])
  useEffect(() => {
    if (!searchRequest) return
    setNarrowView('files')
    change((previous) => ({ ...previous, layout: 'split' }))
  }, [searchRequest, change])
  useEffect(() => {
    if (codeRequest) setNarrowView('code')
  }, [codeRequest])
  const arrange = (layout: ProWorkspacePreferences['layout']) => {
    if (layout !== 'code') setShowPreview(true)
    if (layout === 'game') setTutorOpen(false)
    change((previous) => ({ ...previous, layout }))
  }
  const resize = (next: number[]) => {
    if (next.length === 3) setPanelsReady(true)
    if (
      !interacted.current ||
      isNarrow ||
      preferences.layout !== 'split' ||
      next.some((size) => size < 14)
    )
      return
    change((previous) =>
      next.every((size, index) => Math.abs(size - (previous.sizes[index] ?? 0)) < 0.1)
        ? previous
        : { ...previous, sizes: next },
    )
  }
  const resizer = (visible: boolean, label: string) => (
    <PanelResizeHandle
      aria-label={label}
      disabled={!visible || isNarrow}
      tabIndex={visible && !isNarrow ? 0 : -1}
      className={visible && !isNarrow ? 'sz-resize-handle sz-resize-handle--vertical' : 'hidden'}
      onDragging={(dragging) => {
        if (dragging) interacted.current = true
      }}
      onKeyDown={() => {
        interacted.current = true
      }}
    />
  )
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <nav
        aria-label="Organizar o editor"
        className="flex shrink-0 flex-wrap gap-1 border-b border-sz-border-soft px-2 py-1"
      >
        {isNarrow ? (
          <>
            <button
              type="button"
              className={action}
              aria-pressed={narrowView === 'files'}
              onClick={() => setNarrowView('files')}
            >
              Arquivos
            </button>
            <button
              type="button"
              className={action}
              aria-pressed={narrowView === 'code'}
              onClick={() => setNarrowView('code')}
            >
              Código
            </button>
            {preview && (
              <button
                type="button"
                className={action}
                aria-pressed={narrowView === 'game'}
                onClick={() => {
                  setNarrowView('game')
                  setTutorOpen(false)
                }}
              >
                Jogo
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              className={action}
              aria-pressed={preferences.layout === 'split'}
              onClick={() => arrange('split')}
            >
              Código e jogo
            </button>
            <button
              type="button"
              className={action}
              aria-pressed={preferences.layout === 'code'}
              onClick={() => arrange('code')}
            >
              Ampliar código
            </button>
            {preview && (
              <button
                type="button"
                className={action}
                aria-pressed={preferences.layout === 'game'}
                onClick={() => arrange('game')}
              >
                Ampliar jogo
              </button>
            )}
          </>
        )}
        {tutorOpen && (
          <button
            type="button"
            className={`${action} ml-auto`}
            aria-pressed={tutorOpen}
            onClick={() => setTutorOpen(!tutorOpen)}
          >
            Voltar ao jogo
          </button>
        )}
      </nav>
      <div className="min-h-0 flex-1">
        <PanelGroup
          ref={group}
          direction="horizontal"
          onLayout={resize}
          style={{ overflow: 'visible' }}
        >
          <Panel
            id={`${id}-files`}
            order={1}
            defaultSize={22}
            minSize={14}
            collapsible
            collapsedSize={0}
          >
            <div hidden={sizes[0] === 0} className="h-full">
              {navigator(() => setNarrowView('code'))}
            </div>
          </Panel>
          {resizer((sizes[0] ?? 0) > 0 && (sizes[1] ?? 0) > 0, 'Largura dos arquivos')}
          <Panel
            id={`${id}-code`}
            order={2}
            defaultSize={43}
            minSize={25}
            collapsible
            collapsedSize={0}
          >
            <div hidden={sizes[1] === 0} className="h-full">
              {editor}
            </div>
          </Panel>
          {resizer((sizes[1] ?? 0) > 0 && (sizes[2] ?? 0) > 0, 'Largura do jogo e Zappy')}
          <Panel
            id={`${id}-game`}
            order={3}
            defaultSize={35}
            minSize={20}
            collapsible
            collapsedSize={0}
            style={{ overflow: isNarrow && tutorOpen ? 'visible' : 'hidden' }}
          >
            <div hidden={sizes[2] === 0 || (!isNarrow && tutorOpen)} className="h-full">
              {preview}
            </div>
            <div className={isNarrow ? 'contents' : 'relative h-full'}>{tutor}</div>
          </Panel>
        </PanelGroup>
      </div>
      {bottom}
    </div>
  )
}
