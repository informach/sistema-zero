import { useMemo } from 'react'
import type { Object3D } from 'three'
import { useJogo } from '../estado/contexto'
import type { Ponto } from '../sistemas/cipo'
import { CORPO } from '../sistemas/corpo'
import { paraOMundo } from './bosque'
import { useInterativo } from './interativos'

/**
 * Os atalhos da entrega pelos telhados (A41 e B13, arte de 31/10/2026): a prancha da casinha 1 para
 * a 3 e a escada de caixotes até a casinha 2. A corrida já aceita pular paradas (o percurso não é
 * em ordem): por eles se chega mais rápido, mas os confeitos do caminho pulado ficam para trás. Aqui
 * só a dica, ao lado de cada atalho, na altura dele. A arte não trouxe as âncoras `telhados-atalho`
 * do pedido: o lugar sai dos colisores da prancha e do primeiro caixote.
 */
export const ATALHOS_DOS_TELHADOS = [
  {
    id: 'prancha',
    colisor: 'col-prancha-1',
    fala: 'Esta prancha liga a casinha 1 à casinha 3. É mais rápido, mas o confeito da casinha do meio fica para trás.',
  },
  {
    id: 'escada',
    colisor: 'col-escada-caixote-1',
    fala: 'Estes caixotes sobem direto para a casinha 2. É um atalho que pula a primeira casinha.',
  },
] as const

export const OLHAR_O_ATALHO = 'Olhar o atalho'

/** O lugar de cada atalho no mundo (o meio do colisor), ou nada sem ele no modelo. */
export function lugaresDosAtalhos(
  modelo: Object3D,
  meio: Ponto,
  giro: number,
): { id: string; fala: string; lugar: Ponto }[] {
  return ATALHOS_DOS_TELHADOS.flatMap((a) => {
    const p = modelo.getObjectByName(a.colisor)?.position
    return p
      ? [{ id: a.id, fala: a.fala, lugar: paraOMundo(p, meio, giro, { x: 0, y: 0, z: 0 }) }]
      : []
  })
}

export function AtalhosDosTelhados({
  modelo,
  meio,
  giro,
}: {
  modelo: Object3D
  meio: Ponto
  giro: number
}) {
  const lugares = useMemo(() => lugaresDosAtalhos(modelo, meio, giro), [modelo, meio, giro])
  return (
    <>
      {lugares.map((a) => (
        <DicaDoAtalho key={a.id} id={a.id} fala={a.fala} lugar={a.lugar} />
      ))}
    </>
  )
}

function DicaDoAtalho({ id, fala, lugar }: { id: string; fala: string; lugar: Ponto }) {
  const { loja, rastro } = useJogo()
  useInterativo(`vila:atalho-${id}`, {
    x: lugar.x,
    z: lugar.z,
    raio: 1.6,
    deFundo: true,
    rotulo: () => {
      const s = loja.getState()
      // Só na altura do atalho (embaixo dele, na praça, não).
      const pes = rastro.y - CORPO.doCentroAoPe
      return s.visita || Math.abs(pes - lugar.y) > 1.6 ? null : OLHAR_O_ATALHO
    },
    agir: () => loja.getState().dizer(fala),
  })
  return null
}
