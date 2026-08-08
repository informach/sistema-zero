import { describe, expect, it } from 'bun:test'
import { createLatestTaskQueue } from './latestTaskQueue'

describe('createLatestTaskQueue', () => {
  it('serializa o trabalho e substitui pendências pela versão mais nova', async () => {
    let releaseFirst = (): void => {}
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const started: number[] = []
    const completed: number[] = []
    let running = 0
    let maxRunning = 0
    const queue = createLatestTaskQueue<number, number>({
      run: async (value) => {
        started.push(value)
        running += 1
        maxRunning = Math.max(maxRunning, running)
        if (value === 1) await firstBlocked
        running -= 1
        return value
      },
      onLatestSuccess: (value) => completed.push(value),
    })

    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)
    releaseFirst()
    await queue.flush()

    expect(started).toEqual([1, 3])
    expect(completed).toEqual([3])
    expect(maxRunning).toBe(1)
  })

  it('trata rejeições e continua com a pendência mais nova', async () => {
    const failures: string[] = []
    const successes: number[] = []
    const queue = createLatestTaskQueue<number, number>({
      run: async (value) => {
        if (value === 1) throw new Error('offline')
        return value
      },
      onLatestSuccess: (value) => successes.push(value),
      onLatestError: (error) => failures.push(error instanceof Error ? error.message : 'erro'),
    })
    queue.enqueue(1)
    await queue.flush()
    queue.enqueue(2)
    await queue.flush()
    expect(failures).toEqual(['offline'])
    expect(successes).toEqual([2])
  })
})
