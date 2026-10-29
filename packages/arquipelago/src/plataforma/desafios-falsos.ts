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

/**
 * Desafios de mentira para o playground: três quadros cadastrados no Bosque (um pronto para fazer,
 * um que pede um bloco de curso e um feito), o resto vazio, e o desafio do dia nos três estados
 * (`DiaDoPlayground`). Abrir um desafio "resolve" na hora.
 */
export type DiaDoPlayground = 'pronto' | 'feito' | 'nenhum'

const DO_DIA = '00000000-0000-4000-8000-0000000000d1'

const CURSO = {
  courseId: '00000000-0000-4000-8000-000000000001',
  titulo: 'Repetições',
  slug: 'repeticoes',
  posto: 'coder',
}

function desafio(
  id: string,
  quadro: number,
  titulo: string,
  situacao: DesafioNaLista['situacao'],
): DesafioNaLista {
  return {
    id,
    revisao: 1,
    ilha: 'bosque',
    tipo: 'quadro-das-cores',
    quadro,
    ordem: quadro,
    titulo,
    situacao,
    faltam:
      situacao === 'faltam-blocos'
        ? [{ bloco: 'sz_js_repeat', rotulo: 'Repetir vezes', cursos: [CURSO] }]
        : [],
    recompensa: { cor: true, moedas: 20, moedasExtra: 10 },
    recompensaVista: situacao === 'concluido',
  }
}

export function criarDesafiosFalsos(
  posicao: number,
  o: { dia?: DiaDoPlayground; agora?: () => Date; quadrosFeitos?: boolean } = {},
) {
  const dia = o.dia ?? 'pronto'
  // Com `quadrosFeitos`, os três do Bosque já vêm feitos (a ilha inteira colorida, para prints).
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
  ]
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
