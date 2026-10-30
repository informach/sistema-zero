import { ILHAS, type IlhaId, type Salvamento } from '@sistemazero/arquipelago-contracts'

const NOME_DA_ILHA = Object.fromEntries(ILHAS.map((i) => [i.id, i.nome])) as Record<IlhaId, string>

/**
 * Os segredos das ilhas (N12, levantamento de 30/10). A proposta: "o kit de movimento abre
 * segredos nas ilhas antigas"; "baús, Lumis raros e páginas extras do diário em lugares que só o
 * kit de movimento completo alcança". Escolha mínima: nas quatro ilhas que vêm antes do Pico, um
 * baú da Íris flutua no alto de uma corrente de vento (a mesma do Pico, `sistemas/planador.ts`).
 * Sem o planador o vento não leva ninguém; com ele, a criança pula, abre o planador dentro do
 * vento e sobe até o baú, que fica registrado no álbum. Lumis raros e páginas extras do diário
 * dentro dos baús pedem conteúdo novo (pendente). Cada segredo tem um bit fixo em
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
    x: 10.3,
    z: 12.3,
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

export function segredoAchado(segredos: number, s: Segredo): boolean {
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
export function abrirSegredo(s: Salvamento, segredo: Segredo): Salvamento {
  if (segredoAchado(s.segredos, segredo)) return s
  return {
    ...s,
    segredos: s.segredos | segredo.bit,
  }
}

export function falaDoSegredo(segredo: Segredo): string {
  return `No alto do vento tinha um baú da Íris. Ele já está no álbum, em Segredos das ilhas, junto com ${NOME_DA_ILHA[segredo.ilha]}.`
}

/** O recado ao pé do vento: sem planador, a curiosidade; com ele, como subir. */
export function falaDoVento(temPlanador: boolean): string {
  return temPlanador
    ? 'Lá no alto tem um baú. Pule dentro do vento e abra o planador para subir.'
    : 'Lá no alto tem um baú, e o vento sobe até ele. Só que ele só leva quem plana. O planador vem do Pico Gelado.'
}

export const TEXTOS_DOS_SEGREDOS = {
  abrir: 'Abrir o baú',
  olhar: 'Olhar o vento',
  dica: 'Um baú no alto do vento. Precisa do planador do Pico Gelado.',
} as const
