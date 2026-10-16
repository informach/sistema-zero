import * as Blockly from 'blockly/core'
import { registerExtensionBlocks } from '../blockly/blocks'
import { renderWorkspaceImage } from '../blockly/screenshot'
import { ensureBlocklyInitialized } from '../blockly/setup'
import { szTheme } from '../blockly/theme'
import { buildWorkspaceStateFromIR } from '../blockly/workspaceState'
import { createBlankProjectSnapshot } from '../core/blankProject'
import type { Project } from '../core/project'
import { parseGoogleFontImportRule } from '../css/googleFonts'
import { generateProjectFiles } from '../generators/project'
import { MAX_IR_TEXT_CHARS, normalizeSZIR, SZIRInputSchema } from '../ir'
import { findExtension } from '../official-extensions'
import { GAME_UI_FONT_IDS, GAME_UI_FONTS, loadGameUiFont } from '../official-extensions/gameUiFont'
import { renderProjectToPreviewDocAsync } from '../preview/renderProject'
import { prepareProjectForHost } from '../state/projectValidation'
export const captureLimits = Object.freeze({ maxEmbeddedText: MAX_IR_TEXT_CHARS })

/** Browser adapter owned by Studio; consumers do not copy generators or game physics. */
export async function prepareCaptureProject(raw: unknown): Promise<Project> {
  const ir = SZIRInputSchema.safeParse(raw)
  if (!ir.success && raw && typeof raw === 'object' && 'behavior' in raw && 'version' in raw)
    throw new Error(`Programa do Studio incompatível: ${ir.error.message.slice(0, 1500)}`)
  let document = raw
  if (ir.success) {
    const normalized = normalizeSZIR(ir.data)
    const installedExtensions = normalized.extensions.map((usage) => {
      const extension = findExtension(usage.extensionId)
      if (!extension) throw new Error(`Extensão não instalada: ${usage.extensionId}`)
      return { id: extension.manifest.id, version: extension.manifest.version, installedAt: 0 }
    })
    document = {
      ...createBlankProjectSnapshot(crypto.randomUUID(), 'Captura do acervo'),
      ir: ir.data,
      files: generateProjectFiles({ ir: ir.data, projectName: 'Captura do acervo' }),
      blocksState: buildWorkspaceStateFromIR(ir.data),
      installedExtensions,
    }
  }
  const project = await prepareProjectForHost(document)
  if (!project) throw new Error('O arquivo não é um projeto ou programa válido do Studio')
  if (project.kind === 'pro')
    throw new Error('Exporte uma demonstração do projeto Pro antes de capturar')
  return project
}
export async function captureRuntimeDocument(
  project: Project,
  runtimeImports: Readonly<Record<string, string>>,
) {
  let css = project.files['style.css']
  for (const match of css.matchAll(
    /@import url\("https:\/\/fonts\.googleapis\.com\/css\?family=[^"?#&]+"\);/g,
  )) {
    const family = parseGoogleFontImportRule(match[0]),
      id = GAME_UI_FONT_IDS.find((id) => GAME_UI_FONTS[id].label === family)
    if (!id)
      throw new Error(`A fonte ${family} não está incorporada ao Studio para captura offline`)
    const font = await loadGameUiFont(id, { includeThemeVariable: false })
    css = css.replaceAll(match[0], font.css)
  }
  return renderProjectToPreviewDocAsync(
    { ...project, files: { ...project.files, 'style.css': css } },
    {
      securityProfile: 'strict',
      fetchAllowedOrigins: [],
      loopBudgetMs: 50,
      runtimeImports,
      runtimeInspection: true,
    },
  )
}
export async function captureBlocksImage(project: Project, container: HTMLElement): Promise<Blob> {
  ensureBlocklyInitialized()
  for (const installed of project.installedExtensions ?? []) {
    const extension = findExtension(installed.id)
    if (!extension) throw new Error(`Extensão não instalada: ${installed.id}`)
    registerExtensionBlocks(extension.blockly.blocks)
  }
  await Promise.all([
    document.fonts.load('600 16px "Baloo 2"'),
    document.fonts.load('600 16px Nunito'),
  ])
  const workspace = Blockly.inject(container, {
    readOnly: true,
    renderer: 'zelos',
    theme: szTheme,
    sounds: false,
    scrollbars: false,
  })
  try {
    if (!project.blocksState && !project.ir)
      throw new Error('Este projeto não tem uma representação em blocos')
    const state = project.blocksState ?? (project.ir ? buildWorkspaceStateFromIR(project.ir) : null)
    if (!state) throw new Error('Blocos ausentes')
    Blockly.serialization.workspaces.load(state, workspace)
    Blockly.svgResize(workspace)
    workspace.render()
    return await renderWorkspaceImage(workspace)
  } finally {
    workspace.dispose()
  }
}
