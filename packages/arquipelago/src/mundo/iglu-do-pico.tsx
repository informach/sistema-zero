import type { Object3D } from 'three'
import { CabanaDaIlha } from './cabana-do-bosque'
/** A clareira do mundo antigo é uma segunda entrada para o lote canônico. */
export function IgluDoPico(props: {
  modelo: Object3D
  meio: { x: number; y: number; z: number }
  giro: number
}) {
  return <CabanaDaIlha ilha="pico" {...props} />
}
