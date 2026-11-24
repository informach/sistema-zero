import { CenarioInvalido } from '../validacao'
import { alturaDoChao } from './chao'
import type { DocumentoDeCenario, MarcadorDeCenario, Transformacao } from './documento'
import { MarcadorSchema, TransformacaoSchema } from './entidades-schema'
import type { ConfiguracaoDeMarcador } from './marcadores-schema'
import type { FonteDeAlturas } from './terreno'
import { transformarPonto } from './volume'

export function marcadorRedimensionavel(m: MarcadorDeCenario): boolean {
  return ['zona', 'rota', 'regua', 'escala'].includes(m.configuracao?.tipo ?? 'ponto')
}

/** Converte o gizmo comum em pose e medidas locais, sem criar escala autoral paralela. */
export function alteracoesDoGestoDoMarcador(
  doc: Pick<DocumentoDeCenario, 'base'>,
  m: MarcadorDeCenario,
  transformacao: Transformacao,
  fonte?: FonteDeAlturas,
): Pick<MarcadorDeCenario, 'posicao' | 'giro' | 'configuracao'> {
  const t = TransformacaoSchema.parse(transformacao),
    origem = { ...t, posicao: { x: 0, y: 0, z: 0 }, escala: { x: 1, y: 1, z: 1 } },
    cima = transformarPonto({ x: 0, y: 1, z: 0 }, origem),
    frente = transformarPonto({ x: 0, y: 0, z: 1 }, origem),
    s = t.escala,
    uniforme = Math.abs(s.x - s.y) < 1e-6 && Math.abs(s.y - s.z) < 1e-6
  if (Math.hypot(cima.x, cima.z, cima.y - 1) > 1e-4)
    throw new CenarioInvalido(['Marcadores giram somente em torno do eixo vertical.'])
  const configuracao: ConfiguracaoDeMarcador | undefined = m.configuracao
    ? structuredClone(m.configuracao)
    : undefined
  if (Math.max(Math.abs(s.x - 1), Math.abs(s.y - 1), Math.abs(s.z - 1)) > 1e-6) {
    if (!marcadorRedimensionavel(m))
      throw new CenarioInvalido(['Este marcador usa medidas próprias, não escala do gizmo.'])
    if (configuracao?.tipo === 'zona') {
      const f = configuracao.forma
      if (f.tipo === 'esfera') {
        if (!uniforme) throw new CenarioInvalido(['A esfera exige escala uniforme.'])
        f.raio *= s.x
      } else if (f.tipo === 'caixa') {
        f.tamanho = { x: f.tamanho.x * s.x, y: f.tamanho.y * s.y, z: f.tamanho.z * s.z }
      } else {
        f.pontos = f.pontos.map((p) => ({ x: p.x * s.x, z: p.z * s.z }))
        f.altura *= s.y
      }
    } else if (configuracao?.tipo === 'rota') {
      configuracao.pontos = configuracao.pontos.map((p) => ({
        x: p.x * s.x,
        y: p.y * s.y,
        z: p.z * s.z,
      }))
    } else if (configuracao?.tipo === 'regua') {
      const p = configuracao.fim
      configuracao.fim = { x: p.x * s.x, y: p.y * s.y, z: p.z * s.z }
    } else if (configuracao?.tipo === 'escala') {
      if (!uniforme) throw new CenarioInvalido(['A referência humana exige escala uniforme.'])
      configuracao.altura *= s.y
    }
  }
  const posicao = {
      ...t.posicao,
      y: t.posicao.y - (m.noChao ? alturaDoChao(doc.base, t.posicao.x, t.posicao.z, fonte) : 0),
    },
    // Euler XYZ muda de representação ao passar de 90°. A direção evita inverter o giro.
    giro = Math.atan2(frente.x, frente.z),
    validado = MarcadorSchema.parse({ ...m, posicao, giro, configuracao })
  return { posicao: validado.posicao, giro: validado.giro, configuracao: validado.configuracao }
}
