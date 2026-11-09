import { isPythonProject } from '../../core/editableProject'
import type {
  PythonExecutionController,
  PythonExecutionView,
} from '../../runtime/python/controller'
import { useHighlightStoreApi } from '../../state/highlightStore'
import { useLogsStore } from '../../state/logsStore'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useProRunApi } from '../../state/proRun'
import {
  usePendingEditorEdits,
  usePythonEditorConsole,
  useStudioRuntimeCapture,
} from '../../state/studioStores'
import { useT } from '../../studio/i18n'
import { useStudioExecution } from '../../studio/observation'
import { useStudioRuntimeEnvironment } from '../../studio/runtime-environment'
import { type PythonRunCommands, PythonRuntimePreview } from './PythonRuntimePreview'
import { pythonExecuting, pythonPreviewIsStale, pythonRunState } from './pythonRunState'

const IDLE_VIEW: PythonExecutionView = { status: 'idle' }
const emptySubscribe = () => () => {}
const noView = () => null

/**
 * A prévia Python do EDITOR (blocos, Ponte e Pro): liga o controlador ao console da instância,
 * leva print/erros ao `logsStore` e publica o estado de execução e o Rodar/Parar na store
 * `proRun`, que a Topbar lê. A barra da própria prévia some (`controls="hidden"`): desde o
 * redesenho do clássico (11/2026) o Rodar/Parar mora na barra de cima também nos blocos.
 */
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
  const proRun = useProRunApi()
  const [commands, setCommands] = useState<PythonRunCommands | null>(null)
  const view = useSyncExternalStore(
    consoleBridge?.subscribe ?? emptySubscribe,
    consoleBridge?.getSnapshot ?? noView,
    noView,
  )
  const python = project && isPythonProject(project) ? project : null
  const editing = Boolean(python)
  const canExecute = execution.editingAccess === 'author'
  const current = view ?? IDLE_VIEW
  const stale = Boolean(python && pythonPreviewIsStale(current, python))
  // O erro que parou o programa da vez, com o arquivo e a linha (o evento `diagnostic`). No
  // clássico (redesenho de 11/2026) ele vira o cartão "Opa, o programa parou", a aba Problemas e
  // o sinal vermelho no bloco, como no JavaScript. Cada Rodar zera.
  const [diagnostic, setDiagnostic] = useState<{
    path: string
    line: number
    column: number
    message: string
  } | null>(null)
  const classic = python?.kind !== 'pro'
  const runState = useMemo(() => {
    if (!editing || !commands) return null
    const state = pythonRunState(current, {
      stale,
      canRun: canExecute && Boolean(environment) && current.status !== 'loading',
      canStop: Boolean(current.identity || pythonExecuting(current.status)),
    })
    if (!classic || state.phase !== 'error' || !diagnostic) return state
    return {
      ...state,
      errorKind: 'runtime' as const,
      ...(diagnostic.line > 0
        ? {
            errorAt: {
              file: diagnostic.path,
              line: diagnostic.line,
              column: diagnostic.column > 0 ? diagnostic.column : undefined,
            },
          }
        : {}),
    }
  }, [editing, commands, current, stale, canExecute, environment, classic, diagnostic])
  const t = useT()
  const highlight = useHighlightStoreApi()
  const markAt = runState?.errorKind === 'runtime' ? runState.errorAt : undefined
  useEffect(() => {
    if (!markAt) {
      if (highlight.getState().runtimeMark?.file.endsWith('.py'))
        highlight.getState().setRuntimeMark(null)
      return
    }
    highlight.getState().setRuntimeMark({
      file: markAt.file,
      line: markAt.line,
      column: markAt.column ?? null,
      message: t('stage.errorMark.program'),
    })
  }, [markAt, highlight, t])
  useEffect(() => () => highlight.getState().setRuntimeMark(null), [highlight])
  useEffect(() => {
    if (!editing) return
    proRun.getState().publish(runState, runState ? commands : null)
  }, [editing, proRun, runState, commands])
  useEffect(() => () => proRun.getState().publish(null, null), [proRun])
  if (!python) return null
  return (
    <PythonRuntimePreview
      project={python}
      controls="hidden"
      stageSubject={pythonStageSubject(python)}
      onCommandsReady={setCommands}
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
        setDiagnostic(null)
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
        if (event.type === 'diagnostic') {
          setDiagnostic(
            (previous) =>
              previous ?? {
                path: event.path,
                line: event.line,
                column: event.column,
                message: event.message,
              },
          )
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
        }
      }}
    />
  )
}

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { pythonStageSubject } from './stageSubject'
