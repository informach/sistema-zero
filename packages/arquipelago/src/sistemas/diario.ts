import {
  BICHOS_DO_BOSQUE,
  type BichoDoBosque,
  type Capi,
  DIAS_PARA_CHOCAR,
  ILHAS,
  type IlhaId,
  NINHOS_DO_VALE,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { LINHAS_DA_CARTA } from './abertura'
import { NOME_DO_BICHO } from './bichos'
import { cresceu, DIAS_PARA_CRESCER, nasceu } from './filhote-do-vale'
import { ULTIMA_PAGINA } from './final-do-farol'
import { ITENS } from './itens'
import { coracoes } from './moradores'
import { CORACOES_DAS_PAGINAS_DO_ANEL, VIDA_NO_ANEL } from './moradores-do-anel'
import { dicaDaReceita, RECEITAS, receitaConhecida } from './receitas'

/** O filhote na coleção do Vale: do ovo que a Jade entrega ao tricerátopo crescido. */
function filhoteNaColecao(s: Salvamento) {
  const f = s.vale.filhote
  const nome = f?.nome ?? 'O filhote'
  return {
    id: 'filhote',
    nome: f?.nome ?? 'Filhote de tricerátopo',
    feito: nasceu(f),
    texto:
      f === null
        ? 'Cuide dos três ninhos e converse com a Jade.'
        : !nasceu(f)
          ? `O ovo está no chão quente do pé do vulcão: aquecido ${f.ovo} de ${DIAS_PARA_CHOCAR} dias.`
          : cresceu(f)
            ? `${nome} cresceu e mora no pé do vulcão.`
            : `${nome} cresce com comida e carinho: ${f.dias} de ${DIAS_PARA_CRESCER} dias.`,
  }
}

/** Conquistas do Vale (o que o museu dos fósseis mostra), sem criar uma página da Íris. */
export function colecaoDoVale(s: Salvamento) {
  return [
    {
      id: 'pegadas',
      nome: 'Pegadas de três dedos',
      feito: s.vale.pegadas,
      texto: s.vale.pegadas
        ? 'Você seguiu o rastro até a escavação.'
        : 'Siga o rastro perto da chegada do Vale.',
    },
    {
      id: 'fossil',
      nome: 'Osso fossilizado',
      feito: s.vale.escavacao === 3,
      texto:
        s.vale.escavacao === 3
          ? 'Você retirou a areia e observou o fóssil.'
          : `Escavação: ${s.vale.escavacao} de 3 etapas. Use o pincel com cuidado.`,
    },
    ...NINHOS_DO_VALE.map((id, i) => ({
      id,
      nome: `Ninho ${i + 1}`,
      feito: s.vale.ninhos.includes(id),
      texto: s.vale.ninhos.includes(id)
        ? 'Você protegeu os ovos da cinza do vulcão.'
        : 'Proteja os ovos da cinza do vulcão: fique perto com a lanterna acesa.',
    })),
    filhoteNaColecao(s),
  ]
}

/**
 * O diário (regras puras): as páginas do diário da Íris, uma em cada ilha do anel e a última no
 * alto do Farol, e a coleção de bichos e pegadas de cada ilha. Tudo sai do que o salvamento já
 * guarda (a amizade com o morador, os bichos achados e o adotado): não há campo novo.
 */

/**
 * As ilhas que guardam uma página da Íris, na ordem do diário. A da sua ilha é a carta de
 * boas-vindas que chegou com a chave (ficha da sua ilha, §6.28 A39): aberta desde a chegada.
 */
export const ILHAS_DO_DIARIO = [
  'sua-ilha',
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
// Todas da proposta do jogo; a do Recife voltou à ficha da ilha em 30/10/2026 (§6.28, A4).
export const TEXTO_DA_PAGINA: Readonly<Record<IlhaDoDiario, string>> = {
  'sua-ilha': LINHAS_DA_CARTA.join(' '),
  pico: VIDA_NO_ANEL.floco.pagina.texto,
  'vale-dos-dinos': VIDA_NO_ANEL.jade.pagina.texto,
  nuvens: VIDA_NO_ANEL.irie.pagina.texto,
  farol: ULTIMA_PAGINA.join(' '),
  recife: 'Mapas sem fim não levam ninguém a lugar nenhum.',
  bosque:
    'Hoje desenhei uma ponte e apaguei três vezes. Ninguém viu o desenho. Talvez seja melhor assim.',
  'vila-doce':
    'O Bento me pediu a receita do bolo de fubá. Eu disse que ainda não estava boa. Estava boa.',
}

/** Com quantos corações de amizade a Capi entrega a página do Bosque. */
export const CORACOES_DA_PAGINA = 2

/** O que a Capi diz quando entrega a página. */
export const FALA_DA_PAGINA = [
  'Achei uma coisa na minha cabana e guardei para você: uma página do diário da Íris.',
  'Ela vinha muito ao bosque desenhar. Guarde no seu diário, no menu.',
] as const

/** Com quantos corações de amizade o Bento entrega a página da Vila Doce (fase2-12). */
export const CORACOES_DA_PAGINA_DA_VILA = 2

/** O que o Bento diz quando entrega a página. */
export const FALA_DA_PAGINA_DO_BENTO = [
  'Arrumando a despensa, achei isto: uma página do diário da Íris.',
  'Ela escreveu sobre o meu bolo de fubá. Guarde no seu diário, no menu.',
] as const

export type EstadoDaPagina =
  | { ilha: IlhaDoDiario; nome: string; aberta: true; texto: string }
  | { ilha: IlhaDoDiario; nome: string; aberta: false; dica: string }

const NOME_DA_ILHA = Object.fromEntries(ILHAS.map((i) => [i.id, i.nome])) as Record<IlhaId, string>

const MORADOR_DA_PAGINA = { pico: 'floco', 'vale-dos-dinos': 'jade', nuvens: 'irie' } as const

/** A página do Bosque já está com a criança. */
export function temAPaginaDoBosque(capi: Capi): boolean {
  return coracoes(capi.amizade) >= CORACOES_DA_PAGINA
}

/** A amizade acabou de chegar aos corações da página (a Capi entrega agora). */
export function ganhouAPagina(antes: Capi, depois: Capi): boolean {
  return !temAPaginaDoBosque(antes) && temAPaginaDoBosque(depois)
}

/** A página da Vila Doce já está com a criança. */
export function temAPaginaDaVila(bento: Capi): boolean {
  return coracoes(bento.amizade) >= CORACOES_DA_PAGINA_DA_VILA
}

/** A amizade com o Bento acabou de chegar aos corações da página (ele entrega agora). */
export function ganhouAPaginaDaVila(amizadeAntes: number, amizadeAgora: number): boolean {
  return (
    coracoes(amizadeAntes) < CORACOES_DA_PAGINA_DA_VILA &&
    coracoes(amizadeAgora) >= CORACOES_DA_PAGINA_DA_VILA
  )
}

function dicaDoMorador(quem: string, guarda: number, coracoesAgora: number): string {
  const faltam = guarda - coracoesAgora
  return `${quem} guarda esta página e entrega quando a amizade de vocês chegar a ${guarda} corações (falta${faltam > 1 ? 'm' : ''} ${faltam}).`
}

/** As páginas do diário, abertas ou guardadas, com o texto ou a dica de onde está cada uma. */
export function paginasDoDiario(s: Salvamento): EstadoDaPagina[] {
  return ILHAS_DO_DIARIO.map((ilha): EstadoDaPagina => {
    const nome = NOME_DA_ILHA[ilha]
    const texto = TEXTO_DA_PAGINA[ilha]
    if (ilha === 'sua-ilha') return { ilha, nome: 'A carta de boas-vindas', aberta: true, texto }
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
    if (ilha === 'vila-doce' && texto && temAPaginaDaVila(s.moradores.bento))
      return { ilha, nome, aberta: true, texto }
    if (ilha === 'vila-doce')
      return {
        ilha,
        nome,
        aberta: false,
        dica: dicaDoMorador(
          'O Bento, da padaria,',
          CORACOES_DA_PAGINA_DA_VILA,
          coracoes(s.moradores.bento.amizade),
        ),
      }
    if (ilha === 'recife')
      return s.recife.pagina && texto
        ? { ilha, nome, aberta: true, texto }
        : { ilha, nome, aberta: false, dica: 'No cesto sob a vela caída do navio afundado.' }
    if (ilha === 'farol' && s.farol.pagina && texto) return { ilha, nome, aberta: true, texto }
    if (ilha === 'farol')
      return { ilha, nome, aberta: false, dica: 'A última página fica no alto do Farol.' }
    const quem = MORADOR_DA_PAGINA[ilha]
    const amizade = coracoes(s.moradores[quem].amizade)
    return amizade >= CORACOES_DAS_PAGINAS_DO_ANEL
      ? { ilha, nome, aberta: true, texto }
      : {
          ilha,
          nome,
          aberta: false,
          dica: dicaDoMorador(VIDA_NO_ANEL[quem].nome, CORACOES_DAS_PAGINAS_DO_ANEL, amizade),
        }
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

// ── A coleção de receitas (fase2-12) ────────────────────────────────────────────────────────────

export type EstadoDaReceita =
  | {
      id: string
      nome: string
      emoji: string
      sabe: true
      precisa: string
      onde: string
      fonte: string
    }
  | { id: string; nome: string; emoji: string; sabe: false; dica: string }

/**
 * As receitas no diário: as que ela sabe, com o que precisam e onde se fazem, e as que o Bento
 * ainda vai lembrar, com quantos corações faltam.
 */
export function colecaoDeReceitas(s: Salvamento): EstadoDaReceita[] {
  return RECEITAS.map((r): EstadoDaReceita => {
    const emoji = ITENS[r.faz.id]?.emoji ?? ''
    if (!receitaConhecida(r, s)) {
      return {
        id: r.id,
        nome: r.nome,
        emoji,
        sabe: false,
        dica: dicaDaReceita(r, s),
      }
    }
    const precisa = Object.entries(r.precisa)
      .map(([id, q]) => `${q} ${ITENS[id]?.nome.toLowerCase() ?? id}`)
      .join(', ')
    return {
      id: r.id,
      nome: r.nome,
      emoji,
      sabe: true,
      precisa,
      fonte: dicaDaReceita(r, s),
      onde:
        r.onde === 'fogueira'
          ? 'Na fogueira da Festa Junina, em junho'
          : r.onde === 'forno'
            ? 'No forno da casa'
            : 'Na bancada da ilha',
    }
  })
}
