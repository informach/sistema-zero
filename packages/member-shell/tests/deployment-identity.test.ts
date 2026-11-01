import { expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const version = '1234567890abcdef1234567890abcdef12345678'
test('web hosts stamp one release into assets and navigation without affecting another test process', () => {
  const script = `const configs=await Promise.all([import('./packages/community/next.config.ts'),import('./packages/community-kids/next.config.ts'),import('./packages/admin/next.config.ts')]); console.log(JSON.stringify(await Promise.all(configs.map(async c=>({id:c.default.deploymentId,headers:await c.default.headers()})))))`
  const results = JSON.parse(
    execFileSync(process.execPath, ['-e', script], {
      cwd: resolve(import.meta.dir, '../../..'),
      env: { ...process.env, RAILWAY_GIT_COMMIT_SHA: version },
      windowsHide: true,
      encoding: 'utf8',
    }),
  ) as { id: string; headers: { source: string; headers: { key: string; value: string }[] }[] }[]
  expect(results).toHaveLength(3)
  for (const result of results) {
    expect(result.id).toBe(version)
    expect(result.headers.find((rule) => rule.source === '/edisvg/:path*')?.headers).toContainEqual(
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    )
  }
  for (const app of ['community', 'community-kids', 'admin'])
    expect(readFileSync(resolve(import.meta.dir, `../../${app}/Dockerfile`), 'utf8')).toContain(
      'ARG RAILWAY_GIT_COMMIT_SHA',
    )
})
