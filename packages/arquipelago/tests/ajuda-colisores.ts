/**
 * Ajudantes dos testes de colisão das ilhas completas: ler o GLB, os grupos `col-*` e as contas do
 * corpo (cápsula de `CORPO`) contra caixas e cilindros.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Box3, Matrix4, type Mesh, type Object3D, Quaternion, Ray, Raycaster, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { ColisorDaIlha } from '../src/mundo/colisores-da-ilha'
import { CORPO } from '../src/sistemas/corpo'

export const TAMPO = 1
export const CENTRO_DO_CORPO = CORPO.doCentroAoPe

export const arquivoDaIlha = (nome: string) =>
  join(import.meta.dir, '..', 'src', 'assets', 'ilhas', nome)

export async function carregarGlb(arquivo: string): Promise<Object3D> {
  const buf = readFileSync(arquivo)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return (await new GLTFLoader().parseAsync(ab, '')).scene
}

export function jsonDoGlb(arquivo: string): {
  nodes: { name?: string; mesh?: number }[]
  meshes: { primitives: { material?: number }[] }[]
  animations?: { name?: string; channels: { target: { node: number; path: string } }[] }[]
} {
  const buf = readFileSync(arquivo)
  const n = buf.readUInt32LE(12)
  return JSON.parse(buf.subarray(20, 20 + n).toString('utf8'))
}

/** O nome do grupo: sem o número do fim (`col-cil-poste-3` → `col-cil-poste`). */
export function grupo(nome: string): string {
  const partes = nome.split('-')
  return /^\d+$/.test(partes.at(-1) ?? '') ? partes.slice(0, -1).join('-') : nome
}

export type Forma = Exclude<ColisorDaIlha, { forma: 'malha' }>

function matriz(c: Forma): Matrix4 {
  return new Matrix4().compose(
    new Vector3(...c.posicao),
    new Quaternion(...c.rotacao),
    new Vector3(1, 1, 1),
  )
}

/** A altura do topo da forma em (x, z), olhando de cima; undefined se não está embaixo. */
export function topoEm(c: Forma, x: number, z: number): number | undefined {
  const raio = new Ray(new Vector3(x, 50, z), new Vector3(0, -1, 0)).applyMatrix4(
    matriz(c).invert(),
  )
  if (c.forma === 'caixa') {
    const caixa = new Box3(new Vector3(...c.meio).negate(), new Vector3(...c.meio))
    const p = raio.intersectBox(caixa, new Vector3())
    return p ? p.applyMatrix4(matriz(c)).y : undefined
  }
  if (Math.hypot(raio.origin.x, raio.origin.z) > c.raio) return undefined
  return c.posicao[1] + c.meiaAltura
}

/** O ponto mais alto da forma (caixas giradas só em volta do y, como as dos modelos). */
export function topoDaForma(c: Forma): number {
  return c.posicao[1] + (c.forma === 'caixa' ? c.meio[1] : c.meiaAltura)
}

/** O corpo (centro em `p`) bate nesta forma? */
export function bate(c: Forma, p: Vector3): boolean {
  const local = p.clone().applyMatrix4(matriz(c).invert())
  if (c.forma === 'caixa') {
    return (
      Math.abs(local.x) < c.meio[0] + CORPO.raio &&
      Math.abs(local.y) < c.meio[1] + CENTRO_DO_CORPO &&
      Math.abs(local.z) < c.meio[2] + CORPO.raio
    )
  }
  return (
    Math.hypot(local.x, local.z) < c.raio + CORPO.raio &&
    Math.abs(local.y) < c.meiaAltura + CENTRO_DO_CORPO
  )
}

/** O piso mais alto debaixo de (x, z), contando só as formas (o chão da ilha fica em `chao`). */
export function pisoEm(
  formas: readonly Forma[],
  x: number,
  z: number,
  chao = TAMPO,
): { y: number; nome?: string } {
  let melhor: { y: number; nome?: string } = { y: chao }
  for (const c of formas) {
    const y = topoEm(c, x, z)
    if (y !== undefined && y > melhor.y) melhor = { y, nome: c.nome }
  }
  return melhor
}

