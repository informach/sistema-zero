import type { CenaNoThree, TrianguloDaConsulta } from '@sistemazero/molda-cenarios-motor/runtime'
import { Box3, Vector3 } from 'three'
import { LADO_DO_SETOR, RAIO_DE_SETORES } from './setores-do-arquipelago'

/** O que vai para a física do jogo: os triângulos únicos de toda a janela de setores. */
const MAX_TRIANGULOS_ATIVOS = 100_000
/**
 * Visitas da árvore por setor de 80 m (trabalho da consulta). As 20 mil do Testar da oficina
 * servem a consultas pequenas a cada passo; aqui a consulta é uma por setor, na troca de setor,
 * e um setor denso de verdade passa disso (a praça de lajes da Faísca com as casas da Vila,
 * uns 22 mil). O teto total acima continua limitando o que a física recebe.
 */
const MAX_VISITAS_POR_SETOR = 50_000

/** Até esta altura própria a peça é baixa (moita, cerca, corrimão, banco). */
const ALTURA_DE_PECA_BAIXA = 1.5
/** Até este lado horizontal maior a peça é fina (poste, estaca, coluna, placa, lampião). */
const LADO_DE_PECA_FINA = 0.8
/**
 * Piso de peças (laje, deque, plataforma): achatado e largo o bastante para se pisar. É chão,
 * mesmo baixo: a câmera nunca passa por baixo dele. Uma viga (estreita) continua peça fina.
 */
const PISO = { alturaAte: 0.6, larguraDesde: 0.6 }

/**
 * As entidades cuja colisão só segura o corpo: a câmera passa por elas. É a régua das ilhas do
 * jogo (`SO_PARA_O_CORPO`: folhagem e peças finas só seguram o corpo; paredes, troncos, pedras e
 * torre tapam a câmera), medida pelo volume compilado no mundo, porque o pacote não diz o que é
 * folhagem: peças baixas e finas, e a cápsula genérica (ela envolve o modelo inteiro, copa
 * inclusa; o tronco do jogo é o colisor nativo, à parte). Relevo, caminhos, pontes e fundo de
 * água são o chão e sempre tapam a câmera, inclusive quando a entidade tem outras partes.
 */
export function entidadesSoDoCorpo(
  colisoes: readonly {
    entidade: string | null
    tipo: string
    volume: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }
  }[],
): Set<string> {
  const chao = new Set<string>(),
    medidas = new Map<string, { capsula: boolean; min: Box3['min']; max: Box3['max'] }>()
  for (const c of colisoes) {
    if (!c.entidade) continue
    if (c.tipo === 'terreno' || c.tipo === 'caminho' || c.tipo === 'agua') {
      chao.add(c.entidade)
      continue
    }
    const m = medidas.get(c.entidade)
    if (!m)
      medidas.set(c.entidade, {
        capsula: c.tipo === 'capsula',
        min: new Vector3(c.volume.min.x, c.volume.min.y, c.volume.min.z),
        max: new Vector3(c.volume.max.x, c.volume.max.y, c.volume.max.z),
      })
    else {
      m.capsula &&= c.tipo === 'capsula'
      m.min.min(new Vector3(c.volume.min.x, c.volume.min.y, c.volume.min.z))
      m.max.max(new Vector3(c.volume.max.x, c.volume.max.y, c.volume.max.z))
    }
  }
  const so = new Set<string>()
  for (const [entidade, m] of medidas) {
    if (chao.has(entidade)) continue
    const altura = m.max.y - m.min.y,
      maior = Math.max(m.max.x - m.min.x, m.max.z - m.min.z),
      menor = Math.min(m.max.x - m.min.x, m.max.z - m.min.z)
    if (altura <= PISO.alturaAte && menor >= PISO.larguraDesde) continue
    if (m.capsula || altura <= ALTURA_DE_PECA_BAIXA || maior <= LADO_DE_PECA_FINA) so.add(entidade)
  }
  return so
}

