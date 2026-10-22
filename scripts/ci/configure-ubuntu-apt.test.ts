import { expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { configureUbuntuApt, useOfficialUbuntuArchive } from './configure-ubuntu-apt.mjs'

test.each(['http', 'https'])('replaces the exact Azure %s archive in mirror lists', (scheme) => {
  const before = `${scheme}://azure.archive.ubuntu.com/ubuntu/\tpriority:1\nhttps://archive.ubuntu.com/ubuntu/\tpriority:2\nhttps://security.ubuntu.com/ubuntu/\tpriority:3\n`
  const expected = before.replace(
    `${scheme}://azure.archive.ubuntu.com`,
    'https://archive.ubuntu.com',
  )
  expect(useOfficialUbuntuArchive(before)).toBe(expected)
  expect(useOfficialUbuntuArchive(expected)).toBe(expected)
})

test('preserves deb822 signatures, components, suites, multiple URIs and CRLF', () => {
  const before = [
    'Types: deb deb-src',
    'URIs: http://azure.archive.ubuntu.com/ubuntu https://security.ubuntu.com/ubuntu/',
    'Suites: noble noble-updates noble-backports noble-security',
    'Components: main restricted universe multiverse',
    'Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg',
    '',
  ].join('\r\n')
  expect(useOfficialUbuntuArchive(before)).toBe(
    before.replace('http://azure.archive.ubuntu.com', 'https://archive.ubuntu.com'),
  )
})

test('preserves traditional source options and does not match third-party or lookalike URLs', () => {
  const before = [
    'deb [arch=amd64 signed-by=/usr/share/keyrings/ubuntu-archive-keyring.gpg] https://azure.archive.ubuntu.com/ubuntu noble main',
    'deb https://packages.microsoft.com/repos/code stable main',
    'deb http://archive.ubuntu.com/ubuntu noble main',
    'deb https://security.ubuntu.com/ubuntu noble-security main',
    'deb mirror+file:/etc/apt/apt-mirrors.txt noble main',
    'deb https://azureXarchiveYubuntuZcom/ubuntu noble main',
    'deb https://azure.archive.ubuntu.com.evil.invalid/ubuntu noble main',
    'deb https://azure.archive.ubuntu.com/ubuntu-private noble main',
    'deb https://mirror.invalid/path/https://azure.archive.ubuntu.com/ubuntu noble main',
    '# http://azure.archive.ubuntu.com/ubuntu/ is a comment',
    '',
  ].join('\n')
  expect(useOfficialUbuntuArchive(before)).toBe(
    before.replace(
      'https://azure.archive.ubuntu.com/ubuntu noble',
      'https://archive.ubuntu.com/ubuntu noble',
    ),
  )
})

test('updates only existing APT source files and is idempotent on the real filesystem', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ubuntu-apt-contract-'))
  try {
    mkdirSync(join(directory, 'sources.list.d'))
    const sources = {
      'apt-mirrors.txt': 'http://azure.archive.ubuntu.com/ubuntu/\tpriority:1\n',
      'sources.list': 'deb http://azure.archive.ubuntu.com/ubuntu noble main\n',
      'sources.list.d/ubuntu.sources':
        'Types: deb\nURIs: mirror+file:/etc/apt/apt-mirrors.txt\nSuites: noble\nComponents: main\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n',
      'sources.list.d/third-party.list':
        'deb [signed-by=/usr/share/keyrings/vendor.gpg] https://vendor.invalid/ubuntu noble main\n',
      'sources.list.d/old.list.save': 'http://azure.archive.ubuntu.com/ubuntu\n',
    }
    for (const [name, content] of Object.entries(sources))
      writeFileSync(join(directory, name), content)
    expect(configureUbuntuApt(directory)).toEqual({ inspected: 4, changed: 2 })
    for (const [name, content] of Object.entries(sources))
      expect(readFileSync(join(directory, name), 'utf8')).toBe(
        name.endsWith('.save') ? content : useOfficialUbuntuArchive(content),
      )
    expect(configureUbuntuApt(directory)).toEqual({ inspected: 4, changed: 0 })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('does not invent sources when runner configuration is absent', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ubuntu-apt-empty-'))
  try {
    expect(() => configureUbuntuApt(directory)).toThrow('No APT source or mirror files found')
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('every Ubuntu job prepares signed sources before its first apt or Playwright dependency install', () => {
  const workflow = readFileSync('.github/workflows/ci.yml', 'utf8')
  const command = 'sudo "$(command -v bun)" --no-env-file scripts/ci/configure-ubuntu-apt.mjs'
  const jobs = workflow.split(/(?=^ {2}[a-z][a-z0-9-]*:\r?$)/m)
  const prepared: string[] = []
  for (const job of jobs) {
    if (!/^ {4}runs-on: ubuntu-latest\r?$/m.test(job)) continue
    const install = job.search(/apt-get|playwright install --with-deps/)
    if (install === -1) continue
    const name = /^ {2}([a-z][a-z0-9-]*):/.exec(job)?.[1]
    if (!name) throw new Error('Ubuntu job name is required')
    prepared.push(name)
    const prepare = job.indexOf(command)
    expect(prepare, name).toBeGreaterThan(job.indexOf('oven-sh/setup-bun'))
    expect(prepare, name).toBeLessThan(install)
    expect(job.split(command).length, name).toBe(2)
  }
  expect(prepared).toEqual([
    'ci',
    'community-kids-e2e',
    'studio-e2e-chromium',
    'studio-e2e-firefox',
  ])
  expect(workflow).not.toContain('sudo sed -i')
  expect(workflow).toContain('sudo apt-get install -y --no-install-recommends ffmpeg')
})
