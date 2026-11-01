import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
/** Expand authored local imports for source-contract tests. Tailwind generation is tested in the browser. */
export function readStylesheet(filename, visited = new Set()) {
  const absolute = filename instanceof URL ? fileURLToPath(filename) : resolve(filename)
  if (visited.has(absolute)) return ''
  visited.add(absolute)
  const source = readFileSync(absolute, 'utf8')
  const root = postcss.parse(source)
  const require = createRequire(absolute)
  root.walkAtRules('import', (rule) => {
    const name = rule.params.match(/^["']([^"']+)["']/)?.[1]
    if (!name || name === 'tailwindcss' || /^(https?:|url\()/i.test(name)) return
    const file = name.startsWith('.') ? resolve(dirname(absolute), name) : require.resolve(name)
    rule.replaceWith(postcss.parse(readStylesheet(file, visited)).nodes)
  })
  return root.toString()
}
