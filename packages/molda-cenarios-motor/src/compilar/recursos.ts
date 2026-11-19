import {
  type ContextoDeLicencas,
  type FonteDaCompilacao,
  LIMITES_DA_EXPORTACAO,
  prepararCenaParaCompilacao,
} from '@sistemazero/molda-cenarios-core/compilar'
import {
  conferirImagemDeCenario,
  criarFonteDeAlturas,
  type DocumentoDeCenario,
  GLB_MAX_BYTES,
  MAX_BYTES_DE_TEXTURA_CENARIO,
  type ModeloDoCenario,
  type RecursoDeTerreno,
  type TexturaDoCenario,
  validarDocumento,
} from '@sistemazero/molda-cenarios-core/v2'
import { criarModeloDaForma } from '../formas'
import { conferirConteudoDoModelo, lerGlb, type ModeloCarregado } from '../modelos'
import { carregarPecasDeTerreno } from '../recursos-terreno'
import { lerTextura, type TexturaCarregada } from '../texturas'
import { inspecionarGlbDaCompilacao } from './inspecao-glb'

export interface ConteudoDaCompilacao {
  modelo(referencia: ModeloDoCenario, sinal: AbortSignal): Promise<ArrayBuffer>
  textura(referencia: TexturaDoCenario, sinal: AbortSignal): Promise<ArrayBuffer>
  terreno(digest: string, sinal: AbortSignal): Promise<ArrayBuffer>
}
export interface ProgressoDaCompilacao {
  etapa: 'terreno' | 'modelos' | 'texturas' | 'geometria' | 'pintura' | 'arquivos'
  feitos: number
  total: number
  nome?: string
}

/** Uma execução, com cache por hash e descarte dos recursos que ela própria carregou.
 * As portas devem ler o conteúdo autorizado da revisão; não recebem URLs do documento. */
