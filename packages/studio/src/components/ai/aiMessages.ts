export interface ChatMessage {
  id: number
  who: 'aluno' | 'ia'
  text: string
  streaming?: boolean
}

export const MAX_CHAT_MESSAGES = 80
export const MAX_AI_MESSAGE_CHARS = 24_000

const TRUNCATED_SUFFIX = '\n\n[resposta truncada]'

export function appendChatMessages(
  messages: ChatMessage[],
  ...nextMessages: ChatMessage[]
): ChatMessage[] {
  return trimChatMessages([...messages, ...nextMessages.map(normalizeChatMessage)])
}

export function appendChatMessageText(
  messages: ChatMessage[],
  messageId: number,
  text: string,
): ChatMessage[] {
  if (!text) return messages
  return updateChatMessage(messages, messageId, (message) => ({
    ...message,
    text: clampMessageText(message.text + text),
  }))
}

export function finishStreamingMessages(messages: ChatMessage[]): ChatMessage[] {
  return trimChatMessages(
    messages.map((message) => (message.streaming ? { ...message, streaming: false } : message)),
  )
}

export function updateChatMessage(
  messages: ChatMessage[],
  messageId: number,
  update: (message: ChatMessage) => ChatMessage,
): ChatMessage[] {
  return trimChatMessages(
    messages.map((message) =>
      message.id === messageId ? normalizeChatMessage(update(message)) : message,
    ),
  )
}

function trimChatMessages(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_CHAT_MESSAGES) return messages
  return messages.slice(-MAX_CHAT_MESSAGES)
}

function normalizeChatMessage(message: ChatMessage): ChatMessage {
  return { ...message, text: clampMessageText(message.text) }
}

function clampMessageText(text: string): string {
  if (text.length <= MAX_AI_MESSAGE_CHARS) return text
  const keep = Math.max(0, MAX_AI_MESSAGE_CHARS - TRUNCATED_SUFFIX.length)
  return `${text.slice(0, keep)}${TRUNCATED_SUFFIX}`
}
