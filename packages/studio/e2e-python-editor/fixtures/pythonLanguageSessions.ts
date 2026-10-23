import { test as base, expect, type Page, type Request, type Response } from '@playwright/test'
import type {} from './bridge'

interface OwnedPythonLanguageSessions {
  openedIdCount(): Promise<number>
  /** null means the reservation set changed during the metrics read, so poll must observe again. */
  aliveIdCount(): Promise<number | null>
  /** Replaces only UI teardown; lease collection and owned-ID checks remain mandatory. */
  releaseWith(callback: () => Promise<void>): void
  /** Register an additional QA-owned page before it can reserve any sessions. Idempotent. */
  observePage(page: Page): void
}

const route = '/api/studio/python-language'
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/** Observes real reservation replies; never creates, closes or resets server leases itself. */
export const test = base.extend<{ pythonLanguageSessions: OwnedPythonLanguageSessions }>({
  pythonLanguageSessions: [
    async ({ page, request, baseURL }, use, testInfo) => {
      if (!baseURL) throw new Error('The language ownership probe requires its own server baseURL.')
      const origin = new URL(baseURL).origin
      const ids = new Set<string>()
      const reservations = new Set<Request>()
      const parsing = new Set<Promise<void>>()
      const collectionErrors: string[] = []
      const observedPages = new Set<Page>()
      let collectionVersion = 0
      let releaseUI = async () => {
        if (!page.isClosed()) await page.evaluate(() => globalThis.pythonBridgeProbe?.unmount())
      }
      function isReservation(candidate: Request) {
        const url = new URL(candidate.url())
        return candidate.method() === 'POST' && url.origin === origin && url.pathname === route
      }
      function started(candidate: Request) {
        if (isReservation(candidate)) {
          reservations.add(candidate)
          collectionVersion++
        }
      }
      async function collect(response: Response) {
        const raw: unknown = await response.json()
        if (
          !isRecord(raw) ||
          raw.transportVersion !== 1 ||
          typeof raw.status !== 'number' ||
          !Number.isInteger(raw.status) ||
          raw.status < 100 ||
          raw.status > 599
        )
          throw new Error('Invalid real language reservation transport envelope.')
        if (!response.ok() || raw.status < 200 || raw.status >= 300) return
        if (
          !isRecord(raw.body) ||
          raw.body.version !== 1 ||
          typeof raw.body.sessionId !== 'string' ||
          !/^[a-f0-9]{32}$/.test(raw.body.sessionId) ||
          typeof raw.body.projectId !== 'string'
        )
          throw new Error('Successful language reservation did not expose its owned session ID.')
        const input: unknown = response.request().postDataJSON()
        if (
          !isRecord(input) ||
          !isRecord(input.authorization) ||
          !isRecord(input.authorization.subject) ||
          input.authorization.subject.id !== raw.body.projectId
        )
          throw new Error('The reservation reply belongs to another project.')
        if (ids.has(raw.body.sessionId))
          throw new Error('A reservation reused an owned session ID.')
        ids.add(raw.body.sessionId)
      }
      function received(response: Response) {
        const candidate = response.request()
        if (!isReservation(candidate)) return
        const pending: Promise<void> = collect(response)
          .catch((error: unknown) => {
            collectionErrors.push(error instanceof Error ? error.message : String(error))
          })
          .finally(() => {
            reservations.delete(candidate)
            parsing.delete(pending)
            collectionVersion++
          })
        parsing.add(pending)
      }
      function failed(candidate: Request) {
        if (!isReservation(candidate)) return
        reservations.delete(candidate)
        collectionVersion++
        // A failed reply could hide a reservation; do not certify cleanup without its ID.
        collectionErrors.push(`Reservation transport failed: ${candidate.failure()?.errorText}`)
      }
      function assertCollected() {
        if (collectionErrors.length) throw new Error(collectionErrors.join('\n'))
      }
      async function settleCollection(checkErrors = true) {
        await expect.poll(() => reservations.size + parsing.size, { timeout: 10_000 }).toBe(0)
        if (checkErrors) assertCollected()
      }
      async function metrics() {
        const response = await request.get(`${route}/metrics`, { timeout: 5000 })
        if (!response.ok()) throw new Error(`Language metrics returned ${response.status()}.`)
        const raw: unknown = await response.json()
        if (!isRecord(raw) || !Array.isArray(raw.sessions))
          throw new Error('Language metrics omitted the session identity list.')
        const alive = new Set<string>()
        for (const entry of raw.sessions) {
          if (
            !isRecord(entry) ||
            typeof entry.id !== 'string' ||
            !/^[a-f0-9]{32}$/.test(entry.id) ||
            typeof entry.projectId !== 'string' ||
            typeof entry.started !== 'boolean' ||
            alive.has(entry.id)
          )
            throw new Error('Invalid or repeated identity in language metrics.')
          alive.add(entry.id)
        }
        return { raw, alive }
      }
      async function ownedAliveCount(checkErrors: boolean) {
        await settleCollection(checkErrors)
        const version = collectionVersion
        const { alive } = await metrics()
        await settleCollection(checkErrors)
        // Playwright poll retries matcher failures, not exceptions from its callback.
        // An unstable read must not become either a false zero or a terminal collection error.
        if (version !== collectionVersion) return null
        return [...ids].filter((id) => alive.has(id)).length
      }
      function observePage(observed: Page) {
        if (observedPages.has(observed)) return
        if (observed.isClosed()) throw new Error('Cannot observe an already closed QA page.')
        observedPages.add(observed)
        observed.on('request', started)
        observed.on('response', received)
        observed.on('requestfailed', failed)
      }
      observePage(page)
      let cleanupError: unknown
      try {
        await use({
          async openedIdCount() {
            await settleCollection()
            return ids.size
          },
          aliveIdCount: () => ownedAliveCount(true),
          releaseWith(callback) {
            releaseUI = callback
          },
          observePage,
        })
      } finally {
        try {
          // Bridge is the default; another QA host may register its public close callback.
          await releaseUI()
        } catch (error: unknown) {
          cleanupError = error
        }
        try {
          // Even malformed replies must not prevent verification of the IDs we did obtain.
          await settleCollection(false)
          await expect.poll(() => ownedAliveCount(false), { timeout: 10_000 }).toBe(0)
          assertCollected()
        } catch (error: unknown) {
          cleanupError =
            cleanupError === undefined
              ? error
              : new AggregateError([cleanupError, error], 'UI release and ownership checks failed.')
        }
        try {
          let globalMetrics: unknown
          try {
            globalMetrics = (await metrics()).raw
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error)
            globalMetrics = { observationError: message }
            cleanupError ??= error
          }
          await testInfo.attach('python-language-owned-sessions', {
            body: JSON.stringify({
              ownedIds: [...ids],
              collectionErrors,
              globalMetrics,
              cleanupError:
                cleanupError instanceof Error
                  ? cleanupError.message
                  : cleanupError === undefined
                    ? null
                    : String(cleanupError),
            }),
            contentType: 'application/json',
          })
        } catch (error: unknown) {
          cleanupError ??= error
        } finally {
          for (const observed of observedPages) {
            observed.off('request', started)
            observed.off('response', received)
            observed.off('requestfailed', failed)
          }
          observedPages.clear()
        }
      }
      // Preserve a rejected test body; report cleanup failure separately when use() succeeded.
      if (cleanupError !== undefined) throw cleanupError
    },
    { auto: true, timeout: 30_000 },
  ],
})
export { expect } from '@playwright/test'
