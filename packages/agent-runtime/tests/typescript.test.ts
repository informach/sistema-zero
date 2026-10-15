import { expect, test } from 'bun:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ProjectIndex } from '../src/context/index'
import { TypeScriptService } from '../src/context/typescript'
import { Processes } from '../src/process/manager'

test('language service diagnoses actual TS errors and invalidates after an edit', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-ts-'))
  const index = new ProjectIndex(new Processes(directory), directory)
  const service = new TypeScriptService(index)
  try {
    await writeFile(
      join(directory, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { strict: true, skipLibCheck: true },
        include: ['sample.ts'],
      }),
    )
    await writeFile(join(directory, 'sample.ts'), 'const value: number = "wrong"; export {value}')
    const first = await service.query(
      directory,
      'sample.ts',
      'diagnostics',
      0,
      new AbortController().signal,
    )
    expect(JSON.stringify(first.value)).toContain('2322')
    await writeFile(join(directory, 'sample.ts'), 'const value: number = 42; export {value}')
    const second = await service.query(
      directory,
      'sample.ts',
      'diagnostics',
      0,
      new AbortController().signal,
    )
    expect(second.value).toEqual([])
    expect(second.sha256).not.toBe(first.sha256)
  } finally {
    index.close()
  }
}, 30000)
