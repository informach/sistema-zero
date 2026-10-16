import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { WorkspaceService } from '../packages/marketing/src/application/workspace/workspace.service'
import { createDbConnection } from '../packages/marketing/src/infrastructure/persistence/drizzle/db'
import { DrizzleWorkspaceRepository } from '../packages/marketing/src/infrastructure/persistence/drizzle/workspace.repository'
import { stableEditorialId } from '../packages/marketing-contracts/src'
import { instagramSample, parseInstagramCalendar } from '../packages/marketing-import/src'

const root = path.resolve('packages/marketing-desktop/.cache/connected-proof')
const fixture = z
  .object({ userId: z.string().uuid() })
  .parse(JSON.parse(await readFile(path.join(root, 'fixture.json'), 'utf8')))
const origin =
  'C:/Users/tocha/projects/sistema-zero/docs/marketing/kids/comunidade-dos-criadores/instagram'
async function source(key: string) {
  const text = await readFile(path.join(origin, key), 'utf8')
  return { key, text, sha256: createHash('sha256').update(text).digest('hex') }
}
const [direction, research, calendar, ...copies] = await Promise.all(
  [
    'README.md',
    'pesquisas/mercado-e-avatar-2026-10-12.md',
    '03-postagens.md',
    'postagens/01-p01-a-p10.md',
    'postagens/09-p31-a-p40.md',
  ].map(source),
)
if (!direction || !research || !calendar) throw new Error('Amostra incompleta')
const projectId = await stableEditorialId('marketing-review:instagram-sample:2026-10-15'),
  actor = { userId: fixture.userId, displayName: 'Revisão local', role: 'staff', status: 'active' }
// Fixed disposable target: never takes production DATABASE_URL or caller-supplied credentials.
const connection = createDbConnection('postgres://postgres@127.0.0.1:15439/marketing_review')
try {
  const workspace = new WorkspaceService(
    new DrizzleWorkspaceRepository(connection.db),
    new GatewayStaffDirectory('http://127.0.0.1:15300', 'marketing-review-hmac-only-2026'),
  )
  await workspace.create(actor, {
    schemaVersion: 1,
    operationId: await stableEditorialId('marketing-review:instagram-sample:create'),
    id: projectId,
    name: 'Instagram · amostra do acervo',
    product: 'Comunidade dos Criadores',
  })
  const batches = await instagramSample(projectId, {
    direction,
    research,
    calendar,
    copies,
    selectedCopies: ['P01', 'P07', 'P34'],
  })
  const before = await workspace.snapshot(actor, projectId)
  let confirmed = 0
  for (const batch of batches) {
    const result = await workspace.applyBatch(actor, batch)
    if (result.status !== 'applied')
      throw new Error('Carga encontrou uma revisão concorrente; nenhuma sobrescrita foi feita')
    confirmed += result.items.length
  }
  const after = await workspace.snapshot(actor, projectId)
  if (before.items.length && before.cursor !== after.cursor)
    throw new Error('A repetição da amostra criou novas revisões')
  const entries = parseInstagramCalendar(calendar.text),
    report = {
      projectId,
      confirmedItems: confirmed,
      batches: batches.length,
      cursorBefore: before.cursor,
      cursorAfter: after.cursor,
      idempotentReplay: before.items.length > 0 && before.cursor === after.cursor,
      weeks: new Set(entries.map((entry) => entry.week)).size,
      mainPieces: entries.filter((entry) => entry.sourceId.startsWith('P')).length,
      stories: entries.filter((entry) => entry.sourceId.startsWith('ST')).length,
      copies: ['P01', 'P07', 'P34'],
      assetsImported: 0,
      publicationScheduled: false,
      sourceHashes: [direction, research, calendar, ...copies].map(({ key, sha256 }) => ({
        key,
        sha256,
      })),
    }
  await writeFile(path.join(root, 'sample-import.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} finally {
  await connection.close()
}

import { GatewayStaffDirectory } from '../packages/marketing/src/infrastructure/gateways/auth/gateway-staff-directory'
