/** Canais de mensageria suportados. */
export const MESSAGE_CHANNELS = ['email', 'whatsapp'] as const
export type Channel = (typeof MESSAGE_CHANNELS)[number]

export function isChannel(value: unknown): value is Channel {
  return typeof value === 'string' && (MESSAGE_CHANNELS as readonly string[]).includes(value)
}
