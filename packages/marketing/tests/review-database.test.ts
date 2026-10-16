import { expect, test } from 'bun:test'
import { requireReviewDatabase } from './helpers/review-database'

test('instâncias de revisão são explícitas e não aceitam banco remoto, porta comum ou parâmetros que mudem conexão', () => {
  for (const port of ['15439', '15440'])
    expect(() =>
      requireReviewDatabase(`postgres://postgres@127.0.0.1:${port}/marketing_review`),
    ).not.toThrow()
  for (const url of [
    undefined,
    'invalid',
    'postgres://localhost:5432/marketing_review',
    'postgres://remote:15440/marketing_review',
    'postgres://127.0.0.1:15440/production',
    'postgres://127.0.0.1:15440/marketing_review?host=remote',
    'postgres://127.0.0.1:15440/marketing_review#other',
    'https://127.0.0.1:15440/marketing_review',
    'postgres://127.0.0.1:15439/marketing_review_tests',
  ])
    expect(() => requireReviewDatabase(url)).toThrow('exclusivo')
  expect(() =>
    requireReviewDatabase('postgres://127.0.0.1:15440/marketing_review_tests'),
  ).not.toThrow()
})
