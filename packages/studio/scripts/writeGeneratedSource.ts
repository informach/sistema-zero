import { randomUUID } from 'node:crypto'
import { existsSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Replace generated code atomically, including when Bun has mapped the previous file on Windows. */
export function writeGeneratedSource(target: string | URL, source: string): void {
  const destination = typeof target === 'string' ? resolve(target) : fileURLToPath(target)
  const temporary = join(dirname(destination), `.${basename(destination)}.${randomUUID()}.tmp`)
  try {
    writeFileSync(temporary, source, 'utf8')
    renameSync(temporary, destination)
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary)
  }
}
