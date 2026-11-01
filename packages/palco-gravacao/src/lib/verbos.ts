/**
 * Os verbos da gravação das aulas do Sistema Zero: o texto entre colchetes do "Na tela" do
 * roteiro (`[ampliar jogo]`, `[achar arbusto]`) vira gestos simples que o robô do EdiAula faz
 * com a mão de uma pessoa (o contrato `window.__gravacao` versão 1, no README do EdiAula). Puro:
 * a aula entra como dado e nada aqui toca a página.
 */

export interface Alvo {
  seletor?: string
  papel?: string
  nome?: string
  rotulo?: string
  texto?: string
  /** Um bloco de programação pelo texto dele: na paleta, na área de trabalho ou na caixa de categorias. */
  bloco?: { texto: string; area: 'flyout' | 'workspace' | 'toolbox'; abaixo?: boolean }
  u?: number
  v?: number
}

export type Passo =
  | { fazer: 'apontar' | 'clicar' | 'clique duplo'; alvo: Alvo; espera?: 'acelerar' | 'cortar' }
  | { fazer: 'arrastar'; alvo: Alvo; para: Alvo }
  | {
      fazer: 'esperar'
      alvo: Alvo
      estado?: 'aparecer' | 'sumir' | 'ficar disponível'
      maximo?: number
    }
  | { fazer: 'rolar'; dy: number }

export interface Verbo {
  verbo: string
  exemplo: string
  descricao: string
}

/** Um alvo de um jogo pronto da aula, em pixels do palco do jogo. */
export interface AlvoDoJogo {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
}

export interface JogoDaAula {
  stage: { width: number; height: number }
  targets: AlvoDoJogo[]
}

export const VERBOS: Verbo[] = [
  { verbo: 'próxima parte', exemplo: 'próxima parte', descricao: 'Clica em Próxima parte.' },
  { verbo: 'concluir aula', exemplo: 'concluir aula', descricao: 'Clica em Concluir aula.' },
  {
    verbo: 'ampliar',
    exemplo: 'ampliar jogo',
    descricao: 'Amplia o jogo ou a experiência da parte (o botão "Ampliar …").',
  },
  { verbo: 'voltar à aula', exemplo: 'voltar à aula', descricao: 'Sai da ampliação.' },
  { verbo: 'expandir estúdio', exemplo: 'expandir estúdio', descricao: 'Estúdio em tela cheia.' },
  { verbo: 'reduzir estúdio', exemplo: 'reduzir estúdio', descricao: 'Estúdio de volta à aula.' },
  {
    verbo: 'achar',
    exemplo: 'achar arbusto',
    descricao: 'Toca no esconderijo do jogo pronto pelo id ou pelo nome do alvo.',
  },
  {
    verbo: 'apontar jogo',
    exemplo: 'apontar jogo 75 26',
    descricao: 'Aponta um ponto do jogo pronto, em pixels do palco (sem números: o meio).',
  },
  { verbo: 'jogar de novo', exemplo: 'jogar de novo', descricao: 'Recomeça o jogo pronto.' },
  {
    verbo: 'livro',
    exemplo: 'livro próxima',
    descricao: 'Vira o livro: próxima, anterior, tela cheia ou sair da tela cheia.',
  },
  { verbo: 'apontar baixar', exemplo: 'apontar baixar', descricao: 'Aponta o Baixar do material.' },
  { verbo: 'baixar', exemplo: 'baixar', descricao: 'Clica em Baixar no material.' },
  {
    verbo: 'tocar',
    exemplo: 'tocar "Ligar a reação"',
    descricao: 'Toca num controle da experiência pelo nome dele.',
  },
  {
    verbo: 'categoria',
    exemplo: 'categoria Jogo 2D > Sprites',
    descricao: 'Abre as categorias da paleta do Estúdio, uma depois da outra.',
  },
  {
    verbo: 'arrastar',
    exemplo: 'arrastar "mover" para "quando começar"',
    descricao: 'Leva um bloco da paleta para baixo de um bloco da área de trabalho.',
  },
  {
    verbo: 'verificar projeto',
    exemplo: 'verificar projeto',
    descricao: 'Clica em Verificar projeto e espera a resposta (acelerada sob a fala).',
  },
  {
    verbo: 'enviar projeto',
    exemplo: 'enviar projeto',
    descricao: 'Clica em Enviar: no palco só a tela responde, nada é enviado.',
  },
]

const fold = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const unquote = (s: string): string =>
  s
    .trim()
    .replace(/^["“]|["”]$/g, '')
    .trim()

const botao = (nome: string): Alvo => ({ texto: nome })

/** O alvo de um jogo pronto pelo id ("arbusto") ou pelo nome ("no arbusto", "arbusto"). */
function acharAlvo(jogos: readonly JogoDaAula[], nome: string) {
  const wanted = fold(nome)
  for (const jogo of jogos)
    for (const target of jogo.targets) {
      const label = fold(target.label)
      if (
        fold(target.id) === wanted ||
        label === wanted ||
        label.replace(/^(no|na|nos|nas|em) /, '') === wanted
      )
        return { jogo, target }
    }
  return null
}

/** Um ponto do palco do jogo, como o lugar dentro do quadro do jogo na página. */
const noJogo = (jogo: JogoDaAula, x: number, y: number): Alvo => ({
  seletor: '.sz-project-play-stage',
  u: Math.min(1, Math.max(0, x / jogo.stage.width)),
  v: Math.min(1, Math.max(0, y / jogo.stage.height)),
})

/**
 * Os gestos de uma ação. Lança o que a pessoa precisa saber quando o verbo não existe ou não
 * se aplica a esta aula (a mensagem aparece na etapa do Verificar plano do EdiAula).
 */
