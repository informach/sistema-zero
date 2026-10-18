import { lazy, Suspense } from 'react'
import { Modal } from '#ui'
import { useProjectStore } from '../../state/projectStore'
import type { ExtensionsPanelProps } from './JavaScriptExtensionsPanel'

export type { ExtensionsPanelProps } from './JavaScriptExtensionsPanel'

const JavaScriptPanel = lazy(() =>
  import('./JavaScriptExtensionsPanel').then((m) => ({ default: m.JavaScriptExtensionsPanel })),
)
const PythonPanel = lazy(() =>
  import('./PythonExtensionsPanel').then((m) => ({ default: m.PythonExtensionsPanel })),
)

/** Language catalogs load independently; Python never registers JavaScript block definitions. */
export function ExtensionsPanel(props: ExtensionsPanelProps) {
  const language = useProjectStore((s) => s.project?.programmingLanguage ?? 'javascript')
  const projectId = useProjectStore((s) => s.project?.id)
  if (!props.open) return null
  return (
    <Suspense
      fallback={
        <Modal {...props} title="Extensões">
          Carregando extensões…
        </Modal>
      }
    >
      {language === 'python' ? (
        <PythonPanel key={projectId} {...props} />
      ) : (
        <JavaScriptPanel key={projectId} {...props} />
      )}
    </Suspense>
  )
}
