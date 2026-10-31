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
 * Nas linguagens de texto, a cena vem pronta (o guia à esquerda, andando com as setas, e a estrela
 * no caminho dele, à direita) e o jogo é da pessoa: encontrar, lembrar, decidir e recomeçar. Os
 * critérios rodam o jogo de verdade, olhando os mesmos três nomes que a cena já traz (`guia`,
 * `estrela` e `pontos`): passar pela estrela soma um ponto uma vez só, R leva o guia de volta ao
 * começo e, depois do R, a estrela pode ser pega de novo, com os pontos começando do zero. O andar
 * vem pronto porque é ele que separa "recomeçou" de "nunca saiu do lugar".
 */
export const FAROL_TEXTO = {
  guia: { x: 60, y: 220 },
  estrela: { x: 420, y: 220 },
  lado: 40,
  passo: 4,
  largura: 640,
  altura: 480,
} as const

// ── Python (quadro 2) ───────────────────────────────────────────────────────────────────────

const PYTHON = {
  inicial: `def update():
    if keyboard.right:
        guia.x = guia.x + 4
    if keyboard.left:
        guia.x = guia.x - 4


def on_key_down(key):
    pass`,
  gabarito: `pegou = False


def update():
    global pontos, pegou
    if keyboard.right:
        guia.x = guia.x + 4
    if keyboard.left:
        guia.x = guia.x - 4
    if guia.colliderect(estrela) and not pegou:
        pegou = True
        pontos = pontos + 1
        estrela.x = 700


def on_key_down(key):
    global pontos, pegou
    if key == keys.R:
        pontos = 0
        pegou = False
        guia.x = 60
        estrela.x = 420`,
} as const

/** Programas errados que o executor precisa recusar, cada um no lugar do gabarito. */
export const ERROS_DO_FAROL_PYTHON = {
  'conta-sem-lembrar': {
    quebra: ['encontro'],
    codigo: `def update():
    global pontos
    if keyboard.right:
        guia.x = guia.x + 4
    if keyboard.left:
        guia.x = guia.x - 4
    if guia.colliderect(estrela):
        pontos = pontos + 1


def on_key_down(key):
    global pontos
    if key == keys.R:
        pontos = 0
        guia.x = 60`,
  },
  'sem-recomecar': {
    quebra: ['recomeca'],
    codigo: PYTHON.gabarito.replace(
      `    if key == keys.R:
        pontos = 0
        pegou = False
        guia.x = 60
        estrela.x = 420`,
      `    pass`,
    ),
  },
  'recomeca-sem-esquecer': {
    quebra: ['outra-partida'],
    codigo: PYTHON.gabarito.replace(
      `        pontos = 0
        pegou = False
        guia.x = 60`,
      `        pontos = 0
        guia.x = 60`,
    ),
  },
} as const
export type VersaoDoFarolPython = 'inicial' | 'gabarito' | keyof typeof ERROS_DO_FAROL_PYTHON

