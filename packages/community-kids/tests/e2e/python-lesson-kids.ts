// Standalone serial Kids gate. Admin Next must already be stopped by its exact owned controller.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { freemem } from 'node:os'
import { resolve } from 'node:path'
import { type Browser, type BrowserContext, chromium, expect, type Page } from '@playwright/test'
import { studioSourceAtPath } from '@sistemazero/core/studio/code-anchor'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import { StudioRuntimeSelectionSchema } from '@sistemazero/core/studio/project-environment'
import {
  StudioLiveRuntimeDecisionSchema,
  StudioLiveRuntimeRequestSchema,
} from '@sistemazero/core/studio/runtime-authorization'
import { z } from 'zod'
import { editPythonMain, pythonLessonSource, runPythonLessonPreview } from './python-lesson-admin'
import { cleanupPythonLessonBrowser, failPythonLessonCleanup } from './python-lesson-cleanup'

const workspaceSchema = z.object({
  id: z.uuid(),
  sessionId: z.uuid(),
  learnerId: z.uuid(),
  revision: z.number().int().nonnegative(),
  writerEpoch: z.number().int().nonnegative(),
  writerId: z.uuid(),
  writerDeviceId: z.uuid().nullable(),
  leaseExpiresAt: z.string().nullable(),
  project: StudioProjectDocumentSchema,
  readOnly: z.boolean().optional(),
})

