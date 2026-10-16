import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { withOutputBudget } from '../src/main/media/output-budget'

test('limite de saída interrompe processamento ativo sem apagar original ou artefato parcial', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'marketing-budget-'))
  if (
    path.dirname(root) !== path.resolve(os.tmpdir()) ||
    !path.basename(root).startsWith('marketing-budget-')
  )
    throw new Error('Diretório temporário inválido')
  try {
    const original = path.join(root, 'original.txt'),
      partial = path.join(root, 'partial.mp4')
    await writeFile(original, 'original preservado')
    let canceled = false
    await expect(
      withOutputBudget(root, [partial], 100, AbortSignal.timeout(5000), async (signal) => {
        await writeFile(partial, Buffer.alloc(101))
        try {
          await delay(4000, undefined, { signal })
        } catch {
          canceled = signal.aborted
          throw signal.reason
        }
      }),
    ).rejects.toThrow('espaço reservado')
    expect(canceled).toBe(true)
    expect(await readFile(original, 'utf8')).toBe('original preservado')
    expect((await readFile(partial)).length).toBe(101)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 10000)
