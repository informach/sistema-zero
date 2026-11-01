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
  o: { dia?: DiaDoPlayground; agora?: () => Date; quadrosFeitos?: boolean | 'todos' } = {},
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
    {
      ...desafio(
        '00000000-0000-4000-8000-0000000000b1',
        4,
        'A concha rosa',
        'concluido',
        'sua-ilha',
      ),
      resumo: 'Faça o balde aceitar só a concha rosa.',
    },
    // O cartão do Quadro (01/11/2026): a linha "o que se faz" e a miniatura "Como fica" (o print
    // do gabarito, o mesmo de `docs/desafios-do-jogo/apresentacao/imagens`).
    {
      ...desafio(
        '00000000-0000-4000-8000-0000000000b2',
        2,
        'A primeira concha',
        'disponivel',
        'sua-ilha',
      ),
      resumo: 'Faça o guia pegar a concha ao encostar nela.',
      imagem:
        'data:image/webp;base64,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',
    },
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
  // `todos` (prints do manual do jogo): os seis quadros de todas as ilhas feitos, todas coloridas.
  if (o.quadrosFeitos === 'todos') {
    const ilhas: IlhaId[] = ['sua-ilha', 'vila-doce', 'recife', 'pico', 'vale-dos-dinos', 'nuvens']
    ilhas.forEach((ilha, i) => {
      for (let quadro = 1; quadro <= QUADROS_POR_ILHA; quadro++) {
        if (lista.some((d) => d.ilha === ilha && d.quadro === quadro)) continue
        const id = `00000000-0000-4000-8000-00000000${(0xd0 + i * 8 + quadro).toString(16).padStart(4, '0')}`
        lista.push(desafio(id, quadro, `Quadro ${quadro}`, 'concluido', ilha))
      }
    })
    for (const d of lista)
      if (d.tipo === 'quadro-das-cores' && d.ilha !== 'farol') {
        d.situacao = 'concluido'
        d.recompensaVista = true
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
