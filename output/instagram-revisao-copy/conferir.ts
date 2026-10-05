import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { lintLightCopy } from '../../packages/marketing/src/domain/copy/light-copy'

const base = path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const names = ['01-destaques.md', '02-fixados.md', '03-postagens.md']
const contents = names.map((n) =>
  fs
    .readFileSync(path.join(base, n), 'utf8')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n'),
)
const copy = []
for (let i = 0; i < names.length; i++) {
  const text = contents[i]
  for (const match of text.matchAll(/(?:^>[^\n]*(?:\n|$))+/gm)) {
    const clean = match[0].replace(/^> ?/gm, '').trim()
    copy.push({ file: names[i], line: text.slice(0, match.index).split('\n').length, text: clean })
  }
  for (const match of text.matchAll(/^\*\*(?:Slide \d+\. Título|Título|Capa):\*\* (.+)$/gm)) {
    copy.push({
      file: names[i],
      line: text.slice(0, match.index).split('\n').length,
      text: match[1],
    })
  }
}
const issues = []
const exceptions = []
for (const item of copy) {
  const found = lintLightCopy(item.text)
  for (const issue of found) {
    if (
      issue.rule === 3 &&
      item.text.includes('“Preciso de ajuda?”') &&
      !lintLightCopy(item.text.replaceAll('“Preciso de ajuda?”', '“Preciso de ajuda”')).some(
        (x) => x.rule === 3,
      )
    ) {
      exceptions.push({
        file: item.file,
        line: item.line,
        reason: 'Interrogação no rótulo real do botão de ajuda; a frase de abertura é afirmativa.',
      })
    } else issues.push({ ...item, rule: issue.rule })
  }
}
const files = execFileSync('rg', ['--files', base, '-g', '*.md'], { encoding: 'utf8' })
  .trim()
  .split(/\r?\n/)
const slug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-')
const broken = []
let localLinks = 0
for (const f of files) {
  const data = fs.readFileSync(f, 'utf8')
  for (const m of data.matchAll(/!?\[[^\]\n]*\]\(([^\n)]+)\)/g)) {
    const target = m[1].replace(/^<|>$/g, '')
    if (/^(?:[a-z]+:|\/)/i.test(target)) continue
    const [relative, anchor] = target.split('#')
    const absolute = relative ? path.resolve(path.dirname(f), relative) : f
    localLinks++
    if (!fs.existsSync(absolute)) {
      broken.push({ file: path.relative(base, f), target, why: 'missing file' })
      continue
    }
    if (anchor && absolute.endsWith('.md')) {
      const to = fs.readFileSync(absolute, 'utf8').replace(/^\uFEFF/, '')
      const anchors = [...to.matchAll(/^#{1,6} (.+)$/gm)].map((v) => slug(v[1]))
      anchors.push(...[...to.matchAll(/(?:id|name)=["']([^"']+)["']/g)].map((v) => v[1]))
      if (!anchors.includes(decodeURIComponent(anchor)))
        broken.push({ file: path.relative(base, f), target, why: 'missing anchor' })
    }
  }
}
const [highlights, pins, calendar] = contents
const coverage = {
  highlights: [
    ...highlights.matchAll(/^## (Como funciona|Projetos|Alunos|Dúvidas|Avaliações|Sobre nós)$/gm),
  ].map((m) => m[1]),
  faq: [...highlights.matchAll(/^#### (\d+)\. /gm)].map((m) => Number(m[1])),
  pins: [...pins.matchAll(/^## (F\d{2}) ·/gm)].map((m) => m[1]),
  posts: [...calendar.matchAll(/^### (F\d{2}) ·/gm)].map((m) => m[1]),
  stories: [...calendar.matchAll(/^\| \d{2}\/10 \| (S\d{2}) ·/gm)].map((m) => m[1]),
  extraStoryScripts: [...calendar.matchAll(/^### (S\d{2}) ·/gm)].map((m) => m[1]),
}
const reelLengths = []
for (const [source, pattern] of [
  [pins, /^## (F\d{2}) ·[^\n]+\n([\s\S]*?)(?=^## F\d|^## Montagem|$(?![\s\S]))/gm],
  [calendar, /^### (F\d{2}) ·[^\n]+\n([\s\S]*?)(?=^### F\d|^## 3\.|$(?![\s\S]))/gm],
] as const) {
  for (const m of source.matchAll(pattern)) {
    if (!m[2].includes('**Reel')) continue
    const script = m[2].match(
      /(?:\*\*Fala:\*\*|### Fala completa)\s*\n((?:>[^\n]*(?:\n|$)|\n)+)/,
    )?.[1]
    if (script) {
      const words = script.replace(/^> ?/gm, '').trim().split(/\s+/).length
      reelLengths.push({ id: m[1], words, spokenSecondsAt140wpm: Math.ceil((words / 140) * 60) })
    }
  }
}
const report = {
  coverage,
  copyBlocks: copy.length,
  issues,
  exceptions,
  localLinks,
  broken,
  reelLengths,
}
fs.writeFileSync('output/instagram-revisao-copy/verificacao.json', JSON.stringify(report, null, 2))
fs.writeFileSync(
  'output/instagram-revisao-copy/copy-para-leitura.txt',
  copy.map((x) => `${x.file}:${x.line}\n${x.text}`).join('\n\n---\n\n'),
)
console.log(JSON.stringify(report, null, 2))
if (
  issues.length ||
  broken.length ||
  coverage.highlights.length !== 6 ||
  coverage.faq.join(',') !== Array.from({ length: 18 }, (_, i) => i + 1).join(',') ||
  coverage.pins.length !== 3 ||
  coverage.posts.length !== 9 ||
  coverage.stories.length !== 12
)
  process.exitCode = 1
