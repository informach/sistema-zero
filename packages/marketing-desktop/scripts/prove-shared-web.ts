import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'
import { z } from 'zod'
import { proveWebProductionReport } from '../src/main/imports/shared-report-proof'

// A separate browser-only Electron profile can inspect the web while the native
// importer runs. It never opens its SQLite files or reuses its device credential.
const directory = path.resolve('.cache/native-connected-proof')
app.setName('Marketing Web Review')
app.setPath('userData', path.join(directory, 'web-review-profile'))
async function main() {
  await app.whenReady()
  try {
    const fixture = z
      .object({
        userId: z.string().uuid(),
        email: z.string(),
        password: z.string(),
        origin: z.literal('http://127.0.0.1:15334'),
      })
      .parse(JSON.parse(await readFile(path.join(directory, 'fixture.json'), 'utf8')))
    const evidence = z
      .object({
        projectId: z.string().uuid(),
        evidence: z.array(z.object({ id: z.string().uuid() })).min(1),
      })
      .parse(JSON.parse(await readFile(path.join(directory, 'inventory-evidence.json'), 'utf8')))
    const key = createHash('sha256')
      .update(JSON.stringify({ origin: fixture.origin, userId: fixture.userId }))
      .digest('hex')
    const inventoryArgument = process.argv.find((value) => value.startsWith('--inventory='))
    const inventoryId = inventoryArgument
      ? z.string().uuid().parse(inventoryArgument.split('=')[1])
      : evidence.evidence[0]?.id
    const inventory = z
      .object({ inventory: z.object({ capturedAt: z.string().datetime() }) })
      .parse(
        JSON.parse(
          await readFile(
            path.join(
              directory,
              'profile/workspaces',
              key,
              evidence.projectId,
              'imports',
              `${inventoryId}.json`,
            ),
            'utf8',
          ),
        ),
      )
    console.log(
      JSON.stringify(
        await proveWebProductionReport({
          ...fixture,
          projectId: evidence.projectId,
          capturedAt: inventory.inventory.capturedAt,
          directory,
          requireLinkedPiece: true,
          requireOffice: process.argv.includes('--office'),
        }),
      ),
    )
    app.exit(0)
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Falha na revisão web')
    app.exit(1)
  }
}
void main()
