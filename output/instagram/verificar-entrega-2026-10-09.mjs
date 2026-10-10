import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const work = path.resolve('output/instagram')
const production = path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao')
const norm = (s) =>
  s
    .normalize('NFKC')
    .toLocaleLowerCase('pt-BR')
    .replace(/<br>/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const digest = (b) => createHash('sha256').update(b).digest('hex')
const files = [],
  content = [],
  counts = []
const record = (src, dst, width, height) => {
  const a = fs.readFileSync(src),
    b = fs.readFileSync(dst)
  const size = width ? { width: b.readUInt32BE(16), height: b.readUInt32BE(20) } : null
  const passed =
    digest(a) === digest(b) &&
    (!size ||
      (b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' &&
        size.width === width &&
        size.height === height))
  files.push({ file: path.relative(production, dst), passed, size, sha256: digest(b) })
}
const countPng = (folder, expected) => {
  const actual = fs.readdirSync(folder).filter((f) => f.endsWith('.png')).length
  counts.push({
    folder: path.relative(production, folder),
    expected,
    actual,
    passed: actual === expected,
  })
}
const guide = norm(
  fs.readFileSync('docs/marketing/kids/comunidade-dos-criadores/instagram/01-destaques.md', 'utf8'),
)
const layouts = []
for (const type of ['avaliacoes', 'alunos']) {
  const source = path.join(work, type, '2026-10-09'),
    target = path.join(production, 'destaques', type),
    manifest = read(path.join(source, 'manifesto.json'))
  layouts.push({ type, passed: read(path.join(source, 'verificacao-layout.json')).passed })
  countPng(target, type === 'avaliacoes' ? 12 : 7)
  for (const s of manifest.stories) {
    record(
      path.join(source, type === 'avaliacoes' ? 'finais-beneficios' : 'finais-ampliados', s.file),
      path.join(target, s.file),
      1080,
      1920,
    )
    if (s.overlayFile)
      record(
        path.join(source, 'molduras-ampliadas', s.overlayFile),
        path.join(target, 'molduras', s.overlayFile),
        1080,
        1920,
      )
    const copy = s.quote ?? s.copy ?? s.paragraphs.join(' ')
    content.push({ id: s.id, kind: 'copy-no-guia', passed: guide.includes(norm(copy)) })
    if (s.sourceFile) {
      const asr = read(
        path.join(source, 'fontes', s.sourceTranscript ?? s.photo + '-trecho-conferido.json'),
      )
      const words = norm(asr.map((segment) => segment.text).join(' '))
      if (s.quoteParts) {
        const parts = s.quoteParts.map((p) => ({
          text: p.text,
          start: p.start,
          end: p.end,
          passed:
            norm(
              asr
                .flatMap((segment) => segment.words)
                .filter((w) => w.start >= p.start - 0.03 && w.end <= p.end + 0.03)
                .map((w) => w.text.trim())
                .join(' '),
            ) === norm(p.text),
        }))
        content.push({
          id: s.id,
          kind: 'recortes-conferidos-com-palavras-e-segundos',
          passed:
            parts.every((p) => p.passed) &&
            s.quoteParts.every((p, i) => i === 0 || p.start >= s.quoteParts[i - 1].end) &&
            norm(s.quoteParts.map((p) => p.text).join(' ')) === norm(s.quote),
          parts,
        })
      } else {
        content.push({
          id: s.id,
          kind: 'citacao-no-trecho-transcrito',
          passed: words.includes(norm(s.quote)),
          sourceStart: s.sourceStart,
          sourceEnd: s.sourceEnd,
        })
      }
    }
  }
  record(path.join(source, 'publicacao.txt'), path.join(target, 'publicacao.txt'))
  if (type === 'alunos') countPng(path.join(target, 'molduras'), 5)
  else
    record(path.join(source, 'fontes-dos-relatos.txt'), path.join(target, 'fontes-dos-relatos.txt'))
}
const fxSource = path.join(work, 'fixados/2026-10-09'),
  fx = read(path.join(fxSource, 'manifesto.json'))
const fxGuide = norm(fs.readFileSync(fx.source, 'utf8'))
layouts.push({
  type: 'fixados',
  passed: read(path.join(fxSource, 'verificacao-layout.json')).passed,
})
for (const c of fx.carousels) {
  const target = path.join(production, 'fixados', c.slug)
  countPng(target, { F01: 8, F02: 7, F03: 9 }[c.id])
  c.slides.forEach((s, i) => {
    record(path.join(fxSource, 'finais', c.slug, s.file), path.join(target, s.file), 1080, 1350)
    const texts = [
      s.title,
      ...s.body,
      s.role,
      ...(s.labels ?? []),
      s.feature,
      s.featureLabel,
      s.cta,
    ].filter(Boolean)
    content.push({
      id: c.id + '-' + (i + 1),
      kind: 'copy-no-guia',
      passed: texts.every((t) => fxGuide.includes(norm(t))),
    })
  })
  const caption = fs.readFileSync(path.join(target, 'legenda.txt'), 'utf8')
  content.push({
    id: c.id,
    kind: 'legenda-completa',
    passed:
      norm(caption) === norm(c.caption.join(' ')) &&
      c.caption.every((p) => fxGuide.includes(norm(p))) &&
      caption.length <= 2200,
    length: caption.length,
  })
  const alt = fs.readFileSync(path.join(target, 'texto-alternativo.txt'), 'utf8')
  content.push({
    id: c.id,
    kind: 'texto-alternativo-completo',
    passed: c.slides.every((s) => alt.includes(s.file)),
  })
  content.push({
    id: c.id,
    kind: 'instrucoes',
    passed: fs.readFileSync(path.join(target, 'publicacao.txt'), 'utf8').includes('1080 × 1350'),
  })
}
const report = {
  passed: [...files, ...content, ...counts, ...layouts].every((r) => r.passed),
  pngs: files.filter((f) => f.size).length,
  content,
  counts,
  layouts,
  files,
}
fs.writeFileSync(
  path.join(work, 'verificacao-entrega-2026-10-09.json'),
  JSON.stringify(report, null, 2),
)
console.log(
  JSON.stringify(
    {
      passed: report.passed,
      pngs: report.pngs,
      counts,
      failures: [...files, ...content, ...layouts].filter((r) => !r.passed),
    },
    null,
    2,
  ),
)
if (!report.passed) process.exitCode = 1
