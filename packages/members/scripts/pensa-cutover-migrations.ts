import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'

const reviewed = [
  '0126_pensa_functional_reset',
  '0127_pensa_functional_schema',
  '0128_pensa_remove_documentary_workflow',
]

/** Maintenance must never apply later, unrelated migrations or include them in rollback. */
export async function withPensaCutoverMigrations<T>(
  source: string,
  run: (folder: string, tags: string[]) => Promise<T>,
): Promise<T> {
  const journal = z
    .object({
      version: z.string(),
      dialect: z.literal('postgresql'),
      entries: z.array(
        z.object({
          idx: z.number().int(),
          version: z.string(),
          when: z.number(),
          tag: z.string(),
          breakpoints: z.boolean(),
        }),
      ),
    })
    .parse(JSON.parse(await readFile(join(source, 'meta/_journal.json'), 'utf8')))
  const entries = journal.entries.filter((entry) => entry.idx >= 126 && entry.idx <= 128)
  if (
    entries.length !== reviewed.length ||
    entries.some(
      (entry, i) =>
        entry.idx !== 126 + i ||
        entry.tag !== reviewed[i] ||
        (i > 0 && entry.when <= entries[i - 1]!.when),
    )
  )
    throw new Error('The reviewed Pensa cutover migrations changed')
  const folder = await mkdtemp(join(tmpdir(), 'pensa-cutover-migrations-'))
  try {
    await mkdir(join(folder, 'meta'))
    await writeFile(join(folder, 'meta/_journal.json'), JSON.stringify({ ...journal, entries }))
    for (const entry of entries)
      await copyFile(join(source, `${entry.tag}.sql`), join(folder, `${entry.tag}.sql`))
    return await run(
      folder,
      entries.map((entry) => entry.tag),
    )
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
}
