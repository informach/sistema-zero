import { sha256Hex } from '@sistemazero/core/creations'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useLessonRuntime } from '../../../member-shell/src/components/studio/use-lesson-runtime'
import { PythonRuntimePreview } from '../../src/components/preview/PythonRuntimePreview'
import { createPythonAnalysisController } from '../../src/python/language/controller'
import type { PythonExecutionController } from '../../src/runtime/python/controller'
import type { StudioRuntimeEvent } from '../../src/runtime/types'
import { refinePythonProjectDocument } from '../../src/state/pythonProjectValidation'

const setup = await (await fetch(`/lesson-probe/setup${location.search}`)).json()
const project = await refinePythonProjectDocument(setup.project)
const events: StudioRuntimeEvent[] = []
let controller: PythonExecutionController | null = null
let analyze: (() => Promise<number>) | undefined
const rootElement = document.createElement('div')
rootElement.style.height = '600px'
document.body.append(rootElement)

function Lesson() {
  const runtime = useLessonRuntime({ project, ...setup.scope, offline: false })
  const [analysis, setAnalysis] = useState('')
  useEffect(() => {
    if (!runtime.environment) return
    const environment = runtime.environment
    const parser = createPythonAnalysisController({
      project: () => project,
      environment: () => environment,
      mountFrame() {
        const frame = document.createElement('iframe')
        frame.hidden = true
        frame.dataset.analysis = 'true'
        document.body.append(frame)
        return { frame, release: () => frame.remove() }
      },
    })
    analyze = async () => {
      const source = 'answer = 40 + 2\nprint(answer)\n'
      const identity = {
        projectId: project.id,
        instanceId: 'lesson-probe',
        path: 'main.py',
        revision: await sha256Hex(source),
        generation: 1,
      }
      const result = await parser.run({
        current: () => true,
        execute: (session) => session.parse(identity, source),
      })
      setAnalysis(result.tree?.kind ?? 'missing')
      return result.diagnostics.length
    }
    return () => {
      analyze = undefined
      parser.dispose()
    }
  }, [runtime.environment])
  return (
    <>
      <output data-testid="admission">
        {runtime.error ?? (runtime.environment ? 'ready' : 'loading')}
      </output>
      <output data-testid="analysis">{analysis}</output>
      <button type="button" onClick={runtime.retry}>
        Reabrir ambiente
      </button>
      <PythonRuntimePreview
        project={project}
        environment={runtime.environment ?? null}
        canExecute
        autoRun={false}
        onEvent={(event) => events.push(event)}
        onControllerReady={(value) => {
          controller = value
        }}
      />
    </>
  )
}
const root = createRoot(rootElement)
root.render(<Lesson />)
globalThis.lessonRuntimeProbe = {
  read: () => ({ events, view: controller?.getSnapshot(), source: project }),
  analyze: () => (analyze ? analyze() : Promise.reject(new Error('No analyzer'))),
  evaluate: () => controller!.evaluate('lesson-console', '"scoped-repl"'),
  capture: () => controller!.capture(),
  close: () => root.unmount(),
}
declare global {
  var lessonRuntimeProbe: {
    read(): {
      events: StudioRuntimeEvent[]
      view: ReturnType<PythonExecutionController['getSnapshot']> | undefined
      source: typeof project
    }
    analyze(): Promise<number>
    evaluate(): Promise<void>
    capture(): ReturnType<PythonExecutionController['capture']>
    close(): void
  }
}
