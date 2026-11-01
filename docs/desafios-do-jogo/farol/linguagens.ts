import type { PublicoDoDesafio } from '../../../packages/arquipelago-contracts/src/desafios'
import type { SectionPythonProjectCheck } from '../../../packages/core/src/learning/python-project-checks'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { BASE_TREES } from '../../../packages/studio/src/components/code/pro-templates/base'
import type { Project } from '../../../packages/studio/src/core/project'
import { buildProProject, type ProjectTree } from '../../../packages/studio/src/core/proProject'
import { AMBIENTE_PYTHON_C02, projetoPythonClassico } from '../ambiente-python'
import { objetivosDoMeuJogo, projetoDoMeuJogo } from './projetos'

/**
 * O projeto autoral do Farol em cada linguagem conquistada (A29, revisão de 31/10/2026). O de
 * blocos é o quadro 1 (`projetos.ts`); aqui ficam o Python (quadro 2), a Ponte em JavaScript
 * (quadro 3) e o Pro (quadro 4). Cada um pede o curso-base de onde a linguagem começa
 * (`postoDoCursoBase` do contrato): o jogo mostra os quatro, e a pessoa escolhe entre os que já
 * abriram. Nenhum pinta (o Farol não tem cor) e todos vão para o fliperama.
 *
 * Cenário aberto (Lenda, lacunas de 01/11/2026): nas linguagens de texto o jogo começa só com a
 * janela, o guia andando e a ficha. A Jornada pede "definir objetivo e três funcionalidades" e "uma
 * revisão humana por projeto final": a ficha guarda o objetivo e as três coisas que o jogo terá,
 * e quem julga o jogo inventado é a equipe, na Sala do Professor. Os critérios automáticos ficam no
 * que vale para qualquer ideia: a ficha preenchida, o jogo que aguenta ser jogado (setas, espaço e
 * clique sem erro) e o R que leva o guia de volta ao começo depois dessas entradas. O gabarito é
 * um exemplo (uma chuva de estrelas com lista, sorteio, relógio e fim de partida), não o jogo esperado.
 */
export const FAROL_TEXTO = {
  guia: { x: 60, y: 400 },
  lado: 40,
  largura: 640,
  altura: 480,
} as const

// ── Python (quadro 2) ───────────────────────────────────────────────────────────────────────

const FICHA_PYTHON_VAZIA = `# A ficha do seu jogo: o objetivo e as três coisas que ele vai ter.
OBJETIVO = ""
FUNCIONALIDADE_1 = ""
FUNCIONALIDADE_2 = ""
FUNCIONALIDADE_3 = ""`
const FICHA_PYTHON = `# A ficha do seu jogo: o objetivo e as três coisas que ele vai ter.
OBJETIVO = "Pegar as estrelas que caem antes de o tempo acabar."
FUNCIONALIDADE_1 = "As estrelas caem em lugares sorteados."
FUNCIONALIDADE_2 = "Cada estrela pega vale um ponto."
FUNCIONALIDADE_3 = "A partida acaba em 30 segundos, e o R recomeça."`

const PYTHON_INICIAL = `guia = Rect((${FAROL_TEXTO.guia.x}, ${FAROL_TEXTO.guia.y}), (${FAROL_TEXTO.lado}, ${FAROL_TEXTO.lado}))


def update():
    if keyboard.right:
        guia.x = guia.x + 4
    if keyboard.left:
        guia.x = guia.x - 4


def on_key_down(key):
    pass


def draw():
    screen.fill((26, 40, 84))
    screen.draw.filled_rect(guia, (120, 220, 200))`

