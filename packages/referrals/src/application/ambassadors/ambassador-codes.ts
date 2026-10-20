import type { GiftAudience } from '@sistemazero/core/referrals'
import { generateAmbassadorCode } from '../../domain/codes'
import type {
  AmbassadorRecord,
  CodeRecord,
  ReferralRepository,
} from '../../domain/ports/referral-repository.port'

const CODE_RETRIES = 5

/**
 * Código do embaixador para o público, criado sob demanda (o Kids nasce com o cadastro; o
 * adulto, quando o painel ou o convite pede). Idempotente e seguro em corrida pelo UNIQUE
 * parcial (embaixador, público). `null` = embaixador inexistente.
 */
export async function ensureAmbassadorShareCode(
  repo: ReferralRepository,
  ambassador: Pick<AmbassadorRecord, 'id' | 'name'>,
  audience: GiftAudience,
): Promise<CodeRecord | null> {
  for (let attempt = 0; attempt < CODE_RETRIES; attempt++) {
    const result = await repo.ensureAmbassadorCode({
      ambassadorId: ambassador.id,
      audience,
      code: generateAmbassadorCode(ambassador.name),
    })
    if (result === null) return null
    if (result.kind === 'ok') return result.code
  }
  // 5 colisões seguidas com 4 chars de entropia ≈ impossível — sinal de bug.
  throw new Error('esgotadas as tentativas de gerar código único')
}
