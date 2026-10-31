import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { giroDaIlha, ilhasEmVolta, PIER } from '../src/mundo/medidas'
import { ancorasDoPorto } from '../src/mundo/portos'
import { criarTravessia } from '../src/sistemas/barco'

const recife = ilhasEmVolta().find((i) => i.ilha.id === 'recife')!
const ler = (arquivo: string) => {
  const b = readFileSync(join(import.meta.dir, '../src/assets', arquivo))
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
}
export function viagemReal() {
  return criarTravessia(
    [
      ancorasDoPorto(ler('mundo/pier.glb'), 'embarque', PIER, 0),
      ancorasDoPorto(ler('ilhas/recife.glb'), 'cais', recife.centro, giroDaIlha(recife.ilha)),
    ],
    { x: 1, y: 0.5, z: 0 },
    [null, { ...recife.centro, y: 0 }],
    ['sua-ilha', 'recife'],
  )
}
