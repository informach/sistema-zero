import { alturaDoChao } from './chao'
import type { CaminhoDeCenario, DocumentoDeCenario } from './documento'
import type { FonteDeAlturas } from './terreno'
import { curvaDoCaminho } from './topologia-de-caminho'
import type { VolumeDeComposicao } from './volume'

/** Copiar caminho não copia nem molda o terreno. Cabeceiras automáticas continuam automáticas. */
export function transladarCaminho(
  c: CaminhoDeCenario,
  delta: { x: number; y: number; z: number },
): CaminhoDeCenario {
  return {
    ...c,
    pontos: c.pontos.map((p) => ({ x: p.x + delta.x, z: p.z + delta.z })),
    ...(c.tipo === 'ponte' && c.cotas
      ? { cotas: { de: c.cotas.de + delta.y, ate: c.cotas.ate + delta.y } }
      : {}),
  }
}

/** Envelope para a âncora da cópia, não um colisor substituto da geometria real. */
export function volumeDoCaminho(
  doc: Pick<DocumentoDeCenario, 'base'>,
  c: CaminhoDeCenario,
  fonte?: FonteDeAlturas,
): VolumeDeComposicao {
  const curva = curvaDoCaminho(c),
    alturas =
      c.tipo === 'ponte' && c.cotas
        ? [c.cotas.de, c.cotas.ate]
        : curva.pontos.map((p) => alturaDoChao(doc.base, p.x, p.z, fonte)),
    meia = c.tipo === 'praca' ? 0 : c.largura / 2,
    altura =
      c.tipo === 'muro' || c.tipo === 'cerca'
        ? c.altura
        : c.tipo === 'ponte' && c.guardas
          ? c.alturaDaGuarda
          : 0
  return {
    min: {
      x: Math.min(...curva.pontos.map((p) => p.x)) - meia,
      y: Math.min(...alturas) - (c.tipo === 'ponte' ? c.espessura : 0),
      z: Math.min(...curva.pontos.map((p) => p.z)) - meia,
    },
    max: {
      x: Math.max(...curva.pontos.map((p) => p.x)) + meia,
      y: Math.max(...alturas) + altura,
      z: Math.max(...curva.pontos.map((p) => p.z)) + meia,
    },
  }
}
