import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { useJogo } from '../../estado/contexto'
import { ROTAS_DA_FAISCA } from '../../sistemas/faisca'
import {
  amostrarMedicao,
  criarMedicao,
  type MedicaoDePercurso,
} from '../../sistemas/medicao-de-percurso'
import { jogoPausado } from '../../sistemas/pausa'
export interface PedidoDeMedicao {
  rota: string
  numero: number
}
export function MedirPercurso({
  pedido,
  aoMudar,
}: {
  pedido: PedidoDeMedicao | null
  aoMudar: (m: MedicaoDePercurso | null) => void
}) {
  const { rastro, loja, pedidos } = useJogo(),
    medicao = useRef<MedicaoDePercurso | null>(null),
    tempo = useRef(0),
    publicado = useRef(0)
  useEffect(() => {
    const r = ROTAS_DA_FAISCA.find((r) => r.id === pedido?.rota)
    medicao.current = r ? criarMedicao(r.pontos[0]!, r.pontos.at(-1)!) : null
    tempo.current = 0
    publicado.current = 0
    aoMudar(medicao.current)
  }, [pedido, aoMudar])
  useFrame((_, dt) => {
    const m = medicao.current
    if (!m || m.estado === 'concluida' || m.estado === 'cancelada' || jogoPausado(loja.getState()))
      return
    tempo.current += dt
    const antes = m.estado
    amostrarMedicao(m, rastro, tempo.current, pedidos.chaoChegando.size > 0)
    if (tempo.current - publicado.current > 0.25 || m.estado !== antes) {
      publicado.current = tempo.current
      aoMudar({ ...m })
    }
  })
  return null
}
