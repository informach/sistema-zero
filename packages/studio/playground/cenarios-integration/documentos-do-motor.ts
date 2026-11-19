import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Project } from '../../src/core/project'
import { buildClassicFileMap } from '../../src/export/fileMap'
import { identityMinifiers } from '../../src/export/minify'
import { renderProjectToPreviewDocAsync } from '../../src/preview/renderProject'
import { prepareEditableStudioProject } from '../../src/state/editableProjectValidation'

/** Canonical reopening, strict preview and exact exported files, shared by engine proofs. */
export async function gravarDocumentosDoMotor(pasta: string, nome: string, projeto: Project) {
  const reaberto = await prepareEditableStudioProject(JSON.parse(JSON.stringify(projeto)))
  assert.ok(reaberto && reaberto.programmingLanguage !== 'python')
  assert.deepEqual(reaberto.assets, projeto.assets)
  await mkdir(pasta, { recursive: true })
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
