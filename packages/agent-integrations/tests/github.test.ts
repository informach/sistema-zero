import { expect, test } from 'bun:test'
import { GitHub } from '../src/github/client'

test('GitHub draft pins reviewed head, sends structured multiline body, and reports a post-create branch race', async () => {
  const reviewed = 'a'.repeat(40),
    changed = 'b'.repeat(40)
  let current = reviewed,
    creates = 0
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      if (request.method === 'GET') return Response.json({ object: { sha: current } })
      creates++
      const body = await request.json()
      expect(body.draft).toBe(true)
      expect(body.body).toBe('First line\nSecond line\n\n<!-- sistemazero-intent:receipt -->')
      return Response.json(
        {
          number: 1,
          html_url: 'https://github.com/fixture/repo/pull/1',
          draft: true,
          head: { sha: changed },
        },
        { status: 201 },
      )
    },
  })
  try {
    const github = new GitHub('test-token', server.url.origin)
    const input = {
      title: 'Fixture',
      body: 'First line\nSecond line',
      head: 'feature/test',
      base: 'staging',
      expectedHead: reviewed,
    }
    expect(
      await github.draft('fixture/repo', input, 'receipt', AbortSignal.timeout(3000)),
    ).toMatchObject({ success: false, reviewRequired: true })
    current = changed
    await expect(
      github.draft('fixture/repo', input, 'receipt', AbortSignal.timeout(3000)),
    ).rejects.toThrow('changed since review')
    expect(creates).toBe(1)
  } finally {
    await server.stop(true)
  }
})
