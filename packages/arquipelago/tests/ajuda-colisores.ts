/**
 * Ajudantes dos testes de colisão das ilhas completas: ler o GLB, os grupos `col-*` e as contas do
 * corpo (cápsula de `CORPO`) contra caixas e cilindros.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Box3, Matrix4, type Object3D, Quaternion, Ray, Vector3 } from 'three'
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
