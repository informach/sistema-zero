import { Euler, Quaternion } from 'three'
import type { ColisorDaIlha } from './colisores-da-ilha'
import {
  ALTURA_DA_TERRA,
  alturaDaIlha,
  BANCADA,
  CENTRO_DA_CASA,
  FAROL,
  HORTA,
  PIER,
  PORTA,
  type PontoDaPonte,
  QUARTO,
} from './medidas'

/**
 * Os colisores da ilha central que ficam no código: tudo cuja medida é do jogo (paredes da casa e a
 * porta, canteiros da horta, bancada, torre do farol, tampo do píer, troncos das árvores e os
 * corrimãos das pontes). O que o Blender espalha (moitas, pedras, pedras do farol, estacas e barco
 * do píer) vem dos nós `col-*` dos GLBs e é lido com `lerColisores`.
 *
 * Regra: formas simples (caixa e cilindro, com a borda arredondada na hora de montar), nunca a malha
 * de desenho. O que é macio (moita, folhagem) fica um pouco menor que o desenho. O que é fino ou
 * macio só segura o corpo: a câmera passa por ele (`soParaOCorpo`, pelo nome).
 */
export type Solido = Exclude<ColisorDaIlha, { forma: 'malha' }>
type Tripla = [number, number, number]
type Quadra = [number, number, number, number]

const SEM_GIRO: Quadra = [0, 0, 0, 1]

export function giroEmY(giro: number): Quadra {
  return [0, Math.sin(giro / 2), 0, Math.cos(giro / 2)]
}

function caixa(nome: string, posicao: Tripla, meio: Tripla, rotacao = SEM_GIRO): Solido {
  return { forma: 'caixa', nome, posicao, rotacao, meio }
}

function cilindro(nome: string, posicao: Tripla, raio: number, meiaAltura: number): Solido {
  return { forma: 'cilindro', nome, posicao, rotacao: SEM_GIRO, raio, meiaAltura }
}

/** Leva colisores do referencial de um grupo (sem giro) para o do mundo. */
export function deslocar<T extends ColisorDaIlha>(lista: readonly T[], [x, y, z]: Tripla): T[] {
  return lista.map((c) =>
    c.forma === 'malha'
      ? c
      : { ...c, posicao: [c.posicao[0] + x, c.posicao[1] + y, c.posicao[2] + z] as Tripla },
  )
}

/** Onde fica cada grupo que desenha uma peça (e onde ficam os colisores dela). */
export const GRUPOS: Record<'casa' | 'bancada' | 'farol' | 'pier', Tripla> = {
  casa: [CENTRO_DA_CASA.x, ALTURA_DA_TERRA + 0.02, CENTRO_DA_CASA.z],
  bancada: [BANCADA.x, ALTURA_DA_TERRA, BANCADA.z],
  farol: [FAROL.x, ALTURA_DA_TERRA, FAROL.z],
  pier: [PIER.x, 0, PIER.z],
}

// ------------------------------------------------------------------ árvores
/** As árvores da ilha central: (x, z, escala), as mesmas de `arte/mundo/lib_mundo.py`. */
export const ARVORES: [number, number, number][] = [
  [-18.5, 2, 1.2],
  [18.5, 4.5, 1],
  [-13.5, 14, 1.3],
  [-8.5, 15.5, 1.1],
  [3, 17.5, 1.2],
  [18.5, 9.5, 1],
  [17, -10, 1.3],
  [2, -18.5, 1.1],
  [-4, -17, 1],
  [-19, -6, 1.2],
  [16, 17, 0.9],
  [-17.6, 10, 1],
]
const VARIEDADES = ['arvore-redonda', 'arvore-frutas', 'arvore-pinheiro'] as const
/** Qual árvore do Blender vai em cada lugar (os coqueiros ficam nas mais perto da praia). */
export function variedadeDaArvore(x: number, z: number, i: number): string {
  return Math.hypot(x, z) > 19.5 ? 'coqueiro' : (VARIEDADES[i % 3] ?? 'arvore-redonda')
}

/**
 * O tronco de cada árvore (cilindro de raio 0,3 e altura 1,8 por escala) e, no pinheiro, a saia de
 * baixo: ela desce até 0,9 do chão, na altura do corpo, então vira um cilindro um pouco menor que
 * as pontas (1,45) para o corpo encostar nos galhos sem entrar. Copas redondas ficam acima da
 * cabeça e não colidem.
 */
