import {
  type AparenciaDoObjeto,
  CATALOGO_DE_OBJETOS,
  FOSSEIS_DO_VALE,
  type FossilDoVale,
  ILHAS,
  type IlhaId,
  ilhaVisitada,
  LUMIS,
  type LumiId,
  OBJETOS_DA_CASA,
  type ObjetoDaCasa,
  PERCURSOS,
  type PercursoId,
  resultadoDoPercurso,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { ACHADOS_DO_RECIFE, type AchadoDoRecife } from './achados-do-recife'
import { colecaoDaPraia } from './colecoes-da-praia'
import { colecaoDaIlha } from './colecoes-das-ilhas'
import { rotuloDaAparencia } from './construcao/galeria'
import { coralReplantado, PONTOS_DOS_CORAIS } from './corais-do-recife'
import {
  colecaoDeReceitas,
  colecaoDoBosque,
  type EstadoDaReceita,
  type EstadoDoBicho,
} from './diario'
import { cresceu } from './filhote-do-vale'
import { achouFossil, NOME_DO_FOSSIL, TEXTOS_DOS_FOSSEIS } from './fosseis'
import { ESPECIES_DE_LUMI } from './lumis'
import { formatarTempo, PERCURSOS_DO_JOGO } from './percurso'
import { SEGREDOS, segredoAchado, TEXTOS_DOS_SEGREDOS, TODOS_OS_SEGREDOS } from './segredos'

export { ESPECIES_DE_LUMI, type EspecieDeLumi } from './lumis'

/**
 * O álbum de coleções (fase2-09, regras puras): o "museu para completar" da proposta. Cada seção
 * diz quantos ela tem e quantos faltam, e tudo sai do que o salvamento já guarda (sem campo novo).
 * As coleções que o diário já mostra (bichos e receitas) vêm das MESMAS funções do diário. Nada se
 * perde por faltar: o que falta só espera, e o álbum diz onde procurar.
 */

/** Quantos ela tem numa seção, de quantos, e quantos faltam. */
export interface ContaDaSecao {
  tem: number
  total: number
  faltam: number
}

function contar(tem: number, total: number): ContaDaSecao {
  return { tem, total, faltam: total - tem }
}

/** O título de uma seção com a conta ("Receitas: 2 de 6"). */
export function tituloDaSecao(nome: string, conta: ContaDaSecao): string {
  return `${nome}: ${conta.tem} de ${conta.total}`
}

/** A linha de baixo do título: quantos faltam, ou que a seção está completa. */
export function faltamNaSecao(conta: ContaDaSecao): string {
  if (conta.faltam === 0) return 'Completa.'
  return conta.faltam === 1 ? 'Falta 1.' : `Faltam ${conta.faltam}.`
}

// ── Bichos e receitas: as mesmas coleções do diário ─────────────────────────────────────────────

export function bichosDoAlbum(s: Salvamento): { conta: ContaDaSecao; itens: EstadoDoBicho[] } {
  const itens = colecaoDoBosque(s)
  return {
    conta: contar(itens.filter((b) => b.estado !== 'escondido').length, itens.length),
    itens,
  }
}

export function receitasDoAlbum(s: Salvamento): { conta: ContaDaSecao; itens: EstadoDaReceita[] } {
  const itens = colecaoDeReceitas(s)
  return { conta: contar(itens.filter((r) => r.sabe).length, itens.length), itens }
}

// ── Estrelas dos percursos ──────────────────────────────────────────────────────────────────────

const NOME_DA_ILHA = Object.fromEntries(ILHAS.map((i) => [i.id, i.nome])) as Record<IlhaId, string>

/** Em que ilha fica cada percurso. */
export const ILHA_DO_PERCURSO: Readonly<Record<PercursoId, IlhaId>> = {
  'bosque-copas': 'bosque',
  'vila-telhados': 'vila-doce',
  'pico-cume': 'pico',
  'nuvens-saltos': 'nuvens',
  'nuvens-balao': 'nuvens',
  'praia-pedras': 'sua-ilha',
  'recife-corais': 'recife',
  'vale-pegadas': 'vale-dos-dinos',
  'farol-subida': 'farol',
}

export interface EstrelaDoPercurso {
  ganhou: boolean
  texto: string
}

export interface PercursoDoAlbum {
  id: PercursoId
  nome: string
  ilha: string
  /** As três estrelas, na ordem da tela do resultado (chegada, tempo, todas as coisas pegas). */
  estrelas: EstrelaDoPercurso[]
  /** O melhor tempo ("1:02,3"), ou `null` se ela ainda não correu. */
  melhorTempo: string | null
}

/** As estrelas de cada percurso: cada uma conta, e as três de todos os percursos são o total. */
export function percursosDoAlbum(s: Salvamento): {
  conta: ContaDaSecao
  itens: PercursoDoAlbum[]
} {
  const itens = PERCURSOS.map((id): PercursoDoAlbum => {
    const config = PERCURSOS_DO_JOGO[id]
    const r = resultadoDoPercurso(s.percursos, id)
    return {
      id,
      nome: config.nome,
      ilha: NOME_DA_ILHA[ILHA_DO_PERCURSO[id]],
      estrelas: [
        { ganhou: r?.estrelas.chegada ?? false, texto: 'Chegou ao fim' },
        {
          ganhou: r?.estrelas.tempo ?? false,
          texto: `Em até ${Math.round(config.tempoAlvoMs / 1000)} segundos`,
        },
        {
          ganhou: r?.estrelas.vagalumes ?? false,
          // A terceira estrela é o segredo do percurso (§6.28, A9).
          texto: `Achar ${config.escondido}`,
        },
      ],
      melhorTempo: r ? formatarTempo(r.melhorTempoMs) : null,
    }
  })
  const ganhas = itens.reduce((n, p) => n + p.estrelas.filter((e) => e.ganhou).length, 0)
  return { conta: contar(ganhas, itens.length * 3), itens }
}

// ── Aparências guardadas ────────────────────────────────────────────────────────────────────────

export type ObjetoDoAlbum =
  | { objeto: ObjetoDaCasa; nome: string; estado: 'com-aparencia'; aparencias: string[] }
  | { objeto: ObjetoDaCasa; nome: string; estado: 'sem-aparencia'; dica: string }
  | { objeto: ObjetoDaCasa; nome: string; estado: 'ainda-nao-chegou'; dica: string }

/**
 * As aparências guardadas (`projetos[*].aparencias`), por objeto da casa: o objeto conta quando
 * guarda pelo menos uma aparência (feita por ela ou da galeria). O que ainda não tem diz como ganhar.
 */
export function aparenciasDoAlbum(s: Salvamento): {
  conta: ContaDaSecao
  /** Quantas aparências ela guarda ao todo, somando os objetos. */
  guardadas: number
  itens: ObjetoDoAlbum[]
} {
  const itens = OBJETOS_DA_CASA.map((objeto): ObjetoDoAlbum => {
    const nome = CATALOGO_DE_OBJETOS[objeto].molde.nome
    const projeto = s.projetos[objeto]
    if (!projeto)
      return {
        objeto,
        nome,
        estado: 'ainda-nao-chegou',
        dica: CATALOGO_DE_OBJETOS[objeto].origem ?? 'Chega com as próximas ilhas.',
      }
    if (projeto.aparencias.length === 0)
      return {
        objeto,
        nome,
        estado: 'sem-aparencia',
        dica: 'Na casa, abra o objeto para dar uma aparência a ele.',
      }
    return {
      objeto,
      nome,
      estado: 'com-aparencia',
      aparencias: projeto.aparencias.map((a: AparenciaDoObjeto) => rotuloDaAparencia(a)),
    }
  })
  const guardadas = OBJETOS_DA_CASA.reduce((n, o) => n + (s.projetos[o]?.aparencias.length ?? 0), 0)
  return {
    conta: contar(itens.filter((o) => o.estado === 'com-aparencia').length, itens.length),
    guardadas,
    itens,
  }
}

// ── Lumis presos ────────────────────────────────────────────────────────────────────────────────

export type LumiDoAlbum =
  | {
      id: LumiId
      estado: 'preso'
      nome: string
      ilha: string
      raro: boolean
      cor: string
      quantos: number
    }
  | { id: LumiId; estado: 'nao-encontrado'; ilha: string; raro: boolean }

/** As 14 espécies de `LUMIS`: as que ela prendeu com quantos, as outras como silhueta. */
export function lumisDoAlbum(s: Salvamento): { conta: ContaDaSecao; itens: LumiDoAlbum[] } {
  const itens = LUMIS.map((id): LumiDoAlbum => {
    const e = ESPECIES_DE_LUMI[id]
    const ilha = NOME_DA_ILHA[e.ilha]
    const quantos = s.lumis[id] ?? 0
    if (quantos > 0)
      return { id, estado: 'preso', nome: e.nome, ilha, raro: e.raro, cor: e.cor, quantos }
    return { id, estado: 'nao-encontrado', ilha, raro: e.raro }
  })
  return { conta: contar(itens.filter((l) => l.estado === 'preso').length, itens.length), itens }
}

// ── Os segredos das ilhas (N12) ─────────────────────────────────────────────────────────────────

export interface SegredoDoAlbum {
  id: string
  ilha: string
  achado: boolean
  texto: string
}

export function segredosDoAlbum(s: Salvamento): { conta: ContaDaSecao; itens: SegredoDoAlbum[] } {
  const itens = TODOS_OS_SEGREDOS.map((g) => {
    const achado = segredoAchado(s.segredos, g)
    const doVento = SEGREDOS.some((v) => v.id === g.id)
    return {
      id: g.id,
      ilha: ILHAS.find((i) => i.id === g.ilha)?.nome ?? g.ilha,
      achado,
      texto: achado
        ? doVento
          ? 'Baú da Íris achado no alto do vento.'
          : 'Baú da Íris achado.'
        : 'dica' in g
          ? g.dica
          : TEXTOS_DOS_SEGREDOS.dica,
    }
  })
  return { conta: contar(itens.filter((i) => i.achado).length, itens.length), itens }
}

// ── Os peixes do Recife (§6.28, A40) ────────────────────────────────────────────────────────────

export interface PeixeDoRecifeDoAlbum {
  id: string
  nome: string
  encontrado: boolean
  dica: string
}

/** Um peixe por coral replantado na lagoa do Recife: os mesmos do aquário de casa. */
export function peixesDoRecifeDoAlbum(s: Salvamento): {
  conta: ContaDaSecao
  itens: PeixeDoRecifeDoAlbum[]
} {
  const itens = PONTOS_DOS_CORAIS.map((p, i) => ({
    id: `peixe-do-${p.tipo}`,
    nome: `Peixe do ${p.nome}`,
    encontrado: coralReplantado(s.recife.corais, i),
    dica: `Replante o ${p.nome} na lagoa do Recife.`,
  }))
  return { conta: contar(itens.filter((p) => p.encontrado).length, itens.length), itens }
}

// ── Os fósseis do museu e as pegadas (B4 e B5, 31/10/2026) ──────────────────────────────────────

export interface FossilDoAlbum {
  id: FossilDoVale
  nome: string
  encontrado: boolean
  dica: string
}

/** Os seis fósseis do museu de casa, achados um por dia na escavação do Vale. */
export function fosseisDoAlbum(s: Salvamento): { conta: ContaDaSecao; itens: FossilDoAlbum[] } {
  const itens = FOSSEIS_DO_VALE.map((id) => ({
    id,
    nome: NOME_DO_FOSSIL[id],
    encontrado: achouFossil(s, id),
    dica: TEXTOS_DOS_FOSSEIS.naAreia,
  }))
  return { conta: contar(itens.filter((f) => f.encontrado).length, itens.length), itens }
}

export const PEGADAS_DO_ALBUM = [
  'pegada-rex',
  'pegada-triceratopo',
  'pegada-capivara',
  'pegada-passaro',
] as const
export type PegadaDoAlbum = (typeof PEGADAS_DO_ALBUM)[number]

export interface PegadaNoAlbum {
  id: PegadaDoAlbum
  nome: string
  encontrado: boolean
  texto: string
}

/**
 * As pegadas do álbum: o rastro de três dedos do Vale, a do tricerátopo que ela criou, a da Capi
 * no Bosque e a dos pássaros que pousam nas Nuvens. Tudo sai do que o salvamento já guarda.
 */
export function pegadasDoAlbum(s: Salvamento): { conta: ContaDaSecao; itens: PegadaNoAlbum[] } {
  const tricera = cresceu(s.vale.filhote)
  const capi = s.moradores.capi.amizade > 0
  const nuvens = ilhaVisitada(s.ilhasVisitadas, 'nuvens')
  const itens: PegadaNoAlbum[] = [
    {
      id: 'pegada-rex',
      nome: 'Pegada de três dedos',
      encontrado: s.vale.pegadas,
      texto: s.vale.pegadas
        ? 'Você seguiu o rastro até a escavação do Vale.'
        : 'Siga o rastro perto da chegada do Vale dos Dinos.',
    },
    {
      id: 'pegada-triceratopo',
      nome: 'Pegada de tricerátopo',
      encontrado: tricera,
      texto: tricera
        ? 'O tricerátopo que você criou já deixa pegadas grandes.'
        : 'Cuide do ovo da Jade até o filhote crescer.',
    },
    {
      id: 'pegada-capivara',
      nome: 'Pegada de capivara',
      encontrado: capi,
      texto: capi
        ? 'A Capi deixa pegadas na beira do lago do Bosque.'
        : 'Converse com a Capi no Bosque dos Bichos.',
    },
    {
      id: 'pegada-passaro',
      nome: 'Pegada de pássaro',
      encontrado: nuvens,
      texto: nuvens
        ? 'Os pássaros pousam nas nuvens e deixam pegadas leves.'
        : 'Visite a Ilha das Nuvens.',
    },
  ]
  return { conta: contar(itens.filter((p) => p.encontrado).length, itens.length), itens }
}

// ── O álbum inteiro ─────────────────────────────────────────────────────────────────────────────

export function albumDoSalvamento(s: Salvamento) {
  const conchas = colecaoDaPraia(s, 'conchas')
  const peixes = colecaoDaPraia(s, 'peixes')
  const notas = colecaoDaIlha(s, 'notas')
  const cristais = colecaoDaIlha(s, 'cristais')
  const estrelas = colecaoDaIlha(s, 'estrelas')
  const achados = (Object.keys(ACHADOS_DO_RECIFE) as AchadoDoRecife[]).map((id) => ({
    id,
    nome: ACHADOS_DO_RECIFE[id].nome,
    dica: ACHADOS_DO_RECIFE[id].dica,
    achado: s.recife[id],
  }))
  return {
    conchas: {
      conta: contar(conchas.filter((p) => p.encontrado).length, conchas.length),
      itens: conchas,
    },
    peixes: {
      conta: contar(peixes.filter((p) => p.encontrado).length, peixes.length),
      itens: peixes,
    },
    notas: { conta: contar(notas.filter((p) => p.encontrado).length, notas.length), itens: notas },
    cristais: {
      conta: contar(cristais.filter((p) => p.encontrado).length, cristais.length),
      itens: cristais,
    },
    estrelas: {
      conta: contar(estrelas.filter((p) => p.encontrado).length, estrelas.length),
      itens: estrelas,
    },
    recife: {
      conta: contar(achados.filter((a) => a.achado).length, achados.length),
      itens: achados,
    },
    peixesDoRecife: peixesDoRecifeDoAlbum(s),
    segredos: segredosDoAlbum(s),
    fosseis: fosseisDoAlbum(s),
    pegadas: pegadasDoAlbum(s),
    bichos: bichosDoAlbum(s),
    receitas: receitasDoAlbum(s),
    percursos: percursosDoAlbum(s),
    aparencias: aparenciasDoAlbum(s),
    lumis: lumisDoAlbum(s),
  }
}
export type Album = ReturnType<typeof albumDoSalvamento>
