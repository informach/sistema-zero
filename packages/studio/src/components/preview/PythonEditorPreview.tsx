import { isPythonProject } from '../../core/editableProject'
import { pythonCanvasExtension } from '../../runtime/python/canvasExtension'
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
import { useUIStore, useUIStoreApi } from '../../state/uiStore'
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
  const controllerRef = useRef<PythonExecutionController | null>(null)
  const connectConsole = useCallback(
    (controller: PythonExecutionController | null) => {
      controllerRef.current = controller
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
    /** O traceback inteiro (o caminho até o erro da aba Investigar). */
    traceback?: string
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
  // A aba Desempenho (proposta aprovada em 20/11/2026). O tempo de cada execução, para o programa
  // sem tela, e a medida dos quadros, só com a aba medindo: o quadro do Python conta os quadros
  // pintados e manda uma fatia a cada meio segundo. O módulo das janelas entra sob demanda.
  const ui = useUIStoreApi()
  const measuring = useUIStore((state) => state.measuring)
  const investigating = useUIStore((state) => state.investigating)
  const runId = current.identity?.runId ?? null
  const runningNow = current.status === 'running' || current.status === 'waiting-input'
  const ended =
    current.status === 'completed' || current.status === 'failed' || current.status === 'stopped'
  const timedRun = useRef<string | null>(null)
  const drawsOnCanvas = useMemo(() => {
    if (!python) return null
    try {
      return pythonCanvasExtension(python.installedExtensions) !== undefined
    } catch {
      // Duas bibliotecas de tela ao mesmo tempo: o Rodar avisa; para a aba, o programa desenha.
      return true
    }
  }, [python])
  useEffect(() => {
    if (drawsOnCanvas === null) return
    void import('../../state/devtools').then(({ programTimeFor }) =>
      programTimeFor(ui).setState({ canvas: drawsOnCanvas }),
    )
  }, [ui, drawsOnCanvas])
  useEffect(() => {
    if (!runningNow && !ended) return
    const startsNow = runningNow && runId !== null && timedRun.current !== runId
    if (startsNow) timedRun.current = runId
    void import('../../state/devtools').then(({ programTimeFor }) => {
      const time = programTimeFor(ui)
      if (startsNow) time.setState({ startedAt: Date.now(), endedAt: null })
      else if (ended && time.getState().startedAt !== null && time.getState().endedAt === null)
        time.setState({ endedAt: Date.now() })
    })
  }, [ui, runId, runningNow, ended])
  // A aba Investigar (proposta aprovada em 20/11/2026: "Valores agora, caminho até o erro").
  // Ligada, cada Rodar começa no modo de observação (o observador das missões lê as variáveis a
  // cada quadro, sem mudar o programa); ligar ou desligar recomeça o programa, como o JavaScript.
  const statusRef = useRef(current.status)
  statusRef.current = current.status
  const investigatingBefore = useRef(investigating)
  useEffect(() => {
    if (investigatingBefore.current === investigating) return
    investigatingBefore.current = investigating
    if (commands && statusRef.current !== 'idle') commands.run()
  }, [investigating, commands])
  const entrySource =
    python && python.kind !== 'pro' ? (python.files[python.python.entrypoint] ?? '') : ''
  const investigatedRun =
    investigating && runId !== null && (runningNow || current.status === 'completed')
  const completedNow = current.status === 'completed'
  // biome-ignore lint/correctness/useExhaustiveDependencies: `runId` é o GATILHO (uma execução nova lê de novo)
  useEffect(() => {
    const controller = controllerRef.current
    if (!investigatedRun || !controller) return
    // O programa sem tela só responde no fim: perguntar enquanto ele roda prenderia a sonda.
    if (drawsOnCanvas === false && !completedNow) return
    let gone = false
    void import('../../components/devtools/pythonInvestigation').then(async (help) => {
      const { investigationWindowFor } = await import('../../state/devtools')
      const names = help.pythonTopLevelNames(entrySource)
      const window = investigationWindowFor(ui)
      const read = async () => {
        const values: { name: string; text: string }[] = []
        for (const name of names) {
          if (gone) return
          const result = await controller.observe({ type: 'value', path: name })
          const observed = result.observation.type === 'value' ? result.observation.observed : null
          if (observed?.found) values.push({ name, text: help.pythonValueText(observed.value) })
        }
        if (!gone)
          window.getState().receive({
            frame: null,
            paused: false,
            canPause: false,
            pauseLater: false,
            values,
            error: null,
          })
      }
      // Rodando, a leitura volta a cada meio segundo; terminado, uma vez (os valores do fim).
      while (!gone) {
        try {
          await read()
        } catch {
          // A execução acabou no meio da leitura (Parar, erro): a próxima execução lê de novo.
          return
        }
        if (completedNow) return
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    })
    return () => {
      gone = true
    }
  }, [investigatedRun, completedNow, drawsOnCanvas, entrySource, ui, runId])
  // O erro que parou o programa vira o caminho até o erro (os passos do traceback do projeto).
  const traceback = investigating ? (diagnostic?.traceback ?? null) : null
  useEffect(() => {
    if (!traceback) return
    void Promise.all([
      import('../../components/devtools/pythonInvestigation'),
      import('../../state/devtools'),
    ]).then(([help, { investigationWindowFor }]) => {
      const window = investigationWindowFor(ui)
      const state = window.getState()
      window.getState().receive({
        frame: null,
        paused: false,
        canPause: false,
        pauseLater: false,
        values: state.values.map(({ name, text }) => ({ name, text })),
        error: { lines: [], trace: help.pythonTraceSteps(traceback) },
      })
    })
  }, [traceback, ui])
  // biome-ignore lint/correctness/useExhaustiveDependencies: `runId` é o GATILHO (uma execução nova religa a medida)
  useEffect(() => {
    const controller = controllerRef.current
    if (!measuring || !runningNow || !controller) return
    let gone = false
    void import('../../state/devtools').then(({ perfWindowFor }) => {
      if (gone) return
      const window = perfWindowFor(ui)
      window.getState().clear()
      // Recusa: o quadro publicado não mede (é de antes da medida) ou a execução acabou antes
      // (Parar, erro). A aba diz que ainda não dá para medir; a próxima execução tenta de novo.
      controller
        .measurePerformance((slice) =>
          window.getState().push({ ...slice, sprites: null, objects: null, draws: null }),
        )
        .catch(() => {
          if (!gone) window.getState().refuse()
        })
    })
    return () => {
      gone = true
      controller.measurePerformance(null).catch(() => undefined)
    }
  }, [measuring, runningNow, ui, runId])
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
      observation={investigating}
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
                ...(event.traceback ? { traceback: event.traceback } : {}),
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
