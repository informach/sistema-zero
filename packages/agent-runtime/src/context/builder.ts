import { readdir, realpath } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import {
  type ContextBundle,
  type ContextItem,
  canonical,
  memorySchema,
} from '@sistemazero/agent-core'
import { parse } from 'yaml'
import { z } from 'zod'
import type { Store } from '../store/client'
import { exists, hash, inside, readBounded, workspacePath } from '../tools/paths'

export class ContextBuilder {
  constructor(private store: Store) {}
  async rules(workspace: string, target = '.'): Promise<ContextItem[]> {
    const root = await realpath(workspace)
    const path = await workspacePath(root, target, true)
    let scope = target === '.' ? root : dirname(path)
    const directories: string[] = []
    while (inside(root, scope)) {
      directories.unshift(scope)
      if (scope === root) break
      scope = dirname(scope)
    }
    const items: ContextItem[] = []
    for (const directory of directories)
      for (const name of ['AGENTS.md', 'CLAUDE.md']) {
        const candidate = join(directory, name)
        if (!(await exists(candidate))) continue
        const actual = await workspacePath(root, relative(root, candidate))
        const bytes = await readBounded(actual, 64000)
        items.push({
          source: relative(root, actual),
          sha256: hash(bytes),
          kind: 'rules',
          text: bytes.toString('utf8'),
        })
      }
    return items
  }
  async skills(workspace: string) {
    const result: { name: string; description: string; path: string; sha256: string }[] = []
    for (const directory of ['.agents/skills', '.claude/skills']) {
      const root = resolve(workspace, directory)
      if (!(await exists(root))) continue
      const checked = await workspacePath(workspace, directory)
      const entries = await readdir(checked, { withFileTypes: true })
      for (const entry of entries) {
        if (result.length >= 300) throw new Error('Skill catalog exceeds 300 entries')
        if (!entry.isDirectory()) continue
        const candidate = join(directory, entry.name, 'SKILL.md')
        if (!(await exists(join(workspace, candidate)))) continue
        const data = await readBounded(await workspacePath(workspace, candidate), 128000)
        const text = data.toString('utf8')
        const header = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1]
        if (!header) continue
        const metadata = z
          .object({ name: z.string().min(1), description: z.string().min(1) })
          .safeParse(parse(header, { maxAliasCount: 0 }))
        if (!metadata.success) throw new Error(`Invalid skill metadata: ${candidate}`)
        result.push({ ...metadata.data, path: candidate.split(sep).join('/'), sha256: hash(data) })
      }
    }
    return result
  }
  async build(
    workspace: string,
    sessionId: string,
    input: string,
    maxBytes = 24000,
  ): Promise<ContextBundle> {
    const items = await this.rules(workspace)
    const fork = await this.store.call({
      op: 'document.get',
      namespace: 'session-context',
      id: sessionId,
    })
    if (fork) {
      const context = z
        .object({ workspace: z.string(), sha256: z.string(), text: z.string() })
        .parse(fork)
      if (context.workspace !== workspace || hash(context.text) !== context.sha256)
        throw new Error('Fork context integrity mismatch')
      items.push({
        kind: 'memory',
        source: `session-fork:${sessionId}`,
        sha256: context.sha256,
        text: context.text,
      })
    }
    if (await exists(join(workspace, 'package.json'))) {
      const packageFile = await readBounded(await workspacePath(workspace, 'package.json'), 64000)
      const metadata = z
        .object({
          name: z.string().optional(),
          packageManager: z.string().optional(),
          workspaces: z.unknown().optional(),
          scripts: z.record(z.string(), z.string()).optional(),
        })
        .parse(JSON.parse(packageFile.toString('utf8')))
      items.push({
        source: 'package.json',
        kind: 'map',
        sha256: hash(packageFile),
        text: JSON.stringify(metadata),
      })
    }
    const omitted: string[] = []
    const skills = await this.skills(workspace)
    const terms = input.toLocaleLowerCase().match(/[\p{L}\p{N}_-]{3,}/gu) ?? []
    const score = (skill: (typeof skills)[number]) =>
      terms.reduce(
        (sum, term) =>
          sum +
          (skill.name.toLocaleLowerCase().includes(term) ? 3 : 0) +
          (skill.description.toLocaleLowerCase().includes(term) ? 1 : 0),
        0,
      )
    skills.sort((left, right) => score(right) - score(left) || left.name.localeCompare(right.name))
    for (const skill of skills)
      items.push({
        source: skill.path,
        kind: 'skill',
        sha256: skill.sha256,
        text: `${skill.name}: ${skill.description.slice(0, 240)} (${skill.path}; ${skill.sha256})`,
      })
    const memories = z.array(memorySchema).parse(
      await this.store.call({
        op: 'memory.search',
        workspace,
        sessionId,
        query: input
          .split(/\s+/)
          .filter((word) => word.length > 3)
          .slice(0, 3)
          .join(' '),
        offset: 0,
      }),
    )
    for (const memory of memories.slice(0, 10))
      items.push({
        source: `memory:${memory.id}`,
        sha256: hash(canonical(memory)),
        kind: 'memory',
        text: JSON.stringify(memory),
      })
    let bytes = 0
    const selected: ContextItem[] = []
    for (const item of items) {
      const size = Buffer.byteLength(item.text)
      if (bytes + size > maxBytes) {
        if (item.kind === 'rules')
          throw new Error('Project instructions exceed context budget; increase contextBytes')
        omitted.push(item.source)
        continue
      }
      selected.push(item)
      bytes += size
    }
    return {
      items: selected,
      bytes,
      omitted,
      revision: hash(
        canonical(selected.map((item) => ({ source: item.source, sha256: item.sha256 }))),
      ),
    }
  }
}
