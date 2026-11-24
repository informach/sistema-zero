import { Mesh, MeshStandardMaterial, PlaneGeometry } from 'three'

/** Piso finito compartilhado pelo palco, Testar e compilação. Não inclui grade
 * nem o plano decorativo exterior usado para enquadramento no editor. */
export function criarPlanoDoCenario(largura: number, comprimento: number) {
  if (
    !Number.isFinite(largura) ||
    !Number.isFinite(comprimento) ||
    largura <= 0 ||
    comprimento <= 0 ||
    largura > 8192 ||
    comprimento > 8192
  )
    throw Error('O piso plano tem dimensões inválidas.')
  const piso = new Mesh(
    new PlaneGeometry(largura, comprimento),
    new MeshStandardMaterial({
      color: 0xa4d48c,
      roughness: 1,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    }),
  )
  piso.rotation.x = -Math.PI / 2
  piso.receiveShadow = true
  return piso
}
