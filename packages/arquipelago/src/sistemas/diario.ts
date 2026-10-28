import {
  BICHOS_DO_BOSQUE,
  type BichoDoBosque,
  type Capi,
  ILHAS,
  type IlhaId,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { NOME_DO_BICHO } from './bichos'
import { coracoes } from './moradores'

/**
 * O diário (regras puras): as páginas do diário da Íris, uma em cada ilha do anel e a última no
 * alto do Farol, e a coleção de bichos e pegadas de cada ilha. Tudo sai do que o salvamento já
 * guarda (a amizade com o morador, os bichos achados e o adotado): não há campo novo.
 */

/** As ilhas que guardam uma página da Íris, na ordem do diário. */
export const ILHAS_DO_DIARIO = [
  'bosque',
  'vila-doce',
  'recife',
  'pico',
  'vale-dos-dinos',
  'nuvens',
  'farol',
] as const satisfies readonly IlhaId[]
export type IlhaDoDiario = (typeof ILHAS_DO_DIARIO)[number]

/** O texto de cada página que já chegou ao jogo (o da proposta do jogo, assinado pela Íris). */
export const TEXTO_DA_PAGINA: Readonly<Partial<Record<IlhaDoDiario, string>>> = {
  bosque:
    'Hoje desenhei uma ponte e apaguei três vezes. Ninguém viu o desenho. Talvez seja melhor assim.',
}

/** Com quantos corações de amizade a Capi entrega a página do Bosque. */
export const CORACOES_DA_PAGINA = 2

/** O que a Capi diz quando entrega a página. */
export const FALA_DA_PAGINA = [
  'Achei uma coisa na minha cabana e guardei para você: uma página do diário da Íris.',
  'Ela vinha muito ao bosque desenhar. Guarde no seu diário, no menu.',
] as const

export type EstadoDaPagina =
  | { ilha: IlhaDoDiario; nome: string; aberta: true; texto: string }
  | { ilha: IlhaDoDiario; nome: string; aberta: false; dica: string }

const NOME_DA_ILHA = Object.fromEntries(ILHAS.map((i) => [i.id, i.nome])) as Record<IlhaId, string>

/** Como se diz "fica em" cada ilha: na Vila Doce, no Recife Coral. */
const NA_ILHA: Readonly<Record<Exclude<IlhaDoDiario, 'bosque' | 'farol'>, 'na' | 'no'>> = {
  'vila-doce': 'na',
  recife: 'no',
  pico: 'no',
  'vale-dos-dinos': 'no',
  nuvens: 'na',
}

/** A página do Bosque já está com a criança. */
export function temAPaginaDoBosque(capi: Capi): boolean {
  return coracoes(capi.amizade) >= CORACOES_DA_PAGINA
}

/** A amizade acabou de chegar aos corações da página (a Capi entrega agora). */
export function ganhouAPagina(antes: Capi, depois: Capi): boolean {
  return !temAPaginaDoBosque(antes) && temAPaginaDoBosque(depois)
}

/** As páginas do diário, abertas ou guardadas, com o texto ou a dica de onde está cada uma. */
export function paginasDoDiario(s: Salvamento): EstadoDaPagina[] {
  return ILHAS_DO_DIARIO.map((ilha): EstadoDaPagina => {
    const nome = NOME_DA_ILHA[ilha]
    const texto = TEXTO_DA_PAGINA[ilha]
    if (ilha === 'bosque' && texto && temAPaginaDoBosque(s.moradores.capi))
      return { ilha, nome, aberta: true, texto }
    if (ilha === 'bosque') {
      const faltam = CORACOES_DA_PAGINA - coracoes(s.moradores.capi.amizade)
      return {
        ilha,
        nome,
        aberta: false,
        dica: `A Capi guarda esta página. Ela entrega quando a amizade de vocês chegar a ${CORACOES_DA_PAGINA} corações (falta${faltam > 1 ? 'm' : ''} ${faltam}).`,
      }
    }
    if (ilha === 'farol')
      return { ilha, nome, aberta: false, dica: 'A última página fica no alto do Farol.' }
    return { ilha, nome, aberta: false, dica: `Fica ${NA_ILHA[ilha]} ${nome}, com quem mora lá.` }
  })
}

/** Como cada bicho deixa a pegada (o desenho está em `interface/pegadas.tsx`). */
export const PEGADA_DO_BICHO: Readonly<Record<BichoDoBosque, string>> = {
  cachorro: 'Quatro dedos com a marca das unhas e uma almofada grande no meio.',
  gato: 'Quatro dedos redondinhos, sem a marca das unhas: o gato esconde as unhas para andar.',
  coelho: 'Comprida e peludinha: as patas de trás do coelho são grandes, para pular longe.',
  porquinho: 'Pequenininha, com quatro dedos nas patas da frente e três nas de trás.',
}

export type EstadoDoBicho =
  | { bicho: BichoDoBosque; estado: 'escondido' }
  | { bicho: BichoDoBosque; estado: 'achado'; nome: string; pegada: string }
  | { bicho: BichoDoBosque; estado: 'adotado'; nome: string; apelido: string; pegada: string }

/** A coleção do Bosque: cada bicho escondido, achado (no cercadinho) ou adotado (com o nome dado). */
export function colecaoDoBosque(s: Salvamento): EstadoDoBicho[] {
  return BICHOS_DO_BOSQUE.map((bicho): EstadoDoBicho => {
    if (s.bichos.adotado?.id === bicho)
      return {
        bicho,
        estado: 'adotado',
        nome: NOME_DO_BICHO[bicho],
        apelido: s.bichos.adotado.nome,
        pegada: PEGADA_DO_BICHO[bicho],
      }
    if (s.bichos.achados.includes(bicho))
      return { bicho, estado: 'achado', nome: NOME_DO_BICHO[bicho], pegada: PEGADA_DO_BICHO[bicho] }
    return { bicho, estado: 'escondido' }
  })
}
