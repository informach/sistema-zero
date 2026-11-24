/** Real-CPython harness for shared data modules, without graphics substitutes. */
import { expect } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'

export const purePython = [process.env.PYTHON, 'python3', 'python'].find(
  (name) => name && spawnSync(name, ['-I', '-c', 'import json,math,struct,zlib']).status === 0,
)
const cache = resolve(import.meta.dir, '../../../../.cache')
export async function runPurePython(
  source: string,
  body: string,
  input: unknown,
): Promise<unknown> {
  await mkdir(cache, { recursive: true })
  const directory = await mkdtemp(join(cache, 'pinta-pure-python-'))
  if (dirname(directory) !== cache || !basename(directory).startsWith('pinta-pure-python-'))
    throw Error('Unexpected temporary Python directory')
  try {
    const file = join(directory, 'check.py')
    await writeFile(
      file,
      `import sys,json,hashlib,struct
sys.stdin.reconfigure(encoding='utf-8')
class NoGraphics:
    def find_spec(self, fullname, path=None, target=None):
        if fullname.split('.')[0] in ('pygame','pgzero','pyray','raylib'):
            raise ImportError('Data module imported graphics: '+fullname)
sys.meta_path.insert(0,NoGraphics())
${source}\n${body}`,
    )
    const result = spawnSync(purePython!, ['-I', file], {
      input: JSON.stringify(input),
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      timeout: 60_000,
    })
    expect(result.status, result.stderr || result.error?.message).toBe(0)
    return JSON.parse(result.stdout)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
