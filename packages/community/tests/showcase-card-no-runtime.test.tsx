import { expect, mock, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import type { HubThreadView } from '../src/lib/types'

/**
 * Desempenho F8 (docs/plans/2026-10-16-estudio-python-desempenho.md): o Mural adulto mostra
 * 20 cards SEM runtimes. Jogar abre `/jogar/<id>` em outra aba; o Estúdio só é importado no
 * clique de "Fazer minha versão", nunca para desenhar o card. O grafo de módulos prova isso
 * também para o que o render estático não executa (efeitos e imports dinâmicos).
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

// O card só usa o roteador no clique; fora do App Router o hook real recusa montar.
const navigation = await import('next/navigation')
mock.module('next/navigation', () => ({
  ...navigation,
  useRouter: () => ({ push() {}, replace() {}, prefetch() {}, back() {}, refresh() {} }),
}))

const { ShowcaseCard } = await import('../src/components/community/showcase-card')

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

test('20 cards do Mural adulto, Python e JavaScript, não montam iframe nem embutem o jogo', () => {
  const threads = Array.from({ length: 20 }, (_, index) => thread(index))
  const html = renderToStaticMarkup(
    <div>
      {threads.map((item) => (
        <ShowcaseCard
          key={item.id}
          thread={item}
          viewerId="viewer"
          capability={
            item.id === 't0'
              ? null
              : {
                  pro: true,
                  allowedExtensions: [],
                  python: [{ kind: 'classic', runtime, allowedExtensions: [] }],
                }
          }
          onOpen={() => {}}
        />
      ))}
    </div>,
  )
  expect(html.match(/<article/g)).toHaveLength(20)
  expect(html).not.toMatch(/<(iframe|object|embed|canvas)\b/)
  for (const item of threads) expect(html).toContain(`href="/jogar/${item.playId}"`)
  expect(html.match(/Fazer minha versão/g)).toHaveLength(19)
})

test('o módulo do card não carrega runtime; só o clique do remix importa o Estúdio', () => {
  const { rendered, deferredRuntime } = runtimeReach(
    resolve(import.meta.dir, '../src/components/community/showcase-card.tsx'),
  )
  expect([...rendered.seen].some((file) => file.includes(`${sep}member-shell${sep}`))).toBe(true)
  expect(rendered.runtime).toEqual([])
  expect(deferredRuntime).toEqual([
    'community/src/components/community/showcase-card.tsx -> @sistemazero/member-shell/lib/studio-python-remix',
    'member-shell/src/lib/import-creator-remix.ts -> @sistemazero/studio',
  ])
})
