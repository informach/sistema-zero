import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { createDbConnection } from '../packages/marketing/src/infrastructure/persistence/drizzle/db'
import { metricPublicationSnapshots } from '../packages/marketing/src/infrastructure/persistence/drizzle/schema'
import {
  approvedEditionSchema,
  deliverySchema,
  stableEditorialId,
} from '../packages/marketing-contracts/src'

// The publication and counters are explicit fixtures. No social provider is called.
if (!process.argv.includes('--native-review')) throw new Error('Use --native-review')
const root = path.resolve(import.meta.dir, '..')
const desktop = path.join(root, 'packages/marketing-desktop/.cache')
const fixture = z
  .object({
    userId: z.string().uuid(),
    email: z.string(),
    password: z.string(),
    origin: z.literal('http://127.0.0.1:15334'),
  })
  .parse(
    JSON.parse(await readFile(path.join(desktop, 'native-connected-proof/fixture.json'), 'utf8')),
  )
const exported = z
  .object({
    projectId: z.string().uuid(),
    editionId: z.string().uuid(),
    editionHash: z.string(),
  })
  .parse(
    JSON.parse(await readFile(path.join(desktop, 'edition-export-proof/evidence.json'), 'utf8')),
  )
assert.equal(exported.projectId, await stableEditorialId(`${fixture.userId}:edition-export-v1`))
const login = await fetch(`${fixture.origin}/api/auth/login`, {
  method: 'POST',
  headers: { origin: fixture.origin, 'content-type': 'application/json' },
  body: JSON.stringify({ email: fixture.email, password: fixture.password }),
})
await login.body?.cancel()
assert(login.ok, 'Login de revisão falhou')
const cookie = login.headers
  .getSetCookie()
  .map((value) => value.split(';')[0])
  .join('; ')
assert(cookie)
async function request(route: string, body?: unknown) {
  const response = await fetch(`${fixture.origin}/api/marketing/workspace${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { cookie, origin: fixture.origin, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  })
  if (!response.ok) {
    await response.body?.cancel()
    throw new Error(`Revisão HTTP ${response.status}: ${route}`)
  }
  return response.json()
}
const edition = approvedEditionSchema.parse(
  await request(`/projects/${exported.projectId}/editions/${exported.editionId}`),
)
assert.equal(edition.hash, exported.editionHash)
const delivery = deliverySchema.parse(
  await request(`/projects/${exported.projectId}/deliveries`, {
    schemaVersion: 1,
    operationId: await stableEditorialId(`${edition.id}:learning-fixture-delivery`),
    editionId: edition.id,
    expectedHash: edition.hash,
    format: 'ig_story',
    sourcePublicationId: null,
  }),
)
const published = deliverySchema.parse(
  await request(`/projects/${exported.projectId}/deliveries/${delivery.id}/actions`, {
    schemaVersion: 1,
    operationId: await stableEditorialId(`${delivery.id}:learning-fixture-published`),
    version: delivery.version,
    expectedHash: edition.hash,
    action: 'mark-published',
    externalUrl: 'https://www.instagram.com/stories/marketing_review_fixture/123/',
    externalPostId: null,
    confirmedEdition: true,
  }),
)
assert.equal(published.socialAccountId, null)
assert.equal(published.publishMode, 'manual')
const snapshotId = await stableEditorialId(`${delivery.id}:learning-fixture-snapshot`)
const password = (
  await readFile(path.join(root, '.cache/pg16-native-review/password'), 'utf8')
).trim()
const db = createDbConnection(
  `postgres://postgres:${encodeURIComponent(password)}@127.0.0.1:15440/marketing_review`,
)
try {
  await db.db
    .insert(metricPublicationSnapshots)
    .values({
      id: snapshotId,
      publicationId: delivery.id,
      capturedAt: new Date(published.publishedAt ?? published.createdAt),
      collectionVersion: 1,
      views: 1200,
      likes: 42,
      comments: null,
      shares: 0,
      saves: 36,
    })
    .onConflictDoNothing()
} finally {
  await db.close()
}
const directory = path.join(desktop, 'metrics-learning-proof')
await mkdir(directory, { recursive: true })
const evidence = {
  projectId: exported.projectId,
  editionId: edition.id,
  editionHash: edition.hash,
  pieceId: edition.snapshot.pieceId,
  representationId: edition.snapshot.representationId,
  deliveryId: delivery.id,
  snapshotId,
  syntheticMetrics: true,
  socialPublicationPerformed: false,
}
await writeFile(path.join(directory, 'fixture.json'), JSON.stringify(evidence, null, 2))
console.log(JSON.stringify(evidence))
