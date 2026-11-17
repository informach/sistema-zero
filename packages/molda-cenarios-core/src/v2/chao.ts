import { CenarioInvalido } from '../validacao'
import type {
  BaseDeCenario,
  DocumentoDeCenario,
  InstanciaDeCenario,
  Transformacao,
} from './documento'
import { type FonteDeAlturas, PecaDeTerrenoAusente } from './terreno'
import { destransformarPonto, transformarPonto, transformarVolume } from './volume'

type BaseComModelos = Pick<DocumentoDeCenario, 'base'> &
  Partial<Pick<DocumentoDeCenario, 'modelos' | 'instancias'>>
type ObjetoComModelo = Pick<InstanciaDeCenario, 'transformacao' | 'apoio'> &
  Partial<Pick<InstanciaDeCenario, 'modelo'>>

function elevacaoDoVolume(doc: BaseComModelos, o: ObjetoComModelo): number {
  if (
    !(o.apoio.tipo === 'terreno' && o.apoio.referencia === 'volume') &&
    !(o.apoio.tipo === 'objeto' && o.apoio.contato)
  )
    return 0
  const volume = doc.modelos?.find((m) => m.id === o.modelo)?.volume
  if (!volume) return 0
  return -transformarVolume(volume, { ...o.transformacao, posicao: { x: 0, y: 0, z: 0 } }).min.y
}

/**
 * Altura do chão num ponto. No chão plano é sempre zero. A base `perfil` (relevo calculado por
 * um jogo) também responde zero aqui: o relevo de verdade só existe depois da conversão em
 * terreno, e até lá o cenário abre sobre o plano.
 */
export function alturaDoChao(
  base: BaseDeCenario,
  x: number,
  z: number,
  fonte?: FonteDeAlturas,
): number {
  if (base.tipo === 'terreno') {
    if (!fonte) throw new PecaDeTerrenoAusente('O relevo ainda não foi carregado')
    return fonte(x, z)
  }
  return 0
}

/** Onde o objeto fica no mundo, resolvendo o apoio. É o que o palco desenha e o que se exporta. */
export function posicaoNoMundo(
  doc: BaseComModelos,
  o: ObjetoComModelo,
  fonte?: FonteDeAlturas,
  cadeia: readonly string[] = [],
): { x: number; y: number; z: number } {
  const p = o.transformacao.posicao
  if (o.apoio.tipo === 'terreno')
    return {
      x: p.x,
      y: alturaDoChao(doc.base, p.x, p.z, fonte) + o.apoio.deslocamento + elevacaoDoVolume(doc, o),
      z: p.z,
    }
  if (o.apoio.tipo === 'objeto' && o.apoio.contato) {
    const suporte = suporteDoObjeto(doc, o.apoio.objeto)
    if (cadeia.length >= 64 || cadeia.includes(o.apoio.objeto))
      throw new CenarioInvalido(['Ciclo de apoios'])
    const t = {
      ...suporte.transformacao,
      posicao: posicaoNoMundo(doc, suporte, fonte, [...cadeia, o.apoio.objeto]),
    }
    const q = transformarPonto(refletirContato(doc, suporte, o.apoio.contato), t)
    return { x: q.x, y: q.y + o.apoio.deslocamento + elevacaoDoVolume(doc, o), z: q.z }
  }
  return { x: p.x, y: p.y, z: p.z }
}

function suporteDoObjeto(doc: BaseComModelos, id: string) {
  const suporte = doc.instancias?.find((o) => o.id === id)
  if (!suporte) throw new CenarioInvalido([`Apoio ausente: ${id}`])
  return suporte
}

/** Reflexão é a própria inversa. O contato permanece no espaço original do GLB. */
function refletirContato(
  doc: BaseComModelos,
  suporte: InstanciaDeCenario,
  ponto: { x: number; y: number; z: number },
) {
  const volume = doc.modelos?.find((m) => m.id === suporte.modelo)?.volume
  if (suporte.espelho && Object.values(suporte.espelho).some(Boolean) && !volume)
    throw new CenarioInvalido(['Confira as medidas da superfície espelhada'])
  const q = { ...ponto }
  for (const e of ['x', 'y', 'z'] as const)
    if (suporte.espelho?.[e] && volume) q[e] = volume.min[e] + volume.max[e] - q[e]
  return q
}

export function apoioNaSuperficie(
  doc: BaseComModelos,
  id: string,
  ponto: { x: number; y: number; z: number },
  fonte?: FonteDeAlturas,
): InstanciaDeCenario['apoio'] {
  const suporte = suporteDoObjeto(doc, id)
  const t = { ...suporte.transformacao, posicao: posicaoNoMundo(doc, suporte, fonte) }
  return {
    tipo: 'objeto',
    objeto: id,
    deslocamento: 0,
    contato: refletirContato(doc, suporte, destransformarPonto(ponto, t)),
  }
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
  fonte?: FonteDeAlturas,
): Pick<InstanciaDeCenario, 'transformacao' | 'apoio'> {
  if (o.apoio.tipo === 'objeto' && o.apoio.contato && o.transformacao) {
    const atual = posicaoNoMundo(doc, { ...o, transformacao: o.transformacao }, fonte)
    const mesmaPosicao =
      Math.hypot(atual.x - mundo.posicao.x, atual.y - mundo.posicao.y, atual.z - mundo.posicao.z) <
      1e-6
    if (mesmaPosicao) return { transformacao: mundo, apoio: o.apoio }
    const q = {
      ...mundo.posicao,
      y:
        atual.y -
        elevacaoDoVolume(doc, { ...o, transformacao: o.transformacao }) -
        o.apoio.deslocamento,
    }
    const apoio = apoioNaSuperficie(doc, o.apoio.objeto, q, fonte)
    if (apoio.tipo !== 'objeto') throw new CenarioInvalido(['Superfície inválida'])
    return {
      transformacao: mundo,
      apoio: {
        ...apoio,
        deslocamento: mundo.posicao.y - q.y - elevacaoDoVolume(doc, { ...o, transformacao: mundo }),
      },
    }
  }
  if (o.apoio.tipo !== 'terreno') return { transformacao: mundo, apoio: o.apoio }
  const chao = alturaDoChao(doc.base, mundo.posicao.x, mundo.posicao.z, fonte)
  const mantemApoio =
    o.apoio.referencia === 'volume' &&
    o.transformacao &&
    Math.abs(
      posicaoNoMundo(doc, { ...o, transformacao: o.transformacao }, fonte).y - mundo.posicao.y,
    ) < 1e-6
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
