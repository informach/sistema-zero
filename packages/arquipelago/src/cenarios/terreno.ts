import type { DocumentoDeCenario, Ponto } from '@sistemazero/molda-cenarios-core'
import { BufferAttribute, BufferGeometry, ShapeUtils, Vector2 } from 'three'
import { recortarMalha } from '../mundo/faisca/recortar-malha'
import type { FonteDoTerreno } from '../mundo/macro/terrenos'
import { RECORTE_DA_COLINA } from '../sistemas/colina-da-faisca'
import {
  ARQUIPELAGO,
  alturaDoArquipelago,
  type IlhaDoArquipelago,
} from '../sistemas/geografia-do-arquipelago'
import { LADO_DO_SETOR, malhaDistante, malhaDoSetor } from '../sistemas/setores-do-arquipelago'
import { estadoHerdado } from './apoio'

export const paraMundo = (p: Ponto, centro: Ponto, giro: number, escala: number): Ponto => ({
  x: centro.x + escala * (p.x * Math.cos(giro) + p.z * Math.sin(giro)),
  z: centro.z + escala * (-p.x * Math.sin(giro) + p.z * Math.cos(giro)),
})
/** Cada carimbo é avaliado contra o estado anterior: suavizar não depende da ordem de amostragem. */
export function alturaComRelevo(
  documento: DocumentoDeCenario,
  base: (x: number, z: number) => number,
) {
  const passo = 4,
    campo = new Map<string, number>()
  const ler = (x: number, z: number) => campo.get(`${x}:${z}`) ?? base(x, z)
  for (const c of documento.relevo) {
    const atualizacoes = new Map<string, number>()
    const minX = Math.max(-1600, Math.floor((c.centro.x - c.raio) / passo) * passo),
      maxX = Math.min(1600, Math.ceil((c.centro.x + c.raio) / passo) * passo)
    const minZ = Math.max(-1600, Math.floor((c.centro.z - c.raio) / passo) * passo),
      maxZ = Math.min(1600, Math.ceil((c.centro.z + c.raio) / passo) * passo)
    for (let z = minZ; z <= maxZ; z += passo)
      for (let x = minX; x <= maxX; x += passo) {
        const d = Math.hypot(x - c.centro.x, z - c.centro.z) / c.raio
        const h = ler(x, z)
        if (d >= 1) continue
        const peso = (1 - d * d) ** 2 * c.intensidade
        if (c.tipo === 'elevar') {
          atualizacoes.set(`${x}:${z}`, h + c.valor * peso)
          continue
        }
        const alvo =
          c.tipo === 'aplainar'
            ? c.valor
            : (ler(x - passo, z) + ler(x + passo, z) + ler(x, z - passo) + ler(x, z + passo)) / 4
        atualizacoes.set(`${x}:${z}`, h + (alvo - h) * peso)
      }
    for (const [chave, v] of atualizacoes) campo.set(chave, v)
  }
  if (!documento.relevo.length) return base
  return (x: number, z: number) => {
    const x0 = Math.floor(x / passo) * passo,
      z0 = Math.floor(z / passo) * passo,
      u = (x - x0) / passo,
      v = (z - z0) / passo
    return (
      ler(x0, z0) * (1 - u) * (1 - v) +
      ler(x0 + passo, z0) * u * (1 - v) +
      ler(x0, z0 + passo) * (1 - u) * v +
      ler(x0 + passo, z0 + passo) * u * v
    )
  }
}
function triangulos(poligono: readonly Ponto[]) {
  const pontos = poligono.map((p) => new Vector2(p.x, p.z))
  return ShapeUtils.triangulateShape(pontos, []).map((face) => face.map((i) => poligono[i]!))
}
/** Uma fonte por documento; caches não escapam para outros projetos ou revisões. */
export function criarTerrenoDeCenario(
  doc: DocumentoDeCenario,
): FonteDoTerreno & { altura(x: number, z: number): number; exata(x: number, z: number): number } {
  const _ilha = ARQUIPELAGO[0]!
  const altura = alturaComRelevo(doc, alturaDoArquipelago)
  const furos = doc.aguas
    .filter((a) => !estadoHerdado(doc, a).oculto)
    .flatMap((a) => triangulos(a.recorte.map((p) => paraMundo(p, a.centro, a.giro, a.escala))))
  // O recorte nativo só acompanha os lances ainda presentes nas posições originais.
  if (
    [0, 1, 2].every((i) =>
      doc.instancias.some(
        (p) =>
          p.id === `escada-farol-${i}` &&
          !p.oculto &&
          Math.abs(p.transformacao.posicao.x + 3) < 0.001,
      ),
    )
  )
    furos.push(...triangulos(RECORTE_DA_COLINA.furo))
  const cache = new Map<string, { vertices: Float32Array; indices: Uint32Array }>()
  const setor = (i: IlhaDoArquipelago, x: number, z: number) => {
    const chave = `${i.id}:${x}:${z}`
    const anterior = cache.get(chave)
    if (anterior) return anterior
    const dados = malhaDoSetor(i, x, z, 4, false, (x, z) => altura(x + i.centro.x, z + i.centro.z))
    const base = new BufferGeometry()
      .setAttribute('position', new BufferAttribute(dados.vertices, 3))
      .setIndex(new BufferAttribute(dados.indices, 1))
    const recortada = recortarMalha(
      base,
      [],
      furos.map((f) => f.map((p) => ({ x: p.x - i.centro.x, z: p.z - i.centro.z }))),
    )
    const pos = recortada.getAttribute('position')
    const saida = {
      vertices: new Float32Array(pos.array),
      indices: Uint32Array.from({ length: pos.count }, (_, i) => i),
    }
    base.dispose()
    recortada.dispose()
    cache.set(chave, saida)
    return saida
  }
  const distante = (i: IlhaDoArquipelago, excluir: ReadonlySet<string>) => {
    const m = malhaDistante(i, excluir)
    for (let n = 0; n < m.vertices.length; n += 3)
      m.vertices[n + 1] = altura(m.vertices[n]! + i.centro.x, m.vertices[n + 2]! + i.centro.z)
    return m
  }
  // Interpolação do mesmo triângulo de 4 m que o renderer e o Rapier recebem.
  const exata = (x: number, z: number) => {
    const ilha = ARQUIPELAGO.find(
      (i) => Math.abs(x - i.centro.x) <= i.raio + 16 && Math.abs(z - i.centro.z) <= i.raio + 16,
    )
    if (!ilha) return altura(x, z)
    x -= ilha.centro.x
    z -= ilha.centro.z
    const sx = Math.floor(x / LADO_DO_SETOR),
      sz = Math.floor(z / LADO_DO_SETOR),
      m = setor(ilha, sx, sz)
    for (let n = 0; n < m.indices.length; n += 3) {
      const a = m.indices[n]! * 3,
        b = m.indices[n + 1]! * 3,
        c = m.indices[n + 2]! * 3
      const ax = m.vertices[a]!,
        az = m.vertices[a + 2]!,
        bx = m.vertices[b]!,
        bz = m.vertices[b + 2]!,
        cx = m.vertices[c]!,
        cz = m.vertices[c + 2]!
      const det = (bx - ax) * (cz - az) - (cx - ax) * (bz - az)
      if (Math.abs(det) < 1e-9) continue
      const u = ((x - ax) * (cz - az) - (cx - ax) * (z - az)) / det,
        v = ((bx - ax) * (z - az) - (x - ax) * (bz - az)) / det
      if (u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6)
        return (
          m.vertices[a + 1]! +
          u * (m.vertices[b + 1]! - m.vertices[a + 1]!) +
          v * (m.vertices[c + 1]! - m.vertices[a + 1]!)
        )
    }
    return altura(x + ilha.centro.x, z + ilha.centro.z)
  }
  return { setor, distante, altura, exata }
}
