import { type MalhaParaRecorte, type PlanoDeRecorte, recortarAtributos } from '../geometria'
import { CenarioInvalido } from '../validacao'
import { alturaDoCampo } from './campo-de-alturas'
import { faixaDaCurva, type PontoNoChao, triangularPoligono } from './curvas'
import type { BaseDeCenario, CaminhoDeCenario } from './documento'
import type { EstadoDoTerreno } from './edicao-de-terreno'
import { CELULAS_DA_PECA } from './terreno'
import { curvaDoCaminho } from './topologia-de-caminho'

export interface PisoDoCaminho {
  /** Origem separada dos buffers para manter a precisão mesmo longe do centro do mundo. */
  origem: { x: number; y: number; z: number }
  /** Triângulos sem índice, locais à origem. Mesma superfície para desenho e picking. */
  posicoes: Float32Array
  /** Metros ao longo e através da trilha; na praça, metros nos eixos do piso. */
  uvs: Float32Array
}
const falhar = (mensagem: string): never => {
  throw new CenarioInvalido([mensagem])
}
const limiteDeTrabalho = () =>
  falhar(
    'O piso exige recortes demais. Divida-o em trechos menores ou reduza a resolução do terreno.',
  )

function planosDoPoligono(p: readonly PontoNoChao[]): PlanoDeRecorte[] {
  const origem = p[0]!
  let area = 0
  for (let i = 0; i < p.length; i++) {
    const a = p[i]!,
      b = p[(i + 1) % p.length]!
    area += (a.x - origem.x) * (b.z - origem.z) - (b.x - origem.x) * (a.z - origem.z)
  }
  const sentido = area > 0 ? 1 : -1
  return p.map((a, i) => {
    const b = p[(i + 1) % p.length]!,
      x = sentido * (b.z - a.z),
      z = -sentido * (b.x - a.x)
    return { x, z, limite: x * a.x + z * a.z }
  })
}

/**
 * Piso nativo conformado aos triângulos reais da grade, sem folga artificial no eixo Y.
 * O material deve usar polygonOffset como uma superfície de acabamento do mesmo chão.
 * Cercas, muros e pontes usam sua geometria estrutural, nunca este decal como piso suspenso.
 */
