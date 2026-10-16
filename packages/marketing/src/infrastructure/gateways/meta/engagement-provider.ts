import { z } from 'zod'
import type { AccountService } from '../../../application/accounts/account.service'
import { ENGAGEMENT_SCOPES } from '../../../domain/engagement/policy'
import type {
  EngagementProvider,
  OutboundMessage,
  SendOutcome,
} from '../../../domain/ports/engagement-provider.port'
import type { SocialAccount } from '../../../domain/social-account/social-account'

const accepted = z.object({ message_id: z.string().min(1), recipient_id: z.string().optional() })
const media = z.object({ id: z.string(), owner: z.object({ id: z.string() }) })
export class MetaEngagementProvider implements EngagementProvider {
  constructor(
    private readonly accounts: Pick<AccountService, 'getFreshAccessToken'>,
    private readonly version: string,
    private readonly fetcher: (url: string, init: RequestInit) => Promise<Response> = fetch,
  ) {
    if (!/^v\d+\.\d+$/.test(version)) throw new Error('Versão Meta inválida')
  }
  private usable(account: SocialAccount) {
    return (
      account.network === 'instagram' &&
      account.status === 'connected' &&
      ENGAGEMENT_SCOPES.every((s) => account.scopes.includes(s))
    )
  }
  async verifyPost(account: SocialAccount, mediaId: string) {
    if (!this.usable(account) || !/^\d+$/.test(mediaId)) return false
    const token = await this.accounts.getFreshAccessToken(account)
    const response = await this.fetcher(
      `https://graph.facebook.com/${this.version}/${encodeURIComponent(mediaId)}?fields=id,owner`,
      {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
        redirect: 'error',
      },
    )
    if (!response.ok) return false
    const result = media.safeParse(await response.json())
    return (
      result.success && result.data.id === mediaId && result.data.owner.id === account.externalId
    )
  }
  async send(
    account: SocialAccount,
    recipient: string,
    commentId: string | null,
    message: OutboundMessage,
  ): Promise<SendOutcome> {
    if (!this.usable(account))
      return { status: 'failed', reason: 'Conta sem capacidade de mensagens' }
    if ((message.buttons.length && message.text.length > 640) || message.text.length > 1000)
      return { status: 'failed', reason: 'Mensagem excede o tamanho do formato' }
    let token: string
    try {
      token = await this.accounts.getFreshAccessToken(account)
    } catch {
      return {
        status: 'failed',
        reason: 'Não foi possível obter credencial válida; reconecte e confira a conta',
      }
    }
    const body = {
      recipient: commentId ? { comment_id: commentId } : { id: recipient },
      message: message.buttons.length
        ? {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'button',
                text: message.text,
                buttons: message.buttons,
              },
            },
          }
        : { text: message.text },
    }
    try {
      const response = await this.fetcher(
        `https://graph.facebook.com/${this.version}/${encodeURIComponent(account.externalId)}/messages`,
        {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10000),
          redirect: 'error',
        },
      )
      if (response.status === 429)
        return { status: 'retryable', reason: 'Limite de envio rejeitou a chamada' }
      if (response.status >= 500)
        return {
          status: 'uncertain',
          reason: `Provedor indisponível após chamada (${response.status})`,
        }
      if (!response.ok)
        return { status: 'failed', reason: `Provedor recusou o envio (${response.status})` }
      const result = accepted.safeParse(await response.json())
      if (!result.success || (result.data.recipient_id && result.data.recipient_id !== recipient))
        return {
          status: 'uncertain',
          reason: 'Resposta do provedor não confirma identidade do envio/destinatário',
        }
      return { status: 'accepted', externalId: result.data.message_id }
    } catch {
      return {
        status: 'uncertain',
        reason: 'Chamada iniciada sem resultado confirmado; não reenviar',
      }
    }
  }
}
