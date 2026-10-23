import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  studioPythonCspOrigins,
  withStudioPublishedProCsp,
  withStudioPythonCsp,
} from './runtime-csp'

test('Pro CSP rejects unsafe origins and limits HTTP to local development', () => {
  const csp = "default-src 'self'; frame-src 'self' blob:; connect-src 'self'; script-src 'self'"
  expect(withStudioPublishedProCsp(csp, undefined, false)).toBe(csp)
  expect(withStudioPublishedProCsp(csp, 'https://pro.test/', false)).toBe(
    "default-src 'self'; frame-src 'self' blob: https://pro.test; connect-src 'self'; script-src 'self'",
  )
  expect(withStudioPublishedProCsp(csp, 'http://127.0.0.1:55438', true)).toContain(
    'blob: http://127.0.0.1:55438',
  )
  for (const value of [
    'http://pro.test',
    'http://localhost:55438',
    'https://*.test',
    'https://pro.test;script-src *',
    'https://user:secret@pro.test',
    'https://pro.test/path',
    'https://pro.test/?q=1',
    'https://pro.test/#fragment',
  ])
    expect(() => withStudioPublishedProCsp(csp, value, false)).toThrow()
  const once = withStudioPublishedProCsp(csp, 'https://pro.test', false)
  expect(withStudioPublishedProCsp(once, 'https://pro.test', false)).toBe(once)
})

test.each([
  'admin',
  'community',
  'community-kids',
])('actual %s document and route CSPs admit only the configured Pro executor across client navigation', (app) => {
  const cwd = fileURLToPath(new URL('../../../../', import.meta.url))
  const read = (runtime: string) => {
    const child = spawnSync(
      process.execPath,
      [
        '-e',
        `const {default:config}=await import('./packages/${app}/next.config.ts'); console.log(JSON.stringify(await config.headers()))`,
      ],
      {
        cwd,
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          STUDIO_PYTHON_FRAME_ORIGINS: '["https://python-runtime.test"]',
          STUDIO_PRO_RUNTIME_URL: runtime,
        },
      },
    )
    expect(child.status).toBe(0)
    if (child.status !== 0) throw new Error(child.stderr)
    const routes = JSON.parse(child.stdout) as {
      source: string
      headers: { key: string; value: string }[]
    }[]
    return routes
  }
  const before = read('')
  const after = read('https://pro-runtime.test')
  const cspHeaders = after.flatMap((route) =>
    route.headers.filter((header) => header.key === 'Content-Security-Policy'),
  )
  expect(cspHeaders.length).toBeGreaterThan(0)
  for (const header of cspHeaders) {
    const frame = header.value.split('; ').find((part) => part.startsWith('frame-src '))
    expect(frame?.split(' ')).toContain('https://pro-runtime.test')
    expect(frame?.split(' ')).not.toContain('https:')
    expect(frame?.split(' ')).toContain('https://python-runtime.test')
  }
  // The full comparison also preserves camera/COEP and the route-specific R2 origins.
  expect(after).toEqual(
    before.map((route) => ({
      ...route,
      headers: route.headers.map((header) =>
        header.key !== 'Content-Security-Policy'
          ? header
          : {
              ...header,
              value: header.value
                .split('; ')
                .map((part) =>
                  part.startsWith('frame-src ') ? `${part} https://pro-runtime.test` : part,
                )
                .join('; '),
            },
      ),
    })),
  )
})

test('runtime CSP accepts explicit public origins and rejects directive injection or production HTTP', () => {
  expect(studioPythonCspOrigins(undefined, false)).toEqual([])
  expect(studioPythonCspOrigins('["https://runtime.test/","https://runtime.test"]', false)).toEqual(
    ['https://runtime.test'],
  )
  for (const raw of [
    'null',
    '{}',
    '[1]',
    '["https://*.test"]',
    '["https://runtime.test;script-src *"]',
    '["https://user:secret@runtime.test"]',
    '["https://runtime.test/path"]',
    '["https://runtime.test/?q=1"]',
    '["https://runtime.test/#fragment"]',
    '["http://runtime.test"]',
    '["http://localhost:8000"]',
    JSON.stringify(Array(17).fill('https://runtime.test')),
  ])
    expect(() => studioPythonCspOrigins(raw, false)).toThrow()
  expect(studioPythonCspOrigins('["http://localhost:8000"]', true)).toEqual([
    'http://localhost:8000',
  ])
  const csp = "default-src 'self'; frame-src 'self' blob:; connect-src 'self'; script-src 'self'"
  expect(withStudioPythonCsp(csp, [])).toBe(csp)
  expect(withStudioPythonCsp(csp, ['https://runtime.test'])).toBe(
    "default-src 'self'; frame-src 'self' blob: https://runtime.test; connect-src 'self' https://runtime.test; script-src 'self'",
  )
})

test.each([
  'admin',
  'community',
  'community-kids',
])('actual %s headers admit configured Python frames and boot resources, without broadening scripts', (app) => {
  const cwd = fileURLToPath(new URL('../../../../', import.meta.url))
  const read = (origins: string) => {
    const child = spawnSync(
      process.execPath,
      [
        '-e',
        `const {default:config}=await import('./packages/${app}/next.config.ts'); console.log(JSON.stringify(await config.headers()))`,
      ],
      {
        cwd,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'production', STUDIO_PYTHON_FRAME_ORIGINS: origins },
      },
    )
    expect(child.status).toBe(0)
    if (child.status !== 0) throw new Error(child.stderr)
    return (JSON.parse(child.stdout) as { headers: { key: string; value: string }[] }[]).flatMap(
      (route) =>
        route.headers
          .filter((header) => header.key === 'Content-Security-Policy')
          .map((header) => header.value),
    )
  }
  const before = read('[]'),
    after = read('["https://python-runtime.test"]')
  expect(after.length).toBeGreaterThan(0)
  expect(after).toHaveLength(before.length)
  for (const [i, policy] of after.entries()) {
    const directives = policy.split('; ')
    for (const kind of ['frame-src', 'connect-src']) {
      const directive = directives.find((part) => part.startsWith(`${kind} `))!
      expect(directive.split(' ')).toContain('https://python-runtime.test')
      if (kind === 'frame-src') expect(directive.split(' ')).not.toContain('https:')
    }
    expect(directives.filter((part) => !/^(frame-src|connect-src) /.test(part))).toEqual(
      before[i]!.split('; ').filter((part) => !/^(frame-src|connect-src) /.test(part)),
    )
  }
})
