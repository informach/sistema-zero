import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { memorySchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { ContextBuilder } from '../src/context/builder'
import { compact } from '../src/context/compaction'
import { Store } from '../src/store/client'

test('nested rules change their revision and memory retrieval finds late records without crossing project scope', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-context-'))
  const store = new Store(join(directory, 'state.sqlite'))
  const context = new ContextBuilder(store)
  try {
    await mkdir(join(directory, 'src'))
    await writeFile(join(directory, 'AGENTS.md'), 'root constraint')
    await writeFile(join(directory, 'src', 'AGENTS.md'), 'nested constraint')
    const initial = await context.rules(directory, 'src/file.ts')
    expect(initial.map((item) => item.text)).toEqual(['root constraint', 'nested constraint'])
    await writeFile(join(directory, 'src', 'AGENTS.md'), 'changed constraint')
    expect((await context.rules(directory, 'src/file.ts'))[1]?.sha256).not.toBe(initial[1]?.sha256)
    const now = new Date().toISOString()
    for (let index = 0; index < 120; index++)
      await store.call({
        op: 'memory.put',
        value: memorySchema.parse({
          id: `memory${index}`,
          scope: 'project',
          workspace: directory,
          body: index === 119 ? 'needle from latest evidence' : 'other entry',
          source: 'user',
          evidence: [],
          createdAt: now,
          updatedAt: now,
          expiresAt: null,
        }),
      })
    const found = z
      .array(memorySchema)
      .parse(
        await store.call({ op: 'memory.search', workspace: directory, query: 'needle', offset: 0 }),
      )
    expect(found.map((item) => item.id)).toEqual(['memory119'])
    const latest = found[0]
    if (!latest) throw new Error('Missing fixture memory')
    const corrected = memorySchema.parse(
      await store.call({
        op: 'memory.update',
        id: latest.id,
        workspace: directory,
        expectedUpdatedAt: latest.updatedAt,
        body: 'corrected evidence',
        evidence: ['user review'],
      }),
    )
    expect(corrected.source).toBe('user')
    await expect(
      store.call({
        op: 'memory.update',
        id: latest.id,
        workspace: directory,
        expectedUpdatedAt: latest.updatedAt,
        body: 'stale overwrite',
        evidence: [],
      }),
    ).rejects.toThrow('Memory changed')
    expect(
      await store.call({ op: 'memory.search', workspace: directory, query: 'needle', offset: 0 }),
    ).toEqual([])
    expect(
      z
        .array(memorySchema)
        .parse(await store.call({ op: 'memory.page', workspace: directory, offset: 100 })),
    ).toHaveLength(20)
    expect(
      await store.call({ op: 'memory.search', workspace: 'other', query: 'needle', offset: 0 }),
    ).toEqual([])
    const result = await compact(
      [
        { role: 'system', content: 'constraint' },
        { role: 'user', content: 'user requirement' },
        { role: 'tool', tool_call_id: 'x', content: 'evidence'.repeat(2000) },
        { role: 'assistant', content: 'recent' },
        { role: 'user', content: 'latest' },
      ],
      directory,
      4000,
    )
    expect(result.messages[0]?.content).toBe('constraint')
    expect(result.messages[1]?.content).toBe('user requirement')
    expect(result.references).toHaveLength(1)
    expect(result.messages[2]?.content).toContain('artifact_read')
  } finally {
    await store.close()
  }
})
