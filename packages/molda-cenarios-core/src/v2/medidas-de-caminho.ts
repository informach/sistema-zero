import { CenarioInvalido } from '../validacao'
import type { CaminhoDeCenario } from './documento'
import type { VolumeDeComposicao } from './volume'

const falhar = (mensagem: string): never => {
  throw new CenarioInvalido([mensagem])
}
/** Medidas do espaço original compartilhadas por piso, módulos e ponte; sem adivinhar nomes. */
export function medidasDaPecaDeCaminho(c: CaminhoDeCenario, volume?: VolumeDeComposicao) {
  if (!volume) return falhar('Confira as medidas do modelo antes de encaixá-lo no caminho.')
  if (!c.encaixeModelo) return falhar('Escolha o eixo e confira o encaixe do modelo de caminho.')
  const { eixo } = c.encaixeModelo,
    transversal: 'x' | 'z' = eixo === 'x' ? 'z' : 'x',
    medidas = {
      x: volume.max.x - volume.min.x,
      y: volume.max.y - volume.min.y,
      z: volume.max.z - volume.min.z,
    },
    inicio = c.encaixeModelo.inicioLocal ?? volume.min[eixo],
    fim = c.encaixeModelo.fimLocal ?? volume.max[eixo],
    centroTransversal =
      c.encaixeModelo.centroTransversalLocal ??
      (volume.min[transversal] + volume.max[transversal]) / 2,
    baseLocal =
      c.tipo === 'ponte' ? c.encaixeModelo.pisoLocal : (c.encaixeModelo.baseLocal ?? volume.min.y)
  if (
    !Object.values(volume.min).every(Number.isFinite) ||
    !Object.values(volume.max).every(Number.isFinite) ||
    !(medidas.x > 1e-6) ||
    !(medidas.z > 1e-6) ||
    medidas.y < 0 ||
    ((c.tipo === 'muro' || c.tipo === 'cerca') && !(medidas.y > 1e-6)) ||
    baseLocal === undefined ||
    !Number.isFinite(baseLocal) ||
    baseLocal < volume.min.y - 1e-6 ||
    baseLocal > volume.max.y + 1e-6
  )
    return falhar('As medidas, a base ou o piso local do modelo não permitem este encaixe.')
  if (
    !Number.isFinite(inicio) ||
    !Number.isFinite(fim) ||
    fim - inicio <= 1e-6 ||
    inicio < volume.min[eixo] - 1e-6 ||
    fim > volume.max[eixo] + 1e-6 ||
    !Number.isFinite(centroTransversal) ||
    centroTransversal < volume.min[transversal] - 1e-6 ||
    centroTransversal > volume.max[transversal] + 1e-6
  )
    return falhar('As cabeceiras medidas precisam ficar dentro do volume original do modelo.')
  return {
    volume,
    eixo,
    transversal,
    medidas,
    inicio,
    fim,
    centroTransversal,
    baseLocal,
    escalaTransversal: c.largura / medidas[transversal],
  }
}
