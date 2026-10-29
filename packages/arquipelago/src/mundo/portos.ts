import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { Porto } from '../sistemas/barco'

/** Lê só o JSON do GLB. Não cria malhas, texturas ou uma segunda ilha na GPU. */
export function ancorasDoPorto(
  bytes: ArrayBuffer,
  embarque: string,
  meio: { x: number; z: number },
  giro: number,
): Porto {
  const view = new DataView(bytes)
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(16, true) !== 0x4e4f534a)
    throw new Error('Porto sem JSON de GLB')
  const json = JSON.parse(
    new TextDecoder().decode(new Uint8Array(bytes, 20, view.getUint32(12, true))),
  ) as {
    nodes: {
      name?: string
      translation?: number[]
      rotation?: number[]
      scale?: number[]
      matrix?: number[]
      children?: number[]
    }[]
  }
  const matriz = (i: number): Matrix4 => {
    const n = json.nodes[i]!
    const m = n.matrix
      ? new Matrix4().fromArray(n.matrix)
      : new Matrix4().compose(
          new Vector3().fromArray(n.translation ?? [0, 0, 0]),
          new Quaternion().fromArray(n.rotation ?? [0, 0, 0, 1]),
          new Vector3().fromArray(n.scale ?? [1, 1, 1]),
        )
    const pai = json.nodes.findIndex((p) => p.children?.includes(i))
    return pai < 0 ? m : m.premultiply(matriz(pai))
  }
  const mundo = new Matrix4().makeRotationY(giro).setPosition(meio.x, 0, meio.z)
  const ler = (nome: string) => {
    const i = json.nodes.findIndex((n) => n.name === nome)
    if (i < 0) throw new Error(`Porto sem âncora ${nome}`)
    const m = matriz(i).premultiply(mundo)
    const p = new Vector3(),
      q = new Quaternion(),
      s = new Vector3()
    m.decompose(p, q, s)
    return { p: { x: p.x, y: p.y, z: p.z }, giro: new Euler().setFromQuaternion(q, 'YXZ').y }
  }
  const barco = ler('barco')
  return { barco: barco.p, giro: barco.giro, embarque: ler(embarque).p }
}
