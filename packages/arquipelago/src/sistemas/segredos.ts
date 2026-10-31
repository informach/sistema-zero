import {
  ILHAS,
  type IlhaId,
  lumiDeLuzDoSegredo,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { FAMILIAS_DOS_LUMIS } from './borroes'
import { ESPECIES_DE_LUMI } from './lumis'

const NOME_DA_ILHA = Object.fromEntries(ILHAS.map((i) => [i.id, i.nome])) as Record<IlhaId, string>

/**
 * Os segredos das ilhas (N12, levantamento de 30/10). A proposta: "o kit de movimento abre
 * segredos nas ilhas antigas"; "baús, Lumis raros e páginas extras do diário em lugares que só o
 * kit de movimento completo alcança". Escolha mínima: nas quatro ilhas que vêm antes do Pico, um
 * baú da Íris flutua no alto de uma corrente de vento (a mesma do Pico, `sistemas/planador.ts`).
 * Sem o planador o vento não leva ninguém; com ele, a criança pula, abre o planador dentro do
 * vento e sobe até o baú, que fica registrado no álbum. Dentro de cada baú há uma página extra do
 * diário da Íris (§6.28 A39, `PAGINA_EXTRA`) e, em sete deles, um Lumi de luz (B12,
 * `lumis-de-luz.ts` dos contratos: abrir o baú é ter o Lumi). Cada segredo tem um bit fixo em
 * `salvamento.segredos` (nunca reordenar nem reutilizar).
 */
export interface Segredo {
  id: 'sua-ilha' | 'bosque' | 'vila-doce' | 'recife'
  bit: number
  ilha: IlhaId
  /** O pé da corrente: no mundo na sua ilha, no modelo da ilha nas outras (o chão a 1 m). */
  x: number
  z: number
}

export const SEGREDOS: readonly Segredo[] = [
  {
    id: 'sua-ilha',
    bit: 1,
    ilha: 'sua-ilha',
    x: 8.5,
    z: 19,
  },
  {
    id: 'bosque',
    bit: 2,
    ilha: 'bosque',
    x: 7,
    z: 0,
  },
  {
    id: 'vila-doce',
    bit: 4,
    ilha: 'vila-doce',
    x: 0,
    z: 6,
  },
  {
    id: 'recife',
    bit: 8,
    ilha: 'recife',
    x: -8,
    z: -2,
  },
]

/** A corrente que leva ao baú: o raio e a altura acima do chão; o baú fica ao lado do alto. */
export const VENTO_DO_SEGREDO = { raio: 1.1, altura: 6.5, bauAoLado: 1.3 } as const
/** Do meio do corpo ao baú, para abrir (no ar, parado no alto do vento). */
export const ALCANCE_DO_BAU = 2.2

/**
 * Os segredos dos outros movimentos (B11, arte de 31/10/2026): um lugar por movimento, que só ele
 * alcança, com o baú da Íris na âncora `ancora` do modelo. Montaria e balão ficam nas próprias
 * ilhas (são brinquedos de lá; ajuste técnico registrado), cipó e mergulho na sua ilha.
 */
export interface SegredoDoMovimento {
  id: 'cipo' | 'patins' | 'mergulho' | 'montaria' | 'balao'
  bit: number
  ilha: IlhaId
  /** A âncora do baú no modelo (da ilha, do píer ou do `segredos-da-ilha.glb`). */
  ancora: string
  /** O que o álbum diz enquanto o baú espera. */
  dica: string
}

export const SEGREDOS_DOS_MOVIMENTOS: readonly SegredoDoMovimento[] = [
  {
    id: 'cipo',
    bit: 16,
    ilha: 'sua-ilha',
    ancora: 'segredo-cipo',
    dica: 'Um deque alto numa árvore perto das pedras. Só o balanço do cipó do Bosque chega lá.',
  },
  {
    id: 'patins',
    bit: 32,
    ilha: 'bosque',
    ancora: 'segredo-patins',
    dica: 'Do outro lado de um vão na pista do Bosque. Só a velocidade dos patins da Vila Doce passa.',
  },
  {
    id: 'mergulho',
    bit: 64,
    ilha: 'sua-ilha',
    ancora: 'segredo-mergulho',
    dica: 'Numa gruta debaixo do píer. Só quem aprendeu a mergulhar no Recife entra.',
  },
  {
    id: 'montaria',
    bit: 128,
    ilha: 'vale-dos-dinos',
    ancora: 'segredo-montaria',
    dica: 'No alto da cinza quente do Vale. A pé ela empurra de volta; montado no dino, dá para subir.',
  },
  {
    id: 'balao',
    bit: 256,
    ilha: 'nuvens',
    ancora: 'segredo-balao',
    dica: 'Numa nuvem pequena, bem no alto da Ilha das Nuvens. Só o balão chega lá.',
  },
]

export type SegredoQualquer = Segredo | SegredoDoMovimento
/** Todos os segredos, na ordem do álbum e do diário. */
export const TODOS_OS_SEGREDOS: readonly SegredoQualquer[] = [
  ...SEGREDOS,
  ...SEGREDOS_DOS_MOVIMENTOS,
]

export function segredoDoMovimento(id: SegredoDoMovimento['id']): SegredoDoMovimento {
  const s = SEGREDOS_DOS_MOVIMENTOS.find((x) => x.id === id)
  if (!s) throw new Error(`sem segredo: ${id}`)
  return s
}

export function segredoAchado(segredos: number, s: SegredoQualquer): boolean {
  return (segredos & s.bit) !== 0
}

export function segredoDaIlha(ilha: IlhaId): Segredo | null {
  return SEGREDOS.find((s) => s.ilha === ilha) ?? null
}

/** O segredo de uma ilha que tem um (para montar a cena; ilha sem segredo é erro de código). */
export function segredoObrigatorio(ilha: IlhaId): Segredo {
  const s = segredoDaIlha(ilha)
  if (!s) throw new Error(`sem segredo: ${ilha}`)
  return s
}

/** Abre o baú: o bit guarda o achado, uma vez só (o álbum mostra os baús achados). */
export function abrirSegredo(s: Salvamento, segredo: SegredoQualquer): Salvamento {
  if (segredoAchado(s.segredos, segredo)) return s
  return {
    ...s,
    segredos: s.segredos | segredo.bit,
  }
}

/**
 * A página extra de cada baú (a proposta: "páginas extras do diário" nos segredos). A Íris fala do
 * lugar e do medo de mostrar o que fazia, sem contar o final (que fica na última página do Farol).
 */
export const PAGINA_EXTRA: Readonly<Record<SegredoQualquer['id'], string>> = {
  'sua-ilha':
    'Daqui de cima dá para ver todas as ilhas. Escrevo no alto porque aqui só o vento lê.',
  bosque:
    'Desenhei a Capi três vezes. A terceira ficou parecida com ela. As duas primeiras guardei aqui, onde ninguém procura.',
  'vila-doce':
    'Hoje um bolo meu solou. Comi assim mesmo, e estava gostoso. Não contei para ninguém.',
  recife:
    'Joguei um mapa no mar para ver aonde ele ia. A maré trouxe de volta, molhado e ainda bonito.',
  cipo: 'Balancei no cipó até ficar tonta. Lá de cima a casa parecia pequena, e eu gostei de ser pequena também.',
  patins: 'Caí três vezes antes de passar o vão. Na quarta, esqueci de ter medo e passei.',
  mergulho:
    'Aqui embaixo guardo o que ainda não tenho coragem de mostrar. A água deixa tudo mais quieto.',
  montaria:
    'O dino me levou aonde eu não ia sozinha. Pedir ajuda também é um jeito de chegar mais longe.',
  balao: 'Subi tão alto que as ilhas viraram pontinhos de cor. Daqui, nenhuma parece errada.',
}

export interface PaginaExtra {
  id: SegredoQualquer['id']
  nome: string
  achada: boolean
  texto: string | null
}

/** As páginas extras, na ordem dos segredos: o texto só depois de abrir o baú. */
export function paginasExtras(segredos: number): PaginaExtra[] {
  return TODOS_OS_SEGREDOS.map((s) => {
    const achada = segredoAchado(segredos, s)
    return {
      id: s.id,
      nome: NOME_DA_ILHA[s.ilha],
      achada,
      texto: achada ? PAGINA_EXTRA[s.id] : null,
    }
  })
}

export function falaDoSegredo(segredo: Segredo): string {
  return `No alto do vento tinha um baú da Íris, com uma página extra do diário dela. A página está no diário, e o baú no álbum, em Segredos das ilhas, junto com ${NOME_DA_ILHA[segredo.ilha]}.${falaDoLumiDeLuz(segredo)}`
}

/** Do baú com um Lumi de luz (B12), ele sai junto e vai morar com a família dele. */
export function falaDoLumiDeLuz(segredo: SegredoQualquer): string {
  const lumi = lumiDeLuzDoSegredo(segredo.bit)
  if (!lumi) return ''
  const e = ESPECIES_DE_LUMI[lumi]
  const familia = FAMILIAS_DOS_LUMIS[e.ilha as keyof typeof FAMILIAS_DOS_LUMIS]
  return ` Do baú também saiu um Lumi de luz, o ${e.nome}. Ele foi morar com a família dele ${familia.de}.`
}

/** Onde se acha cada Lumi de luz, para o álbum (sem contar o caminho). */
export function ondeAcharOLumiDeLuz(bit: number): string | null {
  const s = TODOS_OS_SEGREDOS.find((x) => x.bit === bit)
  return s ? `Num baú da Íris, em ${NOME_DA_ILHA[s.ilha]}` : null
}

/** O recado ao pé do vento: sem planador, a curiosidade; com ele, como subir. */
export function falaDoVento(temPlanador: boolean): string {
  return temPlanador
    ? 'Lá no alto tem um baú. Pule dentro do vento e abra o planador para subir.'
    : 'Lá no alto tem um baú, e o vento sobe até ele. Só que ele só leva quem plana. O planador vem do Pico Gelado.'
}

/** A fala do baú dos movimentos (B11), aberto no chão, na água ou no balão. */
export function falaDoSegredoDoMovimento(segredo?: SegredoDoMovimento): string {
  return `Dentro do baú da Íris tinha uma página extra do diário dela. A página está no diário, e o baú no álbum, em Segredos das ilhas.${segredo ? falaDoLumiDeLuz(segredo) : ''}`
}

export const TEXTOS_DOS_SEGREDOS = {
  abrir: 'Abrir o baú',
  olhar: 'Olhar o vento',
  dica: 'Um baú no alto do vento. Precisa do planador do Pico Gelado.',
} as const