export async function carregarRecursosDaCompilacao(
  entrada: DocumentoDeCenario,
  fonte: FonteDaCompilacao,
  contexto: ContextoDeLicencas,
  conteudo: ConteudoDaCompilacao,
  sinal: AbortSignal,
  progresso?: (p: ProgressoDaCompilacao) => void,
) {
  sinal.throwIfAborted()
  const documento = validarDocumento(entrada)
  if (documento.base.tipo === 'perfil') throw Error('Converta o relevo antes de compilar.')
  const modelos = new Map<string, ModeloCarregado>(),
    porHash = new Map<string, ModeloCarregado>(),
    texturas = new Map<string, TexturaCarregada>(),
    imagensPorHash = new Map<string, TexturaCarregada>(),
    bytesDasTexturas = new Map<string, Uint8Array>(),
    terreno = new Map<string, RecursoDeTerreno>()
  let descartado = false,
    bytesLidos = 0,
    memoriaDecodificada = 0
  const descartar = () => {
    if (descartado) return
    descartado = true
    for (const m of new Set(modelos.values())) m.descartar()
    for (const t of new Set(texturas.values())) t.descartar()
    modelos.clear()
    porHash.clear()
    texturas.clear()
    imagensPorHash.clear()
    bytesDasTexturas.clear()
    terreno.clear()
  }
  const contar = (bytes: ArrayBuffer) => {
    sinal.throwIfAborted()
    bytesLidos += bytes.byteLength
    if (bytesLidos > LIMITES_DA_EXPORTACAO.bytesDoPacote)
      throw Error('Os recursos de origem excedem o orçamento de leitura da compilação.')
    return bytes
  }
  const reservar = (bytes: number) => {
    memoriaDecodificada += bytes
    if (memoriaDecodificada > LIMITES_DA_EXPORTACAO.malha.bytesDaFonte)
      throw Error('Os modelos e texturas excedem o orçamento de memória da compilação.')
  }
  try {
    progresso?.({ etapa: 'terreno', feitos: 0, total: 1 })
    if (documento.base.tipo === 'terreno')
      for (const [hash, recurso] of await carregarPecasDeTerreno(
        documento.base,
        async (digest, s) => contar(await conteudo.terreno(digest, s)),
        sinal,
      ))
        terreno.set(hash, recurso)
    sinal.throwIfAborted()
    progresso?.({ etapa: 'terreno', feitos: 1, total: 1 })
    const alturas =
        documento.base.tipo === 'terreno'
          ? criarFonteDeAlturas(
              documento.base,
              new Map(
                [...terreno].flatMap(([h, r]) =>
                  r.tipo === 'alturas' ? [[h, r.alturas] as const] : [],
                ),
              ),
            )
          : undefined,
      preparada = prepararCenaParaCompilacao(documento, fonte, contexto, alturas)
    let feitos = 0
    for (const ref of preparada.modelos) {
      sinal.throwIfAborted()
      progresso?.({
        etapa: 'modelos',
        feitos,
        total: preparada.modelos.length,
        nome: ref.nome ?? ref.id,
      })
      let modelo = porHash.get(ref.digest)
      if (!modelo) {
        const recebido = contar(await conteudo.modelo(ref, sinal))
        if (recebido.byteLength > GLB_MAX_BYTES)
          throw Error('Um modelo excede o limite de tamanho da biblioteca.')
        const bytes = new Uint8Array(recebido).slice()
        await conferirConteudoDoModelo(bytes.buffer, ref.digest)
        sinal.throwIfAborted()
        const medidas = inspecionarGlbDaCompilacao(bytes, { fonte: true })
        reservar(medidas.bytesDeMaterializacao + medidas.bytesDePixels)
        modelo = await lerGlb(bytes.buffer)
        // Guarda imediatamente: um cancelamento após o decoder ainda descarta esta cópia.
        modelos.set(ref.id, modelo)
        porHash.set(ref.digest, modelo)
        sinal.throwIfAborted()
      }
      modelos.set(ref.id, modelo)
      feitos++
    }
    progresso?.({ etapa: 'modelos', feitos, total: preparada.modelos.length })
    for (const forma of preparada.formas) {
      sinal.throwIfAborted()
      const m = criarModeloDaForma(forma)
      modelos.set(forma.id, m)
      reservar(
        m.partes.reduce(
          (s, p) =>
            s +
            Object.values(p.geometria.attributes).reduce(
              (n, a) => n + a.count * a.itemSize * 4,
              0,
            ) +
            (p.geometria.index?.count ?? 0) * 4,
          0,
        ),
      )
    }
    feitos = 0
    for (const ref of preparada.texturas) {
      sinal.throwIfAborted()
      progresso?.({
        etapa: 'texturas',
        feitos,
        total: preparada.texturas.length,
        nome: ref.nome ?? ref.id,
      })
      let textura = imagensPorHash.get(ref.digest)
      if (!textura) {
        const recebido = contar(await conteudo.textura(ref, sinal))
        if (recebido.byteLength > MAX_BYTES_DE_TEXTURA_CENARIO)
          throw Error('Uma textura excede o limite de tamanho da biblioteca.')
        const bytes = new Uint8Array(recebido).slice(),
          mime = bytes[0] === 137 ? 'image/png' : 'image/webp',
          medidas = conferirImagemDeCenario(bytes, mime)
        reservar(medidas.largura * medidas.altura * 4)
        textura = await lerTextura(bytes.buffer, ref.digest, sinal)
        texturas.set(ref.id, textura)
        imagensPorHash.set(ref.digest, textura)
        bytesDasTexturas.set(ref.digest, bytes)
        sinal.throwIfAborted()
      }
      texturas.set(ref.id, textura)
      feitos++
    }
    progresso?.({ etapa: 'texturas', feitos, total: preparada.texturas.length })
    sinal.throwIfAborted()
    return { documento, preparada, modelos, texturas, bytesDasTexturas, terreno, descartar }
  } catch (erro) {
    descartar()
    throw erro
  }
}