const PYTHON_GABARITO = `import random

guia = Rect((${FAROL_TEXTO.guia.x}, ${FAROL_TEXTO.guia.y}), (${FAROL_TEXTO.lado}, ${FAROL_TEXTO.lado}))
estrelas = []
pontos = 0
tempo = 30
jogando = True


def nova_estrela():
    if jogando:
        estrelas.append(Rect((random.randint(20, 600), 0), (24, 24)))


def contar():
    global tempo, jogando
    if jogando:
        tempo = tempo - 1
        if tempo <= 0:
            jogando = False


clock.schedule_interval(nova_estrela, 1.0)
clock.schedule_interval(contar, 1.0)


def update():
    global pontos
    if not jogando:
        return
    if keyboard.right:
        guia.x = guia.x + 4
    if keyboard.left:
        guia.x = guia.x - 4
    for estrela in estrelas[:]:
        estrela.y = estrela.y + 3
        if guia.colliderect(estrela):
            estrelas.remove(estrela)
            pontos = pontos + 1
        elif estrela.y > HEIGHT:
            estrelas.remove(estrela)


def on_key_down(key):
    global pontos, tempo, jogando
    if key == keys.R:
        guia.x = ${FAROL_TEXTO.guia.x}
        estrelas.clear()
        pontos = 0
        tempo = 30
        jogando = True


def draw():
    screen.fill((26, 40, 84))
    for estrela in estrelas:
        screen.draw.filled_circle(estrela.center, 12, (255, 220, 90))
    screen.draw.filled_rect(guia, (120, 220, 200))
    screen.draw.text("Pontos: " + str(pontos) + "   Tempo: " + str(tempo), (16, 12), fontsize=32)
    if not jogando:
        screen.draw.text("Fim. R recomeça.", center=(320, 240), fontsize=48)`

/** Programas errados que o executor precisa recusar, cada um no lugar do gabarito. */
export const ERROS_DO_FAROL_PYTHON = {
  'ficha-vazia': { quebra: ['objetivo', 'funcionalidades'], ficha: false, codigo: PYTHON_GABARITO },
  'quebra-no-espaco': {
    quebra: ['recomeca'],
    ficha: true,
    codigo: PYTHON_GABARITO.replace(
      `    if keyboard.left:
        guia.x = guia.x - 4
    for estrela`,
      `    if keyboard.left:
        guia.x = guia.x - 4
    if keyboard.space:
        pular()
    for estrela`,
    ),
  },
  'sem-recomecar': {
    quebra: ['recomeca'],
    ficha: true,
    codigo: PYTHON_GABARITO.replace('    if key == keys.R:', '    if key == keys.Q:'),
  },
} as const
export type VersaoDoFarolPython = 'inicial' | 'gabarito' | keyof typeof ERROS_DO_FAROL_PYTHON

export function codigoDoFarolPython(versao: VersaoDoFarolPython): string {
  const [ficha, regras] =
    versao === 'inicial'
      ? [FICHA_PYTHON_VAZIA, PYTHON_INICIAL]
      : versao === 'gabarito'
        ? [FICHA_PYTHON, PYTHON_GABARITO]
        : [
            ERROS_DO_FAROL_PYTHON[versao].ficha ? FICHA_PYTHON : FICHA_PYTHON_VAZIA,
            ERROS_DO_FAROL_PYTHON[versao].codigo,
          ]
  return `WIDTH = ${FAROL_TEXTO.largura}
HEIGHT = ${FAROL_TEXTO.altura}
TITLE = "Meu jogo do Arquipélago"

${ficha}

${regras}
`
}

export function montarProjetoPythonDoFarol(versao: VersaoDoFarolPython) {
  return projetoPythonClassico({
    id: 'farol-meu-jogo-python',
    nome: 'Meu jogo do Arquipélago',
    fonte: codigoDoFarolPython(versao),
    extensao: 'python-pgzero',
  })
}

export function CENARIOS_DO_FAROL_PYTHON() {
  return (Object.keys(ERROS_DO_FAROL_PYTHON) as (keyof typeof ERROS_DO_FAROL_PYTHON)[]).map(
    (erro) => ({
      nome: erro,
      projeto: montarProjetoPythonDoFarol(erro),
      ids: [...ERROS_DO_FAROL_PYTHON[erro].quebra],
      passa: false,
    }),
  )
}

// ── Pro (quadro 4) ──────────────────────────────────────────────────────────────────────────

const MODELO_PRO = 'vanilla-vite' as const
const FICHA_PRO_VAZIA = `/** A ficha do seu jogo: o objetivo e as três coisas que ele vai ter. */
export const ficha = {
  objetivo: '',
  funcionalidade1: '',
  funcionalidade2: '',
  funcionalidade3: '',
}`
const FICHA_PRO = `/** A ficha do seu jogo: o objetivo e as três coisas que ele vai ter. */
export const ficha = {
  objetivo: 'Pegar as estrelas que caem antes de o tempo acabar.',
  funcionalidade1: 'As estrelas caem em lugares sorteados.',
  funcionalidade2: 'Cada estrela pega vale um ponto.',
  funcionalidade3: 'A partida acaba em 30 segundos, e o R recomeça.',
}`

