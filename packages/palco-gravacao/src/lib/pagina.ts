import type { Alvo } from './verbos'

/**
 * O que a ponte precisa saber da página do palco na hora de responder a uma ação: onde estão os
 * blocos, os campos e a pré-visualização do Estúdio. Cada elemento achado ganha uma marca própria
 * (`data-palco-alvo`), e o robô o procura por ela logo em seguida: a marca não muda nada na aula.
 */
export interface PaginaDoPalco {
  /** O tamanho da pré-visualização do jogo no Estúdio, ou nulo quando ela não está na tela. */
  previa(): { width: number; height: number } | null
  /** O tamanho do quadro do jogo pronto na aula, ou nulo quando ele não está na tela. */
  jogo(): { width: number; height: number } | null
  /** A área de trabalho do Estúdio já mostra os blocos (logo depois de expandir, ainda não). */
  areaPronta(): boolean
  /**
   * Um campo de bloco pelo texto (dentro do bloco que tem `bloco`, quando dado): um menu do
   * Blockly, um número, ou outro campo (texto ou um seletor do Estúdio, que só se sabe depois
   * de clicar).
   */
  campo(
    texto: string,
    bloco?: string,
  ): { alvo: Alvo; tipo: 'menu' | 'numero' | 'outro'; bloco: string } | null
  /** O que o campo clicado abriu: a lista de um menu ou seletor, ou a caixa de digitar. */
  aberto(): 'lista' | 'caixa' | null
  /** O espaço ao lado do rótulo de um bloco (o "fazer" de um Quando clicar ou tocar). */
  encaixe(bloco: string, rotulo: string): Alvo | null
  /** Um arrasto do fundo da área de trabalho que traz o bloco à vista (nulo se já está). */
  rolagem(bloco: string): { de: Alvo; para: Alvo } | 'visivel' | null
  /**
   * Arruma os blocos um por cima do outro pelo menu da área de trabalho (botão direito e
   * Organizar blocos), por eventos dentro da página. Falso se o menu não abriu.
   */
  organizar(): Promise<boolean>
  /** O mesmo para um campo de bloco, que também precisa estar descoberto para o clique. */
  rolagemDoCampo(valor: string, bloco?: string): { de: Alvo; para: Alvo } | 'visivel' | null
  /** Algum botão visível com este texto. */
  temBotao(texto: string): boolean
  /**
   * Uma categoria da caixa de categorias pelo nome (sem o emoji): aberta (a de dentro à mostra,
   * ou a folha escolhida, com a paleta dela aberta), fechada, ou nula quando não está à vista.
   */
  categoria(nome: string): 'aberta' | 'fechada' | null
  /**
   * Um bloco pelo começo do texto dele, como aparece na tela ("Deixar o sprite" acha "Deixar o
   * sprite jogador com 50% de visibilidade"): na paleta, pego pela borda esquerda, ou na área de
   * trabalho, pelo meio.
   */
  bloco(texto: string, area: 'paleta' | 'area'): Alvo | null
  /** O ponto logo abaixo de um bloco da área de trabalho, onde outro bloco encaixa embaixo dele. */
  abaixo(bloco: string): Alvo | null
  /**
   * Um ponto do fundo da área de código ao lado de um bloco, sem bloco nenhum embaixo: a mão
   * parada em cima de um bloco faz o Blockly mostrar a dica dele.
   */
  perto(bloco: string): Alvo | null
  /**
   * Um lugar sem blocos na área de trabalho, ao lado das pilhas que já existem e fora de onde a
   * paleta abre: o meio dele, para apontar, ou, com `pegar` (o começo do texto de um bloco da
   * paleta aberta), o ponto aonde a mão leva esse bloco para ele cair com o canto nesse lugar.
   * Sempre o mesmo lugar enquanto a área não muda, com a paleta aberta ou fechada. Com
   * `abaixoDe` (o começo do texto de uma pilha, como "Ao iniciar"), o lugar é logo abaixo dela,
   * alinhado com a borda esquerda dela e com uma folga, ou nenhum se ali não estiver livre.
   */
  lugarLivre(pegar?: string, abaixoDe?: string): Alvo | null
  /**
   * Aonde a mão leva o bloco `pegar` da paleta para ele encaixar no espaço vazio de dentro de
   * `bloco`, uma área (Quando acontecer) ou outro bloco com um espaço sem rótulo.
   */
  dentro(bloco: string, pegar: string): Alvo | null
  /**
   * Aonde a mão leva o bloco de valor `pegar` da paleta para ele entrar no lugar do valor `valor`
   * de `bloco` (o 0 de Criar variável, o 1 de Alterar variável).
   */
  sobre(valor: string, bloco: string, pegar: string): Alvo | null
  /**
   * O tamanho do jogo do projeto aberto no Estúdio, pelo bloco que prepara a tela ("Preparar o
   * jogo em tela cheia, tela 480 × 360"): é esse jogo que a pré-visualização mostra.
   */
  palcoDoJogo(): { width: number; height: number } | null
  /**
   * Um arrasto que desembola duas áreas: quando uma pilha cresceu por cima da de baixo (Ao
   * iniciar ganhou um bloco e encostou em Quando acontecer), a de baixo é pega pelo nome e
   * descida até ficar um espaço abaixo da de cima. Nulo quando nenhuma está por cima da outra.
   */
  desembolar(): { de: Alvo; para: Alvo } | null
  /**
   * Onde está cada pilha da área de trabalho agora, numa linha: duas iguais em seguida querem
   * dizer que nada mais anda (o Blockly empurra os blocos soltos perto de um encaixe novo 250 ms
   * depois de o bloco cair).
   */
  posicoes(): string
  /**
   * Um arrasto do fundo que deixa bem à vista, juntos, todos os blocos que começam com estes
   * textos (os que a criança confere): o conjunto vem para perto do meio da área de código, com
   * folga das bordas. `'visivel'` se já está assim; nulo se algum bloco não existe.
   */
  rolagemDeVarios(blocos: readonly string[]): { de: Alvo; para: Alvo } | 'visivel' | null
  /**
   * O botão de mais que fica logo antes do rótulo `rotulo` ("senão", "senão se") de `bloco`: é ele
   * que abre aquele espaço do bloco (o Se chega sem o senão).
   */
  mais(bloco: string, rotulo: string): Alvo | null
  /** A lixeira da área de código, onde um bloco solto some. */
  lixeira(): Alvo | null
  /** Um ponto da área de código à vista sem bloco nenhum, para clicar fora dos blocos. */
  fundoLivre(): Alvo | null
}

