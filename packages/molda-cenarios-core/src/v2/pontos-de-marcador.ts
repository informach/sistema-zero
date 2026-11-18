import { CenarioInvalido } from '../validacao'
import { alturaDoChao } from './chao'
import type { DocumentoDeCenario, MarcadorDeCenario, Transformacao } from './documento'
import { pontoDoMarcador, pontoLocalDoMarcador, transformacaoDoMarcador } from './marcadores'
import { ConfiguracaoDeMarcadorSchema } from './marcadores-schema'
import type { FonteDeAlturas } from './terreno'

type Ponto = Transformacao['posicao']
type Base = Pick<DocumentoDeCenario, 'base'>

/** Controles autorais no mundo; a rota amostrada continua sendo uma consulta distinta. */
export function controlesDoMarcador(
  doc: Base,
  m: MarcadorDeCenario,
  fonte?: FonteDeAlturas,
): Ponto[] {
  const c = m.configuracao
  if (c?.tipo === 'zona' && c.forma.tipo === 'poligono')
    return c.forma.pontos.map((p) => pontoDoMarcador(doc, m, { ...p, y: 0 }, fonte))
  if (c?.tipo !== 'rota') throw new CenarioInvalido(['Escolha uma rota ou zona poligonal.'])
  const raiz = c.seguirTerreno ? alturaDoChao(doc.base, m.posicao.x, m.posicao.z, fonte) : 0
  return c.pontos.map((p) => {
    const q = pontoDoMarcador(doc, m, p, fonte)
    if (c.seguirTerreno) q.y += alturaDoChao(doc.base, q.x, q.z, fonte) - raiz
    return q
  })
}

/** Converte a edição comum de alças de volta a dados locais, sem mover a raiz. */
export function configuracaoDosControles(
  doc: Base,
  m: MarcadorDeCenario,
  pontos: readonly Ponto[],
  fonte?: FonteDeAlturas,
) {
  const c = m.configuracao
  if (pontos.length > 512) throw new CenarioInvalido(['Há controles demais neste marcador.'])
  if (c?.tipo === 'zona' && c.forma.tipo === 'poligono') {
    const y = transformacaoDoMarcador(doc, m, fonte).posicao.y
    if (pontos.some((p) => Math.abs(p.y - y) > 1e-4))
      throw new CenarioInvalido(['Os controles da zona precisam ficar no plano da sua base.'])
    return ConfiguracaoDeMarcadorSchema.parse({
      ...c,
      forma: {
        ...c.forma,
        pontos: pontos.map((p) => {
          const q = pontoLocalDoMarcador(doc, m, p, fonte)
          return { x: q.x, z: q.z }
        }),
      },
    })
  }
  if (c?.tipo !== 'rota') throw new CenarioInvalido(['Escolha uma rota ou zona poligonal.'])
  const raiz = c.seguirTerreno ? alturaDoChao(doc.base, m.posicao.x, m.posicao.z, fonte) : 0
  return ConfiguracaoDeMarcadorSchema.parse({
    ...c,
    pontos: pontos.map((p) => {
      const q = { ...p }
      if (c.seguirTerreno) q.y -= alturaDoChao(doc.base, p.x, p.z, fonte) - raiz
      return pontoLocalDoMarcador(doc, m, q, fonte)
    }),
  })
}
