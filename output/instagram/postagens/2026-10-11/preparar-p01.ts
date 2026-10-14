import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { generateProjectFiles } from '../../../../packages/studio/src/generators/project'
import { assetManifest, assetMetaManifest } from '../../../../packages/studio/src/core/project'
import { gameTwoDRuntime } from '../../../../packages/studio/src/official-extensions/game-2d/runtime'
import { buildPreviewDoc } from '../../../../packages/studio/src/preview/bootstrap'

const work = resolve(import.meta.dir)
mkdirSync(resolve(work, 'capturas'), { recursive: true })
const original = JSON.parse(readFileSync(resolve('output/instagram/como-funciona/2026-10-09/projeto.json'), 'utf8'))
for (const [name, x, y] of [['a', 115, 160], ['b', 211, 53]] as const) {
  const project = structuredClone(original)
  let changed = 0
  function visit(value: any) {
    if (!value || typeof value !== 'object') return
    if (value.type === 'g2d:createImageSprite' && value.varName === 'chave') {
      value.x = x; value.y = y; changed++
    }
    Object.values(value).forEach(visit)
  }
  visit(project.ir)
  if (changed !== 1) throw Error('Chave não encontrada uma única vez')
  project.files = generateProjectFiles({ir: project.ir, projectName: project.name})
  // Expose capture-only telemetry in the local exported demonstration, not in product source.
  const js = project.files['script.js'].replace('let temChave = false;', 'let temChave = false; window.__capture = { personagem, chave, farol, get hasKey() { return temChave }, get won() { return ganhou } };')
  const html = buildPreviewDoc({ html: project.files['index.html'], css: project.files['style.css'], js,
    extensionScripts: [gameTwoDRuntime], assets: assetManifest(project.assets), assetsMeta: assetMetaManifest(project.assets) })
  writeFileSync(resolve(work, `jogo-${name}.html`), html)
  writeFileSync(resolve(work, `projeto-${name}.json`), JSON.stringify(project, null, 2))
}
console.log('Duas versões exportadas. Só a posição da chave muda no IR.')