let marks = 0

/** Marca um elemento para o robô achá-lo, e devolve o seletor dele. */
function marcar(el: Element): string {
  const existing = el.getAttribute('data-palco-alvo')
  if (existing) return `[data-palco-alvo="${existing}"]`
  const id = `a${++marks}`
  el.setAttribute('data-palco-alvo', id)
  return `[data-palco-alvo="${id}"]`
}

const visivel = (el: Element): boolean => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

const texto = (el: Element): string => (el.textContent ?? '').replace(/\s+/g, ' ').trim()

// A barra de um rótulo é dita "ou": o bloco "Quando clicar/tocar" é "Quando clicar ou tocar" na fala.
// O emoji da categoria não é dito: "🏷️ Variáveis" é "Variáveis".
const fold = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\p{Extended_Pictographic}|\u200d|\ufe0f/gu, '')
    .toLowerCase()
    .replace(/\s*\/\s*/g, ' ou ')
    .replace(/\s+/g, ' ')
    .trim()

/** A área de trabalho principal do Estúdio (a paleta é outro SVG). */
const areaDeTrabalho = (doc: Document): SVGSVGElement | null => doc.querySelector('svg.blocklySvg')

/**
 * O menu do Blockly chama a ação num frame seguido de uma tarefa. A primeira passagem espera
 * essa fila; a segunda deixa terminar a renderização que a organização enfileirou. Esperar só o
 * SVG existir libera a gravação antes de os blocos mudarem de lugar. O teto também libera a
 * tentativa se a aba ficar oculta ou a área de trabalho sair da página.
 */
function esperarOrganizacao(doc: Document, area: SVGSVGElement): Promise<boolean> {
  const view = doc.defaultView
  if (!view) return Promise.resolve(false)
  return new Promise((resolve) => {
    let frame = 0
    let tarefa = 0
    let passagens = 2
    const terminar = (concluida: boolean) => {
      view.clearTimeout(limite)
      view.clearTimeout(tarefa)
      view.cancelAnimationFrame(frame)
      resolve(concluida && area.isConnected && areaDeTrabalho(doc) === area)
    }
    const limite = view.setTimeout(() => terminar(false), 2_000)
    const passar = () => {
      frame = view.requestAnimationFrame(() => {
        tarefa = view.setTimeout(() => {
          if (--passagens === 0) terminar(true)
          else passar()
        }, 0)
      })
    }
    passar()
  })
}

/**
 * A parte da área de trabalho que aparece: o SVG passa por baixo da caixa de categorias (e da
 * paleta aberta), à esquerda, então o que fica à vista começa à direita delas.
 */
function areaVisivel(doc: Document, area: Element): DOMRect {
  const view = area.getBoundingClientRect()
  let left = view.left
  // A caixa encostada na borda e, encostada nela, a paleta aberta.
  const lados = [toolbox(doc), paleta(doc)]
  for (const lado of lados) {
    const r = lado?.getBoundingClientRect()
    if (r && r.width > 0 && r.height > 0 && r.left <= left + 8) left = Math.max(left, r.right)
  }
  return new DOMRect(left, view.top, view.right - left, view.height)
}

const toolbox = (doc: Document): Element | null => doc.querySelector('.blocklyToolbox')

/**
 * A paleta aberta: o Estúdio tem mais de um `svg.blocklyFlyout` (o da lixeira fica escondido,
 * com tamanho zero), e o primeiro da página não é o da caixa de categorias.
 */
const paleta = (doc: Document): Element | null =>
  [...doc.querySelectorAll('svg.blocklyFlyout')].find(visivel) ?? null

/**
 * O bloco de que um texto ou campo é: o primeiro que não é sombra. O número de um bloco ("50" em
 * "Deixar o sprite jogador com 50% de visibilidade", o "1" de "Somar 1") fica num bloco-sombra
 * encaixado nele, que é dele.
 */
