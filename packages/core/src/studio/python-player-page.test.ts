import { expect, test } from 'bun:test'
import { studioPythonPlayerPage } from './python-player-page'

test('shared player targets the exact local or remote immutable runtime and keeps all controls', () => {
  const hash = 'a'.repeat(64)
  const local = studioPythonPlayerPage(hash)
  expect(local.html).toContain(`./runtime/${hash}/standalone.mjs`)
  const remote = studioPythonPlayerPage(hash, {
    runtimeDirectoryURL: `https://runtime.example/v1/runtimes/${hash}/`,
  })
  expect(remote.html).toBe(local.html.replace('./runtime/', 'https://runtime.example/v1/runtimes/'))
  expect(remote.css).toBe(local.css)
  for (const id of [
    'title',
    'start',
    'stop',
    'capture',
    'status',
    'stage',
    'input-form',
    'input',
    'output',
  ])
    expect(remote.html).toContain(`id="${id}"`)
})

test('player rejects swapped runtime identities and unsafe directory URLs before generating HTML', () => {
  const hash = 'a'.repeat(64)
  for (const runtimeDirectoryURL of [
    `https://runtime.example/v1/runtimes/${'b'.repeat(64)}/`,
    `https://user:password@runtime.example/v1/runtimes/${hash}/`,
    `https://runtime.example/v1/runtimes/${hash}/?input=1`,
    `https://runtime.example/v1/runtimes/${hash}/#state`,
    `http://runtime.example/v1/runtimes/${hash}/`,
    `https://runtime.example/v1/runtimes/${hash}/standalone.mjs`,
    'https://runtime.example/"><script>alert(1)</script>',
    `file:///v1/runtimes/${hash}/`,
  ])
    expect(() => studioPythonPlayerPage(hash, { runtimeDirectoryURL })).toThrow()
  expect(() => studioPythonPlayerPage('a"><script>')).toThrow()
})

test('only a service-selected exact parent origin enables the proposal status channel', () => {
  const hash = 'a'.repeat(64)
  expect(studioPythonPlayerPage(hash).html).not.toContain('studio-python-preview-parent')
  const preview = studioPythonPlayerPage(hash, { previewParentOrigin: 'https://kids.test' })
  expect(preview.html).toContain(
    '<meta name="studio-python-preview-parent" content="https://kids.test">',
  )
  for (const previewParentOrigin of [
    'https://user:password@kids.test',
    'https://kids.test/path',
    'https://kids.test#fragment',
    'https://kids.test?x=1',
    'http://remote.test',
    'null',
    'https://kids.test"><script>',
  ])
    expect(() => studioPythonPlayerPage(hash, { previewParentOrigin })).toThrow()
})
