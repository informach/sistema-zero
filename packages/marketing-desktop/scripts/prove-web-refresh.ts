import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { app, session } from 'electron'
import { z } from 'zod'

// The synthetic login is duplicated across request streams to exercise late/concurrent
// reads and shared revocation. Credentials never leave memory or enter evidence files.
const directory = path.resolve('.cache/native-connected-proof')
app.setName('Marketing Web Session Review')
app.setPath('userData', path.join(directory, 'web-session-review-profile'))
async function main() {
  await app.whenReady()
  try {
    const fixture = z
      .object({
        email: z.string(),
        password: z.string(),
        origin: z.literal('http://127.0.0.1:15334'),
      })
      .parse(JSON.parse(await readFile(path.join(directory, 'fixture.json'), 'utf8')))
    const first = session.fromPartition(`web-session-first-${randomUUID()}`)
    const delayed = session.fromPartition(`web-session-delayed-${randomUUID()}`)
    const login = await first.fetch(`${fixture.origin}/api/auth/login`, {
      method: 'POST',
      headers: { origin: fixture.origin, 'content-type': 'application/json' },
      body: JSON.stringify({ email: fixture.email, password: fixture.password }),
      signal: AbortSignal.timeout(15000),
    })
    await login.body?.cancel()
    assert.equal(login.status, 200)
    const cookies = await first.cookies.get({ url: fixture.origin })
    const credential = cookies.find((cookie) => cookie.name === 'sz_mkt_browser')
    assert.ok(credential, 'Login must issue a stable browser session')
    assert.ok(credential.httpOnly)
    assert.equal(credential.path, '/')
    assert.equal(credential.sameSite, 'lax')
    assert.ok(
      !cookies.some((cookie) => ['sz_mkt_access', 'sz_mkt_refresh'].includes(cookie.name)),
      'Browser must not keep a rotating token pair',
    )
    await delayed.cookies.set({
      url: fixture.origin,
      name: credential.name,
      value: credential.value,
      path: credential.path,
      httpOnly: credential.httpOnly,
      secure: credential.secure,
      sameSite: credential.sameSite,
      expirationDate: credential.expirationDate,
    })
    await first.cookies.remove(fixture.origin, 'sz_mkt_access')
    async function read(client: Electron.Session) {
      const response = await client.fetch(`${fixture.origin}/api/marketing/workspace/projects`, {
        signal: AbortSignal.timeout(60000),
      })
      await response.body?.cancel()
      assert.equal(
        response.headers.get('set-cookie'),
        null,
        'Read must not change the session cookie',
      )
      return response.status
    }
    const firstStatus = await read(first)
    const delayedStatus = await read(delayed)
    await first.cookies.remove(fixture.origin, 'sz_mkt_access')
    const subsequentStatus = await read(first)
    const parallel = await Promise.all(
      Array.from({ length: 8 }, (_, index) => read(index % 2 ? first : delayed)),
    )
    const preserved = (await first.cookies.get({ url: fixture.origin, name: 'sz_mkt_browser' }))[0]
    // Node transport observes the server's CSRF response without Chromium's CORS
    // layer hiding it. The copied credential stays in memory on this loopback origin.
    const csrf = await fetch(`${fixture.origin}/api/auth/logout`, {
      method: 'POST',
      headers: {
        origin: 'https://untrusted.invalid',
        cookie: `${credential.name}=${credential.value}`,
      },
      signal: AbortSignal.timeout(15000),
    })
    await csrf.body?.cancel()
    assert.equal(csrf.status, 403)
    assert.equal(await read(first), 200, 'Rejected cross-origin logout must preserve the session')
    const legacy = session.fromPartition(`web-session-legacy-${randomUUID()}`)
    for (const name of ['sz_mkt_access', 'sz_mkt_refresh']) {
      await legacy.cookies.set({
        url: fixture.origin,
        name,
        value: 'obsolete-review-cookie',
        httpOnly: true,
        path: '/',
      })
    }
    assert.equal(await read(legacy), 401, 'Legacy cookies cannot authorize the new BFF')
    const redirect = await fetch(`${fixture.origin}/bancada`, {
      redirect: 'manual',
      headers: {
        cookie: 'sz_mkt_access=obsolete-review-cookie; sz_mkt_refresh=obsolete-review-cookie',
      },
      signal: AbortSignal.timeout(15000),
    })
    await redirect.body?.cancel()
    assert.ok([302, 307, 308].includes(redirect.status))
    const location = new URL(redirect.headers.get('location') ?? '', fixture.origin)
    assert.equal(location.pathname, '/login')
    assert.equal(location.searchParams.get('next'), '/bancada')
    const logout = await first.fetch(`${fixture.origin}/api/auth/logout`, {
      method: 'POST',
      headers: { origin: fixture.origin },
      signal: AbortSignal.timeout(15000),
    })
    await logout.body?.cancel()
    assert.equal(logout.status, 200)
    const afterLogout = await read(delayed)
    assert.equal(afterLogout, 401, 'The stable session must stop after logout')
    assert.equal(
      (await first.cookies.get({ url: fixture.origin, name: 'sz_mkt_browser' })).length,
      0,
    )
    const result = {
      firstStatus,
      delayedStatus,
      subsequentStatus,
      parallel,
      stableCredential:
        preserved?.value === credential.value &&
        preserved.expirationDate === credential.expirationDate,
      syntheticAccount: true,
      cookieValuesRecorded: false,
      csrfRejected: csrf.status,
      legacyRedirect: location.pathname + location.search,
      afterLogout,
    }
    await writeFile(
      path.join(directory, 'web-refresh-race-evidence.json'),
      JSON.stringify(result, null, 2),
    )
    console.log(JSON.stringify(result))
    assert.equal(firstStatus, 200)
    assert.equal(delayedStatus, 200, 'A concurrent request invalidated the browser session')
    assert.equal(subsequentStatus, 200, 'The session family was revoked by a concurrent read')
    assert.ok(result.stableCredential)
    assert.ok(parallel.every((status) => status === 200))
    app.exit(0)
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Session review failed')
    app.exit(1)
  }
}
void main()
