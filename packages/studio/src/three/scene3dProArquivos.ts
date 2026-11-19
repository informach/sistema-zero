import { digestAssetBytes, encodeAssetBase64 } from '../core/assetBinary'
import { PROJECT_ASSET_LIMITS, type ProjectAsset } from '../core/projectAssets'
import { lerAssetDeCena3D } from '../core/scene3d/referencias'

/** View of the existing Pro manifest, never another durable inventory. */
export interface ArquivoDeCenaPro {
  id: string
  name: string
  kind: ProjectAsset['kind']
  source: ProjectAsset['source']
  originalFileName?: string
  dado3d?: ProjectAsset['dado3d']
  url: string
  mime: string
  bytes: number
  sha256: string
}

export function criarFonteDeCenasPro(
  arquivos: readonly ArquivoDeCenaPro[],
  baseURL: string,
  vida: AbortSignal,
) {
  const base = new URL(baseURL),
    porId = new Map<string, ArquivoDeCenaPro>(),
    cache = new Map<string, ProjectAsset>()
  if (
    !['http:', 'https:'].includes(base.protocol) ||
    arquivos.length > PROJECT_ASSET_LIMITS.maxAssetsCount
  )
    throw Error('A origem ou o orçamento dos materiais do cenário é inválido.')
  let total = 0
  for (const file of arquivos) {
    total += Math.ceil(file.bytes / 3) * 4 + file.mime.length + 13
    if (
      !['scene3d', 'scene3d-data', 'image', 'model3d'].includes(file.kind) ||
      porId.has(file.id) ||
      !/^[a-f0-9]{64}$/.test(file.sha256) ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes < 1 ||
      !/^[A-Za-z0-9_./-]+$/.test(file.url) ||
      file.url.split('/').some((p) => !p || p === '.' || p === '..') ||
      total > PROJECT_ASSET_LIMITS.maxAssetsTotalChars
    )
      throw Error('Os arquivos do cenário têm caminhos, identidades ou orçamento inválidos.')
    porId.set(file.id, { ...file })
  }
  async function ler(id: string, sinal: AbortSignal): Promise<ProjectAsset> {
    sinal.throwIfAborted()
    const pronto = cache.get(id)
    if (pronto) return pronto
    const file = porId.get(id)
    if (!file) throw Error(`O material ${id} não está disponível no projeto.`)
    const url = new URL(file.url, base)
    if (url.origin !== base.origin) throw Error('O material não pertence à origem do projeto.')
    const response = await fetch(url, {
      signal: sinal,
      redirect: 'error',
      credentials: 'same-origin',
    })
    if (!response.ok || !response.body)
      throw Error(`Não foi possível abrir o material ${file.name}.`)
    const reader = response.body.getReader(),
      bytes = new Uint8Array(file.bytes)
    let offset = 0
    try {
      for (;;) {
        const chunk = await reader.read()
        sinal.throwIfAborted()
        if (chunk.done) break
        if (offset + chunk.value.byteLength > file.bytes) {
          await reader.cancel()
          throw Error(`O tamanho de ${file.name} é diferente do manifesto.`)
        }
        bytes.set(chunk.value, offset)
        offset += chunk.value.byteLength
      }
    } catch (error) {
      try {
        await reader.cancel(error)
      } catch {}
      throw error
    } finally {
      reader.releaseLock()
    }
    if (offset !== file.bytes || (await digestAssetBytes(bytes)) !== file.sha256)
      throw Error(`A integridade de ${file.name} é diferente do manifesto.`)
    sinal.throwIfAborted()
    const asset: ProjectAsset = {
      id: file.id,
      name: file.name,
      kind: file.kind,
      source: file.source,
      ...(file.originalFileName ? { originalFileName: file.originalFileName } : {}),
      ...(file.dado3d ? { dado3d: file.dado3d } : {}),
      dataUrl: `data:${file.mime};base64,${encodeAssetBase64(bytes)}`,
    }
    cache.set(id, asset)
    return asset
  }
  return {
    async carregar(id: string, sinal: AbortSignal) {
      const combinado = AbortSignal.any([sinal, vida])
      combinado.throwIfAborted()
      if (porId.get(id)?.kind !== 'scene3d')
        throw Error('Escolha um cenário disponível neste projeto.')
      const scene = await ler(id, combinado),
        assets = [scene],
        ids = new Set(lerAssetDeCena3D(scene).recursos.map((r) => r.asset))
      for (const resource of ids) assets.push(await ler(resource, combinado))
      return assets
    },
    limpar() {
      cache.clear()
    },
  }
}
