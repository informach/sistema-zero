import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import {
  type ArquivoCompilado,
  avaliarOrcamentoDaCena,
  lerCenaCompilada,
  type OrcamentoDaCena,
  type PacoteCompilado,
} from '@sistemazero/molda-cenarios-core/compilar'
import {
  type CenaParaStudio,
  lerCenaParaStudio,
  MIME_DA_CENA_PARA_STUDIO,
} from '@sistemazero/molda-cenarios-core/studio'
import {
  decodeProjectAsset,
  digestAssetBytes,
  encodeAssetBase64,
  projectAssetFileExtension,
} from '../assetBinary'
import { uniqueAssetName } from '../assetNames'
import { courseModelDataUrl, preloadCourseModels } from '../courseModels'
import { type EditableStudioProject, isPythonProject } from '../editableProject'
import {
  normalizeAssetName,
  PROJECT_ASSET_LIMITS,
  type ProjectAsset,
  projectAssetBudgetChars,
  sanitizeProjectAssets,
} from '../projectAssets'
import { assertProjectContentPreserved } from '../projectDocumentGuards'
import { idsDosRecursosDeCena3D, lerAssetDeCena3D } from './referencias'
import { assertScene3DAssets } from './validacao'

export interface PlanoDeImportacaoDeCena3D {
  projetoId: string
  baseHash: string
  assets: ProjectAsset[]
  assetId: string
  adicionados: number
  orcamento: OrcamentoDaCena
}

export class OrcamentoDeImportacaoDeCenaExcedido extends Error {
  constructor(readonly orcamento: OrcamentoDaCena) {
    super(
      `O cenário não cabe neste projeto: ${orcamento.excessos.map((e) => `${e.tipo}${e.arquivo ? ` (${e.arquivo})` : ''}: ${e.atual} / ${e.limite}`).join('; ')}.`,
    )
    this.name = 'OrcamentoDeImportacaoDeCenaExcedido'
  }
}

function copiarPacote(entrada: PacoteCompilado, sinal: AbortSignal): PacoteCompilado {
  sinal.throwIfAborted()
  const cena = lerCenaCompilada(entrada.cena),
    arquivos = new Map<string, Uint8Array>()
  if (entrada.arquivos.size !== cena.arquivos.length)
    throw Error('O inventário da cena está incompleto ou contém arquivos extras.')
  for (const a of cena.arquivos) {
    sinal.throwIfAborted()
    const bytes = entrada.arquivos.get(a.caminho)
    if (!bytes || bytes.byteLength !== a.bytes)
      throw Error(`O arquivo “${a.caminho}” está ausente ou tem tamanho incompatível.`)
    arquivos.set(a.caminho, bytes.slice())
  }
  return { cena, arquivos }
}

function chaveDoConteudo(
  kind: ProjectAsset['kind'],
  mime: string,
  digest: string,
  papel?: string,
): string {
  return canonicalJson([kind, mime, digest, kind === 'scene3d-data' ? papel : null])
}

function kindDoArquivo(a: ArquivoCompilado): 'model3d' | 'image' | 'scene3d-data' {
  return a.mime === 'model/gltf-binary'
    ? 'model3d'
    : a.mime === 'application/octet-stream'
      ? 'scene3d-data'
      : 'image'
}

