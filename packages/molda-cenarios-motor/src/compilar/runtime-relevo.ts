import {
  type CamadaDoRelevo,
  celulasDoNo,
  type FormaDoRelevo,
  type NoDoRelevo,
  selecionarNosDoRelevo,
} from '@sistemazero/molda-cenarios-core/compilar'
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  type Texture,
  Uint8BufferAttribute,
  Uint16BufferAttribute,
} from 'three'
import { MaterialDoSolo } from '../material-solo'

/**
 * O relevo "campo" desenhado em pedaços, com menos detalhe longe (plano "Mundos de 2 km", lote 2,
 * 23/11/2026, `docs/plans/2026-11-23-mundos-de-2km.md`). Mora no carregador de cena, nunca nos
 * motores (regra do `packages/studio/CLAUDE.md`).
 *
 * - A escolha dos pedaços é `selecionarNosDoRelevo` (core), refeita quando o foco anda.
 * - Cada pedaço é uma grade de `celulasPorNo` quadrados com um vértice a cada 2^nível células, as
 *   alturas lidas direto do campo (sem cópia), a mesma diagonal da malha desenhada e da colisão,
 *   e SAIAS nas bordas (fecham a fresta entre pedaços de níveis vizinhos).
 * - O material é o do editor (`MaterialDoSolo`): as camadas misturadas por peso de vértice, as
 *   texturas repetidas em metros, com mipmaps.
 * - Nunca aparece buraco: os pedaços novos são construídos aos poucos (`construcoesPorQuadro`) e
 *   a troca só acontece quando a escolha nova inteira está pronta.
 */

export interface DadosDoRelevo {
  forma: FormaDoRelevo
  /** `(colunas + 1) × (linhas + 1)` alturas. */
  alturas: ArrayLike<number>
  /** `colunas × linhas`, 1 = buraco. */
  buracos?: ArrayLike<number>
  /** Um RGBA por vértice da grade em cada arquivo (camadas 1 a 4, depois 5 a 8). */
  pesos: readonly Uint8Array[]
  camadas: readonly CamadaDoRelevo[]
  /** Áreas (metros) onde o relevo desce ao detalhe máximo perto da câmera: os caminhos. */
  detalhe?: readonly { x0: number; z0: number; x1: number; z1: number }[]
}

export interface OpcoesDoRelevoNoThree {
  celulasPorNo?: number
  fator?: number
  maximoDeNos?: number
  construcoesPorQuadro?: number
  /** Pedaços construídos guardados para a volta (além dos que estão na tela). */
  guardados?: number
  /** Metros: até onde as áreas de detalhe forçam o detalhe máximo. */
  alcanceDoDetalhe?: number
}

export const PADRAO_DO_RELEVO = {
  celulasPorNo: 32,
  fator: 1.5,
  maximoDeNos: 96,
  construcoesPorQuadro: 4,
  guardados: 64,
  alcanceDoDetalhe: 160,
} as const

const chave = (n: NoDoRelevo) => `${n.nivel}:${n.ix}:${n.iz}`

export class RelevoNoThree {
  readonly grupo = new Group()
  private readonly material: MaterialDoSolo
  private readonly opcoes: Required<OpcoesDoRelevoNoThree>
  /** Geometrias construídas, da mais antiga à mais recente (o Map guarda a ordem de uso). */
  private readonly construidas = new Map<string, BufferGeometry>()
  private readonly malhas = new Map<string, Mesh>()
  private alvo: NoDoRelevo[] = []
  private focoDoAlvo: { x: number; z: number; alcance: number } | null = null
  private descartado = false

