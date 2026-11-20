import {
  type CenaCompilada,
  LIMITES_DA_EXPORTACAO,
  type PacoteCompilado,
} from '@sistemazero/molda-cenarios-core/compilar'
import {
  Box3,
  type BufferGeometry,
  DataTexture,
  type Material,
  Matrix4,
  Mesh,
  type MeshStandardMaterial,
  RGBAFormat,
  SRGBColorSpace,
} from 'three'
import { type CacheDeImagens, lerGlb, type ModeloCarregado } from '../modelos'
import { ArquivosDaCompilacao } from './arquivos'
import { gravarGlbCompilado } from './arquivos-glb'
import { conferirConteudoCompilado } from './conteudo'
import { pixelsDaTexturaCompilada } from './imagens'
import { inspecionarGlbDaCompilacao, pixelsDasImagensNovas } from './inspecao-glb'
import {
  bytesDaParteParaJuncao,
  LoteEstaticoCompilado,
  layoutDaParteEstatica,
} from './lote-estatico'
import { cederDuranteCompilacao, volumeDaCaixa } from './montagem'
import type { ProgressoDaCompilacao } from './recursos'
import {
  comporAtlasDoRelevo,
  levarUvAoAtlas,
  planejarAtlasDoRelevo,
  uvSegueOChao,
} from './relevo-atlas'

interface PecaDoRelevo {
  geometria: BufferGeometry
  matriz: Matrix4
  material: MeshStandardMaterial
  entidade: string | null
  chao: { minX: number; minZ: number; largura: number; profundidade: number }
}
const MAPAS_QUE_USAM_UV = [
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'alphaMap',
  'bumpMap',
  'displacementMap',
  'lightMap',
] as const
function ladoDoMapa(m: MeshStandardMaterial) {
  const img = m.map?.image as { width?: number; height?: number; naturalWidth?: number } | null
  return img?.naturalWidth ?? img?.width ?? 0
}
/** Só o chão assado entra no atlas: textura quadrada sRGB sem inverter nem repetir, e nenhum
 * outro mapa que dependa do UV (ele muda de lugar no atlas). */
function materialDoAtlas(m: Material): m is MeshStandardMaterial {
  const s = m as MeshStandardMaterial,
    mapa = s.map
  if (!s.isMeshStandardMaterial || s.transparent || s.alphaTest || !mapa) return false
  const img = mapa.image as { width?: number; height?: number; naturalHeight?: number } | null,
    lado = ladoDoMapa(s)
  if (!lado || lado !== (img?.naturalHeight ?? img?.height)) return false
  if (mapa.flipY || mapa.colorSpace !== SRGBColorSpace || mapa.channel !== 0) return false
  if (mapa.repeat.x !== 1 || mapa.repeat.y !== 1 || mapa.offset.x || mapa.offset.y || mapa.rotation)
    return false
  return MAPAS_QUE_USAM_UV.every((k) => !s[k])
}
const assinaturaDoAtlas = (m: MeshStandardMaterial) =>
  JSON.stringify([
    m.color.getHex(),
    m.emissive.getHex(),
    m.emissiveIntensity,
    m.roughness,
    m.metalness,
    m.side,
    m.opacity,
    m.vertexColors,
    m.flatShading,
    ladoDoMapa(m),
    m.map?.magFilter,
    m.map?.minFilter,
    m.map?.wrapS,
    m.map?.wrapT,
  ])

export interface OpcoesDaJuncaoEstatica {
  tamanhoDaRegiao?: number
  progresso?: (p: ProgressoDaCompilacao) => void
}
export function tamanhoDaRegiaoDaJuncao(valor?: number) {
  const tamanho = valor ?? 64
  if (!Number.isFinite(tamanho) || tamanho < 16 || tamanho > 512)
    throw Error('A região de junção precisa medir entre 16 e 512 metros.')
  return tamanho
}

/** Junta geometria já compilada; nenhum apoio, caminho ou terreno é recalculado.
 * Transparência conserva a ordenação por objeto. Atores/efeitos permanecem separados. */
