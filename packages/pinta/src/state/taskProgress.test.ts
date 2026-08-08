import { describe, expect, it, mock } from 'bun:test'
import type { PintaTaskSession } from '../core/types'
import { updateTaskProgress } from './taskProgress'

describe('updateTaskProgress', () => {
  it('transforma rejeição do host em resultado observável', async () => {
    const onProgress = mock(async () => {
      throw new Error('offline')
    })
    const session: Pick<PintaTaskSession, 'onProgress'> = { onProgress }
    const ok = await updateTaskProgress(session, { status: 'in_progress' })
    expect(ok).toBe(false)
    expect(onProgress).toHaveBeenCalledTimes(1)
  })

  it('confirma quando o host persiste o progresso', async () => {
    const onProgress = mock(async () => undefined)
    const session: Pick<PintaTaskSession, 'onProgress'> = { onProgress }
    expect(await updateTaskProgress(session, { status: 'completed' })).toBe(true)
  })
})
