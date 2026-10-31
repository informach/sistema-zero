import {
  type IlhaComCabana,
  MOVEIS_NA_CASA_MAXIMO,
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
    /** Móveis da cozinha, da sala e do banheiro (`moveis.ts`): só na casa. */
    moveis: number
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
  moveis: [],
}

/** O quarto da plataforma na grade do mundo (o mesmo `QUARTO` de `mundo/medidas.ts`). */
export const QUARTO_NA_GRADE: Retangulo = { x0: -6, z0: -8, x1: 6, z1: 0 }

/**
 * O lote da casa (31/10/2026, pedido dela: o lugar de construir mais livre e coerente para a casa
 * crescer a partir do quarto): o chão plano de `CHAO_DO_LOTE` (`mundo/medidas.ts`), sem árvore,
 * moita, horta nem bancada, que ficam fora dele. Só a varanda da casa e o pé do farol ocupam.
 * Um teste confere o chão plano e que todo colisor do lote cai numa célula ocupada.
 */
export const LOTE_DA_CASA: Lote = {
  id: 'casa',
  area: { x0: -15, z0: -14, x1: 16, z1: 10 },
  ocupadas: [
    { nome: 'a varanda', ret: { x0: 0, z0: 0, x1: 5, z1: 2 } },
    // Já do tamanho do lote grande, que usa as mesmas ocupadas (o que passa da área não conta).
    { nome: 'o farol', ret: { x0: -17, z0: -15, x1: -9, z1: -9 } },
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
    moveis: [],
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
    moveis: MOVEIS_NA_CASA_MAXIMO,
  },
}

/** A posição da jornada do Vale dos Dinos (Arquiteto): daí em diante, o quintal grande (E04). */
export const POSICAO_DO_QUINTAL_GRANDE = 6

/**
 * O quintal grande (E04, levantamento de 30/10): a proposta põe o "quintal grande" no Vale. O
 * lote da casa cresce 2 m para o oeste e para a frente e 1 m para trás, até onde o gramado deixa
 * (o canto sudeste já encosta na praia). As ocupadas são as mesmas (a varanda e o farol). A obra de
 * antes continua igual: o lote grande contém o pequeno.
 */
export const LOTE_DA_CASA_GRANDE: Lote = {
  ...LOTE_DA_CASA,
  area: { x0: -17, z0: -15, x1: 16, z1: 12 },
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
      // Canteiro, objeto e móvel ficam no quintal e na casa (a horta é uma só).
      canteiros: 0,
      moveis: 0,
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
