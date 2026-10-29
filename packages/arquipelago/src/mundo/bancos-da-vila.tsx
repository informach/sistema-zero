import { useMemo } from 'react'
import { useJogo } from '../estado/contexto'
import { FALA_DE_SENTAR, lugarNoBanco } from '../sistemas/descanso'
import type { ColisorDaIlha } from './colisores-da-ilha'
import { useInterativo } from './interativos'

/** De que distância do meio do banco aparece "Sentar no banco". */
export const ALCANCE_DO_BANCO = 1.5

export interface BancoNoMundo {
  id: string
  /** O meio do banco, no chão embaixo dele. */
  centro: { x: number; y: number; z: number }
  /** Para onde a frente do banco olha (giro `d` olha para `(sin d, cos d)`). */
  frente: number
}

/**
 * Os bancos de uma ilha, no mundo: cada colisor `col-banco-N` (caixa com o meio na metade da altura
 * do banco) com a frente no −Z dele. Os colisores vêm da ilha preparada (`lerColisores`, que já os
 * lê girados com a ilha, em volta do meio dela), porque o jogo tira os nós `col-*` do modelo.
 */
export function bancosDosColisores(
  colisores: readonly ColisorDaIlha[],
  meio: { x: number; y: number; z: number },
): BancoNoMundo[] {
  const lista: BancoNoMundo[] = []
  for (const col of colisores) {
    if (col.forma !== 'caixa' || !/^col-banco-\d+$/.test(col.nome)) continue
    const [x, y, z] = col.posicao
    const yaw = 2 * Math.atan2(col.rotacao[1], col.rotacao[3])
    lista.push({
      id: col.nome.slice(4),
      centro: { x: meio.x + x, y: meio.y + y - col.meio[1], z: meio.z + z },
      frente: Math.atan2(-Math.sin(yaw), -Math.cos(yaw)),
    })
  }
  return lista
}

/**
 * Os bancos da praça da Vila Doce (fase2-13): cada colisor `col-banco-N` do `vila-doce.glb` vira um
 * lugar de sentar (`bancosDosColisores`; o encosto fica atrás).
 */
export function BancosDaVila({
  colisores,
  meio,
}: {
  colisores: readonly ColisorDaIlha[]
  meio: { x: number; y: number; z: number }
}) {
  const bancos = useMemo(() => bancosDosColisores(colisores, meio), [colisores, meio])
  return (
    <>
      {bancos.map((b) => (
        <Banco key={b.id} {...b} />
      ))}
    </>
  )
}

function Banco({
  id,
  centro,
  frente,
}: {
  id: string
  centro: { x: number; y: number; z: number }
  frente: number
}) {
  const { loja, movimento } = useJogo()
  const lugar = useMemo(() => lugarNoBanco(id, centro, frente), [id, centro, frente])
  useInterativo(id, {
    x: centro.x + Math.sin(frente) * 0.6,
    z: centro.z + Math.cos(frente) * 0.6,
    raio: ALCANCE_DO_BANCO,
    rotulo: () => 'Sentar no banco',
    agir: () => {
      movimento.pedido = { tipo: 'descanso', lugar }
      loja.getState().dizer(FALA_DE_SENTAR)
    },
  })
  return null
}