  constructor(
    private readonly dados: DadosDoRelevo,
    opcoes: OpcoesDoRelevoNoThree = {},
  ) {
    const { forma, alturas, buracos, pesos, camadas } = dados
    const vertices = (forma.colunas + 1) * (forma.linhas + 1)
    if (alturas.length !== vertices) throw Error('As alturas não correspondem à grade do relevo.')
    if (buracos && buracos.length !== forma.colunas * forma.linhas)
      throw Error('Os buracos não correspondem à grade do relevo.')
    if (
      pesos.length !== Math.ceil(camadas.length / 4) ||
      pesos.some((p) => p.length !== vertices * 4)
    )
      throw Error('Os pesos não correspondem à grade e às camadas do relevo.')
    this.opcoes = { ...PADRAO_DO_RELEVO, ...opcoes }
    this.material = new MaterialDoSolo(
      camadas.map((c) => ({
        id: c.id,
        nome: c.id,
        cor: c.cor,
        ...(c.textura ? { textura: { ...c.textura } } : {}),
      })),
    )
    this.grupo.name = 'relevo'
  }

  /** As texturas das camadas (pelo id da textura do pacote). */
  definirTexturas(obter: (id: string) => Texture | undefined) {
    this.material.definirTexturas(obter)
  }

  /**
   * Leva os pedaços ao foco (x, z em metros). `alcance` em metros: o que está além não é desenhado.
   * Com `tudoAgora`, constrói o que falta de uma vez (a primeira carga, antes do primeiro quadro).
   */
  atualizar(foco: { x: number; z: number }, alcance: number, tudoAgora = false) {
    if (this.descartado || !Number.isFinite(foco.x) || !Number.isFinite(foco.z)) return
    const { forma } = this.dados,
      menor = this.opcoes.celulasPorNo * forma.passo
    const anterior = this.focoDoAlvo
    // A escolha só muda quando o foco anda um quarto do menor pedaço (ou o alcance muda).
    if (
      !anterior ||
      Math.hypot(foco.x - anterior.x, foco.z - anterior.z) > menor / 4 ||
      Math.abs(alcance - anterior.alcance) > menor / 4
    ) {
      this.alvo = selecionarNosDoRelevo(forma, foco, {
        celulasPorNo: this.opcoes.celulasPorNo,
        fator: this.opcoes.fator,
        alcance,
        maximoDeNos: this.opcoes.maximoDeNos,
        ...(this.dados.detalhe?.length
          ? { detalhe: { caixas: this.dados.detalhe, alcance: this.opcoes.alcanceDoDetalhe } }
          : {}),
      })
      this.focoDoAlvo = { x: foco.x, z: foco.z, alcance }
    }
    let construidas = 0
    for (const n of this.alvo) {
      const k = chave(n)
      const pronta = this.construidas.get(k)
      if (pronta) {
        // Usada agora: vai para o fim da fila (a mais recente).
        this.construidas.delete(k)
        this.construidas.set(k, pronta)
        continue
      }
      if (!tudoAgora && construidas >= this.opcoes.construcoesPorQuadro) continue
      this.construidas.set(k, this.construir(n))
      construidas++
    }
    if (this.alvo.some((n) => !this.construidas.has(chave(n)))) {
      this.guardar()
      return
    }
    // Tudo pronto: troca o que está na tela.
    const nova = new Set(this.alvo.map(chave))
    for (const [k, m] of this.malhas)
      if (!nova.has(k)) {
        this.grupo.remove(m)
        this.malhas.delete(k)
      }
    for (const n of this.alvo) {
      const k = chave(n)
      if (this.malhas.has(k)) continue
      const m = new Mesh(this.construidas.get(k)!, this.material.material)
      const c = celulasDoNo(forma, n, this.opcoes.celulasPorNo)
      m.name = `relevo:${k}`
      m.position.set(forma.origem.x + c.x0 * forma.passo, 0, forma.origem.z + c.z0 * forma.passo)
      m.matrixAutoUpdate = false
      m.updateMatrix()
      m.castShadow = n.nivel === 0
      m.receiveShadow = true
      this.grupo.add(m)
      this.malhas.set(k, m)
    }
    this.grupo.updateMatrixWorld(true)
    this.guardar()
  }

