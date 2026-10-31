import {
  type AparenciaLida,
  AparenciaLidaSchema,
  type CriacaoQueCabe,
  CriacaoQueCabeSchema,
  LIMITES_DA_APARENCIA,
  type MoldeDeObjeto,
  planificacaoDoMolde,
  tamanhoDoPng,
  triangulosDoGlb,
} from '@sistemazero/arquipelago-contracts'
import { type CloudCreationSummary, createCreationsCloud } from './creations-cloud'
import { sessionFetch } from './session-fetch'

type Ferramenta = 'molda' | 'pinta'
export interface LeituraDeAparencia {
  acesso(ferramenta: Ferramenta, sinal: AbortSignal): Promise<unknown>
  listar(ferramenta: Ferramenta, sinal: AbortSignal): Promise<CloudCreationSummary[]>
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

/** Quantas criações de cada ferramenta são conferidas por vez (as mais novas primeiro). */
export const CRIACOES_CONFERIDAS = 12

/** O tipo de documento de cada ferramenta que pode virar aparência de objeto. */
const TIPO_DA_CRIACAO: Record<Ferramenta, string> = { pinta: 'pixel-background', molda: 'model' }

/**
 * "Usar uma criação minha que cabe neste molde" (§6.28, A30): as criações da conta, das ferramentas
 * abertas para ela, que o jogo aceitaria no objeto. A régua é a mesma do jogo: o desenho do Pinta
 * no tamanho exato da planificação; o modelo do Molda dentro do teto de triângulos do molde.
 * Nenhuma escrita; o que falhar numa ferramenta deixa a outra seguir.
 */
export async function listarCriacoesQueCabem(
  perfil: string,
  molde: MoldeDeObjeto,
  sinal: AbortSignal = new AbortController().signal,
  porta: LeituraDeAparencia = portaDaConta(perfil),
): Promise<CriacaoQueCabe[]> {
  const plan = planificacaoDoMolde(molde)
  const achadas: CriacaoQueCabe[] = []
  for (const ferramenta of ['pinta', 'molda'] as const) {
    if (ferramenta === 'pinta' && !plan) continue
    try {
      const acesso = (await porta.acesso(ferramenta, sinal)) as {
        situacao?: unknown
        viewerId?: unknown
      } | null
      sinal.throwIfAborted()
      if (acesso?.viewerId !== perfil || acesso.situacao !== 'disponivel') continue
      const candidatas = (await porta.listar(ferramenta, sinal))
        .filter((c) => !c.deletedAt && c.kind === TIPO_DA_CRIACAO[ferramenta])
        .sort((a, b) => b.itemUpdatedAt - a.itemUpdatedAt)
        .slice(0, CRIACOES_CONFERIDAS)
      for (const c of candidatas) {
        sinal.throwIfAborted()
        const json = await porta.baixar(ferramenta, c.itemId, sinal)
        if (!json) continue
        const lido = AparenciaLidaSchema.safeParse(
          await porta.exportar(ferramenta, json, c.itemId, sinal),
        )
        if (!lido.success) continue
        const { bytes } = lido.data
        const cabe =
          lido.data.tipo === 'pinta'
            ? tamanhoDoPng(bytes)?.largura === plan?.largura &&
              tamanhoDoPng(bytes)?.altura === plan?.altura
            : (triangulosDoGlb(bytes) ?? Number.POSITIVE_INFINITY) <= molde.triangulosMaximos
        if (!cabe) continue
        const base = { ferramenta, id: c.itemId, nome: c.name }
        const miniatura = c.thumb ?? (lido.data.tipo === 'pinta' ? dataUrlDoPng(bytes) : null)
        // Uma miniatura grande demais não tira a criação da lista: ela entra sem a imagem.
        const criacao =
          CriacaoQueCabeSchema.safeParse({ ...base, miniatura }).data ??
          CriacaoQueCabeSchema.safeParse({ ...base, miniatura: null }).data
        if (criacao) achadas.push(criacao)
      }
    } catch {
      if (sinal.aborted) return []
      // Rede ou formato futuro numa ferramenta: a outra continua.
    }
  }
  return achadas
}

function dataUrlDoPng(bytes: Uint8Array): string {
  let binario = ''
  for (const b of bytes) binario += String.fromCharCode(b)
  return `data:image/png;base64,${btoa(binario)}`
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
    async listar(tool, signal) {
      const cloud = createCreationsCloud({ tool, viewerId: perfil })
      try {
        return await cloud.list({ signal })
      } finally {
        cloud.dispose({ abort: true })
      }
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
