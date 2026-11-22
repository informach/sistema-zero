import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const [studio, fixtureFile, oldFile, modernFile, benchFile] = process.argv.slice(2)
const buffers = Object.fromEntries(
  Object.entries({ fixture: fixtureFile, old: oldFile, modern: modernFile, bench: benchFile }).map(
    ([key, path]) => [key, readFileSync(path)],
  ),
)
const hashes = Object.fromEntries(
  Object.entries(buffers).map(([key, value]) => [
    key,
    createHash('sha256').update(value).digest('hex'),
  ]),
)
assert.equal(hashes.old, '6e54e7f26feb3924ea26a785ea375b20286be92216290dedfa5078f7a1c3f4e6')
assert.equal(hashes.modern, '50b3a361f0dc71d920b6c74a35b42194f923d9cfda1e026319a0e8985badb0cb')
assert.equal(hashes.fixture, 'cd944bcd979d6248ee675647d75205de04bdee30aafdedee26d22f3b96487e22')
const { chromium } = createRequire(resolve(studio, 'package.json'))('@playwright/test')
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-precise-memory-info'],
})
const results = []
try {
  for (const large of [false, true]) {
    const context = await browser.newContext({ serviceWorkers: 'block' })
    const page = await context.newPage()
    const origin = 'http://127.0.0.1:57802'
    await context.route('**/*', (route) => {
      const u = new URL(route.request().url())
      if (u.origin !== origin) return route.abort()
      if (u.pathname === '/')
        return route.fulfill({ contentType: 'text/html', body: '<!doctype html>' })
      const file = buffers[u.pathname.slice(1)]
      if (!file) return route.abort()
      return route.fulfill({ contentType: 'application/javascript', body: file })
    })
    await page.goto(origin)
    await page.evaluate(async () => {
      window.modules = await Promise.all(['/old', '/modern', '/bench'].map((p) => import(p)))
    })
    await context.setOffline(true)
    results.push(
      await page.evaluate(
        ({ fixture, large }) =>
          window.modules[2].scenario(window.modules[0], window.modules[1], fixture, large),
        { fixture: JSON.parse(buffers.fixture), large },
      ),
    )
    await context.close()
  }
  console.log(JSON.stringify({ browser: browser.version(), hashes, results }, null, 2))
} finally {
  await browser.close()
}
