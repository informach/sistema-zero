import { writeFileSync } from 'node:fs'
import { productionApplicationIds } from '../release/kids-journey-targets.mjs'
import {
  createRailwayPorts,
  describeKidsJourneyRolloutFailure,
  prepareSsh,
} from './kids-journey-rollout.mjs'

const record = {
  kind: 'production-readonly-transport-diagnostic',
  startedAt: new Date().toISOString(),
  state: 'RUNNING',
  phase: 'credential-shape',
  providerMutations: 0,
  secretValuesOrHashesRecorded: false,
  api: [],
}
const save = () =>
  writeFileSync('production-readonly-diagnostic.json', JSON.stringify(record, null, 2) + '\n', {
    mode: 0o600,
  })
let ssh
try {
  record.credentials = {
    apiPresent: !!process.env.RAILWAY_TOKEN,
    sshPresent: !!process.env.RAILWAY_SSH_PRIVATE_KEY,
    trustedHostShape: (process.env.RAILWAY_SSH_KNOWN_HOSTS ?? '')
      .split(/\r?\n/)
      .some((line) =>
        /^ssh\.railway\.com (ssh-ed25519|ecdsa-sha2-nistp256|ssh-rsa) [A-Za-z0-9+/=]+$/.test(line),
      ),
  }
  save()
  record.phase = 'prepare-ssh'
  save()
  ssh = prepareSsh(process.env)
  record.phase = 'registry'
  save()
  const ids = productionApplicationIds(process.env)
  const backend = createRailwayPorts(
    '9ce4c99ab6e4b2dd1e16a017a786fc9e55d7f930',
    process.env,
    ssh.identity,
    {
      target: 'production',
      applications: true,
      log: () => {},
      fetch: async (url, init) => {
        const response = await fetch(url, init)
        const request = JSON.parse(init.body)
        const reply = await response.clone().json()
        record.api.push({
          serviceId: request.variables?.s ?? null,
          environmentId: request.variables?.e ?? null,
          httpStatus: response.status,
          nativeStatusQuery: /serviceInstanceAutoDeployStatus/.test(request.query),
          enabled:
            typeof reply.data?.serviceInstanceAutoDeployStatus?.enabled === 'boolean'
              ? reply.data.serviceInstanceAutoDeployStatus.enabled
              : null,
          hasData: !!reply.data,
          errorCount: Array.isArray(reply.errors) ? reply.errors.length : 0,
          authorizationRejected:
            reply.errors?.some((e) => ['Not Authorized', 'Unauthorized'].includes(e.message)) ??
            false,
        })
        save()
        return response
      },
    },
  )
  record.phase = 'native-autodeploy-readonly'
  save()
  await backend.requireNativeDisabled(Object.keys(ids), backend.now() + 120000)
  record.phase = 'backend-readonly-probes'
  save()
  await backend.preflight(backend.now() + 120000)
  record.phase = 'published-journey-readonly'
  save()
  const result = await backend.remote('verify', 'active', {}, backend.now() + 90000)
  if (result.status !== 'published') throw Error('POLICY_NOT_PUBLISHED')
  record.state = 'READONLY_PRODUCTION_PREFLIGHT_VALID'
} catch (error) {
  record.state = 'READONLY_PREFLIGHT_REFUSED'
  record.failure = describeKidsJourneyRolloutFailure(error)
  process.exitCode = 1
} finally {
  ssh?.dispose()
  record.finishedAt = new Date().toISOString()
  save()
  console.log(JSON.stringify(record))
}
