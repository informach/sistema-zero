/** Dedicated disposable instances: Docker 15439, native Windows 15440. Never accepts DATABASE_URL. */
export function requireReviewDatabase(url: string | undefined): asserts url is string {
  const fail = () =>
    new Error(
      'Use somente um banco local exclusivo marketing_review ou marketing_review_tests nas portas de revisão',
    )
  if (!url || !URL.canParse(url)) throw fail()
  const parsed = new URL(url)
  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    !['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
    !['15439', '15440'].includes(parsed.port) ||
    !(
      parsed.pathname === '/marketing_review' ||
      (parsed.port === '15440' && parsed.pathname === '/marketing_review_tests')
    ) ||
    parsed.search ||
    parsed.hash
  )
    throw fail()
}

/** This suite truncates its inbound/outbound queues: never allow the connected review DB. */
export function requireEngagementReviewDatabase(url: string | undefined): asserts url is string {
  if (!url || !URL.canParse(url)) throw new Error('Use o banco exclusivo da revisão de engajamento')
  const parsed = new URL(url)
  const dedicated =
    (['15465', '15466'].includes(parsed.port) && parsed.pathname === '/marketing_review') ||
    (parsed.port === '15440' && parsed.pathname === '/marketing_engagement_review_tests')
  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    parsed.hostname !== '127.0.0.1' ||
    parsed.search ||
    parsed.hash ||
    !dedicated
  )
    throw new Error('Use o banco exclusivo da revisão de engajamento')
}
