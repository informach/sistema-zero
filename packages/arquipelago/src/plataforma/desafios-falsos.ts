import {
  type DesafioNaLista,
  type DesafiosDoJogador,
  diaDeSaoPaulo,
  ILHAS,
  type IlhaId,
  MoldeDeDesafioSchema,
  type PedidoDeFerramenta,
  QUADROS_POR_ILHA,
  type RespostaDoServico,
  type ResultadoDeFerramenta,
} from '@sistemazero/arquipelago-contracts'
import { coresDoCatalogo } from '../sistemas/cores-conquistadas'

/**
 * Desafios de mentira para o playground: três quadros cadastrados no Bosque (um pronto para fazer,
 * um que pede um bloco de curso e um feito), o resto vazio, dois da sua ilha (C03a: o quadro 4
 * feito, que pinta a praia, e o 2 pronto), o projeto autoral do Farol (C03b) e o desafio do dia nos três estados (`DiaDoPlayground`). Abrir um
 * desafio "resolve" na hora.
 */
export type DiaDoPlayground = 'pronto' | 'feito' | 'nenhum'

const DO_DIA = '00000000-0000-4000-8000-0000000000d1'

const CURSO = {
  courseId: '00000000-0000-4000-8000-000000000001',
  titulo: 'Repetições',
  slug: 'repeticoes',
  posto: 'coder',
}

const CURSO_DO_EXPLORADOR = {
  courseId: '00000000-0000-4000-8000-000000000004',
  titulo: 'Acerte o Alvo',
  slug: 'acerte-o-alvo',
  posto: 'explorer',
}

function desafio(
  id: string,
  quadro: number,
  titulo: string,
  situacao: DesafioNaLista['situacao'],
  ilha: IlhaId = 'bosque',
): DesafioNaLista {
  return {
    id,
    revisao: 1,
    ilha,
    tipo: 'quadro-das-cores',
    quadro,
    ordem: quadro,
    titulo,
    situacao,
    faltam:
      situacao === 'faltam-blocos'
        ? [{ bloco: 'sz_js_repeat', rotulo: 'Repetir vezes', cursos: [CURSO] }]
        : [],
    aprenda: situacao === 'disponivel' && ilha === 'bosque' ? [CURSO] : [],
    recompensa: { cor: ilha !== 'farol', moedas: 20, moedasExtra: 10 },
    recompensaVista: situacao === 'concluido',
  }
}