/** Pure, serializable preflight; commits and profile/project CAS belong to the existing store. */
export async function prepararImportacaoDeCena3D(
  projeto: EditableStudioProject,
  entrada: PacoteCompilado,
  opcoes: { sinal?: AbortSignal; agrupar?: boolean; tamanhoDaRegiao?: number } = {},
): Promise<PlanoDeImportacaoDeCena3D> {
  const sinal = opcoes.sinal ?? new AbortController().signal
  sinal.throwIfAborted()
  // Capture before hashing/dynamic imports yield. Neither editor buffers nor packet bytes are borrowed.
  const capturado = copyStudioProjectJson(projeto) as EditableStudioProject,
    origem = copiarPacote(entrada, sinal)
  if (isPythonProject(capturado))
    throw Error('O preparo de fontes e caminhos Python precisa acompanhar esta importação.')
  const baseHash = await sha256Hex(canonicalJson(capturado)),
    motor = await import('@sistemazero/molda-cenarios-motor/compilar')
  sinal.throwIfAborted()
  await motor.conferirConteudoCompilado(origem.cena, origem.arquivos, sinal)
  const pacote = opcoes.agrupar
    ? await motor.juntarEstaticosDoPacote(origem, sinal, {
        tamanhoDaRegiao: opcoes.tamanhoDaRegiao,
      })
    : origem
  await assertScene3DAssets(capturado.assets ?? [], sinal)
  const atuais = capturado.assets ?? [],
    next = [...atuais],
    nomes = new Set(next.map((a) => a.name)),
    porConteudo = new Map<string, ProjectAsset>()
  for (const a of atuais) {
    sinal.throwIfAborted()
    const { mime, bytes } = decodeProjectAsset(a.dataUrl)
    porConteudo.set(
      chaveDoConteudo(a.kind, mime, await digestAssetBytes(bytes), a.dado3d?.papel),
      a,
    )
  }
  // A later duplicate must not retarget an already imported revision to another opaque asset ID.
  const assinaturaDaCena = canonicalJson(pacote.cena),
    porIdAtual = new Map(atuais.map((a) => [a.id, a]))
  for (const a of atuais) {
    if (a.kind !== 'scene3d') continue
    const d = lerAssetDeCena3D(a)
    if (canonicalJson(d.cena) !== assinaturaDaCena) continue
    const metadados = new Map(d.cena.arquivos.map((f) => [f.caminho, f]))
    for (const r of d.recursos) {
      const f = metadados.get(r.caminho)!,
        recurso = porIdAtual.get(r.asset)!
      porConteudo.set(chaveDoConteudo(recurso.kind, f.mime, f.digest, f.papel), recurso)
    }
    break
  }
  const slug = normalizeAssetName(pacote.cena.nome.slice(0, 30)) ?? 'cenario',
    recursos: CenaParaStudio['recursos'] = [],
    license = {
      name: 'Licenças no manifesto do cenário',
      attribution: `Procedência: ${pacote.cena.fonte.cenario}, revisão ${pacote.cena.fonte.revisao}.`,
    }
  for (const a of pacote.cena.arquivos) {
    sinal.throwIfAborted()
    const kind = kindDoArquivo(a),
      chave = chaveDoConteudo(kind, a.mime, a.digest, a.papel)
    let asset = porConteudo.get(chave)
    if (!asset) {
      const id = await sha256Hex(chave),
        name = uniqueAssetName(`${slug}-${a.papel}-${a.digest.slice(0, 8)}`.slice(0, 38), nomes)
      if (next.some((v) => v.id === id))
        throw Error('Um identificador de recurso já está ocupado por outro conteúdo.')
      asset = {
        id,
        name,
        kind,
        source: 'library',
        libOrigin: 'molda',
        libId: `cenario-recurso:${id}`,
        license,
        dataUrl: `data:${a.mime};base64,${encodeAssetBase64(pacote.arquivos.get(a.caminho)!)}`,
        // The complete compiled path remains in the envelope; this is a bounded storage filename.
        originalFileName: `${id}.${projectAssetFileExtension(a.mime, kind)}`,
        ...(a.largura ? { width: a.largura, height: a.altura } : {}),
        ...(kind === 'scene3d-data'
          ? {
              dado3d: {
                papel: a.papel === 'alturas' ? ('alturas' as const) : ('buracos' as const),
              },
            }
          : {}),
      }
      // Ordinary images do not retain originalFileName in the existing asset schema.
      if (kind === 'image') delete asset.originalFileName
      next.push(asset)
      nomes.add(name)
      porConteudo.set(chave, asset)
    }
    recursos.push({ caminho: a.caminho, asset: asset.id })
  }
  const envelope = lerCenaParaStudio({
      formato: 'studio-cena3d',
      versao: 1,
      cena: pacote.cena,
      recursos,
    }),
    json = canonicalJson(envelope),
    assetId = await sha256Hex(`scene3d:${json}`),
    existente = next.find((a) => a.id === assetId),
    url = `data:${MIME_DA_CENA_PARA_STUDIO};base64,${encodeAssetBase64(new TextEncoder().encode(json))}`
  if (existente && (existente.kind !== 'scene3d' || existente.dataUrl !== url))
    throw Error('O identificador do cenário já está ocupado por outro conteúdo.')
  if (!existente)
    next.push({
      id: assetId,
      name: uniqueAssetName(`${slug}-r${pacote.cena.fonte.revisao}`, nomes),
      kind: 'scene3d',
      source: 'library',
      libOrigin: 'molda',
      libId: `cenario:${await sha256Hex(canonicalJson(pacote.cena.fonte))}`,
      ...(pacote.cena.fonte.revisao > 0 ? { libRevision: pacote.cena.fonte.revisao } : {}),
      license,
      originalFileName: `${slug}.scene3d.json`,
      dataUrl: url,
    })
  sinal.throwIfAborted()
  await preloadCourseModels(next)
  sinal.throwIfAborted()
  const referenciados = idsDosRecursosDeCena3D(next)
  let malhas = 0
  const arquivos = []
  for (const [i, a] of next.entries()) {
    sinal.throwIfAborted()
    const { mime, bytes } = decodeProjectAsset(courseModelDataUrl(a) ?? a.dataUrl)
    arquivos.push({
      caminho: `recursos/a${i}.${projectAssetFileExtension(mime, a.kind)}`,
      bytes:
        bytes.byteLength +
        (a.scene ? new TextEncoder().encode(JSON.stringify(a.scene)).byteLength : 0),
      tipo: a.kind === 'model3d' ? ('modelo' as const) : ('recurso' as const),
    })
    if (a.kind === 'scene3d') {
      const d = lerAssetDeCena3D(a),
        metadados = new Map(d.cena.arquivos.map((f) => [f.caminho, f]))
      malhas += d.cena.nos.reduce((s, n) => s + metadados.get(n.arquivo)!.malhas!, 0)
    } else if (a.kind === 'model3d' && !referenciados.has(a.id))
      malhas += motor.inspecionarGlbDaCompilacao(bytes, { fonte: true, luzes: true }).malhas
  }
  const orcamento = avaliarOrcamentoDaCena({ malhas, arquivos }, 'studio')
  if (!orcamento.permitido) throw new OrcamentoDeImportacaoDeCenaExcedido(orcamento)
  if (
    next.length > PROJECT_ASSET_LIMITS.maxAssetsCount ||
    next.reduce((s, a) => s + projectAssetBudgetChars(a), 0) >
      PROJECT_ASSET_LIMITS.maxAssetsTotalChars
  )
    throw Error('O cenário ultrapassa a quantidade ou o espaço de materiais deste projeto.')
  const assets = sanitizeProjectAssets(next)
  assertProjectContentPreserved({ assets: next }, { assets })
  await assertScene3DAssets(assets, sinal)
  sinal.throwIfAborted()
  return {
    projetoId: capturado.id,
    baseHash,
    assets,
    assetId,
    adicionados: assets.length - atuais.length,
    orcamento,
  }
}