/**
 * A grade de andar de uma ilha (passos de 25 cm): em cada célula, a altura do piso (`col-terreno`,
 * de cima para baixo, ou o topo de uma forma baixa em cima dele) e se o corpo cabe ali (nenhuma forma o bate, e o chão das células vizinhas,
 * a 25 e 35 cm, o raio do corpo, não passa do degrau: parede, encosta). `alcance` diz as células
 * que se alcançam andando, subindo no máximo a rampa que o corpo sobe.
 */
export function gradeDeAndar(terreno: Mesh, formas: readonly Forma[], raio = 14, passo = 0.25) {
  const sobePorPasso = passo * Math.tan((CORPO.sobeAte * Math.PI) / 180) * 0.9
  const lado = Math.round((2 * raio) / passo) + 1
  const raios = new Raycaster()
  const baixo = new Vector3(0, -1, 0)
  const chaoEm = (x: number, z: number): number | undefined => {
    raios.set(new Vector3(x, 40, z), baixo)
    return raios.intersectObject(terreno, false)[0]?.point.y
  }
  const indice = (x: number, z: number) =>
    Math.round((z + raio) / passo) * lado + Math.round((x + raio) / passo)
  const centro = (i: number) => ({
    x: (i % lado) * passo - raio,
    z: Math.floor(i / lado) * passo - raio,
  })
  // O piso: o chão da ilha ou, em cima dele, o topo de uma forma baixa (até um degrau: os degraus
  // do palco, do observatório). Forma mais alta que isso é obstáculo, não piso.
  const alturas: (number | undefined)[] = []
  for (let i = 0; i < lado * lado; i++) {
    const { x, z } = centro(i)
    const chao = chaoEm(x, z)
    if (chao === undefined) {
      alturas.push(undefined)
      continue
    }
    let piso = chao
    for (const c of formas) {
      const topo = topoEm(c, x, z)
      if (topo !== undefined && topo > piso && topo - chao <= CORPO.degrau + 0.01) piso = topo
    }
    alturas.push(piso)
  }
  const vizinhas = [-lado - 1, -lado, -lado + 1, -1, 1, lado - 1, lado, lado + 1]
  const celulas: ({ y: number; livre: boolean } | null)[] = []
  for (let i = 0; i < lado * lado; i++) {
    const y = alturas[i]
    if (y === undefined || y < TAMPO - 0.05) {
      celulas.push(null)
      continue
    }
    const { x, z } = centro(i)
    const corpo = new Vector3(x, y + CENTRO_DO_CORPO + 0.05, z)
    // Forma com o topo a até um degrau do piso o corpo sobe sozinho: não é obstáculo.
    const livre =
      !vizinhas.some((d) => (alturas[i + d] ?? -Infinity) > y + CORPO.degrau) &&
      !formas.some((c) => topoDaForma(c) > y + CORPO.degrau && bate(c, corpo))
    celulas.push({ y, livre })
  }
  const alcance = (x: number, z: number): Set<number> => {
    const inicio = indice(x, z)
    const visto = new Set<number>([inicio])
    const fila = [inicio]
    while (fila.length) {
      const i = fila.pop() as number
      const c = celulas[i]
      if (!c) continue
      const col = i % lado
      for (const [di, dc] of [
        [-lado, 0],
        [lado, 0],
        [-1, -1],
        [1, 1],
      ] as const) {
        if ((dc === -1 && col === 0) || (dc === 1 && col === lado - 1)) continue
        const j = i + di
        const v = celulas[j]
        if (!v?.livre || visto.has(j) || v.y - c.y > sobePorPasso) continue
        visto.add(j)
        fila.push(j)
      }
    }
    return visto
  }
  /** Alguma célula alcançada fica a menos de `perto` de (x, z)? */
  const chegaPerto = (andou: Set<number>, x: number, z: number, perto = 1.2) =>
    [...andou].some((i) => {
      const c = centro(i)
      return Math.hypot(c.x - x, c.z - z) < perto
    })
  return { celulas, chaoEm, indice, centro, alcance, chegaPerto }
}
