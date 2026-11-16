import type {
  DocumentoDeCenario,
  InstanciaDeCenario,
  ModeloDeCatalogo,
} from '@sistemazero/molda-cenarios-core'
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'

export function matrizDaInstancia(p: InstanciaDeCenario) {
  const t = p.transformacao
  return new Matrix4().compose(
    new Vector3(t.posicao.x, t.posicao.y, t.posicao.z),
    new Quaternion().setFromEuler(new Euler(t.rotacao.x, t.rotacao.y, t.rotacao.z)),
    new Vector3().setScalar(t.escala),
  )
}
export function estadoHerdado(
  doc: DocumentoDeCenario,
  p: { bloqueado: boolean; oculto: boolean; grupo: string | null },
) {
  let bloqueado = p.bloqueado,
    oculto = p.oculto,
    pai = p.grupo
  const vistos = new Set<string>()
  while (pai && !vistos.has(pai)) {
    vistos.add(pai)
    const g = doc.grupos.find((g) => g.id === pai)
    if (!g) break
    bloqueado ||= g.bloqueado
    oculto ||= g.oculto
    pai = g.grupo
  }
  return { bloqueado, oculto }
}
/** Apoios recalculados pelo volume real. O documento conserva a intenção e o deslocamento autoral. */
export function assentarInstancias(
  doc: DocumentoDeCenario,
  catalogo: ReadonlyMap<string, ModeloDeCatalogo>,
  altura: (x: number, z: number) => number,
) {
  const resolvidas = new Map<string, InstanciaDeCenario>()
  const resolver = (p: InstanciaDeCenario): InstanciaDeCenario => {
    const existente = resolvidas.get(p.id)
    if (existente) return existente
    const t = structuredClone(p.transformacao),
      m = catalogo.get(p.modelo)!
    if (p.apoio.tipo === 'objeto') {
      const id = p.apoio.objeto,
        pai = doc.instancias.find((i) => i.id === id)!
      t.posicao.y = resolver(pai).transformacao.posicao.y + p.apoio.deslocamento
    }
    if (p.apoio.tipo === 'agua') {
      const apoio = p.apoio,
        a = doc.aguas.find((a) => a.id === apoio.agua)!,
        c = Math.cos(a.giro),
        s = Math.sin(a.giro)
      t.posicao = {
        x: a.centro.x + a.escala * (c * apoio.local.x + s * apoio.local.z),
        z: a.centro.z + a.escala * (-s * apoio.local.x + c * apoio.local.z),
        y: a.nivel + a.escala * apoio.deslocamento,
      }
      t.rotacao.y = a.giro + apoio.giro
      t.escala = a.escala * apoio.escala
    }
    if (p.apoio.tipo === 'terreno') {
      // O offset inicial é um contrato do importador. Recalcular a diferença de base
      // permite manter as proporções originais e assentar depois de mover/rotacionar/escalar.
      const raiz = p.fisica === 'tronco' || /arbusto|flor|tufo/.test(m.caminho)
      const c = Math.cos(t.rotacao.y),
        s = Math.sin(t.rotacao.y),
        amostras: number[] = []
      const minX = raiz ? -0.2 : m.min[0],
        maxX = raiz ? 0.2 : m.max[0],
        minZ = raiz ? -0.2 : m.min[2],
        maxZ = raiz ? 0.2 : m.max[2]
      for (let i = 0; i <= 4; i++)
        for (let j = 0; j <= 4; j++) {
          const x = (minX + ((maxX - minX) * i) / 4) * t.escala,
            z = (minZ + ((maxZ - minZ) * j) / 4) * t.escala
          amostras.push(altura(t.posicao.x + c * x + s * z, t.posicao.z - s * x + c * z))
        }
      const base =
        raiz || p.enterrada || /rocha/.test(m.caminho)
          ? Math.min(...amostras) - 0.025
          : Math.max(...amostras)
      t.posicao.y =
        base -
        m.min[1] * t.escala -
        (p.enterrada ?? 0) * (m.max[1] - m.min[1]) * t.escala +
        p.apoio.deslocamento
      if (p.apoio.referencia === 'pivo')
        t.posicao.y = altura(t.posicao.x, t.posicao.z) + p.apoio.deslocamento
      if (p.apoio.inclinar) {
        const dx =
            altura(t.posicao.x + 0.25, t.posicao.z) - altura(t.posicao.x - 0.25, t.posicao.z),
          dz = altura(t.posicao.x, t.posicao.z + 0.25) - altura(t.posicao.x, t.posicao.z - 0.25)
        const normal = new Vector3(-dx, 0.5, -dz).normalize(),
          q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal)
        q.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), t.rotacao.y))
        const e = new Euler().setFromQuaternion(q)
        t.rotacao = { x: e.x, y: e.y, z: e.z }
      }
      if (
        p.apoio.referencia !== 'pivo' &&
        (Math.abs(t.rotacao.x) > 1e-6 || Math.abs(t.rotacao.z) > 1e-6)
      ) {
        const q = new Quaternion().setFromEuler(new Euler(t.rotacao.x, t.rotacao.y, t.rotacao.z))
        const contatos: number[] = []
        for (const y of [m.min[1], m.max[1]])
          for (let i = 0; i <= 4; i++)
            for (let j = 0; j <= 4; j++) {
              const v = new Vector3(
                minX + ((maxX - minX) * i) / 4,
                y,
                minZ + ((maxZ - minZ) * j) / 4,
              )
                .multiplyScalar(t.escala)
                .applyQuaternion(q)
              contatos.push(altura(t.posicao.x + v.x, t.posicao.z + v.z) - v.y)
            }
        t.posicao.y =
          Math.max(...contatos) +
          p.apoio.deslocamento -
          (p.enterrada ?? 0) * (m.max[1] - m.min[1]) * t.escala
      }
    }
    const pronta = { ...p, transformacao: t }
    resolvidas.set(p.id, pronta)
    return pronta
  }
  return doc.instancias.map(resolver)
}
