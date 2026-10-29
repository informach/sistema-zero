import type { PostoDaVila } from '@sistemazero/arquipelago-contracts'
import { useMemo } from 'react'
import type { Object3D } from 'three'
import { useJogo } from '../estado/contexto'
import { lojaDoTurno, PAINEL_DO_TURNO } from '../estado/turno'
import { paraOMundo } from './bosque'
import { useInterativo } from './interativos'

/** De que distância da âncora o balcão oferece o turno. */
export const ALCANCE_DO_BALCAO = 1.8

/**
 * Os balcões da Vila Doce que abrem um turno pelo E / Usar: a sorveteria (âncora `sorveteria`) e a
 * barraca de sucos da feira (âncora `barraca-5`). O da padaria abre pela conversa com o Bento,
 * que fica na frente da porta dela.
 */
const BALCOES_NO_MUNDO: readonly { posto: PostoDaVila; ancora: string; rotulo: string }[] = [
  { posto: 'sorveteria', ancora: 'sorveteria', rotulo: 'Fazer um turno na sorveteria' },
  { posto: 'sucos', ancora: 'barraca-5', rotulo: 'Fazer um turno na barraca de sucos' },
]

export function BalcoesDaVila({
  modelo,
  meio,
  giro,
}: {
  modelo: Object3D
  meio: { x: number; y: number; z: number }
  giro: number
}) {
  return (
    <>
      {BALCOES_NO_MUNDO.map((b) => {
        const no = modelo.getObjectByName(b.ancora)
        return no ? (
          <Balcao key={b.posto} {...b} lugar={no.position} meio={meio} giro={giro} />
        ) : null
      })}
    </>
  )
}

function Balcao({
  posto,
  rotulo,
  lugar,
  meio,
  giro,
}: {
  posto: PostoDaVila
  rotulo: string
  lugar: { x: number; y: number; z: number }
  meio: { x: number; y: number; z: number }
  giro: number
}) {
  const { loja } = useJogo()
  const p = useMemo(() => paraOMundo(lugar, meio, giro, { x: 0, y: 0, z: 0 }), [lugar, meio, giro])
  useInterativo(`turno-${posto}`, {
    x: p.x,
    z: p.z,
    raio: ALCANCE_DO_BALCAO,
    rotulo: () => rotulo,
    agir: () => {
      lojaDoTurno(loja).getState().abrir(posto)
      loja.getState().abrirPainel(PAINEL_DO_TURNO)
    },
  })
  return null
}
