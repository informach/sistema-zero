'use client'

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import { type ReadyVideo, useVideoUpload } from './use-video-upload'

export type VideoUploadController = ReturnType<typeof useVideoUpload>
type UploadJob = { blockId: string; file?: File; checkId?: string; requestId: number }
export interface CapturedLessonVideo {
  blockId: string
  requestId: number
  video: ReadyVideo
}
export interface LessonVideoDeliveryReceipt {
  /** Observe this delivery's relevance without consuming it or granting write authority. */
  isCurrent(): boolean
  /** Confirms this exact delivery only after its domain changes were accepted. */
  acknowledge(): boolean
}
type PresentVideo = (id: string, video: ReadyVideo, receipt: LessonVideoDeliveryReceipt) => void
const EMPTY_STATUS: Record<string, VideoUploadController> = {}

/** The lesson owns workers. Closing any field only removes a subscriber, never the transfer. */
export class LessonVideoUploadRegistry {
  private controllers: Record<string, VideoUploadController> = EMPTY_STATUS
  private jobs: UploadJob[] = []
  private listeners = new Set<() => void>()
  private jobListeners = new Set<() => void>()
  private nextRequestId = 0
  private frozen = false
  private deliveryEpoch = 0
  private captured: CapturedLessonVideo[] | null = null
  private results = new Map<string, { value: CapturedLessonVideo; incorporated: boolean }>()
  private presentationErrors: Record<string, string> = {}
  private presentationAttempts = new Map<string, symbol>()
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  subscribeJobs = (listener: () => void) => {
    this.jobListeners.add(listener)
    return () => {
      this.jobListeners.delete(listener)
    }
  }
  getSnapshot = () => this.controllers
  getJobs = () => this.jobs
  getPresentationErrors = () => this.presentationErrors
  request(blockId: string, request: { file: File } | { checkId: string }) {
    if (this.frozen)
      throw new Error('Conclua ou retome a captura da aula antes de iniciar um vídeo.')
    this.controllers[blockId]?.reset()
    const { [blockId]: _previous, ...rest } = this.controllers
    this.controllers = rest
    const job = { blockId, ...request, requestId: ++this.nextRequestId }
    this.results.delete(blockId)
    this.clearPresentationError(blockId)
    this.jobs = [...this.jobs.filter((j) => j.blockId !== blockId), job]
    for (const listener of this.jobListeners) listener()
    for (const listener of this.listeners) listener()
  }
  private isCurrent(blockId: string, requestId: number) {
    return this.jobs.some((job) => job.blockId === blockId && job.requestId === requestId)
  }
  canStart(blockId: string, requestId: number) {
    return !this.captured && this.isCurrent(blockId, requestId)
  }
  report(blockId: string, requestId: number, controller: VideoUploadController) {
    if (!this.isCurrent(blockId, requestId)) return
    this.controllers = { ...this.controllers, [blockId]: controller }
    for (const listener of this.listeners) listener()
  }
  remove(blockId: string) {
    if (this.frozen) throw new Error('Retome a captura antes de remover um vídeo.')
    this.controllers[blockId]?.reset()
    this.results.delete(blockId)
    this.presentationAttempts.delete(blockId)
    this.clearPresentationError(blockId)
    this.jobs = this.jobs.filter((j) => j.blockId !== blockId)
    const { [blockId]: _removed, ...rest } = this.controllers
    this.controllers = rest
    for (const listener of this.jobListeners) listener()
    for (const listener of this.listeners) listener()
  }
  clear() {
    for (const job of this.jobs) this.remove(job.blockId)
  }
  /** Keep the bytes before invoking presentation, which may be suspended or fail. */
  receive(blockId: string, requestId: number, video: ReadyVideo, present: PresentVideo) {
    if (this.captured || !this.isCurrent(blockId, requestId)) return
    const result = {
      value: { blockId, requestId, video: structuredClone(video) },
      incorporated: false,
    }
    this.results.set(blockId, result)
    const epoch = this.deliveryEpoch
    const isCurrent = () =>
      !this.frozen &&
      epoch === this.deliveryEpoch &&
      this.isCurrent(blockId, requestId) &&
      this.results.get(blockId) === result
    const receipt: LessonVideoDeliveryReceipt = {
      isCurrent,
      acknowledge: () => {
        if (!isCurrent()) return false
        result.incorporated = true
        return true
      },
    }
    const attempt = Symbol()
    this.presentationAttempts.set(blockId, attempt)
    const isCurrentPresentation = () =>
      !this.frozen &&
      epoch === this.deliveryEpoch &&
      this.isCurrent(blockId, requestId) &&
      this.presentationAttempts.get(blockId) === attempt
    const failed = () => {
      if (!isCurrentPresentation()) return
      this.presentationErrors = {
        ...this.presentationErrors,
        [blockId]:
          'O vídeo foi enviado, mas não foi possível aplicar seus dados à aula. Verifique o vídeo novamente.',
      }
      for (const listener of this.listeners) listener()
    }
    const succeeded = () => {
      if (isCurrentPresentation()) this.clearPresentationError(blockId)
    }
    try {
      // A void presentation callback may still be an async function. Observe its rejection
      // without making delivery part of the upload/polling control flow.
      void Promise.resolve(present(blockId, structuredClone(video), receipt)).then(
        succeeded,
        failed,
      )
    } catch {
      failed()
    }
  }
  private clearPresentationError(blockId: string) {
    if (!(blockId in this.presentationErrors)) return
    const { [blockId]: _removed, ...rest } = this.presentationErrors
    this.presentationErrors = rest
    for (const listener of this.listeners) listener()
  }
  /** A hosted provisional result is sufficient; an unfinished File is not recoverable. */
  prepareHandoff(): CapturedLessonVideo[] {
    if (!this.frozen) this.deliveryEpoch++
    this.frozen = true
    if (this.captured) return structuredClone(this.captured)
    if (this.jobs.some((job) => job.file && !this.results.has(job.blockId)))
      throw new Error('Aguarde o envio do vídeo ou cancele-o explicitamente antes de sair da aula.')
    for (const controller of Object.values(this.controllers)) controller.suspendStatus()
    this.captured = structuredClone(
      [...this.results.values()].filter((result) => !result.incorporated).map(({ value }) => value),
    )
    return structuredClone(this.captured)
  }
  /** Called only by an explicit pre-seal resume of the same owner. Never reuploads a File. */
  resumeAfterHandoff() {
    if (!this.frozen) return
    this.deliveryEpoch++
    this.captured = null
    this.frozen = false
    for (const job of this.jobs) {
      const controller = this.controllers[job.blockId]
      if (controller?.phase === 'idle' && job.checkId) controller.checkStatus(job.checkId)
      else controller?.resumeStatus()
    }
  }
}

