// Run with Bun only during an explicitly coordinated browser/services window.
// Imports are inert; fixture guards can be tested without starting a browser.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { type Browser, type BrowserContext, chromium, expect, type Page } from '@playwright/test'
import { StudioRuntimeSelectionSchema } from '@sistemazero/core/studio/project-environment'
import {
  type StudioAuthoringRuntimeContext,
  StudioAuthoringRuntimeDecisionSchema,
  StudioAuthoringRuntimeRequestSchema,
} from '@sistemazero/core/studio/runtime-authorization'
import { z } from 'zod'
import {
  createEmptyPythonLesson,
  enrollPythonLiveLesson,
  type PythonLessonFixture,
  pythonAdminOrigin,
  readOwnedPythonLesson,
  verifyPublishedPythonLesson,
} from '../../../admin/tests/e2e/python-lesson-fixture'
import {
  launchAdmittedPythonLessonBrowser,
  type PythonLessonAdmission,
  readPythonLessonAdmission,
} from './python-lesson-admission'
import { cleanupPythonLessonBrowser, failPythonLessonCleanup } from './python-lesson-cleanup'

export function pythonLessonSource(marker: string) {
  assert.match(marker, /^qa-python-[0-9a-f-]{36}$/)
  return [
    'import turtle',
    'screen = turtle.Screen()',
    'screen.setup(320, 240)',
    'screen.bgcolor("white")',
    'pen = turtle.Turtle()',
    'pen.pencolor("#125abc")',
    'pen.pensize(8)',
    'pen.forward(80)',
    `print("${marker}")`,
    `input("${marker}: ")`,
    'turtle.done()',
    '',
  ].join('\n')
}

export async function editPythonMain(page: Page, source?: string, kind: 'classic' | 'pro' = 'pro') {
  if (kind === 'pro') {
    await page
      .getByRole('navigation', { name: 'Organizar o editor' })
      .getByRole('button', { name: /^(Arquivos|Código e jogo)$/ })
      .click()
    await page.getByRole('treeitem', { name: 'main.py', exact: true }).click()
  } else {
    await page.getByRole('button', { name: 'Ponte', exact: true }).click()
    const sourceTab = page.getByRole('tab', { name: 'Código Python', exact: true })
    if (await sourceTab.count()) await sourceTab.click()
  }
  const input = page.locator('.monaco-editor textarea.inputarea').first()
  await expect(input).toBeVisible()
  if (source !== undefined) {
    await page
      .locator('.monaco-editor .view-lines')
      .first()
      .click({ position: { x: 80, y: 12 } })
    await expect(input).toBeFocused()
    await page.keyboard.press('Control+A')
    await page.keyboard.insertText(source)
  }
  return input
}

