import { isPythonProject } from '../../core/editableProject'
import type { PythonExecutionController } from '../../runtime/python/controller'
import { useLogsStore } from '../../state/logsStore'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import {
  usePendingEditorEdits,
  usePythonEditorConsole,
  useStudioRuntimeCapture,
} from '../../state/studioStores'
import { useStudioExecution } from '../../studio/observation'
import { useStudioRuntimeEnvironment } from '../../studio/runtime-environment'
import { PythonRuntimePreview } from './PythonRuntimePreview'

export function PythonEditorPreview() {
  const project = useProjectStore((state) => state.project)
  const store = useProjectStoreApi()
  const pushLog = useLogsStore((state) => state.push)
  const clearLogs = useLogsStore((state) => state.clear)
  const pending = usePendingEditorEdits()
  const capture = useStudioRuntimeCapture()
  const consoleBridge = usePythonEditorConsole()
  const consoleRelease = useRef<(() => void) | undefined>(undefined)
  const connectConsole = useCallback(
    (controller: PythonExecutionController | null) => {
      consoleRelease.current?.()
      consoleRelease.current = controller ? consoleBridge?.register(controller) : undefined
    },
    [consoleBridge],
  )
  useEffect(
    () => () => {
      consoleRelease.current?.()
      consoleRelease.current = undefined
    },
    [],
  )
  const environment = useStudioRuntimeEnvironment()
  const execution = useStudioExecution()
  if (!project || !isPythonProject(project)) return null
  return (
    <PythonRuntimePreview
      project={project}
      currentProject={() => {
        const current = store.getState().project
        return current && isPythonProject(current) ? current : null
      }}
      environment={environment}
      canExecute={execution.editingAccess === 'author'}
      canExecuteNow={() => store.getState().editingAccess === 'author'}
      autoRun={execution.autoRun}
      muted={execution.muted}
      writerEpoch={execution.writerEpoch}
      capture={capture}
      onControllerReady={connectConsole}
      beforeRun={() => {
        pending?.flush()
        clearLogs()
      }}
      onEvent={(event) => {
        if (event.type === 'repl-result' && event.text)
          pushLog({
            source: 'sz-preview',
            kind: event.status === 'failed' ? 'error' : 'log',
            parts: [event.text],
            timestamp: Date.now(),
          })
        if (event.type === 'console') {
          if (event.omittedLines || event.omittedChars)
            pushLog({
              source: 'sz-preview',
              kind: 'warn',
              parts: [
                `O console recebeu muitas mensagens. Foram omitidas ${event.omittedLines} linhas e ${event.omittedChars} caracteres.`,
              ],
              timestamp: Date.now(),
            })
          if (event.text)
            pushLog({
              source: 'sz-preview',
              kind: event.stream === 'stderr' ? 'error' : 'log',
              parts: [event.text],
              timestamp: Date.now(),
            })
        }
        if (event.type === 'diagnostic')
          pushLog({
            source: 'sz-preview',
            kind: 'runtimeError',
            parts: [
              event.line > 0
                ? `Linha ${event.line} de ${event.path}: ${event.message}`
                : `${event.path}: ${event.message}`,
            ],
            error: { message: event.message, stack: event.traceback },
            timestamp: Date.now(),
          })
      }}
    />
  )
}

import { useCallback, useEffect, useRef } from 'react'
