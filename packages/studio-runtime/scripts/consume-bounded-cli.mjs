import { spawn } from 'node:child_process'
import { closeSync, openSync } from 'node:fs'

/**
 * @typedef {{present: true, type: 'undefined'|'object'|'boolean'|'number'|'bigint'|'string'|'symbol'|'function', nullRejection: boolean}} CliObservationFailure
 * @typedef {{
 *   pid: number|null,
 *   status: number|null,
 *   signal: NodeJS.Signals|null,
 *   errorCode: string|null,
 *   timedOut: boolean,
 *   retained: boolean,
 *   signalSent: false,
 *   logsMayStillChange: boolean,
 *   resourceLease: 'held',
 *   startedAt: string,
 *   observerFailure?: CliObservationFailure,
 *   deadlineObservationFailure?: CliObservationFailure
 * }} BoundedCliRecord
 * @typedef {BoundedCliRecord & {
 *   consumerFinishedAt: string,
 *   cleanup: 'unknown-owned-process-retained'|'direct-child-settled-needs-native-postconditions',
 *   retentionReceiptFailure?: CliObservationFailure
 * }} BoundedCliResult
 */

/** Consumer deadline never implies native cancellation. Logs are public local-only files.
 * Inherited file handles let a retained child write without a closed-pipe EPIPE.
 * The lease callback must persist ownership before the consumer unrefs and returns.
 * @returns {Promise<BoundedCliResult>}
 */
export async function consumeBoundedCli({
  application,
  argv,
  cwd,
  env,
  stdoutPath,
  stderrPath,
  operationMs,
  graceMs,
  onSpawn,
  onDeadline,
  onRetain,
}) {
  /** @type {BoundedCliRecord} */
  const record = {
    pid: null,
    status: null,
    signal: null,
    errorCode: null,
    timedOut: false,
    retained: false,
    signalSent: false,
    logsMayStillChange: false,
    resourceLease: 'held',
    startedAt: new Date().toISOString(),
  }
  const out = openSync(stdoutPath, 'wx')
  let err, child, softTimer, graceTimer
  try {
    err = openSync(stderrPath, 'wx')
    child = spawn(application, argv, { cwd, env, stdio: ['ignore', out, err], windowsHide: true })
    record.pid = child.pid ?? null
    const settled = new Promise((resolve) => {
      child.once('error', (error) => {
        record.errorCode = error.code ?? error.name
        resolve('settled')
      })
      child.once('close', (status, signal) => {
        record.status = status
        record.signal = signal
        resolve('settled')
      })
    })
    const soft = new Promise((resolve) => {
      softTimer = setTimeout(() => resolve('deadline'), operationMs)
    })
    try {
      await onSpawn?.({ ...record })
    } catch (error) {
      record.observerFailure = { present: true, type: typeof error, nullRejection: error === null }
    }
    const first = record.observerFailure ? 'observer-failed' : await Promise.race([settled, soft])
    if (first !== 'settled') {
      record.timedOut = first === 'deadline'
      try {
        await onDeadline?.({ ...record })
      } catch (error) {
        record.deadlineObservationFailure = {
          present: true,
          type: typeof error,
          nullRejection: error === null,
        }
      } // Keep retention finite even if observation fails.
      const grace = new Promise((resolve) => {
        graceTimer = setTimeout(() => resolve('retained'), graceMs)
      })
      if ((await Promise.race([settled, grace])) === 'retained') {
        record.retained = true
        record.logsMayStillChange = true
        /** @type {BoundedCliResult} */
        const snapshot = {
          ...record,
          consumerFinishedAt: new Date().toISOString(),
          cleanup: 'unknown-owned-process-retained',
        }
        // Do not release a resource lease merely because its consumer is finished.
        try {
          await onRetain(snapshot)
        } catch (error) {
          snapshot.retentionReceiptFailure = {
            present: true,
            type: typeof error,
            nullRejection: error === null,
          }
          process.stdout.write(
            `${JSON.stringify({
              kind: 'unqualified-retained-owned-cli',
              pid: snapshot.pid,
              cleanup: 'unknown',
              resourceLease: 'held',
              receiptWriteFailed: true,
            })}\n`,
          )
        }
        child.unref() // No signal, no pipe destruction, no application/native handle disposal.
        return snapshot
      }
    }
    return {
      ...record,
      consumerFinishedAt: new Date().toISOString(),
      cleanup: 'direct-child-settled-needs-native-postconditions',
    }
  } finally {
    clearTimeout(softTimer)
    clearTimeout(graceTimer)
    closeSync(out)
    if (err !== undefined) closeSync(err)
  }
}