export function colisoresDasArvores(): Solido[] {
  const lista: Solido[] = []
  ARVORES.forEach(([x, z, s], i) => {
    const y = alturaDaIlha(x, z)
    lista.push(cilindro(`col-cil-tronco-arvore-${i + 1}`, [x, y + 0.9 * s, z], 0.3 * s, 0.9 * s))
    if (variedadeDaArvore(x, z, i) === 'arvore-pinheiro') {
      lista.push(
        cilindro(`col-cil-copa-pinheiro-${i + 1}`, [x, y + 1.75 * s, z], 1.15 * s, 0.85 * s),
      )
    }
  })
  return lista
}

// ------------------------------------------------------------------ casa
/** Quanto a porta nova gira para fora quando abre (em volta da dobradiça). */
export const GIRO_DA_PORTA_ABERTA = -1.75
const H = QUARTO.altura
const MX = QUARTO.largura / 2
const MZ = QUARTO.fundo / 2
/** A dobradiça da porta nova no modelo (`arte/mundo/casa.py`). */
const DOBRADICA = { x: PORTA.x - PORTA.largura / 2, z: MZ + 0.03 }

/**
 * A casca da casa no referencial do grupo `Casa` (centro do quarto, y = 0 no piso). Os móveis do
 * quarto ficam em `casa.tsx` (dependem do quarto salvo). Medidas da casca do `casa.py`: paredes,
 * revestimento de fora, quinas, alicerce, floreiras das janelas, vasinhos e colunas da varanda.
 *
 * `construida`: a casa já tem obra (modo construção). As quatro paredes do quarto, com a porta, as
 * janelas, as quinas e o alicerce, passam a ser do kit (`sistemas/construcao/pecas.ts`, com o vão de
 * cada porta livre, inclusive no fundo e na esquerda); aqui fica só a varanda.
 */
