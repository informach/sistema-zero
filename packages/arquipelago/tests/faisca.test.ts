import { expect, test } from 'bun:test'
import { ARTE_DA_FAISCA } from '../src/mundo/faisca/arte.generated'
import { COMPOSICAO_DA_FAISCA } from '../src/sistemas/composicao-faisca'
import {
  comprimentoDaRota,
  DISTRITOS_DA_FAISCA,
  LUGAR_DA_FAISCA,
  ligarCabeceiras,
  pontosAoLongo,
  ROTAS_DA_FAISCA as ROTAS_BASE,
} from '../src/sistemas/faisca'
import {
  ARQUIPELAGO,
  alturaDoArquipelago,
  conexaoDaIlha,
} from '../src/sistemas/geografia-do-arquipelago'
import { VOLUMES_DA_VILA } from '../src/sistemas/implantacao-da-faisca'
import { MUNDO_DA_AVENTURA } from '../src/sistemas/mundo-pela-animacao'

const ROTAS_DA_FAISCA = [
  ...ROTAS_BASE,
  ...ligarCabeceiras(ARQUIPELAGO.slice(1).map((i) => conexaoDaIlha(i.id))),
]
test('os caminhos cotidianos mantêm passagem para o corpo entre os modelos reais', () => {
  const bloqueios = new Set<string>()
  for (const r of ROTAS_DA_FAISCA.filter((r) => r.tipo !== 'ponte-interna'))
    for (const a of pontosAoLongo(r.pontos, 0.25))
      for (const objeto of COMPOSICAO_DA_FAISCA.filter((p) => p.solida && p.solida !== 'ponte')) {
        const dx = a.x - objeto.x,
          dz = a.z - objeto.z,
          s = objeto.escala
        if (objeto.solida === 'tronco') {
          if (Math.hypot(dx, dz) < 0.23 * s + 0.16) bloqueios.add(`${r.id}:${objeto.id}`)
          continue
        }
        const meta = ARTE_DA_FAISCA.pecas[objeto.peca as keyof typeof ARTE_DA_FAISCA.pecas],
          box = meta.colisao[0]
        const x = Math.cos(objeto.giro) * dx - Math.sin(objeto.giro) * dz,
          z = Math.sin(objeto.giro) * dx + Math.cos(objeto.giro) * dz
        if (
          x > box.min[0] * s - 0.16 &&
          x < box.max[0] * s + 0.16 &&
          z > box.min[2] * s - 0.16 &&
          z < box.max[2] * s + 0.16
        )
          bloqueios.add(`${r.id}:${objeto.id}`)
      }
  expect([...bloqueios]).toEqual([])
})

test('volumes de convívio deixam os eixos e o lote livres, incluindo o retorno pela encosta', () => {
  const bloqueios: string[] = []
  for (const r of ROTAS_DA_FAISCA)
    for (const p of pontosAoLongo(r.pontos, 0.25))
      for (const v of VOLUMES_DA_VILA)
        if (
          Math.abs(p.x - v.x) < v.largura / 2 + 0.2 &&
          Math.abs(p.z - v.z) < v.profundidade / 2 + 0.2
        )
          bloqueios.push(`${r.id}:${v.id}`)
  expect(bloqueios).toEqual([])
  for (const v of VOLUMES_DA_VILA)
    expect(
      Math.abs(v.x) - v.largura / 2 > 12 ||
        v.z + v.profundidade / 2 < 154 ||
        v.z - v.profundidade / 2 > 178,
    ).toBe(true)
})

test('o lote da Morada também fica livre das copas das árvores', () => {
  for (const p of COMPOSICAO_DA_FAISCA.filter((p) => p.solida === 'tronco')) {
    const box = ARTE_DA_FAISCA.pecas[p.peca as keyof typeof ARTE_DA_FAISCA.pecas].colisao[0]
    const xs: number[] = [],
      zs: number[] = []
    for (const x of [box.min[0], box.max[0]])
      for (const z of [box.min[2], box.max[2]]) {
        xs.push(p.x + p.escala * (Math.cos(p.giro) * x + Math.sin(p.giro) * z))
        zs.push(p.z + p.escala * (-Math.sin(p.giro) * x + Math.cos(p.giro) * z))
      }
    expect(
      Math.max(...xs) < -12 ||
        Math.min(...xs) > 12 ||
        Math.max(...zs) < 154 ||
        Math.min(...zs) > 178,
    ).toBe(true)
  }
})

