import type { PaginaDoPalco } from './pagina'

/**
 * Os verbos da gravação das aulas do Sistema Zero: o texto entre colchetes do "Na tela" do
 * roteiro (`[ampliar jogo]`, `[achar arbusto]`) vira gestos simples que o robô do EdiAula faz
 * com a mão de uma pessoa (o contrato `window.__gravacao` versão 1, no README do EdiAula). Puro:
 * a aula entra como dado e nada aqui toca a página.
 */

export interface Alvo {
  seletor?: string
  /** Só dentro do elemento que este seletor nomeia (um menu aberto, uma janela). */
  dentro?: string
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
  | {
      fazer: 'apontar' | 'clicar' | 'clique duplo'
      alvo: Alvo
      espera?: 'acelerar' | 'cortar'
      /** apontar: o ponto é onde a mão descansa (ao lado do bloco, não em cima). */
      exato?: boolean
    }
  | { fazer: 'arrastar'; alvo: Alvo; para: Alvo }
  | {
      fazer: 'esperar'
      alvo: Alvo
      estado?: 'aparecer' | 'sumir' | 'ficar disponível'
      maximo?: number
    }
  | { fazer: 'rolar'; dy: number }
  | { fazer: 'digitar'; alvo: Alvo; texto: string; substituir?: boolean }
  | { fazer: 'tecla'; tecla: string }
  /** Segura o botão do mouse no alvo (uma seta da tela do jogo), ou uma tecla, por `segundos`. */
  | { fazer: 'segurar'; alvo?: Alvo; tecla?: string; segundos?: number }
  /** O robô pergunta `acao` de novo depois dos gestos anteriores (a página decide no que abriu). */
  | { fazer: 'continuar'; acao: string }

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
    descricao:
      'Abre as categorias da paleta do Estúdio, uma depois da outra; clicar de novo numa aberta a recolhe.',
  },
  {
    verbo: 'encaixar abaixo',
    exemplo: 'encaixar "Somar 1" abaixo de "Deixar o sprite"',
    descricao: 'Leva um bloco da paleta para logo abaixo de um bloco da área de trabalho.',
  },
  {
    verbo: 'verificar projeto',
    exemplo: 'verificar projeto',
    descricao: 'Clica em Verificar projeto e espera a resposta (acelerada sob a fala).',
  },
  {
    verbo: 'enviar projeto',
    exemplo: 'enviar projeto',
    descricao:
      'Clica em Enviar meu projeto (ou Enviar de novo) e confirma: no palco nada é enviado.',
  },
  { verbo: 'apontar livro', exemplo: 'apontar livro', descricao: 'Aponta o livro 3D do caderno.' },
  {
    verbo: 'apontar encaixe',
    exemplo: 'apontar encaixe em "Quando clicar ou tocar"',
    descricao: 'Aponta o espaço ao lado de "fazer" de um bloco.',
  },
  {
    verbo: 'apontar abaixo de',
    exemplo: 'apontar abaixo de "Deixar o sprite"',
    descricao: 'Aponta o lugar logo abaixo de um bloco, onde o próximo bloco vai entrar.',
  },
  {
    verbo: 'apontar zappy',
    exemplo: 'apontar zappy',
    descricao: 'Aponta o Zappy ao lado da fala dele na experiência.',
  },
  {
    verbo: 'abrir categoria',
    exemplo: 'abrir categoria Jogo 2D > Movimento > Movimentos prontos',
    descricao:
      'Abre as categorias da paleta, uma depois da outra, sem fechar nenhuma: a que já está aberta só é apontada. Para abrir de novo uma categoria que ficou aberta de um encaixe anterior.',
  },
  {
    verbo: 'segurar seta',
    exemplo: 'segurar seta da direita por 1 s',
    descricao:
      'Segura uma seta da tela (direita, esquerda, cima ou baixo) do jogo pronto pelo tempo dito; com "na prévia", a da pré-visualização do Estúdio. Sem tempo, 1 segundo.',
  },
  {
    verbo: 'apontar setas',
    exemplo: 'apontar setas',
    descricao:
      'Aponta as quatro setas da tela do jogo pronto; com "na prévia", as da pré-visualização.',
  },
  {
    verbo: 'apontar selo',
    exemplo: 'apontar selo',
    descricao: 'Aponta o selo "Seta apertada?" da experiência do andar.',
  },
  {
    verbo: 'apontar faixa fora da tela',
    exemplo: 'apontar faixa fora da tela',
    descricao: 'Aponta a faixa "fora da tela" da experiência do limite, à direita da borda.',
  },
  {
    verbo: 'apontar paleta',
    exemplo: 'apontar paleta',
    descricao: 'Aponta a paleta de comandos do Estúdio.',
  },
  {
    verbo: 'apontar bloco',
    exemplo: 'apontar bloco "Quando clicar ou tocar"',
    descricao: 'Aponta um bloco da área de trabalho pelo texto dele.',
  },
  {
    verbo: 'tocar prévia',
    exemplo: 'tocar prévia arbusto',
    descricao:
      'Toca no jogo da pré-visualização do Estúdio: num alvo do jogo pronto da aula ou num ponto (tocar prévia 137 209), em pixels do jogo.',
  },
  {
    verbo: 'apontar prévia',
    exemplo: 'apontar prévia 75 26',
    descricao: 'Aponta um ponto do jogo na pré-visualização, como o placar.',
  },
  {
    verbo: 'arrastar até',
    exemplo: 'arrastar até "Quando acontecer"',
    descricao:
      'Arrasta um espaço vazio da área de trabalho até o bloco aparecer (nada, se ele já está à vista).',
  },
  {
    verbo: 'encaixar',
    exemplo: 'encaixar "Deixar o sprite" em "Quando clicar ou tocar"',
    descricao:
      'Leva um bloco da paleta para o espaço ao lado de "fazer" de outro bloco, o único lugar onde ele encaixa.',
  },
  {
    verbo: 'encaixar dentro',
    exemplo: 'encaixar "Quando o sprite" dentro de "Quando acontecer"',
    descricao:
      'Leva um bloco da paleta para o espaço vazio de dentro de uma área ou de um bloco sem rótulo nesse espaço (a área Quando acontecer recém-criada).',
  },
  {
    verbo: 'apontar lugar sem blocos',
    exemplo: 'apontar lugar sem blocos abaixo de "Ao iniciar"',
    descricao:
      'Aponta um lugar sem blocos: com "abaixo de", logo abaixo dessa pilha, alinhado com ela e com um espaço; sem, ao lado das pilhas e fora de onde a paleta abre.',
  },
  {
    verbo: 'soltar no lugar sem blocos',
    exemplo: 'soltar "Quando acontecer" no lugar sem blocos abaixo de "Ao iniciar"',
    descricao:
      'Leva um bloco da paleta (uma área nova) para o lugar sem blocos, o mesmo que o apontar mostra.',
  },
  {
    verbo: 'soltar em cima',
    exemplo: 'soltar "verdadeiro" em cima do "0" em "Criar variável temChave"',
    descricao:
      'Leva um bloco de valor da paleta para o lugar de um valor de bloco (o 0, o 1), que ele substitui.',
  },
  {
    verbo: 'trocar',
    exemplo: 'trocar "jogador" por "escolhido"',
    descricao:
      'Troca um campo de bloco: escolhe no menu ou no seletor que ele abre, ou reescreve um número ou texto (em "<bloco>" para dizer qual).',
  },
  {
    verbo: 'organizar blocos',
    exemplo: 'organizar blocos',
    descricao:
      'Arruma blocos um por cima do outro, como o botão direito e Organizar blocos (a página faz sozinha, sem a mão).',
  },
  {
    verbo: 'abrir campo',
    exemplo: 'abrir campo "jogador" em "Deixar o sprite"',
    descricao:
      'Só clica num campo de bloco, para a lista ou a caixa abrir na fala do clique; o escolher vem na fala seguinte.',
  },
  {
    verbo: 'escolher',
    exemplo: 'escolher "escolhido" em "Deixar o sprite"',
    descricao:
      'Depois de clicar num campo: escolhe na lista que abriu, ou digita na caixa (o trocar pede sozinho); com "em", a mão sai de cima do bloco depois.',
  },
  {
    verbo: 'mostrar blocos',
    exemplo: 'mostrar blocos "Quando o sprite", "Destruir o sprite"',
    descricao:
      'Arrasta a área de código até todos estes blocos ficarem bem à vista juntos, perto do meio: para conferir os blocos que a fala nomeia.',
  },
  {
    verbo: 'clicar fora dos blocos',
    exemplo: 'clicar fora dos blocos',
    descricao:
      'Clica num lugar da área de código sem blocos (o trocar e o escolher já fazem isso sozinhos, para a mudança do campo valer).',
  },
  {
    verbo: 'compartilhar',
    exemplo: 'compartilhar',
    descricao: 'Abre o Compartilhar do Estúdio: no palco nada vai para o Mural.',
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

/** Clica em Expandir ou Reduzir e espera o Estúdio chegar ao outro estado. */
const trocarEstudio = (de: string, para: string): Passo[] => [
  { fazer: 'clicar', alvo: botao(de) },
  { fazer: 'esperar', alvo: botao(para), estado: 'aparecer', maximo: 10 },
]

/** Depois de agir num bloco, a mão vai para o fundo da área ao lado dele (o ponto é visto na hora). */
const afastar = (bloco: string, clicando = false): Passo => ({
  fazer: 'continuar',
  acao: `afastar de "${bloco}"${clicando ? ' clicando' : ''}`,
})

/**
 * Depois de mudar um campo, a mão clica na área de código, fora do bloco, para a mudança valer
 * (pedido da Helena, 04/11/2026): ao lado do bloco do campo, ou num fundo livre qualquer.
 */
const clicarFora = (bloco: string | undefined): Passo =>
  bloco ? afastar(bloco, true) : { fazer: 'continuar', acao: 'clicar fora dos blocos' }

/** Escolhe `valor` na lista que um campo abriu (um menu do Blockly ou um seletor do Estúdio). */
const naLista = (valor: string): Passo[] => [
  { fazer: 'clicar', alvo: { texto: valor, dentro: '.blocklyDropDownDiv' } },
  // O bloco só mostra o valor novo quando a lista fecha: o gesto seguinte, que acha o bloco pelo
  // texto dele ("Alterar variável temChave"), espera por isso.
  { fazer: 'esperar', alvo: { seletor: '.blocklyDropDownDiv' }, estado: 'sumir', maximo: 5 },
]

/** Reescreve o campo na caixa de digitar que ele abriu, e confirma. */
const naCaixa = (valor: string): Passo[] => [
  { fazer: 'digitar', alvo: { seletor: 'input.blocklyHtmlInput' }, texto: valor, substituir: true },
  { fazer: 'tecla', tecla: 'Enter' },
]

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

/**
 * As setas da tela do jogo (`enableClassicControls`, `studio/.../game-2d/runtime/classicPlatformer.ts`):
 * botões de 44 px com 6 px entre eles, a 8 px do canto de baixo à esquerda do iframe do jogo, do
 * mesmo tamanho em qualquer tamanho de jogo. O centro de cada uma, em px da esquerda e de baixo.
 */
const SETAS: Record<string, [number, number]> = {
  esquerda: [30, 30],
  baixo: [80, 30],
  direita: [130, 30],
  cima: [80, 80],
}
const MEIO_DAS_SETAS: [number, number] = [80, 55]
const SEGURAR_SETA =
  /^segurar seta (?:d[aeo] |para (?:a |o )?)?(direita|esquerda|cima|baixo)( na pr[eé]via)?(?: por (\d+(?:[.,]\d+)?) ?(?:s|seg|segundos?))?$/i
const APONTAR_SETAS = /^apontar (?:as )?setas( na pr[eé]via)?$/i

/** Um ponto das setas da tela no jogo pronto ou na prévia; nulo enquanto ele não está na tela. */
function nasSetas(
  pagina: PaginaDoPalco,
  previa: boolean,
  [x, deBaixo]: [number, number],
): Alvo | null {
  const quadro = previa ? pagina.previa() : pagina.jogo()
  if (!quadro) return null
  return {
    seletor: previa ? 'iframe[title="Pré-visualização"]' : '.sz-project-play-stage',
    u: Math.min(1, Math.max(0, x / quadro.width)),
    v: Math.min(1, Math.max(0, (quadro.height - deBaixo) / quadro.height)),
  }
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
/** Um ponto do jogo (em pixels do palco dele) na pré-visualização do Estúdio. */
function naPrevia(
  pagina: PaginaDoPalco | undefined,
  jogos: readonly JogoDaAula[],
  resto: string,
): Alvo {
  const previa = pagina?.previa()
  if (!previa)
    throw new Error('A pré-visualização do Estúdio não está na tela. Expanda o Estúdio antes.')
  // O jogo da prévia é o do projeto aberto; sem o bloco que prepara a tela, o jogo pronto da aula.
  const stage = pagina?.palcoDoJogo() ?? jogos[0]?.stage ?? { width: 640, height: 360 }
  const numeros = /^(-?\d+(?:[.,]\d+)?) (-?\d+(?:[.,]\d+)?)$/.exec(resto)
  let x: number
  let y: number
  if (numeros?.[1] && numeros[2]) {
    x = Number(numeros[1].replace(',', '.'))
    y = Number(numeros[2].replace(',', '.'))
  } else if (!resto) {
    x = stage.width / 2
    y = stage.height / 2
  } else {
    const found = acharAlvo(jogos, unquote(resto))
    if (!found)
      throw new Error(
        `Não achei "${unquote(resto)}" nos jogos desta aula. Use o ponto do jogo: tocar prévia 137 209.`,
      )
    x = found.target.x + found.target.width / 2
    y = found.target.y + found.target.height / 2
  }
  // O jogo cabe inteiro na pré-visualização, centrado, sem esticar.
  const scale = Math.min(previa.width / stage.width, previa.height / stage.height)
  const left = (previa.width - stage.width * scale) / 2
  const top = (previa.height - stage.height * scale) / 2
  return {
    seletor: 'iframe[title="Pré-visualização"]',
    u: Math.min(1, Math.max(0, (left + x * scale) / previa.width)),
    v: Math.min(1, Math.max(0, (top + y * scale) / previa.height)),
  }
}

const precisaDaPagina = (pagina: PaginaDoPalco | undefined): PaginaDoPalco => {
  if (!pagina) throw new Error('Este gesto precisa da página do palco aberta.')
  return pagina
}

export function agir(acao: string, jogos: readonly JogoDaAula[], pagina?: PaginaDoPalco): Passo[] {
  const texto = acao.replace(/\s+/g, ' ').trim()
  const f = fold(texto)
  if (f === 'proxima parte') return [{ fazer: 'clicar', alvo: botao('Próxima parte') }]
  if (f === 'concluir aula') return [{ fazer: 'clicar', alvo: botao('Concluir aula') }]
  if (f === 'voltar a aula') return [{ fazer: 'clicar', alvo: botao('Voltar à aula') }]
  if (f === 'jogar de novo') return [{ fazer: 'clicar', alvo: botao('Jogar de novo') }]
  // O Estúdio troca de lugar e de tamanho logo depois do clique: o gesto só termina com o botão
  // do outro estado na tela, e o seguinte mede a prévia e as setas já no lugar novo.
  if (f === 'expandir estudio') return trocarEstudio('Expandir', 'Reduzir')
  if (f === 'reduzir estudio') return trocarEstudio('Reduzir', 'Expandir')
  const ampliar = /^ampliar (.+)$/i.exec(texto)
  if (ampliar?.[1]) return [{ fazer: 'clicar', alvo: botao(`Ampliar ${ampliar[1]}`) }]

  // Logo depois de expandir, o Estúdio ainda monta a área de trabalho: o gesto de bloco espera os
  // blocos aparecerem e pergunta de novo.
  if (
    pagina &&
    /^(arrastar at[eé] |mostrar blocos |apontar (bloco|encaixe|abaixo de) |apontar lugar sem blocos|encaixar |soltar |abrir campo |trocar |organizar blocos$)/i.test(
      texto,
    ) &&
    !pagina.areaPronta()
  )
    return [
      {
        fazer: 'esperar',
        alvo: { seletor: 'svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable' },
        estado: 'aparecer',
        maximo: 30,
      },
      { fazer: 'continuar', acao: texto },
    ]

  // Organizado pela própria página (`agirNaPagina`): a mão não faz nada.
  if (f === 'organizar blocos')
    return [
      { fazer: 'esperar', alvo: { seletor: 'svg.blocklySvg' }, estado: 'aparecer', maximo: 5 },
    ]

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

  // "tocar prévia …" é o jogo do Estúdio, mais abaixo.
  const tocar = /^tocar (?!pr[eé]via\b)(.+)$/i.exec(texto)
  if (tocar?.[1]) return [{ fazer: 'clicar', alvo: { rotulo: unquote(tocar[1]) } }]

  // Abrir sem fechar: "categoria" clica sempre, e clicar numa categoria aberta a recolhe.
  const abrirCategoria = /^abrir categoria (.+)$/i.exec(texto)
  if (abrirCategoria?.[1]) {
    const [primeira, ...resto] = abrirCategoria[1]
      .split('>')
      .map((c) => unquote(c))
      .filter(Boolean)
    if (!primeira) throw new Error('Diga qual categoria abrir.')
    const alvo: Alvo = { bloco: { texto: primeira, area: 'toolbox' } }
    // Cada categoria é vista depois que a de antes abriu: a de dentro só aparece então.
    const depois = resto.length
      ? [{ fazer: 'continuar' as const, acao: `abrir categoria ${resto.join(' > ')}` }]
      : []
    if (pagina?.categoria(primeira) === 'aberta')
      return [{ fazer: 'apontar', alvo, exato: true }, ...depois]
    return [{ fazer: 'clicar', alvo }, ...depois]
  }

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

  // "arrastar "A" para "B"" é o verbo do EdiAula para qualquer página: com blocos, "encaixar".
  const arrastar = /^encaixar ["“]([^"”]+)["”] abaixo de ["“]([^"”]+)["”]$/i.exec(texto)
  if (arrastar?.[1] && arrastar[2]) {
    // Com a página, os blocos são achados pelo começo do texto; sem ela, pelo texto inteiro.
    if (pagina) {
      const origem = pagina.bloco(arrastar[1], 'paleta')
      const destino = pagina.abaixo(arrastar[2])
      if (!origem)
        throw new Error(`Não achei o bloco "${arrastar[1]}" na paleta. Abra a categoria antes.`)
      if (!destino) throw new Error(`Não achei o bloco "${arrastar[2]}" na área de trabalho.`)
      return [{ fazer: 'arrastar', alvo: origem, para: destino }, afastar(arrastar[1])]
    }
    return [
      {
        fazer: 'arrastar',
        alvo: { bloco: { texto: arrastar[1], area: 'flyout' } },
        para: { bloco: { texto: arrastar[2], area: 'workspace', abaixo: true } },
      },
    ]
  }

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
  if (f === 'enviar projeto') {
    // Depois do primeiro envio o botão vira "Enviar de novo", e a confirmação, "Reenviar".
    const denovo = pagina?.temBotao('Enviar de novo') === true
    return [
      { fazer: 'clicar', alvo: botao(denovo ? 'Enviar de novo' : 'Enviar meu projeto') },
      {
        fazer: 'clicar',
        alvo: { papel: 'button', nome: denovo ? 'Reenviar' : 'Enviar', dentro: '[role="dialog"]' },
      },
    ]
  }
  if (f === 'apontar livro')
    return [{ fazer: 'apontar', alvo: { seletor: '[class*="group/ebook"]' } }]
  if (f === 'apontar paleta') return [{ fazer: 'apontar', alvo: { seletor: '.blocklyToolbox' } }]
  if (f === 'compartilhar') return [{ fazer: 'clicar', alvo: { rotulo: 'Compartilhar' } }]
  const apontarBloco = /^apontar bloco ["“]([^"”]+)["”]$/i.exec(texto)
  if (apontarBloco?.[1]) {
    // Ao lado do bloco, no fundo da área: em cima dele, a mão parada faz aparecer a dica.
    const perto = precisaDaPagina(pagina).perto(apontarBloco[1])
    if (perto) return [{ fazer: 'apontar', alvo: perto, exato: true }]
    const alvo = precisaDaPagina(pagina).bloco(apontarBloco[1], 'area')
    if (!alvo) throw new Error(`Não achei o bloco "${apontarBloco[1]}" na área de trabalho.`)
    return [{ fazer: 'apontar', alvo }]
  }
  const apontarEncaixe = /^apontar encaixe em ["“]([^"”]+)["”](?: no ["“]([^"”]+)["”])?$/i.exec(
    texto,
  )
  if (apontarEncaixe?.[1]) {
    const rotulo = apontarEncaixe[2] ?? 'fazer'
    const alvo = precisaDaPagina(pagina).encaixe(apontarEncaixe[1], rotulo)
    if (!alvo) throw new Error(`Não achei o espaço de "${rotulo}" no bloco "${apontarEncaixe[1]}".`)
    // O espaço vazio é fundo da área: a mão fica nele, sem descer para o bloco.
    return [{ fazer: 'apontar', alvo, exato: true }]
  }
  const apontarAbaixo = /^apontar abaixo de ["“]([^"”]+)["”]$/i.exec(texto)
  if (apontarAbaixo?.[1]) {
    const alvo = precisaDaPagina(pagina).abaixo(apontarAbaixo[1])
    if (!alvo) throw new Error(`Não achei o bloco "${apontarAbaixo[1]}" na área de trabalho.`)
    return [{ fazer: 'apontar', alvo, exato: true }]
  }
  if (f === 'apontar zappy')
    return [{ fazer: 'apontar', alvo: { seletor: '.sz-scene-console-fala > div > :first-child' } }]
  if (f === 'apontar selo') return [{ fazer: 'apontar', alvo: { seletor: '.slow-seta' } }]
  // A faixa vai de cima a baixo do palco: a mão descansa dentro dela, não embaixo.
  if (f === 'apontar faixa fora da tela')
    return [
      { fazer: 'apontar', alvo: { seletor: '[data-fora-da-tela]', u: 0.5, v: 0.62 }, exato: true },
    ]

  const segurarSeta = SEGURAR_SETA.exec(texto)
  const apontarSetas = APONTAR_SETAS.exec(texto)
  if (segurarSeta || apontarSetas) {
    const naPrevia = !!(segurarSeta ? segurarSeta[2] : apontarSetas?.[1])
    const ponto = segurarSeta ? SETAS[fold(segurarSeta[1] ?? '')] : MEIO_DAS_SETAS
    if (!ponto) throw new Error('Segure a seta da direita, da esquerda, de cima ou de baixo.')
    const alvo = nasSetas(precisaDaPagina(pagina), naPrevia, ponto)
    // O jogo ainda abrindo (ou a prévia, logo depois de expandir): espera e pergunta de novo.
    if (!alvo)
      return [
        {
          fazer: 'esperar',
          alvo: {
            seletor: naPrevia ? 'iframe[title="Pré-visualização"]' : '.sz-project-play-stage',
          },
          estado: 'aparecer',
          maximo: 30,
        },
        { fazer: 'continuar', acao: texto },
      ]
    if (apontarSetas) return [{ fazer: 'apontar', alvo, exato: true }]
    const segundos = segurarSeta?.[3] ? Number(segurarSeta[3].replace(',', '.')) : 1
    return [{ fazer: 'segurar', alvo, segundos }]
  }
  const previa = /^(tocar|apontar) pr[eé]via ?(.*)$/i.exec(texto)
  if (previa?.[1]) {
    // Logo depois de expandir, o Estúdio ainda monta a pré-visualização: o robô espera ela
    // aparecer e pergunta de novo.
    if (pagina && !pagina.previa())
      return [
        {
          fazer: 'esperar',
          alvo: { seletor: 'iframe[title="Pré-visualização"]' },
          estado: 'aparecer',
          maximo: 30,
        },
        { fazer: 'continuar', acao: texto },
      ]
    const alvo = naPrevia(pagina, jogos, (previa[2] ?? '').trim())
    return [{ fazer: fold(previa[1]) === 'tocar' ? 'clicar' : 'apontar', alvo }]
  }
  // "rolar até" é o do EdiAula (rola a página): a área do Estúdio se arrasta.
  const rolar = /^arrastar at[eé] ["“]([^"”]+)["”]$/i.exec(texto)
  if (rolar?.[1]) {
    const rolagem = precisaDaPagina(pagina).rolagem(rolar[1])
    if (!rolagem) throw new Error(`Não achei o bloco "${rolar[1]}" na área de trabalho.`)
    // Já à vista: a mão só aponta para ele.
    if (rolagem === 'visivel') return agir(`apontar bloco "${rolar[1]}"`, jogos, pagina)
    return [{ fazer: 'arrastar', alvo: rolagem.de, para: rolagem.para }]
  }
  const encaixarDentro = /^encaixar ["“]([^"”]+)["”] dentro de ["“]([^"”]+)["”]$/i.exec(texto)
  if (encaixarDentro?.[1] && encaixarDentro[2]) {
    const origem = precisaDaPagina(pagina).bloco(encaixarDentro[1], 'paleta')
    if (!origem)
      throw new Error(`Não achei o bloco "${encaixarDentro[1]}" na paleta. Abra a categoria antes.`)
    const destino = precisaDaPagina(pagina).dentro(encaixarDentro[2], encaixarDentro[1])
    if (!destino)
      throw new Error(`Não achei o espaço vazio de dentro de "${encaixarDentro[2]}" à vista.`)
    return [{ fazer: 'arrastar', alvo: origem, para: destino }, afastar(encaixarDentro[1])]
  }
  // "abaixo de" põe o lugar logo abaixo de uma pilha, alinhado com ela (a área nova embaixo de Ao
  // iniciar); sem ele, o lugar livre mais perto das pilhas.
  const apontarLivre = /^apontar lugar sem blocos(?: abaixo de ["“]([^"”]+)["”])?$/i.exec(texto)
  if (apontarLivre) {
    const pilha = apontarLivre[1]
    const lugar = precisaDaPagina(pagina).lugarLivre(undefined, pilha)
    if (!lugar)
      throw new Error(
        pilha
          ? `Não há lugar livre logo abaixo de "${pilha}" à vista. Antes, arraste a área [arrastar até "${pilha}"].`
          : 'Não há lugar sem blocos à vista. Antes, arraste um espaço vazio [arrastar até "<bloco>"].',
      )
    return [{ fazer: 'apontar', alvo: lugar, exato: true }]
  }
  const soltarLivre =
    /^soltar ["“]([^"”]+)["”] no lugar sem blocos(?: abaixo de ["“]([^"”]+)["”])?$/i.exec(texto)
  if (soltarLivre?.[1]) {
    const origem = precisaDaPagina(pagina).bloco(soltarLivre[1], 'paleta')
    if (!origem)
      throw new Error(`Não achei o bloco "${soltarLivre[1]}" na paleta. Abra a categoria antes.`)
    const destino = precisaDaPagina(pagina).lugarLivre(soltarLivre[1], soltarLivre[2])
    if (!destino) throw new Error('Não há lugar sem blocos à vista para soltar o bloco.')
    return [{ fazer: 'arrastar', alvo: origem, para: destino }, afastar(soltarLivre[1])]
  }
  const soltarSobre =
    /^soltar ["“]([^"”]+)["”] em cima d[oae] ["“]([^"”]+)["”] em ["“]([^"”]+)["”]$/i.exec(texto)
  if (soltarSobre?.[1] && soltarSobre[2] && soltarSobre[3]) {
    const [, valorNovo, valor, bloco] = soltarSobre
    // Sem trazer o valor para a vista: arrastar o fundo fecharia a paleta aberta, e o bloco
    // novo sairia dela. O roteiro traz o bloco antes de abrir a paleta (Encontre o fim da área).
    const origem = precisaDaPagina(pagina).bloco(valorNovo, 'paleta')
    if (!origem)
      throw new Error(`Não achei o bloco "${valorNovo}" na paleta. Abra a categoria antes.`)
    const destino = precisaDaPagina(pagina).sobre(valor, bloco, valorNovo)
    if (!destino) throw new Error(`Não achei o valor "${valor}" no bloco "${bloco}".`)
    return [{ fazer: 'arrastar', alvo: origem, para: destino }, afastar(bloco)]
  }
  const encaixar = /^encaixar ["“]([^"”]+)["”] em ["“]([^"”]+)["”](?: no ["“]([^"”]+)["”])?$/i.exec(
    texto,
  )
  if (encaixar?.[1] && encaixar[2]) {
    const rotulo = encaixar[3] ?? 'fazer'
    const destino = precisaDaPagina(pagina).encaixe(encaixar[2], rotulo)
    if (!destino) throw new Error(`Não achei o espaço de "${rotulo}" no bloco "${encaixar[2]}".`)
    const origem = precisaDaPagina(pagina).bloco(encaixar[1], 'paleta')
    if (!origem)
      throw new Error(`Não achei o bloco "${encaixar[1]}" na paleta. Abra a categoria antes.`)
    return [{ fazer: 'arrastar', alvo: origem, para: destino }, afastar(encaixar[1])]
  }
  const trocar = /^trocar ["“]([^"”]+)["”] por ["“]([^"”]*)["”](?: em ["“]([^"”]+)["”])?$/i.exec(
    texto,
  )
  if (trocar?.[1] && trocar[2] !== undefined) {
    const antes = trazerCampo(texto, trocar[1], trocar[3], pagina)
    if (antes) return antes
    const campo = precisaDaPagina(pagina).campo(trocar[1], trocar[3])
    if (!campo) throw new Error(`Não achei o campo "${trocar[1]}" num bloco da área de trabalho.`)
    // Depois de trocar, a mão sai de cima do bloco (parada em cima, aparece a dica dele).
    // Blocos de valor podem ter só o campo editável, sem nome fixo para reencontrar depois.
    // Nesse caso a edição termina sem agendar um gesto que não tem alvo.
    const depois = [clicarFora(campo.bloco || undefined)]
    if (campo.tipo === 'menu')
      return [{ fazer: 'clicar', alvo: campo.alvo }, ...naLista(trocar[2]), ...depois]
    if (campo.tipo === 'numero')
      return [{ fazer: 'clicar', alvo: campo.alvo }, ...naCaixa(trocar[2]), ...depois]
    // Um texto ou um seletor do Estúdio: o que abrir com o clique diz como escolher.
    return [
      { fazer: 'clicar', alvo: campo.alvo },
      // O escolher clica fora do bloco no fim (uma vez só).
      {
        fazer: 'continuar',
        acao: `escolher "${trocar[2]}"${campo.bloco ? ` em "${campo.bloco}"` : ''}`,
      },
    ]
  }

  const abrirCampo = /^abrir campo ["“]([^"”]+)["”](?: em ["“]([^"”]+)["”])?$/i.exec(texto)
  if (abrirCampo?.[1]) {
    const antes = trazerCampo(texto, abrirCampo[1], abrirCampo[2], pagina)
    if (antes) return antes
    const campo = precisaDaPagina(pagina).campo(abrirCampo[1], abrirCampo[2])
    if (!campo)
      throw new Error(`Não achei o campo "${abrirCampo[1]}" num bloco da área de trabalho.`)
    // A lista (ou a caixa) que abre cobre o bloco: a mão fica no campo até o escolher.
    return [{ fazer: 'clicar', alvo: campo.alvo }]
  }

  // Conferir: todos os blocos que a fala nomeia ficam bem à vista juntos (pedido da Helena,
  // 04/11/2026); já à vista, a mão só aponta o primeiro.
  const mostrar = /^mostrar blocos (.+)$/i.exec(texto)
  if (mostrar?.[1]) {
    const blocos = [...mostrar[1].matchAll(/["“]([^"”]+)["”]/g)]
      .map((m) => m[1] ?? '')
      .filter(Boolean)
    if (!blocos.length) throw new Error('Diga quais blocos mostrar: mostrar blocos "A", "B".')
    const rolagem = precisaDaPagina(pagina).rolagemDeVarios(blocos)
    if (!rolagem)
      throw new Error(`Não achei todos estes blocos na área de trabalho: ${blocos.join(', ')}.`)
    if (rolagem === 'visivel') return agir(`apontar bloco "${blocos[0]}"`, jogos, pagina)
    return [{ fazer: 'arrastar', alvo: rolagem.de, para: rolagem.para }]
  }
  if (f === 'clicar fora dos blocos') {
    const fundo = precisaDaPagina(pagina).fundoLivre()
    if (!fundo) throw new Error('Não achei um lugar da área de código sem blocos para clicar.')
    return [{ fazer: 'clicar', alvo: fundo }]
  }
  const afastarDe = /^afastar de ["“]([^"”]+)["”]( clicando)?( depois de desembolar)?$/i.exec(texto)
  if (afastarDe?.[1]) {
    const clicando = !!afastarDe[2]
    // Bloco nunca em cima de bloco: se a pilha cresceu por cima da de baixo, a mão desce a de
    // baixo antes de se afastar (pedido da Helena, 04/11/2026). Uma vez só por gesto.
    const desembolo = afastarDe[3] ? null : precisaDaPagina(pagina).desembolar()
    if (desembolo)
      return [
        { fazer: 'arrastar', alvo: desembolo.de, para: desembolo.para },
        {
          fazer: 'continuar',
          acao: `afastar de "${afastarDe[1]}"${clicando ? ' clicando' : ''} depois de desembolar`,
        },
      ]
    const perto = precisaDaPagina(pagina).perto(afastarDe[1])
    // Depois de mudar um campo, a mão clica fora do bloco: a mudança vale e o bloco sai da
    // seleção. Sem fundo livre ao lado, num fundo livre qualquer.
    if (clicando) {
      const fundo = perto ?? precisaDaPagina(pagina).fundoLivre()
      if (fundo) return [{ fazer: 'clicar', alvo: fundo }]
    }
    // Sem fundo livre ao lado, a mão fica onde está.
    if (!perto) return [{ fazer: 'esperar', alvo: { seletor: 'svg.blocklySvg' } }]
    return [{ fazer: 'apontar', alvo: perto, exato: true }]
  }

  const escolher = /^escolher ["“]([^"”]*)["”](?: em ["“]([^"”]+)["”])?$/i.exec(texto)
  if (escolher?.[1] !== undefined) {
    const aberto = precisaDaPagina(pagina).aberto()
    // Escolhido, a mão sai de cima do bloco do campo, quando o roteiro diz qual é.
    const depois = [clicarFora(escolher[2])]
    if (aberto === 'lista') return [...naLista(escolher[1]), ...depois]
    if (aberto === 'caixa') return [...naCaixa(escolher[1]), ...depois]
    throw new Error('O campo clicado não abriu uma lista nem uma caixa de texto.')
  }

  throw new Error(`Não conheço "${texto}". Veja os verbos do palco no README do pacote.`)
}

/**
 * Um campo fora da vista ou coberto (pela paleta aberta, por um painel) vem para o centro da área
 * de trabalho, num arrasto do fundo, antes do clique; depois a página é perguntada de novo.
 */
function trazerCampo(
  texto: string,
  valor: string,
  bloco: string | undefined,
  pagina: PaginaDoPalco | undefined,
): Passo[] | null {
  const rolagem = precisaDaPagina(pagina).rolagemDoCampo(valor, bloco)
  if (!rolagem || rolagem === 'visivel') return null
  return [
    { fazer: 'arrastar', alvo: rolagem.de, para: rolagem.para },
    { fazer: 'continuar', acao: texto },
  ]
}

/**
 * O `agir` da ponte na página. Organizar blocos se faz por eventos dentro da página: o botão
 * direito da mão do robô trava a janela de gravação no menu do Blockly. A Parte que usa isso põe
 * o verbo num trecho que a edição troca por outra imagem.
 */
export async function agirNaPagina(
  acao: string,
  jogos: readonly JogoDaAula[],
  pagina: PaginaDoPalco,
): Promise<Passo[]> {
  const f = fold(acao.replace(/\s+/g, ' ').trim())
  if (f === 'organizar blocos' && pagina.areaPronta() && !(await pagina.organizar()))
    throw new Error('O menu da área de trabalho não abriu para organizar os blocos.')
  // Logo depois de um bloco cair, o Blockly redesenha a pilha que cresceu e, 250 ms depois,
  // empurra para longe os blocos soltos perto do encaixe novo (a área Quando acontecer logo
  // abaixo de Ao iniciar). Antes de medir se uma área ficou por cima da outra, a página assenta:
  // passa do empurrão e espera as pilhas pararem. No ritmo sem pausa do Verificar plano, medir
  // antes disso fazia a mão pegar o bloco recém-encaixado em vez da área.
  if (f.startsWith('afastar de ')) await assentar(pagina)
  // O Estúdio aplica uma escolha (o nome novo de Alterar variável) um pouco depois de a lista
  // fechar: o bloco ou o campo que ainda não aparece com o texto novo é procurado de novo por
  // um instante, com o vídeo parado na procura, antes de virar erro.
  for (let tentativa = 1; ; tentativa++) {
    try {
      return agir(acao, jogos, pagina)
    } catch (error) {
      const ainda = error instanceof Error && error.message.startsWith('Não achei')
      if (!ainda || tentativa >= PROCURAS) throw error
      await new Promise((r) => setTimeout(r, ENTRE_PROCURAS))
    }
  }
}

/** Quantas vezes, e a quantos milissegundos, um bloco ou campo ainda não achado é procurado. */
const PROCURAS = 10
const ENTRE_PROCURAS = 250
/** O mínimo de espera depois de um bloco cair: passa do empurrão do Blockly (250 ms). */
const ASSENTAR = 350
/** De quanto em quanto tempo as pilhas são medidas, e o teto da espera. */
const ENTRE_MEDIDAS = 100
const ASSENTAR_NO_MAXIMO = 2000

/** Espera as pilhas da área de trabalho pararem de andar (no mínimo ASSENTAR). */
async function assentar(pagina: PaginaDoPalco): Promise<void> {
  const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms))
  await pausa(ASSENTAR)
  let antes = pagina.posicoes()
  for (let passou = ASSENTAR; passou < ASSENTAR_NO_MAXIMO; passou += ENTRE_MEDIDAS) {
    await pausa(ENTRE_MEDIDAS)
    const agora = pagina.posicoes()
    if (agora === antes) return
    antes = agora
  }
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
