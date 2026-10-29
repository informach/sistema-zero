import { PONTOS_DE_CORAL, type Salvamento } from '@sistemazero/arquipelago-contracts'

/**
 * Replantar os corais da lagoa do Recife (fase3-03). Quatro pontos na beira rasa, um por tipo de
 * coral do `recife-props.glb`. Cada ponto é um bit de `recife.corais` (V13): replantado fica para
 * sempre, sem ordem, prazo ou castigo. Cada coral replantado traz um peixe ao aquário de casa.
 */
export type TipoDeCoral = 'galho' | 'cerebro' | 'leque' | 'tubo'

export interface PontoDeCoral {
  tipo: TipoDeCoral
  /** O nó do coral vivo no `recife-props.glb`. */
  no: `coral-${TipoDeCoral}`
  /** O nó do coral desbotado no `recife-props.glb` (o mesmo desenho, sem cor, com cacos em volta). */
  desbotado: `coral-${TipoDeCoral}-desbotado`
  /** A âncora do `recife.glb` onde ele fica: no fundo da água rasa da beira da lagoa. */
  ancora: `coral-muda-${number}`
  nome: string
}

/**
 * A lagoa do `recife.glb` (`LAGOA` e `RAIOS_DA_LAGOA` de `arte/ilhas/recife.py`). Os pontos de
 * replantio são as âncoras `coral-muda-1` a `-4` (a 85% dos raios, entre as algas, onde o fundo
 * fica uns 0,23 abaixo do tampo: dá pé). `tests/corais-do-recife.test.ts` confere contra o GLB.
 */
export const LAGOA_DO_RECIFE = { x: -0.6, z: -0.6, raioX: 4.2, raioZ: 3.6 } as const

const TIPOS: readonly { tipo: TipoDeCoral; nome: string }[] = [
  { tipo: 'galho', nome: 'coral galho' },
  { tipo: 'cerebro', nome: 'coral cérebro' },
  { tipo: 'leque', nome: 'coral leque' },
  { tipo: 'tubo', nome: 'coral tubo' },
]

export const PONTOS_DOS_CORAIS: readonly PontoDeCoral[] = TIPOS.map((t, i) => ({
  tipo: t.tipo,
  no: `coral-${t.tipo}` as const,
  desbotado: `coral-${t.tipo}-desbotado` as const,
  ancora: `coral-muda-${i + 1}` as const,
  nome: t.nome,
}))

export const CORAIS = {
  /** De que distância (no chão) dá para replantar. */
  alcance: 1.6,
  /** O tamanho dos corais pequenos da lagoa: o desbotado já fica nele. */
  escala: 0.8,
  /** A muda replantada nasce deste tamanho e cresce até `escala`. */
  escalaDaMuda: 0.5,
  /** Quanto tempo (s de jogo) a muda leva para crescer. */
  crescer: 1.2,
} as const

export function coralReplantado(corais: number, i: number): boolean {
  return (corais & (1 << i)) !== 0
}

export function coraisReplantados(corais: number): number {
  let n = 0
  for (let i = 0; i < PONTOS_DE_CORAL; i++) if (coralReplantado(corais, i)) n++
  return n
}

/** Replantar o ponto `i`. Devolve o mesmo salvamento quando ele já estava replantado. */
export function replantarCoral(s: Salvamento, i: number): Salvamento {
  if (i < 0 || i >= PONTOS_DE_CORAL || coralReplantado(s.recife.corais, i)) return s
  return { ...s, recife: { ...s.recife, corais: s.recife.corais | (1 << i) } }
}

export function rotuloDoCoral(i: number): string {
  return `Replantar o ${PONTOS_DOS_CORAIS[i]?.nome ?? 'coral'}`
}

/** O que o Zappy diz depois de replantar (com os corais já contando o novo). */
export function falaDoReplantio(i: number, corais: number): string {
  const faltam = PONTOS_DE_CORAL - coraisReplantados(corais)
  if (faltam === 0)
    return 'Os quatro corais da lagoa voltaram a crescer. O aquário tem quatro peixes.'
  const nome = PONTOS_DOS_CORAIS[i]?.nome ?? 'coral'
  return `O ${nome} voltou a crescer. Um peixe novo foi para o aquário. ${
    faltam === 1 ? 'Falta 1 coral' : `Faltam ${faltam} corais`
  } na lagoa.`
}

// ------------------------------------------------------------------ o aquário

/** Os peixes do `aquario.glb`: o peixe N aparece com o coral N replantado. */
export const PEIXES_DO_AQUARIO = ['peixe-1', 'peixe-2', 'peixe-3', 'peixe-4'] as const

export function peixesVisiveis(corais: number): boolean[] {
  return PEIXES_DO_AQUARIO.map((_, i) => coralReplantado(corais, i))
}

export interface LinhaDoAquario {
  peixe: boolean
  texto: string
}

/** O painel do aquário: o total e, por coral, o peixe que veio ou onde replantar. */
export function aquarioNoPainel(corais: number): { titulo: string; linhas: LinhaDoAquario[] } {
  const n = coraisReplantados(corais)
  return {
    titulo: `Peixes no aquário: ${n} de ${PONTOS_DE_CORAL}.`,
    linhas: PONTOS_DOS_CORAIS.map((p, i) =>
      coralReplantado(corais, i)
        ? { peixe: true, texto: `O peixe do ${p.nome} chegou.` }
        : { peixe: false, texto: `Replante o ${p.nome} na lagoa do Recife.` },
    ),
  }
}
