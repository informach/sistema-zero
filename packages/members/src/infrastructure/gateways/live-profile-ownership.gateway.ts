import { LiveAccessError, LiveUnavailableError } from '../../domain/live/live.errors'
import type { LiveProfileOwnershipPort } from '../../domain/ports/live-repository.port'

export class LiveProfileOwnershipGateway implements LiveProfileOwnershipPort {
  constructor(
    private readonly options: {
      baseUrl?: string
      internalToken?: string
      timeoutMs: number
      fetch?: typeof fetch
    },
  ) {}
  async assertOwnership(accountId: string, learnerId: string | null): Promise<{ name: string }> {
    if (!this.options.baseUrl || !this.options.internalToken)
      throw new LiveUnavailableError('A verificação de perfis da oficina não está configurada.')
    const response = await (this.options.fetch ?? fetch)(
      `${this.options.baseUrl.replace(/\/$/, '')}/auth/internal/profiles/ownership`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': this.options.internalToken,
        },
        body: JSON.stringify({ accountId, profileId: learnerId }),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      },
    )
    if (!response.ok)
      throw new LiveUnavailableError('Não foi possível verificar o perfil. Tente novamente.')
    const body: unknown = await response.json()
    if (
      typeof body !== 'object' ||
      body === null ||
      !('valid' in body) ||
      body.valid !== true ||
      !('name' in body) ||
      typeof body.name !== 'string'
    )
      throw new LiveAccessError('O perfil não pertence a uma conta ativa informada.')
    return { name: body.name }
  }
}
