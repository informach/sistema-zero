import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { montarProjetoFarol } from '../../../../docs/aulas-interativas/qa/desafio-farol-projeto'
import { openScene, stepScene } from '../../../../packages/core/src/learning/scene'
import { createElement } from '../../../../packages/member-shell/node_modules/react'
import { renderToStaticMarkup } from '../../../../packages/member-shell/node_modules/react-dom/server'
import { LighthouseKeyStage } from '../../../../packages/member-shell/src/components/scene-lighthouse-key'
import { buildWorkspaceStateFromIR } from '../../../../packages/studio/src/blockly/workspaceState'
import { assetManifest, assetMetaManifest } from '../../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../../packages/studio/src/generators/project'
import { gameTwoDRuntime } from '../../../../packages/studio/src/official-extensions/game-2d/runtime'
import { buildPreviewDoc } from '../../../../packages/studio/src/preview/bootstrap'

const work = resolve(import.meta.dir)
mkdirSync(resolve(work, 'capturas'), { recursive: true })
mkdirSync(resolve(work, 'finais'), { recursive: true })
const project = montarProjetoFarol('concluido')
project.id = 'instagram-como-funciona-farol'
function preview(p: typeof project) {
  return buildPreviewDoc({
    html: p.files['index.html'] ?? '',
    css: p.files['style.css'] ?? '',
    js: p.files['script.js'] ?? '',
    extensionScripts: [gameTwoDRuntime],
    assets: assetManifest(p.assets),
    assetsMeta: assetMetaManifest(p.assets),
  })
}
writeFileSync(resolve(work, 'jogo.html'), preview(project))
writeFileSync(resolve(work, 'projeto.json'), JSON.stringify(project))
const custom = structuredClone(project)
const choices = {
  'praia-tropical': 'noite-na-ilha',
  aventureiro: 'robo',
  'farol-listrado-apagado': 'farol-colorido-apagado',
  'farol-listrado-aceso': 'farol-colorido-aceso',
}
custom.ir = JSON.parse(JSON.stringify(custom.ir), (key, value) =>
  typeof value === 'string' && choices[value] ? choices[value] : value,
)
custom.files = generateProjectFiles({ ir: custom.ir, projectName: custom.name })
custom.blocksState = buildWorkspaceStateFromIR(custom.ir)
writeFileSync(resolve(work, 'personalizado.html'), preview(custom))
const config = { scene: 'lighthouse-key' } as const
const initial = openScene(config)
const without = stepScene(config, initial, { type: 'try-lighthouse-door' })
const carrying = stepScene(config, initial, { type: 'key-state', hasKey: true })
const withKey = stepScene(config, carrying, { type: 'try-lighthouse-door' })
const markup = [without, withKey]
  .map(
    (state, i) =>
      `<article id="estado-${i}">${renderToStaticMarkup(createElement(LighthouseKeyStage, { state }))}</article>`,
  )
  .join('')
writeFileSync(
  resolve(work, 'experiencia.html'),
  `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>body{margin:0;background:#fff;font-family:Arial,sans-serif}article{width:960px}svg{display:block;width:100%;height:auto}svg text{font-family:Arial,sans-serif}</style>${markup}</html>`,
)
console.log(JSON.stringify({ work, project: project.id, previews: 3 }))
