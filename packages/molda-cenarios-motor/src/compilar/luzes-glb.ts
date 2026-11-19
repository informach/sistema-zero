import { DirectionalLight, PointLight, SpotLight, Vector3 } from 'three'

/** glTF usa -Z local para direção e decaimento físico 2; o original não é modificado. */
export function copiarLuzParaGlb(original: DirectionalLight | PointLight | SpotLight) {
  const luz = original.clone()
  luz.position.copy(original.getWorldPosition(new Vector3()))
  if (
    (original instanceof DirectionalLight || original instanceof SpotLight) &&
    (luz instanceof DirectionalLight || luz instanceof SpotLight)
  ) {
    luz.lookAt(original.target.getWorldPosition(new Vector3()))
    luz.target.position.set(0, 0, -1)
    luz.add(luz.target)
  }
  let aviso: string | undefined
  if ((luz instanceof PointLight || luz instanceof SpotLight) && luz.decay !== 2) {
    aviso = `A luz “${original.name || 'sem nome'}” usa decaimento ${luz.decay} no cenário. O glTF usa decaimento físico 2; os parâmetros autorais permanecem nos metadados.`
    luz.decay = 2
  }
  return { luz, aviso }
}
