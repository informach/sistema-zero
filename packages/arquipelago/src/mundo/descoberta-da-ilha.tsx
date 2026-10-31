import { useFrame } from '@react-three/fiber'
import { useJogo } from '../estado/contexto'
import { observarDescoberta, observarMapa } from '../estado/exploracao'
import type { AreaDaDescoberta } from '../sistemas/exploracao'
import { ALTURA_DA_TERRA, FAROL, RAIO_DO_GRAMADO } from './medidas'

/** Só montar com os colisores disponíveis. Não muda a física nem registra mera aproximação. */
export function DescobertaDaIlha({ area }: { area: AreaDaDescoberta }) {
  const { loja, rastro, movimento, pedidos } = useJogo()
  useFrame(() => {
    observarDescoberta(loja, area, rastro, movimento, pedidos)
    observarMapa(loja, area, rastro, pedidos)
  })
  return null
}

const CENTRAL: AreaDaDescoberta = {
  ilha: 'sua-ilha',
  x: 0,
  z: 0,
  raio: RAIO_DO_GRAMADO,
  alturaMinima: ALTURA_DA_TERRA,
}
const TORRE: AreaDaDescoberta = {
  ilha: 'farol',
  ...FAROL,
  raio: 4,
  alturaMinima: ALTURA_DA_TERRA,
}

export function DescobertasDaIlhaCentral() {
  return (
    <>
      <DescobertaDaIlha area={CENTRAL} />
      <DescobertaDaIlha area={TORRE} />
    </>
  )
}
