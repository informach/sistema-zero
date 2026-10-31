import { forwardRef, type Ref, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PythonProjectDocument } from '../../core/editableProject'
import { createPublicPythonRuntimeEnvironment } from '../../runtime/publicEnvironment'
import { pythonProjectNeedsAudioGesture } from '../../runtime/python/audio/activation'
import { isPythonCanvasExtension } from '../../runtime/python/canvasExtension'
import { createPythonConsoleBuffer } from '../../runtime/python/consoleBuffer'
import {
  createPythonExecutionController,
  type PythonExecutionController,
  type PythonExecutionView,
} from '../../runtime/python/controller'
import { PYTHON_CONSOLE_LIMITS, type PythonConsoleBatch } from '../../runtime/python/protocol'
import type { StudioProjectPlayerProps } from './StudioProjectPlayer'

const assignRef = (ref: Ref<HTMLIFrameElement>, frame: HTMLIFrameElement | null) => {
  if (typeof ref === 'function') ref(frame)
  else if (ref) ref.current = frame
}

export const PythonProjectPlayer = forwardRef<
  HTMLIFrameElement,
  StudioProjectPlayerProps & { project: PythonProjectDocument }
>(function PythonProjectPlayer(props, ref) {
  const mount = useRef<HTMLDivElement>(null)
  const latest = useRef(props)
  const [view, setView] = useState<PythonExecutionView>({ status: 'loading' })
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [output, setOutput] = useState<PythonConsoleBatch[]>([])
  const current = useRef<PythonExecutionController | null>(null)
  useLayoutEffect(() => {
    latest.current = props
    current.current?.syncAudioPreference()
  })
  const pendingInput = useRef<object | null>(null)
  const publication =
    props.published && 'programmingLanguage' in props.published ? props.published : undefined
  const request = props.pythonRuntimeRequest
  const hostEnvironment = props.pythonRuntimeEnvironment
  const playId = publication?.playId
  const publicationRevision = publication?.revision
  useEffect(() => {
    const scope = new AbortController()
    let instance: PythonExecutionController | undefined
    let unsubscribe: (() => void) | undefined
    let ready = false
    let failed = false
    let assignedFrame: HTMLIFrameElement | null = null
    let lastInputId: string | undefined
    const consoleOutput = createPythonConsoleBuffer()
    let outputTimer: ReturnType<typeof setTimeout> | undefined
    const flushOutput = () => {
      if (outputTimer !== undefined) clearTimeout(outputTimer)
      outputTimer = undefined
      if (!scope.signal.aborted) setOutput(consoleOutput.snapshot())
    }
    setView({ status: 'loading' })
    setOutput([])
    pendingInput.current = null
    setInput('')
    setSending(false)
    const releaseFrame = (frame: HTMLIFrameElement) => {
      frame.remove()
      if (assignedFrame === frame) {
        assignedFrame = null
        assignRef(ref, null)
      }
    }
    const fail = (cause: unknown) => {
      if (scope.signal.aborted || failed) return
      failed = true
      flushOutput()
      setView({
        status: 'failed',
        error: cause instanceof Error ? cause.message : 'Não foi possível carregar este jogo.',
      })
      latest.current.onError?.(
        cause instanceof Error ? cause : new Error('Não foi possível carregar este jogo.'),
      )
      scope.abort()
      if (assignedFrame) releaseFrame(assignedFrame)
      if (current.current === instance) current.current = null
      void instance?.dispose()
    }
    void (async () => {
      try {
        let environment: Awaited<ReturnType<typeof createPublicPythonRuntimeEnvironment>>
        if (hostEnvironment) environment = await hostEnvironment(props.project, scope.signal)
        else {
          if (!playId || !publicationRevision || !request)
            throw new Error('Reabra a página para carregar a revisão publicada deste jogo.')
          environment = await createPublicPythonRuntimeEnvironment({
            project: props.project,
            playId,
            publicationRevision,
            signal: scope.signal,
            request,
          })
        }
        scope.signal.throwIfAborted()
        instance = createPythonExecutionController({
          instanceId: crypto.randomUUID(),
          project: () => props.project,
          environment: () => environment,
          canExecute: () => !scope.signal.aborted,
          audioMuted: () => latest.current.muted ?? false,
          mountFrame: () => {
            if (!mount.current) throw new Error('A página de jogar foi fechada.')
            const frame = document.createElement('iframe')
            frame.sandbox.value = 'allow-scripts allow-pointer-lock'
            frame.referrerPolicy = 'no-referrer'
            // Keep the initial empty document until the approved URL is known.
            // A srcdoc placeholder creates a second navigation while prepare awaits.
            // Chrome can then retain a document without a renderable layout tree.
            frame.title = latest.current.title ?? props.project.name
            frame.tabIndex = latest.current.tabIndex ?? 0
            Object.assign(frame.style, {
              position: 'absolute',
              inset: '0',
              width: '100%',
              height: '100%',
              border: '0',
              background: '#fff',
            })
            mount.current.append(frame)
            assignedFrame = frame
            assignRef(ref, frame)
            return {
              frame,
              release() {
                releaseFrame(frame)
              },
            }
          },
          onEvent(event) {
            if (scope.signal.aborted) return
            if (event.type === 'console') {
              consoleOutput.appendBatch(event)
              outputTimer ??= setTimeout(flushOutput, PYTHON_CONSOLE_LIMITS.flushIntervalMs)
              return
            }
            if (
              event.type === 'input-request' ||
              (event.type === 'state' && event.state === 'completed')
            )
              flushOutput()
            if (event.type === 'failed') {
              fail(new Error(event.message))
              return
            }
            if (
              event.type === 'state' &&
              !ready &&
              ['running', 'waiting-input', 'completed'].includes(event.state)
            ) {
              ready = true
              latest.current.onReady?.()
            }
          },
        })
        current.current = instance
        unsubscribe = instance.subscribe(() => {
          if (scope.signal.aborted) return
          const next = instance!.getSnapshot()
          if (next.input?.requestId !== lastInputId) {
            lastInputId = next.input?.requestId
            pendingInput.current = null
            setInput('')
            setSending(false)
          }
          setView(next)
          if (next.status === 'failed')
            fail(new Error(next.error ?? 'Não foi possível executar este jogo.'))
        })
        if (pythonProjectNeedsAudioGesture(props.project)) setView({ status: 'ready' })
        else await instance.run()
      } catch (cause) {
        fail(cause)
      }
    })()
    return () => {
      scope.abort()
      if (outputTimer !== undefined) clearTimeout(outputTimer)
      unsubscribe?.()
      if (assignedFrame) releaseFrame(assignedFrame)
      if (current.current === instance) current.current = null
      void instance?.dispose()
    }
  }, [props.project, playId, publicationRevision, request, hostEnvironment, ref])

  // Turtle, Pygame Zero, Pygame-ce and the Raylib extensions draw on the execution canvas.
  const hasTurtle = props.project.installedExtensions.some((extension) =>
    isPythonCanvasExtension(extension.id),
  )
  const omitted = output.reduce((total, entry) => total + entry.omittedChars, 0)
  return (
    <div
      className={props.className}
      style={{ position: 'relative', width: '100%', height: '100%', ...props.style }}
    >
      <div ref={mount} style={{ position: 'absolute', inset: 0 }} />
      {view.status === 'ready' &&
        !view.identity &&
        pythonProjectNeedsAudioGesture(props.project) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff',
              color: '#172033',
              gap: 12,
            }}
          >
            <p role="status">Clique em Jogar para começar com som.</p>
            <button
              type="button"
              onClick={() => {
                const instance = current.current
                // The controller publishes the current generation's failure to its subscription.
                if (instance) void instance.run().catch(() => {})
              }}
            >
              Jogar
            </button>
          </div>
        )}
      {view.status === 'loading' && (
        <p
          role="status"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            margin: 0,
          }}
        >
          Preparando o jogo em Python…
        </p>
      )}
      {(output.length > 0 || view.input || view.status === 'failed') && (
        <section
          aria-label="Mensagens do jogo"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            ...(hasTurtle ? { maxHeight: '40%' } : { top: 0 }),
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            padding: 12,
            background: '#fff',
            color: '#172033',
          }}
        >
          {view.status === 'failed' && (
            <p role="alert">{view.error ?? 'Não foi possível carregar este jogo.'}</p>
          )}
          {omitted > 0 && (
            <p role="status">Algumas mensagens antigas foram omitidas ({omitted} caracteres).</p>
          )}
          <div
            role="log"
            aria-label="Saída do jogo"
            aria-live="polite"
            style={{ minHeight: 0, overflow: 'auto', flex: 1 }}
          >
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                margin: 0,
                font: 'inherit',
              }}
            >
              {output.map((entry) => entry.text).join('')}
            </pre>
          </div>
          {view.status === 'waiting-input' && view.input && (
            <form
              style={{
                flexShrink: 0,
                paddingTop: 12,
                background: '#fff',
                color: '#172033',
              }}
              onSubmit={(event) => {
                event.preventDefault()
                const instance = current.current
                if (!instance || pendingInput.current || !view.input) return
                const submission = {}
                pendingInput.current = submission
                setSending(true)
                void instance
                  .input(view.input.requestId, { kind: 'line', text: input })
                  .catch((cause: unknown) => {
                    if (current.current !== instance || pendingInput.current !== submission) return
                    setView({
                      status: 'failed',
                      error:
                        cause instanceof Error
                          ? cause.message
                          : 'Não foi possível enviar a resposta.',
                    })
                    latest.current.onError?.(
                      cause instanceof Error
                        ? cause
                        : new Error('Não foi possível enviar a resposta.'),
                    )
                    void instance.dispose()
                  })
                  .finally(() => {
                    if (current.current !== instance || pendingInput.current !== submission) return
                    pendingInput.current = null
                    setSending(false)
                  })
              }}
            >
              <label>
                {view.input.prompt || 'Sua resposta'}
                <input
                  value={input}
                  onChange={(event) => setInput(event.currentTarget.value)}
                  disabled={sending}
                  maxLength={100_000}
                />
              </label>
              <button type="submit" disabled={sending}>
                Enviar
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  )
})
