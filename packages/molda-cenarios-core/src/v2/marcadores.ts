import { pontoNoPoligono } from '../poligonos'
import { CenarioInvalido } from '../validacao'
import { alturaDoChao } from './chao'
import type { DocumentoDeCenario, MarcadorDeCenario, Transformacao } from './documento'
import { MarcadorSchema } from './entidades-schema'
import type { ConfiguracaoDeMarcador } from './marcadores-schema'
import { indiceDaOrganizacao } from './organizacao'
import type { FonteDeAlturas } from './terreno'
import {
  destransformarPonto,
  transformarPonto,
  transformarVolume,
  type VolumeDeComposicao,
} from './volume'

type Ponto = Transformacao['posicao']
type Base = Pick<DocumentoDeCenario, 'base'>
const conferirPonto = (p: Ponto): Ponto => {
  if (!Object.values(p).every((v) => Number.isFinite(v) && Math.abs(v) <= 100_000))
    throw new CenarioInvalido(['O marcador ultrapassa os limites do mundo.'])
  return p
}
export function transformacaoDoMarcador(
  doc: Base,
  marcador: MarcadorDeCenario,
  fonte?: FonteDeAlturas,
): Transformacao {
  const p = marcador.posicao
  return {
    posicao: conferirPonto({
      ...p,
      y: p.y + (marcador.noChao ? alturaDoChao(doc.base, p.x, p.z, fonte) : 0),
    }),
    rotacao: { x: 0, y: marcador.giro, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  }
}
export function pontoDoMarcador(
  doc: Base,
  marcador: MarcadorDeCenario,
  local: Ponto,
  fonte?: FonteDeAlturas,
): Ponto {
  return conferirPonto(transformarPonto(local, transformacaoDoMarcador(doc, marcador, fonte)))
}
export function pontoLocalDoMarcador(
  doc: Base,
  marcador: MarcadorDeCenario,
  mundo: Ponto,
  fonte?: FonteDeAlturas,
): Ponto {
  return conferirPonto(destransformarPonto(mundo, transformacaoDoMarcador(doc, marcador, fonte)))
}

/** Conta o trabalho antes de consultar o relevo ou alocar pontos de desenho. */
export function planoDeAmostragemDaRota(
  c: Extract<ConfiguracaoDeMarcador, { tipo: 'rota' }>,
  passo = 1,
) {
  if (!Number.isFinite(passo) || passo < 0.1 || passo > 1000)
    throw new CenarioInvalido(['O passo da rota precisa ficar entre 0,1 e 1.000 metros.'])
  const trechos = c.pontos.length - (c.fechada ? 0 : 1),
    divisoes: number[] = []
  let quantidade = 1
  for (let i = 0; i < trechos; i++) {
    const a = c.pontos[i]!,
      b = c.pontos[(i + 1) % c.pontos.length]!,
      n = Math.max(
        1,
        Math.ceil(Math.hypot(b.x - a.x, c.seguirTerreno ? 0 : b.y - a.y, b.z - a.z) / passo),
      )
    quantidade += n
    if (!Number.isSafeInteger(quantidade) || quantidade > 16_384)
      throw new CenarioInvalido([
        'A rota exige amostras demais. Aumente o passo ou divida o percurso.',
      ])
    divisoes.push(n)
  }
  return { divisoes, quantidade }
}

/** Amostragem limitada e compartilhável pelo desenho e pelo consumidor do jogo. */
export function rotaDoMarcador(
  doc: Base,
  marcador: MarcadorDeCenario,
  fonte?: FonteDeAlturas,
  passo = 1,
) {
  const m = MarcadorSchema.parse(marcador),
    c = m.configuracao
  if (c?.tipo !== 'rota') throw new CenarioInvalido(['Escolha um marcador de rota.'])
  const { divisoes } = planoDeAmostragemDaRota(c, passo),
    trechos = divisoes.length
  // A raiz girada continua a mesma; seguir o relevo consulta o chão em cada amostra.
  const t = transformacaoDoMarcador(doc, m, fonte),
    alturaRaiz = c.seguirTerreno ? alturaDoChao(doc.base, m.posicao.x, m.posicao.z, fonte) : 0
  const mundo = (p: Ponto) => {
    const q = transformarPonto(p, t)
    if (c.seguirTerreno) q.y += alturaDoChao(doc.base, q.x, q.z, fonte) - alturaRaiz
    return conferirPonto(q)
  }
  const pontos = [mundo(c.pontos[0]!)],
    distancias = [0]
  for (let i = 0; i < trechos; i++) {
    const a = c.pontos[i]!,
      b = c.pontos[(i + 1) % c.pontos.length]!,
      n = divisoes[i]!
    for (let j = 1; j <= n; j++) {
      const u = j / n,
        p = mundo({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u }),
        anterior = pontos[pontos.length - 1]!
      distancias.push(
        distancias[distancias.length - 1]! +
          Math.hypot(p.x - anterior.x, p.y - anterior.y, p.z - anterior.z),
      )
      pontos.push(p)
    }
  }
  return { pontos, distancias, comprimento: distancias[distancias.length - 1]!, fechada: c.fechada }
}

export function zonaContemPonto(
  doc: Base,
  marcador: MarcadorDeCenario,
  ponto: Ponto,
  fonte?: FonteDeAlturas,
): boolean {
  const c = marcador.configuracao
  if (c?.tipo !== 'zona') return false
  const p = pontoLocalDoMarcador(doc, marcador, ponto, fonte),
    f = c.forma
  if (f.tipo === 'esfera') return Math.hypot(p.x, p.y, p.z) <= f.raio + 1e-8
  if (f.tipo === 'caixa')
    return (['x', 'y', 'z'] as const).every((e) => Math.abs(p[e]) <= f.tamanho[e] / 2 + 1e-8)
  return p.y >= -1e-8 && p.y <= f.altura + 1e-8 && pontoNoPoligono({ x: p.x, z: p.z }, f.pontos)
}
function volumeDosPontos(pontos: readonly Ponto[]): VolumeDeComposicao {
  const min = { x: Infinity, y: Infinity, z: Infinity },
    max = { x: -Infinity, y: -Infinity, z: -Infinity }
  for (const p of pontos)
    for (const e of ['x', 'y', 'z'] as const) {
      min[e] = Math.min(min[e], p[e])
      max[e] = Math.max(max[e], p[e])
    }
  return { min, max }
}
export function volumeDoMarcador(
  doc: Base,
  marcador: MarcadorDeCenario,
  fonte?: FonteDeAlturas,
): VolumeDeComposicao {
  const c = marcador.configuracao,
    t = transformacaoDoMarcador(doc, marcador, fonte)
  if (c?.tipo === 'rota') return volumeDosPontos(rotaDoMarcador(doc, marcador, fonte).pontos)
  if (c?.tipo === 'regua' || c?.tipo === 'camera')
    return volumeDosPontos([
      t.posicao,
      pontoDoMarcador(doc, marcador, c.tipo === 'regua' ? c.fim : c.alvo, fonte),
    ])
  let volume: VolumeDeComposicao = {
    min: { x: -0.2, y: 0, z: -0.2 },
    max: { x: 0.2, y: 1, z: 0.2 },
  }
  if (c?.tipo === 'zona') {
    const f = c.forma
    volume =
      f.tipo === 'caixa'
        ? {
            min: { x: -f.tamanho.x / 2, y: -f.tamanho.y / 2, z: -f.tamanho.z / 2 },
            max: { x: f.tamanho.x / 2, y: f.tamanho.y / 2, z: f.tamanho.z / 2 },
          }
        : f.tipo === 'esfera'
          ? {
              min: { x: -f.raio, y: -f.raio, z: -f.raio },
              max: { x: f.raio, y: f.raio, z: f.raio },
            }
          : volumeDosPontos(
              f.pontos.flatMap((p) => [
                { ...p, y: 0 },
                { ...p, y: f.altura },
              ]),
            )
  }
  if (c?.tipo === 'escala')
    volume = {
      min: { x: -c.altura * 0.15, y: 0, z: -c.altura * 0.15 },
      max: { x: c.altura * 0.15, y: c.altura, z: c.altura * 0.15 },
    }
  const mundo = transformarVolume(volume, t)
  conferirPonto(mundo.min)
  conferirPonto(mundo.max)
  return mundo
}
export function inicioDoCenario(doc: DocumentoDeCenario, fonte?: FonteDeAlturas, id?: string) {
  const indice = indiceDaOrganizacao(doc),
    marcador = doc.marcadores.find(
      (m) =>
        m.configuracao?.tipo === 'inicio' &&
        !indice.flags.get(m.id)?.oculto &&
        (id ? m.id === id : m.configuracao.principal),
    )
  return marcador
    ? {
        id: marcador.id,
        posicao: transformacaoDoMarcador(doc, marcador, fonte).posicao,
        giro: marcador.giro,
      }
    : null
}
