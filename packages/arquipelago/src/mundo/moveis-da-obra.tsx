import {
  areaDoMovel,
  DADOS_DO_MOVEL,
  ehDeParede,
  FUNDO_DO_GIRO,
  type MovelPosto,
} from '../sistemas/construcao/moveis'

const DA_LINHA_DA_PAREDE = 0.2
/** Transformação histórica para ler os documentos anteriores à Morada. */
export function lugarDoMovel(m: MovelPosto): { x: number; y: number; z: number; giro: number } {
  const giro = (m.giro * Math.PI) / 2
  if (ehDeParede(m.id)) {
    const [fx, fz] = FUNDO_DO_GIRO[m.giro % 4] ?? [0, -1]
    const recuo = 0.5 - DA_LINHA_DA_PAREDE
    return {
      x: m.x + 0.5 + fx * recuo,
      y: DADOS_DO_MOVEL[m.id].altura ?? 1.5,
      z: m.z + 0.5 + fz * recuo,
      giro,
    }
  }
  const { largura, fundo } = areaDoMovel(m.id, m.giro)
  return { x: m.x + largura / 2, y: 0, z: m.z + fundo / 2, giro }
}
