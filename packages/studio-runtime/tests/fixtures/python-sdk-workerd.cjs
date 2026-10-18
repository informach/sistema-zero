const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { createReadStream } = require('node:fs')
const { Readable } = require('node:stream')
const { createHash } = require('node:crypto')
const net = require('node:net')
const { pathToFileURL } = require('node:url')
const { createRequire } = require('node:module')
const localRequire = createRequire(
  require.resolve('wrangler/package.json', { paths: [process.cwd()] }),
)
const { unstable_dev } = localRequire('wrangler')

async function main() {
  const seed = JSON.parse(await fs.readFile(process.argv[3], 'utf8'))
  let port = 0
  if (seed.preview) {
    const reservation = net.createServer()
    await new Promise((resolve, reject) => {
      reservation.once('error', reject)
      reservation.listen(0, '127.0.0.1', resolve)
    })
    port = reservation.address().port
    await new Promise((resolve, reject) =>
      reservation.close((error) => (error ? reject(error) : resolve())),
    )
    const config = JSON.parse(await fs.readFile(process.argv[4], 'utf8'))
    config.vars.STUDIO_PYTHON_PREVIEW_ORIGIN = `http://127.0.0.1:${port}`
    await fs.writeFile(process.argv[4], JSON.stringify(config))
  }
  const worker = await unstable_dev(process.argv[2], {
    config: process.argv[4],
    ip: '127.0.0.1',
    port,
    local: true,
    persist: false,
    envFiles: [],
    logLevel: process.env.STUDIO_SDK_PROOF_LOG_LEVEL ?? 'error',
    experimental: {
      disableExperimentalWarning: true,
      disableDevRegistry: true,
      watch: false,
      forceLocal: true,
      enableContainers: true,
    },
  })
  const lifetime = new AbortController()
  let destruction
  const stop = () => (destruction ??= worker.stop())
  const terminate = () => {
    lifetime.abort(new Error('The owned SDK proof was terminated'))
    void stop().catch(() => {})
  }
  process.once('SIGTERM', terminate)
  const origin = `http://${worker.address}:${worker.port}`
  const send = (route, body, reference) =>
    fetch(`${origin}${route}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${seed.internalToken}`,
        ...(reference ? { 'X-Studio-Python-Input': JSON.stringify(reference) } : {}),
      },
      body,
      signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(150_000)]),
    })
  let reference
  try {
    const health = await fetch(`${origin}/healthz`, {
      // Wrangler's proxy is announced before a cold Docker image is built.
      // This is tool preparation, separate from the inspection's 120-second lease.
      signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(300_000)]),
    })
    assert.equal(health.status, 200, await health.text())
    console.error(JSON.stringify({ phase: 'runtime-seed', files: seed.runtimeFiles.length }))
    for (const file of [...seed.runtimeFiles, { path: 'complete.json' }]) {
      console.error(JSON.stringify({ phase: 'runtime-file', path: file.path }))
      const body =
        file.path === 'complete.json'
          ? seed.marker
          : Readable.toWeb(createReadStream(path.join(seed.runtimeDirectory, file.path)))
      const response = await fetch(`${origin}/__proof/runtime/${file.path}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${seed.proofToken}` },
        body,
        ...(typeof body === 'string' ? {} : { duplex: 'half' }),
        signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(60_000)]),
      })
      assert.equal(response.status, 200, await response.text())
    }
    if (seed.builder) {
      const { runStudioPythonBuilderSdkProof } = await import(
        pathToFileURL(path.join(path.dirname(process.argv[3]), 'builder-host.mjs')).href
      )
      await runStudioPythonBuilderSdkProof({
        origin,
        internalToken: seed.internalToken,
        proofToken: seed.proofToken,
        deployment: seed.builder.deployment,
        databaseUrl: seed.builder.databaseUrl,
        files: seed.files,
        evidence: path.dirname(process.argv[3]),
        signal: lifetime.signal,
      })
      return
    }
    const opened = await send('/v1/python/inputs', JSON.stringify(seed.request))
    const admission = await opened.json()
    assert.equal(opened.status, 200, JSON.stringify(admission))
    reference = admission.input
    assert.ok(reference)
    console.error(JSON.stringify({ phase: 'project-upload', files: seed.files.length }))
    for (const file of seed.files) {
      const metadata = seed.request.snapshot.files.find((entry) => entry.path === file.path)
      const uploaded = await send(
        `/v1/python/files/${metadata.sha256}`,
        new Uint8Array(file.bytes),
        reference,
      )
      assert.equal(uploaded.status, 200, await uploaded.text())
    }
    const started = performance.now()
    console.error(JSON.stringify({ phase: 'sdk-inspection' }))
    const inspection = seed.validate
      ? {
          version: 1,
          input: reference,
          structure: seed.structure,
          recipe: seed.recipe,
          ...(seed.preview ? { preview: { parentOrigin: 'https://kids.test' } } : {}),
        }
      : seed.structure
        ? { version: 1, input: reference, structure: true }
        : reference
    const pendingInspection = send(
      seed.validate ? '/v1/python/validate' : '/v1/python/inspect',
      JSON.stringify(inspection),
    )
    void pendingInspection.catch(() => {})
    if (seed.cancelDuringExec) {
      const targetExecs = seed.validate ? 2 : 1
      let state
      const deadline = Date.now() + 120_000
      while (Date.now() < deadline) {
        const response = await fetch(`${origin}/__proof/inspection/state`, {
          headers: {
            Authorization: `Bearer ${seed.proofToken}`,
            'X-Proof-Python-Input': JSON.stringify(reference),
          },
          signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(5000)]),
        })
        assert.equal(response.status, 200)
        state = await response.json()
        if (state.execStarted === targetExecs) break
        await new Promise((resolve) => setTimeout(resolve, 25))
      }
      assert.equal(state?.execStarted, targetExecs, 'The real SDK execution phase was not observed')
      assert.equal(
        state.execFinished,
        targetExecs - 1,
        'The execution finished before cancellation',
      )
      if (seed.restartBeforeCancel) {
        const restarted = await fetch(`${origin}/__proof/inspection/restart`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${seed.proofToken}`,
            'X-Proof-Python-Input': JSON.stringify(reference),
          },
          signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(5000)]),
        })
        assert.equal(restarted.status, 409, await restarted.text())
      }
      const cancelled = await fetch(`${origin}/v1/python/inputs/remove`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${seed.internalToken}`,
        },
        body: JSON.stringify(reference),
        signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(8000)]),
      })
      assert.equal(cancelled.status, 200, await cancelled.text())
    }
    const inspected = await pendingInspection
    const outcome = await inspected.json()
    if (seed.cancelDuringExec) {
      if (seed.restartBeforeCancel)
        assert.ok([408, 500, 503].includes(inspected.status), JSON.stringify(outcome))
      else {
        assert.equal(inspected.status, 408, JSON.stringify(outcome))
        assert.equal(outcome.code, 'REQUEST_RETIRED')
      }
      const response = await fetch(`${origin}/__proof/inspection/state`, {
        headers: {
          Authorization: `Bearer ${seed.proofToken}`,
          'X-Proof-Python-Input': JSON.stringify(reference),
        },
        signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(5000)]),
      })
      assert.equal(response.status, 200)
      const state = await response.json()
      assert.equal(state.created, 1)
      assert.equal(state.execStarted, seed.restartBeforeCancel ? 0 : seed.validate ? 2 : 1)
      assert.equal(state.execFinished, seed.restartBeforeCancel ? 0 : seed.validate ? 2 : 1)
      assert.equal(state.destroyStarted, 1)
      assert.equal(state.destroyFinished, 1)
      assert.equal(state.job.status, 'cancelled')
      assert.equal(state.job.sandboxCreated, true)
      assert.equal(state.job.cleanupConfirmed, true)
      assert.deepEqual(state.job.input, reference)
      assert.equal(outcome.report, undefined)
      console.log(
        JSON.stringify({
          verified: true,
          cancelled: true,
          restartRecovered: seed.restartBeforeCancel === true,
          state,
        }),
      )
      return
    }
    assert.equal(inspected.status, 200, JSON.stringify(outcome))
    if (seed.validate) {
      assert.equal(outcome.report.status, 'passed', JSON.stringify(outcome))
      assert.deepEqual(outcome.report.recipe, seed.recipe)
      const compilation = outcome.report.inspection
      const execution = outcome.report.execution
      assert.equal(compilation.status, 'passed')
      assert.equal(compilation.revision, seed.request.snapshot.revision)
      assert.equal(
        compilation.files.length,
        seed.files.filter((file) => /\.pyi?$/.test(file.path)).length,
      )
      if (seed.structure)
        assert.ok(compilation.files.every((file) => file.structure?.version === 1))
      assert.equal(execution.status, 'passed')
      assert.equal(execution.revision, seed.request.snapshot.revision)
      assert.equal(execution.projectId, seed.request.snapshot.projectId)
      assert.equal(execution.stopped, true)
      assert.deepEqual(execution.recipe, seed.recipe)
      if (seed.turtle) {
        for (const output of ['ola Lia', 'key-fired', 'click-fired'])
          assert.ok(execution.stdout.includes(output), execution.stdout)
        assert.ok(execution.capture?.sha256)
        assert.ok(execution.capture.frameSequence > 0)
      } else assert.ok(execution.stdout.includes('sdk-validation-ação'))
      const response = await fetch(`${origin}/__proof/inspection/state`, {
        headers: {
          Authorization: `Bearer ${seed.proofToken}`,
          'X-Proof-Python-Input': JSON.stringify(reference),
        },
        signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(5000)]),
      })
      assert.equal(response.status, 200)
      const state = await response.json()
      assert.equal(state.created, 1)
      assert.equal(state.execStarted, 2)
      assert.equal(state.execFinished, 2)
      assert.equal(state.destroyStarted, 1)
      assert.equal(state.destroyFinished, 1)
      assert.equal(state.job.status, 'succeeded')
      assert.equal(state.job.cleanupConfirmed, true)
      assert.deepEqual(state.job.operation, {
        mode: 'validate',
        recipe: seed.recipe,
        ...(seed.preview ? { preview: { parentOrigin: 'https://kids.test' } } : {}),
      })
      let previewProof
      if (seed.preview) {
        const ref = outcome.preview
        assert.equal(ref.kind, 'python-preview')
        assert.equal(ref.projectId, seed.request.snapshot.projectId)
        assert.equal(ref.revision, seed.request.snapshot.revision)
        assert.equal(new URL(ref.url).origin, origin)
        const recordResponse = await fetch(`${origin}/__proof/preview/${ref.id}`, {
          headers: { Authorization: `Bearer ${seed.proofToken}` },
        })
        assert.equal(recordResponse.status, 200)
        const recordBytes = Buffer.from(await recordResponse.arrayBuffer())
        assert.equal(createHash('sha256').update(recordBytes).digest('hex'), ref.sha256)
        const manifest = JSON.parse(recordBytes)
        assert.equal(manifest.jobId, state.job.jobId)
        assert.equal(manifest.revision, ref.revision)
        const archive = path.join(path.dirname(process.argv[3]), 'preview-artifacts')
        await fs.mkdir(archive, { recursive: true })
        await fs.writeFile(path.join(archive, 'manifest.json'), recordBytes)
        for (const file of manifest.files) {
          const response = await fetch(new URL(file.path, ref.url))
          assert.equal(response.status, 200)
          const bytes = Buffer.from(await response.arrayBuffer())
          assert.equal(bytes.length, file.bytes)
          assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256)
          const target = path.join(archive, 'files', file.path)
          await fs.mkdir(path.dirname(target), { recursive: true })
          await fs.writeFile(target, bytes)
        }
        if (execution.capture) {
          const captured = await fs.readFile(path.join(archive, 'files', execution.capture.path))
          assert.equal(captured.length, execution.capture.byteLength)
          assert.equal(
            createHash('sha256').update(captured).digest('hex'),
            execution.capture.sha256,
          )
          assert.equal(captured.readUInt32BE(16), execution.capture.width)
          assert.equal(captured.readUInt32BE(20), execution.capture.height)
        }
        const restart = () =>
          fetch(`${origin}/__proof/inspection/restart`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${seed.proofToken}`,
              'X-Proof-Python-Input': JSON.stringify(reference),
            },
          })
        assert.equal((await restart()).status, 409)
        assert.equal(
          (await fetch(ref.url)).status,
          200,
          'Successful decision must survive a real DO reset',
        )
        const removed = await send('/v1/python/inputs/remove', JSON.stringify(reference))
        assert.equal(removed.status, 200, await removed.text())
        assert.equal(
          (await fetch(ref.url)).status,
          200,
          'Normal input cleanup must preserve the preview',
        )
        const discarded = await send('/v1/python/previews/remove', JSON.stringify(reference))
        assert.equal(discarded.status, 200, await discarded.text())
        assert.equal((await fetch(ref.url)).status, 404)
        assert.equal((await restart()).status, 409)
        assert.equal((await fetch(ref.url)).status, 404, 'Retirement must survive a real DO reset')
        previewProof = {
          reference: ref,
          storedFiles: manifest.files.length,
          resetAvailable: true,
          inputCleanupPreserved: true,
          discardResetDenied: true,
        }
      }
      console.log(
        JSON.stringify({
          verified: true,
          validated: true,
          durationMs: Math.round(performance.now() - started),
          report: outcome.report,
          state,
          ...(previewProof ? { preview: previewProof } : {}),
        }),
      )
      return
    }
    assert.equal(outcome.report.status, 'passed')
    assert.equal(outcome.report.revision, seed.request.snapshot.revision)
    assert.equal(outcome.report.files.length, seed.files.length)
    assert.equal(outcome.report.pythonVersion, '3.14.2')
    if (seed.structure) {
      assert.ok(
        outcome.report.files.every(
          (file) => file.structure?.version === 1 && file.structure.nodesVisited > 0,
        ),
      )
      const main = outcome.report.files.find((file) => file.path === 'main.py').structure
      const empty = outcome.report.files.find((file) => file.path === 'empty.py').structure
      assert.deepEqual(main.assignedNames, ['absent_student_package'])
      assert.deepEqual(main.callTargets, ['RuntimeError'])
      assert.deepEqual(main.definedFunctions, [])
      assert.deepEqual(empty.assignedNames, [])
      assert.deepEqual(empty.callTargets, [])
      assert.equal(empty.nodesVisited, 1)
      const bindings = outcome.report.files.find((file) => file.path === 'bindings.py').structure
      const encoding = outcome.report.files.find((file) => file.path === 'encoding.py').structure
      assert.deepEqual(bindings.assignedNames, ['T', 'jogar', 'p', 't', 'valor'])
      assert.deepEqual(bindings.definedFunctions, ['jogar'])
      assert.deepEqual(bindings.callTargets, ['factory', 'range', 't.forward'])
      assert.equal(bindings.usesLoop, true)
      assert.equal(bindings.usesConditional, true)
      assert.deepEqual(encoding.assignedNames, ['ação'])
    }
    console.log(
      JSON.stringify({
        verified: true,
        durationMs: Math.round(performance.now() - started),
        report: outcome.report,
      }),
    )
  } finally {
    try {
      if (reference) {
        const removed = await send('/v1/python/inputs/remove', JSON.stringify(reference))
        assert.equal(removed.status, 200, await removed.text())
      }
    } finally {
      let timer
      try {
        await Promise.race([
          stop(),
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new Error('SDK proof teardown was not confirmed')),
              10_000,
            )
          }),
        ])
      } finally {
        clearTimeout(timer)
        process.removeListener('SIGTERM', terminate)
      }
    }
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
