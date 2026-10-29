import { useMemo } from 'react'
import type { Object3D } from 'three'
import { useJogo } from '../estado/contexto'
import { ALCANCE_DO_MAPA, PAINEL_DO_MAPA, ROTULO_DO_MAPA } from '../sistemas/mapa'
import { paraOMundo } from './bosque'
import type { Troca } from './ilha-completa'
import { useInterativo } from './interativos'

type Ponto = { x: number; y: number; z: number }

/** A mesa de mapas da Maré (âncora `mapa`): "Ver o mapa do arquipélago" abre o painel do mapa. */
export function MesaDeMapas({
  modelo,
  centro,
  giro,
  troca,
}: {
  modelo: Object3D
  centro: Ponto
  giro: number
  troca: Troca
}) {
  const { loja } = useJogo()
  const ponto = useMemo(() => {
    const no = modelo.getObjectByName('mapa')
    return no ? paraOMundo(no.position, centro, giro, { x: 0, y: 0, z: 0 }) : null
  }, [modelo, centro, giro])
  useInterativo('recife:mapa', {
    x: ponto?.x ?? 0,
    z: ponto?.z ?? 0,
    raio: ALCANCE_DO_MAPA,
    rotulo: () => (ponto && troca.opacidade >= 0.99 ? ROTULO_DO_MAPA : null),
    agir() {
      if (ponto && troca.opacidade >= 0.99) loja.getState().abrirPainel(PAINEL_DO_MAPA)
    },
  })
  return null
}
