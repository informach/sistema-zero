import {
  aprendaIssoEm,
  CARTAS_LUMI,
  type CartasDoJogador,
  type CurriculoDeBlocos,
  cartaConquistada,
  type PublicoJogo,
  type RespostaDoServico,
} from '@sistemazero/arquipelago-contracts'

/**
 * Os cartões dos Lumis de mentira para o playground, com a MESMA régua do serviço
 * (`cartaConquistada` e `aprendaIssoEm` do contrato): `algumas` tem Repetir e Se; `todas` é a
 * visão da equipe; `desligadas` responde 403 e `fora-do-ar` 424. O currículo é de mentira e
 * muda com o público, para conferir que o adulto vê os cursos adultos. Esperar não tem curso.
 */
export type CartasDoPlayground = 'algumas' | 'todas' | 'desligadas' | 'fora-do-ar'

const BLOCOS_DE_EXEMPLO = ['sz_js_repeat', 'sz_js_if_else']

function curso(n: number, titulo: string, posto: string, blocos: string[]) {
  return {
    courseId: `00000000-0000-4000-8000-0000000000c${n}`,
    titulo,
    slug: titulo.toLowerCase().replaceAll(' ', '-'),
    posto,
    papel: 'base2d',
    blocos,
  }
}

function curriculo(publico: PublicoJogo): CurriculoDeBlocos {
  const sufixo = publico === 'adulto' ? ' (adulto)' : ''
  return {
    versao: 1,
    cursos: [
      curso(1, `Repetições${sufixo}`, 'coder', ['sz_js_repeat', 'sz_js_for_each', 'sz_js_while']),
      curso(2, `Decisões${sufixo}`, 'hacker', ['sz_js_if_else', 'sz_js_switch']),
      curso(3, `Memória do jogo${sufixo}`, 'explorer', ['sz_js_var_create', 'sz_js_var_increment']),
    ],
    catalogo: [],
  }
}

export function respostaDasCartas(
  modo: CartasDoPlayground,
  publico: PublicoJogo,
): RespostaDoServico {
  if (modo === 'desligadas') return { status: 403, corpo: { error: { code: 'ACESSO_BLOQUEADO' } } }
  if (modo === 'fora-do-ar')
    return { status: 424, corpo: { error: { code: 'PLATAFORMA_INDISPONIVEL' } } }
  const blocos = modo === 'todas' ? 'todos' : new Set(BLOCOS_DE_EXEMPLO)
  const doPublico = curriculo(publico)
  const corpo: CartasDoJogador = {
    cartas: CARTAS_LUMI.map((carta) => {
      const conquistada = cartaConquistada(carta, blocos)
      return {
        id: carta.id,
        nome: carta.nome,
        tipo: carta.tipo,
        efeito: carta.efeito,
        conquistada,
        aprendaEm: conquistada || !carta.bloco ? [] : aprendaIssoEm(carta.bloco, doPublico),
      }
    }),
  }
  return { status: 200, corpo }
}
