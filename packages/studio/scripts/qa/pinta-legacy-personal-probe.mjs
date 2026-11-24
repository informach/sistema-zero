import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

// Run against the explicit legacy build only. The route is served from memory on loopback.
const fixture = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const bundle = readFileSync(process.argv[3])
const origin = 'http://127.0.0.1:57801'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const context = await browser.newContext({ serviceWorkers: 'block' })
  await context.route('**/*', (route) => {
    const url = route.request().url()
    if (url === `${origin}/`)
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html>' })
    if (url === `${origin}/legacy.mjs`)
      return route.fulfill({ contentType: 'text/javascript', body: bundle })
    return route.abort()
  })
  const page = await context.newPage()
  await page.goto(origin)
  const result = await page.evaluate(async (fixture) => {
    const old = await import('/legacy.mjs')
    const namespace = 'pinta-png5-probe'
    const dbName = `sistema-zero-personal-assets-${namespace}`
    const legacyKey = 'asset:world'
    const regionalKey = 'region-map:world'
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1)
      req.onupgradeneeded = () => req.result.createObjectStore('kv')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const write = (key, value) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction('kv', 'readwrite')
        tx.objectStore('kv').put(value, key)
        tx.oncomplete = resolve
        tx.onerror = () => reject(tx.error)
      })
    const read = (key) =>
      new Promise((resolve, reject) => {
        const req = db.transaction('kv').objectStore('kv').get(key)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    const digest = async (value) => {
      const bytes = Uint8Array.from(atob(value.split(',')[1]), (char) => char.charCodeAt(0))
      const hash = await crypto.subtle.digest('SHA-256', bytes)
      return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
    }
    try {
      await write(legacyKey, fixture.current)
      const view = await old.getPersonalAsset('world', { namespace })
      const afterRead = await read(legacyKey)
      const afterReadSha256 = await digest(afterRead.dataUrl)
      const update = await old.savePersonalAsset(fixture.previous, { namespace })
      const afterUpdate = await read(legacyKey)
      const afterUpdateSha256 = await digest(afterUpdate.dataUrl)
      // Test the storage separation itself, not an implementation of a new writer.
      await write(regionalKey, fixture.current)
      const changesSeparateKey = await old.savePersonalAsset(fixture.previous, { namespace })
      const untouched = await read(regionalKey)
      return {
        readDropsRegionalMetadata:
          view !== null && view.scene === undefined && view.regional === undefined,
        readKeepsExactPng: view.dataUrl === fixture.current.dataUrl,
        rawMetadataStillPresentAfterRead:
          afterRead.scene.version === 4 && afterRead.regional.dataVersion === 5,
        afterReadSha256,
        legacyWriteSucceeded: update.ok,
        writtenLegacyScene: afterUpdate.scene.version,
        writtenLegacySidecarAbsent: afterUpdate.regional === undefined,
        afterUpdateSha256,
        legacyWriteWithSeparateRegionalKeySucceeded: changesSeparateKey.ok,
        separateKeyStillHasRegionalSha256: await digest(untouched.dataUrl),
      }
    } finally {
      db.close()
    }
  }, fixture)
  assert.deepEqual(result, {
    readDropsRegionalMetadata: true,
    readKeepsExactPng: true,
    rawMetadataStillPresentAfterRead: true,
    afterReadSha256: fixture.current.regional.sha256,
    legacyWriteSucceeded: true,
    writtenLegacyScene: 1,
    writtenLegacySidecarAbsent: true,
    afterUpdateSha256: fixture.previousSha256,
    legacyWriteWithSeparateRegionalKeySucceeded: true,
    separateKeyStillHasRegionalSha256: fixture.current.regional.sha256,
  })
  console.log(
    JSON.stringify({
      bundleSha256: createHash('sha256').update(bundle).digest('hex'),
      chromeVersion: browser.version(),
      ...result,
    }),
  )
  await context.close()
} finally {
  await browser.close()
}
