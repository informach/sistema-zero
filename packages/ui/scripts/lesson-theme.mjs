import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'

const marker = '.sz-lesson-ui'
const normalize = (value) => value.replaceAll('\r\n', '\n')

/** Zero-specificity gates preserve the original cascade in each mutually exclusive skin. */
export function gateStylesheet(source, creator = false) {
  const root = postcss.parse(normalize(source))
  if (creator) {
    root.walkAtRules((rule) => {
      if (['source', 'custom-variant'].includes(rule.name)) rule.remove()
      if (rule.name === 'theme') {
        rule.walkDecls((declaration) => {
          if (!declaration.prop.startsWith('--color-')) declaration.remove()
        })
        if (!rule.nodes?.length) rule.remove()
      }
    })
  }
  const condition = creator ? `:has(${marker})` : `:not(:has(${marker}))`
  root.walkRules((rule) => {
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === 'rule' || (parent.type === 'atrule' && /keyframes$/i.test(parent.name)))
        return
    }
    rule.selector = postcss.list
      .comma(rule.selector)
      .map((selector) => {
        const documentRoot = selector.match(/^(:root|html|body)(?=$|[^a-zA-Z0-9_-])/)
        if (documentRoot)
          return selector.replace(documentRoot[0], `${documentRoot[0]}:where(${condition})`)
        return `:where(body${condition}) ${selector}`
      })
      .join(',\n')
  })
  return root.toString()
}

export function createLessonStyles(community, creator) {
  const inputs = [community, creator].map(normalize)
  // Keyframes are global even inside a gated skin. A divergent collision must fail the build.
  const animations = inputs.map((source) => {
    const names = new Map()
    postcss.parse(source).walkAtRules((rule) => {
      if (/keyframes$/i.test(rule.name))
        names.set(
          rule.params,
          rule.nodes.map((node) => node.toString().replace(/\s+/g, '')).join(''),
        )
    })
    return names
  })
  for (const [name, frames] of animations[0]) {
    if (animations[1].has(name) && animations[1].get(name) !== frames)
      throw Error(`Animações de aula divergentes: ${name}`)
  }
  const digest = createHash('sha256').update(inputs.join('\0')).digest('hex')
  return `/* Gerado por packages/ui/scripts/lesson-theme.mjs. Não editar.\n * Fontes SHA-256: ${digest}\n */\n${gateStylesheet(inputs[0]).trimEnd()}\n${gateStylesheet(inputs[1], true).trimEnd()}\n`
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, output, mode] = process.argv.slice(2)
  if (!input || !output || (mode && mode !== '--check'))
    throw Error('Uso: lesson-theme.mjs <tema comunidade> <saída> [--check]')
  const canonical = fileURLToPath(new URL('../src/styles/creator-theme.css', import.meta.url))
  const result = createLessonStyles(readFileSync(input, 'utf8'), readFileSync(canonical, 'utf8'))
  if (mode === '--check') {
    if (normalize(readFileSync(output, 'utf8')) !== result)
      throw Error('Tema de aula desatualizado. Execute bun run lesson-theme:gen na raiz.')
  } else writeFileSync(output, result)
  console.log(
    JSON.stringify({
      checked: mode === '--check',
      bytes: Buffer.byteLength(result),
      sharedTheme: true,
    }),
  )
}
