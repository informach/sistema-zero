import { afterEach, expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { Header } from 'tar'
import { clientReleases } from '../src/main/clients/catalog'
import { downloadClient, validateDownloadUrl } from '../src/main/clients/download'
import {
  cleanClientInstallations,
  extractClientArchive,
  readClientInstallation,
} from '../src/main/clients/installation'

const roots: string[] = []
async function temporary() {
  const root = await mkdtemp(path.join(tmpdir(), 'marketing-clients-'))
  roots.push(root)
  return root
}
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})
const digest = (value: string) => createHash('sha256').update(value).digest('hex')
const release = { url: 'https://downloads.claude.ai/example', bytes: 4, sha256: digest('good') }
const controller = () => new AbortController()

test('download checks bytes and checksum before accepting an official binary', async () => {
  const root = await temporary()
  await downloadClient(
    release,
    path.join(root, 'valid'),
    controller().signal,
    () => {},
    async () => new Response('good'),
  )
  expect(await readFile(path.join(root, 'valid'), 'utf8')).toBe('good')
  for (const [name, value] of [
    ['corrupt', 'evil'],
    ['short', 'bad'],
    ['overflow', 'longer'],
  ]) {
    await expect(
      downloadClient(
        release,
        path.join(root, name ?? ''),
        controller().signal,
        () => {},
        async () => new Response(value),
      ),
    ).rejects.toThrow()
  }
  await expect(
    downloadClient(
      release,
      path.join(root, 'length'),
      controller().signal,
      () => {},
      async () => new Response('good', { headers: { 'content-length': '900' } }),
    ),
  ).rejects.toThrow('tamanho')
  expect(await readdir(root)).not.toContain('length')
})

test('redirects cannot contact an unapproved host and cancellation stops consumption', async () => {
  const root = await temporary()
  for (const url of [
    'http://downloads.claude.ai/file',
    'https://downloads.claude.ai.evil.test/file',
    'https://user:pass@github.com/file',
    'https://github.com:8443/file',
  ])
    expect(() => validateDownloadUrl(url)).toThrow()
  let requests = 0
  await expect(
    downloadClient(
      release,
      path.join(root, 'redirect'),
      controller().signal,
      () => {},
      async () => {
        requests++
        return new Response(null, {
          status: 302,
          headers: { location: 'https://example.com/private' },
        })
      },
    ),
  ).rejects.toThrow('distribuidores')
  expect(requests).toBe(1)
  const cancelled = controller()
  await expect(
    downloadClient(
      release,
      path.join(root, 'cancel'),
      cancelled.signal,
      () => cancelled.abort(new Error('cancelled')),
      async () => new Response('good'),
    ),
  ).rejects.toThrow('cancelled')
})

async function fixture(root: string) {
  const directory = `claude-2.1.299-${randomUUID()}`
  await mkdir(path.join(root, directory))
  await writeFile(path.join(root, directory, 'claude.exe'), 'good')
  await writeFile(
    path.join(root, directory, 'ready.json'),
    JSON.stringify({
      schemaVersion: 1,
      provider: 'claude',
      version: '2.1.299',
      archiveSha256: clientReleases.claude.sha256,
      files: [{ path: 'claude.exe', sha256: digest('good') }],
    }),
  )
  await writeFile(path.join(root, 'claude.json'), JSON.stringify({ directory }))
  return directory
}

test('restart detects changed, missing and extra files; receipt paths cannot escape', async () => {
  const root = await temporary(),
    directory = await fixture(root)
  expect(await readClientInstallation(root, clientReleases.claude)).toBe(
    path.join(root, directory, 'claude.exe'),
  )
  await writeFile(path.join(root, directory, 'claude.exe'), 'evil')
  await expect(readClientInstallation(root, clientReleases.claude)).rejects.toThrow('alterado')
  await writeFile(path.join(root, directory, 'claude.exe'), 'good')
  await writeFile(path.join(root, directory, 'injected.dll'), 'extra')
  await expect(readClientInstallation(root, clientReleases.claude)).rejects.toThrow('alterados')
  await rm(path.join(root, directory, 'injected.dll'))
  await rm(path.join(root, directory, 'claude.exe'))
  await expect(readClientInstallation(root, clientReleases.claude)).rejects.toThrow('alterados')
  await writeFile(path.join(root, 'claude.json'), JSON.stringify({ directory: '../outside' }))
  await expect(readClientInstallation(root, clientReleases.claude)).rejects.toThrow()
})

test('cleanup preserves selected client, other providers and unrelated directories', async () => {
  const root = await temporary(),
    directory = await fixture(root)
  const old = `claude-2.1.299-${randomUUID()}`,
    staging = `.install-${randomUUID()}`,
    other = `codex-0.162.1-${randomUUID()}`
  for (const name of [old, staging, other, 'notes']) await mkdir(path.join(root, name))
  await cleanClientInstallations(root, 'claude')
  expect((await readdir(root)).sort()).toEqual(['claude.json', directory, other, 'notes'].sort())
})

test('archives reject traversal and links; valid extraction stays under the destination', async () => {
  const root = await temporary()
  for (const [i, name] of [
    'safe.exe',
    '../escaped.exe',
    '/absolute.exe',
    'file:stream',
    'link',
  ].entries()) {
    const header = new Header({
      path: name,
      size: name === 'link' ? 0 : 4,
      mode: 0o644,
      type: name === 'link' ? 'SymbolicLink' : 'File',
      linkpath: name === 'link' ? '../outside' : '',
    })
    const block = Buffer.alloc(512)
    header.encode(block)
    const archive = path.join(root, `archive-${i}.tgz`),
      target = path.join(root, `out-${i}`)
    await mkdir(target)
    await writeFile(
      archive,
      gzipSync(
        Buffer.concat([
          block,
          name === 'link'
            ? Buffer.alloc(0)
            : Buffer.concat([Buffer.from('good'), Buffer.alloc(508)]),
          Buffer.alloc(1024),
        ]),
      ),
    )
    if (i === 0) {
      await extractClientArchive(archive, target, controller().signal)
      expect(await readFile(path.join(target, name), 'utf8')).toBe('good')
    } else {
      await expect(extractClientArchive(archive, target, controller().signal)).rejects.toThrow()
      expect(await readdir(target)).toEqual([])
    }
  }
  expect(await readdir(root)).not.toContain('escaped.exe')
})
