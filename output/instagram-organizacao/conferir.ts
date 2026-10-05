import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { lintLightCopy } from '../../packages/marketing/src/domain/copy/light-copy'

const base = path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const files = execFileSync('rg', ['--files', base, '-g', '*.md'], { encoding: 'utf8' })
  .trim()
  .split(/\r?\n/)
const extras = [
  'docs/marketing/README.md',
  'docs/marketing/kids/comunidade-dos-criadores/posicionamento.md',
  'docs/marketing/kids/comunidade-dos-criadores/pesquisa-kodland-2026-10-04.md',
  'docs/marketing/kids/comunidade-dos-criadores/pesquisa-mercado-2026-10-04.md',
  'docs/marketing/kids/comunidade-dos-criadores/auditoria-plataforma-2026-10-04.md',
  'docs/superpowers/plans/2026-10-03-home-comunidade.md',
  'docs/superpowers/plans/2026-10-03-posicionamento-entrada-funil.md',
]
let checked = 0
const broken = []
const slug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-')
for (const file of [...files, ...extras]) {
  const content = fs.readFileSync(file, 'utf8')
  for (const match of content.matchAll(/!?\[[^\]\n]*\]\(([^\n)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '')
    if (/^(?:[a-z]+:|\/)/i.test(target)) continue
    const [rel, anchor] = target.split('#')
    const resolved = rel ? path.resolve(path.dirname(file), rel) : file
    checked++
    if (!fs.existsSync(resolved)) {
      broken.push({ file: path.relative(base, file), target, reason: 'missing path' })
      continue
    }
    if (anchor && resolved.endsWith('.md')) {
      const targetContent = fs.readFileSync(resolved, 'utf8')
      const headings = [...targetContent.matchAll(/^#{1,6} (.+)$/gm)].map((m) => slug(m[1]))
      headings.push(
        ...[...targetContent.matchAll(/(?:id|name)=["']([^"']+)["']/g)].map((m) => m[1]),
      )
      if (!headings.includes(decodeURIComponent(anchor)))
        broken.push({ file: path.relative(base, file), target, reason: 'missing anchor' })
    }
  }
}
const highlights = fs.readFileSync(path.join(base, '01-destaques.md'), 'utf8')
const pins = fs.readFileSync(path.join(base, '02-fixados.md'), 'utf8')
const calendar = fs.readFileSync(path.join(base, '03-postagens.md'), 'utf8')
const faq = highlights.slice(highlights.indexOf('## Dúvidas'), highlights.indexOf('## Avaliações'))
const counts = {
  rootGuides: fs.readdirSync(base).filter((f) => f.endsWith('.md')).length,
  highlights: [
    ...highlights.matchAll(/^## (Como funciona|Projetos|Alunos|Dúvidas|Avaliações|Sobre nós)$/gm),
  ].length,
  faqAnswers: [...faq.matchAll(/^\| [^|]+\? \|/gm)].length,
  pinnedScripts: [...pins.matchAll(/^## F0[1-3] ·/gm)].length,
  feedSlots: [...calendar.matchAll(/^\| (Seg|Qua|Sex) [^|]+ \| F\d{2} /gm)].length,
  storySlots: [...calendar.matchAll(/^\| \d{2}\/10 \| S\d{2} /gm)].length,
}
const issues = [],
  exceptions = []
let copyCount = 0
for (const name of ['01-destaques.md', '02-fixados.md', '03-postagens.md']) {
  const s = fs.readFileSync(path.join(base, name), 'utf8')
  const snippets = [...s.matchAll(/“([^”]+)”/g)].map((m) => m[1])
  for (const block of s.matchAll(/(?:^>[^\n]*(?:\n|$))+/gm))
    snippets.push(block[0].replace(/^> ?/gm, '').trim())
  for (const snippet of snippets) {
    copyCount++
    for (const issue of lintLightCopy(snippet)) {
      if (
        issue.rule === 3 &&
        (snippet === 'Cadê Todo Mundo?' || /^(Responsáveis:|primeira|melhor horário)/.test(snippet))
      )
        exceptions.push({ name, snippet, rule: 3 })
      else issues.push({ name, snippet, rule: issue.rule })
    }
  }
}
console.log(
  JSON.stringify(
    { checkedLocalLinks: checked, broken, counts, copyCount, issues, exceptions },
    null,
    2,
  ),
)
if (
  broken.length ||
  issues.length ||
  JSON.stringify(Object.values(counts)) !== JSON.stringify([4, 6, 18, 3, 12, 12])
)
  process.exitCode = 1
