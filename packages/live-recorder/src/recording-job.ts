import type { Page } from 'playwright'
import type { RecordingCommand, RecordingManifest } from './contracts'
import { installReceiverPage } from './receiver-page'
import {
  type OpenRecordingBrowser,
  type RecordingBrowser,
  recordingBrowserFactory,
} from './recording-browser'
import type { RecordingSegmentStore } from './segment-store'

export interface RecorderInfrastructure {
  sfuAppId: string
  sfuAppSecret: string
  supervisorUrl: string
  supervisorToken: string
  openBrowser?: OpenRecordingBrowser
  iceServers(hardEndsAt: string): Promise<RTCIceServer[]>
  onState(manifest: RecordingManifest): Promise<void>
}

export class RecordingJob {
  private browser: RecordingBrowser | null = null
  private pausing: Promise<void> | null = null
  private page: Page | null = null
  private sessionId: string | null = null
  private connectionId = crypto.randomUUID()
  private mids: string[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private leaseEndsAt = 0
  private desired: RecordingCommand['desiredState'] = 'paused'
  private heartbeatPending = false
  private captureStopped = true
  private sourceKey = ''
  private queue: Promise<unknown> = Promise.resolve()
  private persistence: Promise<void> = Promise.resolve()
  private commandVersion = 0
  private lastCommandId: string | null = null
  private shuttingDown = false
  private supervised = false
  constructor(
    readonly manifest: RecordingManifest,
    private readonly store: RecordingSegmentStore,
    private readonly infrastructure: RecorderInfrastructure,
  ) {}

  status() {
    return {
      ...this.manifest,
      captureStopped: this.captureStopped,
      commandVersion: this.commandVersion,
      manifestKey: this.store.manifestKey,
    }
  }

  command(command: RecordingCommand) {
    const task = this.queue.then(async () => {
      if (this.shuttingDown) throw new Error('Recorder is shutting down')
      if (
        command.generation !== this.manifest.generation ||
        command.jobId !== this.manifest.jobId ||
        command.occurrenceId !== this.manifest.occurrenceId
      )
        throw new Error('Recording generation conflict')
      if (
        Date.parse(command.leaseEndsAt) <= Date.now() ||
        Date.parse(command.leaseEndsAt) > Date.now() + 30_000 ||
        Date.parse(command.hardEndsAt) <= Date.now()
      )
        throw new Error('Recording operational lease expired')
      if (
        command.commandVersion < this.commandVersion ||
        (command.commandVersion === this.commandVersion && command.commandId !== this.lastCommandId)
      )
        throw new Error('Recording command superseded')
      if (command.commandVersion === this.commandVersion) return this.status()
      this.commandVersion = command.commandVersion
      this.lastCommandId = command.commandId
      this.leaseEndsAt = Math.min(Date.parse(command.leaseEndsAt), Date.parse(command.hardEndsAt))
      this.desired = command.desiredState
      if (this.browser && command.desiredState === 'recording')
        await this.browser.renew(this.leaseEndsAt)
      if (this.manifest.state === 'review') {
        if (command.desiredState === 'recording')
          throw new Error('A finalized recording cannot resume')
        return this.status()
      }
      if (command.desiredState === 'stopped') {
        await this.pause('pause')
        await this.finalize()
        return this.status()
      }
      if (command.desiredState === 'paused') {
        await this.pause('pause')
        return this.status()
      }
      const key = JSON.stringify(command.sources)
      if (this.page && key !== this.sourceKey) await this.pause('source-change')
      if (!this.page) await this.start(command)
      return this.status()
    })
    this.queue = task.catch(() => undefined)
    return task
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true
    await this.queue
    if (this.manifest.state === 'review' && this.captureStopped) {
      await this.persistence
      return
    }
    this.desired = 'paused'
    await this.pause('pause')
    await this.persistence
  }

  private async start(command: RecordingCommand): Promise<void> {
    if (!command.sources.length) {
      this.manifest.state = 'starting'
      await this.persist()
      return
    }
    if (new Set(command.sources.map((source) => source.kind)).size !== command.sources.length)
      throw new Error('Duplicate recording inputs')
    this.manifest.state = 'starting'
    this.manifest.error = null
    this.sourceKey = JSON.stringify(command.sources)
    this.connectionId = crypto.randomUUID()
    this.supervised = false
    this.mids = []
    this.sessionId = null
    await this.store.prepare()
    await this.persist()
    try {
      this.browser = await (this.infrastructure.openBrowser ?? recordingBrowserFactory())(
        this.leaseEndsAt,
        Date.parse(command.hardEndsAt),
      )
      this.captureStopped = false
      await this.supervise(command.hardEndsAt, false)
      const session = await this.sfu('/sessions/new', 'POST')
      if (!session.sessionId) throw new Error('Recorder SFU allocation missing')
      this.sessionId = session.sessionId
      await this.supervise(command.hardEndsAt, false)
      const context = await this.browser.browser.newContext({
        viewport: { width: 1280, height: 720 },
      })
      // No arbitrary websites, app authentication, or child project execution in this context.
      await context.route('**/*', (route) => route.abort())
      this.page = await context.newPage()
      await this.page.exposeFunction(
        'szRecordingSegment',
        async (input: { base64: string; startsAt: string; endsAt: string; durationMs: number }) => {
          await this.store.segment(input)
          if (this.desired === 'recording') this.manifest.state = 'recording'
          await this.persist()
        },
      )
      await this.page.exposeFunction('szRecordingFailure', async () => {
        this.manifest.error =
          'A captura foi interrompida; os segmentos confirmados foram preservados.'
        this.manifest.gaps.push({ at: new Date().toISOString(), reason: 'failure' })
        this.desired = 'paused'
        if (this.timer) clearInterval(this.timer)
        this.timer = null
        // Immediate browser close proves capture stopped, without waiting for the command queue.
        const browser = this.browser
        try {
          await browser?.close()
          this.browser = null
          this.page = null
          this.captureStopped = true
        } finally {
          // A failed remote close must still publish the recording failure, while
          // retaining the browser handle and captureStopped:false for a retry.
          this.manifest.state = 'failed'
          await this.persist()
        }
      })
      await this.page.setContent(
        '<!doctype html><html lang="pt-BR"><title>Sistema Zero · Gravador</title><body style="margin:0"></body></html>',
      )
      await this.page.evaluate(
        installReceiverPage,
        await this.infrastructure.iceServers(command.hardEndsAt),
      )
      const response = await this.sfu(
        `/sessions/${encodeURIComponent(this.sessionId)}/tracks/new`,
        'POST',
        {
          tracks: command.sources.map((source) => ({
            location: 'remote',
            sessionId: source.sessionId,
            trackName: source.trackName,
          })),
        },
      )
      this.mids = (response.tracks ?? []).flatMap((track) =>
        track.mid && !track.errorCode ? [track.mid] : [],
      )
      await this.supervise(command.hardEndsAt, false)
      if (
        response.tracks?.length !== command.sources.length ||
        response.tracks.some((track) => track.errorCode || !track.mid) ||
        response.sessionDescription?.type !== 'offer'
      )
        throw new Error('Recorder input allocation failed')
      const bindings = response.tracks.map((track, index) => ({
        mid: track.mid!,
        kind: command.sources[index]!.kind,
      }))
      const answer = await this.page.evaluate(
        ({ bindings, description }) => window.szRecorder.offer(bindings, description),
        { bindings, description: response.sessionDescription },
      )
      await this.sfu(`/sessions/${encodeURIComponent(this.sessionId)}/renegotiate`, 'PUT', {
        sessionDescription: answer,
      })
      this.captureStopped = false
      await this.page.evaluate(() => window.szRecorder.start())
      this.timer = setInterval(() => {
        if (Date.now() >= this.leaseEndsAt || !this.browser?.browser.isConnected()) {
          this.desired = 'paused'
          void this.pause('failure').catch(() => undefined)
        } else if (!this.heartbeatPending) {
          this.heartbeatPending = true
          void this.browser
            .renew(this.leaseEndsAt)
            .then(() => this.supervise(command.hardEndsAt, false))
            .catch(() => this.pause('failure'))
            .finally(() => {
              this.heartbeatPending = false
            })
        }
      }, 3000)
    } catch (error) {
      await this.pause('failure').catch(() => undefined)
      this.manifest.state = 'failed'
      this.manifest.error = 'Não foi possível iniciar a captura.'
      await this.persist()
      throw error
    }
  }

  private async pause(reason: 'pause' | 'source-change' | 'failure'): Promise<void> {
    if (this.pausing) return this.pausing
    this.pausing = this.pauseOnce(reason)
    try {
      await this.pausing
    } finally {
      this.pausing = null
    }
  }

  private async pauseOnce(reason: 'pause' | 'source-change' | 'failure'): Promise<void> {
    if (this.captureStopped && !this.browser && this.manifest.state === 'paused') return
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    let failure: unknown
    const page = this.page,
      browser = this.browser
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      if (page)
        await Promise.race([
          page.evaluate(() => window.szRecorder.close()),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error('Recorder flush timeout')), 12_000)
          }),
        ])
    } catch (error) {
      failure = error
    } finally {
      clearTimeout(timeout)
    }
    // Retain ownership on a failed close; a later pause must retry and must not ACK captureStopped.
    try {
      await browser?.close()
    } catch (error) {
      this.captureStopped = false
      this.manifest.state = 'failed'
      this.manifest.error = 'O encerramento da captura ainda não foi confirmado.'
      await this.persist()
      throw error
    }
    this.page = null
    this.browser = null
    this.captureStopped = true
    if (this.sessionId && this.mids.length) {
      const closed = await this.sfu(
        `/sessions/${encodeURIComponent(this.sessionId)}/tracks/close`,
        'PUT',
        { force: true, tracks: this.mids.map((mid) => ({ mid })) },
      ).catch(() => null)
      if (
        this.mids.some(
          (mid) => !closed?.tracks?.some((track) => track.mid === mid && !track.errorCode),
        )
      )
        failure = new Error('Recorder resources not confirmed closed')
    }
    if (this.supervised)
      await this.supervise(
        new Date(Math.max(this.leaseEndsAt, Date.now() + 1000)).toISOString(),
        true,
      ).catch(() => undefined)
    this.manifest.gaps.push({ at: new Date().toISOString(), reason })
    this.manifest.state = failure ? 'failed' : 'paused'
    if (failure)
      this.manifest.error = 'A captura parou; há segmentos ou conexões que precisam de conferência.'
    await this.persist()
  }

  private async finalize(): Promise<void> {
    if (this.manifest.state === 'review') return
    this.manifest.state = 'processing'
    await this.persist()
    try {
      this.manifest.replayKey = await this.store.finalize()
      this.manifest.state = 'review'
      await this.persist()
      await this.store.releaseLocalFiles()
    } catch (error) {
      this.manifest.state = 'failed'
      this.manifest.error = 'Não foi possível consolidar o replay; os segmentos foram preservados.'
      await this.persist()
      throw error
    }
  }

  private async persist(): Promise<void> {
    this.manifest.eventSequence++
    const snapshot = structuredClone(this.manifest)
    const next = this.persistence
      .catch(() => undefined)
      .then(async () => {
        await this.store.persistManifest(snapshot)
        await this.infrastructure.onState(snapshot)
      })
    this.persistence = next
    await next
  }

  private async supervise(hardEndsAt: string, retired: boolean): Promise<void> {
    const response = await fetch(
      `${this.infrastructure.supervisorUrl.replace(/\/$/, '')}/connections/${this.connectionId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.infrastructure.supervisorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId: this.connectionId,
          generation: this.manifest.generation,
          sessionId: this.sessionId,
          leaseEndsAt: Math.min(Date.now() + 15_000, this.leaseEndsAt),
          hardEndsAt: Date.parse(hardEndsAt),
          retired,
          mids: this.mids,
        }),
        signal: AbortSignal.timeout(5000),
      },
    )
    if (!response.ok) throw new Error('Recorder supervision unavailable')
    const body = (await response.json()) as { retired?: boolean }
    if (!retired && body.retired) throw new Error('Recorder connection retired')
    this.supervised = true
  }

  private async sfu(
    path: string,
    method: string,
    body?: unknown,
  ): Promise<{
    sessionId?: string
    sessionDescription?: RTCSessionDescriptionInit
    tracks?: { mid?: string; errorCode?: string }[]
  }> {
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/apps/${encodeURIComponent(this.infrastructure.sfuAppId)}${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${this.infrastructure.sfuAppSecret}`,
          'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(10_000),
      },
    )
    if (!response.ok) throw new Error('Recorder SFU request failed')
    const result = (await response.json()) as {
      errorCode?: string
      sessionId?: string
      sessionDescription?: RTCSessionDescriptionInit
      tracks?: { mid?: string; errorCode?: string }[]
    }
    if (result.errorCode) throw new Error('Recorder SFU operation failed')
    return result
  }
}