function donoDe(el: Element): Element | null {
  let dono = el.closest('.blocklyDraggable')
  while (dono?.classList.contains('blocklyShadow'))
    dono = dono.parentElement?.closest('.blocklyDraggable') ?? null
  return dono
}

/** O texto que é do próprio bloco, sem o dos blocos encaixados nele. */
const textoProprio = (block: Element): string =>
  fold(
    [...block.querySelectorAll('text.blocklyText')]
      .filter((t) => donoDe(t) === block)
      .map(texto)
      .join(' ')
      .replace(/▾/g, ''),
  )

/**
 * Os blocos visíveis da área de trabalho ou da paleta cujo texto começa com `alvo` (ou o contém,
 * quando nenhum começa).
 */
function blocosCom(doc: Document, alvo: string, onde: 'area' | 'paleta' = 'area'): Element[] {
  const raiz = onde === 'area' ? areaDeTrabalho(doc) : paleta(doc)
  if (!raiz) return []
  // "Se dentro de Quando o sprite personagem começar a encostar no sprite farol": o Se que está
  // dentro daquele encontro, e não os outros Se do projeto (o de Enquanto estiver rodando).
  const [proprio, ...fora] = alvo.split(/ dentro de /i)
  const donos = fora.length ? blocosCom(doc, fora.join(' dentro de '), onde) : null
  if (donos && !donos.length) return []
  const wanted = fold(proprio ?? '')
  const blocos = [...raiz.querySelectorAll('.blocklyBlockCanvas .blocklyDraggable')].filter(
    (b) => visivel(b) && (!donos || donos.some((d) => d !== b && d.contains(b))),
  )
  const comecam = blocos.filter((b) => textoProprio(b).startsWith(wanted))
  return comecam.length ? comecam : blocos.filter((b) => textoProprio(b).includes(wanted))
}

/** Os textos que são do próprio bloco, não dos blocos encaixados nele. */
const textosDe = (block: Element): Element[] =>
  [...block.querySelectorAll('text.blocklyText')].filter((t) => donoDe(t) === block)

/** O primeiro rótulo fixo do bloco, o mais acima e à esquerda (um número de sombra vem antes no DOM). */
const rotuloDe = (block: Element): Element | undefined =>
  textosDe(block)
    .filter((t) => !t.closest('.blocklyEditableField'))
    .map((t) => ({ t, r: t.getBoundingClientRect() }))
    .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left)[0]?.t

/** Um ponto de um elemento como alvo do robô (u, v de 0 a 1 da caixa dele). */
function pontoEm(el: Element, x: number, y: number): Alvo {
  const r = el.getBoundingClientRect()
  return {
    seletor: marcar(el),
    u: Math.min(1, Math.max(0, (x - r.left) / r.width)),
    v: Math.min(1, Math.max(0, (y - r.top) / r.height)),
  }
}

/** O campo de bloco com este valor (dentro do bloco que tem `bloco`, quando dado). */
function campoDe(doc: Document, valor: string, bloco?: string): Element | null {
  const wanted = fold(valor)
  const blocos = bloco ? blocosCom(doc, bloco) : null
  const area = areaDeTrabalho(doc)
  if (!area) return null
  const campos = [...area.querySelectorAll('.blocklyEditableField text.blocklyText')].filter(
    (t) => visivel(t) && fold(texto(t).replace(/▾/g, '')) === wanted,
  )
  // Primeiro os campos do próprio bloco; sem eles, os de um bloco encaixado nele (o verdadeiro
  // solto no valor de Criar variável, o texto no de Alterar variável).
  const found = !blocos
    ? campos[0]
    : (campos.find((t) => blocos.some((b) => donoDe(t) === b)) ??
      campos.find((t) => blocos.some((b) => b.contains(t))))
  return found ? (found.closest('.blocklyEditableField') ?? found) : null
}

/** O caminho do próprio bloco, sem os de dentro. */
const caixaPropria = (block: Element): DOMRect =>
  (
    [...block.querySelectorAll('path.blocklyPath')].find(
      (p) => p.closest('.blocklyDraggable') === block,
    ) ?? block
  ).getBoundingClientRect()

/** Onde a mão pega um bloco da paleta, a partir do canto dele (o mesmo ponto de `bloco`). */
function pegaDaPaleta(doc: Document, texto: string): { x: number; y: number } | null {
  const block = blocosCom(doc, texto, 'paleta')[0]
  if (!block) return null
  const r = block.getBoundingClientRect()
  return { x: Math.min(12, r.width / 4), y: Math.min(r.height / 2, 18) }
}

/**
 * O ponto é fundo da área de trabalho: o primeiro elemento dela ali, mesmo com a paleta aberta
 * por cima (a do Encostar e bloquear cobre uma área recém-criada perto das categorias).
 */
function fundoEm(doc: Document, x: number, y: number): boolean {
  const area = areaDeTrabalho(doc)
  if (!area) return false
  const dela = doc.elementsFromPoint(x, y).find((e) => area.contains(e))
  return dela?.classList.contains('blocklyMainBackground') === true
}

