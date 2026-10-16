interface ConversationPage {
  ticket: { id: string; version: number; updatedAt?: string }
  messages: { id: string }[]
  latestCursor: string | null
  olderCursor: string | null
  hasOlder: boolean
}

/** Refresh and polling append from the cursor they requested, without skipping history. */
export function mergeConversationPage<T extends ConversationPage>(
  current: T | null,
  next: T,
  requestedAfter: string | null,
): T | null {
  if (current?.ticket.id !== next.ticket.id) return current
  const advances = current.latestCursor === requestedAfter
  const newerTicket =
    next.ticket.version > current.ticket.version ||
    (next.ticket.version === current.ticket.version &&
      (next.ticket.updatedAt ?? '') >= (current.ticket.updatedAt ?? ''))
  const messages = advances
    ? [...current.messages, ...next.messages]
    : [...next.messages, ...current.messages]
  return {
    ...current,
    ticket: newerTicket ? next.ticket : current.ticket,
    messages: [...new Map(messages.map((m) => [m.id, m])).values()],
    // A delayed page must not move a cursor that another request already advanced.
    latestCursor: advances ? (next.latestCursor ?? current.latestCursor) : current.latestCursor,
    // A freshly created ticket has no cursor until its first server page arrives.
    ...(advances && requestedAfter === null
      ? { hasOlder: next.hasOlder, olderCursor: next.olderCursor }
      : {}),
  }
}
