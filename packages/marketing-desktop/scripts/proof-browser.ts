import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { BrowserWindow, session } from 'electron'
import { z } from 'zod'

/** Authenticates only against the explicitly pinned native-review web stack. */
export async function proofBrowser(name: string) {
  const fixture = z
    .object({
      userId: z.string().uuid(),
      email: z.string(),
      password: z.string(),
      origin: z.literal('http://127.0.0.1:15334'),
    })
    .parse(JSON.parse(await readFile('.cache/native-connected-proof/fixture.json', 'utf8')))
  const browser = session.fromPartition(`${name}-${randomUUID()}`)
  async function request(
    route: string,
    body?: unknown,
    method: 'GET' | 'POST' = body === undefined ? 'GET' : 'POST',
  ): Promise<unknown> {
    if (!route.startsWith('/api/')) throw new Error('Rota de prova inválida')
    const response = await browser.fetch(`${fixture.origin}${route}`, {
      method,
      headers: { origin: fixture.origin, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    })
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error(`HTTP ${response.status}: ${route}`)
    }
    return response.json()
  }
  await request('/api/auth/login', { email: fixture.email, password: fixture.password })
  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 960,
    webPreferences: {
      session: browser,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      offscreen: true,
      backgroundThrottling: false,
    },
  })
  return { window, request, origin: fixture.origin, userId: fixture.userId }
}
