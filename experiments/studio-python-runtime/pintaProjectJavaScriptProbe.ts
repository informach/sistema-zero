import {
  type PintaRegionalMarker,
  pintaRegionalMarkerOf,
} from '../../packages/studio/src/core/pintaRegionalMaterial'
import {
  PRIVATE_REGIONAL_PROJECT,
  type PrivateRegionalProjectReadOptions,
} from '../../packages/studio/src/core/pintaRegionalReference'
import type { Project, ProjectAsset } from '../../packages/studio/src/core/project'
import { createPintaRegionalProRuntime } from '../../packages/studio/src/modes/pro/pintaRegionalProRuntime'
import { renderProjectToPreviewDocAsync } from '../../packages/studio/src/preview/renderProject'
import { convertClassicToProTree } from '../../packages/studio/src/state/convertToPro'
import { persistProject } from '../../packages/studio/src/state/persistence'
import {
  privateRegionalProjectScope,
  refreshPrivateRegionalProjectAsset,
} from '../../packages/studio/src/state/pintaRegionalProjectRefresh'
import { loadSanitizedProjectById } from '../../packages/studio/src/state/projectStore'

type Capture = { dataUrl: string; width: number; height: number; regional: PintaRegionalMarker }
const frames = new Map<string, HTMLIFrameElement>()

/** Executes a durable project via the actual Classic/Pro preparation boundaries. */
export async function showPintaJavaScriptProject(
  project: Project,
  options: { seed?: boolean; pro?: boolean; replace?: { id: string; capture: Capture } } = {},
) {
  const scope = privateRegionalProjectScope('js-player-probe')
  const access: PrivateRegionalProjectReadOptions = { [PRIVATE_REGIONAL_PROJECT]: scope }
  if (options.seed) {
    const { assets } = project
    if (options.pro) {
      const tree = await convertClassicToProTree({
        ...project,
        assets: assets?.map((asset) => {
          if (!('regional' in asset)) return asset
          const { regional: _marker, ...ordinary } = asset
          return ordinary
        }),
      })
      project = {
        ...project,
        mode: 'code',
        kind: 'pro',
        tree,
        proMeta: {
          templateId: 'vanilla-vite',
          devScript: 'dev',
          origin: { projectId: project.id, revision: 0 },
        },
      }
    }
    await persistProject(project, {}, scope)
  }
  if (options.replace)
    if (
      !(await refreshPrivateRegionalProjectAsset({
        scope,
        projectId: project.id,
        assetId: options.replace.id,
        capture: options.replace.capture,
      }))
    )
      throw new Error('A atualização da fixture não foi gravada.')
  const reopened = await loadSanitizedProjectById(project.id, scope)
  if (!reopened || reopened.programmingLanguage === 'python')
    throw new Error('Não foi possível reabrir o projeto da fixture.')
  const html =
    reopened.kind === 'pro'
      ? (await createPintaRegionalProRuntime(scope).build({ project: reopened })).html
      : await renderProjectToPreviewDocAsync(reopened, access)
  if (!html) throw new Error('A fixture não produziu um documento local.')
  const frame = document.createElement('iframe')
  frame.title = 'Projeto PNG5 privado'
  frame.sandbox.add('allow-scripts')
  frame.style.cssText = 'width:640px;height:480px'
  frame.srcdoc = html
  const previous = frames.get(project.id)
  if (previous) previous.replaceWith(frame)
  else document.body.append(frame)
  frames.set(project.id, frame)
  const materials = (reopened.assets ?? []).map((asset: ProjectAsset) => ({
    id: asset.id,
    name: asset.name,
    proPath: asset.proPath,
    regional: pintaRegionalMarkerOf(asset),
  }))
  return {
    materials,
    files: reopened.files,
    tree: reopened.tree,
    blocksState: reopened.blocksState,
  }
}
