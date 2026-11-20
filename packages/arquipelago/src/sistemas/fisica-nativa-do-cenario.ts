import { Matrix4, Quaternion, Vector3 } from 'three'
import type { PerfilDoCenario } from './perfil-de-cenario'

/** Os papéis nativos exigem uma transformação rígida em pé, sem shear ou reflexão.
 * A matriz compilada já contém o assentamento; este adaptador não volta a enterrá-la. */
export function transformacaoNativa(matriz: readonly number[]) {
  const m = new Matrix4().fromArray(matriz),
    posicao = new Vector3(),
    giro = new Quaternion(),
    escala = new Vector3()
  m.decompose(posicao, giro, escala)
  const refeita = new Matrix4().compose(posicao, giro, escala),
    cima = new Vector3(0, 1, 0).applyQuaternion(giro)
  if (
    matriz.length !== 16 ||
    !matriz.every(Number.isFinite) ||
    Math.min(escala.x, escala.y, escala.z) <= 0 ||
    cima.distanceToSquared(new Vector3(0, 1, 0)) > 1e-10 ||
    m.elements.some((n, i) => Math.abs(n - refeita.elements[i]!) > 1e-6)
  )
    throw Error('O papel nativo exige uma matriz em pé, sem deformação ou reflexão.')
  return { posicao, giro: 2 * Math.atan2(giro.y, giro.w), escala }
}

/** Reutiliza as dimensões dos troncos e fundações do piloto existente. */
export function prepararFisicaNativa(perfil: Pick<PerfilDoCenario, 'fisicas'>) {
  const troncos = [],
    fundacoes = [],
    externos = new Set<string>()
  for (const f of perfil.fisicas) {
    if (f.tipo === 'nenhuma') externos.add(f.entidade)
    if (f.tipo !== 'tronco' && !f.fundacao) continue
    const t = transformacaoNativa(f.matriz)
    if (f.tipo === 'tronco') {
      if (Math.abs(t.escala.x - t.escala.z) > 1e-6)
        throw Error('O tronco nativo precisa de escala horizontal uniforme.')
      externos.add(f.entidade)
      troncos.push({
        id: f.entidade,
        posicao: t.posicao.toArray(),
        giro: t.giro,
        meiaAltura: 0.9 * t.escala.y,
        raio: (f.raioDoTronco ?? 0.23) * t.escala.x,
      })
    }
    if (f.fundacao) {
      const { min, max } = f.fundacao,
        metade = new Vector3(max.x - min.x, max.y - min.y, max.z - min.z)
          .multiply(t.escala)
          .multiplyScalar(0.5),
        centro = new Vector3(min.x + max.x, min.y + max.y, min.z + max.z)
          .multiplyScalar(0.5)
          .applyMatrix4(new Matrix4().fromArray(f.matriz))
      if (Math.min(metade.x, metade.y, metade.z) <= 0)
        throw Error('A fundação nativa precisa de um volume positivo.')
      fundacoes.push({
        id: f.entidade,
        centro: centro.toArray(),
        metade: metade.toArray(),
        giro: t.giro,
      })
    }
  }
  return { troncos, fundacoes, externos }
}