const UploadContext = createContext<LessonVideoUploadRegistry | null>(null)
function UploadWorker({
  registry,
  job,
  onReady,
}: {
  registry: LessonVideoUploadRegistry
  job: UploadJob
  onReady: PresentVideo
}) {
  const controller = useVideoUpload((video) =>
    registry.receive(job.blockId, job.requestId, video, onReady),
  )
  const {
    phase,
    progress,
    error,
    videoId,
    embedUrl,
    upload,
    checkStatus,
    reset,
    suspendStatus,
    resumeStatus,
  } = controller
  useEffect(() => {
    registry.report(job.blockId, job.requestId, {
      phase,
      progress,
      error,
      videoId,
      embedUrl,
      upload,
      checkStatus,
      reset,
      suspendStatus,
      resumeStatus,
    })
  }, [
    registry,
    job.blockId,
    job.requestId,
    phase,
    progress,
    error,
    videoId,
    embedUrl,
    upload,
    checkStatus,
    reset,
    suspendStatus,
    resumeStatus,
  ])
  useEffect(() => {
    if (!registry.canStart(job.blockId, job.requestId)) return
    if (job.file) void upload(job.file)
    else if (job.checkId) checkStatus(job.checkId)
  }, [registry, job, upload, checkStatus])
  return null
}

export function LessonVideoUploads({
  registry,
  onReady,
  children,
}: {
  registry: LessonVideoUploadRegistry
  onReady: PresentVideo
  children: ReactNode
}) {
  const jobs = useSyncExternalStore(registry.subscribeJobs, registry.getJobs, registry.getJobs)
  const status = useSyncExternalStore(
    registry.subscribe,
    registry.getSnapshot,
    registry.getSnapshot,
  )
  const presentationErrors = useSyncExternalStore(
    registry.subscribe,
    registry.getPresentationErrors,
    registry.getPresentationErrors,
  )
  const transferring = Object.values(status).some(
    (s) => s.phase === 'requesting-ticket' || s.phase === 'uploading',
  )
  useEffect(() => {
    if (!transferring) return
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', leave)
    return () => window.removeEventListener('beforeunload', leave)
  }, [transferring])
  return (
    <UploadContext.Provider value={registry}>
      {jobs.map((job) => (
        <UploadWorker
          key={`${job.blockId}:${job.requestId}`}
          job={job}
          registry={registry}
          onReady={onReady}
        />
      ))}
      {Object.entries(presentationErrors).map(([id, message]) => (
        <p key={id} role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ))}
      {children}
    </UploadContext.Provider>
  )
}

export function useLessonVideoController(blockId: string) {
  const registry = useContext(UploadContext)
  const [fallback] = useState(() => new LessonVideoUploadRegistry())
  const source = registry ?? fallback
  const statuses = useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot)
  const controller = statuses[blockId]
  return useMemo(
    () =>
      registry
        ? ({
            phase: controller?.phase ?? 'idle',
            progress: controller?.progress ?? 0,
            error: controller?.error ?? null,
            videoId: controller?.videoId ?? null,
            embedUrl: controller?.embedUrl ?? null,
            upload: async (file: File) => {
              registry.request(blockId, { file })
            },
            checkStatus: (checkId: string) => {
              registry.request(blockId, { checkId })
            },
            reset: () => registry.remove(blockId),
            suspendStatus: () => controller?.suspendStatus(),
            resumeStatus: () => controller?.resumeStatus(),
          } satisfies VideoUploadController)
        : null,
    [registry, blockId, controller],
  )
}

export function videoUploadStatusLabels(
  status: Record<string, VideoUploadController>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(status).flatMap(([id, s]) => {
      const label =
        s.phase === 'requesting-ticket'
          ? 'Preparando envio do vídeo…'
          : s.phase === 'uploading'
            ? `Enviando vídeo · ${Math.round(s.progress * 100)}%`
            : s.phase === 'processing'
              ? 'Vídeo enviado · processando'
              : s.phase === 'error'
                ? s.error
                : null
      return label ? [[id, label]] : []
    }),
  )
}
