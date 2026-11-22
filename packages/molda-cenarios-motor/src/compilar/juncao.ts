import {
  type CenaCompilada,
  calcularPertencaDasRegioes,
  entidadesComPropriedades,
  LIMITES_DA_EXPORTACAO,
  type PacoteCompilado,
  regioesQueOVolumeToca,
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
import { assinaturaDoMaterial } from './assinatura-do-material'
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
/** Um pedaço do mar compilado esperando o fim do laço (`chao` só quando tem pintura própria). */
interface PecaDoMar {
  no: CenaCompilada['nos'][number]
  geometria: BufferGeometry
  /** Posição no mundo (a do nó vezes a da parte). */
  matriz: Matrix4
  material: MeshStandardMaterial
  chao: { minX: number; minZ: number; largura: number; profundidade: number } | null
}
function ladoDoMapa(m: MeshStandardMaterial) {
  const img = m.map?.image as { width?: number; height?: number; naturalWidth?: number } | null
  return img?.naturalWidth ?? img?.width ?? 0
}
/** A textura cabe num ladrilho: quadrada, sRGB, sem inverter nem repetir. */
function mapaDoAtlas(s: MeshStandardMaterial) {
  const mapa = s.map
  if (!mapa) return false
  const img = mapa.image as { width?: number; height?: number; naturalHeight?: number } | null,
    lado = ladoDoMapa(s)
  if (!lado || lado !== (img?.naturalHeight ?? img?.height)) return false
  if (mapa.flipY || mapa.colorSpace !== SRGBColorSpace || mapa.channel !== 0) return false
  return !(
    mapa.repeat.x !== 1 ||
    mapa.repeat.y !== 1 ||
    mapa.offset.x ||
    mapa.offset.y ||
    mapa.rotation
  )
}
/** Nenhum outro mapa que dependa do UV (ele muda de lugar no atlas). */
const semOutrosMapas = (s: MeshStandardMaterial) => MAPAS_QUE_USAM_UV.every((k) => !s[k])
/** Só o chão assado entra no atlas do relevo. */
function materialDoAtlas(m: Material): m is MeshStandardMaterial {
  const s = m as MeshStandardMaterial
  return (
    Boolean(s.isMeshStandardMaterial) &&
    !s.transparent &&
    !s.alphaTest &&
    mapaDoAtlas(s) &&
    semOutrosMapas(s)
  )
}
/** O mar compilado: translúcido, com a pintura do fundo (setor junto à ilha) ou de cor lisa
 * (faixa de mar aberto). O efeito dinâmico do runtime não lê o UV do mar (a onda segue o mundo). */
function materialDoMar(m: Material): m is MeshStandardMaterial {
  const s = m as MeshStandardMaterial
  return (
    Boolean(s.isMeshStandardMaterial) &&
    !s.alphaTest &&
    semOutrosMapas(s) &&
    (!s.map || mapaDoAtlas(s))
  )
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
const assinaturaDoMar = (m: MeshStandardMaterial) =>
  JSON.stringify([assinaturaDoAtlas(m), Boolean(m.map), m.transparent, m.depthWrite, m.name])

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
      {
        lote: LoteEstaticoCompilado
        material: Material
        matriz: Matrix4
        /** Lote do mar: sai como água (efeito e entidade), sem faixas. */
        agua?: string
      }
    >(),
    nos: CenaCompilada['nos'] = [],
    // Com regiões (lote 5 da conclusão, 22/11/2026): o objeto com propriedades fica fora dos lotes
    // (o estado dele nunca descarrega) e um lote só junta peças das MESMAS regiões. Sem regiões,
    // nada disto muda o pacote.
    comPropriedades = cena.regioes ? entidadesComPropriedades(cena.entidades) : new Set<string>(),
    assinaturaDasRegioes = (volume: CenaCompilada['nos'][number]['volume']) =>
      cena.regioes ? `${regioesQueOVolumeToca(cena.regioes, volume).join(',')}|` : '',
    ids = new Set(cena.nos.map((n) => n.id)),
    ordemDosNos = new Map(cena.nos.map((no, i) => [no.id, i])),
    metadados = new Map(cena.arquivos.map((a) => [a.caminho, a])),
    // O atlas de um kit, repetido nos arquivos, é decodificado e contado uma vez.
    imagens: CacheDeImagens = new Map(),
    // Materiais que desenham igual (o mesmo atlas em vários modelos) dividem o lote da região.
    chavesDosMateriais = new WeakMap<Material, string>(),
    imagensContadas = new Set<string>(),
    // A geometria vai copiada para os lotes: o arquivo sai da memória depois do último nó que o
    // usa (os caminhos, um arquivo por caminho, ficavam todos juntos até o fim).
    usosRestantes = new Map<string, number>(),
    materializacao = new Map<string, number>(),
    // As peças do relevo esperam a região inteira para virar uma malha com atlas.
    relevos = new Map<string, { matriz: Matrix4; pecas: PecaDoRelevo[] }>(),
    // Os pedaços do mar esperam o fim do laço: as faixas lisas se juntam no mar inteiro, os
    // setores pintados por região (atlas, como o relevo).
    maresDaCena = new Set(cena.aguas.filter((a) => a.tipo === 'mar').map((a) => a.id)),
    mares = new Map<string, PecaDoMar[]>(),
    // Os pixels de cada atlas existem uma vez só (o ×3 da conta é das cópias da geometria) e
    // saem da conta quando o lote dele é gravado.
    atlasDoMaterial = new Map<Material, { bytes: number; mapa: DataTexture }>()
  for (const n of cena.nos) usosRestantes.set(n.arquivo, (usosRestantes.get(n.arquivo) ?? 0) + 1)
  let memoriaDosModelos = 0,
    memoriaDosLotes = 0,
    memoriaDosAtlas = 0,
    maiorLote = 0,
    numero = 0
  // Até o fim do laço cada lote guarda só a sua entrada. A gravação finaliza um lote por vez, e
  // só esse ganha as duas cópias de passagem (unida e dividida): a reserva é a entrada de todos
  // mais duas vezes o maior lote, não três vezes a soma (que recusava uma ilha inteira).
  const reservaDosLotes = (extra = 0, lote = 0) =>
    memoriaDosLotes + extra + 2 * Math.max(maiorLote, lote + extra)
  const conferirMemoria = (extra = 0, lote = 0) => {
    if (
      memoriaDosModelos + memoriaDosAtlas + reservaDosLotes(extra, lote) >
      LIMITES_DA_EXPORTACAO.malha.bytesDaFonte
    )
      throw Error('A junção excede o orçamento de memória. Divida a região ou exporte sem juntar.')
  }
  const chaveDoMaterial = (m: Material) => {
    let chave = chavesDosMateriais.get(m)
    if (chave === undefined) {
      chave = assinaturaDoMaterial(m) ?? m.uuid
      chavesDosMateriais.set(m, chave)
    }
    return chave
  }
  const adicionarAoGrupo = (
    chave: string,
    material: Material,
    matriz: Matrix4,
    fonte: { geometria: BufferGeometry; matriz: Matrix4 },
    entidade: string | null,
    agua?: string,
  ) => {
    let grupo = grupos.get(chave)
    conferirMemoria(bytesDaParteParaJuncao(fonte.geometria), grupo?.lote.bytesDeEntrada ?? 0)
    if (!grupo) {
      if (grupos.size >= 8192)
        throw Error('A junção exige lotes demais. Divida a região de exportação.')
      grupo = { lote: new LoteEstaticoCompilado(), material, matriz, ...(agua ? { agua } : {}) }
      grupos.set(chave, grupo)
    }
    const anterior = grupo.lote.bytesDeEntrada
    grupo.lote.adicionar(fonte, entidade)
    memoriaDosLotes += grupo.lote.bytesDeEntrada - anterior
    maiorLote = Math.max(maiorLote, grupo.lote.bytesDeEntrada)
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
        const doMar =
          no.efeito === 'agua' &&
          no.entidade !== null &&
          maresDaCena.has(no.entidade) &&
          metadados.get(no.arquivo)?.papel === 'agua'
        if (
          (no.efeito && !doMar) ||
          no.preservarHierarquia ||
          no.faixas ||
          preservados.has(no.arquivo) ||
          (no.entidade !== null && comPropriedades.has(no.entidade))
        ) {
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
          if (
            memoriaDosModelos + memoriaDosAtlas + reservaDosLotes() >
            LIMITES_DA_EXPORTACAO.malha.bytesDaFonte
          )
            throw Error(
              'Os modelos excedem a memória disponível para juntar. Divida a região de exportação.',
            )
          modelo = await lerGlb(bytes.slice().buffer, { imagens })
          modelos.set(no.arquivo, modelo)
          sinal.throwIfAborted()
        }
        if (doMar) {
          const [parte] = modelo.partes
          if (modelo.partes.length !== 1 || !parte || !materialDoMar(parte.material)) {
            nos.push(no)
            continue
          }
          const matriz = new Matrix4().fromArray(no.matriz).multiply(parte.matriz),
            chao = parte.material.map ? uvSegueOChao(parte.geometria, matriz) : null
          if (parte.material.map && !chao) {
            nos.push(no)
            continue
          }
          const geometria = parte.geometria.clone(),
            lista = mares.get(no.entidade!) ?? []
          lista.push({ no, geometria, matriz, material: parte.material, chao })
          mares.set(no.entidade!, lista)
          memoriaDosLotes += bytesDaParteParaJuncao(geometria)
          conferirMemoria()
          await cederDuranteCompilacao(sinal)
          continue
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
            const chaveDaRegiao = `${assinaturaDasRegioes(no.volume)}${coluna}/${linha}`,
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
            `${assinaturaDasRegioes(no.volume)}${coluna}/${linha}/${chaveDoMaterial(p.material)}/${layoutDaParteEstatica(p.geometria)}`,
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
    /** Junta as texturas de peças vizinhas num atlas e leva o UV de cada uma ao seu ladrilho.
     * Sem grade (ou com materiais diferentes), nada muda e devolve `undefined`. */
    const materialComAtlas = (
      pecas: readonly {
        geometria: BufferGeometry
        material: MeshStandardMaterial
        chao: { minX: number; minZ: number; largura: number; profundidade: number }
      }[],
      assinar: (m: MeshStandardMaterial) => string,
    ) => {
      const [primeira] = pecas
      if (!primeira) return undefined
      const assinatura = assinar(primeira.material),
        layout = layoutDaParteEstatica(primeira.geometria),
        plano = pecas.every(
          (p) =>
            assinar(p.material) === assinatura && layoutDaParteEstatica(p.geometria) === layout,
        )
          ? planejarAtlasDoRelevo(pecas.map((p) => ({ ...p.chao, lado: ladoDoMapa(p.material) })))
          : null
      if (!plano) return undefined
      const lado = ladoDoMapa(primeira.material),
        pixels = pecas.map((p) => {
          const r = pixelsDaTexturaCompilada(p.material.map!, sinal)
          if (r.largura !== lado || r.altura !== lado || r.flipY)
            throw Error('A textura de uma peça mudou durante a junção.')
          return r.pixels
        }),
        atlas = comporAtlasDoRelevo(plano, pixels, lado),
        base = primeira.material.map!,
        mapa = new DataTexture(atlas, plano.largura, plano.altura, RGBAFormat)
      memoriaDosAtlas += atlas.byteLength
      conferirMemoria()
      mapa.colorSpace = SRGBColorSpace
      mapa.flipY = false
      mapa.wrapS = base.wrapS
      mapa.wrapT = base.wrapT
      mapa.magFilter = base.magFilter
      mapa.minFilter = base.minFilter
      mapa.generateMipmaps = base.generateMipmaps
      mapa.needsUpdate = true
      const material = primeira.material.clone()
      material.map = mapa
      for (const [i, p] of pecas.entries()) levarUvAoAtlas(p.geometria, plano.celulas[i]!, plano)
      atlasDoMaterial.set(material, { bytes: atlas.byteLength, mapa })
      return { material, layout }
    }
    for (const [chave, regiao] of relevos) {
      sinal.throwIfAborted()
      const unido = materialComAtlas(regiao.pecas, assinaturaDoAtlas),
        material = unido?.material,
        layout = unido?.layout
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
    for (const [entidade, pecas] of mares) {
      sinal.throwIfAborted()
      const conjuntos = new Map<string, { matriz: Matrix4; pecas: PecaDoMar[] }>()
      for (const p of pecas) {
        // Faixa lisa: o mar inteiro numa malha (as faixas cobrem o mar aberto em volta de tudo).
        // Setor pintado: a região dele, como o relevo, para o atlas caber.
        const coluna = p.chao ? Math.floor((p.chao.minX + p.chao.largura / 2) / tamanho) : 0,
          linha = p.chao ? Math.floor((p.chao.minZ + p.chao.profundidade / 2) / tamanho) : 0,
          chave = `${p.chao ? `${coluna}/${linha}` : 'aberto'}/${assinaturaDoMar(p.material)}/${layoutDaParteEstatica(p.geometria)}`
        let conjunto = conjuntos.get(chave)
        if (!conjunto) {
          conjunto = {
            matriz: p.chao
              ? new Matrix4().makeTranslation((coluna + 0.5) * tamanho, 0, (linha + 0.5) * tamanho)
              : new Matrix4(),
            pecas: [],
          }
          conjuntos.set(chave, conjunto)
        }
        conjunto.pecas.push(p)
      }
      for (const [chave, conjunto] of conjuntos) {
        const [primeira] = conjunto.pecas,
          pintadas = conjunto.pecas.filter(
            (p): p is PecaDoMar & { chao: NonNullable<PecaDoMar['chao']> } => p.chao !== null,
          )
        const material =
          !primeira || conjunto.pecas.length < 2
            ? undefined
            : pintadas.length === conjunto.pecas.length
              ? materialComAtlas(pintadas, assinaturaDoMar)?.material
              : pintadas.length === 0
                ? primeira.material
                : undefined
        const inversa = conjunto.matriz.clone().invert()
        for (const p of conjunto.pecas) {
          memoriaDosLotes -= bytesDaParteParaJuncao(p.geometria)
          // Pedaço sozinho, ou fora da grade: o nó original segue como estava.
          if (material)
            adicionarAoGrupo(
              `agua/${entidade}/${chave}`,
              material,
              conjunto.matriz,
              { geometria: p.geometria, matriz: inversa.clone().multiply(p.matriz) },
              entidade,
              entidade,
            )
          else nos.push(p.no)
          p.geometria.dispose()
        }
        conjunto.pecas.length = 0
        await cederDuranteCompilacao(sinal)
      }
    }
    mares.clear()
    for (const g of grupos.values()) {
      sinal.throwIfAborted()
      const partes = g.lote.finalizar()
      try {
        const caminho = (n: number) => (g.agua ? `lotes/agua-${n}.glb` : `lotes/lote-${n}.glb`)
        for (const p of partes) {
          while (ids.has(`lote-estatico-${numero}`) || entrada.arquivos.has(caminho(numero)))
            numero++
          if (nos.length >= 32768) throw Error('A cena unida excede o limite de nós.')
          const m = new Mesh(p.geometria, g.material)
          m.name = 'lote'
          const a = await gravarGlbCompilado(
              m,
              caminho(numero),
              g.agua ? 'agua' : 'modelo',
              arquivos,
              sinal,
            ),
            volume = new Box3().setFromObject(m).applyMatrix4(g.matriz),
            id = `lote-estatico-${numero++}`
          ids.add(id)
          nos.push(
            g.agua
              ? // O mar segue sendo o efeito da mesma água: o runtime põe nele o material vivo.
                {
                  id,
                  entidade: g.agua,
                  arquivo: a.caminho,
                  matriz: g.matriz.elements.slice(),
                  volume: volumeDaCaixa(volume),
                  efeito: 'agua',
                }
              : {
                  id,
                  entidade: null,
                  arquivo: a.caminho,
                  matriz: g.matriz.elements.slice(),
                  volume: volumeDaCaixa(volume),
                  faixas: p.faixas,
                },
          )
          await cederDuranteCompilacao(sinal)
        }
      } finally {
        for (const p of partes) p.geometria.dispose()
        memoriaDosLotes -= g.lote.bytesDeEntrada
        g.lote.descartar()
        const atlas = atlasDoMaterial.get(g.material)
        if (atlas !== undefined) {
          // O atlas já foi para o GLB: os pixels deixam de contar.
          memoriaDosAtlas -= atlas.bytes
          atlasDoMaterial.delete(g.material)
          atlas.mapa.dispose()
        }
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
    // Água sem peças suficientes para juntar volta ao fim do processamento. Conservar
    // a ordem dos nós retidos evita mudar o manifesto ao juntar o mesmo pacote de novo.
    const nosEmOrdem = nos.sort(
      (a, b) =>
        (ordemDosNos.get(a.id) ?? cena.nos.length) - (ordemDosNos.get(b.id) ?? cena.nos.length),
    )
    const resultado = await conferirConteudoCompilado(
      {
        ...cena,
        nos: nosEmOrdem,
        // Os lotes são nós novos: a pertença das regiões é calculada de novo sobre eles.
        ...(cena.regioes
          ? { regioes: calcularPertencaDasRegioes(cena.regioes, { ...cena, nos: nosEmOrdem }) }
          : {}),
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
    for (const lista of mares.values()) for (const p of lista) p.geometria.dispose()
    for (const g of grupos.values()) g.lote.descartar()
    for (const m of modelos.values()) m.descartar()
    imagens.clear()
    arquivos.descartar()
  }
}
