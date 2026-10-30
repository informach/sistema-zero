import {
  type IlhaComCabana,
  LIMITES_DO_IGLU,
  type Obra,
  type Trecho,
} from '@sistemazero/arquipelago-contracts'

/**
 * O lote de uma obra (modo construção): a grade de 1 célula por unidade onde se constrói, o que já
 * ocupa o lugar e as paredes que vêm prontas. As coordenadas da grade da casa são as do mundo
 * (inteiras, alinhadas ao quarto da plataforma, que vai de x -6 a 6 e de z -8 a 0).
 */

/** Células de `x0` a `x1 - 1` e de `z0` a `z1 - 1`. */
export interface Retangulo {
  x0: number
  z0: number
  x1: number
  z1: number
}

export interface Celula {
  x: number
  z: number
}

export interface Lote {
  id: 'casa' | IlhaComCabana
  /** Onde dá para construir. */
  area: Retangulo
  /** O que já está no lugar (não se constrói em cima nem se fecha dentro de casa). */
  ocupadas: readonly { nome: string; ret: Retangulo }[]
  /** O cômodo que já existe (o quarto da plataforma): sempre de dentro, com piso próprio. */
  fixo: Retangulo | null
  /** Paredes que já existem e não se mexem nem abrem (as do quarto que a plataforma desenha). */
  paredesFixas: readonly Trecho[]
  /** Paredes que o kit desenha desde a primeira obra: aceitam porta e janela, mas não se apagam. */
  paredesTravadas: readonly Trecho[]
  /** A obra com que o lote começa (na casa, as paredes do quarto com a porta nova e as janelas). */
  obraInicial: Obra
  /** Tetos de quantidade do jogo (abaixo dos do contrato, para a obra caber no salvamento). */
  limites: {
    arestasDeParede: number
    /** Trechos guardados no salvamento (o contrato aceita até 200 de parede e 120 de cerca). */
    trechosDeParede: number
    aberturas: number
    pisos: number
    arestasDeCerca: number
    trechosDeCerca: number
    caminhos: number
    canteiros: number
  }
}

export const OBRA_VAZIA: Obra = {
  paredes: [],
  aberturas: [],
  pisos: [],
  objetos: [],
  cercas: [],
  caminhos: [],
  canteiros: [],
}

/** O quarto da plataforma na grade do mundo (o mesmo `QUARTO` de `mundo/medidas.ts`). */
export const QUARTO_NA_GRADE: Retangulo = { x0: -6, z0: -8, x1: 6, z1: 0 }

/**
 * O lote da casa: onde o chão da sua ilha é plano (medido com `alturaDaIlha`, teste em
 * `tests/construcao.test.ts`). Varanda, horta, bancada, a árvore perto da casa, a do lado e o pé
 * do farol ficam ocupados; um teste confere que todo colisor do lote cai numa célula ocupada.
 */
export const LOTE_DA_CASA: Lote = {
  id: 'casa',
  area: { x0: -13, z0: -12, x1: 14, z1: 8 },
  ocupadas: [
    { nome: 'a varanda', ret: { x0: 0, z0: 0, x1: 5, z1: 2 } },
    // A horta e o cata-vento ao lado (`CATA_VENTO`, x 13,9).
    { nome: 'a horta', ret: { x0: 7, z0: -1, x1: 14, z1: 3 } },
    { nome: 'a bancada', ret: { x0: 8, z0: -8, x1: 12, z1: -6 } },
    { nome: 'a árvore', ret: { x0: -11, z0: 2, x1: -7, z1: 6 } },
    { nome: 'a árvore', ret: { x0: -13, z0: -5, x1: -12, z1: -1 } },
    { nome: 'o farol', ret: { x0: -13, z0: -12, x1: -9, z1: -9 } },
    // As moitas do terreno (`col-cil-moita-*` do `terreno.glb`).
    { nome: 'a moita', ret: { x0: -10, z0: -3, x1: -7, z1: 0 } },
    { nome: 'a moita', ret: { x0: -10, z0: -8, x1: -7, z1: -5 } },
    { nome: 'a moita', ret: { x0: 7, z0: -11, x1: 10, z1: -8 } },
    { nome: 'a moita', ret: { x0: -5, z0: -12, x1: -2, z1: -9 } },
    { nome: 'a moita', ret: { x0: 3, z0: -12, x1: 5, z1: -10 } },
    // Na frente da varanda o chão sobe (a ondulação da ilha volta ali).
    { nome: 'o morrinho', ret: { x0: 1, z0: 4, x1: 9, z1: 8 } },
  ],
  fixo: QUARTO_NA_GRADE,
  paredesFixas: [
    { x: -6, z: -8, eixo: 'z', n: 8 },
    { x: -6, z: -8, eixo: 'x', n: 12 },
  ],
  paredesTravadas: [
    { x: -6, z: 0, eixo: 'x', n: 12 },
    { x: 6, z: -8, eixo: 'z', n: 8 },
  ],
  obraInicial: {
    paredes: [
      { x: -6, z: 0, eixo: 'x', n: 12 },
      { x: 6, z: -8, eixo: 'z', n: 8 },
    ],
    // A porta nova (o vão de x 1,4 a 3,6 do `casa.glb`) e as duas janelas com floreira.
    aberturas: [
      { tipo: 'porta', x: 1, z: 0, eixo: 'x' },
      { tipo: 'janela-grande', x: -4, z: 0, eixo: 'x' },
      { tipo: 'janela-grande', x: 6, z: -6, eixo: 'z' },
    ],
    pisos: [],
    objetos: [],
    cercas: [],
    caminhos: [],
    canteiros: [],
  },
  limites: {
    arestasDeParede: 320,
    trechosDeParede: 200,
    aberturas: 48,
    pisos: 30,
    arestasDeCerca: 200,
    trechosDeCerca: 120,
    caminhos: 240,
    canteiros: 18,
  },
}

