import type { Salvamento } from '@sistemazero/arquipelago-contracts'

/**
 * As coleções das ilhas do anel (30/10/2026): as notas musicais e os cristais do Pico Gelado e as
 * estrelas caídas da Ilha das Nuvens, a arte de `arte/itens/colecoes.py`. Como as da praia, cada
 * descoberta é uma lembrança no inventário (quantidade 1): o álbum e a mochila leem o mesmo
 * registro, nada novo entra no salvamento e nada se perde por demorar.
 *
 * Os lugares estão no referencial do GLB da ilha (`pico.glb`, `nuvens.glb`), com a altura do chão
 * ali. `tests/colecoes-das-ilhas.test.ts` confere cada um contra os colisores reais: é chão, cabe o
 * corpo, chega-se andando (a clave de sol, no alto da parede de gelo, pelo vento e pelo planador)
 * e fica longe dos outros interativos.
 */
export type GrupoDaColecao = 'notas' | 'cristais' | 'estrelas'
export type IlhaDaColecao = 'pico' | 'nuvens'

export interface PecaDaColecao {
  id: string
  nome: string
  emoji: string
  /** O rótulo do E / Usar, com o artigo certo. */
  pegar: string
  grupo: GrupoDaColecao
  ilha: IlhaDaColecao
  /** Onde fica no modelo da ilha; `null` quando outra peça do jogo já a mostra (o cristal rosa). */
  lugar: { x: number; y: number; z: number } | null
  /** Só aparece (e só se pega) à noite. */
  noite?: true
  dica: string
}

export const NOTAS_DO_PICO = [
  {
    id: 'nota-seminima',
    pegar: 'Pegar a semínima',
    nome: 'Semínima',
    emoji: '🎵',
    grupo: 'notas',
    ilha: 'pico',
    lugar: { x: 7, y: 1, z: -9 },
    dica: 'Procure perto do lago congelado.',
  },
  {
    id: 'nota-colcheia',
    pegar: 'Pegar a colcheia',
    nome: 'Colcheia',
    emoji: '🎵',
    grupo: 'notas',
    ilha: 'pico',
    lugar: { x: -9, y: 1, z: 4 },
    dica: 'Dê a volta na montanha pelo lado da caverna.',
  },
  {
    id: 'nota-dupla',
    pegar: 'Pegar as duas colcheias',
    nome: 'Duas colcheias',
    emoji: '🎶',
    grupo: 'notas',
    ilha: 'pico',
    lugar: { x: 7.5, y: 1, z: 3 },
    dica: 'Olhe em volta do iglu.',
  },
  {
    id: 'nota-clave-de-sol',
    pegar: 'Pegar a clave de sol',
    nome: 'Clave de sol',
    emoji: '🎼',
    grupo: 'notas',
    ilha: 'pico',
    lugar: { x: -0.4, y: 5.4, z: 10 },
    dica: 'Lá no alto da parede de gelo. O vento ajuda quem tem planador.',
  },
] as const satisfies readonly PecaDaColecao[]

export const CRISTAIS_DO_PICO = [
  {
    id: 'cristal-azul',
    pegar: 'Pegar a ponta de gelo azul',
    nome: 'Ponta de gelo azul',
    emoji: '💎',
    grupo: 'cristais',
    ilha: 'pico',
    lugar: { x: -19, y: 0.4, z: -1.5 },
    dica: 'Dentro da caverna de cristal, no chão da galeria.',
  },
  {
    id: 'cristal-roxo',
    pegar: 'Pegar a ametista',
    nome: 'Ametista',
    emoji: '💎',
    grupo: 'cristais',
    ilha: 'pico',
    lugar: { x: -21.2, y: 0.4, z: 2.4 },
    dica: 'Dentro da caverna de cristal, perto do laguinho.',
  },
  {
    id: 'cristal-verde',
    pegar: 'Pegar o geodo verde',
    nome: 'Geodo verde',
    emoji: '💎',
    grupo: 'cristais',
    ilha: 'pico',
    lugar: { x: -22, y: 0.4, z: -1.5 },
    dica: 'No fundo da caverna de cristal, ao pé das pedras.',
  },
  {
    // O cristal raro da fase3-07 (`cristal-raro.ts`): o pedestal da caverna já o mostra.
    id: 'cristal-rosa',
    pegar: 'Pegar o cristal',
    nome: 'Cristal rosa',
    emoji: '💎',
    grupo: 'cristais',
    ilha: 'pico',
    lugar: null,
    dica: 'No alto das pedras do fundo da caverna. Vá pulando.',
  },
] as const satisfies readonly PecaDaColecao[]

