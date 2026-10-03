import { leadAttributionFromLocation } from '../lib/lead-attribution'
import { describe, discover, elementId, pageRevision } from './dom'
import type { AnalyticsBootstrap, AnalyticsEventName, BrowserAnalyticsEvent } from './types'

interface Config {
  path: string
  publicText: boolean
  definition: string
  release: string
}
export async function startCollector(config: Config): Promise<() => void> {
  let active = true
  let session: AnalyticsBootstrap | null = null
  let sending = false
  let bootstrap: Promise<boolean> | null = null
  let revision = await pageRevision(config.publicText, config.definition, config.release)
  const pageViewId = crypto.randomUUID()
  const queue: BrowserAnalyticsEvent[] = []
  const seen = new Set<string>()
  const timers = new Map<Element, ReturnType<typeof setTimeout>>()
  const observed = new WeakSet<Element>()
  const controller = new AbortController()
  let nextRetry = 0
  let failures = 0
  let refreshTimer: ReturnType<typeof setTimeout> | undefined
  const post = (action: string, body: unknown) =>
    fetch(`/api/analytics/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    })
  const emit = (name: AnalyticsEventName, data: Partial<BrowserAnalyticsEvent> = {}) => {
    if (!active || queue.length >= 200) return
    queue.push({
      id: crypto.randomUUID(),
      pageViewId,
      name,
      path: config.path,
      revision,
      at: new Date().toISOString(),
      viewport: Math.max(240, Math.min(3840, innerWidth)),
      ...data,
    })
  }
  async function ensureSession() {
    if (session && Date.parse(session.expiresAt) > Date.now() + 5000) return true
    if (bootstrap) return bootstrap
    bootstrap = (async () => {
      let referrerHost: string | undefined
      try {
        referrerHost = document.referrer ? new URL(document.referrer).hostname : undefined
      } catch {
        /* no referrer */
      }
      const response = await post('session', {
        path: config.path,
        quizDefinitionId: config.definition || undefined,
        attribution: leadAttributionFromLocation(location),
        device: innerWidth < 640 ? 'mobile' : innerWidth < 1024 ? 'tablet' : 'desktop',
        referrerHost,
      })
      if (!response.ok) return false
      const next = (await response.json()) as AnalyticsBootstrap
      // Old-session events are not attributed to a new session after inactivity.
      if (session && next.sessionId !== session.sessionId) {
        queue.length = 0
        seen.clear()
        emit('page_view')
      }
      session = next
      return true
    })().finally(() => {
      bootstrap = null
    })
    return bootstrap
  }
  function batchToSend() {
    const batch: BrowserAnalyticsEvent[] = []
    for (const event of queue.slice(0, 40)) {
      if (new TextEncoder().encode(JSON.stringify([...batch, event])).length > 12000) break
      batch.push(event)
    }
    return batch
  }
  async function flush(urgent = false) {
    if (!active || !queue.length) return
    if (sending || Date.now() < nextRetry) {
      // A click queued while another request is in flight must survive navigation.
      // Repeated IDs are safe: PostgreSQL acknowledges them without duplicating.
      if (urgent && session) {
        try {
          await post('events', { sessionId: session.sessionId, events: batchToSend() })
        } catch {
          /* keepalive is best-effort */
        }
      }
      return
    }
    sending = true
    try {
      if (!(await ensureSession()) || !session || !active) throw new Error('session')
      const batch = batchToSend()
      const response = await post('events', { sessionId: session.sessionId, events: batch })
      if (response.status === 401) {
        session = null
        queue.length = 0
        seen.clear()
        emit('page_view')
        return
      }
      if (response.status === 400) {
        queue.splice(0, batch.length)
        return
      }
      if (!response.ok) throw new Error('delivery')
      const result = (await response.json()) as { accepted: string[] }
      const acknowledged = new Set(result.accepted)
      for (let i = queue.length - 1; i >= 0; i--)
        if (acknowledged.has(queue[i]!.id)) queue.splice(i, 1)
      session.expiresAt = new Date(Date.now() + 30 * 60000).toISOString()
      failures = 0
      nextRetry = 0
    } catch {
      nextRetry = Date.now() + Math.min(60000, 1000 * 2 ** Math.min(++failures, 6))
    } finally {
      sending = false
    }
  }
  function exposure(el: Element) {
    if (!el.isConnected || document.hidden) return
    const data = describe(el, config.publicText)
    const questionId = el.getAttribute('data-analytics-question')
    const name = questionId
      ? 'quiz_question_view'
      : el.matches('section, main, [data-analytics-section]')
        ? 'section_view'
        : 'element_view'
    const key = `${revision}:${name}:${data.elementId}:${questionId || ''}`
    if (seen.has(key)) return
    seen.add(key)
    emit(name, {
      ...data,
      ...(questionId
        ? {
            questionId,
            quizDefinitionId: el.getAttribute('data-analytics-quiz') || config.definition,
            quizAttemptId: el.getAttribute('data-analytics-attempt') || undefined,
            position: Number(el.getAttribute('data-analytics-position')) || 1,
          }
        : {}),
    })
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target
        clearTimeout(timers.get(el))
        timers.delete(el)
        // Tall sections use intersection area, without requiring half the whole section.
        if (
          entry.isIntersecting &&
          entry.intersectionRect.height >= Math.min(80, entry.boundingClientRect.height / 2)
        )
          timers.set(
            el,
            setTimeout(() => {
              exposure(el)
              timers.delete(el)
            }, 1000),
          )
      }
    },
    { threshold: [0, 0.1, 0.5, 1] },
  )
  const scan = () => {
    for (const el of discover())
      if (!observed.has(el)) {
        observed.add(el)
        observer.observe(el)
      }
  }
  const mutations = new MutationObserver((records) => {
    if (
      !records.some(
        (r) =>
          !(r.target instanceof Element ? r.target : r.target.parentElement)?.closest(
            '#sz-metrics-controls',
          ),
      )
    )
      return
    clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      void pageRevision(config.publicText, config.definition, config.release).then((next) => {
        if (!active) return
        revision = next
        scan()
        // React often reuses the question wrapper; observe its new question key.
        for (const el of Array.from(document.querySelectorAll('[data-analytics-question]'))) {
          const r = el.getBoundingClientRect()
          if (r.top < innerHeight && r.bottom > 0) exposure(el)
        }
      })
    }, 200)
  })
  mutations.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-analytics-question', 'data-analytics-id', 'href'],
  })
  const listen = (name: string, callback: EventListener, capture = true) =>
    document.addEventListener(name, callback, { signal: controller.signal, capture })
  listen('click', (event) => {
    const el =
      event.target instanceof Element
        ? event.target.closest('a[href],button,summary,[data-analytics-id]')
        : null
    if (
      !el ||
      el.closest('#sz-metrics-controls, [data-analytics-private], form, dialog, [role="dialog"]')
    )
      return
    exposure(el)
    const question = el.closest('[data-analytics-question]')
    if (question) exposure(question)
    const mouse = event as MouseEvent
    const r = el.getBoundingClientRect()
    const point =
      config.publicText && mouse.detail > 0 && r.width && r.height
        ? {
            x: Math.round(Math.max(0, Math.min(1, (mouse.clientX - r.left) / r.width)) * 10000),
            y: Math.round(Math.max(0, Math.min(1, (mouse.clientY - r.top) / r.height)) * 10000),
          }
        : {}
    emit('click', { ...describe(el, config.publicText), ...point })
    if (el.hasAttribute('data-zoom')) emit('image_zoom', describe(el, config.publicText))
    void flush()
  })
  listen('toggle', (event) => {
    if (event.target instanceof HTMLDetailsElement && event.target.open) {
      const summary = event.target.querySelector('summary')
      if (summary) emit('details_open', describe(summary, config.publicText))
    }
  })
  listen('play', (event) => {
    if (event.target instanceof HTMLVideoElement)
      emit('video_start', describe(event.target, config.publicText))
  })
  listen('timeupdate', (event) => {
    if (!(event.target instanceof HTMLVideoElement) || !Number.isFinite(event.target.duration))
      return
    const video = event.target
    const progress = Math.floor((video.currentTime / video.duration) * 4) * 25
    const key = `video:${elementId(video)}:${progress}`
    if (progress > 0 && !seen.has(key)) {
      seen.add(key)
      emit('video_progress', { ...describe(video, config.publicText), progress })
    }
  })
  listen('invalid', () => emit('form_error', { errorCode: 'validation' }))
  listen('visibilitychange', () => {
    if (document.hidden) {
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
      void flush(true)
    } else {
      observer.disconnect()
      for (const el of discover()) observer.observe(el)
    }
  })
  window.addEventListener(
    'pagehide',
    () => {
      void flush(true)
    },
    { signal: controller.signal },
  )
  emit('page_view')
  scan()
  void flush()
  const interval = setInterval(() => {
    void flush()
  }, 5000)
  return () => {
    active = false
    queue.length = 0
    controller.abort()
    observer.disconnect()
    mutations.disconnect()
    clearInterval(interval)
    clearTimeout(refreshTimer)
    for (const timer of timers.values()) clearTimeout(timer)
  }
}
