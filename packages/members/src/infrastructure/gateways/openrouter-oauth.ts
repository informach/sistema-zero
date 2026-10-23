import { StudioAiUnavailableError } from '../../domain/ai-usage/studio-ai.errors'
import type { OpenRouterOAuthPort } from '../../domain/ports/studio-ai-account.port'

export class OpenRouterOAuthGateway implements OpenRouterOAuthPort {
  constructor(private readonly request: typeof fetch = fetch) {}
  async exchange(code: string, verifier: string): Promise<string> {
    try {
      const response = await this.request('https://openrouter.ai/api/v1/auth/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }),
        signal: AbortSignal.timeout(15_000),
        redirect: 'error',
      })
      if (!response.ok) {
        await response.body?.cancel()
        throw new Error()
      }
      const data: unknown = await response.json()
      if (
        !data ||
        typeof data !== 'object' ||
        !('key' in data) ||
        typeof data.key !== 'string' ||
        data.key.length < 20 ||
        data.key.length > 512 ||
        /\s/.test(data.key)
      )
        throw new Error()
      return data.key
    } catch {
      throw new StudioAiUnavailableError()
    }
  }
}
