import { useJogo } from '../estado/contexto'
import { casaMoradaStore } from '../estado/morada'
import { useInterativo } from './interativos'
import { HORTA } from './medidas'
/** Âncora histórica usada pelos roteiros dos Lumis enquanto as ilhas antigas existem. */
export function lugarDoCanteiro(_id: string, index: number) {
  return {
    x: HORTA.x + (index % HORTA.colunas) * HORTA.passo,
    z: HORTA.z + Math.floor(index / HORTA.colunas) * HORTA.passo,
    escala: 1,
  }
}
/** As plantas e canteiros agora vivem na casa canônica, no lote nativo Morada. */
export function Horta() {
  const { loja, plataforma } = useJogo()
  useInterativo('horta-morada', {
    x: HORTA.x,
    z: HORTA.z,
    raio: 3,
    rotulo: () => 'Cuidar da horta da sua casa',
    agir: () => void casaMoradaStore(loja, plataforma).getState().enter(),
  })
  return null
}
