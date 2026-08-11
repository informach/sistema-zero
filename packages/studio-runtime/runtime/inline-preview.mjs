import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse, parseFragment, serialize } from 'parse5'

const root = process.cwd()
const dist = path.join(root, 'dist')
const indexPath = path.join(dist, 'index.html')

let html = await readFile(indexPath, 'utf8')

const safeAssetPath = (raw) => {
  const pathname = raw.split(/[?#]/, 1)[0].replace(/^\.?\//, '')
  const resolved = path.resolve(dist, pathname)
  if (resolved === dist || !resolved.startsWith(`${dist}${path.sep}`)) {
    throw new Error(`Asset fora da pasta de build: ${raw}`)
  }
  return resolved
}

const scriptPattern = /<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)><\/script>/gi
html = await replaceAsync(html, scriptPattern, async (_match, before, src, after) => {
  if (/^(?:https?:|data:|blob:|\/\/)/i.test(src)) return ''
  const source = await readFile(safeAssetPath(src), 'utf8')
  return `<script${before}${after}>${source.replace(/<\/script/gi, '<\\/script')}</script>`
})

const stylePattern = /<link\b([^>]*?)\bhref=["']([^"']+)["']([^>]*?)>/gi
html = await replaceAsync(html, stylePattern, async (match, before, href, after) => {
  if (!/\brel=["']stylesheet["']/i.test(`${before} ${after}`)) return match
  if (/^(?:https?:|data:|blob:|\/\/)/i.test(href)) return ''
  const source = await readFile(safeAssetPath(href), 'utf8')
  return `<style>${source.replace(/<\/style/gi, '<\\/style')}</style>`
})

const csp = [
  "default-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'none'",
  "script-src 'unsafe-inline' blob:",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  'media-src data: blob:',
  "connect-src 'none'",
  'worker-src blob:',
].join('; ')
const security = `<meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="referrer" content="no-referrer">`
const document = parse(html)
const head = findElement(document, 'head')
if (!head) throw new Error('Parser HTML não produziu um elemento head')

const securityFragment = parseFragment(head, security)
const securityNodes = [...securityFragment.childNodes]
for (const node of securityNodes) node.parentNode = head
head.childNodes.unshift(...securityNodes)
html = serialize(document)

await writeFile(path.join(root, 'preview.html'), html, 'utf8')

async function replaceAsync(input, pattern, replacer) {
  const matches = [...input.matchAll(pattern)]
  if (matches.length === 0) return input
  const replacements = await Promise.all(matches.map((match) => replacer(...match)))
  let output = ''
  let cursor = 0
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]
    output += input.slice(cursor, match.index) + replacements[index]
    cursor = match.index + match[0].length
  }
  return output + input.slice(cursor)
}

function findElement(node, tagName) {
  if (node.tagName === tagName) return node
  for (const child of node.childNodes ?? []) {
    const found = findElement(child, tagName)
    if (found) return found
  }
  return null
}
