import { perspectiveFitDistance } from '@sistemazero/molda/palco'
import type { BaseDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import type { Box3, Vector3 } from 'three'

export function limitesDaBase(base: BaseDeCenario, destino: Box3): Box3 {
  if (base.tipo === 'terreno') {
    destino.min.set(base.origem.x, Math.min(base.min, base.fundo), base.origem.z)
    destino.max.set(
      base.origem.x + base.colunas * base.passo,
      Math.max(base.max, base.fundo),
      base.origem.z + base.linhas * base.passo,
    )
  } else {
    const x = base.tipo === 'plano' ? base.largura / 2 : 256,
      z = base.tipo === 'plano' ? base.comprimento / 2 : 256
    destino.min.set(-x, 0, -z)
    destino.max.set(x, 0, z)
  }
  return destino
}

/** Requer apenas o volume agregado. Nenhuma varredura de objetos por quadro. */
export function recorteDaCamera(
  caixa: Box3,
  posicao: Vector3,
  alvo: Vector3,
  fov: number,
  aspecto: number,
  fotografia = false,
) {
  const cx = caixa.isEmpty() ? alvo.x : (caixa.min.x + caixa.max.x) / 2,
    cy = caixa.isEmpty() ? alvo.y : (caixa.min.y + caixa.max.y) / 2,
    cz = caixa.isEmpty() ? alvo.z : (caixa.min.z + caixa.max.z) / 2
  const raio = caixa.isEmpty()
    ? 12
    : Math.hypot(caixa.max.x - caixa.min.x, caixa.max.y - caixa.min.y, caixa.max.z - caixa.min.z) /
      2
  const distancia = posicao.distanceTo(alvo),
    aoCentro = Math.hypot(posicao.x - cx, posicao.y - cy, posicao.z - cz)
  return {
    perto: Math.max(fotografia ? 0.001 : 0.005, Math.min(0.1, distancia * 0.001)),
    longe: Math.ceil(Math.max(fotografia ? 10 : 4000, aoCentro + raio * 1.5) / 100) * 100,
    orbita: Math.max(
      2500,
      perspectiveFitDistance(Math.max(0.01, raio), fov, Math.max(0.01, aspecto)) * 2,
    ),
    nevoaInicio: distancia * 0.8,
    nevoaFim: distancia + raio * 2,
  }
}
