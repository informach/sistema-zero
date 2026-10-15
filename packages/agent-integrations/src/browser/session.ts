import { createHash, randomUUID } from 'node:crypto'
import { copyFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { canonical, ToolRejected } from '@sistemazero/agent-core'
import { type BrowserContext, chromium, type Page } from 'playwright-core'
import { z } from 'zod'
import { browserProxy } from './proxy'
import {
  type BrowserSnapshot,
  browserActionSchema,
  browserExtractSchema,
  browserOpenSchema,
  browserSnapshotSchema,
  browserTargetSchema,
  redactText,
  redactUrl,
} from './schema'

export class BrowserSession {
  private constructor(
    readonly context: BrowserContext,
    private page: Page,
    private proxy: Awaited<ReturnType<typeof browserProxy>>,
    private directory: string,
    private mode: 'plan' | 'build',
  ) {}
  private diagnostics: BrowserSnapshot['diagnostics'] = []
  private trace: { at: string; operation: string; url: string; outcome: string }[] = []
  private expectingDownload = false
  private closed = false
  static async open(
    raw: z.infer<typeof browserOpenSchema>,
    directory: string,
    allowLocal: (origin: string) => Promise<boolean>,
  ) {
    const config = browserOpenSchema.parse(raw)
    const proxy = await browserProxy({ ...config, allowLocal })
    let context: BrowserContext | undefined
    try {
      context = await chromium.launchPersistentContext(config.accountDirectory ?? '', {
        headless: config.headless,
        chromiumSandbox: true,
        viewport: { width: config.width, height: config.height },
        proxy: proxy.proxy,
        serviceWorkers: 'block',
        acceptDownloads: true,
        timeout: 20000,
        downloadsPath: directory,
        ignoreDefaultArgs: ['--password-store=basic', '--use-mock-keychain'],
        args: [
          '--proxy-bypass-list=<-loopback>',
          '--disable-quic',
          '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
          '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
        ],
      })
      const page = context.pages()[0] ?? (await context.newPage())
      const session = new BrowserSession(context, page, proxy, directory, config.mode)
      page.setDefaultTimeout(8000)
      page.setDefaultNavigationTimeout(20000)
      context.on('page', (created) => {
        if (created !== page) void created.close().catch((error) => session.backgroundError(error))
      })
      page.on('dialog', (dialog) => {
        void dialog.dismiss().catch((error) => session.backgroundError(error))
      })
      page.on('download', (download) => {
        if (!session.expectingDownload)
          void download.cancel().catch((error) => session.backgroundError(error))
      })
      page.on('console', (message) => {
        if (message.type() === 'error')
          session.record({
            kind: 'console',
            text: redactText(message.text()),
            url: redactUrl(message.location().url),
          })
      })
      page.on('pageerror', (error) =>
        session.record({ kind: 'exception', text: redactText(error.message) }),
      )
      page.on('requestfailed', (request) =>
        session.record({
          kind: 'network',
          text: redactText(request.failure()?.errorText ?? 'Request failed'),
          url: redactUrl(request.url()),
        }),
      )
      page.on('response', (response) => {
        if (response.status() >= 400)
          session.record({
            kind: 'http',
            text: `HTTP ${response.status()}`,
            url: redactUrl(response.url()),
          })
      })
      await context.route('**/*', async (route) => {
        const request = route.request()
        const url = new URL(request.url())
        if (
          !['http:', 'https:'].includes(url.protocol) ||
          (config.mode === 'plan' && !['GET', 'HEAD'].includes(request.method()))
        )
          return route.abort('blockedbyclient')
        return route.continue()
      })
      if (config.mode === 'plan') await context.routeWebSocket('**/*', (socket) => socket.close())
      return session
    } catch (error) {
      try {
        await context?.close()
      } finally {
        await proxy.close()
      }
      throw error
    }
  }
  private record(entry: BrowserSnapshot['diagnostics'][number]) {
    this.diagnostics.push(entry)
    if (this.diagnostics.length > 100) this.diagnostics.shift()
  }
  private backgroundError(error: unknown) {
    if (!this.closed) this.record({ kind: 'control', text: redactText(String(error)) })
  }
  private recordStep(operation: string, outcome: string) {
    this.trace.push({
      at: new Date().toISOString(),
      operation,
      outcome,
      url: redactUrl(this.page.url()),
    })
    if (this.trace.length > 200) this.trace.shift()
  }
  private target(raw: z.infer<typeof browserTargetSchema>) {
    const target = browserTargetSchema.parse(raw)
    switch (target.by) {
      case 'css':
        return this.page.locator(target.value)
      case 'label':
        return this.page.getByLabel(target.value, { exact: true })
      case 'text':
        return this.page.getByText(target.value, { exact: true })
      case 'role':
        return this.page.getByRole(target.role, { name: target.name, exact: true })
      case 'testId':
        return this.page.getByTestId(target.value)
    }
  }
  async navigate(raw: string) {
    if (this.closed) throw new Error('Browser session closed')
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      throw new Error('Invalid navigation URL')
    this.diagnostics = []
    const response = await this.page.goto(url.href, { waitUntil: 'domcontentloaded' })
    if (!response || response.status() >= 400)
      throw new Error('Navigation did not return a successful document')
    this.recordStep('navigate', 'document loaded')
    return this.observe()
  }
  async observe(): Promise<BrowserSnapshot> {
    if (this.closed) throw new Error('Browser session closed')
    const content = await this.page.evaluate(() => {
      const elements: {
        selector: string
        tag: string
        role: string
        name: string
        type: string
      }[] = []
      const walker = document.createTreeWalker(
        document.body ?? document.documentElement,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      )
      let node = walker.nextNode()
      let visited = 0
      let text = ''
      while (node && visited++ < 2000 && text.length < 24000) {
        const parent = node instanceof Element ? node : node.parentElement
        if (
          parent &&
          !parent.closest('script,style,noscript,[hidden],[aria-hidden="true"],[data-private]')
        ) {
          if (node.nodeType === Node.TEXT_NODE)
            text += `${(node.textContent ?? '').slice(0, 1000).trim()} `
          if (
            node instanceof HTMLElement &&
            elements.length < 200 &&
            node.matches('a,button,input,select,textarea,[role]')
          ) {
            const parts: string[] = []
            let current: HTMLElement | null = node
            for (let depth = 0; current && depth < 10; depth++) {
              if (current.id) {
                parts.unshift(`#${CSS.escape(current.id)}`)
                break
              }
              const tag = current.tagName.toLowerCase()
              const siblings = current.parentElement
                ? [...current.parentElement.children].filter(
                    (sibling) => sibling.tagName === current?.tagName,
                  )
                : []
              parts.unshift(
                tag + (siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : ''),
              )
              current = current.parentElement
            }
            elements.push({
              selector: parts.join(' > '),
              tag: node.tagName.toLowerCase(),
              role: node.getAttribute('role') ?? '',
              name: (
                node.getAttribute('aria-label') ??
                node.getAttribute('placeholder') ??
                node.innerText ??
                ''
              ).slice(0, 200),
              type: node.getAttribute('type') ?? '',
            })
          }
        }
        node = walker.nextNode()
      }
      return { text: text.slice(0, 24000), elements, truncated: Boolean(node) }
    })
    const revision = createHash('sha256')
      .update(canonical({ url: this.page.url(), ...content }))
      .digest('hex')
    return browserSnapshotSchema.parse({
      ...content,
      text: redactText(content.text, 24000),
      elements: content.elements.map((element) => ({
        ...element,
        name: redactText(element.name, 200),
      })),
      url: redactUrl(this.page.url()),
      title: redactText(await this.page.title(), 300),
      revision,
      diagnostics: this.diagnostics,
    })
  }
  async action(raw: z.infer<typeof browserActionSchema>) {
    const input = browserActionSchema.parse(raw)
    if (this.mode !== 'build')
      throw new ToolRejected('PLAN_BROWSER', 'Plan browser forbids interactive mutations')
    if ((await this.observe()).revision !== input.expectedRevision)
      throw new ToolRejected(
        'STALE_BROWSER',
        'Browser snapshot is stale; observe and review the target again',
      )
    const locator = this.target(input.target)
    if ((await locator.count()) !== 1)
      throw new ToolRejected('AMBIGUOUS_TARGET', 'Action requires exactly one matching element')
    if (
      await locator.evaluate((element) =>
        Boolean(element.closest('[data-private],input[type="password"]')),
      )
    )
      throw new ToolRejected('CREDENTIAL_INPUT', 'Use human login for credentials')
    let artifact: { file: string; mediaType: string; bytes: number } | undefined
    try {
      if (input.action === 'click') await locator.click()
      else if (input.action === 'fill') await locator.fill(z.string().parse(input.value))
      else if (input.action === 'select') await locator.selectOption(z.string().parse(input.value))
      else if (input.action === 'press') await locator.press(z.string().max(50).parse(input.value))
      else if (input.action === 'check') await locator.setChecked(z.boolean().parse(input.checked))
      else if (input.action === 'upload') {
        const file = join(this.directory, z.string().parse(input.file))
        if ((await stat(file)).size > 8_000_000) throw new Error('Upload exceeds 8 MB')
        await locator.setInputFiles(file)
      } else {
        this.expectingDownload = true
        const [download] = await Promise.all([
          this.page.waitForEvent('download', { timeout: 15000 }),
          locator.click(),
        ])
        const path = await download.path()
        if (!path) throw new Error('Download did not produce a file')
        const metadata = await stat(path)
        if (metadata.size > 8_000_000) {
          await download.delete()
          throw new Error('Download exceeds 8 MB')
        }
        const name = `${randomUUID()}.download`
        await copyFile(path, join(this.directory, name))
        await download.delete()
        artifact = { file: name, mediaType: 'application/octet-stream', bytes: metadata.size }
      }
      this.recordStep(input.action, 'completed')
      return { snapshot: await this.observe(), artifact: artifact ?? null }
    } catch (error) {
      this.recordStep(input.action, 'unconfirmed')
      throw error
    } finally {
      this.expectingDownload = false
    }
  }
  async screenshot() {
    const snapshot = await this.observe()
    const file = `${randomUUID()}.png`
    await this.page.screenshot({
      path: join(this.directory, file),
      type: 'png',
      fullPage: false,
      mask: [this.page.locator('input[type="password"],[data-private]')],
      animations: 'disabled',
      timeout: 10000,
    })
    const size = (await stat(join(this.directory, file))).size
    if (size > 8_000_000) throw new Error('Screenshot exceeds 8 MB')
    if ((await this.observe()).revision !== snapshot.revision)
      throw new ToolRejected('STALE_CAPTURE', 'Page changed during screenshot; capture again')
    return {
      file,
      mediaType: 'image/png',
      bytes: size,
      revision: snapshot.revision,
      url: snapshot.url,
    }
  }
  async extract(raw: z.infer<typeof browserExtractSchema>) {
    const before = await this.observe()
    const fields: Record<string, string> = {}
    for (const field of browserExtractSchema.parse(raw)) {
      if (Object.hasOwn(fields, field.name))
        throw new ToolRejected('DUPLICATE_FIELD', 'Extraction field names must be unique')
      const locator = this.target(field.target)
      if ((await locator.count()) !== 1)
        throw new ToolRejected(
          'AMBIGUOUS_TARGET',
          'Extraction requires exactly one matching element',
        )
      if (
        await locator.evaluate((element) =>
          Boolean(element.closest('[data-private],input,textarea')),
        )
      )
        throw new ToolRejected(
          'PRIVATE_FIELD',
          'Extraction does not expose private or form input values',
        )
      const value = field.attribute
        ? await locator.getAttribute(field.attribute)
        : await locator.innerText()
      fields[field.name] =
        field.attribute === 'href' || field.attribute === 'src'
          ? redactUrl(new URL(value ?? '', this.page.url()).href)
          : redactText(value ?? '', 4000)
    }
    if ((await this.observe()).revision !== before.revision)
      throw new ToolRejected('STALE_EXTRACTION', 'Page changed during extraction')
    return { fields, revision: before.revision, url: before.url }
  }
  inspect() {
    return { trace: this.trace, network: this.proxy.inspect(), diagnostics: this.diagnostics }
  }
  async close() {
    if (this.closed) return
    this.closed = true
    try {
      await this.context.close()
    } finally {
      await this.proxy.close()
    }
  }
}
