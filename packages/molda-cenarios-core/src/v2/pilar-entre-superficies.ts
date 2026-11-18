import {
  contornoConvexo,
  type MalhaParaRecorte,
  planosDoPoligonoConvexo,
  recortarAtributos,
} from '../geometria'
import { alturaDoCampo } from './campo-de-alturas'
import type { PontoNoChao } from './curvas'
import type { BaseDeCenario } from './documento'
import type { EstadoDoTerreno } from './edicao-de-terreno'
import { recortarMalhaNoChao } from './recorte-de-chao'

type Atributos = ReturnType<typeof recortarAtributos>
export class PilarSemSuperficie extends Error {
  override readonly name = 'PilarSemSuperficie'
}
type Caixa = { x0: number; x1: number; z0: number; z1: number }
type Face = {
  malha: MalhaParaRecorte
  dominio: PontoNoChao[]
  caixa: Caixa
  a: number
  b: number
  c: number
}
const cruzam = (a: Caixa, b: Caixa) =>
  a.x0 <= b.x1 + 1e-7 && b.x0 <= a.x1 + 1e-7 && a.z0 <= b.z1 + 1e-7 && b.z0 <= a.z1 + 1e-7
function caixa(p: readonly PontoNoChao[]): Caixa {
  return {
    x0: Math.min(...p.map((p) => p.x)),
    x1: Math.max(...p.map((p) => p.x)),
    z0: Math.min(...p.map((p) => p.z)),
    z1: Math.max(...p.map((p) => p.z)),
  }
}
function dominio(posicoes: ArrayLike<number>) {
  return contornoConvexo(
    Array.from({ length: posicoes.length / 3 }, (_, i) => ({
      x: posicoes[i * 3]!,
      z: posicoes[i * 3 + 2]!,
    })),
  )
}
function malhaPlana(p: readonly PontoNoChao[]): MalhaParaRecorte {
  return {
    atributos: { position: { itemSize: 3, valores: p.flatMap((p) => [p.x, 0, p.z]) } },
    indices: Array.from({ length: p.length - 2 }, (_, i) => [0, i + 1, i + 2]).flat(),
  }
}
function areaProjetada(p: ArrayLike<number>) {
  let area = 0
  for (let i = 0; i < p.length; i += 9)
    area +=
      Math.abs(
        (p[i + 5]! - p[i + 2]!) * (p[i + 6]! - p[i]!) -
          (p[i + 3]! - p[i]!) * (p[i + 8]! - p[i + 2]!),
      ) / 2
  return area
}
const dentro = (p: PontoNoChao, planos: ReturnType<typeof planosDoPoligonoConvexo>) =>
  planos.every((n) => n.x * p.x + n.z * p.z - n.limite <= Math.hypot(n.x, n.z) * 1e-9)

/** Envelope inferior exato por regiões: cada face é recortada onde outra está abaixo.
 * As coordenadas X/Z são locais ao pilar; Y conserva a mesma referência do campo.
 */