const PRO_INICIAL = `/** O estado do jogo. Acrescente aqui o que o seu jogo precisa lembrar. */
export const jogo = {
  guia: { x: ${FAROL_TEXTO.guia.x}, y: ${FAROL_TEXTO.guia.y} },
}

function passo(teclas: Set<string>) {
  if (teclas.has('ArrowRight')) jogo.guia.x += 4
  if (teclas.has('ArrowLeft')) jogo.guia.x -= 4
}

function tecla(nome: string) {
  // O que cada tecla faz, além de andar.
}

function clique(x: number, y: number) {
  // O que um clique faz.
}

function desenhar(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#1a2854'
  ctx.fillRect(0, 0, LARGURA, ALTURA)
  ctx.fillStyle = '#78dcc8'
  ctx.fillRect(jogo.guia.x, jogo.guia.y, LADO, LADO)
}`

const PRO_GABARITO = `/** O estado do jogo: o guia, as estrelas que caem, os pontos e o tempo. */
export const jogo = {
  guia: { x: ${FAROL_TEXTO.guia.x}, y: ${FAROL_TEXTO.guia.y} },
  estrelas: [] as { x: number; y: number }[],
  pontos: 0,
  tempo: 30,
  jogando: true,
}

setInterval(() => {
  if (!jogo.jogando) return
  jogo.estrelas.push({ x: 20 + Math.floor(Math.random() * 580), y: 0 })
  jogo.tempo -= 1
  if (jogo.tempo <= 0) jogo.jogando = false
}, 1000)

function passo(teclas: Set<string>) {
  if (!jogo.jogando) return
  if (teclas.has('ArrowRight')) jogo.guia.x += 4
  if (teclas.has('ArrowLeft')) jogo.guia.x -= 4
  for (const estrela of [...jogo.estrelas]) {
    estrela.y += 3
    const pegou =
      Math.abs(jogo.guia.x - estrela.x) < LADO && Math.abs(jogo.guia.y - estrela.y) < LADO
    if (pegou || estrela.y > ALTURA) {
      jogo.estrelas.splice(jogo.estrelas.indexOf(estrela), 1)
      if (pegou) jogo.pontos += 1
    }
  }
}

function tecla(nome: string) {
  if (nome === 'r') {
    jogo.guia.x = ${FAROL_TEXTO.guia.x}
    jogo.estrelas.length = 0
    jogo.pontos = 0
    jogo.tempo = 30
    jogo.jogando = true
  }
}

function clique(x: number, y: number) {
  // Clicar numa estrela a puxa para o chão, onde o guia pode pegar.
  for (const estrela of jogo.estrelas)
    if (Math.abs(x - estrela.x) < 24 && Math.abs(y - estrela.y) < 24) estrela.y = jogo.guia.y
}

function desenhar(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#1a2854'
  ctx.fillRect(0, 0, LARGURA, ALTURA)
  ctx.fillStyle = '#ffdc5a'
  for (const estrela of jogo.estrelas) {
    ctx.beginPath()
    ctx.arc(estrela.x + 12, estrela.y + 12, 12, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#78dcc8'
  ctx.fillRect(jogo.guia.x, jogo.guia.y, LADO, LADO)
  ctx.fillStyle = '#f2f4ff'
  ctx.font = '24px system-ui'
  ctx.fillText('Pontos: ' + jogo.pontos + '   Tempo: ' + jogo.tempo, 16, 32)
  if (!jogo.jogando) ctx.fillText('Fim. R recomeça.', 240, 240)
}`