/** Prepara somente os setores próximos, com as mesmas superfícies do runtime compilado.
 * Triângulos que atravessam limites entram uma vez, sem cortar tabuleiros ou preencher recortes.
 * `soDoCorpo` separa, na mesma passada, os triângulos que a câmera atravessa (`soDoCorpo`). */
export function prepararColisaoDoCenario(
  fonte: Pick<CenaNoThree['colisoes'], 'triangulosNaCaixa'>,
  foco: { x: number; z: number },
  selecionar?: (triangulo: TrianguloDaConsulta) => boolean,
  soDoCorpo?: (triangulo: TrianguloDaConsulta) => boolean,
) {
  if (
    !Number.isFinite(foco.x) ||
    !Number.isFinite(foco.z) ||
    Math.abs(foco.x) > 1e9 ||
    Math.abs(foco.z) > 1e9
  )
    throw Error('O foco da colisão do cenário é inválido.')
  const x = Math.floor(foco.x / LADO_DO_SETOR),
    z = Math.floor(foco.z / LADO_DO_SETOR)
  const vistos = new Map<number, Set<number>>()
  // A classe de cada triângulo aceito, na ordem em que a consulta devolve as coordenadas.
  const doCorpo: boolean[] = []
  let triangulos = 0,
    noCorpo = 0
  const incluir = (instancia: number, triangulo: number, contexto: TrianguloDaConsulta) => {
    if (selecionar && !selecionar(contexto)) return false
    let indices = vistos.get(instancia)
    if (indices?.has(triangulo)) return false
    if (triangulos + noCorpo + 1 > MAX_TRIANGULOS_ATIVOS)
      throw Error('A colisão próxima excede o orçamento do cenário.')
    if (!indices) {
      indices = new Set()
      vistos.set(instancia, indices)
    }
    indices.add(triangulo)
    const corpo = soDoCorpo?.(contexto) ?? false
    doCorpo.push(corpo)
    if (corpo) noCorpo++
    else triangulos++
    return true
  }
  const partes: Float64Array[] = []
  const caixa = new Box3(new Vector3(), new Vector3())
  for (let sz = z - RAIO_DE_SETORES; sz <= z + RAIO_DE_SETORES; sz++)
    for (let sx = x - RAIO_DE_SETORES; sx <= x + RAIO_DE_SETORES; sx++) {
      caixa.min.set(sx * LADO_DO_SETOR, -1e9, sz * LADO_DO_SETOR)
      caixa.max.set((sx + 1) * LADO_DO_SETOR, 1e9, (sz + 1) * LADO_DO_SETOR)
      partes.push(fonte.triangulosNaCaixa(caixa, MAX_VISITAS_POR_SETOR, incluir))
    }
  const vertices = new Float32Array(triangulos * 9),
    verticesDoCorpo = new Float32Array(noCorpo * 9)
  let t = 0,
    a = 0,
    b = 0
  for (const parte of partes)
    for (let i = 0; i < parte.length; i += 9, t++)
      if (doCorpo[t]) {
        verticesDoCorpo.set(parte.subarray(i, i + 9), b)
        b += 9
      } else {
        vertices.set(parte.subarray(i, i + 9), a)
        a += 9
      }
  const sequencia = (n: number) => {
    const indices = new Uint32Array(n)
    for (let i = 0; i < n; i++) indices[i] = i
    return indices
  }
  return {
    celula: { x, z },
    vertices,
    indices: sequencia(triangulos * 3),
    triangulos,
    /** Folhagem e peças finas: seguram o corpo, a câmera atravessa (`GRUPO_SO_DO_CORPO`). */
    soDoCorpo: {
      vertices: verticesDoCorpo,
      indices: sequencia(noCorpo * 3),
      triangulos: noCorpo,
    },
  }
}
export type ColisaoDoCenario = ReturnType<typeof prepararColisaoDoCenario>
