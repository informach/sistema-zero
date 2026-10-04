import type { snapshot } from './dom'
import {
  ANALYTICS_CLEANUP_COOKIE,
  ANALYTICS_PREFERENCE_COOKIE,
  analyticsEnabled,
} from './preference'
import { ANALYTICS_PREFERENCE_DAYS } from './types'

declare global {
  interface Window {
    __szAnalyticsSnapshot?: () => ReturnType<typeof snapshot>
  }
}

export function setupAnalytics() {
  const controls = document.querySelector<HTMLElement>('#sz-metrics-controls')
  const notice = document.querySelector<HTMLElement>('#sz-metrics-notice')
  const manage = document.querySelector<HTMLButtonElement>('#sz-metrics-manage')
  const error = document.querySelector<HTMLElement>('#sz-metrics-error')
  if (!controls || !notice || !manage || !error || controls.dataset.ready) return
  controls.dataset.ready = 'true'
  const config = {
    path: controls.dataset.path!,
    publicText: controls.dataset.public === 'true',
    definition: controls.dataset.quiz || '',
    release: controls.dataset.release || '',
  }
  window.__szAnalyticsSnapshot = async () =>
    (await import('./dom')).snapshot(config.publicText, config.definition, config.release)
  let stop: (() => Promise<void>) | undefined
  let starting: AbortController | undefined
  let generation = 0
  const cookie = (name: string) =>
    document.cookie
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${name}=`))
      ?.split('=')[1]
  const choice = () => cookie(ANALYTICS_PREFERENCE_COOKIE)
  // Without first-party cookies a visitor can be neither identified nor opted out:
  // every session opening would create another visitor. Never collect in that case.
  const enabled = () => navigator.cookieEnabled && analyticsEnabled(choice())
  const pendingDeletion = () => choice() === 'rejected' && Boolean(cookie(ANALYTICS_CLEANUP_COOKIE))
  const writeCookie = (name: string, value: string) => {
    // biome-ignore lint/suspicious/noDocumentCookie: synchronous opt-out must also work in browsers without Cookie Store.
    document.cookie = `${name}=${value}; Path=/; SameSite=Lax; Max-Age=${ANALYTICS_PREFERENCE_DAYS * 86400}${location.protocol === 'https:' ? '; Secure' : ''}`
  }
  const showError = (activating = false) => {
    // Visible before the text changes, so screen readers announce the status.
    error.hidden = false
    error.textContent =
      activating && !enabled()
        ? 'Não foi possível ativar as métricas agora. Tente novamente.'
        : pendingDeletion()
          ? 'Métricas desativadas. A exclusão dos dados será tentada novamente ao recarregar a página ou reconectar.'
          : 'Não foi possível salvar. Tente novamente.'
  }
  const savePreference = async (value: string) => {
    // AbortController + setTimeout: AbortSignal.timeout does not exist before Safari 16.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch('/api/analytics/consent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ choice: value }),
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('preference')
    } finally {
      clearTimeout(timer)
    }
  }
  const channel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('sz-metrics-consent') : null
  let deleting: Promise<void> | undefined
  function retryDeletion() {
    if (!pendingDeletion()) return Promise.resolve()
    deleting ??= savePreference('rejected')
      .then(() => {
        error!.hidden = true
        updateControls()
        // Other tabs may still show the pending-deletion message.
        channel?.postMessage('cleaned')
      })
      .finally(() => {
        deleting = undefined
      })
    return deleting
  }
  const close = () => {
    const hadFocus = notice.contains(document.activeElement)
    notice.hidden = true
    manage.setAttribute('aria-expanded', 'false')
    if (hadFocus) manage.focus()
  }
  function updateControls() {
    const on = enabled()
    const state = document.querySelector('#sz-metrics-state')
    if (state)
      state.textContent = !navigator.cookieEnabled
        ? 'Métricas desativadas: este navegador bloqueia cookies.'
        : on
          ? 'Métricas ativadas neste navegador.'
          : pendingDeletion()
            ? 'Métricas desativadas neste navegador. A exclusão dos dados ainda está pendente.'
            : 'Métricas desativadas neste navegador.'
    controls!.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => {
      button.hidden = !navigator.cookieEnabled || on === (button.dataset.choice === 'accepted')
    })
    if (!pendingDeletion() && error!.textContent?.startsWith('Métricas desativadas'))
      error!.hidden = true
  }
  async function refresh() {
    const current = ++generation
    starting?.abort()
    void stop?.()
    stop = undefined
    close()
    updateControls()
    void retryDeletion().catch(() => showError())
    if (enabled()) {
      const { startCollector } = await import('./collector')
      if (current !== generation) return
      starting = new AbortController()
      const cleanup = await startCollector(config, starting.signal)
      if (current === generation) stop = cleanup
      else void cleanup()
    }
  }
  channel?.addEventListener('message', (event) => {
    if (event.data === 'cleaned') updateControls()
    else void refresh().catch(() => {})
  })
  manage.addEventListener('click', () => {
    updateControls()
    notice.hidden = !notice.hidden
    manage.setAttribute('aria-expanded', String(!notice.hidden))
    if (!notice.hidden) notice.querySelector<HTMLButtonElement>('button:not([hidden])')?.focus()
  })
  document.querySelector('#sz-metrics-close')?.addEventListener('click', close)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !notice.hidden) close()
  })
  controls.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => {
    button.addEventListener('click', async () => {
      const activating = button.dataset.choice !== 'rejected'
      // Stop immediately on refusal, even if the deletion request needs retrying.
      ++generation
      starting?.abort()
      const stopped = stop?.()
      stop = undefined
      const buttons = controls.querySelectorAll<HTMLButtonElement>('[data-choice]')
      // The clicked button disappears once the choice applies; keep focus in the panel.
      document.querySelector<HTMLButtonElement>('#sz-metrics-close')?.focus()
      buttons.forEach((b) => {
        b.disabled = true
      })
      try {
        error.hidden = true
        if (!activating) {
          // Persist the explicit choice before network IO, so reloads and other
          // tabs cannot silently resume collection after a failed deletion.
          writeCookie(ANALYTICS_PREFERENCE_COOKIE, 'rejected')
          writeCookie(ANALYTICS_CLEANUP_COOKIE, '1')
          updateControls()
          channel?.postMessage('changed')
          // A session opening already on the server creates a visitor; wait for its
          // cookie so the deletion reaches it instead of leaving an orphan behind.
          await Promise.race([stopped, new Promise((resolve) => setTimeout(resolve, 5000))])
          await retryDeletion()
        } else {
          await retryDeletion()
          await savePreference('accepted')
        }
        channel?.postMessage('changed')
        await refresh()
        const live = document.querySelector('#sz-metrics-live')
        if (live)
          live.textContent = enabled()
            ? 'Métricas ativadas neste navegador.'
            : 'Métricas desativadas neste navegador.'
      } catch {
        showError(activating)
      } finally {
        buttons.forEach((b) => {
          b.disabled = false
        })
      }
    })
  })
  // Returning from the browser's page cache must honor preferences changed in another page.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) void refresh().catch(() => {})
  })
  window.addEventListener('online', () => {
    void retryDeletion().catch(() => showError())
  })
  void refresh().catch(() => {})
}
