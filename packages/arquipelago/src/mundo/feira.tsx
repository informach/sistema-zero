import { useEffect, useMemo } from 'react'
import type { Object3D } from 'three'
import { useJogo } from '../estado/contexto'
import { ANCORA_DA_FEIRA, PAINEL_DA_FEIRA } from '../sistemas/feira'
import { jogoPausado } from '../sistemas/pausa'
import { paraOMundo } from './bosque'
import { useInterativo } from './interativos'

/** A barraca de brinquedos já existe no GLB. Nenhuma cópia de modelo ou colisor adicional. */
export function FeiraDaVila({
  modelo,
  meio,
  giro,
}: {
  modelo: Object3D
  meio: { x: number; y: number; z: number }
  giro: number
}) {
  const lugar = modelo.getObjectByName(ANCORA_DA_FEIRA)?.position
  return lugar ? <FeiraNoLugar lugar={lugar} meio={meio} giro={giro} /> : null
}
function FeiraNoLugar({
  lugar,
  meio,
  giro,
}: {
  lugar: { x: number; y: number; z: number }
  meio: { x: number; y: number; z: number }
  giro: number
}) {
  const { loja } = useJogo()
  const ponto = useMemo(
    () => paraOMundo(lugar, meio, giro, { x: 0, y: 0, z: 0 }),
    [lugar, meio, giro],
  )
  useInterativo('feira-da-semana', {
    x: ponto.x,
    z: ponto.z,
    raio: 1.8,
    rotulo: () => 'Ver a feira da semana',
    agir: () => {
      const s = loja.getState()
      if (s.visita || jogoPausado(s)) return
      s.abrirPainel(PAINEL_DA_FEIRA)
    },
  })
  useEffect(
    () => () => {
      if (loja.getState().painelAberto === PAINEL_DA_FEIRA) loja.getState().abrirPainel(null)
    },
    [loja],
  )
  return null
}
