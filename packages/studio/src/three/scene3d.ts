import type {
  CenaNoThree,
  OpcoesDoRuntimeCompilado,
} from '@sistemazero/molda-cenarios-motor/runtime'
import { PROJECT_ASSET_LIMITS, type ProjectAsset } from '../core/projectAssets'
import { pacoteDeCena3D } from '../core/scene3d/referencias'

/** The same scene loader for the four engines; no renderer, editor, account or network. */
export async function carregarCena3DDoProjeto(
  id: string,
  assets: readonly ProjectAsset[],
  sinal: AbortSignal,
  opcoes: OpcoesDoRuntimeCompilado = {},
): Promise<CenaNoThree> {
  sinal.throwIfAborted()
  if (assets.length > PROJECT_ASSET_LIMITS.maxAssetsCount)
    throw Error('Os materiais do cenário excedem o limite de arquivos do projeto.')
  let caracteres = 0
  for (const a of assets) {
    caracteres += a.dataUrl.length
    if (caracteres > PROJECT_ASSET_LIMITS.maxAssetsTotalChars)
      throw Error('Os materiais do cenário excedem o espaço do projeto.')
  }
  const asset = assets.find((a) => a.id === id)
  if (asset?.kind !== 'scene3d') throw Error('Escolha um cenário que esteja neste projeto.')
  // Materialization owns decoded bytes and parsed metadata before the first await.
  const pacote = pacoteDeCena3D(asset, assets),
    capturadas = { ...opcoes }
  const { carregarCenaNoThree } = await import('@sistemazero/molda-cenarios-motor/runtime')
  sinal.throwIfAborted()
  const resultado = await carregarCenaNoThree(pacote, sinal, capturadas)
  try {
    sinal.throwIfAborted()
    return resultado
  } catch (erro) {
    resultado.descartar()
    throw erro
  }
}
