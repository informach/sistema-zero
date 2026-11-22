import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const flag = 'NEXT_PUBLIC_PINTA_CAUSAL_CLIENT_V1'

test.each(['community', 'community-kids'])('%s passes the opt-in flag to the Next build', (app) => {
  const dockerfile = readFileSync(
    new URL(`../../packages/${app}/Dockerfile`, import.meta.url),
    'utf8',
  )
  const build = dockerfile.split(/^FROM .+ AS build\s*$/im)[1]?.split(/^FROM /m)[0]
  expect(build).toBeDefined()
  const steps = build?.split(/\r?\n/) ?? []
  const arg = steps.indexOf(`ARG ${flag}=0`)
  const env = steps.indexOf(`ENV ${flag}=$${flag}`)
  const nextBuild = steps.indexOf(`RUN cd packages/${app} && npm run build`)
  expect(arg).toBeGreaterThanOrEqual(0)
  expect(env).toBeGreaterThan(arg)
  expect(nextBuild).toBeGreaterThan(env)
  const runner = dockerfile.split(/^FROM .+ AS runner\s*$/im)[1]
  expect(runner).toBeDefined()
  expect(runner).not.toContain(flag)
})
