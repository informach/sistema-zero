import {
  STUDIO_PYTHON_PREVIEW_SANDBOX,
  StudioPythonPreviewMessageSchema,
} from '@sistemazero/core/studio/python-preview-bridge'
import { StudioPythonPreviewReferenceSchema } from '@sistemazero/core/studio/python-preview-reference'
import { useLayoutEffect, useRef, useState } from 'react'
import { Button } from '#ui'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import { useProjectStoreApi } from '../../state/projectStore'
import {
  type ProCandidatePreview,
  useProCandidatePreview,
} from '../../studio/pro-candidate-preview'
import { useStudioRuntimeEnvironment } from '../../studio/runtime-environment'
import { useStudioTutor } from '../../studio/tutor'
import { PythonEditorPreview } from './PythonEditorPreview'

/** Switching documents disposes the running game; the editable project is never replaced. */
export function PythonProPreview() {
  const { candidate: selected, mode, select, close } = useProCandidatePreview()
  const candidate = selected?.kind === 'python' ? selected : null,
    active = candidate !== null && mode === 'candidate'
  return (
    <div className="flex h-full min-h-0 flex-col">
      {candidate && (
        <div className="border-b border-sz-border bg-sz-panel p-2 text-xs">
          <fieldset className="flex flex-wrap items-center gap-2" aria-label="Versão em execução">
            <Button
              size="sm"
              variant={active ? 'ghost' : 'primary'}
              aria-pressed={!active}
              onClick={() => select('current')}
            >
              Jogo atual
            </Button>
            <Button
              size="sm"
              variant={active ? 'primary' : 'ghost'}
              aria-pressed={active}
              onClick={() => select('candidate')}
            >
              Proposta
            </Button>
            <Button size="sm" variant="ghost" onClick={close}>
              Fechar experiência
            </Button>
          </fieldset>
          <p className="mt-1 text-sz-fg-soft">
            {active ? 'Experimentando proposta. Seu código continua preservado.' : 'Jogo atual.'}{' '}
            Alternar reinicia a partida.
          </p>
        </div>
      )}
      <div className="min-h-0 flex-1">
        {active ? <ProtectedPythonCandidate candidate={candidate} /> : <PythonEditorPreview />}
      </div>
    </div>
  )
}

function ProtectedPythonCandidate({
  candidate,
}: {
  candidate: Extract<ProCandidatePreview, { kind: 'python' }>
}) {
  const authorize = useStudioTutor().config?.adapter.builder?.authorizePythonPreview,
    environment = useStudioRuntimeEnvironment(),
    store = useProjectStoreApi(),
    { report } = useProCandidatePreview(),
    container = useRef<HTMLDivElement>(null),
    [status, setStatus] = useState<'loading' | 'ready' | 'expired' | 'unavailable'>('loading')
  const { projectId, jobId, revisionHash, version, reference } = candidate,
    { id, sha256, expiresAt, revision, runtimeManifestSha256 } = reference
  useLayoutEffect(() => {
    const controller = new AbortController(),
      scope = captureProjectStorageScope(),
      lifetime = AbortSignal.any([
        controller.signal,
        ...(environment?.signal ? [environment.signal] : []),
        ...(scope.signal ? [scope.signal] : []),
      ]),
      session = crypto.randomUUID(),
      host = container.current
    let frame: HTMLIFrameElement | undefined,
      loadingDeadline: ReturnType<typeof setTimeout> | undefined,
      expiration: ReturnType<typeof setTimeout> | undefined
    const valid = () =>
      !lifetime.aborted &&
      scope === captureProjectStorageScope() &&
      store.getState().project?.id === projectId &&
      store.getState().project?.kind === 'pro' &&
      store.getState().project?.programmingLanguage === 'python' &&
      store.getState().editingAccess === 'author'
    const remove = () => {
      frame?.remove()
      frame = undefined
    }
    const update = (next: typeof status) => {
      if (!valid()) return
      setStatus(next)
      report(id, next)
      if (next === 'expired' || next === 'unavailable') controller.abort()
    }
    const retire = () => {
      remove()
      clearTimeout(loadingDeadline)
      clearTimeout(expiration)
    }
    const unsubscribe = store.subscribe(() => {
      if (!valid()) controller.abort()
    })
    lifetime.addEventListener('abort', retire, { once: true })
    setStatus('loading')
    const message = (event: MessageEvent) => {
      if (
        !valid() ||
        !frame ||
        event.source !== frame.contentWindow ||
        event.origin !== new URL(frame.src).origin
      )
        return
      const parsed = StudioPythonPreviewMessageSchema.safeParse(event.data)
      if (!parsed.success || parsed.data.session !== session || parsed.data.previewId !== id) return
      if (parsed.data.status !== 'loading') clearTimeout(loadingDeadline)
      update(parsed.data.status)
    }
    window.addEventListener('message', message)
    if (!authorize || !host || !valid()) {
      if (!lifetime.aborted) update('unavailable')
    } else if (expiresAt <= Date.now()) update('expired')
    else {
      loadingDeadline = setTimeout(() => update('unavailable'), 60000)
      void authorize(
        { id: jobId, projectId, version, revisionHash, preview: { id, sha256 } },
        lifetime,
      )
        .then((raw) => {
          if (!valid()) return
          const approved = StudioPythonPreviewReferenceSchema.parse(raw)
          if (
            approved.id !== id ||
            approved.sha256 !== sha256 ||
            approved.projectId !== projectId ||
            approved.revision !== revision ||
            approved.runtimeManifestSha256 !== runtimeManifestSha256
          )
            throw new Error('A prévia autorizada mudou.')
          if (approved.expiresAt <= Date.now()) {
            update('expired')
            return
          }
          const target = new URL(approved.url)
          if (target.origin === window.location.origin)
            throw new Error('A prévia exige uma origem separada.')
          target.hash = new URLSearchParams({ 'studio-preview-session': session }).toString()
          frame = document.createElement('iframe')
          frame.title = 'Proposta Python'
          frame.className = 'h-full w-full border-0'
          // The trusted service launcher fetches its immutable payload in its own origin.
          // It creates a separate opaque frame for learner execution.
          frame.setAttribute('credentialless', '')
          frame.setAttribute('sandbox', STUDIO_PYTHON_PREVIEW_SANDBOX)
          frame.setAttribute('referrerpolicy', 'no-referrer')
          frame.src = target.href
          host.append(frame)
          expiration = setTimeout(
            () => update('expired'),
            Math.min(approved.expiresAt - Date.now(), 2147483647),
          )
        })
        .catch(() => {
          if (valid()) update('unavailable')
        })
    }
    return () => {
      controller.abort()
      retire()
      unsubscribe()
      lifetime.removeEventListener('abort', retire)
      window.removeEventListener('message', message)
    }
  }, [
    authorize,
    environment?.signal,
    store,
    report,
    projectId,
    jobId,
    version,
    revisionHash,
    id,
    sha256,
    expiresAt,
    revision,
    runtimeManifestSha256,
  ])
  return (
    <div className="relative h-full min-h-0">
      <div ref={container} className="h-full w-full" />
      {status !== 'ready' && (
        <p
          role="status"
          className="absolute inset-x-0 top-0 bg-sz-panel p-3 text-sm text-sz-fg-soft"
        >
          {status === 'loading'
            ? 'Abrindo proposta Python…'
            : status === 'expired'
              ? 'A prévia venceu. Renove a prévia na proposta.'
              : 'Não foi possível abrir esta prévia. Consulte a proposta e tente novamente.'}
        </p>
      )}
    </div>
  )
}
