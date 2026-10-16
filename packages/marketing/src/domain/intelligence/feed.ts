export type FeedEntry = {
  key: string
  title: string
  text: string
  url: string | null
  publishedAt: string | null
}
export type FeedResult = {
  entries: FeedEntry[]
  notModified: boolean
  etag: string | null
  observedEntries: number
  truncated: boolean
}
export interface FeedSource {
  collect(input: { url: string; etag: string | null }, signal: AbortSignal): Promise<FeedResult>
}
export class FeedError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly retryAfterMs = 0,
    cause?: unknown,
  ) {
    super(message, { cause })
    this.name = 'FeedError'
  }
}
