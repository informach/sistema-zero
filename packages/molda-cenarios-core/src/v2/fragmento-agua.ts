import { prepararConsultaDaAgua } from './consulta-de-agua'
import type { AguaDeCenario } from './documento'
import type { VolumeDeComposicao } from './volume'

type Delta = { x: number; y: number; z: number }
/** Translação autoral; margens locais conservam giro/escala e o campo de terreno não é copiado. */
export function transladarAgua(a: AguaDeCenario, d: Delta): AguaDeCenario {
  const xz = (p: { x: number; z: number }) => ({ x: p.x + d.x, z: p.z + d.z })
  const xyz = (p: Delta) => ({ ...xz(p), y: p.y + d.y })
  switch (a.tipo) {
    case 'mar':
      return { ...a, nivel: a.nivel + d.y }
    case 'lago':
      return { ...a, centro: xz(a.centro), nivel: a.nivel + d.y }
    case 'represa':
      return {
        ...a,
        centro: xz(a.centro),
        nivel: a.nivel + d.y,
        barragem: { ...a.barragem, crista: a.barragem.crista + d.y },
      }
    case 'rio':
      return {
        ...a,
        pontos: a.pontos.map(xyz),
        ...(a.controle ? { controle: a.controle.map(xz) } : {}),
      }
    case 'cachoeira':
      return { ...a, topo: xyz(a.topo), base: xyz(a.base) }
  }
}
export function volumeDaAgua(a: AguaDeCenario): VolumeDeComposicao {
  if (a.tipo === 'mar') return { min: { x: 0, y: a.nivel, z: 0 }, max: { x: 0, y: a.nivel, z: 0 } }
  if (a.tipo === 'cachoeira')
    return {
      min: {
        x: Math.min(a.topo.x, a.base.x) - a.largura / 2,
        y: a.base.y,
        z: Math.min(a.topo.z, a.base.z) - a.largura / 2,
      },
      max: {
        x: Math.max(a.topo.x, a.base.x) + a.largura / 2,
        y: a.topo.y,
        z: Math.max(a.topo.z, a.base.z) + a.largura / 2,
      },
    }
  const limites = prepararConsultaDaAgua(a).limites!
  return {
    min: {
      x: limites.x0,
      z: limites.z0,
      y:
        a.tipo === 'rio'
          ? Math.min(...a.pontos.map((p) => p.y)) - a.profundidade
          : a.nivel - a.profundidade,
    },
    max: {
      x: limites.x1,
      z: limites.z1,
      y: a.tipo === 'rio' ? Math.max(...a.pontos.map((p) => p.y)) : a.nivel,
    },
  }
}