export function colisoresDaCasa(portaAberta: boolean, construida = false): Solido[] {
  const esq = PORTA.x - PORTA.largura / 2
  const dir = PORTA.x + PORTA.largura / 2
  const larguraEsq = esq + MX
  const larguraDir = MX - dir
  const meioH = H / 2
  const lista: Solido[] = [
    caixa('col-parede-frente-1', [-MX + larguraEsq / 2, meioH, MZ], [larguraEsq / 2, meioH, 0.15]),
    caixa('col-parede-frente-2', [MX - larguraDir / 2, meioH, MZ], [larguraDir / 2, meioH, 0.15]),
    caixa('col-parede-direita', [MX, meioH, 0], [0.15, meioH, MZ]),
    // Esquerda e fundo vão até a face do revestimento de fora (0,1 além da parede do quarto).
    caixa('col-parede-esquerda', [-MX - 0.06, meioH, 0], [0.21, meioH, MZ]),
    caixa('col-parede-fundo', [0, meioH, -MZ - 0.06], [MX, meioH, 0.21]),
  ]
  // Quinas: pilares brancos que saem um pouco das paredes.
  const quinas: [number, number][] = [
    [-MX - 0.2, -MZ - 0.2],
    [-MX - 0.2, MZ + 0.17],
    [MX + 0.17, -MZ - 0.2],
    [MX + 0.17, MZ + 0.17],
  ]
  quinas.forEach(([x, z], i) => {
    // Na casa construída as quatro quinas são do kit.
    if (construida) return
    const meio = (H + 0.05) / 2
    lista.push(caixa(`col-quina-${i + 1}`, [x, meio, z], [0.17, meio, 0.17]))
  })
  // Alicerce de pedra em volta (de -0,32 a 0,3), com o vão da porta.
  const alicerce = (nome: string, x: number, z: number, mx: number, mz: number) =>
    lista.push(caixa(`col-alicerce-${nome}`, [x, -0.01, z], [mx, 0.31, mz]))
  alicerce('frente-1', (-MX - 0.42 + esq) / 2, MZ + 0.06, (esq + MX + 0.42) / 2, 0.2)
  alicerce('frente-2', (dir + MX + 0.42) / 2, MZ + 0.06, (MX + 0.42 - dir) / 2, 0.2)
  alicerce('direita', MX + 0.06, 0, 0.2, MZ + 0.42)
  alicerce('esquerda', -MX - 0.2, 0, 0.2, MZ + 0.42)
  alicerce('fundo', 0, -MZ - 0.2, MX + 0.42, 0.2)
  // Floreiras das janelas: saem 0,35 da parede, na altura do peito.
  lista.push(caixa('col-floreira-frente', [-3, 1.3, MZ + 0.33], [0.9, 0.22, 0.17]))
  lista.push(caixa('col-floreira-lado', [MX + 0.33, 1.4, -1], [0.17, 0.22, 0.95]))
  if (construida) {
    const daObra = new Set([
      'col-parede-frente-1',
      'col-parede-frente-2',
      'col-parede-direita',
      'col-parede-esquerda',
      'col-parede-fundo',
      'col-alicerce-frente-1',
      'col-alicerce-frente-2',
      'col-alicerce-direita',
      'col-alicerce-esquerda',
      'col-alicerce-fundo',
      'col-floreira-frente',
      'col-floreira-lado',
    ])
    for (let i = lista.length - 1; i >= 0; i--)
      if (daObra.has(lista[i]?.nome ?? '')) lista.splice(i, 1)
  }
  // Varanda: vasinhos nos cantos do deque e as duas colunas do toldo.
  const x0 = PORTA.x - 2.1
  const x1 = PORTA.x + 2.1
  lista.push(cilindro('col-cil-vaso-1', [x0 + 0.5, 0.36, MZ + 0.5], 0.24, 0.36))
  lista.push(cilindro('col-cil-vaso-2', [x1 - 0.5, 0.36, MZ + 0.5], 0.24, 0.36))
  lista.push(caixa('col-coluna-1', [x0 + 0.15, 1.7, MZ + 1.6], [0.12, 1.7, 0.12]))
  lista.push(caixa('col-coluna-2', [x1 - 0.15, 1.7, MZ + 1.6], [0.12, 1.7, 0.12]))
  const meiaPorta: Tripla = [PORTA.largura / 2, PORTA.altura / 2, 0.1]
  // Na casa construída a porta nova é a porta do kit (abre sozinha, o vão fica livre).
  if (construida) return lista
  if (!portaAberta) {
    lista.push(caixa('col-porta', [PORTA.x, PORTA.altura / 2, MZ], meiaPorta))
  } else {
    // Aberta, a folha fica para fora, encostada do lado da dobradiça.
    const g = GIRO_DA_PORTA_ABERTA
    const meio = PORTA.largura / 2
    lista.push(
      caixa(
        'col-porta-aberta',
        [DOBRADICA.x + meio * Math.cos(g), PORTA.altura / 2, DOBRADICA.z - meio * Math.sin(g)],
        [meio, PORTA.altura / 2, 0.06],
        giroEmY(g),
      ),
    )
  }
  return lista
}

// ------------------------------------------------------------------ horta, bancada, farol e píer
export function posicaoDoCanteiro(i: number): { x: number; z: number } {
  const col = i % HORTA.colunas
  const lin = Math.floor(i / HORTA.colunas)
  return {
    x: HORTA.x + (col - (HORTA.colunas - 1) / 2) * HORTA.passo,
    z: HORTA.z + (lin - (HORTA.linhas - 1) / 2) * HORTA.passo,
  }
}

/**
 * O personagem sobe sozinho até uns 0,58: o degrau automático (0,45) mais a curva do pé, que
 * escorrega por cima de uma quina baixa como numa rampa. O que deve parar o corpo passa disto.
 */
export const ALTURA_QUE_SEGURA = 0.7

/**
 * Cada canteiro é uma caixa do tamanho da borda de tábuas (1,35), mais alta que o que o personagem
 * sobe (o resto, acima da borda de 0,36, não aparece): ele para na borda em vez de pisar nas
 * plantas.
 */
export function colisoresDaHorta(): Solido[] {
  const meia = ALTURA_QUE_SEGURA / 2
  return Array.from({ length: HORTA.colunas * HORTA.linhas }, (_, i) => {
    const { x, z } = posicaoDoCanteiro(i)
    return caixa(`col-canteiro-${i + 1}`, [x, ALTURA_DA_TERRA + meia, z], [0.66, meia, 0.66])
  })
}

