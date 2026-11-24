import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  PintaCausalArchiveItemSchema,
  PintaCausalArchivePageSchema,
  type PintaCausalAttestation,
  type PintaCausalIntent,
  type PintaCausalManifest,
  type PintaCausalMember,
  type PintaCausalRead,
  PintaCausalSnapshotPageSchema,
  pintaCausalBlobKey,
  pintaCausalIntentHash,
} from '@sistemazero/core/creations/pinta-causal'
import { Elysia } from 'elysia'
import { CREATION_LIMITS } from '../../src/domain/creations/creation'
import { DrizzleCreationsRepository } from '../../src/infrastructure/persistence/drizzle/creations.repository'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePintaRetirementRepository } from '../../src/infrastructure/persistence/drizzle/pinta-causal-retirement'
import { DrizzlePintaCausalRepository } from '../../src/infrastructure/persistence/drizzle/pinta-causal-units.repository'
import { pintaCausalRoutes } from '../../src/interfaces/http/routes/pinta-causal.routes'
import { kidsJourneyTestTarget, openKidsJourneyTestDatabase } from '../../tests/db/kids-journey-database'

const url = process.env.PINTA_CAUSAL_TEST_DATABASE_URL
if (url) kidsJourneyTestTarget(url)
const time = '2026-11-22T12:00:00.000Z'
async function rejection<T>(p: Promise<T>) {
  try {
    await p
  } catch (error) {
    return error
  }
  throw Error('expected rejection')
}
const sha = (n: number) => n.toString(16).padStart(64, '0')
const slots = (v: number) => v.toString(16).padStart(2, '0') + '00'.repeat(31)
function actor() {
  return { userId: randomUUID(), accountId: randomUUID(), audience: 'kids' as const }
}
const put = (
  id: string,
  n: number,
  kind: PintaCausalManifest['kind'] = 'pixel-sprite',
  baseRevision = 0,
): Extract<PintaCausalMember, { action: 'put' }> => ({
  action: 'put',
  itemId: id,
  name: id,
  kind,
  bytes: 5,
  sha256: sha(n),
  itemUpdatedAt: time,
  formatVersion: 6,
  baseRevision,
  operation: { type: baseRevision ? 'update' : 'create' },
})
const manifest = (
  m: Extract<PintaCausalMember, { action: 'put' }>,
  rest: Partial<PintaCausalManifest> = {},
): PintaCausalManifest => ({
  version: 1,
  itemId: m.itemId,
  name: m.name,
  kind: m.kind,
  nativeSchema: 7,
  requiredNativeSchema: 1,
  backupVersion: 7,
  refs: [],
  doorSelectors: [],
  ...rest,
})
const intent = (
  epoch: string,
  members: PintaCausalMember[],
  readSet: PintaCausalRead[] = [],
): PintaCausalIntent => ({
  protocol: 1,
  opId: randomUUID(),
  baseEpoch: epoch,
  reader: 6,
  members,
  readSet,
})
const reservePage = async (i: PintaCausalIntent) => ({
  ...i,
  page: 0,
  pages: 1,
  intentHash: await pintaCausalIntentHash(i),
})
describe.skipIf(!url)('Pinta causal over the real migration and existing quota lock', () => {
  let conn: DbConnection, db: DrizzlePintaCausalRepository, legacy: DrizzleCreationsRepository
  beforeAll(async () => {
    conn = await openKidsJourneyTestDatabase(url!)
    db = new DrizzlePintaCausalRepository(conn.db)
    legacy = new DrizzleCreationsRepository(conn.db)
  }, 60_000)
  afterAll(() => conn?.close())
  async function reserve(a: ReturnType<typeof actor>, i: PintaCausalIntent) {
    const { status } = await db.reserve(a, await reservePage(i))
    if (status.state !== 'reserved') throw Error('expected live reservation')
    return status.tickets
  }
  async function complete(
    a: ReturnType<typeof actor>,
    i: PintaCausalIntent,
    contents: (PintaCausalManifest | null)[],
    transitions: PintaCausalAttestation['transitions'][] = [],
  ) {
    const tickets = await reserve(a, i)
    for (const [n, binding] of tickets.entries())
      await db.attest(a, {
        purpose: 'pinta-unit-content-v1',
        binding,
        manifest: contents[n]!,
        transitions: transitions[n] ?? [],
      })
    return db.commit(a, { opId: i.opId })
  }
  test('mesma sequência confirma índice estável e retém epoch se o mapa omitido usava slot removido',async()=>{
    for(const bit of [1,2]){
      const a=actor(), sheet=put('A',1,'tileset'), m=put('M',2,'tilemap')
      const sm=(count:number)=>manifest(sheet,{sheet:{tileSize:8,count}})
      const mm=()=>manifest(m,{refs:[{id:'A',roles:['default-sheet'],indices:slots(bit)}]})
      await complete(a,intent('0',[sheet,m],[{source:'unit',consumerId:'M',targetId:'A'}]),[sm(2),mm()])
      const update=put('M',3,'tilemap',1)
      await complete(a,intent('1',[update],[{source:'snapshot',consumerId:'M',targetId:'A',revision:1,sha256:sheet.sha256,layoutRevision:'1'}]),[mm()])
      const after={...put('A',4,'tileset',1),operation:{type:'remap' as const,oldToNew:[0,-1],count:1}}
      const change=intent('2',[after])
      if(bit===1)await complete(a,change,[sm(1)])
      else expect(await rejection(complete(a,change,[sm(1)]))).toMatchObject({reason:'missing-consumer',itemId:'M'})
      const snapshot=await db.page(a,{reader:6})
      expect(snapshot).toMatchObject({epoch:bit===1?'3':'2',entries:[{itemId:'A',revision:bit===1?2:1,sha256:bit===1?after.sha256:sheet.sha256},{itemId:'M',revision:2,sha256:update.sha256}]})
    }
  })
})
