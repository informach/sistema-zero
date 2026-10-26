import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { pathIsPlatformScoped } from '../src/components/admin/nav'
import { communityQuery } from '../src/lib/community-query'

test('community replaces any stale query while preserving search and pagination', () => {
  expect(communityQuery('/api/catalog/products?q=curso&offset=20&audience=kids', 'adult')).toBe(
    '/api/catalog/products?q=curso&offset=20&audience=adult',
  )
  expect(communityQuery('/api/catalog/products', 'kids')).toBe(
    '/api/catalog/products?audience=kids',
  )
})

test('catalog follows the community lens in lists and creation', () => {
  for (const path of [
    '/admin/catalogo/produtos',
    '/admin/catalogo/ofertas',
    '/admin/catalogo/cupons',
    '/admin/catalogo/produtos/novo',
  ]) {
    expect(pathIsPlatformScoped(path)).toBe(true)
  }
})

test('real catalog UI keeps requests and drafts in their community', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './tests/fixtures/business-community.fixture.tsx'],
    {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  expect({ exitCode, output: exitCode === 0 ? '' : stdout + stderr }).toEqual({
    exitCode: 0,
    output: '',
  })
}, 15_000)
