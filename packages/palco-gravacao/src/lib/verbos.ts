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
    verbo: 'trocar',
    exemplo: 'trocar "jogador" por "escolhido"',
    descricao:
      'Troca um campo de bloco: escolhe no menu ou no seletor que ele abre, ou reescreve um número ou texto (em "<bloco>" para dizer qual).',
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

/** Depois de agir num bloco, a mão vai para o fundo da área ao lado dele (o ponto é visto na hora). */
const afastar = (bloco: string): Passo => ({ fazer: 'continuar', acao: `afastar de "${bloco}"` })

/** Escolhe `valor` na lista que um campo abriu (um menu do Blockly ou um seletor do Estúdio). */
const naLista = (valor: string): Passo => ({
  fazer: 'clicar',
  alvo: { texto: valor, dentro: '.blocklyDropDownDiv' },
})

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
  const stage = jogos[0]?.stage ?? { width: 640, height: 360 }
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
  if (f === 'expandir estudio') return [{ fazer: 'clicar', alvo: botao('Expandir') }]
  if (f === 'reduzir estudio') return [{ fazer: 'clicar', alvo: botao('Reduzir') }]
  const ampliar = /^ampliar (.+)$/i.exec(texto)
  if (ampliar?.[1]) return [{ fazer: 'clicar', alvo: botao(`Ampliar ${ampliar[1]}`) }]

  // Logo depois de expandir, o Estúdio ainda monta a área de trabalho: o gesto de bloco espera os
  // blocos aparecerem e pergunta de novo.
  if (
    pagina &&
    /^(arrastar at[eé]|apontar (bloco|encaixe|abaixo de)|encaixar|abrir campo|trocar) /i.test(
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
    const campo = precisaDaPagina(pagina).campo(trocar[1], trocar[3])
    if (!campo) throw new Error(`Não achei o campo "${trocar[1]}" num bloco da área de trabalho.`)
    // Depois de trocar, a mão sai de cima do bloco (parada em cima, aparece a dica dele).
    // Blocos de valor podem ter só o campo editável, sem nome fixo para reencontrar depois.
    // Nesse caso a edição termina sem agendar um gesto que não tem alvo.
    const depois = campo.bloco ? [afastar(campo.bloco)] : []
    if (campo.tipo === 'menu')
      return [{ fazer: 'clicar', alvo: campo.alvo }, naLista(trocar[2]), ...depois]
    if (campo.tipo === 'numero')
      return [{ fazer: 'clicar', alvo: campo.alvo }, ...naCaixa(trocar[2]), ...depois]
    // Um texto ou um seletor do Estúdio: o que abrir com o clique diz como escolher.
    return [
      { fazer: 'clicar', alvo: campo.alvo },
      { fazer: 'continuar', acao: `escolher "${trocar[2]}"` },
      ...depois,
    ]
  }

  const abrirCampo = /^abrir campo ["“]([^"”]+)["”](?: em ["“]([^"”]+)["”])?$/i.exec(texto)
  if (abrirCampo?.[1]) {
    const campo = precisaDaPagina(pagina).campo(abrirCampo[1], abrirCampo[2])
    if (!campo)
      throw new Error(`Não achei o campo "${abrirCampo[1]}" num bloco da área de trabalho.`)
    // A lista (ou a caixa) que abre cobre o bloco: a mão fica no campo até o escolher.
    return [{ fazer: 'clicar', alvo: campo.alvo }]
  }

  const afastarDe = /^afastar de ["“]([^"”]+)["”]$/i.exec(texto)
  if (afastarDe?.[1]) {
    const perto = precisaDaPagina(pagina).perto(afastarDe[1])
    // Sem fundo livre ao lado, a mão fica onde está.
    if (!perto) return [{ fazer: 'esperar', alvo: { seletor: 'svg.blocklySvg' } }]
    return [{ fazer: 'apontar', alvo: perto, exato: true }]
  }

  const escolher = /^escolher ["“]([^"”]*)["”](?: em ["“]([^"”]+)["”])?$/i.exec(texto)
  if (escolher?.[1] !== undefined) {
    const aberto = precisaDaPagina(pagina).aberto()
    // Escolhido, a mão sai de cima do bloco do campo, quando o roteiro diz qual é.
    const depois = escolher[2] ? [afastar(escolher[2])] : []
    if (aberto === 'lista') return [naLista(escolher[1]), ...depois]
    if (aberto === 'caixa') return [...naCaixa(escolher[1]), ...depois]
    throw new Error('O campo clicado não abriu uma lista nem uma caixa de texto.')
  }

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