export const ERROS_DO_FAROL_PRO = {
  'ficha-vazia': { quebra: ['objetivo', 'funcionalidades'], ficha: false, codigo: PRO_GABARITO },
  'quebra-no-espaco': {
    quebra: ['recomeca'],
    ficha: true,
    codigo: PRO_GABARITO.replace(
      `function tecla(nome: string) {
  if (nome === 'r') {`,
      `function tecla(nome: string) {
  if (nome === ' ') (jogo as unknown as { pulo: () => void }).pulo()
  if (nome === 'r') {`,
    ),
  },
  'sem-recomecar': {
    quebra: ['recomeca'],
    ficha: true,
    codigo: PRO_GABARITO.replace(`  if (nome === 'r') {`, `  if (nome === 'nunca') {`),
  },
} as const
export type VersaoDoFarolPro = 'inicial' | 'gabarito' | keyof typeof ERROS_DO_FAROL_PRO

/** `src/main.ts`: a janela, o laço, as teclas e o clique prontos; o jogo é da pessoa. */
function mainDoFarol(versao: VersaoDoFarolPro): string {
  const [ficha, regras] =
    versao === 'inicial'
      ? [FICHA_PRO_VAZIA, PRO_INICIAL]
      : versao === 'gabarito'
        ? [FICHA_PRO, PRO_GABARITO]
        : [
            ERROS_DO_FAROL_PRO[versao].ficha ? FICHA_PRO : FICHA_PRO_VAZIA,
            ERROS_DO_FAROL_PRO[versao].codigo,
          ]
  return `import './style.css'

const LADO = ${FAROL_TEXTO.lado}
const LARGURA = ${FAROL_TEXTO.largura}
const ALTURA = ${FAROL_TEXTO.altura}

${ficha}

${regras}

const tela = document.getElementById('jogo') as HTMLCanvasElement
const ctx = tela.getContext('2d') as CanvasRenderingContext2D
const teclas = new Set<string>()
document.addEventListener('keydown', (evento) => {
  teclas.add(evento.key)
  tecla(evento.key.toLowerCase())
})
document.addEventListener('keyup', (evento) => teclas.delete(evento.key))
tela.addEventListener('click', (evento) => {
  const caixa = tela.getBoundingClientRect()
  clique(evento.clientX - caixa.left, evento.clientY - caixa.top)
})

function quadro() {
  passo(teclas)
  desenhar(ctx)
  requestAnimationFrame(quadro)
}
requestAnimationFrame(quadro)
`
}

