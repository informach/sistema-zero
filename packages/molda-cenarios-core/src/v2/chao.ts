import type {
  BaseDeCenario,
  DocumentoDeCenario,
  InstanciaDeCenario,
  Transformacao,
} from './documento'
import { transformarVolume } from './volume'

type BaseComModelos = Pick<DocumentoDeCenario, 'base'> &
  Partial<Pick<DocumentoDeCenario, 'modelos'>>
type ObjetoComModelo = Pick<InstanciaDeCenario, 'transformacao' | 'apoio'> &
  Partial<Pick<InstanciaDeCenario, 'modelo'>>

function elevacaoDoVolume(doc: BaseComModelos, o: ObjetoComModelo): number {
  if (o.apoio.tipo !== 'terreno' || o.apoio.referencia !== 'volume') return 0
  const volume = doc.modelos?.find((m) => m.id === o.modelo)?.volume
  if (!volume) return 0
  return -transformarVolume(volume, { ...o.transformacao, posicao: { x: 0, y: 0, z: 0 } }).min.y
}

/**
 * Altura do chão num ponto. No chão plano é sempre zero. A base `perfil` (relevo calculado por
 * um jogo) também responde zero aqui: o relevo de verdade só existe depois da conversão em
 * terreno, e até lá o cenário abre sobre o plano.
 */
export function alturaDoChao(_base: BaseDeCenario, _x: number, _z: number): number {
  return 0
}

/** Onde o objeto fica no mundo, resolvendo o apoio. É o que o palco desenha e o que se exporta. */
export function posicaoNoMundo(
  doc: BaseComModelos,
  o: ObjetoComModelo,
): { x: number; y: number; z: number } {
  const p = o.transformacao.posicao
  if (o.apoio.tipo === 'terreno')
    return {
      x: p.x,
      y: alturaDoChao(doc.base, p.x, p.z) + o.apoio.deslocamento + elevacaoDoVolume(doc, o),
      z: p.z,
    }
  return { x: p.x, y: p.y, z: p.z }
}

/**
 * O que gravar depois de um gesto que deixou o objeto em `mundo` (coordenadas de mundo).
 * Quem pisa no chão guarda a distância até ele, para acompanhar o terreno quando ele mudar.
 */
export function alteracoesDoGesto(
  doc: BaseComModelos,
  o: Pick<InstanciaDeCenario, 'apoio'> &
    Partial<Pick<InstanciaDeCenario, 'modelo' | 'transformacao'>>,
  mundo: Transformacao,
): Pick<InstanciaDeCenario, 'transformacao' | 'apoio'> {
  if (o.apoio.tipo !== 'terreno') return { transformacao: mundo, apoio: o.apoio }
  const chao = alturaDoChao(doc.base, mundo.posicao.x, mundo.posicao.z)
  const mantemApoio =
    o.apoio.referencia === 'volume' &&
    o.transformacao &&
    Math.abs(posicaoNoMundo(doc, { ...o, transformacao: o.transformacao }).y - mundo.posicao.y) <
      1e-6
  const deslocamento = mantemApoio
    ? o.apoio.deslocamento
    : Math.round(
        (mundo.posicao.y - chao - elevacaoDoVolume(doc, { ...o, transformacao: mundo })) * 1000,
      ) / 1000
  return {
    transformacao: { ...mundo, posicao: { ...mundo.posicao, y: chao + deslocamento } },
    apoio: { ...o.apoio, deslocamento },
  }
}
