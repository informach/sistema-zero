import { ARTE_DA_FAISCA } from '../mundo/faisca/arte.generated'

const meta = ARTE_DA_FAISCA.pecas.lago_nadavel.lago
const x = 58,
  z = 127,
  chao = 4,
  origem = chao - meta.borda
const global = (p: readonly number[]) => ({ x: x + p[0]!, z: z + p[1]! })
export function pontoNoContorno(
  contorno: readonly { x: number; z: number }[],
  x: number,
  z: number,
): boolean {
  let dentro = false
  for (let i = 0, j = contorno.length - 1; i < contorno.length; j = i++) {
    const a = contorno[i]!,
      b = contorno[j]!
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) dentro = !dentro
  }
  return dentro
}
const furo = meta.furo.map(global)
export const LAGO_DA_FAISCA = {
  x,
  z,
  chao,
  origem,
  furo,
  retangulo: {
    minX: Math.floor(Math.min(...furo.map((p) => p.x)) / 4) * 4,
    maxX: Math.ceil(Math.max(...furo.map((p) => p.x)) / 4) * 4,
    minZ: Math.floor(Math.min(...furo.map((p) => p.z)) / 4) * 4,
    maxZ: Math.ceil(Math.max(...furo.map((p) => p.z)) / 4) * 4,
  },
  agua: {
    id: 'lago-dos-campos',
    x,
    z,
    raioX: 6,
    raioZ: 4,
    giro: 0,
    y: origem + meta.nivel,
    contorno: meta.agua.map((p) => ({ x: p[0], z: p[1] })),
  },
}
/** O GLB fornece água/espuma/cáustica separadas das margens e do fundo. */
export const materialSolidoDoLago = (nome: string) => nome === 'cor' || nome === 'cor_2'