/** Quanto duas pilhas precisam estar lado a lado para uma contar como em cima da outra. */
const LADO_A_LADO = 40
/** A folga que o lugar livre deixa das pilhas que já existem. */
const FOLGA = 24
/** O espaço entre uma pilha e a área nova posta logo abaixo dela. */
const ESPACO_ABAIXO = 32
/** O tamanho que a área nova precisa livre abaixo da pilha (com o primeiro bloco de dentro). */
const ABAIXO: [number, number] = [300, 110]

/**
 * O lugar logo abaixo da pilha que começa com `texto`: a borda esquerda dela e um espaço abaixo
 * do fim dela, à vista e só de fundo (a paleta aberta por cima não conta). Nulo se não couber.
 */
function abaixoDaPilha(doc: Document, texto: string): DOMRect | null {
  const area = areaDeTrabalho(doc)
  const pilha = blocosCom(doc, texto).find((b) =>
    b.parentElement?.classList.contains('blocklyBlockCanvas'),
  )
  if (!area || !pilha) return null
  const p = pilha.getBoundingClientRect()
  const view = area.getBoundingClientRect()
  const lugar = new DOMRect(p.left, p.bottom + ESPACO_ABAIXO, ABAIXO[0], ABAIXO[1])
  if (lugar.left < view.left || lugar.right > view.right || lugar.bottom > view.bottom) return null
  for (let y = lugar.top; y <= lugar.bottom; y += CELULA)
    for (let x = lugar.left; x <= lugar.right; x += CELULA) if (!fundoEm(doc, x, y)) return null
  return lugar
}

/** A largura que a paleta ocupa quando abre, guardada fora do lugar livre. */
const PALETA_RESERVA = 340
/** Os tamanhos procurados, do que cabe a área com o bloco de dentro ao menor. */
const LUGARES: [number, number][] = [
  [460, 170],
  [360, 150],
  [280, 130],
]
const CELULA = 12

/**
 * O lugar sem blocos da área de trabalho: um retângulo só de fundo, à direita da caixa de
 * categorias e da paleta (aberta ou não), o mais perto das pilhas que já existem.
 */
function lugarSemBlocos(doc: Document): DOMRect | null {
  const area = areaDeTrabalho(doc)
  if (!area || !visivel(area)) return null
  const view = area.getBoundingClientRect()
  const caixa = toolbox(doc)?.getBoundingClientRect()
  const base = caixa && caixa.width > 0 ? Math.max(view.left, caixa.right) : view.left
  const aberta = paleta(doc)?.getBoundingClientRect()
  const reserva = Math.max(PALETA_RESERVA, aberta ? aberta.right - base : 0)
  const left = base + reserva
  const top = view.top + CELULA
  const colunas = Math.floor((view.right - CELULA - left) / CELULA)
  const linhas = Math.floor((view.bottom - CELULA - top) / CELULA)
  if (colunas <= 0 || linhas <= 0) return null
  // Uma grade do que é fundo, somada para saber num passo se um retângulo é só fundo.
  const soma: number[][] = Array.from({ length: linhas + 1 }, () =>
    Array<number>(colunas + 1).fill(0),
  )
  const em = (j: number, i: number): number => soma[j]?.[i] ?? 0
  for (let j = 0; j < linhas; j++)
    for (let i = 0; i < colunas; i++) {
      const livre = fundoEm(doc, left + i * CELULA + CELULA / 2, top + j * CELULA + CELULA / 2)
      const linha = soma[j + 1]
      if (linha) linha[i + 1] = (livre ? 0 : 1) + em(j, i + 1) + em(j + 1, i) - em(j, i)
    }
  const ocupadas = (i: number, j: number, w: number, h: number): number =>
    em(j + h, i + w) - em(j, i + w) - em(j + h, i) + em(j, i)
  const pilhas = pilhasDaArea(doc).caixas
  const distancia = (r: DOMRect): number =>
    pilhas.length
      ? Math.min(
          ...pilhas.map((p) =>
            Math.hypot(
              Math.max(0, p.left - r.right, r.left - p.right),
              Math.max(0, p.top - r.bottom, r.top - p.bottom),
            ),
          ),
        )
      : 0
  for (const [largura, altura] of LUGARES) {
    const w = Math.ceil(largura / CELULA)
    const h = Math.ceil(altura / CELULA)
    let melhor: { r: DOMRect; d: number } | null = null
    for (let j = 0; j + h <= linhas; j++)
      for (let i = 0; i + w <= colunas; i++) {
        if (ocupadas(i, j, w, h)) continue
        const r = new DOMRect(left + i * CELULA, top + j * CELULA, w * CELULA, h * CELULA)
        // O mais perto das pilhas, mas sem colar nelas: abaixo da folga, quanto mais colado, pior.
        const perto = distancia(r)
        const d = perto < FOLGA ? 10_000 + FOLGA - perto : perto
        if (!melhor || d < melhor.d) melhor = { r, d }
      }
    if (melhor) return melhor.r
  }
  return null
}

/** A folga das bordas que os blocos conferidos precisam ter para contarem como bem à vista. */
const MARGEM_A_VISTA = 24
/** Quanto da altura da área à vista um bloco pode estar fora do meio e ainda contar como centrado. */
const CENTRADA = 0.15

/**
 * Um arrasto do fundo da área de trabalho que leva `el` (um bloco, um campo) para o centro da
 * área à vista; `'visivel'` se ele já está inteiro à vista e sem nada por cima (com `centrar`,
 * também perto do meio da altura: a área em que se trabalha fica no centro).
 */
