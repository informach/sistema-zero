/** The portable HTTP call, without runtime-specific properties such as Bun's preconnect. */
export type PublicationHttpFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>