export function criarDesafiosFalsos(
  posicao: number,
  o: { dia?: DiaDoPlayground; agora?: () => Date; quadrosFeitos?: boolean } = {},
) {
  const dia = o.dia ?? 'pronto'
  // Com `quadrosFeitos`, as seis posições do Bosque têm conquistas confirmadas para prints.
  const situacao = (s: DesafioNaLista['situacao']) => (o.quadrosFeitos ? 'concluido' : s)
  const agora = o.agora ?? (() => new Date())
  let feitoHoje = dia === 'feito'
  const lista: DesafioNaLista[] = [
    desafio(
      '00000000-0000-4000-8000-0000000000a1',
      1,
      'A borboleta que voa',
      situacao('disponivel'),
    ),
    desafio(
      '00000000-0000-4000-8000-0000000000a2',
      2,
      'O coelho que pula o tronco',
      situacao('faltam-blocos'),
    ),
    desafio('00000000-0000-4000-8000-0000000000a3', 3, 'As flores do lago', 'concluido'),
    // Feito o quadro 4 da sua ilha: só a praia tem cor de quadro (casa, horta e píer seguem A17).
    desafio('00000000-0000-4000-8000-0000000000b1', 4, 'A concha rosa', 'concluido', 'sua-ilha'),
    desafio(
      '00000000-0000-4000-8000-0000000000b2',
      2,
      'A primeira concha',
      'disponivel',
      'sua-ilha',
    ),
    desafio(
      '00000000-0000-4000-8000-0000000000c1',
      1,
      'Meu jogo do Arquipélago',
      'disponivel',
      'farol',
    ),
    // O pedido do Nico no Estúdio (A23): curto, sem cor; feito, a placa dele acende à noite.
    {
      ...desafio(
        '00000000-0000-4000-8000-0000000000f1',
        0,
        'A placa da noite',
        situacao('disponivel'),
        'sua-ilha',
      ),
      tipo: 'pedido-de-morador',
      quadro: null,
      ordem: 80,
      recompensa: { cor: false, moedas: 20, moedasExtra: 10 },
    },
    // O pedido da Capi no Estúdio (lacunas, 01/11/2026): a placa fica ao lado dela no Bosque.
    {
      ...desafio(
        '00000000-0000-4000-8000-0000000000f2',
        0,
        'A lanterna da cabana',
        situacao('disponivel'),
        'bosque',
      ),
      tipo: 'pedido-de-morador',
      quadro: null,
      ordem: 80,
      recompensa: { cor: false, moedas: 5, moedasExtra: 2 },
    },
    // O sexto quadro do Recife, em Python (A2), espera o curso-base do Explorador (A3).
    {
      ...desafio(
        '00000000-0000-4000-8000-0000000000e6',
        6,
        'Mira de bolhas: resgate dos vagalumes',
        situacao('falta-curso'),
        'recife',
      ),
      aprenda: [CURSO_DO_EXPLORADOR],
    },
  ]
  if (o.quadrosFeitos) {
    for (let quadro = 4; quadro <= QUADROS_POR_ILHA; quadro++) {
      lista.push(
        desafio(
          `00000000-0000-4000-8000-0000000000a${quadro}`,
          quadro,
          `Quadro ${quadro}`,
          'concluido',
        ),
      )
    }
  }
  if (dia !== 'nenhum')
    lista.push({
      ...desafio(DO_DIA, 0, 'A corrida das pedras', dia === 'feito' ? 'concluido' : 'disponivel'),
      tipo: 'desafio-do-dia',
      quadro: null,
      recompensa: { cor: false, moedas: 10, moedasExtra: 5 },
    })
  const feitos = (ilha: IlhaId) =>
    lista.filter(
      (d) => d.ilha === ilha && d.tipo === 'quadro-das-cores' && d.situacao === 'concluido',
    ).length
  const resposta = (): DesafiosDoJogador => ({
    versao: 1,
    ilhas: ILHAS.map((i) => ({
      id: i.id,
      aberta: i.posicao <= posicao,
      quadro: { feitos: feitos(i.id), total: QUADROS_POR_ILHA },
    })),
    desafios: structuredClone(lista),
    doDia: dia === 'nenhum' ? null : { id: DO_DIA, dia: diaDeSaoPaulo(agora()), feito: feitoHoje },
  })
  return {
    buscar(caminho: string, metodo: string): RespostaDoServico | null {
      if (metodo === 'GET' && caminho === '/desafios/cores')
        return { status: 200, corpo: coresDoCatalogo(lista) }
      if (metodo === 'GET' && (caminho === '/desafios' || caminho.startsWith('/desafios?')))
        return { status: 200, corpo: resposta() }
      const vista = caminho.match(/^\/desafios\/([^/]+)\/recompensa-vista$/)
      if (metodo === 'POST' && vista) {
        const d = lista.find((x) => x.id === vista[1])
        if (d) d.recompensaVista = true
        return { status: 200, corpo: { ok: true } }
      }
      return null
    },
    async abrir(pedido: PedidoDeFerramenta): Promise<ResultadoDeFerramenta | null> {
      const molde = MoldeDeDesafioSchema.safeParse(pedido.molde)
      if (!molde.success) return null
      const d = lista.find((x) => x.id === molde.data.desafioId)
      if (!d || d.situacao === 'faltam-blocos' || d.situacao === 'ilha-fechada')
        return { situacao: 'indisponivel', motivo: 'bloqueado' }
      await new Promise((r) => setTimeout(r, 400))
      d.situacao = 'concluido'
      if (d.id === DO_DIA) feitoHoje = true
      return { situacao: 'pronto', criacaoId: d.id }
    },
  }
}
