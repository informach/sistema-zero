import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { createEmptyProject, type Project } from '../../src/core/project'
import { buildClassicFileMap } from '../../src/export/fileMap'
import { identityMinifiers } from '../../src/export/minify'
import { renderProjectToPreviewDocAsync } from '../../src/preview/renderProject'
import { prepareEditableStudioProject } from '../../src/state/editableProjectValidation'
import { criarTransporteDeEnsaio } from '../../src/testing/scene3dTransportFixture'
import { prepararVendors } from './preparar-vendors'

GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })
const raiz = resolve(import.meta.dirname, '../../../..'),
  pasta = resolve(raiz, 'output/cenarios-reforma/lote8-studio-motores/mundo'),
  projeto = JSON.parse(
    await readFile(
      resolve(
        raiz,
        'output/cenarios-reforma/lote8-studio-galeria/js-classic-1440-900-light.project.json',
      ),
      'utf8',
    ),
  ) as Project,
  sintetico = await criarTransporteDeEnsaio({ comBuraco: true }),
  programa = await readFile(resolve(import.meta.dirname, 'programa-mundo.js'), 'utf8')
await mkdir(pasta, { recursive: true })
for (const [nome, assets] of [
  ['completo', projeto.assets!],
  ['buraco', sintetico.assets],
] as const) {
  const primario = assets.find((a) => a.kind === 'scene3d')!,
    envelope = JSON.parse(Buffer.from(primario.dataUrl.split(',')[1]!, 'base64').toString()),
    caminhoAvatar = envelope.cena.nos.find(
      (n: { entidade: string }) => n.entidade === 'ator',
    )?.arquivo,
    idAvatar = envelope.recursos.find(
      (r: { caminho: string }) => r.caminho === caminhoAvatar,
    )?.asset,
    avatar = assets.find((a) => a.id === idAvatar),
    entrada = {
      id: primario.id,
      avatar: avatar?.name,
      x: nome === 'buraco' ? 10 : 8,
      z: nome === 'buraco' ? 0 : 5,
    },
    base = createEmptyProject('prova-mundo', 'Passeio no cenário'),
    execucao: Project = {
      ...base,
      mode: 'bridge',
      assets,
      installedExtensions: [{ id: 'world-3d', version: '4.4.0', installedAt: 0 }],
      files: {
        'index.html': '<!doctype html><html><head></head><body></body></html>',
        'style.css': 'body{margin:0}',
        'script.js': programa.replace('__ENTRADA_DE_ENSAIO__', JSON.stringify(entrada)),
      },
    }
  const reaberto = await prepareEditableStudioProject(JSON.parse(JSON.stringify(execucao)))
  if (!reaberto || reaberto.programmingLanguage === 'python')
    throw Error('O passeio precisa reabrir como JavaScript.')
  if (JSON.stringify(reaberto.assets) !== JSON.stringify(execucao.assets))
    throw Error('A reabertura alterou os materiais da cena.')
  await writeFile(resolve(pasta, `${nome}.project.json`), JSON.stringify(reaberto))
  await writeFile(
    resolve(pasta, `${nome}.html`),
    await renderProjectToPreviewDocAsync(reaberto, {
      securityProfile: 'strict',
      loopBudgetMs: 1000,
    }),
  )
  if (nome === 'completo') {
    const exportado = await buildClassicFileMap(reaberto, identityMinifiers)
    for (const [path, bytes] of Object.entries(exportado.files)) {
      const destino = resolve(pasta, 'export', path)
      await mkdir(resolve(destino, '..'), { recursive: true })
      await writeFile(destino, bytes)
    }
  }
}
await prepararVendors(pasta)
console.log(
  'Mundo 3D: documentos canônicos com cena da galeria e recorte sintético, Three real instrumentado para observar recursos.',
)