export async function juntarEstaticosDoPacote(
  entrada: PacoteCompilado,
  sinal: AbortSignal,
  opcoes: OpcoesDaJuncaoEstatica = {},
): Promise<PacoteCompilado> {
  sinal.throwIfAborted()
  const tamanho = tamanhoDaRegiaoDaJuncao(opcoes.tamanhoDaRegiao)
  const { cena } = await conferirConteudoCompilado(entrada.cena, entrada.arquivos, sinal),
    arquivos = new ArquivosDaCompilacao(sinal),
    modelos = new Map<string, ModeloCarregado>(),
    preservados = new Set<string>(),
    grupos = new Map<
      string,
      { lote: LoteEstaticoCompilado; material: Material; matriz: Matrix4 }
    >(),
    nos: CenaCompilada['nos'] = [],
    ids = new Set(cena.nos.map((n) => n.id)),
    metadados = new Map(cena.arquivos.map((a) => [a.caminho, a])),
    // O atlas de um kit, repetido nos arquivos, é decodificado e contado uma vez.
    imagens: CacheDeImagens = new Map(),
    imagensContadas = new Set<string>(),
    // A geometria vai copiada para os lotes: o arquivo sai da memória depois do último nó que o
    // usa (os caminhos, um arquivo por caminho, ficavam todos juntos até o fim).
    usosRestantes = new Map<string, number>(),
    materializacao = new Map<string, number>(),
    // As peças do relevo esperam a região inteira para virar uma malha com atlas.
    relevos = new Map<string, { matriz: Matrix4; pecas: PecaDoRelevo[] }>()
  for (const n of cena.nos) usosRestantes.set(n.arquivo, (usosRestantes.get(n.arquivo) ?? 0) + 1)
  let memoriaDosModelos = 0,
    memoriaDosLotes = 0,
    numero = 0
  const conferirMemoria = (extra = 0) => {
    if (
      memoriaDosModelos + (memoriaDosLotes + extra) * 3 >
      LIMITES_DA_EXPORTACAO.malha.bytesDaFonte
    )
      throw Error('A junção excede o orçamento de memória. Divida a região ou exporte sem juntar.')
  }
  const adicionarAoGrupo = (
    chave: string,
    material: Material,
    matriz: Matrix4,
    fonte: { geometria: BufferGeometry; matriz: Matrix4 },
    entidade: string | null,
  ) => {
    conferirMemoria(bytesDaParteParaJuncao(fonte.geometria))
    let grupo = grupos.get(chave)
    if (!grupo) {
      if (grupos.size >= 8192)
        throw Error('A junção exige lotes demais. Divida a região de exportação.')
      grupo = { lote: new LoteEstaticoCompilado(), material, matriz }
      grupos.set(chave, grupo)
    }
    const anterior = grupo.lote.bytesDeEntrada
    grupo.lote.adicionar(fonte, entidade)
    memoriaDosLotes += grupo.lote.bytesDeEntrada - anterior
    conferirMemoria()
  }
  try {
    for (const [i, no] of cena.nos.entries()) {
      const restam = usosRestantes.get(no.arquivo)! - 1
      usosRestantes.set(no.arquivo, restam)
      try {
        sinal.throwIfAborted()
        opcoes.progresso?.({
          etapa: 'geometria',
          feitos: i,
          total: cena.nos.length,
          nome: 'Juntando peças estáticas',
        })
        if (no.efeito || no.preservarHierarquia || no.faixas || preservados.has(no.arquivo)) {
          nos.push(no)
          continue
        }
        let modelo = modelos.get(no.arquivo)
        if (!modelo) {
          const bytes = entrada.arquivos.get(no.arquivo)!,
            r = inspecionarGlbDaCompilacao(bytes)
          if (r.animavel) {
            preservados.add(no.arquivo)
            nos.push(no)
            continue
          }
          memoriaDosModelos +=
            r.bytesDeMaterializacao + (await pixelsDasImagensNovas(r.imagens, imagensContadas))
          materializacao.set(no.arquivo, r.bytesDeMaterializacao)
          if (memoriaDosModelos + memoriaDosLotes * 3 > LIMITES_DA_EXPORTACAO.malha.bytesDaFonte)
            throw Error(
              'Os modelos excedem a memória disponível para juntar. Divida a região de exportação.',
            )
          modelo = await lerGlb(bytes.slice().buffer, { imagens })
          modelos.set(no.arquivo, modelo)
          sinal.throwIfAborted()
        }
        if (modelo.partes.some((p) => p.material.transparent)) {
          nos.push(no)
          continue
        }
        const centro = {
            x: (no.volume.min.x + no.volume.max.x) / 2,
            z: (no.volume.min.z + no.volume.max.z) / 2,
          },
          coluna = Math.floor(centro.x / tamanho),
          linha = Math.floor(centro.z / tamanho),
          matriz = new Matrix4().makeTranslation(
            (coluna + 0.5) * tamanho,
            0,
            (linha + 0.5) * tamanho,
          ),
          relativa = matriz.clone().invert().multiply(new Matrix4().fromArray(no.matriz))
        const [unica] = modelo.partes
        if (metadados.get(no.arquivo)?.papel === 'terreno' && modelo.partes.length === 1 && unica) {
          // Peça do relevo com o chão assado: guarda até a região completar (atlas depois do laço).
          const matrizDaPeca = relativa.clone().multiply(unica.matriz),
            chao = materialDoAtlas(unica.material)
              ? uvSegueOChao(unica.geometria, matrizDaPeca)
              : null
          if (chao && materialDoAtlas(unica.material)) {
            const chaveDaRegiao = `${coluna}/${linha}`,
              geometria = unica.geometria.clone()
            let regiao = relevos.get(chaveDaRegiao)
            if (!regiao) {
              regiao = { matriz, pecas: [] }
              relevos.set(chaveDaRegiao, regiao)
            }
            regiao.pecas.push({
              geometria,
              matriz: matrizDaPeca,
              material: unica.material,
              entidade: no.entidade,
              chao,
            })
            memoriaDosLotes += bytesDaParteParaJuncao(geometria)
            conferirMemoria()
            await cederDuranteCompilacao(sinal)
            continue
          }
        }
        for (const p of modelo.partes)
          adicionarAoGrupo(
            `${coluna}/${linha}/${p.material.uuid}/${layoutDaParteEstatica(p.geometria)}`,
            p.material,
            matriz,
            { geometria: p.geometria, matriz: relativa.clone().multiply(p.matriz) },
            no.entidade,
          )
        await cederDuranteCompilacao(sinal)
      } finally {
        const modelo = restam === 0 ? modelos.get(no.arquivo) : undefined
        if (modelo) {
          // As imagens seguem no cache (outros arquivos as dividem): sai só a geometria.
          modelo.descartar()
          modelos.delete(no.arquivo)
          memoriaDosModelos -= materializacao.get(no.arquivo) ?? 0
        }
      }
    }
    for (const [chave, regiao] of relevos) {
      sinal.throwIfAborted()
      const [primeira] = regiao.pecas
      if (!primeira) continue
      const assinatura = assinaturaDoAtlas(primeira.material),
        layout = layoutDaParteEstatica(primeira.geometria),
        plano = regiao.pecas.every(
          (p) =>
            assinaturaDoAtlas(p.material) === assinatura &&
            layoutDaParteEstatica(p.geometria) === layout,
        )
          ? planejarAtlasDoRelevo(
              regiao.pecas.map((p) => ({ ...p.chao, lado: ladoDoMapa(p.material) })),
            )
          : null
      let material: MeshStandardMaterial | undefined
      if (plano) {
        const lado = ladoDoMapa(primeira.material),
          pixels = regiao.pecas.map((p) => {
            const r = pixelsDaTexturaCompilada(p.material.map!, sinal)
            if (r.largura !== lado || r.altura !== lado || r.flipY)
              throw Error('A textura de uma peça do relevo mudou durante a junção.')
            return r.pixels
          }),
          atlas = comporAtlasDoRelevo(plano, pixels, lado),
          base = primeira.material.map!,
          mapa = new DataTexture(atlas, plano.largura, plano.altura, RGBAFormat)
        memoriaDosLotes += atlas.byteLength
        conferirMemoria()
        mapa.colorSpace = SRGBColorSpace
        mapa.flipY = false
        mapa.wrapS = base.wrapS
        mapa.wrapT = base.wrapT
        mapa.magFilter = base.magFilter
        mapa.minFilter = base.minFilter
        mapa.generateMipmaps = base.generateMipmaps
        mapa.needsUpdate = true
        material = primeira.material.clone()
        material.map = mapa
        for (const [i, p] of regiao.pecas.entries())
          levarUvAoAtlas(p.geometria, plano.celulas[i]!, plano)
      }
      for (const p of regiao.pecas) {
        memoriaDosLotes -= bytesDaParteParaJuncao(p.geometria)
        // Sem atlas (peça sozinha na região, ou fora da grade), cada uma segue como antes.
        adicionarAoGrupo(
          material
            ? `${chave}/relevo/${layout}`
            : `${chave}/${p.material.uuid}/${layoutDaParteEstatica(p.geometria)}`,
          material ?? p.material,
          regiao.matriz,
          { geometria: p.geometria, matriz: p.matriz },
          p.entidade,
        )
        p.geometria.dispose()
      }
      regiao.pecas.length = 0
      await cederDuranteCompilacao(sinal)
    }
    relevos.clear()
    for (const g of grupos.values()) {
      sinal.throwIfAborted()
      const partes = g.lote.finalizar()
      try {
        for (const p of partes) {
          while (
            ids.has(`lote-estatico-${numero}`) ||
            entrada.arquivos.has(`lotes/lote-${numero}.glb`)
          )
            numero++
          if (nos.length >= 32768) throw Error('A cena unida excede o limite de nós.')
          const m = new Mesh(p.geometria, g.material)
          m.name = 'lote'
          const a = await gravarGlbCompilado(
              m,
              `lotes/lote-${numero}.glb`,
              'modelo',
              arquivos,
              sinal,
            ),
            volume = new Box3().setFromObject(m).applyMatrix4(g.matriz),
            id = `lote-estatico-${numero++}`
          ids.add(id)
          nos.push({
            id,
            entidade: null,
            arquivo: a.caminho,
            matriz: g.matriz.elements.slice(),
            volume: volumeDaCaixa(volume),
            faixas: p.faixas,
          })
          await cederDuranteCompilacao(sinal)
        }
      } finally {
        for (const p of partes) p.geometria.dispose()
        memoriaDosLotes -= g.lote.bytesDeEntrada
        g.lote.descartar()
      }
    }
    const usados = new Set([...nos, ...cena.colisoes].map((n) => n.arquivo))
    for (const t of cena.texturas) usados.add(t.arquivo)
    if (cena.terreno) {
      usados.add(cena.terreno.alturas)
      usados.add(cena.terreno.pngAlturas)
      if (cena.terreno.buracos) usados.add(cena.terreno.buracos)
    }
    for (const caminho of usados)
      if (!arquivos.arquivos.has(caminho)) {
        const a = metadados.get(caminho),
          bytes = entrada.arquivos.get(caminho)
        if (!a || !bytes) throw Error('A junção perdeu uma dependência da cena.')
        const { caminho: _, digest: __, bytes: ___, ...meta } = a
        await arquivos.adicionar(caminho, bytes, meta)
        await cederDuranteCompilacao(sinal)
      }
    const resultado = await conferirConteudoCompilado(
      {
        ...cena,
        nos,
        arquivos: arquivos
          .descrever()
          .sort((a, b) => (a.caminho < b.caminho ? -1 : a.caminho > b.caminho ? 1 : 0)),
      },
      arquivos.arquivos,
      sinal,
    )
    opcoes.progresso?.({
      etapa: 'geometria',
      feitos: cena.nos.length,
      total: cena.nos.length,
      nome: 'Peças estáticas reunidas',
    })
    sinal.throwIfAborted()
    return { cena: resultado.cena, arquivos: new Map(arquivos.arquivos) }
  } finally {
    for (const r of relevos.values()) for (const p of r.pecas) p.geometria.dispose()
    for (const g of grupos.values()) g.lote.descartar()
    for (const m of modelos.values()) m.descartar()
    imagens.clear()
    arquivos.descartar()
  }
}
