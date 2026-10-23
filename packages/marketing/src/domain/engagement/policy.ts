import type {
  CapabilityProof,
  ConversationPlan,
  JourneyState,
} from '@sistemazero/marketing-contracts'

export const normalizeKeyword = (value: string) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleUpperCase('pt-BR')
export function keywordMatches(text: string, keyword: string, direct: boolean) {
  const normalized = normalizeKeyword(text)
  const words: string[] = normalized.match(/[\p{L}\p{N}]+/gu) ?? []
  const expected = normalizeKeyword(keyword)
  return direct ? words.length === 1 && words[0] === expected : words.includes(expected)
}
export type IncomingEvent = {
  key: string
  accountExternalId: string
  recipient: string
  at: string
  kind: 'comment' | 'message' | 'postback' | 'echo' | 'unsupported'
  text: string | null
  mediaId: string | null
  commentId: string | null
  postback: string | null
  externalId: string | null
}
export type JourneyAction =
  | 'opening'
  | 'offer'
  | 'help'
  | 'stop'
  | 'student'
  | 'child'
  | 'human'
  | 'none'
export function decideIncoming(input: {
  event: IncomingEvent
  plan: ConversationPlan | null
  state: JourneyState | null
  blocked: boolean
  human: boolean
  validPostback: boolean
}): JourneyAction {
  const { event, plan, state } = input
  if (
    event.kind === 'message' &&
    ['PARAR', 'STOP', 'CANCELAR'].some((word) => keywordMatches(event.text ?? '', word, true))
  )
    return 'stop'
  if (input.blocked) return 'none'
  if (event.kind === 'echo') return 'human'
  if (input.validPostback) {
    if (event.postback?.endsWith(':stop')) return 'stop'
    if (event.postback?.endsWith(':student')) return 'student'
    if (event.postback?.endsWith(':help')) return 'help'
    if (!input.human && state === 'waiting' && event.postback?.endsWith(':offer')) return 'offer'
  }
  if (input.human) return 'none'
  if (
    !state &&
    plan &&
    event.text &&
    (event.kind === 'comment' || event.kind === 'message') &&
    keywordMatches(event.text, plan.keyword, event.kind === 'message')
  )
    return 'opening'
  if (event.kind === 'message' || event.kind === 'unsupported') return 'human'
  return 'none'
}
export function withinWindow(at: Date | null, now: Date, hours: number) {
  return (
    at !== null &&
    at.getTime() <= now.getTime() + 60_000 &&
    now.getTime() - at.getTime() < hours * 3_600_000
  )
}
export function capabilityAvailable(proof: CapabilityProof | null, now: Date) {
  return proof !== null && new Date(proof.validUntil).getTime() > now.getTime()
}
export const ENGAGEMENT_SCOPES = [
  'instagram_basic',
  'instagram_manage_comments',
  'instagram_manage_messages',
  'pages_manage_metadata',
  'pages_read_engagement',
] as const
