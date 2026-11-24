import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const fixture = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const oldBundle = readFileSync(process.argv[3])
const newBundle = readFileSync(process.argv[4])
const origin = 'http://127.0.0.1:57801'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const hashes = (bytes) => createHash('sha256').update(bytes).digest('hex')
try {
  const context = await browser.newContext({ serviceWorkers: 'block' })
  await context.route('**/*', (route) => {
    const path = new URL(route.request().url())
    if (path.origin !== origin) return route.abort()
    if (path.pathname === '/')
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html>' })
    if (path.pathname === '/old.mjs')
      return route.fulfill({ contentType: 'text/javascript', body: oldBundle })
    if (path.pathname === '/new.mjs')
      return route.fulfill({ contentType: 'text/javascript', body: newBundle })
    return route.abort()
  })
  const legacyTab = await context.newPage()
  const newTab = await context.newPage()
  await Promise.all([legacyTab.goto(origin), newTab.goto(origin)])

  const seeded = await legacyTab.evaluate(async (input) => {
    const old = await import('/old.mjs')
    old.setPersonalAssetsNamespace('profile-A')
    return (await old.savePersonalAsset(input)).ok
  }, fixture.previous)
  assert.equal(seeded, true)

  const promoted = await newTab.evaluate(async (input) => {
    const api = await import('/new.mjs')
    const scope = { namespace: 'profile-A', capability: api.PINTA_REGIONAL_PERSONAL_CAPTURE }
    const { id, name, dataUrl, width, height } = input
    const stat = await api.savePersonalRegionalMap(
      { id, name, dataUrl, width, height },
      {
        ...scope,
        expectedRevision: null,
      },
    )
    if (!stat.ok) throw new Error(stat.error)
    const result = await api.readPersonalRegionalMap(input.id, scope)
    return {
      revision: stat.revision,
      sha256: result.sha256,
      exactPng: result.dataUrl === input.dataUrl,
    }
  }, fixture.current)
  assert.equal(promoted.sha256, fixture.current.regional.sha256)
  assert.equal(promoted.exactPng, true)

  const oldResult = await legacyTab.evaluate(async (input) => {
    const old = await import('/old.mjs')
    const before = await old.getPersonalAsset(input.id)
    const single = await old.savePersonalAsset(input)
    const shadow = await old.getPersonalAsset(input.id)
    const removed = await old.removePersonalAsset(input.id)
    const afterRemove = await old.getPersonalAsset(input.id)
    const batch = await old.savePersonalAssetBundle([
      input,
      { ...input, id: 'extra', name: 'extra' },
    ])
    old.setPersonalAssetsNamespace('profile-B')
    const otherInitiallyEmpty = (await old.listPersonalAssets()).length === 0
    const other = await old.savePersonalAsset({ ...input, name: 'nos-outros' })
    old.setPersonalAssetsNamespace('')
    const resetEmpty = (await old.listPersonalAssets()).length === 0
    old.setPersonalAssetsNamespace('profile-A')
    return {
      before: before === null,
      single: single.ok && shadow.dataUrl === input.dataUrl,
      removed: removed.ok && afterRemove === null,
      batch: batch.ok,
      otherProfileOwned: other.ok && otherInitiallyEmpty,
      resetEmpty,
      profileAVisibleToOldIds: (await old.listPersonalAssets()).map((a) => a.id).sort(),
    }
  }, fixture.previous)
  assert.deepEqual(oldResult, {
    before: true,
    single: true,
    removed: true,
    batch: true,
    otherProfileOwned: true,
    resetEmpty: true,
    profileAVisibleToOldIds: ['extra', 'world'],
  })

  const afterOld = await newTab.evaluate(async ({ current, previous }) => {
    const api = await import('/new.mjs')
    const scope = { namespace: 'profile-A', capability: api.PINTA_REGIONAL_PERSONAL_CAPTURE }
    const shadowOmitted = (await api.getPersonalAsset(current.id, scope)) === null
    const refusedLegacyWrite = !(await api.savePersonalAsset(previous, scope)).ok
    const refusedLegacyDelete = !(await api.removePersonalAsset(current.id, scope)).ok
    const foreign = await api.readPersonalRegionalMap(current.id, {
      ...scope,
      namespace: 'profile-B',
    })
    const guarded = await api.readPersonalRegionalMap(current.id, scope)
    return {
      shadowOmitted,
      refusedLegacyWrite,
      refusedLegacyDelete,
      foreignAbsent: foreign === null,
      captureUnchanged: guarded.dataUrl === current.dataUrl,
      sha256: guarded.sha256,
    }
  }, fixture)
  assert.deepEqual(afterOld, {
    shadowOmitted: true,
    refusedLegacyWrite: true,
    refusedLegacyDelete: true,
    foreignAbsent: true,
    captureUnchanged: true,
    sha256: promoted.sha256,
  })

  const peerTab = await context.newPage()
  await peerTab.goto(origin)
  const race = (tab, name) =>
    tab.evaluate(
      async ({ input, expectedRevision, name }) => {
        const api = await import('/new.mjs')
        const { id, dataUrl, width, height } = input
        return api.savePersonalRegionalMap(
          { id, dataUrl, width, height, name },
          {
            namespace: 'profile-A',
            capability: api.PINTA_REGIONAL_PERSONAL_CAPTURE,
            expectedRevision,
          },
        )
      },
      { input: fixture.current, expectedRevision: promoted.revision, name },
    )
  const writes = await Promise.all([race(newTab, 'Primeira aba'), race(peerTab, 'Segunda aba')])
  assert.deepEqual(writes.map((w) => w.ok).sort(), [false, true])
  const winner = writes.find((w) => w.ok)
  await Promise.all([legacyTab.close(), newTab.close(), peerTab.close()])
  const reopened = await context.newPage()
  await reopened.goto(origin)
  const final = await reopened.evaluate(async (input) => {
    const api = await import('/new.mjs')
    const scope = { namespace: 'profile-A', capability: api.PINTA_REGIONAL_PERSONAL_CAPTURE }
    const state = await api.readPersonalRegionalMap(input.id, scope)
    return {
      exactPng: state.dataUrl === input.dataUrl,
      sha256: state.sha256,
      revision: state.revision,
      visible: (await api.listPersonalAssets(scope)).map((a) => a.id),
    }
  }, fixture.current)
  assert.deepEqual(final, {
    exactPng: true,
    sha256: promoted.sha256,
    revision: winner.revision,
    visible: ['extra'],
  })
  console.log(
    JSON.stringify({
      chromeVersion: browser.version(),
      oldBundleSha256: hashes(oldBundle),
      newBundleSha256: hashes(newBundle),
      retainedPngSha256: final.sha256,
      legacyUpsertBatchDeleteAndNamespaceReset: true,
      modernReadersAndWritersRespectFence: true,
      concurrentWrites: writes.map((w) => w.ok).sort(),
      reopenedExactPng: final.exactPng,
    }),
  )
  await context.close()
} finally {
  await browser.close()
}
