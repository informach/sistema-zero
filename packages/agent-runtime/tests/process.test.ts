import { expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Processes } from '../src/process/manager'

test('process preserves argv, strips inherited secrets and bounds output', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-process-'))
  const manager = new Processes(directory)
  process.env.ZERO_SYNTHETIC_SECRET = 'must-not-inherit'
  try {
    const result = await manager.run(
      {
        executable: process.execPath,
        args: [
          '-e',
          'console.log(JSON.stringify({args:process.argv.slice(1),secret:process.env.ZERO_SYNTHETIC_SECRET??null}))',
          'a b',
          'quote"and\\',
        ],
        cwd: directory,
      },
      new AbortController().signal,
    )
    expect(result.code).toBe(0)
    expect(JSON.parse(result.output)).toEqual({ args: ['a b', 'quote"and\\'], secret: null })
    const output = await manager.run(
      {
        executable: process.execPath,
        args: ['-e', 'while(true) console.log("x".repeat(4000))'],
        cwd: directory,
        maxBytes: 8000,
      },
      new AbortController().signal,
    )
    expect(output.reason).toBe('output_limit')
    expect(output.bytes).toBe(8000)
    expect(manager.active.size).toBe(0)
  } finally {
    delete process.env.ZERO_SYNTHETIC_SECRET
  }
}, 20000)
test('timeout terminates owned child and grandchild processes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-tree-'))
  const manager = new Processes(directory)
  const leaf = 'console.log(process.pid);setInterval(()=>{},1000)'
  const middle = `console.log(process.pid);Bun.spawn([process.execPath,'-e',${JSON.stringify(leaf)}],{stdout:'inherit',stderr:'inherit'});setInterval(()=>{},1000)`
  const root = `console.log(process.pid);Bun.spawn([process.execPath,'-e',${JSON.stringify(middle)}],{stdout:'inherit',stderr:'inherit'});setInterval(()=>{},1000)`
  const result = await manager.run(
    { executable: process.execPath, args: ['-e', root], cwd: directory, timeoutMs: 1500 },
    new AbortController().signal,
  )
  expect(result.reason).toBe('timeout')
  const pids = result.output.trim().split(/\s+/).map(Number)
  expect(pids.length).toBe(3)
  for (const pid of pids) {
    expect(Number.isSafeInteger(pid) && pid > 0).toBe(true)
    expect(() => process.kill(pid, 0)).toThrow()
  }
}, 15000)

test('timeout revokes ownership even while a child refuses a full stdin pipe', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-blocked-stdin-'))
  const manager = new Processes(directory)
  const result = await manager.run(
    {
      executable: process.execPath,
      args: ['-e', 'console.log(process.pid);setInterval(()=>{},1000)'],
      cwd: directory,
      input: 'x'.repeat(128000),
      timeoutMs: 1000,
    },
    new AbortController().signal,
  )
  expect(result.reason).toBe('timeout')
  const pid = Number(result.output.trim())
  expect(pid).toBeGreaterThan(0)
  expect(() => process.kill(pid, 0)).toThrow()
  expect(manager.active.size).toBe(0)
}, 15000)
