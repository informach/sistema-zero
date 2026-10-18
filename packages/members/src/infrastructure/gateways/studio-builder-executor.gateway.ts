import type { StudioBuilderExecution } from '../../application/studio-pro/studio-builder-coordinator'

/** Dispatch to the owning BFF. An adult execution must never fall back to Kids. */
export function createStudioBuilderExecutorDelivery(options: {
  kidsUrl?: string
  adultUrl?: string
  secret?: string
  fetchImpl?: typeof fetch
}) {
  return async (job: StudioBuilderExecution, signal: AbortSignal) => {
    const url = job.actor.audience === 'adult' ? options.adultUrl : options.kidsUrl
    if (!url || !options.secret)
      throw new Error('Executor do Studio não configurado para este público.')
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: 'POST',
      redirect: 'error',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${options.secret}` },
      body: JSON.stringify(job),
      signal: AbortSignal.any([signal, AbortSignal.timeout(155_000)]),
    })
    await response.body?.cancel()
    if (!response.ok) throw new Error(`Executor do Studio indisponível (${response.status}).`)
  }
}
