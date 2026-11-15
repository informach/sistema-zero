import { ARTE_DA_FAISCA } from '../mundo/faisca/arte.generated'
import type { PecaNaFaisca } from './composicao-faisca'
import { ilhaDoArquipelago } from './geografia-do-arquipelago'
import { alturaNaMalhaDoSetor } from './setores-do-arquipelago'
import { alturaDoSoloDaPraca } from './solo-da-praca'

const ilha = ilhaDoArquipelago('sua-ilha')
export const pisoDaFaisca = (x: number, z: number) =>
  Math.max(alturaNaMalhaDoSetor(ilha, x, z), alturaDoSoloDaPraca(x, z) ?? -Infinity)
export function baseDoVolume(v: { x: number; z: number; largura: number; profundidade: number }) {
  const alturas = [-1, 0, 1].flatMap((x) =>
    [-1, 0, 1].map((z) => pisoDaFaisca(v.x + (x * v.largura) / 2, v.z + (z * v.profundidade) / 2)),
  )
  return { baixo: Math.min(...alturas), alto: Math.max(...alturas) }
}
const predios = new Set([
  'farol',
  'moinho',
  'oficina',
  'correio',
  'vizinho-oeste',
  'vizinho-leste',
  'poco',
  'vizinho-oeste-piso',
  'vizinho-leste-piso',
  'correio-piso',
])
export function assentamentoDaPeca(p: PecaNaFaisca) {
  const meta = ARTE_DA_FAISCA.pecas[p.peca as keyof typeof ARTE_DA_FAISCA.pecas],
    box = meta.colisao[0]
  if (p.altura !== undefined || p.deslocamentoY !== undefined)
    return { y: (p.altura ?? pisoDaFaisca(p.x, p.z)) + (p.deslocamentoY ?? 0), fundacao: null }
  const s = p.escala,
    amostras: number[] = []
  const local = (x: number, z: number) =>
    pisoDaFaisca(
      p.x + s * (Math.cos(p.giro) * x + Math.sin(p.giro) * z),
      p.z + s * (-Math.sin(p.giro) * x + Math.cos(p.giro) * z),
    )
  const raiz = p.solida === 'tronco' || /^(arbusto_|flor_|tufo_)/.test(p.peca)
  const minX = raiz ? -0.2 : box.min[0],
    maxX = raiz ? 0.2 : box.max[0],
    minZ = raiz ? -0.2 : box.min[2],
    maxZ = raiz ? 0.2 : box.max[2]
  for (let i = 0; i <= 4; i++)
    for (let j = 0; j <= 4; j++)
      amostras.push(local(minX + ((maxX - minX) * i) / 4, minZ + ((maxZ - minZ) * j) / 4))
  const baixo = Math.min(...amostras),
    alto = Math.max(...amostras)
  if (predios.has(p.id)) {
    const topo = alto + 0.025
    return {
      y: topo - box.min[1] * s,
      fundacao: {
        baixo: baixo - 0.12,
        topo,
        minX: box.min[0] * s - 0.12,
        maxX: box.max[0] * s + 0.12,
        minZ: box.min[2] * s - 0.12,
        maxZ: box.max[2] * s + 0.12,
      },
    }
  }
  return {
    y: (raiz || p.peca === 'rocha_pequena' ? baixo - 0.025 : alto) - box.min[1] * s,
    fundacao: null,
  }
}