test('o cotidiano cabe no coração habitado com a velocidade nativa', () => {
  const metros = (id: string) =>
    comprimentoDaRota(ROTAS_DA_FAISCA.find((r) => r.id === id)!.pontos, alturaDoArquipelago)
  expect(metros('casa-praca')).toBeGreaterThanOrEqual(10)
  expect(metros('casa-praca')).toBeLessThanOrEqual(15)
  for (const id of ['praca-horta', 'praca-patio', 'praca-costa']) {
    expect(metros(id)).toBeGreaterThanOrEqual(15)
    expect(metros(id)).toBeLessThan(31)
  }
  expect((metros('casa-praca') + metros('praca-horta')) / MUNDO_DA_AVENTURA.andar).toBeLessThan(40)
  expect(metros('praca-farol') / MUNDO_DA_AVENTURA.andar).toBeLessThan(60)
})

test('anel, atalhos e ramais alcançam os seis distritos e todas as saídas', () => {
  const chave = (p: { x: number; z: number }) => `${p.x},${p.z}`
  const adj = new Map<string, Set<string>>()
  for (const r of ROTAS_DA_FAISCA)
    for (let i = 1; i < r.pontos.length; i++) {
      const a = chave(r.pontos[i - 1]!),
        b = chave(r.pontos[i]!)
      if (!adj.has(a)) adj.set(a, new Set())
      if (!adj.has(b)) adj.set(b, new Set())
      adj.get(a)!.add(b)
      adj.get(b)!.add(a)
    }
  const vistos = new Set<string>(),
    fila = [chave(LUGAR_DA_FAISCA.praca)]
  while (fila.length) {
    const id = fila.pop()!
    if (vistos.has(id)) continue
    vistos.add(id)
    fila.push(...(adj.get(id) ?? []))
  }
  for (const d of DISTRITOS_DA_FAISCA)
    expect(vistos.has(chave(LUGAR_DA_FAISCA[d.marco]))).toBe(true)
  for (const r of ROTAS_DA_FAISCA.filter((r) => r.tipo === 'cabeceira'))
    expect(vistos.has(chave(r.pontos.at(-1)!))).toBe(true)
  expect(ROTAS_DA_FAISCA.filter((r) => r.tipo === 'cabeceira')).toHaveLength(6)
})

test('rotas ficam em terra, com subida caminhável e intervalos curtos de curiosidade', () => {
  for (const r of ROTAS_DA_FAISCA) {
    // A travessia do lago usa o piso da ponte de arte, conferido pela física separadamente.
    if (r.tipo === 'ponte-interna') {
      expect(r.pontos.every((p) => alturaDoArquipelago(p.x, p.z) > 3.9)).toBe(true)
      continue
    }
    const amostras = pontosAoLongo(r.pontos, 1)
    for (let i = 1; i < amostras.length; i++) {
      const a = amostras[i - 1]!,
        b = amostras[i]!
      const y = alturaDoArquipelago(b.x, b.z)
      expect(y).toBeGreaterThan(0)
      expect(
        Math.abs(y - alturaDoArquipelago(a.x, a.z)) / Math.hypot(b.x - a.x, b.z - a.z),
      ).toBeLessThan(0.8)
    }
    const marcos = pontosAoLongo(r.pontos, 24)
    for (let i = 1; i < marcos.length; i++)
      expect(
        Math.hypot(marcos[i]!.x - marcos[i - 1]!.x, marcos[i]!.z - marcos[i - 1]!.z),
      ).toBeLessThanOrEqual(24.001)
  }
})
