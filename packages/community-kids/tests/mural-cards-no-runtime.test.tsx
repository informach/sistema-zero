import { afterEach, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { cleanup, render } from '@testing-library/react'
import { ShowcaseCard } from '../src/components/kids/kids-space-detail'
import type { HubThreadView } from '../src/lib/types'

/**
 * Desempenho F8 (docs/plans/2026-10-16-estudio-python-desempenho.md): o Mural mostra 20
 * cards SEM runtimes. O card é capa + texto + links para `/jogar/<id>`; jogar acontece na
 * página pública, em outra aba. Nenhum card monta iframe e o módulo do card não alcança o
 * Estúdio (player, runtime Python, validação) nem o player público, nem por import dinâmico.
 */
const PACKAGES = resolve(import.meta.dir, '../..')
const STUDIO = `${resolve(PACKAGES, 'studio')}${sep}`
const PUBLIC_PLAYER = resolve(PACKAGES, 'member-shell/src/components/creator/public-player.tsx')
const isRuntime = (file: string) => file.startsWith(STUDIO) || file === PUBLIC_PLAYER
const transpiler = new Bun.Transpiler({ loader: 'tsx' })

/** First-party imports of one module (type-only imports are erased by the transpiler). */
function importsOf(file: string) {
  const found: Array<{ specifier: string; to: string; dynamic: boolean }> = []
  for (const item of transpiler.scanImports(readFileSync(file, 'utf8'))) {
    let to: string
    try {
      to = Bun.resolveSync(item.path, dirname(file))
    } catch {
      continue
    }
    if (!to.startsWith(PACKAGES) || to.includes(`${sep}node_modules${sep}`)) continue
    if (!/\.(?:tsx?|jsx?|mjs)$/.test(to)) continue
    found.push({ specifier: item.path, to, dynamic: item.kind === 'dynamic-import' })
  }
  return found
}

/**
 * What rendering the module loads (its static closure, stopping at runtime modules) and the
 * deferred `import()` edges out of it whose own static closure reaches a runtime.
 */
function runtimeReach(entry: string) {
  const closure = (start: string) => {
    const seen = new Set<string>()
    const runtime: string[] = []
    const deferred: Array<{ from: string; specifier: string; to: string }> = []
    const queue = [start]
    while (queue.length) {
      const file = queue.pop()!
      if (seen.has(file)) continue
      seen.add(file)
      if (isRuntime(file)) {
        runtime.push(file)
        continue
      }
      for (const edge of importsOf(file)) {
        if (edge.dynamic) deferred.push({ from: file, specifier: edge.specifier, to: edge.to })
        else queue.push(edge.to)
      }
    }
    return { seen, runtime, deferred }
  }
  const rendered = closure(entry)
  const deferredRuntime = rendered.deferred
    .filter((edge) => isRuntime(edge.to) || closure(edge.to).runtime.length > 0)
    .map((edge) => `${relative(PACKAGES, edge.from).replaceAll(sep, '/')} -> ${edge.specifier}`)
  return { rendered, deferredRuntime: [...new Set(deferredRuntime)].sort() }
}

const runtime = { profileId: 'python-turtle', releaseId: 'r1', manifestSha256: 'a'.repeat(64) }
function thread(index: number): HubThreadView {
  const python = index % 2 === 0
  return {
    id: `t${index}`,
    version: 1,
    channelId: 'mural',
    authorId: null,
    title: `Jogo ${index}`,
    slug: `jogo-${index}`,
    body: 'Venha jogar.',
    isPinned: false,
    isLocked: false,
    status: 'published',
    pending: false,
    commentCount: index,
    isShowcase: true,
    authorDisplayName: 'Ana',
    coverImageUrl: index % 3 === 0 ? null : `https://media.test/capa-${index}.webp`,
    playId: `00000000-0000-4000-a000-${String(index).padStart(12, '0')}`,
    playsCount: index,
    studioMeta: python
      ? { pro: index % 4 === 0, extensions: [], programmingLanguage: 'python', runtime }
      : { pro: index % 4 === 1, extensions: [] },
    reactions: [],
  } as unknown as HubThreadView
}

afterEach(cleanup)

test('20 cards do Mural, Python e JavaScript, não montam iframe nem embutem o jogo', () => {
  const threads = Array.from({ length: 20 }, (_, index) => thread(index))
  const view = render(
    <div>
      {threads.map((item) => (
        <ShowcaseCard
          key={item.id}
          thread={item}
          viewerId="viewer"
          onOpen={() => {}}
          onRemix={() => {}}
        />
      ))}
    </div>,
  )
  expect(view.container.querySelectorAll('article')).toHaveLength(20)
  expect(view.container.querySelectorAll('iframe, object, embed, canvas')).toHaveLength(0)
  const plays = [...view.container.querySelectorAll('a[href^="/jogar/"]')]
  expect(new Set(plays.map((link) => link.getAttribute('href')))).toEqual(
    new Set(threads.map((item) => `/jogar/${item.playId}`)),
  )
})

test('o módulo dos cards não alcança runtime, player nem o Estúdio', () => {
  const { rendered, deferredRuntime } = runtimeReach(
    resolve(import.meta.dir, '../src/components/kids/kids-space-detail.tsx'),
  )
  // Sanity: the walk crosses into shared packages, so a hidden runtime import would be seen.
  expect([...rendered.seen].some((file) => file.includes(`${sep}member-shell${sep}`))).toBe(true)
  expect(rendered.runtime).toEqual([])
  expect(deferredRuntime).toEqual([])
})
