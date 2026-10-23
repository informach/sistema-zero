import { ForbiddenError } from '@sistemazero/core/http'
import type { VoiceInputActor } from '../../domain/profile/profile.aggregate'
import { ParentReauthenticationRequiredError } from '../../domain/study-access/errors'

/** Sessão de perfil (a criança) tentando mexer na fala: barrada na rota do PATCH. */
export const VOICE_INPUT_PARENT_ONLY_MESSAGE =
  'A fala da criança só pode ser alterada pelos responsáveis'

/** Sessão de SUPORTE (impersonação) tentando LIGAR a fala: só os responsáveis consentem. */
export const VOICE_INPUT_SUPPORT_FORBIDDEN_MESSAGE =
  'Só os responsáveis podem ligar a fala da criança. A equipe de suporte pode apenas desligar.'

export interface VoiceInputEnableContext {
  /** Sessão de suporte (o gateway injeta `x-auth-impersonator-id` = claim `act.sub`). */
  supportSession?: boolean
  /**
   * Responsável do Kids com login de até 15 minutos? `undefined` = sessão de outro produto
   * (sem a exigência, a mesma régua do nascimento e do perfil público).
   */
  parentAuthRecent?: boolean
}

/**
 * Régua ÚNICA para LIGAR a fala da criança (voz → texto), na criação E na edição do perfil.
 * É consentimento dos pais: a equipe de suporte, mesmo "entrando como" o responsável com
 * escrita liberada, nunca liga (403); e o responsável do Kids precisa de login recente
 * (`PARENT_REAUTH_REQUIRED`, o mesmo "entre de novo" das outras ações sensíveis).
 * ⚠️ Só vale para LIGAR: desligar é livre (sem relogin, e a equipe pode desligar), porque
 * voltar à opção mais protetiva nunca deve encontrar obstáculo.
 */
export function assertMayEnableVoiceInput(ctx: VoiceInputEnableContext): void {
  if (ctx.supportSession) throw new ForbiddenError(VOICE_INPUT_SUPPORT_FORBIDDEN_MESSAGE)
  if (ctx.parentAuthRecent === false) throw new ParentReauthenticationRequiredError()
}

/**
 * Quem assina a mudança na trilha do consentimento: com `x-auth-impersonator-id` é a equipe
 * de suporte (o id é o ator REAL); sem ele, os responsáveis donos da conta.
 */
export function voiceInputActor(impersonatorId: string | null | undefined): VoiceInputActor {
  return impersonatorId ? { kind: 'support', impersonatorId } : { kind: 'parent' }
}
