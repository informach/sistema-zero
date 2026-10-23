import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

test.each([
  'admin',
  'community',
  'community-kids',
])('Docker %s forwards the public runtime origins before Next generates its headers', (app) => {
  const dockerfile = readFileSync(
    new URL(`../../packages/${app}/Dockerfile`, import.meta.url),
    'utf8',
  )
  const buildStage = dockerfile.split(/^FROM .+ AS build\s*$/im)[1]?.split(/^FROM /m)[0]
  expect(buildStage).toBeDefined()
  const beforeNextBuild = buildStage?.split(/^RUN .*npm run build\s*$/m)[0]
  expect(beforeNextBuild?.length).toBeLessThan(buildStage?.length ?? 0)
  // Railway forwards service variables to Docker only when the build stage declares ARG.
  // Runtime env alone cannot change the CSP already serialized in routes-manifest.json.
  for (const name of ['STUDIO_PYTHON_FRAME_ORIGINS', 'STUDIO_PRO_RUNTIME_URL']) {
    expect(beforeNextBuild).toMatch(new RegExp(`^ARG ${name}\\s*$`, 'm'))
  }
})
