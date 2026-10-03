import type { snapshot } from './dom'

declare global {
  interface Window {
    __szAnalyticsSnapshot?: () => ReturnType<typeof snapshot>
  }
}

export function setupConsent() {
  const controls = document.querySelector<HTMLElement>('#sz-metrics-controls')
  const notice = document.querySelector<HTMLElement>('#sz-metrics-notice')
  if (!controls || !notice || controls.dataset.ready) return
  controls.dataset.ready = 'true'
  const config = {
    path: controls.dataset.path!,
    publicText: controls.dataset.public === 'true',
    definition: controls.dataset.quiz || '',
    release: controls.dataset.release || '',
  }
  window.__szAnalyticsSnapshot = async () =>
    (await import('./dom')).snapshot(config.publicText, config.definition, config.release)
  let stop: (() => void) | undefined
  let generation = 0
  const choice = () =>
    document.cookie
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('sz_metrics='))
      ?.split('=')[1]
  async function refresh() {
    const current = ++generation
    stop?.()
    stop = undefined
    notice!.hidden = Boolean(choice())
    if (choice() === 'accepted') {
      const { startCollector } = await import('./collector')
      if (current !== generation) return
      const cleanup = await startCollector(config)
      if (current === generation) stop = cleanup
      else cleanup()
    }
  }
  const channel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('sz-metrics-consent') : null
  channel?.addEventListener('message', () => {
    void refresh()
  })
  document.querySelector('#sz-metrics-manage')?.addEventListener('click', () => {
    notice.hidden = false
  })
  controls.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => {
    button.addEventListener('click', async () => {
      // Stop immediately on refusal, even if the deletion request needs retrying.
      ++generation
      stop?.()
      stop = undefined
      const buttons = controls.querySelectorAll<HTMLButtonElement>('[data-choice]')
      buttons.forEach((b) => {
        b.disabled = true
      })
      try {
        const response = await fetch('/api/analytics/consent', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ choice: button.dataset.choice }),
          referrerPolicy: 'no-referrer',
        })
        if (!response.ok) throw new Error('consent')
        channel?.postMessage('changed')
        await refresh()
      } catch {
        document.querySelector<HTMLElement>('#sz-metrics-error')!.hidden = false
      } finally {
        buttons.forEach((b) => {
          b.disabled = false
        })
      }
    })
  })
  void refresh().catch(() => {})
}
