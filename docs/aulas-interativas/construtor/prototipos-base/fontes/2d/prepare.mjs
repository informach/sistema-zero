import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { artCatalog, presets } from './assets.mjs'
import { sourceProjects } from './game.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const initialOnly = process.argv.includes('--initial-only')
for (const project of sourceProjects().filter((p) => !initialOnly || p.initial)) {
  writeFileSync(
    join(here, project.filename.replace('.szproject.json', '.source.json')),
    JSON.stringify(project, null, 2) + '\n',
  )
}
if (initialOnly) {
  console.log(
    'Prepared the initial native-IR source only; complete projects and artwork unchanged.',
  )
  process.exit(0)
}
mkdirSync(join(here, 'artes'), { recursive: true })
for (const asset of artCatalog)
  writeFileSync(join(here, 'artes', `${asset.name}.${asset.ext}`), asset.art)

const names = { cenario: 'CENÁRIOS', nave: 'NAVES', asteroide: 'ASTEROIDES', laser: 'LASERS' }
let gallery = `<svg xmlns="http://www.w3.org/2000/svg" width="1420" height="940" viewBox="0 0 1420 940"><rect width="1420" height="940" fill="#07152b"/><style>text{font-family:Arial,sans-serif} .title{font-size:28px;font-weight:bold;fill:#eef8ff} .sub{font-size:16px;fill:#9bb8d7} .name{font-size:16px;fill:#d0e5f7} .tag{font-size:14px;font-weight:bold;fill:#7bdcd8;letter-spacing:2px}</style><text x="42" y="47" class="title">Nave Contra Asteroides · escolhas de aparência</text><text x="42" y="78" class="sub">As mesmas regras, dimensões e colisões em todas as opções.</text>`
const rows = ['cenario', 'nave', 'asteroide', 'laser']
for (let r = 0; r < rows.length; r++) {
  const cat = rows[r]
  const y = 110 + r * 202
  gallery += `<text x="42" y="${y + 13}" class="tag">${names[cat]}</text>`
  for (let col = 0; col < 4; col++) {
    const asset = artCatalog.filter((a) => a.category === cat)[col]
    const x = 42 + col * 346
    gallery += `<rect x="${x}" y="${y + 26}" width="324" height="162" rx="14" fill="#102440" stroke="#244362"/>`
    const w = cat === 'cenario' ? 224 : cat === 'nave' ? 76 : cat === 'laser' ? 20 : 82
    const h = (w * asset.height) / asset.width
    const imgX = x + 162 - w / 2
    const imgY = y + 34 + (122 - h) / 2
    gallery += `<image href="${asset.dataUrl}" x="${imgX}" y="${imgY}" width="${w}" height="${h}"/><text x="${x + 162}" y="${y + 177}" text-anchor="middle" class="name">${asset.name}</text>`
  }
}
gallery += `<text x="42" y="${110 + 4 * 202 + 5}" class="sub">Presets para jogar: ${presets.map((p) => p.label).join(' · ')}. As 16 artes acompanham cada projeto.</text></svg>`
writeFileSync(join(here, 'catalogo-aparencias-2d.svg'), gallery)
console.log(`Prepared native-IR sources and ${artCatalog.length} embedded images.`)
