import { expect, test } from 'bun:test'
import { standalonePythonFrameURL } from './standaloneRuntime'

test('web exports and hosted previews resolve only the frame beside their pinned module', () => {
  const hash = 'a'.repeat(64)
  for (const root of [
    'https://runtime.test/v1/runtimes/',
    'https://static.test/games/my%20game/runtime/',
    'http://127.0.0.1:8000/runtime/',
  ])
    expect(standalonePythonFrameURL(`${root}${hash}/standalone.mjs`, hash).href).toBe(
      `${root}${hash}/frame.html`,
    )
})

test('a wrong release, module name, credentials, query or unsafe scheme cannot select a runtime', () => {
  const hash = 'a'.repeat(64)
  for (const url of [
    `https://runtime.test/v1/runtimes/${'b'.repeat(64)}/standalone.mjs`,
    `https://runtime.test/v1/runtimes/${hash}/inspect.mjs`,
    `https://u:p@runtime.test/v1/runtimes/${hash}/standalone.mjs`,
    `https://runtime.test/v1/runtimes/${hash}/standalone.mjs?q=1`,
    `https://runtime.test/v1/runtimes/${hash}/standalone.mjs#other`,
    `http://runtime.test/v1/runtimes/${hash}/standalone.mjs`,
    `file:///runtime/${hash}/standalone.mjs`,
  ])
    expect(() => standalonePythonFrameURL(url, hash)).toThrow('runtime')
})