/** A posição da jornada do Vale dos Dinos (Arquiteto): daí em diante, o quintal grande (E04). */
export const POSICAO_DO_QUINTAL_GRANDE = 6

/**
 * O quintal grande (E04, levantamento de 30/10): a proposta põe o "quintal grande" no Vale. O
 * lote da casa cresce 2 m para cada lado, no gramado da mesma altura do lote de antes (a variação
 * do chão fica na mesma faixa, teste). O que está no anel novo (árvore, pinheiros e o farol) fica
 * ocupado. A obra de antes continua igual: o lote grande contém o pequeno.
 */
export const LOTE_DA_CASA_GRANDE: Lote = {
  ...LOTE_DA_CASA,
  area: { x0: -15, z0: -14, x1: 16, z1: 10 },
  ocupadas: [
    ...LOTE_DA_CASA.ocupadas,
    { nome: 'a árvore', ret: { x0: -15, z0: -5, x1: -12, z1: -1 } },
    { nome: 'o pinheiro', ret: { x0: -15, z0: 4, x1: -14, z1: 8 } },
    { nome: 'o farol', ret: { x0: -15, z0: -14, x1: -9, z1: -9 } },
    { nome: 'o pinheiro', ret: { x0: 13, z0: 8, x1: 16, z1: 10 } },
  ],
}

/** O lote da casa onde se constrói agora: o grande do Vale em diante. */
export function loteDaCasa(jornada: number): Lote {
  return jornada >= POSICAO_DO_QUINTAL_GRANDE ? LOTE_DA_CASA_GRANDE : LOTE_DA_CASA
}

/**
 * O lote de uma cabana: um terreno livre na ilha, sem quarto e sem nada que ocupe (a arte deixa o
 * lote limpo, `tests/bosque-crescido.test.ts`), começando vazio. As coordenadas são as do modelo da
 * ilha (as âncoras `lote-cabana-a` e `-b`); o jogo gira a obra junto com a ilha. Os tetos são
 * menores que os da casa: o salvamento guarda a casa e as cabanas juntos.
 */
export function loteDaCabana(id: Exclude<Lote['id'], 'casa'>, area: Retangulo): Lote {
  const base = {
    id,
    area,
    ocupadas: [],
    fixo: null,
    paredesFixas: [],
    paredesTravadas: [],
    obraInicial: OBRA_VAZIA,
  }
  // O iglu do Pico (E04): só paredes, aberturas e piso, nos tetos do contrato.
  if (id === 'pico')
    return {
      ...base,
      limites: {
        arestasDeParede: 40,
        trechosDeParede: LIMITES_DO_IGLU.paredes,
        aberturas: LIMITES_DO_IGLU.aberturas,
        pisos: LIMITES_DO_IGLU.pisos,
        arestasDeCerca: 0,
        trechosDeCerca: LIMITES_DO_IGLU.cercas,
        caminhos: LIMITES_DO_IGLU.caminhos,
        canteiros: LIMITES_DO_IGLU.canteiros,
      },
    }
  return {
    ...base,
    limites: {
      arestasDeParede: 80,
      trechosDeParede: 48,
      aberturas: 12,
      pisos: 6,
      arestasDeCerca: 60,
      trechosDeCerca: 30,
      caminhos: 48,
      // Canteiro e objeto ficam no quintal e na casa (a horta é uma só).
      canteiros: 0,
    },
  }
}

export function chaveDaCelula(c: Celula): string {
  return `${c.x},${c.z}`
}

export function naArea(ret: Retangulo, c: Celula): boolean {
  return c.x >= ret.x0 && c.x < ret.x1 && c.z >= ret.z0 && c.z < ret.z1
}

/** O nome do que ocupa a célula (ou `null`). */
export function ocupante(lote: Lote, c: Celula): string | null {
  for (const o of lote.ocupadas) if (naArea(o.ret, c)) return o.nome
  return null
}

/** A célula é do cômodo fixo (o quarto)? */
export function noFixo(lote: Lote, c: Celula): boolean {
  return lote.fixo !== null && naArea(lote.fixo, c)
}
