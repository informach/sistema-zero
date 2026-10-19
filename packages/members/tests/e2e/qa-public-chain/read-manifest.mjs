import { readFile, realpath } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../../../', import.meta.url))
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
export function qaDatabaseUrl(name) {
  if (
    typeof name !== 'string' ||
    !/^sz_integrated_qa(?:_[a-z0-9]+)*$/.test(name) ||
    name.length > 60
  )
    throw new Error('Owned loopback QA database name required')
  return `postgres://postgres@127.0.0.1:55433/${name}`
}
export async function readQaPublicManifest(path, { requireReady = true } = {}) {
  const directory = await realpath(resolve(root, '.cache/studio-python-l0/public-chain-qa'))
  const actual = await realpath(resolve(path))
  if (!actual.startsWith(directory + sep))
    throw new Error('Manifest must remain in the owned public-chain QA directory')
  const value = JSON.parse(await readFile(actual, 'utf8'))
  if (
    !value ||
    value.version !== 1 ||
    !uuid.test(value.userId ?? '') ||
    !uuid.test(value.childId ?? '') ||
    !Number.isSafeInteger(value.policyVersion) ||
    value.policyVersion < 1 ||
    !(requireReady ? value.state === 'ready' : ['admitted', 'ready'].includes(value.state)) ||
    value.ports?.gateway !== 43100 ||
    value.ports?.auth !== 43102 ||
    value.ports?.members !== 43104 ||
    value.ports?.hub !== 43110
  )
    throw new Error('Canonical admission manifest is incomplete or not ready')
  qaDatabaseUrl(value.database)
  return value
}
if (import.meta.main) {
  const path = process.argv[2]
  if (!path) throw new Error('Pass the exact manifest.json produced by adult-parity-stack.mjs')
  const value = await readQaPublicManifest(path)
  // Safe selector input for existing probes; no session token or credential is stored here.
  console.log(
    JSON.stringify({
      database: value.database,
      childId: value.childId,
      accountId: value.userId,
      policyVersion: value.policyVersion,
    }),
  )
}