const INDEX_PRO = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Meu jogo do Arquipélago</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <canvas id="jogo" width="${FAROL_TEXTO.largura}" height="${FAROL_TEXTO.altura}"></canvas>
    <p>Setas andam. R recomeça.</p>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`
const ESTILO_PRO = `body { margin: 0; font-family: system-ui; background: #10183a; color: #f2f4ff; }
canvas { display: block; }
p { margin: 8px 12px; }
`

export function montarProjetoProDoFarol(versao: VersaoDoFarolPro): Project {
  const base = BASE_TREES[MODELO_PRO]
  if (!base) throw new Error('Modelo Pro ausente.')
  const tree: ProjectTree = {
    ...base,
    'index.html': { kind: 'file', content: INDEX_PRO },
    'src/main.ts': { kind: 'file', content: mainDoFarol(versao) },
    'src/style.css': { kind: 'file', content: ESTILO_PRO },
  }
  const projeto = buildProProject(
    'farol-meu-jogo-pro',
    'Meu jogo do Arquipélago',
    tree,
    'dev',
    MODELO_PRO,
  )
  return { ...projeto, createdAt: 0, updatedAt: 0 }
}

export function CENARIOS_DO_FAROL_PRO() {
  return (Object.keys(ERROS_DO_FAROL_PRO) as (keyof typeof ERROS_DO_FAROL_PRO)[]).map((erro) => ({
    nome: erro,
    projeto: montarProjetoProDoFarol(erro),
    ids: [...ERROS_DO_FAROL_PRO[erro].quebra],
    passa: false,
  }))
}

// ── Ponte (quadro 3) ────────────────────────────────────────────────────────────────────────

/** O mesmo projeto autoral dos blocos, aberto na Ponte: a pessoa escreve o JavaScript. */
export function montarProjetoPonteDoFarol(pronto: boolean): Project {
  return { ...projetoDoMeuJogo(pronto), mode: 'bridge' }
}

// ── Os critérios ────────────────────────────────────────────────────────────────────────────

const ROTULOS: Record<PublicoDoDesafio, Record<string, [string, string]>> = {
  kids: {
    objetivo: [
      'A ficha diz o objetivo do jogo.',
      'Escreva o objetivo entre as aspas: o que quem joga tenta fazer.',
    ],
    funcionalidades: [
      'A ficha diz as três coisas que o jogo vai ter.',
      'Escolha três coisas que cabem no jogo, uma em cada linha da ficha.',
    ],
    recomeca: [
      'A tecla R leva o guia de volta ao começo.',
      'Em R, volte o guia para onde ele começou e o resto da partida também.',
    ],
  },
  adulto: {
    objetivo: ['A ficha declara o objetivo do jogo.', 'Preencha o objetivo na ficha.'],
    funcionalidades: [
      'A ficha declara três funcionalidades.',
      'Preencha as três funcionalidades planejadas.',
    ],
    recomeca: ['R devolve o guia à posição inicial.', 'Reinicie a partida em R, inclusive o guia.'],
  },
}
const direita = (ms: number) => ({ action: 'press' as const, key: 'ArrowRight', holdMs: ms })
const r = { action: 'press' as const, key: 'r', holdMs: 80 }
const esperar = { action: 'wait' as const, ms: 300 }
const passos = {
  objetivo: [esperar],
  funcionalidades: [esperar],
  recomeca: [
    direita(800),
    { action: 'press' as const, key: 'ArrowLeft', holdMs: 400 },
    { action: 'press' as const, key: 'Space', holdMs: 120 },
    { action: 'click' as const, x: 320, y: 240 },
    { action: 'wait' as const, ms: 1200 },
    direita(1500),
    r,
    esperar,
  ],
}
type Alvo = { kind: 'value'; path: string } | { kind: 'moduleValue'; module: string; path: string }
const expectativa = (target: Alvo, compare: 'lessThan' | 'truthy', value?: number | string) => ({
  target,
  compare,
  ...(value === undefined ? {} : { value }),
})

export function objetivosDoFarolPython(publico: PublicoDoDesafio): SectionPythonProjectCheck[] {
  const objetivo = (
    id: keyof typeof passos,
    expect: ReturnType<typeof expectativa>,
  ): SectionPythonProjectCheck => {
    const [label, hint] = ROTULOS[publico][id]!
    return {
      id,
      label,
      hint,
      programmingLanguage: 'python',
      profileId: AMBIENTE_PYTHON_C02.profileId,
      rule: {
        type: 'behavior',
        steps: passos[id],
        expect,
      },
    } as SectionPythonProjectCheck
  }
  return [
    objetivo('objetivo', expectativa({ kind: 'value', path: 'OBJETIVO' }, 'truthy')),
    objetivo('funcionalidades', expectativa({ kind: 'value', path: 'FUNCIONALIDADE_3' }, 'truthy')),
    objetivo('recomeca', expectativa({ kind: 'value', path: 'guia.x' }, 'lessThan', 100)),
  ]
}

export function objetivosDoFarolPro(publico: PublicoDoDesafio): SectionJavaScriptProjectCheck[] {
  const modulo = (path: string): Alvo => ({ kind: 'moduleValue', module: 'src/main.ts', path })
  const objetivo = (
    id: keyof typeof passos,
    expect: ReturnType<typeof expectativa>,
  ): SectionJavaScriptProjectCheck => {
    const [label, hint] = ROTULOS[publico][id]!
    return {
      id,
      label,
      hint,
      programmingLanguage: 'javascript',
      rule: {
        type: 'behavior',
        steps: [{ action: 'wait', ms: 300 }, ...passos[id]],
        expect,
      },
    } as SectionJavaScriptProjectCheck
  }
  return [
    objetivo('objetivo', expectativa(modulo('ficha.objetivo'), 'truthy')),
    objetivo('funcionalidades', expectativa(modulo('ficha.funcionalidade3'), 'truthy')),
    objetivo('recomeca', expectativa(modulo('jogo.guia.x'), 'lessThan', 100)),
  ]
}

/** A Ponte usa os mesmos critérios causais dos blocos (o projeto é o mesmo, lido do JavaScript). */
export const objetivosDoFarolPonte = objetivosDoMeuJogo