/** Read-only frame observation: marker must come from actual Python input(), plus real pixels. */
export async function runPythonLessonPreview(
  page: Page,
  marker: string,
  providerOrigin: string,
  stop = true,
  kind: 'classic' | 'pro' = 'pro',
) {
  if (kind === 'pro') {
    await page
      .getByRole('navigation', { name: 'Organizar o editor' })
      .getByRole('button', { name: /^(Jogo|Ampliar jogo)$/ })
      .click()
  } else {
    const previewTab = page.getByRole('tab', { name: 'Pré-visualização', exact: true })
    if (await previewTab.count()) await previewTab.click()
    const showPreview = page.getByRole('button', { name: 'Mostrar pré-visualização', exact: true })
    if (await showPreview.count()) await showPreview.click()
  }
  const preview = page.locator('[data-python-status]')
  await expect(preview).toHaveCount(1)
  await expect(preview.getByRole('button', { name: /^(Executar|Reiniciar)$/ })).toBeEnabled({
    timeout: 60_000,
  })
  await preview.getByRole('button', { name: /^(Executar|Reiniciar)$/ }).click()
  await expect(preview).toHaveAttribute('data-python-status', 'waiting-input', { timeout: 60_000 })
  await expect(preview.getByLabel(`${marker}:`, { exact: true })).toBeVisible()
  await expect
    .poll(
      async () => {
        for (const frame of page.frames()) {
          if (
            frame === page.mainFrame() ||
            frame.isDetached() ||
            !frame.url().startsWith(`${providerOrigin}/`)
          )
            continue
          if ((await frame.locator('canvas').count()) !== 1) continue
          const painted = await frame.locator('canvas').evaluate((canvas) => {
            if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Expected real canvas')
            const pixels = canvas
              .getContext('2d')
              ?.getImageData(0, 0, canvas.width, canvas.height).data
            if (!pixels) return false
            let blue = 0
            for (let i = 0; i < pixels.length; i += 4)
              if (
                pixels[i]! < 60 &&
                pixels[i + 1]! > 50 &&
                pixels[i + 1]! < 130 &&
                pixels[i + 2]! > 140 &&
                pixels[i + 3] === 255
              )
                blue++
            return blue > 100
          })
          if (painted) return true
        }
        return false
      },
      { timeout: 30_000, message: 'Real Turtle pixels in the exact approved provider iframe' },
    )
    .toBe(true)
  if (stop) {
    await preview.getByRole('button', { name: 'Parar', exact: true }).click()
    await expect(preview).toHaveAttribute('data-python-status', 'stopped')
    await expect(preview.locator('iframe')).toHaveCount(0)
  }
}

