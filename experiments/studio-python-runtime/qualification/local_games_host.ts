import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

/** Playwright globalSetup for the local qualification server started by the games config.
 * Records the runtime that server actually serves as the host authority the Space Arena
 * qualification compares against. Local diagnosis only: no hosted authority is implied. */
export default async function localGamesHost() {
  const baseURL = process.env.SZ_GAMES_LOCAL_URL
  const output = process.env.PYTHON_PROBE_OUTPUT_DIR
  const distribution = process.env.PYTHON_PROBE_DISTRIBUTION_SHA256
  assert(baseURL && output, 'Local games host and output directory required')
  assert(
    distribution && distribution === process.env.SZ_PACMAN_QA_DISTRIBUTION,
    'Games run against one explicit prebuilt distribution',
  )
  const response = await fetch(new URL('/configuration', baseURL))
  assert(response.ok, 'Local games host is not ready')
  const configuration = (await response.json()) as { runtime?: unknown }
  assert(configuration.runtime, 'Local games host exposes no runtime')
  const path = resolve(output, 'local-games-host-authority.json')
  await writeFile(
    path,
    `${JSON.stringify(
      {
        state: 'local-qualification-host',
        baseURL: new URL(baseURL).origin,
        distributionSha256: distribution,
        configuration,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    { flag: 'wx' },
  )
  process.env.SZ_GAMES_HOST_AUTHORITY = path
}
