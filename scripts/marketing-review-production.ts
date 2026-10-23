import { createHash } from 'node:crypto'
import { lstat, readdir, readFile, writeFile } from 'node:fs/promises'
import {
  type InventoryEntry,
  inventoryDigestInput,
  inventorySchema,
} from '../packages/marketing-contracts/src'
import { classifySource, productionFolders } from '../packages/marketing-import/src'
import {
  confinedSource,
  reviewInventoryProduction,
} from '../packages/marketing-import/src/inventory-node'

const root = 'C:/Users/tocha/projects/sistema-zero'
const base = 'docs/marketing/kids/comunidade-dos-criadores/instagram'
const entries: InventoryEntry[] = []
async function walk(relative: string) {
  const safe = await confinedSource(root, relative),
    stat = await lstat(safe)
  if (stat.isDirectory()) {
    for (const child of await readdir(safe)) await walk(`${relative}/${child}`)
    return
  }
  if (
    !stat.isFile() ||
    !(
      /\/(?:\d{2}-p\d{2}\.png|copy\.json|copy-fonte\.md|legenda\.txt|texto-alternativo\.txt)$/.test(
        relative,
      ) ||
      (relative.startsWith(`${base}/postagens/`) && /\.md$/.test(relative))
    )
  )
    return
  const bytes = await readFile(safe)
  entries.push({
    path: relative,
    kind: 'file',
    ...classifySource('sistema-zero', relative, false),
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  })
}
await walk(`${base}/producao/postagens`)
await walk(`${base}/postagens`)
entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
const inventory = inventorySchema.parse({
  schemaVersion: 1,
  policyVersion: 'marketing-acervo-v2',
  origin: 'sistema-zero',
  capturedAt: new Date().toISOString(),
  entries,
  digest: createHash('sha256')
    .update(
      inventoryDigestInput({
        origin: 'sistema-zero',
        policyVersion: 'marketing-acervo-v2',
        entries,
      }),
    )
    .digest('hex'),
})
const reports = []
for (const folder of productionFolders(entries)) {
  const review = await reviewInventoryProduction({
    root,
    inventory,
    folderPath: folder.path,
    signal: new AbortController().signal,
  })
  reports.push(review)
  console.log(
    JSON.stringify({
      key: folder.key,
      files: review.files.length,
      state: review.state,
      matches: review.matchingCopies.map((file) => file.slice(folder.path.length + 1)),
      other: review.otherCopies.length,
      issues: review.issues.map((issue) => issue.message),
    }),
  )
}
await writeFile(
  '.cache/production-review.json',
  JSON.stringify({ digest: inventory.digest, reports }, null, 2),
)
console.log(
  JSON.stringify({
    folders: reports.length,
    files: reports.reduce((sum, report) => sum + report.files.length, 0),
    states: Object.fromEntries(
      ['ready-for-review', 'divergent', 'incomplete'].map((state) => [
        state,
        reports.filter((report) => report.state === state).length,
      ]),
    ),
  }),
)
