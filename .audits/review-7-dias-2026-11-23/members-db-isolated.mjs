import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'

const cwd = fileURLToPath(new URL('../../packages/members/', import.meta.url))
const url = name => `postgres://postgres:postgres@127.0.0.1:15439/${name}`
const env = {
  ...process.env,
  PINTA_CAUSAL_TEST_DATABASE_URL: url('kids_journey_pinta_per_file_final'),
  PINTA_CAUSAL_HTTP_TEST_DATABASE_URL: url('kids_journey_pinta_http_per_file_final'),
  PINTA_CAUSAL_ADOPTION_TEST_DATABASE_URL: url('kids_journey_pinta_adoption_per_file_final'),
  PINTA_PALETTE_TEST_DATABASE_URL: url('kids_journey_pinta_palette_per_file_final'),
  STUDIO_SEALED_TEST_DATABASE_URL: url('kids_journey_studio_sealed_per_file_final'),
  CENARIOS_TEST_DATABASE_URL: url('cenarios_per_file_final'),
}
const files = ['pinta-causal', 'pinta-causal-http', 'pinta-causal-adocao', 'pinta-palette-writes', 'pinta-palette-writes-http', 'studio-sealed-reader', 'studio-sealed-writer', 'cenarios.repository', 'cenarios-publicacoes']
const results = []
for (const file of files) {
  console.log(`OWNED DATABASE PROOF ${file}`)
  const result = spawnSync('bun', ['test', `./tests/db/${file}.test.ts`], { cwd, env, stdio: 'inherit' })
  if (result.error) throw result.error
  results.push({ file, exitCode: result.status ?? 1 })
}
writeFileSync(new URL('members-db-isolated-results.json', import.meta.url), JSON.stringify(results, null, 2) + '\n')
if (results.some(r => r.exitCode !== 0)) process.exitCode = 1