/** A bancada (projeto azul): a caixa do holograma, 2,2 × 1 × 1. */
export const COLISORES_DA_BANCADA: Solido[] = [caixa('col-bancada', [0, 0.5, 0], [1.1, 0.5, 0.5])]

/** A torre do farol (as pedras do pé e os degraus vêm do `farol.glb`). */
export const COLISORES_DO_FAROL: Solido[] = [cilindro('col-cil-farol', [0, 4, 0], 1.6, 5)]

export const ALTURA_DO_PIER = 0.55
/** O tampo do píer (estacas, lampião e barquinho vêm do `pier.glb`). */
export const COLISORES_DO_PIER: Solido[] = [
  caixa(
    'col-pier',
    [0, ALTURA_DO_PIER, PIER.comprimento / 2 - 0.25],
    [1, 0.06, PIER.comprimento / 2],
  ),
]

// ------------------------------------------------------------------ pontes
export interface Tabua {
  x: number
  y: number
  z: number
  giro: number
  incl: number
}

/** Duas tábuas por trecho do trajeto, cada uma com o giro e a inclinação do trecho. */
export function tabuasDaPonte(pontos: readonly PontoDaPonte[]): Tabua[] {
  const lista: Tabua[] = []
  for (let i = 0; i < pontos.length - 1; i++) {
    const a = pontos[i]
    const b = pontos[i + 1]
    if (!a || !b) continue
    const giro = Math.atan2(b.x - a.x, b.z - a.z)
    const incl = -Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z))
    for (let k = 0; k < 2; k++) {
      const t = k / 2 + 0.25
      lista.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
        giro,
        incl,
      })
    }
  }
  return lista
}

/** De quantas em quantas tábuas vai um par de postes (com a corda entre eles). */
export const TABUAS_POR_POSTE = 6
export const LADO_DO_POSTE = 1.2
export const ALTURA_DA_CORDA = 0.8

export interface PosteDaPonte {
  tabua: number
  lado: -1 | 1
  pos: Tripla
  giro: number
}

/** Os postes dos dois lados, de tantas em tantas tábuas, com a base no tampo da tábua. */
export function postesDaPonte(tabuas: readonly Tabua[]): PosteDaPonte[] {
  const lista: PosteDaPonte[] = []
  for (let i = 0; i < tabuas.length; i += TABUAS_POR_POSTE) {
    const t = tabuas[i]
    if (!t) continue
    for (const lado of [-1, 1] as const) {
      const dx = Math.cos(t.giro) * LADO_DO_POSTE * lado
      const dz = -Math.sin(t.giro) * LADO_DO_POSTE * lado
      lista.push({ tabua: i, lado, pos: [t.x + dx, t.y + 0.02, t.z + dz], giro: t.giro })
    }
  }
  return lista
}

const euler = new Euler(0, 0, 0, 'YXZ')
const quat = new Quaternion()

/**
 * Uma parede baixa e invisível sob cada corda (de um poste ao próximo do mesmo lado): segura o corpo
 * na ponte inteira, como o corrimão de corda das pontes do Bosque. A câmera passa por ela.
 */
export function corrimaosDaPonte(id: string, postes: readonly PosteDaPonte[]): Solido[] {
  const lista: Solido[] = []
  for (let i = 0; i + 2 < postes.length; i++) {
    const a = postes[i]
    const b = postes[i + 2]
    if (!a || !b) continue
    const dx = b.pos[0] - a.pos[0]
    const dy = b.pos[1] - a.pos[1]
    const dz = b.pos[2] - a.pos[2]
    euler.set(-Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(dx, dz), 0)
    quat.setFromEuler(euler)
    const alto = ALTURA_DA_CORDA + 0.25
    lista.push(
      caixa(
        `col-ponte-lado-${id}-${i + 1}`,
        [a.pos[0] + dx / 2, a.pos[1] + dy / 2 + alto / 2 - 0.05, a.pos[2] + dz / 2],
        [0.05, alto / 2, Math.hypot(dx, dy, dz) / 2],
        [quat.x, quat.y, quat.z, quat.w],
      ),
    )
  }
  return lista
}