  /** Guarda os da tela, os que estão a caminho e os `guardados` mais recentes fora disso. */
  private guardar() {
    const protegidos = new Set([...this.malhas.keys(), ...this.alvo.map(chave)])
    let sobra = this.construidas.size - protegidos.size - this.opcoes.guardados
    for (const [k, g] of this.construidas) {
      if (sobra <= 0) break
      if (protegidos.has(k)) continue
      g.dispose()
      this.construidas.delete(k)
      sobra--
    }
  }

  /** O que está na tela e o que falta construir (para as provas e a medida). */
  estado() {
    let triangulos = 0
    for (const m of this.malhas.values()) triangulos += (m.geometry.index?.count ?? 0) / 3
    return {
      pedacos: this.malhas.size,
      construidos: this.construidas.size,
      faltam: this.alvo.filter((n) => !this.construidas.has(chave(n))).length,
      triangulos,
    }
  }

  /** A geometria de um pedaço, local ao canto dele. */
  construir(n: NoDoRelevo): BufferGeometry {
    const { forma, alturas, buracos, pesos } = this.dados,
      c = celulasDoNo(forma, n, this.opcoes.celulasPorNo),
      s = 2 ** n.nivel,
      qx = Math.ceil((c.x1 - c.x0) / s),
      qz = Math.ceil((c.z1 - c.z0) / s),
      largura = forma.colunas + 1,
      passo = forma.passo
    const gx = (i: number) => Math.min(c.x0 + i * s, c.x1),
      gz = (j: number) => Math.min(c.z0 + j * s, c.z1),
      h = (x: number, z: number) =>
        alturas[
          Math.min(forma.linhas, Math.max(0, z)) * largura + Math.min(forma.colunas, Math.max(0, x))
        ] as number
    const internos = (qx + 1) * (qz + 1),
      borda = 2 * (qx + 1) + 2 * (qz + 1),
      total = internos + borda
    const posicoes = new Float32Array(total * 3),
      normais = new Float32Array(total * 3),
      pesosA = new Uint8Array(total * 4),
      pesosB = pesos.length > 1 ? new Uint8Array(total * 4) : null
    const escrever = (v: number, x: number, z: number, y: number) => {
      posicoes[v * 3] = (x - c.x0) * passo
      posicoes[v * 3 + 1] = y
      posicoes[v * 3 + 2] = (z - c.z0) * passo
      // A normal pela diferença central no passo do pedaço (vizinhos do mesmo nível batem).
      const dx = (h(x + s, z) - h(x - s, z)) / (2 * s * passo),
        dz = (h(x, z + s) - h(x, z - s)) / (2 * s * passo),
        tamanho = Math.hypot(dx, 1, dz)
      normais[v * 3] = -dx / tamanho
      normais[v * 3 + 1] = 1 / tamanho
      normais[v * 3 + 2] = -dz / tamanho
      const i = (z * largura + x) * 4
      pesosA.set((pesos[0] as Uint8Array).subarray(i, i + 4), v * 4)
      if (pesosB) pesosB.set((pesos[1] as Uint8Array).subarray(i, i + 4), v * 4)
    }
    for (let j = 0; j <= qz; j++)
      for (let i = 0; i <= qx; i++) escrever(j * (qx + 1) + i, gx(i), gz(j), h(gx(i), gz(j)))
    // As saias: cada vértice da borda repetido mais abaixo, tão fundo quanto a maior fresta que a
    // borda pode abrir com um vizinho um nível mais grosso ou mais fino (medida no próprio campo).
    const profundidade = this.profundidadeDaSaia(c, s),
      saia: number[][] = [[], [], [], []]
    let v = internos
    const bordas: Array<Array<[number, number]>> = [
      Array.from({ length: qx + 1 }, (_, i) => [i, 0]),
      Array.from({ length: qx + 1 }, (_, i) => [i, qz]),
      Array.from({ length: qz + 1 }, (_, j) => [0, j]),
      Array.from({ length: qz + 1 }, (_, j) => [qx, j]),
    ]
    for (const [lado, pontos] of bordas.entries())
      for (const [i, j] of pontos) {
        escrever(v, gx(i), gz(j), h(gx(i), gz(j)) - profundidade)
        saia[lado]!.push(v++)
      }
    const indices: number[] = []
    for (let j = 0; j < qz; j++)
      for (let i = 0; i < qx; i++) {
        // Buraco: no nível 0 a célula exata; acima, a célula do meio do quadrado.
        if (buracos) {
          const cx = Math.min(forma.colunas - 1, gx(i) + (s > 1 ? s >> 1 : 0)),
            cz = Math.min(forma.linhas - 1, gz(j) + (s > 1 ? s >> 1 : 0))
          if (buracos[cz * forma.colunas + cx] === 1) continue
        }
        const a = j * (qx + 1) + i,
          b = a + 1,
          cc = a + qx + 1,
          d = cc + 1
        indices.push(a, cc, b, b, cc, d)
      }
    // Cada trecho da saia nos dois sentidos (o material só desenha a frente).
    for (const [lado, pontos] of bordas.entries())
      for (let k = 0; k + 1 < pontos.length; k++) {
        const [i0, j0] = pontos[k]!,
          [i1, j1] = pontos[k + 1]!,
          a = j0 * (qx + 1) + i0,
          b = j1 * (qx + 1) + i1,
          a2 = saia[lado]![k]!,
          b2 = saia[lado]![k + 1]!
        indices.push(a, a2, b, b, a2, b2, a, b, a2, b, b2, a2)
      }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(posicoes, 3))
    g.setAttribute('normal', new BufferAttribute(normais, 3))
    g.setAttribute('mcnPesosA', new Uint8BufferAttribute(pesosA, 4, true))
    if (pesosB) g.setAttribute('mcnPesosB', new Uint8BufferAttribute(pesosB, 4, true))
    g.setIndex(new Uint16BufferAttribute(indices, 1))
    g.computeBoundingBox()
    g.computeBoundingSphere()
    g.userData.saia = profundidade
    // Os primeiros vértices são o topo; depois vêm as saias.
    g.userData.topo = internos
    return g
  }

  /**
   * A maior fresta que as bordas do pedaço (células `c`, um vértice a cada `s`) podem abrir: contra
   * um vizinho um nível mais grosso (os vértices fora da grade de 2s, contra a reta da grade de 2s)
   * e contra um mais fino (o meio de cada trecho, contra a reta do trecho). Mais meio metro.
   */
  private profundidadeDaSaia(c: { x0: number; z0: number; x1: number; z1: number }, s: number) {
    const { forma, alturas } = this.dados,
      largura = forma.colunas + 1,
      h = (x: number, z: number) =>
        alturas[
          Math.min(forma.linhas, Math.max(0, z)) * largura + Math.min(forma.colunas, Math.max(0, x))
        ] as number
    let maior = 0
    const borda = (de: number, ate: number, ponto: (t: number) => number) => {
      for (let t = de; t + s <= ate; t += s) {
        // Contra o mais fino: o meio do trecho.
        if (s > 1) {
          const meio = t + (s >> 1)
          maior = Math.max(maior, Math.abs(ponto(meio) - (ponto(t) + ponto(t + s)) / 2))
        }
        // Contra o mais grosso: o vértice que não está na grade de 2s.
        if (((t - de) / s) % 2 === 1 && t + s <= ate)
          maior = Math.max(maior, Math.abs(ponto(t) - (ponto(t - s) + ponto(t + s)) / 2))
      }
    }
    borda(c.x0, c.x1, (x) => h(x, c.z0))
    borda(c.x0, c.x1, (x) => h(x, c.z1))
    borda(c.z0, c.z1, (z) => h(c.x0, z))
    borda(c.z0, c.z1, (z) => h(c.x1, z))
    return maior + 0.5
  }

  descartar() {
    if (this.descartado) return
    this.descartado = true
    for (const m of this.malhas.values()) this.grupo.remove(m)
    this.malhas.clear()
    for (const g of this.construidas.values()) g.dispose()
    this.construidas.clear()
    this.material.descartar()
  }
}
