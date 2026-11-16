import type {
  BaseDeCenario,
  DocumentoDeCenario,
  InstanciaDeCenario,
  Transformacao,
} from './documento'

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
  doc: Pick<DocumentoDeCenario, 'base'>,
  o: Pick<InstanciaDeCenario, 'transformacao' | 'apoio'>,
): { x: number; y: number; z: number } {
  const p = o.transformacao.posicao
  if (o.apoio.tipo === 'terreno')
    return { x: p.x, y: alturaDoChao(doc.base, p.x, p.z) + o.apoio.deslocamento, z: p.z }
  return { x: p.x, y: p.y, z: p.z }
}

/**
 * O que gravar depois de um gesto que deixou o objeto em `mundo` (coordenadas de mundo).
 * Quem pisa no chão guarda a distância até ele, para acompanhar o terreno quando ele mudar.
 */
export function alteracoesDoGesto(
  doc: Pick<DocumentoDeCenario, 'base'>,
  o: Pick<InstanciaDeCenario, 'apoio'>,
  mundo: Transformacao,
): Pick<InstanciaDeCenario, 'transformacao' | 'apoio'> {
  if (o.apoio.tipo !== 'terreno') return { transformacao: mundo, apoio: o.apoio }
  const chao = alturaDoChao(doc.base, mundo.posicao.x, mundo.posicao.z)
  const deslocamento = Math.round((mundo.posicao.y - chao) * 1000) / 1000
  return {
    transformacao: { ...mundo, posicao: { ...mundo.posicao, y: chao + deslocamento } },
    apoio: { ...o.apoio, deslocamento },
  }
}
