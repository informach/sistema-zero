import { z } from 'zod'
import { ApiError, JsonService } from '../sistemazero/http'

export const telegramMessageSchema = z.object({
  chatId: z.string().regex(/^-?\d{1,20}$/),
  text: z.string().min(1).max(4096),
  silent: z.boolean().default(false),
})
export class Telegram {
  private http: JsonService
  constructor(
    private token: string,
    origin = 'https://api.telegram.org',
    fetchImpl?: typeof fetch,
  ) {
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) throw new Error('Invalid bot token format')
    this.http = new JsonService(origin, fetchImpl)
  }
  async send(raw: z.infer<typeof telegramMessageSchema>, signal: AbortSignal) {
    const input = telegramMessageSchema.parse(raw)
    const response = await this.http.request(`/bot${this.token}/sendMessage`, {
      method: 'POST',
      body: {
        chat_id: input.chatId,
        text: input.text,
        disable_notification: input.silent,
        link_preview_options: { is_disabled: true },
      },
      signal,
    })
    const result = z
      .discriminatedUnion('ok', [
        z.object({
          ok: z.literal(true),
          result: z.object({
            message_id: z.number(),
            date: z.number(),
            chat: z.object({ id: z.number() }),
          }),
        }),
        z.object({ ok: z.literal(false), error_code: z.number() }),
      ])
      .parse(response.value)
    if (!result.ok) throw new ApiError(result.error_code, 'TELEGRAM_REJECTED')
    return result.result
  }
}
