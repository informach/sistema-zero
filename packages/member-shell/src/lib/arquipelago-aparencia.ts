import {
  type AparenciaLida,
  AparenciaLidaSchema,
  LIMITES_DA_APARENCIA,
} from '@sistemazero/arquipelago-contracts'
import { createCreationsCloud } from './creations-cloud'
import { sessionFetch } from './session-fetch'

type Ferramenta = 'molda' | 'pinta'
export interface LeituraDeAparencia {
  acesso(ferramenta: Ferramenta, sinal: AbortSignal): Promise<unknown>
  baixar(ferramenta: Ferramenta, id: string, sinal: AbortSignal): Promise<string | null>
  exportar(
    ferramenta: Ferramenta,
    json: string,
    id: string,
    sinal: AbortSignal,
  ): Promise<AparenciaLida | null>
}

/** Nenhuma escrita local ou remota. A autorização é a da conta, nunca a do id no salvamento. */
export async function lerAparenciaDaConta(
  perfil: string,
  id: string,
  sinal: AbortSignal = new AbortController().signal,
  porta: LeituraDeAparencia = portaDaConta(perfil),
): Promise<AparenciaLida | null> {
  if (!perfil || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) return null
  try {
    for (const ferramenta of ['molda', 'pinta'] as const) {
      sinal.throwIfAborted()
      const acesso = (await porta.acesso(ferramenta, sinal)) as {
        situacao?: unknown
        viewerId?: unknown
      } | null
      sinal.throwIfAborted()
      if (acesso?.viewerId !== perfil || acesso.situacao !== 'disponivel') continue
      const json = await porta.baixar(ferramenta, id, sinal)
      sinal.throwIfAborted()
      if (!json) continue
      const resultado = await porta.exportar(ferramenta, json, id, sinal)
      sinal.throwIfAborted()
      const lido = AparenciaLidaSchema.safeParse(resultado)
      return lido.success ? lido.data : null
    }
  } catch {
    // Rede, sessão trocada, formato futuro, teto ou aborto: o modelo do catálogo permanece.
  }
  return null
}

function bytesDaDataUrl(url: string, mime: string): Uint8Array<ArrayBuffer> | null {
  const prefixo = `data:${mime};base64,`
  if (!url.startsWith(prefixo)) return null
  const teto = mime === 'image/png' ? LIMITES_DA_APARENCIA.pngBytes : LIMITES_DA_APARENCIA.glbBytes
  if (url.length > prefixo.length + Math.ceil(teto / 3) * 4) return null
  return Uint8Array.from(atob(url.slice(prefixo.length)), (c) => c.charCodeAt(0))
}

function portaDaConta(perfil: string): LeituraDeAparencia {
  return {
    async acesso(ferramenta, signal) {
      const r = await sessionFetch(`/api/arquipelago/ferramentas/${ferramenta}`, {
        signal,
        headers: { 'x-sz-viewer': perfil },
      })
      return r.ok ? r.json() : null
    },
    async baixar(tool, id, signal) {
      const cloud = createCreationsCloud({ tool, viewerId: perfil })
      try {
        const r = await cloud.download(id, { signal })
        return r?.summary.itemId === id ? r.json : null
      } finally {
        cloud.dispose({ abort: true })
      }
    },
    exportar: (ferramenta, json, id, signal) =>
      exportarAparenciaDaCriacao(perfil, ferramenta, json, id, signal),
  }
}

/** Exporta somente o documento que corresponde ao id autorizado, sem gravar numa biblioteca. */
export async function exportarAparenciaDaCriacao(
  perfil: string,
  ferramenta: Ferramenta,
  json: string,
  id: string,
  signal: AbortSignal,
): Promise<AparenciaLida | null> {
  if (ferramenta === 'molda') {
    const { readMoldaDocument } = await import('@sistemazero/molda/assets')
    signal.throwIfAborted()
    const lido = readMoldaDocument(JSON.parse(json))
    if (lido.status !== 'valid' || lido.asset.id !== id || lido.asset.kind !== 'model') return null
    const { exportLoadedAssetForStudio } = await import('@sistemazero/molda/studio-library')
    const r = await exportLoadedAssetForStudio(lido.asset, { namespace: perfil, signal })
    if (!r.ok || r.asset.kind !== 'model3d') return null
    const bytes = bytesDaDataUrl(r.asset.dataUrl, 'model/gltf-binary')
    return bytes ? { tipo: 'molda', bytes } : null
  }
  const { assetFromJson } = await import('@sistemazero/pinta/assets')
  signal.throwIfAborted()
  const { asset } = assetFromJson(json)
  if (!asset || asset.id !== id || asset.kind !== 'pixel-background') return null
  const { exportLoadedAssetForStudio } = await import('@sistemazero/pinta/studio-library')
  const r = await exportLoadedAssetForStudio(asset)
  signal.throwIfAborted()
  if (!r.ok) return null
  const bytes = bytesDaDataUrl(r.asset.dataUrl, 'image/png')
  return bytes ? { tipo: 'pinta', bytes } : null
}