function rolagemDe(
  doc: Document,
  el: Element | DOMRect,
  descoberto = false,
  centrar = false,
  margem = 0,
): { de: Alvo; para: Alvo } | 'visivel' | null {
  const area = areaDeTrabalho(doc)
  if (!area) return null
  const view = areaVisivel(doc, area)
  const b = el instanceof DOMRect ? el : el.getBoundingClientRect()
  // "Bem à vista": com `margem`, o que está a menos disso da borda ainda não conta como visível.
  const dentroX = b.left >= view.left + margem && b.right <= view.right - margem
  const inside = b.top >= view.top + margem && b.bottom <= view.bottom - margem && dentroX
  // Leva o bloco para o centro da área de código, onde a criança o vê melhor, até onde o
  // arrasto alcança (um bloco maior que a área fica com o topo perto do alto). A paleta que
  // abrir por cima dele fecha quando o próximo bloco sai dela.
  const centro = (inicio: number, tamanho: number, area: number) =>
    tamanho >= area * 0.8 ? area * 0.1 - inicio : area / 2 - (inicio + tamanho / 2)
  // Para trabalhar numa área (centrar), ela vem para o meio da altura mesmo já à vista; de lado,
  // só anda se não couber inteira, para as outras áreas não saírem do lugar à toa.
  const dx = centrar && dentroX ? 0 : centro(b.left - view.left, b.width, view.width)
  const dy = centro(b.top - view.top, b.height, view.height)
  // Um campo também precisa estar descoberto: com outra coisa por cima (a paleta aberta, um
  // painel), vai para o centro. Um bloco tem os de dentro por cima, e isso não conta.
  const topo = descoberto ? doc.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) : null
  const livre = !topo || el instanceof DOMRect || el.contains(topo) || topo.contains(el)
  if (centrar ? inside && Math.abs(dy) <= view.height * CENTRADA : inside && livre) return 'visivel'
  // Um ponto do fundo, sem bloco em cima, de onde arrastar.
  const fundo = (x: number, y: number) =>
    doc.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground') === true
  // Começa do lado de onde o bloco vem: o arrasto inteiro cabe na área à vista.
  const xs = dx < 0 ? [0.9, 0.75, 0.5, 0.25, 0.1] : [0.1, 0.25, 0.5, 0.75, 0.9]
  const ys = dy < 0 ? [0.85, 0.7, 0.5, 0.3, 0.15] : [0.15, 0.3, 0.5, 0.7, 0.85]
  let start: { x: number; y: number } | null = null
  for (const fy of ys)
    for (const fx of xs) {
      const x = view.left + view.width * fx
      const y = view.top + view.height * fy
      if (!start && fundo(x, y)) start = { x, y }
    }
  if (!start) return null
  const end = {
    x: Math.min(view.right - 4, Math.max(view.left + 4, start.x + dx)),
    y: Math.min(view.bottom - 4, Math.max(view.top + 4, start.y + dy)),
  }
  return { de: pontoEm(area, start.x, start.y), para: pontoEm(area, end.x, end.y) }
}

/**
 * A área de trabalho do Estúdio na tela e a caixa de cada pilha de blocos nela (nada quando o
 * Estúdio não está aberto).
 */
export function pilhasDaArea(doc: Document): { area: Element | null; caixas: DOMRect[] } {
  const area = areaDeTrabalho(doc)
  if (!area || !visivel(area)) return { area: null, caixas: [] }
  const caixas = [...area.querySelectorAll('.blocklyBlockCanvas > .blocklyDraggable')]
    .filter(visivel)
    .map((b) => b.getBoundingClientRect())
  return { area, caixas }
}

