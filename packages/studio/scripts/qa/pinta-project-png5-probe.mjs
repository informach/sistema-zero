import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const input = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const oldBundle = readFileSync(process.argv[3])
const newBundle = readFileSync(process.argv[4])
const origin = 'http://127.0.0.1:57801'
const namespace = 'pinta-regional-local:chrome-compat'
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const context = await browser.newContext({ serviceWorkers: 'block' })
  await context.route('**/*', (route) => {
    const address = new URL(route.request().url())
    if (address.origin !== origin) return route.abort()
    if (address.pathname === '/')
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html>' })
    if (address.pathname === '/old.mjs')
      return route.fulfill({ contentType: 'text/javascript', body: oldBundle })
    if (address.pathname === '/new.mjs')
      return route.fulfill({ contentType: 'text/javascript', body: newBundle })
    return route.abort()
  })
  const tabs = { old: await context.newPage(), modern: await context.newPage() }
  await Promise.all(Object.values(tabs).map((tab) => tab.goto(origin)))
  const source = input.current
  const region = {
    dataVersion: 5,
    sourceId: source.id,
    sha256: source.regional.sha256,
  }
  const previous = input.previous
  const material = {
    id: 'original-material-id',
    name: 'vila-do-jogo',
    libId: `personal:${source.id}`,
    libOrigin: 'pinta',
    proPath: 'public/materials/vila.png',
    kind: 'image',
    source: 'library',
    width: source.width,
    height: source.height,
    dataUrl: previous.dataUrl,
  }
  const blocks = {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: 'sz_js_console_log_text',
          id: 'original-block-id',
          fields: { VALUE: 'Meu programa' },
        },
      ],
    },
  }
  const script = 'console.log("Meu programa");'
  const initial = await tabs.old.evaluate(
    async ({ material, previous, blocks, script, namespace }) => {
      const old = await import('/old.mjs')
      old.setProjectStorageNamespace(namespace)
      old.setPersonalAssetsNamespace(namespace)
      const scope = old.getProjectStorageScope(namespace)
      const project = old.createEmptyProject('marked', 'Mapa marcado')
      project.assets = [material]
      project.blocksState = blocks
      project.files['script.js'] = script
      await old.persistProject(project, {}, scope)
      const opened = await old.prepareEditableStudioProject(
        await old.loadProjectById(project.id, scope),
      )
      if (opened.assets[0].dataUrl !== material.dataUrl) throw new Error('Invalid legacy fixture')
      globalThis.staleEditor = opened
      globalThis.staleMaterials = (
        await old.loadProjectAssetsSnapshotById(project.id, scope)
      ).assets
      const saved = await old.savePersonalAsset(previous)
      return saved.ok
    },
    { material, previous, blocks, script, namespace },
  )
  assert.equal(initial, true)
  const denied = await tabs.modern.evaluate(
    async ({ material, source, region }) => {
      const modern = await import('/new.mjs')
      const scope = modern.privateRegionalProjectScope('chrome-compat')
      modern.setProjectStorageNamespace(scope.namespace)
      let mirrorSignals = 0
      modern.setStudioCloudMirror({
        onChanged: () => {
          mirrorSignals++
        },
        onDeleted: () => {
          mirrorSignals++
        },
      })
      const capture = {
        width: source.width,
        height: source.height,
        dataUrl: source.dataUrl,
        regional: region,
      }
      const activated = await modern.refreshPrivateRegionalProjectAsset({
        projectId: 'marked',
        assetId: material.id,
        scope,
        capture,
      })
      const actual = await modern.loadProjectById('marked', scope)
      const refuses = async (action) => {
        try {
          await action()
          return false
        } catch {
          return true
        }
      }
      const cloudRestoreRefused = await refuses(() =>
        modern.restoreProjectFromCloud(
          { ...actual, assets: [material] },
          { expectedId: 'marked', namespace: scope.namespace },
        ),
      )
      const remoteDeleteRefused = await refuses(() =>
        modern.discardImportedProjectSnapshot('marked', { namespace: scope.namespace }),
      )
      return {
        refreshed: activated,
        exact: actual.assets[0].dataUrl === source.dataUrl,
        mirrorSignals,
        cloudRestoreRefused,
        remoteDeleteRefused,
      }
    },
    { material, source, region },
  )
  assert.deepEqual(denied, {
    refreshed: true,
    exact: true,
    mirrorSignals: 0,
    cloudRestoreRefused: true,
    remoteDeleteRefused: true,
  })

  const fences = await tabs.old.evaluate(
    async ({ material, source, previous, blocks, script, namespace }) => {
      const old = await import('/old.mjs')
      const scope = old.getProjectStorageScope(namespace)
      const raw = await old.loadProjectById('marked', scope)
      const refuses = async (action) => {
        try {
          await action()
          return false
        } catch {
          return true
        }
      }
      const normalized = old.sanitizeProjectAssets(raw.assets)[0]
      const oldReadRefused = await refuses(() => old.prepareEditableStudioProject(raw))
      const partitionReadRefused = await refuses(() =>
        old.loadProjectAssetsSnapshotById('marked', scope),
      )
      const staleWriteRefused = await refuses(() =>
        old.persistProjectAssets('marked', [material], scope, globalThis.staleMaterials),
      )
      globalThis.staleEditor.files['script.js'] = 'throw new Error("Edição antiga");'
      const staleEditorRefused = await refuses(() =>
        old.persistProject(globalThis.staleEditor, {}, scope),
      )
      const flatCloudRefused = await refuses(() =>
        old.validateEditableStudioCreationSnapshot(raw, 'marked'),
      )
      const onlyProgram = await old.validateEditableStudioCreationSnapshot(
        {
          format: 'sz-studio-parts',
          version: 1,
          program: { ...raw, assets: [] },
          assets: ['a'.repeat(64)],
        },
        'marked',
      )

      const bare = old.createEmptyProject('bare', 'Mapa sem marcador')
      // Independent default-profile control for the unmarked legacy autosync.
      old.setProjectStorageNamespace('')
      old.setStorageNamespace('')
      old.setPersonalAssetsNamespace('')
      const controlScope = old.getProjectStorageScope('')
      if (!(await old.savePersonalAsset(previous)).ok) throw new Error('Invalid autosync fixture')
      bare.assets = [{ ...material, dataUrl: source.dataUrl }]
      bare.blocksState = blocks
      bare.files['script.js'] = script
      await old.persistProject(bare, {}, controlScope)
      const readBare = await old.prepareEditableStudioProject(
        await old.loadProjectById('bare', controlScope),
      )
      const autoSync = await old.syncDrawingsIntoProjects(old.useProjectStore)
      if (!autoSync.updatedInOtherProjects) {
        const active = old.captureProjectStorageScope()
        const observed = await old.getPersonalAsset(source.id)
        throw new Error(
          JSON.stringify({
            autoSync,
            active: active.namespace,
            library: old.getPersonalAssetsNamespace(),
            drawing: observed
              ? { id: observed.id, kind: observed.kind, scene: observed.scene?.version }
              : null,
            summaries: (await old.listProjectSummariesLight(active)).map(
              ({ id, migrationPending, programmingLanguage }) => ({
                id,
                migrationPending,
                programmingLanguage,
              }),
            ),
          }),
        )
      }
      const finalBare = await old.loadProjectById('bare', controlScope)
      const finalMarked = await old.loadProjectById('marked', scope)
      return {
        projectionDroppedMarker: normalized.regional === undefined,
        projectionKeptExactPng: normalized.dataUrl === source.dataUrl,
        oldReadRefused,
        partitionReadRefused,
        staleWriteRefused,
        staleEditorRefused,
        flatCloudRefused,
        partsServerOnlySawEmptyMaterials: onlyProgram.assets.length === 0,
        bareOpenedAsPlainImage:
          readBare.assets[0].dataUrl === source.dataUrl && !readBare.assets[0].regional,
        oldAutoSyncUpdatedProjects: autoSync.updatedInOtherProjects,
        bareDowngradedToPreviousPng4: finalBare.assets[0].dataUrl === material.dataUrl,
        markedStillExact:
          finalMarked.assets[0].dataUrl === source.dataUrl &&
          finalMarked.assets[0].regional.sha256 === source.regional.sha256,
        bareProgramUntouched:
          finalBare.files['script.js'] === script &&
          finalBare.blocksState.blocks.blocks[0].id === blocks.blocks.blocks[0].id,
      }
    },
    { material, source, previous, blocks, script, namespace },
  )
  // The RED condition is intentional evidence: the published binary downgrades an unmarked
  // capture. The positive control is the exact same PNG with the durable marker.
  assert.deepEqual(fences, {
    projectionDroppedMarker: true,
    projectionKeptExactPng: true,
    oldReadRefused: true,
    partitionReadRefused: true,
    staleWriteRefused: true,
    staleEditorRefused: true,
    flatCloudRefused: true,
    partsServerOnlySawEmptyMaterials: true,
    bareOpenedAsPlainImage: true,
    oldAutoSyncUpdatedProjects: 1,
    bareDowngradedToPreviousPng4: true,
    markedStillExact: true,
    bareProgramUntouched: true,
  })
  await Promise.all(Object.values(tabs).map((tab) => tab.close()))
  const reloaded = await context.newPage()
  await reloaded.goto(origin)
  const reopened = await reloaded.evaluate(
    async ({ material, source, blocks, script }) => {
      const modern = await import('/new.mjs')
      const scope = modern.privateRegionalProjectScope('chrome-compat')
      const raw = await modern.loadProjectById('marked', scope)
      const approved = await modern.prepareEditableStudioProject(raw, {
        [modern.PRIVATE_REGIONAL_JS_PROJECT]: true,
      })
      const saved = approved.assets[0]
      return {
        projectId: approved.id,
        materialId: saved.id,
        name: saved.name,
        path: saved.proPath,
        pngExact: saved.dataUrl === source.dataUrl,
        programExact:
          approved.files['script.js'] === script &&
          JSON.stringify(approved.blocksState) === JSON.stringify(blocks),
        oneSceneSource: saved.scene === undefined && saved.tilemap === undefined,
        sha256: saved.regional.sha256,
        originBinding: saved.libId === material.libId,
      }
    },
    { material, source, blocks, script },
  )
  assert.deepEqual(reopened, {
    projectId: 'marked',
    materialId: material.id,
    name: material.name,
    path: material.proPath,
    pngExact: true,
    programExact: true,
    oneSceneSource: true,
    sha256: region.sha256,
    originBinding: true,
  })
  console.log(
    JSON.stringify({
      chromeVersion: browser.version(),
      oldBundleSha256: digest(oldBundle),
      newBundleSha256: digest(newBundle),
      ...denied,
      ...fences,
      reopened,
    }),
  )
  await context.close()
} finally {
  await browser.close()
}