export function agir(acao: string, jogos: readonly JogoDaAula[]): Passo[] {
  const texto = acao.replace(/\s+/g, ' ').trim()
  const f = fold(texto)
  if (f === 'proxima parte') return [{ fazer: 'clicar', alvo: botao('Próxima parte') }]
  if (f === 'concluir aula') return [{ fazer: 'clicar', alvo: botao('Concluir aula') }]
  if (f === 'voltar a aula') return [{ fazer: 'clicar', alvo: botao('Voltar à aula') }]
  if (f === 'jogar de novo') return [{ fazer: 'clicar', alvo: botao('Jogar de novo') }]
  if (f === 'expandir estudio') return [{ fazer: 'clicar', alvo: botao('Expandir') }]
  if (f === 'reduzir estudio') return [{ fazer: 'clicar', alvo: botao('Reduzir') }]
  const ampliar = /^ampliar (.+)$/i.exec(texto)
  if (ampliar?.[1]) return [{ fazer: 'clicar', alvo: botao(`Ampliar ${ampliar[1]}`) }]

  const achar = /^achar (.+)$/i.exec(texto)
  if (achar?.[1]) {
    const found = acharAlvo(jogos, unquote(achar[1]))
    if (!found)
      throw new Error(
        `Não achei "${unquote(achar[1])}" nos jogos desta aula. Alvos: ${
          jogos.flatMap((j) => j.targets.map((t) => t.id)).join(', ') || 'nenhum'
        }.`,
      )
    const { jogo, target } = found
    return [
      {
        fazer: 'clicar',
        alvo: noJogo(jogo, target.x + target.width / 2, target.y + target.height / 2),
      },
    ]
  }
  const apontarJogo = /^apontar jogo(?: (-?\d+(?:[.,]\d+)?) (-?\d+(?:[.,]\d+)?))?$/i.exec(texto)
  if (apontarJogo) {
    const jogo = jogos[0]
    if (!jogo) throw new Error('Esta aula não tem jogo pronto.')
    const n = (v: string | undefined, d: number) => (v ? Number(v.replace(',', '.')) : d)
    return [
      {
        fazer: 'apontar',
        alvo: noJogo(
          jogo,
          n(apontarJogo[1], jogo.stage.width / 2),
          n(apontarJogo[2], jogo.stage.height / 2),
        ),
      },
    ]
  }

  const livro = /^livro (.+)$/i.exec(texto)
  if (livro?.[1]) {
    const nomes: Record<string, string> = {
      proxima: 'Próxima página',
      anterior: 'Página anterior',
      'tela cheia': 'Tela cheia',
      'sair da tela cheia': 'Sair da tela cheia',
    }
    const nome = nomes[fold(livro[1])]
    if (!nome) throw new Error('No livro: próxima, anterior, tela cheia ou sair da tela cheia.')
    return [{ fazer: 'clicar', alvo: { rotulo: nome } }]
  }
  if (f === 'apontar baixar')
    return [{ fazer: 'apontar', alvo: { seletor: '[aria-label^="Baixar"]' } }]
  if (f === 'baixar') return [{ fazer: 'clicar', alvo: { seletor: '[aria-label^="Baixar"]' } }]

  const tocar = /^tocar (.+)$/i.exec(texto)
  if (tocar?.[1]) return [{ fazer: 'clicar', alvo: { rotulo: unquote(tocar[1]) } }]

  const categoria = /^categoria (.+)$/i.exec(texto)
  if (categoria?.[1])
    return categoria[1]
      .split('>')
      .map((c) => unquote(c))
      .filter(Boolean)
      .map((c) => ({
        fazer: 'clicar' as const,
        alvo: { bloco: { texto: c, area: 'toolbox' as const } },
      }))

  const arrastar = /^arrastar ["“]([^"”]+)["”] para ["“]([^"”]+)["”]$/i.exec(texto)
  if (arrastar?.[1] && arrastar[2])
    return [
      {
        fazer: 'arrastar',
        alvo: { bloco: { texto: arrastar[1], area: 'flyout' } },
        para: { bloco: { texto: arrastar[2], area: 'workspace', abaixo: true } },
      },
    ]

  if (f === 'verificar projeto')
    return [
      { fazer: 'clicar', alvo: { seletor: '.sz-lesson-objectives-action' } },
      // A resposta do servidor: o robô espera o botão voltar e a frase aparecer (ocupado).
      {
        fazer: 'esperar',
        alvo: { seletor: '.sz-lesson-objectives-feedback' },
        estado: 'aparecer',
        maximo: 180,
      },
    ]
  if (f === 'enviar projeto') return [{ fazer: 'clicar', alvo: botao('Enviar meu projeto') }]

  throw new Error(`Não conheço "${texto}". Veja os verbos do palco no README do pacote.`)
}

/**
 * A página está trabalhando: carregando o Estúdio ou o livro, conferindo o projeto, preparando
 * o jogo pronto. O robô espera antes do gesto seguinte (e o EdiAula acelera a espera na fala).
 */
export function ocupado(doc: Pick<Document, 'querySelector' | 'body'>): boolean {
  const visible = (el: Element | null): boolean => !!el && (el as HTMLElement).offsetParent !== null
  if (visible(doc.querySelector('[aria-busy="true"]'))) return true
  if (visible(doc.querySelector('.sz-lesson-objectives-action:disabled'))) return true
  if (visible(doc.querySelector('.sz-project-play-actions button:disabled'))) return true
  const text = doc.body?.textContent ?? ''
  return /Preparando seu e-book|Carregando o livro 3D|Carregando o Estúdio/.test(text)
}