function tampaInferior(triangulos: ArrayLike<number>, limites: Caixa) {
  if (
    !Number.isSafeInteger(triangulos.length) ||
    triangulos.length % 9 ||
    triangulos.length > 180_000
  )
    throw Error('Triângulos inválidos ou excessivos para o apoio')
  const retangulo = [
      { x: limites.x0, z: limites.z0 },
      { x: limites.x1, z: limites.z0 },
      { x: limites.x1, z: limites.z1 },
      { x: limites.x0, z: limites.z1 },
    ],
    planos = planosDoPoligonoConvexo(retangulo),
    faces: Face[] = []
  for (let i = 0; i < triangulos.length; i += 9) {
    const p = Array.from({ length: 9 }, (_, j) => triangulos[i + j]!)
    if (!p.every(Number.isFinite))
      throw Error('A superfície de apoio contém uma coordenada inválida')
    const ux = p[3]! - p[0]!,
      uy = p[4]! - p[1]!,
      uz = p[5]! - p[2]!,
      vx = p[6]! - p[0]!,
      vy = p[7]! - p[1]!,
      vz = p[8]! - p[2]!,
      nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx
    if (Math.abs(ny) < Math.hypot(nx, ny, nz) * 1e-7 || Math.abs(ny) < 1e-12) continue
    const malha: MalhaParaRecorte = { atributos: { position: { itemSize: 3, valores: p } } },
      recorte = recortarAtributos(malha, planos),
      anel = dominio(recorte.position!.valores)
    if (anel.length < 3 || areaProjetada(recorte.position!.valores) < 1e-12) continue
    const a = -nx / ny,
      b = -nz / ny,
      c = p[1]! - a * p[0]! - b * p[2]!
    faces.push({ malha, dominio: anel, caixa: caixa(anel), a, b, c })
  }
  if (faces.length * faces.length > 500_000)
    throw Error('A superfície é complexa demais para preparar este pilar')
  const saida: number[] = []
  for (const [i, f] of faces.entries()) {
    const excluir: PontoNoChao[][] = []
    for (const [j, g] of faces.entries()) {
      if (i === j || !cruzam(f.caixa, g.caixa)) continue
      const x = g.a - f.a,
        z = g.b - f.b,
        dy = g.c - f.c
      if (Math.hypot(x, z) < 1e-9) {
        if (dy < -1e-7 || (Math.abs(dy) <= 1e-7 && j < i)) excluir.push(g.dominio)
      } else {
        const corte = recortarAtributos(malhaPlana(g.dominio), [{ x, z, limite: -dy }]),
          anel = dominio(corte.position!.valores)
        if (anel.length >= 3 && areaProjetada(corte.position!.valores) > 1e-12) excluir.push(anel)
      }
    }
    const recorte = recortarAtributos(f.malha, planos, excluir).position!.valores
    for (const v of recorte) saida.push(v)
    if (saida.length / 9 > 2000) throw Error('A tampa do pilar exige subdivisões demais')
  }
  const esperado = (limites.x1 - limites.x0) * (limites.z1 - limites.z0),
    area = areaProjetada(saida)
  if (area < 1e-9)
    throw new PilarSemSuperficie('O pilar não encontra nenhuma superfície do tabuleiro')
  // Entre tábuas pode não existir teto. Fechar a própria madeira do pilar na menor
  // altura de contato, apenas nas lacunas; isso não inventa outra superfície de ponte.
  let menor = Infinity
  for (let i = 1; i < saida.length; i += 3) menor = Math.min(menor, saida[i]!)
  const base = malhaPlana(retangulo),
    bp = Array.from(base.atributos.position!.valores)
  for (let i = 1; i < bp.length; i += 3) bp[i] = menor
  const lacunas = recortarAtributos(
    { ...base, atributos: { position: { itemSize: 3, valores: bp } } },
    [],
    faces.map((f) => f.dominio),
  ).position!.valores
  for (const v of lacunas) saida.push(v)
  if (Math.abs(areaProjetada(saida) - esperado) > Math.max(1e-7, esperado * 1e-4))
    throw Error('O recorte das superfícies não fechou a tampa do pilar', {
      cause: { area, esperado },
    })
  return { posicoes: Float32Array.from(saida), contato: { area, total: esperado } }
}

/** Prisma com Y normalizado de 0 a 1: divide pelas faces reais do chão e do tabuleiro.
 * Não interpola uma tampa arqueada só pelos cantos nem cobre furos com apoio imaginário.
 */
