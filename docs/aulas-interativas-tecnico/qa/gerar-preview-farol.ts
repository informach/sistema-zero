/** Preview real e autocontido para revisão e captura das artes do Desafio. */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assetManifest, assetMetaManifest } from '../../../packages/studio/src/core/project'
import { gameTwoDRuntime } from '../../../packages/studio/src/official-extensions/game-2d/runtime'
import { buildPreviewDoc } from '../../../packages/studio/src/preview/bootstrap'
import { montarProjetoFarol } from './desafio-farol-projeto'

const project = montarProjetoFarol('concluido')
const html = buildPreviewDoc({
  html: project.files['index.html'] ?? '',
  css: project.files['style.css'] ?? '',
  js: project.files['script.js'] ?? '',
  extensionScripts: [gameTwoDRuntime],
  assets: assetManifest(project.assets),
  assetsMeta: assetMetaManifest(project.assets),
})
const output = resolve(import.meta.dir, '../../../tmp/farol-artes')
mkdirSync(output, { recursive: true })
writeFileSync(resolve(output, 'jogo.html'), html)
console.log(`Preview do Farol: ${output}/jogo.html`)
