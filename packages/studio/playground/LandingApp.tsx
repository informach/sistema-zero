import { ProjectList } from '@sistemazero/studio/project-list'
import type { JSX } from 'react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { DemoHostChrome, HOST_DEMO } from './hostChromeDemo'
import { PLAYGROUND_DEMO_MISSION, PLAYGROUND_LESSON } from './initialQuery'

const EditorPlayground = lazy(async () => {
  const module = await import('./App')
  return { default: module.App }
})

const LessonPlayground = lazy(async () => {
  const module = await import('./lessonHarness')
  return { default: module.LessonHarness }
})

function needsEditor(): boolean {
  return window.location.pathname === '/dual' || window.location.pathname.startsWith('/editor/')
}

/**
 * Entrada leve do playground. O host completo e o editor só entram no grafo
 * quando a URL pede uma tela de edição; a lista inicial não pré-carrega Blockly,
 * Monaco, runtimes ou catálogos de exemplos.
 */
export function LandingApp(): JSX.Element {
  const [editorRequested, setEditorRequested] = useState(needsEditor)

  useEffect(() => {
    const onPopState = () => setEditorRequested(needsEditor())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  if (PLAYGROUND_LESSON) {
    return (
      <Suspense fallback={null}>
        <LessonPlayground />
      </Suspense>
    )
  }

  if (editorRequested) {
    return (
      <Suspense
        fallback={
          <div
            role="status"
            className="flex h-full items-center justify-center bg-sz-bg text-sm text-sz-fg-soft"
          >
            Carregando editor…
          </div>
        }
      >
        <EditorPlayground demoMission={PLAYGROUND_DEMO_MISSION} />
      </Suspense>
    )
  }

  const list = (
    <ProjectList
      professional
      showExamples
      onOpenProject={(projectId) => {
        window.history.pushState(null, '', `/editor/${encodeURIComponent(projectId)}`)
        setEditorRequested(true)
      }}
    />
  )
  // `?host=1` liga o chrome de HOST de mentira na lista (ver hostChromeDemo.tsx).
  return HOST_DEMO ? <DemoHostChrome>{list}</DemoHostChrome> : list
}