async function main() {
  const [adminReceiptPath, outputPath] = process.argv.slice(2)
  assert(
    adminReceiptPath && outputPath,
    'Usage: bun python-lesson-kids.ts <passed-admin-receipt.json> <new-output-dir>',
  )
  const admin = z
    .object({
      state: z.literal('passed-admin-authoring-and-rehearsal-kids-pending'),
      source: z.string(),
      kind: z.enum(['classic', 'pro']),
      providerOrigin: z.url(),
      runtime: StudioRuntimeSelectionSchema,
      fixture: z.object({
        state: z.literal('enrolled-before-call'),
        sessionId: z.uuid(),
        enrollmentId: z.uuid(),
        learnerPath: z.string(),
      }),
    })
    .parse(JSON.parse(await readFile(resolve(adminReceiptPath), 'utf8')))
  assert.equal(admin.fixture.learnerPath, `/oficinas/aulas/${admin.fixture.sessionId}`)
  assert.notEqual(admin.fixture.enrollmentId, '45b69128-70b1-4b56-9b90-4e8cadb499bf')
  const email = process.env.STUDIO_LESSONS_QA_PARENT_EMAIL
  const password = process.env.STUDIO_LESSONS_QA_PARENT_PASSWORD
  const learnerId = z.uuid().parse(process.env.STUDIO_LESSONS_QA_LEARNER_ID)
  assert(email && password, 'Parent QA credentials stay only in process/browser memory')
  assert(freemem() >= 4096 * 1024 * 1024, 'Browser admission requires 4096 MiB available')
  const origin = 'http://localhost:43108'
  const out = resolve(outputPath)
  await mkdir(out)
  const marker = `qa-python-${randomUUID()}`
  const source = pythonLessonSource(marker)
  const receipt = {
    state: 'starting',
    startedAt: new Date().toISOString(),
    scope: `Python v3 ${admin.kind} Kids before-call owner/save/reopen/Turtle/Stop/stale revision/takeover; no media/audio/revocation approval`,
    kind: admin.kind,
    marker,
    source,
    runtime: admin.runtime,
    sessionId: admin.fixture.sessionId,
    workspace: null as z.infer<typeof workspaceSchema> | null,
    checks: [] as string[],
    pageErrors: [] as string[],
    consoleErrors: [] as string[],
    denials: [] as { path: string; status: number; message: string }[],
    cleanup: [] as string[],
    decisions: [] as {
      request: z.infer<typeof StudioLiveRuntimeRequestSchema>
      decision: z.infer<typeof StudioLiveRuntimeDecisionSchema>
    }[],
    failure: null as string | null,
  }
  const save = () =>
    writeFile(resolve(out, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
  await save()
  let browser: Browser | undefined, context: BrowserContext | undefined, page: Page | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let listenerFailure: unknown
  const pending = new Set<Promise<void>>()
  const providerOrigin = new URL(admin.providerOrigin).origin
  assert.equal(providerOrigin, admin.providerOrigin)
  function observe(target: Page) {
    target.setDefaultTimeout(30_000)
    target.setDefaultNavigationTimeout(60_000)
    target.on('pageerror', (error) => receipt.pageErrors.push(error.message.slice(0, 1500)))
    target.on('console', (message) => {
      if (message.type() === 'error') receipt.consoleErrors.push(message.text().slice(0, 1500))
    })
    target.on('response', (response) => {
      if (!response.url().startsWith(`${origin}/api/live/`)) return
      const path = new URL(response.url()).pathname
      if (response.status() >= 400) {
        const work = (async () => {
          const body = z
            .object({ error: z.object({ message: z.string() }) })
            .parse(await response.json())
          receipt.denials.push({ path, status: response.status(), message: body.error.message })
        })().catch((error) => {
          listenerFailure ??= error
        })
        pending.add(work)
        void work.finally(() => pending.delete(work))
        return
      }
      if (!path.endsWith('/runtime') || response.status() !== 200) return
      const work = (async () => {
        const request = StudioLiveRuntimeRequestSchema.parse(response.request().postDataJSON())
        const decision = StudioLiveRuntimeDecisionSchema.parse(await response.json())
        assert.deepEqual(decision.context, request.context)
        assert.equal(decision.context.sessionId, admin.fixture.sessionId)
        assert.equal(decision.actor.userId, learnerId)
        assert.equal(decision.projectId, request.subject.id)
        assert.equal(decision.revision, request.revision)
        assert.equal(decision.workspaceRevision, request.expectedWorkspaceRevision)
        assert.deepEqual(decision.runtime, admin.runtime)
        const provider = new URL(decision.frame.url).origin
        assert.equal(new URL(provider).hostname, '127.0.0.1')
        assert.deepEqual(decision.frame.allowedOrigins, [provider])
        assert.equal(provider, providerOrigin)
        receipt.decisions.push({ request, decision })
      })().catch((error) => {
        listenerFailure ??= error
      })
      pending.add(work)
      void work.finally(() => pending.delete(work))
    })
  }
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true, timeout: 30_000 })
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const ownedContext = context
    page = await context.newPage()
    observe(page)
    timer = setTimeout(() => {
      receipt.failure ??= 'Deadline: 300 seconds'
      void context?.close().catch((error) => {
        listenerFailure ??= error
      })
    }, 300_000)
    await page.goto(`${origin}/login/responsavel`)
    await page.getByText('Entrar com senha', { exact: true }).click()
    await page.getByLabel('E-mail', { exact: true }).fill(email)
    await page.getByLabel('Senha', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.waitForURL(`${origin}/pais`)
    await page.goto(`${origin}/pais/crianca/${learnerId}`)
    await page.getByRole('button', { name: 'Autorizar aparelho', exact: true }).click()
    await page.getByLabel('Neste aparelho').check()
    await page.getByRole('button', { name: 'Autorizar este aparelho', exact: true }).click()
    await page.getByText(/^Este navegador está liberado para /).waitFor()
    await page
      .getByRole('button', { name: 'Ir para a área da criança', exact: true })
      .first()
      .click()
    await page.waitForURL(`${origin}/perfis`)
    await page.locator(`button[data-entry-focus="${learnerId}"]`).click()
    await page.waitForURL(
      (url) =>
        url.origin === origin &&
        !['/perfis', '/pais'].includes(url.pathname) &&
        !url.pathname.startsWith('/login'),
    )
    receipt.checks.push('real-auth-parent-device-profile')
    const firstClaim = page
      .waitForResponse(
        (response) =>
          response.url().startsWith(`${origin}/api/live/workspaces/`) &&
          new URL(response.url()).pathname.endsWith('/claim') &&
          response.status() === 200,
      )
      .then(
        (response) => ({ response }),
        (error: unknown) => ({ error }),
      )
    await page.goto(origin + admin.fixture.learnerPath)
    const claimResult = await firstClaim
    if ('error' in claimResult) throw claimResult.error
    const opened = workspaceSchema.parse(await claimResult.response.json())
    assert.equal(opened.learnerId, learnerId)
    assert.equal(opened.sessionId, admin.fixture.sessionId)
    assert.equal(opened.readOnly ?? false, false)
    assert.equal(opened.project.programmingLanguage, 'python')
    assert.equal(opened.project.kind, admin.kind)
    assert.deepEqual(opened.project.runtime, admin.runtime)
    assert.equal(studioSourceAtPath(opened.project, 'main.py'), admin.source)
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeVisible({
      timeout: 90_000,
    })
    assert.equal(await page.evaluate(() => crossOriginIsolated), false)
    await editPythonMain(page, source, admin.kind)
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(page.getByText('Guardado na sua conta', { exact: true })).toBeVisible()
    const readCurrent = async () => {
      const response = await ownedContext.request.get(
        `${origin}/api/live/workspaces/${opened.id}?sessionId=${admin.fixture.sessionId}`,
        { maxRedirects: 0, maxRetries: 0 },
      )
      assert.equal(response.status(), 200)
      return workspaceSchema.parse(await response.json())
    }
    const saved = await readCurrent()
    assert(saved.revision > opened.revision)
    assert.equal(saved.project.programmingLanguage, 'python')
    assert.equal(saved.project.kind, admin.kind)
    assert.equal(studioSourceAtPath(saved.project, 'main.py'), source)
    receipt.workspace = saved
    await save()
    await page.goto(origin + admin.fixture.learnerPath)
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeVisible({
      timeout: 90_000,
    })
    const reopened = await readCurrent()
    assert.deepEqual(reopened.project, saved.project)
    assert.equal(reopened.revision, saved.revision)
    await runPythonLessonPreview(page, marker, providerOrigin, false, admin.kind)
    await Promise.all([...pending])
    if (listenerFailure) throw listenerFailure
    const executed = receipt.decisions
      .slice()
      .reverse()
      .find(
        (entry) =>
          entry.request.operation === 'execute' &&
          entry.decision.context.writerEpoch === reopened.writerEpoch,
      )
    assert(executed)
    assert.equal(executed.decision.workspaceRevision, saved.revision)
    receipt.checks.push('keyboard-save-canonical-python-v3-whole-project-reopen-real-frame')
    const staleBody = { ...executed.request, expectedWorkspaceRevision: saved.revision - 1 }
    const stale = await page.evaluate(
      async ({ path, body }) => {
        const binding = document.querySelector<HTMLMetaElement>('meta[name="sz-session"]')?.content
        if (!binding) throw new Error('Current document session binding required')
        const response = await fetch(path, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-sz-session': binding },
          body: JSON.stringify(body),
        })
        return { status: response.status, body: await response.json() }
      },
      { path: `/api/live/workspaces/${saved.id}/runtime`, body: staleBody },
    )
    assert.equal(stale.status, 409)
    assert.equal(
      stale.body?.error?.message,
      'Há uma revisão mais recente deste projeto. Aguarde a sincronização.',
    )
    const afterStale = await readCurrent()
    assert.deepEqual(afterStale.project, saved.project)
    assert.equal(afterStale.revision, saved.revision)
    receipt.checks.push('stale-runtime409-current-document-session-canonical-source-preserved')
    const other = await context.newPage()
    observe(other)
    await other.goto(origin + admin.fixture.learnerPath)
    await expect(
      other.getByText('Seu projeto está aberto em outro computador ou aba.', { exact: true }),
    ).toBeVisible({ timeout: 90_000 })
    const takeoverResponse = other
      .waitForResponse(
        (response) =>
          new URL(response.url()).pathname === `/api/live/workspaces/${saved.id}/claim` &&
          response.request().postDataJSON()?.takeover === true,
      )
      .then(
        (response) => ({ response }),
        (error: unknown) => ({ error }),
      )
    await other.getByRole('button', { name: 'Continuar aqui', exact: true }).click()
    const takeoverResult = await takeoverResponse
    if ('error' in takeoverResult) throw takeoverResult.error
    const takeover = takeoverResult.response
    assert.equal(takeover.status(), 200)
    const claimed = workspaceSchema.parse(await takeover.json())
    assert(claimed.writerEpoch > reopened.writerEpoch)
    assert.notEqual(claimed.writerDeviceId, reopened.writerDeviceId)
    assert.deepEqual(claimed.project, saved.project)
    assert.equal(claimed.revision, saved.revision)
    await expect(page.locator(`iframe[src^="${providerOrigin}/"]`)).toHaveCount(0, {
      timeout: 10_000,
    })
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toHaveCount(0)
    await expect(other.getByRole('button', { name: 'Guardar', exact: true })).toBeVisible()
    await runPythonLessonPreview(other, marker, providerOrigin, true, admin.kind)
    const final = await readCurrent()
    assert.deepEqual(final.project, saved.project)
    assert.equal(final.revision, saved.revision)
    assert.equal(final.writerEpoch, claimed.writerEpoch)
    await other.screenshot({ path: resolve(out, 'takeover-executed-stopped.png'), fullPage: true })
    await writeFile(
      resolve(out, 'authority.json'),
      `${JSON.stringify({ opened, saved, reopened, stale, claimed, final }, null, 2)}\n`,
      { flag: 'wx' },
    )
    receipt.checks.push(
      'real-second-tab-takeover-new-epoch-old-iframe-withdrawn-new-execution-stop',
    )
    assert.deepEqual(receipt.pageErrors, [])
    receipt.state = 'passed-kids-before-call-revocation-media-audio-pending'
  } catch (error) {
    receipt.state = 'failed'
    receipt.failure ??= String(error).slice(0, 3000)
    process.exitCode = 1
    if (page && !page.isClosed())
      await page
        .screenshot({ path: resolve(out, 'failure.png'), fullPage: true })
        .catch((error) => receipt.cleanup.push(`capture-failed: ${String(error).slice(0, 400)}`))
  } finally {
    const failed = (error: unknown) => failPythonLessonCleanup(receipt, error)
    await cleanupPythonLessonBrowser({
      receipt,
      receiptPath: resolve(out, 'receipt.json'),
      context,
      browser,
      pending,
      clearScenarioDeadline: () => clearTimeout(timer),
      detachResponses: () => {
        for (const ownedPage of context?.pages() ?? []) ownedPage.removeAllListeners('response')
      },
      validate: () => {
        if (listenerFailure) failed(listenerFailure)
        if (receipt.pageErrors.length) failed(new Error('Page errors observed'))
        const allowedDenial = (denial: (typeof receipt.denials)[number]) =>
          denial.status === 409 &&
          ((denial.path.endsWith('/runtime') &&
            denial.message ===
              'Há uma revisão mais recente deste projeto. Aguarde a sincronização.') ||
            (denial.path.endsWith('/claim') &&
              denial.message === 'O projeto já está sendo editado. Confirme Continuar aqui.'))
        if (!receipt.denials.every(allowedDenial)) failed(new Error('Unexpected HTTP denial'))
        const conflictMessage =
          'Failed to load resource: the server responded with a status of 409 (Conflict)'
        if (
          receipt.consoleErrors.some((message) => message !== conflictMessage) ||
          receipt.consoleErrors.length > receipt.denials.length
        )
          failed(new Error('Unexpected console error'))
        if (receipt.failure) failed(receipt.failure)
      },
    })
    console.log(
      JSON.stringify({
        state: receipt.state,
        checks: receipt.checks,
        failure: receipt.failure,
        cleanup: receipt.cleanup,
      }),
    )
  }
}

if (import.meta.main) await main()
