import { pathToFileURL } from 'node:url'
import { stagingJourney, uuidPattern } from '../release/kids-journey-bootstrap.mjs'
import { STAGING_DEPLOYMENT_TIMEOUT_MS } from './kids-journey-rollout.mjs'
import { railwayReadQuery } from './railway-read-query.mjs'

const failed = new Set(['FAILED', 'CRASHED', 'REMOVED', 'SKIPPED', 'CANCELED', 'CANCELLED'])
const pending = new Set([
  'INITIALIZING',
  'QUEUED',
  'WAITING',
  'BUILDING',
  'DEPLOYING',
  'REMOVING',
  'SLEEPING',
])

/** One provider request per round for the whole wave; never issues a deployment. */
export async function monitorStagingDeployments(input, options = {}) {
  const { entries, sha, token } = input
  if (
    !/^[a-f0-9]{40}$/.test(sha ?? '') ||
    !Array.isArray(entries) ||
    !entries.length ||
    entries.length > 32 ||
    entries.some(
      (entry) =>
        !entry ||
        !/^[a-z][a-z0-9-]{0,63}$/.test(entry.service) ||
        !uuidPattern.test(entry.id) ||
        !uuidPattern.test(entry.serviceId),
    ) ||
    new Set(entries.map((e) => e.id)).size !== entries.length ||
    new Set(entries.map((e) => e.service)).size !== entries.length ||
    new Set(entries.map((e) => e.serviceId)).size !== entries.length
  )
    throw new Error('Invalid staging monitor input')
  const now = options.now ?? (() => performance.now())
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  const log = options.log ?? ((value) => console.log(JSON.stringify(value)))
  const deadline = now() + STAGING_DEPLOYMENT_TIMEOUT_MS
  const variables = Object.fromEntries(entries.map((entry, i) => [`id${i}`, entry.id]))
  const declarations = entries.map((_, i) => `$id${i}:String!`).join(',')
  const fields = entries
    .map((_, i) => `d${i}:deployment(id:$id${i}){id projectId environmentId serviceId status meta}`)
    .join(' ')
  const query = `query(${declarations}){${fields}}`
  for (;;) {
    if (now() >= deadline) throw new Error('Staging monitor deadline exceeded')
    const data = await railwayReadQuery(query, variables, {
      ...options,
      token,
      now,
      sleep,
      log,
      deadline,
    })
    const statuses = entries.map((entry, i) => {
      const current = data[`d${i}`]
      if (
        !current ||
        current.id !== entry.id ||
        current.projectId !== stagingJourney.project ||
        current.environmentId !== stagingJourney.environment ||
        current.serviceId !== entry.serviceId
      )
        throw new Error('Staging deployment identity diverged')
      if (failed.has(current.status)) throw new Error(`Staging deployment failed: ${entry.service}`)
      if (current.status === 'SUCCESS') {
        if (current.meta?.commitHash !== sha) throw new Error('Staging deployment commit diverged')
      } else if (!pending.has(current.status)) throw new Error('Unknown staging deployment status')
      return { service: entry.service, status: current.status }
    })
    log({ stage: 'staging-deployment-poll', statuses })
    if (statuses.every((item) => item.status === 'SUCCESS')) return
    if (now() >= deadline) throw new Error('Staging monitor deadline exceeded')
    await sleep(Math.min(30_000, deadline - now()))
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await monitorStagingDeployments({
      sha: process.argv[2],
      token: process.env.RAILWAY_TOKEN,
      entries: JSON.parse(process.env.RAILWAY_DEPLOYMENTS ?? 'null'),
    })
  } catch (error) {
    // Only errors created locally by this monitor/transport carry safe diagnostics.
    console.error(`::error::${error instanceof Error ? error.message : 'Staging monitor failed'}`)
    process.exitCode = 1
  }
}