export function pilarEntreSuperficies(
  normalizada: MalhaParaRecorte,
  triangulosSuperiores: ArrayLike<number>,
  base: BaseDeCenario,
  estado: EstadoDoTerreno | null,
  origem: PontoNoChao,
) {
  if (
    Object.entries(normalizada.atributos).some(
      ([n, a]) => !['position', 'normal', 'uv'].includes(n) || a.itemSize !== (n === 'uv' ? 2 : 3),
    )
  )
    throw Error('O prisma de referência do pilar contém atributos incompatíveis')
  const solo = recortarMalhaNoChao(normalizada, base, estado, origem),
    p = solo.position!.valores,
    original = normalizada.atributos.position!.valores,
    projetados = Array.from({ length: original.length / 3 }, (_, i) => ({
      x: original[i * 3]!,
      z: original[i * 3 + 2]!,
    })),
    limites = caixa(projetados)
  if (!p.length) throw new PilarSemSuperficie('O pilar não tem chão para se apoiar')
  let areaDoSolo = 0
  for (let i = 0; i < p.length; i += 9)
    if ([1, 4, 7].every((j) => Math.abs(p[i + j]! - 1) < 1e-7))
      areaDoSolo += areaProjetada(p.subarray(i, i + 9))
  const areaEsperada = (limites.x1 - limites.x0) * (limites.z1 - limites.z0)
  if (Math.abs(areaDoSolo - areaEsperada) > Math.max(1e-7, areaEsperada * 1e-4))
    throw new PilarSemSuperficie('O pilar não tem chão sob toda a sua largura')
  if (p.some((v, i) => i % 3 === 1 && (v < -1e-7 || v > 1 + 1e-7)))
    throw Error('O prisma do pilar precisa ter altura normalizada')
  const tampa = tampaInferior(triangulosSuperiores, limites),
    topo = tampa.posicoes,
    capFaces: {
      planos: ReturnType<typeof planosDoPoligonoConvexo>
      anel: PontoNoChao[]
      a: number
      b: number
      c: number
      caixa: Caixa
    }[] = []
  for (let i = 0; i < topo.length; i += 9) {
    const anel = [0, 3, 6].map((j) => ({ x: topo[i + j]!, z: topo[i + j + 2]! })),
      ux = topo[i + 3]! - topo[i]!,
      uy = topo[i + 4]! - topo[i + 1]!,
      uz = topo[i + 5]! - topo[i + 2]!,
      vx = topo[i + 6]! - topo[i]!,
      vy = topo[i + 7]! - topo[i + 1]!,
      vz = topo[i + 8]! - topo[i + 2]!,
      ny = uz * vx - ux * vz
    if (Math.abs(ny) < 1e-12) continue
    const a = -(uy * vz - uz * vy) / ny,
      b = -(ux * vy - uy * vx) / ny
    capFaces.push({
      planos: planosDoPoligonoConvexo(anel),
      anel,
      caixa: caixa(anel),
      a,
      b,
      c: topo[i + 1]! - a * topo[i]! - b * topo[i + 2]!,
    })
  }
  if ((p.length / 9) * capFaces.length > 2_000_000)
    throw Error('O pilar exige subdivisões demais para este relevo')
  const dados = new Map(Object.keys(solo).map((n) => [n, [] as number[]])),
    nomes = Object.keys(solo)
  for (let i = 0; i < p.length; i += 9) {
    const tri: MalhaParaRecorte = {
        atributos: Object.fromEntries(
          nomes.map((nome) => {
            const a = solo[nome]!
            return [
              nome,
              {
                itemSize: a.itemSize,
                valores: a.valores.subarray((i / 3) * a.itemSize, (i / 3 + 3) * a.itemSize),
              },
            ]
          }),
        ),
      },
      box = caixa([0, 3, 6].map((j) => ({ x: p[i + j]!, z: p[i + j + 2]! }))),
      vistos = new Set<string>()
    for (const face of capFaces) {
      if (!cruzam(box, face.caixa)) continue
      const recorte = recortarAtributos(tri, face.planos),
        rp = recorte.position!.valores
      for (let j = 0; j < rp.length; j += 9) {
        const ny =
          (rp[j + 5]! - rp[j + 2]!) * (rp[j + 6]! - rp[j]!) -
          (rp[j + 3]! - rp[j]!) * (rp[j + 8]! - rp[j + 2]!)
        if (Math.abs(ny) < 1e-12) {
          const x = (rp[j]! + rp[j + 3]! + rp[j + 6]!) / 3,
            z = (rp[j + 2]! + rp[j + 5]! + rp[j + 8]!) / 3,
            centroX = (limites.x0 + limites.x1) / 2,
            centroZ = (limites.z0 + limites.z1) / 2
          if (!dentro({ x: x + (centroX - x) * 1e-5, z: z + (centroZ - z) * 1e-5 }, face.planos))
            continue
        }
        const chave = [0, 3, 6]
          .map((k) => Array.from(rp.subarray(j + k, j + k + 3)).join(','))
          .sort()
          .join('|')
        if (vistos.has(chave)) continue
        vistos.add(chave)
        for (let k = 0; k < 9; k += 3) {
          const x = rp[j + k]!,
            z = rp[j + k + 2]!,
            fundo =
              base.tipo === 'terreno'
                ? alturaDoCampo(estado!.campo, x + origem.x, z + origem.z)
                : 0,
            teto = face.a * x + face.b * z + face.c
          if (!Number.isFinite(teto) || teto < fundo - 1e-5)
            throw new PilarSemSuperficie('O pilar não tem vão entre o terreno e o tabuleiro')
          rp[j + k + 1] = fundo + rp[j + k + 1]! * Math.max(0, teto - fundo)
        }
        if (dados.get('position')!.length / 3 + 3 > 600_000)
          throw Error('O pilar exige vértices demais')
        for (const nome of nomes) {
          const a = recorte[nome]!,
            de = (j / 3) * a.itemSize
          for (const v of a.valores.subarray(de, de + 3 * a.itemSize)) dados.get(nome)!.push(v)
        }
      }
    }
  }
  // Uma viga sob o tabuleiro pode mudar a altura inferior abruptamente. Fechar também
  // os espelhos internos entre as tampas; deixar apenas as faces superiores abriria o sólido.
  const bordas = capFaces.flatMap((face) =>
    face.anel.map((a, i) => ({ a, b: face.anel[(i + 1) % 3]!, face })),
  )
  if (bordas.length * bordas.length > 4_000_000)
    throw Error('O apoio contém transições demais para este pilar')
  for (const { a, b, face } of bordas) {
    const dx = b.x - a.x,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz)
    if (len < 1e-8) continue
    const centro = {
        x: face.anel.reduce((s, p) => s + p.x, 0) / 3,
        z: face.anel.reduce((s, p) => s + p.z, 0) / 3,
      },
      sentido = (centro.x - a.x) * -dz + (centro.z - a.z) * dx > 0 ? -1 : 1,
      fora = { x: (-dz / len) * sentido, z: (dx / len) * sentido },
      cortes = [0, 1]
    for (const f of capFaces)
      for (const v of f.anel) {
        const t = ((v.x - a.x) * dx + (v.z - a.z) * dz) / (len * len)
        if (t > 1e-7 && t < 1 - 1e-7 && Math.abs((v.x - a.x) * dz - (v.z - a.z) * dx) / len < 1e-6)
          cortes.push(t)
      }
    cortes.sort((a, b) => a - b)
    for (let i = 0; i < cortes.length - 1; i++) {
      const t0 = cortes[i]!,
        t1 = cortes[i + 1]!
      if (t1 - t0 < 1e-7) continue
      const amostra = {
          x: a.x + (dx * (t0 + t1)) / 2 + fora.x * 1e-7,
          z: a.z + (dz * (t0 + t1)) / 2 + fora.z * 1e-7,
        },
        vizinha = capFaces.find((f) => f !== face && dentro(amostra, f.planos))
      if (!vizinha) continue // Perímetro externo: já fechado pelo prisma original.
      const ponto = (t: number) => ({ x: a.x + dx * t, z: a.z + dz * t }),
        pa = ponto(t0),
        pb = ponto(t1),
        h = (f: typeof face, p: PontoNoChao) => f.a * p.x + f.b * p.z + f.c,
        da = h(face, pa) - h(vizinha, pa),
        db = h(face, pb) - h(vizinha, pb),
        partes = [t0, t1]
      if (da * db < 0) partes.splice(1, 0, t0 + ((t1 - t0) * da) / (da - db))
      for (let j = 0; j < partes.length - 1; j++) {
        const a = ponto(partes[j]!),
          b = ponto(partes[j + 1]!)
        if (
          h(face, { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }) -
            h(vizinha, { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }) <
          1e-6
        )
          continue
        const quad = [
            [a.x, h(vizinha, a), a.z],
            [b.x, h(vizinha, b), b.z],
            [b.x, h(face, b), b.z],
            [a.x, h(face, a), a.z],
          ],
          ids = sentido === 1 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]
        for (const k of ids)
          for (const nome of nomes) {
            if (nome === 'position') dados.get(nome)!.push(...quad[k]!)
            else if (nome === 'normal') dados.get(nome)!.push(fora.x, 0, fora.z)
            else dados.get(nome)!.push(k === 0 || k === 3 ? 0 : len, quad[k]![1]!)
          }
      }
    }
  }
  if (dados.get('position')!.length / 3 > 600_000) throw Error('O pilar exige vértices demais')
  // Recortes sucessivos de quinas de GLB deixam lascas abaixo da precisão útil
  // do Float32. Remover por altura mínima do triângulo (1 µm), não pela inclinação:
  // faces verticais e apoios finos reais continuam presentes.
  const posicoes = dados.get('position')!,
    finais = new Map(nomes.map((nome) => [nome, [] as number[]]))
  for (let i = 0; i < posicoes.length; i += 9) {
    const u = [0, 1, 2].map((j) => posicoes[i + 3 + j]! - posicoes[i + j]!),
      v = [0, 1, 2].map((j) => posicoes[i + 6 + j]! - posicoes[i + j]!),
      maior = Math.max(
        Math.hypot(...u),
        Math.hypot(...v),
        Math.hypot(...u.map((n, j) => n - v[j]!)),
      ),
      produto = Math.hypot(
        u[1]! * v[2]! - u[2]! * v[1]!,
        u[2]! * v[0]! - u[0]! * v[2]!,
        u[0]! * v[1]! - u[1]! * v[0]!,
      )
    if (produto <= maior * 1e-6) continue
    for (const nome of nomes) {
      const tamanho = solo[nome]!.itemSize,
        de = (i / 3) * tamanho
      for (const valor of dados.get(nome)!.slice(de, de + 3 * tamanho))
        finais.get(nome)!.push(valor)
    }
  }
  const atributos: Atributos = Object.fromEntries(
    nomes.map((nome) => [
      nome,
      { itemSize: solo[nome]!.itemSize, valores: Float32Array.from(finais.get(nome)!) },
    ]),
  )
  const centro = { x: (limites.x0 + limites.x1) / 2, z: (limites.z0 + limites.z1) / 2 },
    alturasCentrais = capFaces
      .filter((f) => dentro(centro, f.planos))
      .map((f) => f.a * centro.x + f.b * centro.z + f.c)
  if (!alturasCentrais.length) throw Error('A tampa do pilar está sem referência central')
  return { atributos, contato: tampa.contato, alturaNoCentro: Math.min(...alturasCentrais) }
}