export function paginaDe(doc: Document): PaginaDoPalco {
  return {
    previa() {
      const frame = doc.querySelector('iframe[title="Pré-visualização"]')
      if (!frame || !visivel(frame)) return null
      const r = frame.getBoundingClientRect()
      return { width: r.width, height: r.height }
    },

    jogo() {
      const stage = doc.querySelector('.sz-project-play-stage')
      if (!stage || !visivel(stage)) return null
      const r = stage.getBoundingClientRect()
      return { width: r.width, height: r.height }
    },

    areaPronta() {
      const area = areaDeTrabalho(doc)
      return (
        !!area && [...area.querySelectorAll('.blocklyBlockCanvas .blocklyDraggable')].some(visivel)
      )
    },

    campo(valor, bloco) {
      const field = campoDe(doc, valor, bloco)
      if (!field) return null
      const r = field.getBoundingClientRect()
      const dono = donoDe(field)
      return {
        alvo: pontoEm(field, r.left + r.width / 2, r.top + r.height / 2),
        // O começo do texto do bloco do campo: é por ele que a mão se afasta depois.
        bloco: (dono && rotuloDe(dono)?.textContent?.trim()) || (bloco ?? ''),
        // Os seletores do Estúdio (sprite, nome, som) herdam do campo de texto do Blockly e
        // abrem uma lista: pela classe, só se distinguem depois de clicar ("outro").
        tipo:
          field.classList.contains('blocklyDropdownField') ||
          field.classList.contains('blocklyVariableField')
            ? 'menu'
            : field.classList.contains('blocklyNumberField')
              ? 'numero'
              : 'outro',
      }
    },

    aberto() {
      const lista = doc.querySelector('.blocklyDropDownDiv')
      // Fechada, a lista do Blockly fica com `display: none`, sem tamanho.
      if (lista && visivel(lista)) return 'lista'
      const caixa = doc.querySelector('input.blocklyHtmlInput')
      return caixa && visivel(caixa) ? 'caixa' : null
    },

    encaixe(bloco, rotulo) {
      const wanted = fold(rotulo)
      for (const block of blocosCom(doc, bloco)) {
        const label = textosDe(block).find((t) => fold(texto(t)) === wanted)
        if (!label) continue
        const r = label.getBoundingClientRect()
        const area = areaDeTrabalho(doc)
        if (!area) return null
        // O espaço vazio começa logo depois do rótulo: o bloco solto ali encaixa. O ponto é da área
        // de trabalho, porque fica fora da caixa do bloco quando o espaço está vazio.
        return pontoEm(area, r.right + 16, r.top + r.height / 2)
      }
      return null
    },

    rolagem(bloco) {
      const block = blocosCom(doc, bloco)[0]
      // Para trabalhar nele: o bloco vem para o meio da área, mesmo já à vista.
      return block ? rolagemDe(doc, block, false, true) : null
    },

    rolagemDoCampo(valor, bloco) {
      const field = campoDe(doc, valor, bloco)
      return field ? rolagemDe(doc, field, true) : null
    },

    bloco(texto, onde) {
      const block = blocosCom(doc, texto, onde)[0]
      if (!block) return null
      const r = block.getBoundingClientRect()
      // Da paleta, o bloco é pego pela borda esquerda, como uma pessoa pega.
      if (onde === 'paleta')
        return pontoEm(
          block,
          r.left + Math.min(12, r.width / 4),
          r.top + Math.min(r.height / 2, 18),
        )
      // Na área, apontado no texto dele: o meio da caixa de um bloco com outros dentro cai fora
      // da barra dele, no fundo da área. O texto é o alvo, e o robô do EdiAula deixa a mão logo
      // abaixo dele, sem cobrir o que está escrito.
      const rotulo = rotuloDe(block)
      if (!rotulo) return pontoEm(block, r.left + 12, r.top + Math.min(r.height / 2, 18))
      const t = rotulo.getBoundingClientRect()
      return pontoEm(rotulo, t.left + t.width / 2, t.top + t.height / 2)
    },

    abaixo(texto) {
      const area = areaDeTrabalho(doc)
      const block = blocosCom(doc, texto)[0]
      if (!area || !block) return null
      // O caminho do próprio bloco, sem os de dentro: o encaixe de baixo fica no fim dele.
      const path = [...block.querySelectorAll('path.blocklyPath')].find(
        (p) => p.closest('.blocklyDraggable') === block,
      )
      const r = (path ?? block).getBoundingClientRect()
      return pontoEm(area, r.left + 12, r.bottom + 10)
    },

    async organizar() {
      const area = areaDeTrabalho(doc)
      if (!area) return false
      const view = areaVisivel(doc, area)
      let ponto: { x: number; y: number } | null = null
      for (const fy of [0.85, 0.15, 0.5, 0.7, 0.3])
        for (const fx of [0.85, 0.5, 0.15, 0.7, 0.3]) {
          const x = view.left + view.width * fx
          const y = view.top + view.height * fy
          if (!ponto && doc.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground'))
            ponto = { x, y }
        }
      const fundo = ponto && doc.elementFromPoint(ponto.x, ponto.y)
      if (!ponto || !fundo) return false
      const evento = (x: number, y: number) =>
        ({
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          pointerType: 'mouse',
          isPrimary: true,
        }) as const
      const em = evento(ponto.x, ponto.y)
      fundo.dispatchEvent(new PointerEvent('pointerdown', { ...em, button: 2, buttons: 2 }))
      fundo.dispatchEvent(new PointerEvent('pointerup', { ...em, button: 2, buttons: 0 }))
      fundo.dispatchEvent(new MouseEvent('contextmenu', { ...em, button: 2 }))
      await new Promise((r) => setTimeout(r, 300))
      const item = [...doc.querySelectorAll('.blocklyContextMenu .blocklyMenuItem')].find(
        (e) => texto(e) === 'Organizar blocos',
      )
      if (!item) return false
      const r = item.getBoundingClientRect()
      const no = { ...evento(r.left + 10, r.top + r.height / 2), button: 0 }
      item.dispatchEvent(new PointerEvent('pointerdown', { ...no, buttons: 1 }))
      item.dispatchEvent(new PointerEvent('pointerup', { ...no, buttons: 0 }))
      item.dispatchEvent(new MouseEvent('click', no))
      return esperarOrganizacao(doc, area)
    },

    perto(texto) {
      const area = areaDeTrabalho(doc)
      const block = blocosCom(doc, texto)[0]
      if (!area || !block) return null
      const view = areaVisivel(doc, area)
      // A primeira linha do bloco: os textos e campos dele na altura do primeiro rótulo.
      const pecas = textosDe(block).map((t) =>
        (t.closest('.blocklyEditableField') ?? t).getBoundingClientRect(),
      )
      const topo = pecas.sort((a, b) => a.top - b.top)[0]
      if (!topo) return null
      const linha = pecas.filter(
        (r) => Math.abs(r.top + r.height / 2 - (topo.top + topo.height / 2)) < topo.height,
      )
      const direita = Math.max(...linha.map((r) => r.right))
      const meio = topo.top + topo.height / 2
      const b = block.getBoundingClientRect()
      const fundo = (x: number, y: number) =>
        x > view.left + 4 &&
        x < view.right - 4 &&
        y > view.top + 4 &&
        y < view.bottom - 4 &&
        doc.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground') === true
      // A seta cresce na edição (o EdiAula aumenta o cursor) para baixo e para a direita da
      // ponta: à direita ela se afasta do bloco; à esquerda e acima, a folga cobre o corpo dela.
      for (const [x, y] of [
        [direita + 44, meio],
        [direita + 80, meio],
        [b.left - 72, meio],
        [b.left - 40, b.top - 64],
        [direita + 44, meio + topo.height + 12],
      ] as const)
        if (fundo(x, y)) return pontoEm(area, x, y)
      return null
    },

    lugarLivre(pegar, abaixoDe) {
      const area = areaDeTrabalho(doc)
      if (!area) return null
      if (abaixoDe) {
        const lugar = abaixoDaPilha(doc, abaixoDe)
        if (!lugar) return null
        if (!pegar) return pontoEm(area, lugar.left + lugar.width / 2, lugar.top + lugar.height / 2)
        const pega = pegaDaPaleta(doc, pegar)
        // O canto do bloco no canto do lugar: alinhado com a pilha de cima.
        return pega ? pontoEm(area, lugar.left + pega.x, lugar.top + pega.y) : null
      }
      const lugar = lugarSemBlocos(doc)
      if (!lugar) return null
      if (!pegar) return pontoEm(area, lugar.left + lugar.width / 2, lugar.top + lugar.height / 2)
      const pega = pegaDaPaleta(doc, pegar)
      if (!pega) return null
      // Uma célula para dentro: o bloco cai inteiro no lugar, sem encostar no que está em volta.
      return pontoEm(area, lugar.left + CELULA + pega.x, lugar.top + CELULA + pega.y)
    },

    dentro(bloco, pegar) {
      const area = areaDeTrabalho(doc)
      const block = blocosCom(doc, bloco)[0]
      const pega = pegaDaPaleta(doc, pegar)
      if (!area || !block || !pega) return null
      const r = caixaPropria(block)
      const rotulo = rotuloDe(block)?.getBoundingClientRect()
      // A boca do bloco: o primeiro fundo descendo do rótulo, por dentro do braço da esquerda,
      // e a borda de dentro do braço, nessa altura. É ali que o bloco de dentro encaixa.
      const desde = rotulo ? rotulo.bottom : r.top + 8
      let boca: number | null = null
      for (let y = desde; y < r.bottom - 2 && boca === null; y += 2)
        if (fundoEm(doc, r.left + 40, y)) boca = y
      if (boca === null) return null
      let braco: number | null = null
      for (let x = r.left; x < r.left + 80 && braco === null; x += 2)
        if (fundoEm(doc, x, boca + 6)) braco = x
      if (braco === null) return null
      return pontoEm(area, braco + pega.x, boca + pega.y)
    },

    sobre(valor, bloco, pegar) {
      const area = areaDeTrabalho(doc)
      const campo = campoDe(doc, valor, bloco)
      const pega = pegaDaPaleta(doc, pegar)
      if (!area || !campo || !pega) return null
      // O valor é um bloco (de sombra ou não) encaixado no bloco: o de fora entra no lugar dele,
      // com o canto no canto dele.
      const dele = campo.closest('.blocklyDraggable')
      if (!dele) return null
      const r = caixaPropria(dele)
      return pontoEm(area, r.left + pega.x, r.top + pega.y)
    },

    rolagemDeVarios(textos) {
      const caixas: DOMRect[] = []
      for (const t of textos) {
        const bloco = blocosCom(doc, t)[0]
        if (!bloco) return null
        caixas.push(bloco.getBoundingClientRect())
      }
      if (!caixas.length) return null
      const left = Math.min(...caixas.map((c) => c.left))
      const top = Math.min(...caixas.map((c) => c.top))
      const right = Math.max(...caixas.map((c) => c.right))
      const bottom = Math.max(...caixas.map((c) => c.bottom))
      const juntos = new DOMRect(left, top, right - left, bottom - top)
      return rolagemDe(doc, juntos, false, true, MARGEM_A_VISTA)
    },

    mais(bloco, rotulo) {
      const wanted = fold(rotulo)
      for (const block of blocosCom(doc, bloco)) {
        // Os rótulos e os botões do próprio bloco, na ordem em que aparecem na linha.
        const pecas = [...block.querySelectorAll('.blocklyLabelField, .blocklyImageField')].filter(
          (el) => donoDe(el) === block && visivel(el),
        )
        const i = pecas.findIndex(
          (el) => el.classList.contains('blocklyLabelField') && fold(texto(el)) === wanted,
        )
        const botao = i > 0 ? pecas[i - 1] : undefined
        if (!botao?.classList.contains('blocklyImageField')) continue
        const r = botao.getBoundingClientRect()
        return pontoEm(botao, r.left + r.width / 2, r.top + r.height / 2)
      }
      return null
    },

    lixeira() {
      const lixo = doc.querySelector('.blocklyTrash')
      if (!lixo || !visivel(lixo)) return null
      const r = lixo.getBoundingClientRect()
      // O corpo da lixeira, abaixo da tampa: é ali que o bloco solto cai dentro.
      return pontoEm(lixo, r.left + r.width / 2, r.top + r.height * 0.65)
    },

    fundoLivre() {
      const area = areaDeTrabalho(doc)
      if (!area || !visivel(area)) return null
      const view = areaVisivel(doc, area)
      for (const fy of [0.5, 0.7, 0.3, 0.85, 0.15])
        for (const fx of [0.6, 0.8, 0.4, 0.9, 0.2]) {
          const x = view.left + view.width * fx
          const y = view.top + view.height * fy
          if (doc.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground'))
            return pontoEm(area, x, y)
        }
      return null
    },

    posicoes() {
      return pilhasDaArea(doc)
        .caixas.map((r) => [r.left, r.top, r.width, r.height].map(Math.round).join(','))
        .join(';')
    },

    desembolar() {
      const area = areaDeTrabalho(doc)
      if (!area || !visivel(area)) return null
      const view = areaVisivel(doc, area)
      const pilhas = [...area.querySelectorAll('.blocklyBlockCanvas > .blocklyDraggable')]
        .filter(visivel)
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
      for (const de of pilhas)
        for (const baixo of pilhas) {
          if (baixo === de || baixo.r.top <= de.r.top) continue
          // Lado a lado de verdade (encostar de leve na lateral não conta) e sem o espaço entre elas.
          const lado = Math.min(de.r.right, baixo.r.right) - Math.max(de.r.left, baixo.r.left)
          if (lado < LADO_A_LADO || baixo.r.top >= de.r.bottom + FOLGA) continue
          // A pilha de cima fica na frente (foi a última mexida) e cobre o nome da de baixo: a mão
          // pega a de baixo num ponto que é dela mesma e está descoberto, o nome primeiro, depois
          // o braço da esquerda, de cima para baixo. Nunca um bloco de dentro (ele sairia da área).
          const nome = rotuloDe(baixo.el)?.getBoundingClientRect()
          const candidatos = [
            ...(nome
              ? [{ x: nome.left + Math.min(nome.width / 2, 40), y: nome.top + nome.height / 2 }]
              : []),
            ...Array.from({ length: Math.floor(baixo.r.height / 6) }, (_, i) => ({
              x: baixo.r.left + 6,
              y: baixo.r.top + 4 + i * 6,
            })),
          ]
          const pega = candidatos.find(
            (p) =>
              p.y > view.top + 4 &&
              p.y < view.bottom - 4 &&
              p.x > view.left &&
              p.x < view.right &&
              donoDe(doc.elementFromPoint(p.x, p.y) ?? doc.body) === baixo.el,
          )
          if (!pega) continue
          const desce = de.r.bottom + ESPACO_ABAIXO - baixo.r.top
          const para = { x: pega.x, y: Math.min(view.bottom - 12, pega.y + desce) }
          return { de: pontoEm(area, pega.x, pega.y), para: pontoEm(area, para.x, para.y) }
        }
      return null
    },

    palcoDoJogo() {
      for (const block of blocosCom(doc, 'Preparar o jogo')) {
        // Na ordem em que aparecem: no DOM, o número de uma sombra pode vir antes do rótulo.
        const linha = textosDe(block)
          .map((t) => ({ t: texto(t), r: t.getBoundingClientRect() }))
          .sort((a, b) => Math.round(a.r.top / 8) - Math.round(b.r.top / 8) || a.r.left - b.r.left)
          .map((x) => x.t)
          .join(' ')
        const m = /tela (\d+) [x×] (\d+)/.exec(linha)
        if (m?.[1] && m[2]) return { width: Number(m[1]), height: Number(m[2]) }
      }
      return null
    },

    temBotao(nome) {
      const wanted = fold(nome)
      return [...doc.querySelectorAll('button')].some(
        (b) => visivel(b) && fold(texto(b)) === wanted,
      )
    },

    categoria(nome) {
      const caixa = toolbox(doc)
      if (!caixa) return null
      const wanted = fold(nome)
      for (const rotulo of caixa.querySelectorAll(
        '.blocklyToolboxCategoryLabel,.blocklyTreeLabel',
      )) {
        if (fold(texto(rotulo)) !== wanted || !visivel(rotulo)) continue
        const linha = rotulo.closest('.blocklyToolboxCategory,.blocklyTreeRow')
        if (!linha) continue
        // Uma categoria com outras dentro mostra o ícone aberto ou fechado (Blockly 12).
        const icone = linha.querySelector('.blocklyToolboxCategoryIcon')
        if (icone?.classList.contains('blocklyToolboxCategoryIconOpen')) return 'aberta'
        if (icone?.classList.contains('blocklyToolboxCategoryIconClosed')) return 'fechada'
        return linha.classList.contains('blocklyToolboxSelected') ? 'aberta' : 'fechada'
      }
      return null
    },
  }
}
