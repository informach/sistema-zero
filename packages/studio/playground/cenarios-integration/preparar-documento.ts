import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { Project } from '../../src/core/project'
import { createEmptyProject } from '../../src/core/project'
import { buildClassicFileMap } from '../../src/export/fileMap'
import { identityMinifiers } from '../../src/export/minify'
import { renderProjectToPreviewDocAsync } from '../../src/preview/renderProject'

GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })
// Private, actual project produced by the gallery UI. No licensed bytes are versioned.
const raiz = resolve(import.meta.dirname, '../../../..'),
  pasta = resolve(raiz, 'output/cenarios-reforma/lote8-studio-motores/documento'),
  projeto = JSON.parse(
    await readFile(
      resolve(
        raiz,
        'output/cenarios-reforma/lote8-studio-galeria/js-classic-1440-900-light.project.json',
      ),
      'utf8',
    ),
  ) as Project,
  nativo = JSON.parse(
    await readFile(resolve(raiz, 'output/cenarios-reforma/lote8-raylib/mapa-native.json'), 'utf8'),
  ),
  id = projeto.assets!.find((a) => a.kind === 'scene3d')!.id,
  programa = await readFile(resolve(import.meta.dirname, 'programa-documento.js'), 'utf8'),
  fonte = programa.replace(
    '__ENTRADA_DE_ENSAIO__',
    JSON.stringify({
      id,
      pontos: nativo.alturas.map(({ x, z }: { x: number; z: number }) => ({ x, z })),
    }),
  ),
  base = createEmptyProject('prova-do-documento', 'Prova do documento'),
  execucao: Project = {
    ...base,
    assets: projeto.assets,
    files: {
      'index.html': '<!doctype html><html><head></head><body></body></html>',
      'style.css': 'body{margin:0}',
      'script.js': fonte,
    },
  }
await mkdir(pasta, { recursive: true })
const doc = await renderProjectToPreviewDocAsync(execucao, {
  securityProfile: 'strict',
  loopBudgetMs: 1000,
})
await writeFile(resolve(pasta, 'preview.html'), doc)
const exportado = await buildClassicFileMap(execucao, identityMinifiers)
for (const [path, bytes] of Object.entries(exportado.files)) {
  const dest = resolve(pasta, 'export', path)
  await mkdir(resolve(dest, '..'), { recursive: true })
  await writeFile(dest, bytes)
}
// Serve exact installed vendor implementations at the already authorized pinned URLs.
// This controls CDN availability only; importmap, sandbox, hashes and CSP stay untouched.
const entradas = {
  three: 'export * from "three";',
  GLTFLoader: 'export { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";',
  SkeletonUtils: 'export * from "three/addons/utils/SkeletonUtils.js";',
}
for (const [nome, texto] of Object.entries(entradas)) {
  const entry = resolve(pasta, `${nome}.entry.js`)
  await writeFile(entry, texto)
  const result = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    format: 'esm',
    minify: true,
    external: nome === 'three' ? [] : ['three'],
    plugins: [
      {
        name: 'installed-vendor',
        setup(build) {
          build.onResolve({ filter: /^three(?:\/.*)?$/ }, ({ path }) =>
            nome !== 'three' && path === 'three'
              ? { path, external: true }
              : { path: Bun.resolveSync(path, resolve(raiz, 'packages/studio')) },
          )
        },
      },
    ],
  })
  if (!result.success || result.outputs.length !== 1)
    throw new AggregateError(result.logs, `Falha no vendor ${nome}`)
  await writeFile(resolve(pasta, `${nome}.js`), await result.outputs[0]!.text())
}
console.log(
  'Documento e export canônicos preparados com a cena importada pela galeria e o Three instalado.',
)