export const ESTRELAS_DAS_NUVENS = [
  {
    id: 'estrela-cadente',
    pegar: 'Pegar a estrela cadente',
    nome: 'Estrela cadente',
    emoji: '🌠',
    grupo: 'estrelas',
    ilha: 'nuvens',
    lugar: { x: -4.5, y: 1, z: -6 },
    noite: true,
    dica: 'Cai à noite perto do mirante.',
  },
  {
    id: 'estrela-sorriso',
    pegar: 'Pegar a estrela sorriso',
    nome: 'Estrela sorriso',
    emoji: '⭐',
    grupo: 'estrelas',
    ilha: 'nuvens',
    lugar: { x: -6.5, y: 1, z: 2.5 },
    noite: true,
    dica: 'Cai à noite perto da árvore grande.',
  },
  {
    id: 'estrela-cintilante',
    pegar: 'Pegar a estrela cintilante',
    nome: 'Estrela cintilante',
    emoji: '✨',
    grupo: 'estrelas',
    ilha: 'nuvens',
    lugar: { x: 3, y: 1, z: -8 },
    noite: true,
    dica: 'Cai à noite na beira da ilha, longe do balão.',
  },
  {
    id: 'estrela-trio',
    pegar: 'Pegar o trio de estrelas',
    nome: 'Trio de estrelas',
    emoji: '🌟',
    grupo: 'estrelas',
    ilha: 'nuvens',
    lugar: { x: 9, y: 1, z: -3 },
    noite: true,
    dica: 'Cai à noite perto da chegada da ponte.',
  },
] as const satisfies readonly PecaDaColecao[]

export const LEMBRANCAS_DAS_ILHAS: readonly PecaDaColecao[] = [
  ...NOTAS_DO_PICO,
  ...CRISTAIS_DO_PICO,
  ...ESTRELAS_DAS_NUVENS,
]
export type LembrancaDasIlhas = (typeof LEMBRANCAS_DAS_ILHAS)[number]['id']

const DO_GRUPO: Readonly<Record<GrupoDaColecao, readonly PecaDaColecao[]>> = {
  notas: NOTAS_DO_PICO,
  cristais: CRISTAIS_DO_PICO,
  estrelas: ESTRELAS_DAS_NUVENS,
}

export const NOME_DO_GRUPO: Readonly<Record<GrupoDaColecao, string>> = {
  notas: 'Notas musicais do Pico',
  cristais: 'Cristais do Pico',
  estrelas: 'Estrelas das Nuvens',
}

export function descobriuNaIlha(s: Salvamento, id: string): boolean {
  return (s.inventario[id] ?? 0) > 0
}

/** O mesmo registro para a mochila e o álbum: uma vez só, sem duplicar quantidade. */
export function registrarNaIlha(s: Salvamento, id: string): Salvamento {
  if (descobriuNaIlha(s, id)) return s
  return { ...s, inventario: { ...s.inventario, [id]: 1 } }
}

export function colecaoDaIlha(s: Salvamento, grupo: GrupoDaColecao) {
  return DO_GRUPO[grupo].map((p) => ({
    id: p.id,
    nome: p.nome,
    encontrado: descobriuNaIlha(s, p.id),
    dica: p.dica,
  }))
}

/** O grupo inteiro descoberto (para a fala do Zappy ao completar). */
export function grupoCompleto(s: Salvamento, grupo: GrupoDaColecao): boolean {
  return DO_GRUPO[grupo].every((p) => descobriuNaIlha(s, p.id))
}

/** O recado do Zappy quando a peça que faltava fecha o grupo. */
export function falaDaColecaoCompleta(grupo: GrupoDaColecao): string {
  return `Coleção completa: ${NOME_DO_GRUPO[grupo]}.`
}

/** A fala de quem acabou de achar uma peça: a do registro e, se fechou o grupo, a da coleção. */
export function falaDaDescoberta(p: PecaDaColecao, depois: Salvamento): string {
  const registro = `Descoberta registrada: ${p.nome}. Ela está no álbum e na mochila.`
  if (!grupoCompleto(depois, p.grupo)) return registro
  return `${registro} ${falaDaColecaoCompleta(p.grupo)}`
}

export const ALCANCE_DA_COLECAO = { plano: 1.4, altura: 0.6 } as const

/** Perto no plano e na mesma altura dos pés (de baixo da parede de gelo não se pega a clave). */
export function alcancaNaIlha(
  alvo: { x: number; y: number; z: number },
  pes: { x: number; y: number; z: number },
): boolean {
  return (
    Math.hypot(alvo.x - pes.x, alvo.z - pes.z) <= ALCANCE_DA_COLECAO.plano &&
    Math.abs(alvo.y - pes.y) <= ALCANCE_DA_COLECAO.altura
  )
}