export async function runPythonLessonAdmin() {
  const [configPath, outputPath, admissionPath, admissionSha256] = process.argv.slice(2)
  assert(
    configPath && outputPath && admissionPath && admissionSha256,
    'Usage: python-lesson-admin.ts <reviewed-config.json> <new-output-dir> <fresh-admission.json> <admission-sha256>',
  )
  const config = z
    .object({
      origin: z.string(),
      providerOrigin: z.string(),
      runtime: StudioRuntimeSelectionSchema,
      modality: z.enum(['live', 'recorded']),
      kind: z.enum(['classic', 'pro']).default('pro'),
      teacherId: z.uuid(),
      accountId: z.uuid(),
      learnerId: z.uuid(),
    })
    .parse(JSON.parse(await readFile(resolve(configPath), 'utf8')))
  const origin = pythonAdminOrigin(config.origin)
  const runtime = StudioRuntimeSelectionSchema.parse(config.runtime)
  const provider = new URL(config.providerOrigin)
  assert.equal(provider.origin, config.providerOrigin)
  assert.equal(provider.hostname, '127.0.0.1')
  assert.equal(provider.protocol, 'http:')
  assert(provider.port)
  assert(['live', 'recorded'].includes(config.modality))
  const email = process.env.STUDIO_LESSONS_QA_ADMIN_EMAIL
  const password = process.env.STUDIO_LESSONS_QA_ADMIN_PASSWORD
  assert(email && password, 'Real QA Admin credentials must be supplied only in process memory')
  const out = resolve(outputPath)
  await mkdir(out) // Exclusive namespace: failed receipts are never overwritten by a new run.
  const marker = `qa-python-${randomUUID()}`
  const source = pythonLessonSource(marker)
  const receipt = {
    state: 'starting',
    startedAt: new Date().toISOString(),
    scope: `Admin Python v3 ${config.kind} authoring/publication/reopen/rehearsal execution and Turtle before call; no student-recorded/media/audio/assessment approval`,
    kind: config.kind,
    marker,
    source,
    runtime,
    providerOrigin: provider.origin,
    fixture: null as PythonLessonFixture | null,
    checks: [] as string[],
    decisions: [] as {
      status: number
      operation: string
      context: StudioAuthoringRuntimeContext
      runtime?: unknown
      revision?: string
      projectId?: string
    }[],
    pageErrors: [] as string[],
    consoleErrors: [] as string[],
    failure: null as string | null,
    cleanup: [] as string[],
    admission: null as PythonLessonAdmission | null,
  }
  const save = () =>
    writeFile(resolve(out, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
  await save()
  let browser: Browser | undefined
  let context: BrowserContext | undefined
  let page: Page | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const pending = new Set<Promise<void>>()
  let listenerFailure: unknown
  const onSupervisorStop = () => {
    receipt.failure ??= 'External owned supervisor requested stop'
    void context?.close().catch((error) => {
      listenerFailure ??= error
    })
  }
  process.on('SIGTERM', onSupervisorStop)
  try {
    receipt.admission = await readPythonLessonAdmission(admissionPath, admissionSha256, 'admin')
    await save()
    browser = await launchAdmittedPythonLessonBrowser(receipt.admission, () =>
      chromium.launch({ channel: 'chrome', headless: true, timeout: 30_000 }),
    )
    assert(!receipt.failure, 'Supervisor stopped before context creation')
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const ownedContext = context
    page = await context.newPage()
    page.setDefaultTimeout(30_000)
    page.setDefaultNavigationTimeout(60_000)
    timer = setTimeout(() => {
      receipt.failure ??= 'Deadline: 300 seconds'
      void context?.close().catch((error) => {
        listenerFailure ??= error
      })
    }, 300_000)
    page.on('pageerror', (error) => receipt.pageErrors.push(error.message.slice(0, 1500)))
    page.on('console', (message) => {
      if (message.type() === 'error') receipt.consoleErrors.push(message.text().slice(0, 1500))
    })
    page.on('response', (response) => {
      if (response.url() !== `${origin}/api/members/studio/authoring-runtime`) return
      const work = (async () => {
        const status = response.status()
        const request = StudioAuthoringRuntimeRequestSchema.parse(response.request().postDataJSON())
        if (status !== 200) {
          receipt.decisions.push({ status, context: request.context, operation: request.operation })
          return
        }
        const decision = StudioAuthoringRuntimeDecisionSchema.parse(await response.json())
        assert.deepEqual(decision.runtime, runtime)
        assert.equal(decision.actor.userId, config.teacherId)
        assert.deepEqual(decision.context, request.context)
        assert.equal(decision.revision, request.revision)
        assert.equal(new URL(decision.frame.url).origin, provider.origin)
        assert.deepEqual(decision.frame.allowedOrigins, [provider.origin])
        receipt.decisions.push({
          status,
          context: decision.context,
          runtime: decision.runtime,
          revision: decision.revision,
          operation: decision.operation,
          projectId: decision.projectId,
        })
      })().catch((error) => {
        listenerFailure ??= error
      })
      pending.add(work)
      void work.finally(() => pending.delete(work))
    })
    await page.goto(`${origin}/login?next=/admin/membros/cursos`)
    await page.getByLabel('E-mail', { exact: true }).fill(email)
    await page.getByLabel('Senha', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.waitForURL(`${origin}/admin/membros/cursos`)
    receipt.checks.push('real-admin-login')
    const fixture = await createEmptyPythonLesson({
      request: context.request,
      origin,
      modality: config.modality,
      onStep: async (fixture) => {
        receipt.fixture = fixture
        await save()
      },
    })
    const lessonUrl = `${origin}/admin/membros/cursos/${fixture.courseId}/aulas/${fixture.lessonId}`
    await readOwnedPythonLesson({
      request: context.request,
      origin,
      fixture,
      onStep: async (fixture) => {
        receipt.fixture = fixture
        await save()
      },
    })
    await page.goto(lessonUrl)
    await page.getByRole('button', { name: 'Abrir todas', exact: true }).click()
    // Server may start with one default section; add only when none exists.
    if ((await page.getByLabel('Título da seção 1', { exact: true }).count()) === 0)
      await page.getByRole('button', { name: 'Adicionar seção', exact: true }).click()
    await page.getByLabel('Título da seção 1', { exact: true }).fill('Meu projeto Python')
    await page.getByRole('button', { name: 'Adicionar conteúdo', exact: true }).first().click()
    await page
      .getByRole('dialog', { name: 'Adicionar conteúdo', exact: true })
      .getByRole('button', { name: /^Estúdio/ })
      .click()
    await expect(
      page
        .getByLabel('Ambiente do projeto', { exact: true })
        .locator(`option[value="${runtime.manifestSha256}"]`),
    ).toHaveCount(1, { timeout: 60_000 })
    await page
      .getByLabel('Ambiente do projeto', { exact: true })
      .selectOption(runtime.manifestSha256)
    await page.getByRole('button', { name: 'Trocar projeto', exact: true }).click()
    await expect(page.getByLabel('Ambiente do projeto', { exact: true })).toHaveValue(
      runtime.manifestSha256,
    )
    if (config.kind === 'pro') {
      await page.getByRole('button', { name: 'Código Pro', exact: true }).click()
      await page.getByRole('button', { name: 'Trocar projeto', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Código Pro', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    } else {
      await expect(
        page.getByRole('button', { name: 'Blocos e Ponte', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true')
      const advanced = page.getByRole('button', { name: 'Configurações avançadas', exact: true })
      if ((await advanced.getAttribute('aria-expanded')) !== 'true') await advanced.click()
      await page.getByLabel('Ponte (blocos ⇄ código)', { exact: true }).check()
      await page.getByLabel('Nível', { exact: true }).selectOption('3')
    }
    await page.getByRole('button', { name: 'Mais opções', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Extensões', exact: true }).click()
    const extensions = page.getByRole('dialog', { name: 'Extensões Python', exact: true })
    await extensions
      .locator('li')
      .filter({ hasText: 'Turtle' })
      .getByRole('button', { name: 'Instalar', exact: true })
      .click()
    await expect(extensions.getByText('Instalada', { exact: true })).toBeVisible()
    await extensions.getByRole('button', { name: 'Fechar', exact: true }).click()
    await editPythonMain(page, source, config.kind)
    await runPythonLessonPreview(page, marker, provider.origin, true, config.kind)
    await page.screenshot({ path: resolve(out, 'authored-and-stopped.png'), fullPage: true })
    receipt.checks.push(`ui-python-${config.kind}-turtle-install-keyboard-edit-real-frame-stop`)
    await page.getByRole('button', { name: 'Voltar ao percurso', exact: true }).click()
    await expect(page.getByText('Rascunho salvo', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Revisar para publicar', exact: true }).click()
    await page
      .getByRole('dialog', { name: 'Revisar para publicar', exact: true })
      .getByRole('button', { name: 'Publicar aula', exact: true })
      .click()
    await expect(
      page.getByRole('dialog', { name: 'Revisar para publicar', exact: true }),
    ).toHaveCount(0)
    const response = await context.request.get(
      `${origin}/api/members/lessons/${fixture.lessonId}/draft/published`,
      { maxRedirects: 0, maxRetries: 0 },
    )
    assert.equal(response.status(), 200)
    const published = await response.json()
    const verified = verifyPublishedPythonLesson({ published, runtime, kind: config.kind, source })
    await writeFile(resolve(out, 'published.json'), `${JSON.stringify(published, null, 2)}\n`, {
      flag: 'wx',
    })
    await page.goto(lessonUrl)
    await page.getByRole('button', { name: 'Abrir todas', exact: true }).click()
    await page.getByRole('button', { name: `Editar ${verified.project.name}`, exact: true }).click()
    // Monaco clipboard read uses the real keyboard; no editor handle or model injection.
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin })
    const input = await editPythonMain(page, undefined, config.kind)
    await input.focus()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Control+C')
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), source)
    receipt.checks.push('published-v3-runtime-source-workspace-and-ui-reopen')
    await page.getByRole('button', { name: 'Voltar ao percurso', exact: true }).click()
    await expect(page.getByText('Rascunho salvo', { exact: true })).toBeVisible()
    const readDraft = async () => {
      const response = await ownedContext.request.get(
        `${origin}/api/members/lessons/${fixture.lessonId}/draft`,
        { maxRedirects: 0, maxRetries: 0 },
      )
      assert.equal(response.status(), 200)
      return z.object({ revision: z.uuid(), document: z.unknown() }).parse(await response.json())
    }
    const beforeRehearsal = await readDraft()
    const rehearsalMarker = `qa-python-${randomUUID()}`
    const rehearsalSource = pythonLessonSource(rehearsalMarker)
    await page.getByRole('button', { name: 'Prévia do rascunho', exact: true }).click()
    await page.getByRole('button', { name: 'Ensaiar como aluno', exact: true }).click()
    await expect(
      page.getByText('Ensaio como aluno de teste · somente neste navegador', { exact: true }),
    ).toBeVisible()
    const decisionOffset = receipt.decisions.length
    await editPythonMain(page, rehearsalSource, config.kind)
    await runPythonLessonPreview(page, rehearsalMarker, provider.origin, true, config.kind)
    await page.getByRole('button', { name: 'Ensaiar retomada', exact: true }).click()
    await expect(
      page.getByText(
        'Retomada: respostas e o mesmo projeto foram recuperados da memória do ensaio.',
        { exact: true },
      ),
    ).toBeVisible()
    const rehearsalInput = await editPythonMain(page, undefined, config.kind)
    await rehearsalInput.focus()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Control+C')
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), rehearsalSource)
    await runPythonLessonPreview(page, rehearsalMarker, provider.origin, true, config.kind)
    assert.deepEqual(
      await readDraft(),
      beforeRehearsal,
      'Rehearsal edits must not mutate the authored draft or its revision',
    )
    await Promise.all([...pending])
    assert(
      receipt.decisions
        .slice(decisionOffset)
        .some(
          (entry) =>
            entry.status === 200 &&
            entry.operation === 'execute' &&
            entry.context.purpose === 'rehearsal' &&
            entry.context.blockId === verified.blockId &&
            entry.context.draftRevision === beforeRehearsal.revision,
        ),
    )
    await page.screenshot({ path: resolve(out, 'rehearsal-resumed-stopped.png'), fullPage: true })
    receipt.checks.push('real-ui-rehearsal-keyboard-execute-stop-resume-draft-unchanged')
    await Promise.all([...pending])
    if (listenerFailure) throw listenerFailure
    assert(
      receipt.decisions.some((entry) => {
        return (
          entry.status === 200 &&
          entry.operation === 'execute' &&
          entry.context.lessonId === fixture.lessonId
        )
      }),
      'Actual execute authorization for this lesson is required',
    )
    assert.deepEqual(receipt.pageErrors, [])
    assert.deepEqual(receipt.consoleErrors, [])
    if (config.modality === 'live') {
      receipt.fixture = await enrollPythonLiveLesson({
        request: context.request,
        origin,
        fixture,
        expected: { runtime, kind: config.kind, source },
        teacherId: config.teacherId,
        accountId: config.accountId,
        learnerId: config.learnerId,
        learnerName: 'Aluno QA Python',
        onStep: async (fixture) => {
          receipt.fixture = fixture
          await save()
        },
      })
    }
    assert.equal(verified.project.programmingLanguage, 'python')
    receipt.state = 'passed-admin-authoring-and-rehearsal-kids-pending'
  } catch (error) {
    receipt.state = 'failed'
    receipt.failure ??= String(error).slice(0, 3000)
    if (page && !page.isClosed())
      await page
        .screenshot({ path: resolve(out, 'failure.png'), fullPage: true })
        .catch((error) => {
          receipt.cleanup.push(`failure-capture: ${String(error).slice(0, 400)}`)
        })
    process.exitCode = 1
  } finally {
    const cleanupFailure = (error: unknown) => failPythonLessonCleanup(receipt, error)
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
        if (listenerFailure) cleanupFailure(listenerFailure)
        if (receipt.pageErrors.length) cleanupFailure(new Error('Page errors observed'))
        if (receipt.consoleErrors.length) cleanupFailure(new Error('Console errors observed'))
        if (receipt.failure) {
          receipt.state = 'failed'
          process.exitCode = 1
        }
      },
    })
    process.off('SIGTERM', onSupervisorStop)
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

if (import.meta.main) await runPythonLessonAdmin()
