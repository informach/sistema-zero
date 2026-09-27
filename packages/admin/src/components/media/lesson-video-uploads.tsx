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
const EMPTY_STATUS: Record<string, VideoUploadController> = {}

/** The lesson owns workers. Closing any field only removes a subscriber, never the transfer. */
export class LessonVideoUploadRegistry {
  private controllers: Record<string, VideoUploadController> = EMPTY_STATUS
  private jobs: UploadJob[] = []
  private listeners = new Set<() => void>()
  private jobListeners = new Set<() => void>()
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
  request(blockId: string, request: { file: File } | { checkId: string }) {
    const current = this.jobs.find((job) => job.blockId === blockId)
    const job = { blockId, ...request, requestId: (current?.requestId ?? 0) + 1 }
    this.jobs = [...this.jobs.filter((j) => j.blockId !== blockId), job]
    for (const listener of this.jobListeners) listener()
  }
  report(blockId: string, controller: VideoUploadController) {
    this.controllers = { ...this.controllers, [blockId]: controller }
    for (const listener of this.listeners) listener()
  }
  remove(blockId: string) {
    this.controllers[blockId]?.reset()
    this.jobs = this.jobs.filter((j) => j.blockId !== blockId)
    const { [blockId]: _removed, ...rest } = this.controllers
    this.controllers = rest
    for (const listener of this.jobListeners) listener()
    for (const listener of this.listeners) listener()
  }
  clear() {
    for (const job of this.jobs) this.remove(job.blockId)
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
  onReady: (id: string, video: ReadyVideo) => void
}) {
  const controller = useVideoUpload((video) => onReady(job.blockId, video))
  const { phase, progress, error, videoId, embedUrl, upload, checkStatus, reset } = controller
  useEffect(() => {
    registry.report(job.blockId, {
      phase,
      progress,
      error,
      videoId,
      embedUrl,
      upload,
      checkStatus,
      reset,
    })
  }, [registry, job.blockId, phase, progress, error, videoId, embedUrl, upload, checkStatus, reset])
  useEffect(() => {
    if (job.file) void upload(job.file)
    else if (job.checkId) checkStatus(job.checkId)
  }, [job, upload, checkStatus])
  return null
}

export function LessonVideoUploads({
  registry,
  onReady,
  children,
}: {
  registry: LessonVideoUploadRegistry
  onReady: (id: string, video: ReadyVideo) => void
  children: ReactNode
}) {
  const jobs = useSyncExternalStore(registry.subscribeJobs, registry.getJobs, registry.getJobs)
  const status = useSyncExternalStore(
    registry.subscribe,
    registry.getSnapshot,
    registry.getSnapshot,
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
        <UploadWorker key={job.blockId} job={job} registry={registry} onReady={onReady} />
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
