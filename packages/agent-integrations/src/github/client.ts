import { ToolRejected } from '@sistemazero/agent-core'
import { z } from 'zod'
import { JsonService } from '../sistemazero/http'

export const githubReadSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('pulls'),
    page: z.number().int().min(1).max(1000).default(1),
    state: z.enum(['open', 'closed', 'all']).default('open'),
  }),
  z.object({ action: z.literal('pull'), number: z.number().int().positive() }),
  z.object({
    action: z.literal('files'),
    number: z.number().int().positive(),
    page: z.number().int().min(1).max(1000).default(1),
  }),
  z.object({ action: z.literal('checks'), sha: z.string().regex(/^[a-f0-9]{40}$/) }),
  z.object({ action: z.literal('runs'), page: z.number().int().min(1).max(1000).default(1) }),
])
export const githubDraftSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(8000),
  head: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[A-Za-z0-9_./-]+$/),
  base: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[A-Za-z0-9_./-]+$/),
  expectedHead: z.string().regex(/^[a-f0-9]{40}$/),
})
export const repositorySchema = z
  .string()
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)
  .max(200)
export class GitHub {
  private http: JsonService
  constructor(
    private token: string,
    origin = 'https://api.github.com',
    fetchImpl?: typeof fetch,
  ) {
    this.http = new JsonService(origin, fetchImpl)
  }
  private request(path: string, signal: AbortSignal, body?: unknown) {
    return this.http.request(path, {
      method: body ? 'POST' : 'GET',
      body,
      token: this.token,
      signal,
      headers: {
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2026-03-10',
        'user-agent': 'SistemaZero-TUI',
      },
    })
  }
  async read(repository: string, input: z.infer<typeof githubReadSchema>, signal: AbortSignal) {
    const repo = repositorySchema.parse(repository)
    const operation = githubReadSchema.parse(input)
    let suffix: string
    switch (operation.action) {
      case 'pulls':
        suffix = `/pulls?state=${operation.state}&per_page=30&page=${operation.page}`
        break
      case 'pull':
        suffix = `/pulls/${operation.number}`
        break
      case 'files':
        suffix = `/pulls/${operation.number}/files?per_page=30&page=${operation.page}`
        break
      case 'checks':
        suffix = `/commits/${operation.sha}/check-runs?per_page=100`
        break
      case 'runs':
        suffix = `/actions/runs?per_page=30&page=${operation.page}`
        break
    }
    const result = await this.request(`/repos/${repo}${suffix}`, signal)
    return { ...result, source: `https://github.com/${repo}`, observedAt: new Date().toISOString() }
  }
  async draft(
    repository: string,
    raw: z.infer<typeof githubDraftSchema>,
    marker: string,
    signal: AbortSignal,
  ) {
    const repo = repositorySchema.parse(repository),
      input = githubDraftSchema.parse(raw)
    const ref = await this.request(
      `/repos/${repo}/git/ref/heads/${encodeURIComponent(input.head)}`,
      signal,
    )
    const current = z.object({ object: z.object({ sha: z.string() }) }).parse(ref.value)
    if (current.object.sha !== input.expectedHead)
      throw new ToolRejected('GITHUB_STALE', 'GitHub head changed since review')
    const result = await this.request(`/repos/${repo}/pulls`, signal, {
      title: input.title,
      body: `${input.body}\n\n<!-- sistemazero-intent:${marker} -->`,
      head: input.head,
      base: input.base,
      draft: true,
    })
    const receipt = z
      .object({
        number: z.number(),
        html_url: z.string().url(),
        draft: z.boolean(),
        head: z.object({ sha: z.string() }),
      })
      .parse(result.value)
    return {
      ...receipt,
      reviewedHead: input.expectedHead,
      success: receipt.head.sha === input.expectedHead,
      reviewRequired: receipt.head.sha !== input.expectedHead,
    }
  }
}
