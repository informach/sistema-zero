import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const work = path.resolve('output/instagram/alunos/2026-10-09')
const manifest = JSON.parse(fs.readFileSync(path.join(work, 'manifesto.json'), 'utf8'))
const layout = JSON.parse(fs.readFileSync(path.join(work, 'verificacao-layout.json'), 'utf8'))
const target = manifest.finalDirectory
const expected = manifest.stories.map((s) => [
  path.join(work, 'finais-ampliados', s.file),
  path.join(target, s.file),
])
for (const s of manifest.stories.filter((s) => s.overlayFile))
  expected.push([
    path.join(work, 'molduras-ampliadas', s.overlayFile),
    path.join(target, 'molduras', s.overlayFile),
  ])
expected.push([path.join(work, 'publicacao.txt'), path.join(target, 'publicacao.txt')])
const hash = (b) => createHash('sha256').update(b).digest('hex')
const files = expected.map(([source, destination]) => {
  const a = fs.readFileSync(source),
    b = fs.readFileSync(destination)
  const size = destination.endsWith('.png')
    ? { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }
    : null
  return {
    file: path.relative(target, destination),
    matches: hash(a) === hash(b),
    size,
    sha256: hash(b),
  }
})
const finalPngs = fs.readdirSync(target).filter((f) => f.endsWith('.png'))
const overlays = fs.readdirSync(path.join(target, 'molduras')).filter((f) => f.endsWith('.png'))
const report = {
  passed:
    layout.passed &&
    files.every(
      (f) => f.matches && (!f.size || (f.size.width === 1080 && f.size.height === 1920)),
    ) &&
    finalPngs.length === 7 &&
    overlays.length === 5 &&
    finalPngs.some((f) => f.includes('jeffrey')) &&
    finalPngs.some((f) => f.includes('fernando')),
  completeStories: finalPngs.length,
  transparentOverlays: overlays.length,
  files,
}
fs.writeFileSync(path.join(work, 'verificacao-entrega.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
if (!report.passed) process.exitCode = 1
