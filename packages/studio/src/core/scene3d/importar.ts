import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import { encodeProjectJsonGraph } from '@sistemazero/core/studio/project-json-graph'
import {
  type ArquivoCompilado,
  avaliarOrcamentoDaCena,
  compactarColisoesDaCena,
  lerCenaCompilada,
  malhasDaMaiorJanela,
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
import { sanitizePythonProjectAssets } from '../pythonAssets'
import { projectUsesRaylib3D } from '../raylibMediaPaths'
import type { FontePythonDoCenario } from './python'
import { idsDosRecursosDeCena3D, lerAssetDeCena3D } from './referencias'
import { assertScene3DAssets } from './validacao'

export interface PlanoDeImportacaoDeCena3D {
  projetoId: string
  baseHash: string
  assets: ProjectAsset[]
  assetId: string
  adicionados: number
  orcamento: OrcamentoDaCena
  fontesPython?: FontePythonDoCenario[]
  avisos?: string[]
}

export class OrcamentoDeImportacaoDeCenaExcedido extends Error {
  constructor(readonly orcamento: OrcamentoDaCena) {
    super(
      `O cenário não cabe neste projeto: ${orcamento.excessos.map((e) => `${e.tipo}${e.arquivo ? ` (${e.arquivo})` : ''}: ${e.atual} / ${e.limite}`).join('; ')}.`,
    )
    this.name = 'OrcamentoDeImportacaoDeCenaExcedido'
  }
}

function copiarPacote(entrada: PacoteCompilado, sinal: AbortSignal) {
  sinal.throwIfAborted()
  const cena = lerCenaCompilada(entrada.cena),
    arquivos = new Map<string, Uint8Array<ArrayBuffer>>()
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
/**
 * As malhas que o orçamento do Estúdio confere numa cena. No JavaScript, a maior janela (região,
 * vizinhas e o que é de todas): o SDK carrega por regiões (lote 5 da conclusão, 22/11/2026). No
 * Python, a cena inteira: o `cenario.py` desenha tudo até carregar por regiões (lote 7b), e a
 * janela deixaria passar uma cena que o Raylib não aguenta (revisão do lote 5).
 */
export function malhasDaCenaParaOOrcamento(
  cena: Parameters<typeof malhasDaMaiorJanela>[0],
  python: boolean,
): number {
  if (!python) return malhasDaMaiorJanela(cena)
  const { regioes: _porRegioes, ...inteira } = cena
  return malhasDaMaiorJanela(inteira)
}

export async function prepararImportacaoDeCena3D(
  projeto: EditableStudioProject,
  entrada: PacoteCompilado,
  opcoes: { sinal?: AbortSignal } = {},
): Promise<PlanoDeImportacaoDeCena3D> {
  const sinal = opcoes.sinal ?? new AbortController().signal
  sinal.throwIfAborted()
  // Capture before hashing/dynamic imports yield. Neither editor buffers nor packet bytes are borrowed.
  const capturado = copyStudioProjectJson(projeto) as EditableStudioProject,
    pacote = copiarPacote(entrada, sinal)
  const python = isPythonProject(capturado)
  if (python && !projectUsesRaylib3D(capturado))
    throw Error('Cenários 3D precisam da extensão Raylib 3D neste projeto Python.')
  const baseHash = await sha256Hex(encodeProjectJsonGraph(capturado)),
    { conferirConteudoCompilado, inspecionarGlbDaCompilacao } = await import(
      '@sistemazero/molda-cenarios-motor/conteudo'
    )
  sinal.throwIfAborted()
  await conferirConteudoCompilado(pacote.cena, pacote.arquivos, sinal)
  const avisos: string[] = []
  if (python) {
    const { normalizarPelesParaRaylib } = await import('@sistemazero/molda-cenarios-motor/raylib')
    sinal.throwIfAborted()
    for (const a of pacote.cena.arquivos) {
      if (a.mime !== 'model/gltf-binary') continue
      const original = pacote.arquivos.get(a.caminho)!,
        adaptado = normalizarPelesParaRaylib(original)
      if (adaptado.bytes !== original) {
        const bytes = adaptado.bytes.slice()
        pacote.arquivos.set(a.caminho, bytes)
        a.bytes = bytes.byteLength
        a.digest = await digestAssetBytes(bytes)
        avisos.push(
          `${a.caminho}: vínculos equivalentes do mesmo esqueleto foram compartilhados na cópia Raylib.`,
        )
      }
      sinal.throwIfAborted()
    }
    await conferirConteudoCompilado(pacote.cena, pacote.arquivos, sinal)
  }
  await assertScene3DAssets(capturado.assets ?? [], sinal)
  const atuais = capturado.assets ?? [],
    next = [...atuais],
    nomes = new Set(next.map((a) => a.name)),
    porConteudo = new Map<string, ProjectAsset>(),
    kindsNecessarios = new Set<ProjectAsset['kind']>(pacote.cena.arquivos.map(kindDoArquivo)),
    decodificados = new Map<string, ReturnType<typeof decodeProjectAsset>>()
  const decodificar = (dataUrl: string) => {
    let resultado = decodificados.get(dataUrl)
    if (!resultado) {
      resultado = decodeProjectAsset(dataUrl)
      decodificados.set(dataUrl, resultado)
    }
    return resultado
  }
  for (const a of atuais) {
    sinal.throwIfAborted()
    if (!kindsNecessarios.has(a.kind)) continue
    // Criação ligada ao Pinta/Molda da criança segue sincronizando sozinha: virar dependência
    // fixada da cena a congelaria. Com o mesmo conteúdo, a cena ganha uma cópia própria.
    if (a.pintaImage || a.libId?.startsWith('personal:')) continue
    const { mime, bytes } = decodificar(a.dataUrl)
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
        ...(python
          ? {
              proPath: `cenarios/${kind === 'model3d' ? 'modelos' : kind === 'image' ? 'imagens' : 'dados'}/${id}.${projectAssetFileExtension(a.mime, kind)}`,
            }
          : {}),
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
    // Em campo, a colisão é gravada sem a matriz e o volume da entidade (a leitura os devolve).
    json = canonicalJson({ ...envelope, cena: compactarColisoesDaCena(envelope.cena) }),
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
      ...(python ? { proPath: `cenarios/${assetId}.json` } : {}),
    })
  sinal.throwIfAborted()
  await preloadCourseModels(next)
  sinal.throwIfAborted()
  const referenciados = idsDosRecursosDeCena3D(next)
  let malhas = 0
  const arquivos = []
  for (const [i, a] of next.entries()) {
    sinal.throwIfAborted()
    const { mime, bytes } = decodificar(courseModelDataUrl(a) ?? a.dataUrl)
    arquivos.push({
      caminho: `recursos/a${i}.${projectAssetFileExtension(mime, a.kind)}`,
      bytes:
        bytes.byteLength +
        (a.scene ? new TextEncoder().encode(JSON.stringify(a.scene)).byteLength : 0),
      tipo: a.kind === 'model3d' ? ('modelo' as const) : ('recurso' as const),
    })
    if (a.kind === 'scene3d') malhas += malhasDaCenaParaOOrcamento(lerAssetDeCena3D(a).cena, python)
    else if (a.kind === 'model3d' && !referenciados.has(a.id))
      malhas += malhasDeModeloComum(bytes, inspecionarGlbDaCompilacao)
  }
  const orcamento = avaliarOrcamentoDaCena({ malhas, arquivos }, 'studio')
  if (!orcamento.permitido) throw new OrcamentoDeImportacaoDeCenaExcedido(orcamento)
  if (
    next.length > PROJECT_ASSET_LIMITS.maxAssetsCount ||
    next.reduce((s, a) => s + projectAssetBudgetChars(a), 0) >
      PROJECT_ASSET_LIMITS.maxAssetsTotalChars
  )
    throw Error('O cenário ultrapassa a quantidade ou o espaço de materiais deste projeto.')
  let assets = python ? sanitizePythonProjectAssets(next) : sanitizeProjectAssets(next)
  assertProjectContentPreserved({ assets: next }, { assets })
  await assertScene3DAssets(assets, sinal)
  let fontesPython: FontePythonDoCenario[] | undefined
  if (isPythonProject(capturado)) {
    const { prepararFontesPythonDoCenario } = await import('./python'),
      resultado = await prepararFontesPythonDoCenario(capturado, assets, assetId, sinal)
    assets = resultado.assets
    fontesPython = resultado.fontesPython
    avisos.push(...resultado.avisos)
  }
  sinal.throwIfAborted()
  return {
    projetoId: capturado.id,
    baseHash,
    assets,
    assetId,
    adicionados: assets.length - atuais.length,
    orcamento,
    ...(fontesPython ? { fontesPython, avisos } : {}),
  }
}

/**
 * Malhas de um modelo comum do projeto, só para o orçamento. O inspetor estrito da compilação
 * recusa extensões que o Three carrega bem (quantização, instâncias, Draco): um modelo antigo do
 * projeto impedia importar qualquer cena. Fora do inspetor, conta as primitivas do JSON do GLB.
 */
function malhasDeModeloComum(
  bytes: Uint8Array,
  inspecionar: (
    bytes: Uint8Array,
    opcoes: { fonte: boolean; luzes: boolean },
  ) => { malhas: number },
): number {
  try {
    return inspecionar(bytes, { fonte: true, luzes: true }).malhas
  } catch {
    try {
      const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      if (bytes.byteLength < 20 || v.getUint32(0, true) !== 0x46546c67) return 1
      const tamanho = v.getUint32(12, true)
      if (v.getUint32(16, true) !== 0x4e4f534a || 20 + tamanho > bytes.byteLength) return 1
      const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + tamanho))) as {
        meshes?: { primitives?: unknown[] }[]
      }
      const total = (json.meshes ?? []).reduce((s, m) => s + (m.primitives?.length ?? 0), 0)
      return Math.max(1, total)
    } catch {
      return 1
    }
  }
}
