import { describe, expect, it } from 'bun:test'
import {
  appendChatMessages,
  appendChatMessageText,
  MAX_AI_MESSAGE_CHARS,
  MAX_CHAT_MESSAGES,
} from './aiMessages'

describe('aiMessages', () => {
  it('limita o historico mantido no painel', () => {
    const messages = Array.from({ length: MAX_CHAT_MESSAGES + 5 }, (_, index) => ({
      id: index,
      who: 'ia' as const,
      text: String(index),
    }))

    const trimmed = appendChatMessages([], ...messages)

    expect(trimmed).toHaveLength(MAX_CHAT_MESSAGES)
    expect(trimmed[0]?.id).toBe(5)
  })

  it('limita texto acumulado por resposta da IA', () => {
    const messages = [{ id: 1, who: 'ia' as const, text: '' }]

    const updated = appendChatMessageText(messages, 1, 'x'.repeat(MAX_AI_MESSAGE_CHARS + 100))

    expect(updated[0]?.text).toHaveLength(MAX_AI_MESSAGE_CHARS)
    expect(updated[0]?.text.endsWith('[resposta truncada]')).toBe(true)
  })
})
