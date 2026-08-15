import 'server-only'
import type {
  HubModerationExcerptView,
  HubPendingItemView,
  HubReportedContentView,
  HubReportView,
} from '@/lib/hub-types'
import { type IdentityRef, resolveIdentities } from '@/server/identities'

function authorRef(author: { authorId: string; authorAccountId: string | null }): IdentityRef {
  return { userId: author.authorId, accountId: author.authorAccountId }
}

function refsForContent(content: HubPendingItemView): IdentityRef[] {
  const refs = [authorRef(content)]
  if (content.context.thread) refs.push(authorRef(content.context.thread))
  if (content.context.replyTo) refs.push(authorRef(content.context.replyTo))
  return refs
}

function hydrateExcerpt(
  excerpt: HubModerationExcerptView | null,
  identityOf: (ref: IdentityRef) => ReturnTypeIdentity,
): HubModerationExcerptView | null {
  return excerpt ? { ...excerpt, authorIdentity: identityOf(authorRef(excerpt)) } : null
}

type ReturnTypeIdentity =
  Awaited<ReturnType<typeof resolveIdentities>> extends (ref: IdentityRef) => infer Identity
    ? Identity
    : never

function hydrateContent<T extends HubPendingItemView>(
  content: T,
  identityOf: (ref: IdentityRef) => ReturnTypeIdentity,
): T {
  return {
    ...content,
    authorIdentity: identityOf(authorRef(content)),
    context: {
      ...content.context,
      thread: hydrateExcerpt(content.context.thread, identityOf),
      replyTo: hydrateExcerpt(content.context.replyTo, identityOf),
    },
  }
}

export async function hydratePendingItems(
  items: HubPendingItemView[],
): Promise<HubPendingItemView[]> {
  const identityOf = await resolveIdentities(items.flatMap(refsForContent))
  return items.map((item) => hydrateContent(item, identityOf))
}

export async function hydrateReportItems(items: HubReportView[]): Promise<HubReportView[]> {
  const refs = items.flatMap((item) => [
    { userId: item.reporterId, accountId: item.reporterAccountId },
    ...(item.content ? refsForContent(item.content) : []),
  ])
  const identityOf = await resolveIdentities(refs)
  return items.map((item) => ({
    ...item,
    reporterIdentity: identityOf({
      userId: item.reporterId,
      accountId: item.reporterAccountId,
    }),
    content: item.content ? hydrateContent<HubReportedContentView>(item.content, identityOf) : null,
  }))
}
