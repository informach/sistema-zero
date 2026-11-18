import {
  conferirMalhaParaRecorte,
  type MalhaParaRecorte,
  planosDoPoligonoConvexo as planosDoPoligono,
  recortarAtributos,
} from '../geometria'
import { pontoNoPoligono } from '../poligonos'
import { CenarioInvalido } from '../validacao'
import { type PontoNoChao, triangularPoligono } from './curvas'
import type { BaseDeCenario } from './documento'
import { dominioDoChao } from './dominio-do-chao'
import type { EstadoDoTerreno } from './edicao-de-terreno'
import { CELULAS_DA_PECA } from './terreno'

export interface LimitesDoRecorteDeChao {
  visitas?: number
  vertices?: number
}
const falhar = (mensagem: string): never => {
  throw new CenarioInvalido([mensagem])
}
const limiteDeTrabalho = () =>
  falhar(
    'O piso exige recortes demais. Divida-o em trechos menores ou reduza a resolução do terreno.',
  )
const inicioDaFaixa = (min: number, max: number) =>
  Math.floor(min) - (Math.abs(max - min) < 1e-9 && Math.abs(min - Math.round(min)) < 1e-9 ? 1 : 0)
/**
 * Recorte comum de pisos e modelos sobre o solo. Conserva altura local e todos os atributos;
 * quem chama aplica a altura do campo depois. Divide pela mesma diagonal da física e elimina
 * células abertas, peças ausentes e recortes. Nunca altera os buffers de origem.
 */
