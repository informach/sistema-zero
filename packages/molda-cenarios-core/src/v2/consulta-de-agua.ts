import { pontoNoPoligono } from '../poligonos'
import { faixaDaCurva, type MalhaNoChao, medirCurva } from './curvas'
import type { AguaDeCenario } from './documento'
import type { FonteDeAlturas } from './terreno'

export interface NivelDeAgua {
  nivel: number
  profundidade: number
  correnteza?: { x: number; z: number }
}
export interface LimitesDeAgua {
  x0: number
  z0: number
  x1: number
  z1: number
}
export interface ConsultaDeAgua {
  /** Nulo no mar mundial e em quedas sem volume horizontal de nado. */
  limites: LimitesDeAgua | null
  /** O rio é consultado nos mesmos triângulos que o renderer usa para sua lâmina. */
  superficie: MalhaNoChao | null
  em(x: number, z: number, terreno?: FonteDeAlturas): NivelDeAgua | null
}
const limitesDosPontos = (pontos: readonly { x: number; z: number }[]): LimitesDeAgua =>
  pontos.reduce(
    (r, p) => ({
      x0: Math.min(r.x0, p.x),
      z0: Math.min(r.z0, p.z),
      x1: Math.max(r.x1, p.x),
      z1: Math.max(r.z1, p.z),
    }),
    { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity },
  )
function volume(
  nivel: number,
  profundidade: number,
  x: number,
  z: number,
  terreno?: FonteDeAlturas,
): NivelDeAgua | null {
  if (terreno) profundidade = Math.min(profundidade, Math.max(0, nivel - terreno(x, z)))
  return Number.isFinite(profundidade) && profundidade > 0 ? { nivel, profundidade } : null
}

/** Compila a cobertura uma vez. O terreno pode mudar sem clonar ou deformar o dado autoral. */
export function prepararConsultaDaAgua(entrada: AguaDeCenario): ConsultaDeAgua {
  const a = structuredClone(entrada)
  const valida = (x: number, z: number) => Number.isFinite(x) && Number.isFinite(z)
  if (a.tipo === 'mar')
    return {
      limites: null,
      superficie: null,
      em: (x, z, t) => (valida(x, z) ? volume(a.nivel, 100000, x, z, t) : null),
    }
  if (a.tipo === 'cachoeira') return { limites: null, superficie: null, em: () => null }
  if (a.tipo === 'lago' || a.tipo === 'represa') {
    const cos = Math.cos(a.giro),
      sin = Math.sin(a.giro),
      mundo = (p: { x: number; z: number }) => ({
        x: a.centro.x + (p.x * cos + p.z * sin) * a.escala,
        z: a.centro.z + (-p.x * sin + p.z * cos) * a.escala,
      })
    return {
      limites: limitesDosPontos(a.contorno.map(mundo)),
      superficie: null,
      em: (x, z, t) => {
        if (!valida(x, z)) return null
        const dx = x - a.centro.x,
          dz = z - a.centro.z,
          p = { x: (dx * cos - dz * sin) / a.escala, z: (dx * sin + dz * cos) / a.escala }
        if (!pontoNoPoligono(p, a.contorno) || a.ilhas?.some((ilha) => pontoNoPoligono(p, ilha)))
          return null
        // O fundo do GLB é uma fonte física própria, não o terreno recortado debaixo dele.
        return volume(a.nivel, a.profundidade, x, z, a.modelo ? undefined : t)
      },
    }
  }
  const curva = medirCurva(a.pontos),
    superficie = faixaDaCurva(curva, {
      largura: a.largura,
      alturaDoPonto: (i) => a.pontos[i]!.y,
      elevacao: 0,
      divisoes: 2,
    }),
    v = superficie.posicoes,
    indices = superficie.indices,
    limites: LimitesDeAgua = { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity }
  for (let i = 0; i < v.length; i += 3) {
    limites.x0 = Math.min(limites.x0, v[i]!)
    limites.x1 = Math.max(limites.x1, v[i]!)
    limites.z0 = Math.min(limites.z0, v[i + 2]!)
    limites.z1 = Math.max(limites.z1, v[i + 2]!)
  }
  return {
    limites,
    superficie,
    em: (x, z, t) => {
      if (!valida(x, z) || x < limites.x0 || x > limites.x1 || z < limites.z0 || z > limites.z1)
        return null
      let resultado: NivelDeAgua | null = null
      for (let i = 0; i < indices.length; i += 3) {
        const ia = indices[i]! * 3,
          ib = indices[i + 1]! * 3,
          ic = indices[i + 2]! * 3,
          ax = v[ia]!,
          az = v[ia + 2]!,
          bx = v[ib]!,
          bz = v[ib + 2]!,
          cx = v[ic]!,
          cz = v[ic + 2]!,
          denominador = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz)
        if (Math.abs(denominador) < 1e-12) continue
        const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / denominador,
          w = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / denominador,
          r = 1 - u - w
        if (u < -1e-7 || w < -1e-7 || r < -1e-7) continue
        const nivel = u * v[ia + 1]! + w * v[ib + 1]! + r * v[ic + 1]!,
          agua = volume(nivel, a.profundidade, x, z, t)
        if (!agua || (resultado && resultado.nivel > agua.nivel)) continue
        const segmento = Math.floor(i / 12),
          de = a.pontos[segmento]!,
          ate = a.pontos[segmento + 1]!,
          dx = ate.x - de.x,
          dz = ate.z - de.z,
          comprimento = Math.hypot(dx, dz)
        resultado = {
          ...agua,
          ...(a.correnteza > 0
            ? {
                correnteza: {
                  x: (dx / comprimento) * a.correnteza,
                  z: (dz / comprimento) * a.correnteza,
                },
              }
            : {}),
        }
      }
      return resultado
    },
  }
}