export function geometriaDoPiso(
  caminho: CaminhoDeCenario,
  base: BaseDeCenario,
  estado: EstadoDoTerreno | null,
  limites: { visitas?: number; vertices?: number } = {},
): PisoDoCaminho {
  if (!['trilha', 'praca', 'estrada'].includes(caminho.tipo))
    return falhar('Este caminho precisa de geometria estrutural.')
  if (base.tipo === 'perfil') return falhar('Converta o perfil em terreno antes de compor o piso.')
  if (
    base.tipo === 'terreno' &&
    (!estado ||
      estado.campo.colunas !== base.colunas ||
      estado.campo.linhas !== base.linhas ||
      estado.campo.passo !== base.passo ||
      estado.campo.origem.x !== base.origem.x ||
      estado.campo.origem.z !== base.origem.z ||
      estado.campo.alturas.length !== (base.colunas + 1) * (base.linhas + 1) ||
      estado.buracos.colunas !== base.colunas ||
      estado.buracos.linhas !== base.linhas ||
      estado.buracos.celulas.length !== base.colunas * base.linhas)
  )
    return falhar('O terreno correspondente ao caminho precisa estar carregado.')
  const maxVisitas = limites.visitas ?? 2_000_000,
    maxVertices = limites.vertices ?? 600_000
  if (
    ![maxVisitas, maxVertices].every((v) => Number.isInteger(v) && v > 0) ||
    maxVisitas > 2_000_000 ||
    maxVertices > 600_000
  )
    return falhar('O orçamento do piso é inválido.')
  const origem = { ...caminho.pontos[0]!, y: 0 },
    curva = curvaDoCaminho({
      ...caminho,
      pontos: caminho.pontos.map((p) => ({ x: p.x - origem.x, z: p.z - origem.z })),
    })
  let posicoes: Float32Array, uvs: Float32Array, indices: Uint32Array
  if (caminho.tipo === 'praca') {
    indices = triangularPoligono(curva.pontos)
    posicoes = Float32Array.from(curva.pontos.flatMap((p) => [p.x, 0, p.z]))
    uvs = Float32Array.from(curva.pontos.flatMap((p) => [p.x, p.z]))
  } else {
    const faixa = faixaDaCurva(curva, {
      largura: caminho.largura,
      alturaEm: () => 0,
      elevacao: 0,
      divisoes: 1,
    })
    posicoes = faixa.posicoes
    uvs = faixa.uvs
    indices = faixa.indices
    for (let i = 0; i < uvs.length; i++) uvs[i] = uvs[i]! * caminho.largura
  }
  const saidaP: number[] = [],
    saidaUv: number[] = []
  const anexar = (dados: ReturnType<typeof recortarAtributos>) => {
    const p = dados.position!.valores,
      uv = dados.uv!.valores
    if ((saidaP.length + p.length) / 3 > maxVertices) limiteDeTrabalho()
    for (let i = 0; i < p.length; i += 9) {
      const normalY =
        (p[i + 5]! - p[i + 2]!) * (p[i + 6]! - p[i]!) -
        (p[i + 3]! - p[i]!) * (p[i + 8]! - p[i + 2]!)
      // O recorte calcula em dupla precisão; a conversão para Float32 pode colapsar
      // fragmentos na divisa. Não conservar faces degeneradas na geometria de picking.
      if (normalY < 1e-10) continue
      for (let j = 0; j < 9; j += 3) {
        const x = p[i + j]!,
          z = p[i + j + 2]!,
          y =
            estado && base.tipo === 'terreno'
              ? alturaDoCampo(estado.campo, x + origem.x, z + origem.z)
              : 0
        if (!Number.isFinite(y)) falhar('O terreno contém uma altura inválida no piso do caminho.')
        saidaP.push(x, y, z)
        const k = ((i + j) / 3) * 2
        saidaUv.push(uv[k]!, uv[k + 1]!)
      }
    }
  }
  const original: MalhaParaRecorte = {
    atributos: { position: { valores: posicoes, itemSize: 3 }, uv: { valores: uvs, itemSize: 2 } },
    indices,
  }
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]! * 3,
      b = indices[i + 1]! * 3,
      c = indices[i + 2]! * 3,
      normalY =
        (posicoes[b + 2]! - posicoes[a + 2]!) * (posicoes[c]! - posicoes[a]!) -
        (posicoes[b]! - posicoes[a]!) * (posicoes[c + 2]! - posicoes[a + 2]!)
    if (normalY < -1e-10)
      falhar('Esta curva dobra o piso sobre si mesmo. Abra a curva ou reduza a largura.')
  }
  if (base.tipo === 'plano') {
    anexar(
      recortarAtributos(original, [
        { x: 1, z: 0, limite: base.largura / 2 - origem.x },
        { x: -1, z: 0, limite: base.largura / 2 + origem.x },
        { x: 0, z: 1, limite: base.comprimento / 2 - origem.z },
        { x: 0, z: -1, limite: base.comprimento / 2 + origem.z },
      ]),
    )
  } else {
    const locais = (p: PontoNoChao) => ({ x: p.x - origem.x, z: p.z - origem.z }),
      furos = (base.recortes ?? [])
        .flatMap((anel) => {
          const pontos = anel.map(locais),
            ids = triangularPoligono(pontos),
            triangulos: PontoNoChao[][] = []
          for (let i = 0; i < ids.length; i += 3)
            triangulos.push([pontos[ids[i]!]!, pontos[ids[i + 1]!]!, pontos[ids[i + 2]!]!])
          return triangulos
        })
        .map((pontos) => ({
          pontos,
          x0: Math.min(...pontos.map((p) => p.x)),
          x1: Math.max(...pontos.map((p) => p.x)),
          z0: Math.min(...pontos.map((p) => p.z)),
          z1: Math.max(...pontos.map((p) => p.z)),
        })),
      pecas = new Set(base.pecas.map((p) => `${p.coluna}:${p.linha}`)),
      ox = base.origem.x - origem.x,
      oz = base.origem.z - origem.z,
      faixas: { i: number; x0: number; x1: number; z: number }[] = []
    let trabalho = 0
    for (let i = 0; i < indices.length; i += 3) {
      const ids = [indices[i]!, indices[i + 1]!, indices[i + 2]!],
        xs = ids.map((j) => (posicoes[j * 3]! - ox) / base.passo),
        zs = ids.map((j) => (posicoes[j * 3 + 2]! - oz) / base.passo),
        z0 = Math.max(0, Math.floor(Math.min(...zs))),
        z1 = Math.min(base.linhas - 1, Math.floor(Math.max(...zs)))
      // Varredura por linha do triângulo, sem visitar o retângulo inteiro de uma
      // diagonal comprida e sem inserir controles que deformariam suas esquinas.
      for (let z = z0; z <= z1; z++) {
        const limitesX: number[] = []
        for (let j = 0; j < 3; j++) {
          const k = (j + 1) % 3
          if (zs[j]! >= z && zs[j]! <= z + 1) limitesX.push(xs[j]!)
          if (zs[j] === zs[k]) continue
          for (const limite of [z, z + 1]) {
            const t = (limite - zs[j]!) / (zs[k]! - zs[j]!)
            if (t >= 0 && t <= 1) limitesX.push(xs[j]! + (xs[k]! - xs[j]!) * t)
          }
        }
        if (!limitesX.length) continue
        const x0 = Math.max(0, Math.floor(Math.min(...limitesX))),
          x1 = Math.min(base.colunas - 1, Math.floor(Math.max(...limitesX)))
        trabalho += Math.max(0, x1 - x0 + 1) * 2
        if (trabalho > maxVisitas) limiteDeTrabalho()
        if (x0 <= x1) faixas.push({ i, x0, x1, z })
      }
    }
    for (const f of faixas) {
      // Cada recorte lê só três vértices. Passar o buffer inteiro aqui repetiria a validação
      // e a varredura de toda a trilha para cada célula do terreno.
      const ids = [indices[f.i]!, indices[f.i + 1]!, indices[f.i + 2]!],
        tri: MalhaParaRecorte = {
          atributos: {
            position: {
              valores: ids.flatMap((j) => [
                posicoes[j * 3]!,
                posicoes[j * 3 + 1]!,
                posicoes[j * 3 + 2]!,
              ]),
              itemSize: 3,
            },
            uv: { valores: ids.flatMap((j) => [uvs[j * 2]!, uvs[j * 2 + 1]!]), itemSize: 2 },
          },
        }
      const z = f.z
      trabalho += furos.length
      if (trabalho > maxVisitas) limiteDeTrabalho()
      const furosDaFaixa = furos.filter(
        (t) =>
          t.x0 <= ox + (f.x1 + 1) * base.passo &&
          t.x1 >= ox + f.x0 * base.passo &&
          t.z0 <= oz + (z + 1) * base.passo &&
          t.z1 >= oz + z * base.passo,
      )
      for (let x = f.x0; x <= f.x1; x++) {
        if (
          estado!.buracos.celulas[z * base.colunas + x] === 1 ||
          (base.cobertura !== 'grade' &&
            !pecas.has(`${Math.floor(x / CELULAS_DA_PECA)}:${Math.floor(z / CELULAS_DA_PECA)}`))
        )
          continue
        const a = { x: ox + x * base.passo, z: oz + z * base.passo },
          b = { x: a.x + base.passo, z: a.z },
          c = { x: a.x, z: a.z + base.passo },
          d = { x: b.x, z: c.z }
        trabalho += furosDaFaixa.length
        if (trabalho > maxVisitas) limiteDeTrabalho()
        const recortes = furosDaFaixa
          .filter((t) => t.x0 <= d.x && t.x1 >= a.x && t.z0 <= d.z && t.z1 >= a.z)
          .map((t) => t.pontos)
        trabalho += recortes.length * 2
        if (trabalho > maxVisitas) limiteDeTrabalho()
        for (const t of [
          [a, c, b],
          [b, c, d],
        ])
          anexar(recortarAtributos(tri, planosDoPoligono(t), recortes))
      }
    }
  }
  return { origem, posicoes: Float32Array.from(saidaP), uvs: Float32Array.from(saidaUv) }
}