export function recortarMalhaNoChao(
  malha: MalhaParaRecorte,
  base: BaseDeCenario,
  estado: EstadoDoTerreno | null,
  origem: PontoNoChao,
  limites: LimitesDoRecorteDeChao = {},
  /** Precedência de acabamentos; não modifica os buracos nem a física do terreno. */
  excluir: readonly (readonly PontoNoChao[])[] = [],
): ReturnType<typeof recortarAtributos> {
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
  const { quantidade, nomes, indices: originais } = conferirMalhaParaRecorte(malha)
  if (quantidade > 600_000 || (originais?.length ?? quantidade) > 1_800_000) limiteDeTrabalho()
  if (![origem.x, origem.z].every(Number.isFinite)) falhar('A origem do recorte é inválida.')
  const indices = originais ?? Uint32Array.from({ length: quantidade }, (_, i) => i),
    posicoes = malha.atributos.position!.valores,
    saidas = new Map(nomes.map((nome) => [nome, [] as number[]])),
    vistos = new Set<string>()
  let ultimoTriangulo = -1,
    trabalho = 0
  // Recortes distantes não participam desta malha. Filtrar antes da triangulação e da
  // classificação de faces verticais evita cobrar o lago inteiro por cada laje da vila.
  const caixa = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity }
  for (let j = 0; j < indices.length; j++) {
    const i = indices[j]!
    const x = posicoes[i * 3]! + origem.x,
      z = posicoes[i * 3 + 2]! + origem.z
    caixa.x0 = Math.min(caixa.x0, x)
    caixa.x1 = Math.max(caixa.x1, x)
    caixa.z0 = Math.min(caixa.z0, z)
    caixa.z1 = Math.max(caixa.z1, z)
  }
  if (
    excluir.length > 20_000 ||
    excluir.reduce((s, r) => s + r.length, 0) > 200_000 ||
    excluir.some(
      (r) =>
        r.length < 3 ||
        r.length > 4096 ||
        r.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.z)),
    )
  )
    falhar('Os encontros do caminho têm recortes demais ou um contorno inválido.')
  const recortesPerto = [
      ...(base.tipo === 'terreno' ? (base.recortes ?? []) : []),
      ...excluir,
    ].filter((r) => {
      let x0 = Infinity,
        x1 = -Infinity,
        z0 = Infinity,
        z1 = -Infinity
      for (const p of r) {
        x0 = Math.min(x0, p.x)
        x1 = Math.max(x1, p.x)
        z0 = Math.min(z0, p.z)
        z1 = Math.max(z1, p.z)
      }
      return (
        x0 <= caixa.x1 + 1e-6 &&
        x1 >= caixa.x0 - 1e-6 &&
        z0 <= caixa.z1 + 1e-6 &&
        z1 >= caixa.z0 - 1e-6
      )
    }),
    dominioBase = dominioDoChao(
      base.tipo === 'terreno' ? { ...base, recortes: recortesPerto.map((r) => [...r]) } : base,
    ),
    dominio =
      base.tipo === 'plano'
        ? (p: PontoNoChao) => dominioBase(p) && !recortesPerto.some((r) => pontoNoPoligono(p, r))
        : dominioBase,
    custoDoDominio = recortesPerto.reduce((s, r) => s + r.length, 0)
  const anexar = (
    dados: ReturnType<typeof recortarAtributos>,
    sinal = 0,
    repetidos?: Set<string>,
  ) => {
    const p = dados.position!.valores
    for (let i = 0; i < p.length; i += 9) {
      const ax = p[i + 3]! - p[i]!,
        ay = p[i + 4]! - p[i + 1]!,
        az = p[i + 5]! - p[i + 2]!,
        bx = p[i + 6]! - p[i]!,
        by = p[i + 7]! - p[i + 1]!,
        bz = p[i + 8]! - p[i + 2]!,
        nx = ay * bz - az * by,
        ny = az * bx - ax * bz,
        nz = ax * by - ay * bx,
        normal = Math.hypot(nx, ny, nz)
      if (normal < 1e-10 || ny * sinal < -1e-18) continue
      if (repetidos) {
        const chave = [0, 3, 6]
          .map((j) => `${p[i + j]}:${p[i + j + 1]}:${p[i + j + 2]}`)
          .sort()
          .join('|')
        if (repetidos.has(chave)) continue
        repetidos.add(chave)
      }
      // Subtrair os triângulos de um recorte mantém a fronteira de cada triângulo.
      // Para uma face vertical coincidente com a diagonal INTERNA do lago, essa
      // fronteira não é solo. Conferir os dois lados distingue-a de uma margem real.
      if (custoDoDominio && Math.abs(ny) <= normal * 1e-7) {
        trabalho += custoDoDominio * 2
        if (trabalho > maxVisitas) limiteDeTrabalho()
        const x = (p[i]! + p[i + 3]! + p[i + 6]!) / 3 + origem.x,
          z = (p[i + 2]! + p[i + 5]! + p[i + 8]!) / 3 + origem.z,
          passo = base.tipo === 'terreno' ? base.passo * 1e-7 : 1e-7,
          lado = Math.hypot(nx, nz),
          dx = (nx / lado) * passo,
          dz = (nz / lado) * passo
        if (!dominio({ x: x + dx, z: z + dz }) && !dominio({ x: x - dx, z: z - dz })) continue
      }
      if (saidas.get('position')!.length / 3 + 3 > maxVertices) limiteDeTrabalho()
      for (const nome of nomes) {
        const a = dados[nome]!,
          inicio = (i / 3) * a.itemSize,
          fim = inicio + 3 * a.itemSize,
          destino = saidas.get(nome)!
        for (let j = inicio; j < fim; j++) destino.push(a.valores[j]!)
      }
    }
  }
  const locais = (p: PontoNoChao) => ({ x: p.x - origem.x, z: p.z - origem.z }),
    furos = recortesPerto
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
      }))
  if (base.tipo === 'plano') {
    if ((indices.length / 3) * (4 + furos.length) > maxVisitas) limiteDeTrabalho()
    anexar(
      recortarAtributos(
        malha,
        [
          { x: 1, z: 0, limite: base.largura / 2 - origem.x },
          { x: -1, z: 0, limite: base.largura / 2 + origem.x },
          { x: 0, z: 1, limite: base.comprimento / 2 - origem.z },
          { x: 0, z: -1, limite: base.comprimento / 2 + origem.z },
        ],
        furos.map((f) => f.pontos),
      ),
    )
  } else {
    const pecas = new Set(base.pecas.map((p) => `${p.coluna}:${p.linha}`)),
      ox = base.origem.x - origem.x,
      oz = base.origem.z - origem.z,
      faixas: { i: number; x0: number; x1: number; z: number }[] = []
    for (let i = 0; i < indices.length; i += 3) {
      const ids = [indices[i]!, indices[i + 1]!, indices[i + 2]!],
        xs = ids.map((j) => (posicoes[j * 3]! - ox) / base.passo),
        zs = ids.map((j) => (posicoes[j * 3 + 2]! - oz) / base.passo),
        z0 = Math.max(0, inicioDaFaixa(Math.min(...zs), Math.max(...zs))),
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
        const x0 = Math.max(0, inicioDaFaixa(Math.min(...limitesX), Math.max(...limitesX))),
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
          atributos: Object.fromEntries(
            nomes.map((nome) => {
              const a = malha.atributos[nome]!
              return [
                nome,
                {
                  itemSize: a.itemSize,
                  valores: ids.flatMap((j) =>
                    Array.from({ length: a.itemSize }, (_, k) => a.valores[j * a.itemSize + k]!),
                  ),
                },
              ]
            }),
          ),
        }
      if (ultimoTriangulo !== f.i) {
        vistos.clear()
        ultimoTriangulo = f.i
      }
      const sinal =
        (posicoes[ids[1]! * 3 + 2]! - posicoes[ids[0]! * 3 + 2]!) *
          (posicoes[ids[2]! * 3]! - posicoes[ids[0]! * 3]!) -
        (posicoes[ids[1]! * 3]! - posicoes[ids[0]! * 3]!) *
          (posicoes[ids[2]! * 3 + 2]! - posicoes[ids[0]! * 3 + 2]!)
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
          anexar(recortarAtributos(tri, planosDoPoligono(t), recortes), sinal, vistos)
      }
    }
  }
  return Object.fromEntries(
    nomes.map((nome) => [
      nome,
      { itemSize: malha.atributos[nome]!.itemSize, valores: Float32Array.from(saidas.get(nome)!) },
    ]),
  )
}
