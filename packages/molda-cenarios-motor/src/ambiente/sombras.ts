import type { DirectionalLight, PointLight, SpotLight } from 'three'

type Luz = DirectionalLight | PointLight | SpotLight
/** Three libera os targets, mas mantém as referências; zere-as antes de reativar. */
export function liberarMapasDeSombra(luz: Luz): void {
  luz.shadow.dispose()
  luz.shadow.map = null
  luz.shadow.mapPass = null
  luz.shadow.needsUpdate = true
}
export function configurarSombra(luz: Luz, ativa: boolean, resolucao: number): void {
  if (!ativa || luz.shadow.mapSize.x !== resolucao) liberarMapasDeSombra(luz)
  luz.castShadow = ativa
  luz.shadow.mapSize.set(resolucao, resolucao)
}
