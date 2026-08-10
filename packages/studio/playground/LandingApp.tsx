import { ProjectList } from '@sistemazero/studio/project-list'
import type { JSX } from 'react'
import { lazy, Suspense, useEffect, useState } from 'react'

const EditorPlayground = lazy(async () => {
  const module = await import('./App')
  return { default: module.App }
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
        <EditorPlayground />
      </Suspense>
    )
  }

  return (
    <ProjectList
      professional
      showExamples
      onOpenProject={(projectId) => {
        window.history.pushState(null, '', `/editor/${encodeURIComponent(projectId)}`)
        setEditorRequested(true)
      }}
    />
  )
}