export function codigoDoFarolPython(versao: VersaoDoFarolPython): string {
  const regras =
    versao === 'inicial' || versao === 'gabarito'
      ? PYTHON[versao]
      : ERROS_DO_FAROL_PYTHON[versao].codigo
  return `WIDTH = ${FAROL_TEXTO.largura}
HEIGHT = ${FAROL_TEXTO.altura}
TITLE = "Meu jogo do Arquipélago"

guia = Rect((${FAROL_TEXTO.guia.x}, ${FAROL_TEXTO.guia.y}), (${FAROL_TEXTO.lado}, ${FAROL_TEXTO.lado}))
estrela = Rect((${FAROL_TEXTO.estrela.x}, ${FAROL_TEXTO.estrela.y}), (${FAROL_TEXTO.lado}, ${FAROL_TEXTO.lado}))
pontos = 0


${regras}


def draw():
    screen.fill((26, 40, 84))
    screen.draw.filled_circle(estrela.center, 18, (255, 220, 90))
    screen.draw.filled_rect(guia, (120, 220, 200))
    screen.draw.text("Pontos: " + str(pontos), (16, 12), fontsize=32)
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
      ids: ERROS_DO_FAROL_PYTHON[erro].quebra,
      passa: false,
    }),
  )
}

// ── Pro (quadro 4) ──────────────────────────────────────────────────────────────────────────

const MODELO_PRO = 'vanilla-vite' as const
const PRO = {
  inicial: `function passo(teclas: Set<string>) {
  if (teclas.has('ArrowRight')) jogo.guia.x += 4
  if (teclas.has('ArrowLeft')) jogo.guia.x -= 4
  // As regras do seu jogo: encontrar, lembrar e decidir.
}

function tecla(nome: string) {
  // O que cada tecla faz, além de andar.
}`,
  gabarito: `let pegou = false

function passo(teclas: Set<string>) {
  if (teclas.has('ArrowRight')) jogo.guia.x += 4
  if (teclas.has('ArrowLeft')) jogo.guia.x -= 4
  const encostou =
    Math.abs(jogo.guia.x - jogo.estrela.x) < LADO && Math.abs(jogo.guia.y - jogo.estrela.y) < LADO
  if (encostou && !pegou) {
    pegou = true
    jogo.pontos += 1
    jogo.estrela.x = 700
  }
}

function tecla(nome: string) {
  if (nome === 'r') {
    jogo.pontos = 0
    pegou = false
    jogo.guia.x = ${FAROL_TEXTO.guia.x}
    jogo.estrela.x = ${FAROL_TEXTO.estrela.x}
  }
}`,
} as const

export const ERROS_DO_FAROL_PRO = {
  'conta-sem-lembrar': {
    quebra: ['encontro'],
    codigo: `function passo(teclas: Set<string>) {
  if (teclas.has('ArrowRight')) jogo.guia.x += 4
  if (teclas.has('ArrowLeft')) jogo.guia.x -= 4
  const encostou =
    Math.abs(jogo.guia.x - jogo.estrela.x) < LADO && Math.abs(jogo.guia.y - jogo.estrela.y) < LADO
  if (encostou) jogo.pontos += 1
}

function tecla(nome: string) {
  if (nome === 'r') {
    jogo.pontos = 0
    jogo.guia.x = ${FAROL_TEXTO.guia.x}
  }
}`,
  },
  'sem-recomecar': {
    quebra: ['recomeca'],
    codigo: PRO.gabarito.replace(
      `function tecla(nome: string) {
  if (nome === 'r') {`,
      `function tecla(nome: string) {
  if (nome === 'nunca') {`,
    ),
  },
  'recomeca-sem-esquecer': {
    quebra: ['outra-partida'],
    codigo: PRO.gabarito.replace(
      `    jogo.pontos = 0
    pegou = false`,
      `    jogo.pontos = 0`,
    ),
  },
} as const
export type VersaoDoFarolPro = 'inicial' | 'gabarito' | keyof typeof ERROS_DO_FAROL_PRO

/** `src/main.ts`: a cena, o laço e o desenho prontos; as regras são da pessoa. */
function mainDoFarol(versao: VersaoDoFarolPro): string {
  const regras =
    versao === 'inicial' || versao === 'gabarito' ? PRO[versao] : ERROS_DO_FAROL_PRO[versao].codigo
  return `import './style.css'

const LADO = ${FAROL_TEXTO.lado}

/** O estado do jogo: o guia, a estrela e os pontos. */
export const jogo = {
  guia: { x: ${FAROL_TEXTO.guia.x}, y: ${FAROL_TEXTO.guia.y} },
  estrela: { x: ${FAROL_TEXTO.estrela.x}, y: ${FAROL_TEXTO.estrela.y} },
  pontos: 0,
}

${regras}

const tela = document.getElementById('jogo') as HTMLCanvasElement
const ctx = tela.getContext('2d') as CanvasRenderingContext2D
const placar = document.getElementById('placar') as HTMLElement
const teclas = new Set<string>()
document.addEventListener('keydown', (evento) => {
  teclas.add(evento.key)
  tecla(evento.key.toLowerCase())
})
document.addEventListener('keyup', (evento) => teclas.delete(evento.key))

function desenhar() {
  ctx.fillStyle = '#1a2854'
  ctx.fillRect(0, 0, tela.width, tela.height)
  ctx.fillStyle = '#ffdc5a'
  ctx.beginPath()
  ctx.arc(jogo.estrela.x + LADO / 2, jogo.estrela.y + LADO / 2, 18, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#78dcc8'
  ctx.fillRect(jogo.guia.x, jogo.guia.y, LADO, LADO)
  placar.textContent = 'Pontos: ' + jogo.pontos
}

function quadro() {
  passo(teclas)
  desenhar()
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
    <p id="placar"></p>
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
    ids: ERROS_DO_FAROL_PRO[erro].quebra,
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
    encontro: [
      'Passar pela estrela soma um ponto, uma vez só.',
      'Guarde que a estrela já foi pega e use essa lembrança para não contar de novo.',
    ],
    recomeca: [
      'A tecla R leva o guia de volta ao começo.',
      'Em R, volte a posição do guia para onde ele começou.',
    ],
    'outra-partida': [
      'Depois do R, a estrela pode ser pega de novo, com os pontos começando do zero.',
      'Volte também o que a partida mudou: os pontos, a lembrança da estrela e o lugar dela.',
    ],
    some: [
      'Extra: a estrela sai da tela quando é pega.',
      'Leve a estrela para fora da tela, por exemplo para x 700.',
    ],
  },
  adulto: {
    encontro: [
      'A colisão com a estrela soma um ponto uma única vez.',
      'Mantenha uma flag de coleta e teste-a antes de pontuar.',
    ],
    recomeca: ['R devolve o guia à posição inicial.', 'Restaure guia.x em R.'],
    'outra-partida': [
      'Após R, a estrela pode ser coletada de novo, com a pontuação recomeçando em zero.',
      'Reinicie pontos, a flag de coleta e a posição da estrela.',
    ],
    some: [
      'Extra: a estrela sai da área visível quando é coletada.',
      'Mova a estrela para fora da tela (x 700).',
    ],
  },
}
const direita = (ms: number) => ({ action: 'press' as const, key: 'ArrowRight', holdMs: ms })
const r = { action: 'press' as const, key: 'r', holdMs: 80 }
const esperar = { action: 'wait' as const, ms: 300 }
const passos = {
  encontro: [direita(2500), esperar],
  recomeca: [direita(2500), r, esperar],
  'outra-partida': [direita(2500), r, esperar, direita(2500), esperar],
  some: [direita(2500), esperar],
}

export function objetivosDoFarolPython(publico: PublicoDoDesafio): SectionPythonProjectCheck[] {
  const objetivo = (
    id: keyof typeof passos,
    path: string,
    compare: 'lessThan' | 'equals' | 'atLeast',
    value: number,
    optional = false,
  ): SectionPythonProjectCheck => {
    const [label, hint] = ROTULOS[publico][id]!
    return {
      id,
      label,
      hint,
      ...(optional ? { optional: true as const } : {}),
      programmingLanguage: 'python',
      profileId: AMBIENTE_PYTHON_C02.profileId,
      rule: {
        type: 'behavior',
        steps: passos[id],
        expect: { target: { kind: 'value', path }, compare, value },
      },
    }
  }
  return [
    objetivo('encontro', 'pontos', 'equals', 1),
    objetivo('recomeca', 'guia.x', 'lessThan', 100),
    objetivo('outra-partida', 'pontos', 'equals', 1),
    objetivo('some', 'estrela.x', 'atLeast', FAROL_TEXTO.largura, true),
  ]
}

export function objetivosDoFarolPro(publico: PublicoDoDesafio): SectionJavaScriptProjectCheck[] {
  const objetivo = (
    id: keyof typeof passos,
    path: string,
    compare: 'lessThan' | 'equals' | 'atLeast',
    value: number,
    optional = false,
  ): SectionJavaScriptProjectCheck => {
    const [label, hint] = ROTULOS[publico][id]!
    return {
      id,
      label,
      hint,
      ...(optional ? { optional: true as const } : {}),
      programmingLanguage: 'javascript',
      rule: {
        type: 'behavior',
        steps: [{ action: 'wait', ms: 300 }, ...passos[id]],
        expect: { target: { kind: 'moduleValue', module: 'src/main.ts', path }, compare, value },
      },
    }
  }
  return [
    objetivo('encontro', 'jogo.pontos', 'equals', 1),
    objetivo('recomeca', 'jogo.guia.x', 'lessThan', 100),
    objetivo('outra-partida', 'jogo.pontos', 'equals', 1),
    objetivo('some', 'jogo.estrela.x', 'atLeast', FAROL_TEXTO.largura, true),
  ]
}

/** A Ponte usa os mesmos critérios causais dos blocos (o projeto é o mesmo, lido do JavaScript). */
export const objetivosDoFarolPonte = objetivosDoMeuJogo
