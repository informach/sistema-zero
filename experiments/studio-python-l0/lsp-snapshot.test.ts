import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { materializeSources } from './lsp-snapshot.ts'

test('source quota counts Python CR, LF, CRLF and the last unterminated line', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sz-l0-line-quota-'))
  try {
    for (const newline of ['\r', '\n', '\r\n']) {
      for (const trailing of ['', newline]) {
        const source = Array(20001).fill('pass').join(newline) + trailing
        await assert.rejects(
          materializeSources(root, [{ path: 'oversize.py', source }]),
          /Line limit/,
        )
        assert.deepEqual(await readdir(root), [])
      }
    }
    const source = Array(20000).fill('pass').join('\r')
    await materializeSources(root, [{ path: 'boundary.py', source }])
    assert.equal(await readFile(join(root, 'boundary.py'), 'utf8'), source)
  } finally {
    await rm(root, { recursive: true })
  }
})

test('analyzer receives Python sources without auto-executable project configuration', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sz-l0-source-boundary-'))
  try {
    const result = await materializeSources(root, [
      { path: 'main.py', source: 'print(42)\n' },
      { path: 'turtle.pyi', source: 'def forward(distance: float) -> None: ...\n' },
      { path: '.pnp.cjs', source: 'throw new Error("Must never be loaded")' },
      { path: 'pyrightconfig.json', source: '{"extraPaths":["/other-tenant"]}' },
      { path: 'pyproject.toml', source: '[tool.pyright]\n' },
      { path: 'python3', source: '#!/bin/sh\nexit 1\n' },
    ])
    assert.deepEqual((await readdir(root)).sort(), ['main.py', 'turtle.pyi'])
    assert.equal(await readFile(join(root, 'main.py'), 'utf8'), 'print(42)\n')
    assert.equal(result.omitted.length, 4)
  } finally {
    await rm(root, { recursive: true })
  }
})

test('invalid snapshot paths fail before any source file is materialized', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sz-l0-source-validation-'))
  try {
    for (const path of [
      '../other.py',
      '/other.py',
      'C:/other.py',
      'a\\other.py',
      'a/./b.py',
      'a//b.py',
      'nul\0.py',
    ]) {
      await assert.rejects(
        materializeSources(root, [
          { path: 'valid.py', source: '' },
          { path, source: '' },
        ]),
      )
      assert.deepEqual(await readdir(root), [])
    }
    await assert.rejects(
      materializeSources(root, [
        { path: 'a.py', source: '' },
        { path: 'A.py', source: '' },
      ]),
      /Duplicate/,
    )
  } finally {
    await rm(root, { recursive: true })
  }
})
