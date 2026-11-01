import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postcss from 'postcss'
import { createLessonStyles, gateStylesheet } from '../scripts/lesson-theme.mjs'

test('skins are mutually exclusive and their gate adds no selector specificity', () => {
  const input =
    ':root[data-sz-palette="pink"] { --ink: red } body { color: black } .card:is(.a,.b), button { padding: 1rem }'
  const regular = postcss.parse(gateStylesheet(input))
  const creator = postcss.parse(gateStylesheet(input, true))
  const selectors = (root: postcss.Root) => {
    const values: string[] = []
    root.walkRules((rule) => {
      values.push(rule.selector)
    })
    return values
  }
  expect(selectors(regular)).toEqual([
    ':root:where(:not(:has(.sz-lesson-ui)))[data-sz-palette="pink"]',
    'body:where(:not(:has(.sz-lesson-ui)))',
    ':where(body:not(:has(.sz-lesson-ui))) .card:is(.a,.b),\n:where(body:not(:has(.sz-lesson-ui))) button',
  ])
  expect(selectors(creator)[0]).toBe(':root:where(:has(.sz-lesson-ui))[data-sz-palette="pink"]')
})

test('nested selectors, keyframes, layers and motion preferences retain their semantics', () => {
  const css = gateStylesheet(
    '@layer components { .card { color: red; &:hover { color: blue } } } @keyframes pop { from { opacity: 0 } to { opacity: 1 } } @media (prefers-reduced-motion: reduce) { .card { animation: none } }',
    true,
  )
  expect(css).toContain('@layer components')
  expect(css).toContain('&:hover')
  expect(css).toContain('@keyframes pop { from { opacity: 0 } to { opacity: 1 } }')
  expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  expect(css.match(/:where\(body:has\(\.sz-lesson-ui\)\) \.card/g)).toHaveLength(2)
})

test('the creator skin cannot replace application font utilities or source scanning', () => {
  const css = gateStylesheet(
    '@source "./elsewhere"; @custom-variant dark (&:is(.dark *)); @theme inline { --font-sans: wrong; --color-primary: var(--primary) } .card { color: var(--primary) }',
    true,
  )
  expect(css).not.toContain('@source')
  expect(css).not.toContain('@custom-variant')
  expect(css).not.toContain('--font-sans')
  expect(css).toContain('--color-primary: var(--primary)')
  expect(createLessonStyles('.site {}', '.lesson {}')).toBe(
    createLessonStyles('.site {}', '.lesson {}'),
  )
})

test('the adult build is exactly the generated shared theme and Kids imports its canonical source', () => {
  const root = resolve(import.meta.dir, '../../..')
  const base = readFileSync(resolve(root, 'packages/community/src/app/globals.css'), 'utf8')
  const canonical = readFileSync(resolve(root, 'packages/ui/src/styles/creator-theme.css'), 'utf8')
  expect(
    readFileSync(
      resolve(root, 'packages/community/src/app/globals.generated.css'),
      'utf8',
    ).replaceAll('\r\n', '\n'),
  ).toBe(createLessonStyles(base, canonical))
  expect(
    readFileSync(resolve(root, 'packages/community-kids/src/app/globals.css'), 'utf8'),
  ).toContain('@import "@sistemazero/ui/styles/creator-theme.css"')
})

test('different animations cannot silently replace an animation outside the lesson', () => {
  expect(() =>
    createLessonStyles('@keyframes appear {to{opacity:1}}', '@keyframes appear {to{opacity:0}}'),
  ).toThrow('Animações de aula divergentes: appear')
  expect(() =>
    createLessonStyles(
      '@keyframes appear {to{opacity:1}}',
      '@keyframes appear { to { opacity: 1 } }',
    ),
  ).not.toThrow()
})
