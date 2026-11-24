import type { IlhaId } from '@sistemazero/arquipelago-contracts'
import { relevoDaFaisca } from './faisca'

export { DISTRITOS_DA_FAISCA } from './faisca'

export type TerritorioId = Exclude<IlhaId, 'farol'>
export interface PontoDoTerritorio {
  x: number
  y: number
  z: number
}
export interface IlhaDoArquipelago {
  id: TerritorioId
  nome: string
  centro: { x: number; z: number }
  raio: number
  elevacao: number
  relevo: number
  fase: number
  cor: string
}
export const VERSAO_DA_GEOGRAFIA = 2
export const FUNDO_DO_ARQUIPELAGO = -8
export const NIVEL_DO_OCEANO = 0
export const ARQUIPELAGO: readonly IlhaDoArquipelago[] = [
  {
    id: 'sua-ilha',
    nome: 'Faísca',
    centro: { x: 0, z: 0 },
    raio: 260,
    elevacao: 0,
    relevo: 14,
    fase: 0,
    cor: '#8fae65',
  },
  {
    id: 'bosque',
    nome: 'Bosque dos Bichos',
    centro: { x: 0, z: -700 },
    raio: 300,
    elevacao: 0,
    relevo: 26,
    fase: 1.3,
    cor: '#648b56',
  },
  {
    id: 'vila-doce',
    nome: 'Vila Doce',
    centro: { x: 572, z: -330 },
    raio: 260,
    elevacao: 2,
    relevo: 20,
    fase: 2.4,
    cor: '#df9bac',
  },
  {
    id: 'recife',
    nome: 'Recife Coral',
    centro: { x: 606, z: 350 },
    raio: 300,
    elevacao: 0,
    relevo: 10,
    fase: 3.8,
    cor: '#d1cda1',
  },
  {
    id: 'pico',
    nome: 'Pico Gelado',
    centro: { x: 0, z: 700 },
    raio: 280,
    elevacao: 4,
    relevo: 85,
    fase: 0.8,
    cor: '#d8e9e9',
  },
  {
    id: 'vale-dos-dinos',
    nome: 'Vale dos Dinos',
    centro: { x: -606, z: 350 },
    raio: 320,
    elevacao: 2,
    relevo: 46,
    fase: 2.8,
    cor: '#aaa56d',
  },
  {
    id: 'nuvens',
    nome: 'Ilha das Nuvens',
    centro: { x: -589, z: -340 },
    raio: 270,
    elevacao: 60,
    relevo: 28,
    fase: 4.6,
    cor: '#b9cbdc',
  },
]

export function ilhaDoArquipelago(id: TerritorioId): IlhaDoArquipelago {
  const ilha = ARQUIPELAGO.find((i) => i.id === id)
  if (!ilha) throw new Error(`Território desconhecido: ${id}`)
  return ilha
}

export function paraGlobal(ilha: IlhaDoArquipelago, p: PontoDoTerritorio): PontoDoTerritorio {
  return { x: p.x + ilha.centro.x, y: p.y, z: p.z + ilha.centro.z }
}
export function paraLocal(ilha: IlhaDoArquipelago, p: PontoDoTerritorio): PontoDoTerritorio {
  return { x: p.x - ilha.centro.x, y: p.y, z: p.z - ilha.centro.z }
}

/** O raio é um envelope; as harmônicas desenham baías e penínsulas dentro dele. */
export function raioDoContorno(ilha: IlhaDoArquipelago, angulo: number): number {
  return (
    ilha.raio *
    (0.91 +
      0.04 * Math.cos(angulo * 3 + ilha.fase) +
      0.03 * Math.sin(angulo * 5 - ilha.fase) +
      0.02 * Math.cos(angulo * 7))
  )
}
function suave(a: number, b: number, valor: number): number {
  const t = Math.max(0, Math.min(1, (valor - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Uma função contínua, em coordenadas locais, usada pelo desenho, colisão e chegada. */
export function alturaDoTerritorio(ilha: IlhaDoArquipelago, x: number, z: number): number {
  const distancia = Math.hypot(x, z)
  const margem = raioDoContorno(ilha, Math.atan2(z, x)) - distancia
  if (ilha.id === 'sua-ilha')
    return FUNDO_DO_ARQUIPELAGO + suave(-16, 24, margem) * (12 + relevoDaFaisca(x, z))
  const costa = suave(-12, 20, margem)
  const interior = suave(36, 120, margem)
  const ondas = (Math.sin(x / 65 + ilha.fase) * Math.cos(z / 73) + 1) / 2
  const colina = ilha.relevo * interior * (0.25 + ondas * 0.75)
  return FUNDO_DO_ARQUIPELAGO + costa * (12 + ilha.elevacao + colina)
}

export function territorioEm(x: number, z: number): IlhaDoArquipelago | null {
  return (
    ARQUIPELAGO.find((ilha) => {
      const dx = x - ilha.centro.x
      const dz = z - ilha.centro.z
      return Math.hypot(dx, dz) <= raioDoContorno(ilha, Math.atan2(dz, dx))
    }) ?? null
  )
}

export function alturaDoArquipelago(x: number, z: number): number {
  let altura = FUNDO_DO_ARQUIPELAGO
  for (const ilha of ARQUIPELAGO)
    if (
      Math.abs(x - ilha.centro.x) <= ilha.raio + 16 &&
      Math.abs(z - ilha.centro.z) <= ilha.raio + 16
    )
      altura = Math.max(altura, alturaDoTerritorio(ilha, x - ilha.centro.x, z - ilha.centro.z))
  return altura
}

export interface ConexaoDoArquipelago {
  id: TerritorioId
  origem: PontoDoTerritorio
  destino: PontoDoTerritorio
  comprimento: number
  largura: number
}

/** Âncoras ficam 24 m para dentro da costa, no patamar antes do relevo. */
export function conexaoDaIlha(id: TerritorioId): ConexaoDoArquipelago {
  if (id === 'sua-ilha') throw new Error('A Faísca é a origem das conexões')
  const central = ilhaDoArquipelago('sua-ilha')
  const externa = ilhaDoArquipelago(id)
  const angulo = Math.atan2(externa.centro.z, externa.centro.x)
  const ancorar = (ilha: IlhaDoArquipelago, a: number) => {
    const raio = raioDoContorno(ilha, a) - 24
    const x = Math.cos(a) * raio
    const z = Math.sin(a) * raio
    return paraGlobal(ilha, { x, z, y: alturaDoTerritorio(ilha, x, z) })
  }
  const origem = ancorar(central, angulo)
  const destino = ancorar(externa, angulo + Math.PI)
  return {
    id,
    origem,
    destino,
    comprimento: Math.hypot(destino.x - origem.x, destino.z - origem.z),
    largura: 5,
  }
}
