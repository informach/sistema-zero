// Trusted QA lifetime adapter; does not intercept auth/runtime/provider behavior.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

const job = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
let requested = false
let phase = 'preclaim'
try {
  if (sha(readFileSync(job.entry)) !== job.entrySha256) throw new Error('Trusted QA entry changed')
  const envBytes = readFileSync(job.envFile)
  if (sha(envBytes) !== job.envSha256) throw new Error('Reviewed QA environment changed')
  const environment = JSON.parse(envBytes.toString('utf8'))
  if (environment.version !== 1 || environment.role !== job.role)
    throw new Error('QA environment role mismatch')
  const browserExports = {
    adminBrowser: 'runPythonLessonAdmin',
    kidsBrowser: 'runPythonLessonKids',
  }
  const credentialKeys = {
    adminBrowser: ['STUDIO_LESSONS_QA_ADMIN_EMAIL', 'STUDIO_LESSONS_QA_ADMIN_PASSWORD'],
    kidsBrowser: [
      'STUDIO_LESSONS_QA_PARENT_EMAIL',
      'STUDIO_LESSONS_QA_PARENT_PASSWORD',
      'STUDIO_LESSONS_QA_LEARNER_ID',
    ],
  }
  const ephemeral = {}
  if (job.entryExport) {
    if (browserExports[job.role] !== job.entryExport)
      throw new Error('Closed browser export required')
    for (const key of credentialKeys[job.role]) {
      if (!process.env[key]) throw new Error('Missing in-memory QA credential')
      ephemeral[key] = process.env[key]
    }
  }
  const platform = Object.fromEntries(
    ['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PROGRAMFILES', 'PROGRAMFILES(X86)']
      .filter((key) => process.env[key])
      .map((key) => [key, process.env[key]]),
  )
  // Windows resolves known folders from USERPROFILE even with --user-data-dir.
  // Its Local/Roaming directories must exist in this owned QA home; do not use
  // the personal profile or relax Chrome's default-directory protection.
  const localAppData = join(job.home, 'AppData', 'Local')
  const roamingAppData = join(job.home, 'AppData', 'Roaming')
  mkdirSync(localAppData, { recursive: true })
  mkdirSync(roamingAppData, { recursive: true })
  for (const key of Object.keys(process.env)) delete process.env[key]
  Object.assign(process.env, platform, environment.env, ephemeral, {
    PATH: job.cleanPath,
    USERPROFILE: job.home,
    HOME: job.home,
    LOCALAPPDATA: localAppData,
    APPDATA: roamingAppData,
  })

  // No application import, child, listener, port or remote work before durable claim.
  // Referenced polling keeps this adapter alive only for this bounded handshake.
  const deadline = performance.now() + 10_000
  while (!existsSync(job.claimFile)) {
    if (performance.now() >= deadline) throw new Error('QA owner claim deadline')
    await delay(25)
  }
  if (performance.now() >= deadline) throw new Error('QA owner claim arrived after deadline')
  const claim = JSON.parse(readFileSync(job.claimFile, 'utf8'))
  const stateBytes = readFileSync(job.stateFile)
  const state = JSON.parse(stateBytes.toString('utf8'))
  if (
    claim.version !== 1 ||
    claim.pid !== process.pid ||
    claim.nonce !== job.nonce ||
    claim.stateSha256 !== sha(stateBytes) ||
    state.root.processId !== process.pid ||
    state.nonce !== job.nonce ||
    state.owner !== job.owner ||
    state.run !== job.run ||
    state.status !== 'witnessed-awaiting-app' ||
    state.role !== job.role
  )
    throw new Error('QA owner claim mismatch')
  if (existsSync(job.stopRequest)) throw new Error('QA stop requested before app import')
  writeFileSync(
    job.claimReceipt,
    JSON.stringify({
      state: 'claim-accepted-not-ready',
      pid: process.pid,
      nonce: job.nonce,
      at: new Date().toISOString(),
    }),
    { flag: 'wx' },
  )
  process.chdir(job.cwd)
  process.argv = [process.execPath, job.entry, ...job.argv]
  let delivered = false
  const watch = setInterval(() => {
    if (!existsSync(job.stopRequest)) return
    requested = true
    if (!delivered && process.listenerCount('SIGTERM') > 0) {
      delivered = true
      clearInterval(watch)
      writeFileSync(
        job.signalReceipt,
        JSON.stringify({
          state: 'delivered-to-existing-app-handler',
          at: new Date().toISOString(),
          pid: process.pid,
          role: job.role,
          method: 'QA file request -> existing SIGTERM event handler; not a native OS signal',
        }),
        { flag: 'wx' },
      )
      process.emit('SIGTERM')
    }
  }, 100)
  watch.unref()
  phase = 'app-import'
  const entry = await import(pathToFileURL(job.entry).href)
  if (job.entryExport) {
    await entry[job.entryExport]()
    const pendingCompletion = `${job.runComplete}.pending`
    writeFileSync(
      pendingCompletion,
      JSON.stringify({
        state: 'scenario-returned-not-resource-qualified',
        exitCode: Number(process.exitCode ?? 0),
        pid: process.pid,
        nonce: job.nonce,
        at: new Date().toISOString(),
      }),
      { flag: 'wx' },
    )
    renameSync(pendingCompletion, job.runComplete)
    // Keep the witnessed root alive while the external owner reconciles Chrome.
    const ackDeadline = performance.now() + 30_000
    while (!existsSync(job.completionAck)) {
      if (performance.now() >= ackDeadline)
        throw new Error('External cleanup acknowledgement deadline')
      await delay(25)
    }
    const ack = JSON.parse(readFileSync(job.completionAck, 'utf8'))
    if (ack.pid !== process.pid || ack.nonce !== job.nonce)
      throw new Error('External completion acknowledgement mismatch')
  }
} catch (error) {
  let name = 'Error'
  try {
    if (typeof error?.name === 'string') name = error.name.slice(0, 80)
  } catch {}
  // Never persist arbitrary error message/stack/URL/env values.
  try {
    writeFileSync(
      job.failureReceipt,
      JSON.stringify({
        state: 'failed',
        phase,
        name,
        role: job.role,
        pid: process.pid,
        stopRequested: requested,
      }),
      { flag: 'wx' },
    )
  } catch {}
  console.error(JSON.stringify({ state: 'qa-entry-failed', phase, name, pid: process.pid }))
  process.exitCode = 1
  if (phase === 'preclaim') process.exit(1) // No imported app/children to drain.
  if (process.listenerCount('SIGTERM') > 0) process.emit('SIGTERM')
}
