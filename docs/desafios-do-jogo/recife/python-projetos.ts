import { projetoPythonClassico } from '../ambiente-python'

/**
 * C02 (30/10/2026): a Mira de bolhas na linguagem do Explorador, Python com Pygame Zero. Desde a
 * revisão de 31/10/2026 (A45) o tema é da própria ilha, e não da missão do posto: na lagoa do
 * Recife, a Maré solta bolhas com mudas de coral; clicar na bolha planta a muda e a bolha seguinte
 * sobe de um dos três corais. Repertório do posto: leitura, nomes, valores,
 * indentação, eventos, clique dentro e fora, estado, sorteio e tempo. Sem listas e sem classes:
 * a bolha é um `Rect` do Pygame Zero (ponto e área), e as corais saem de um `if/elif` com
 * `random.randint`. O desenho é feito com `screen.draw`, sem imagens.
 */

/** Medidas do jogo. A bolha começa na areia e as corais ficam no alto. */
export const RECIFE_PYTHON = {
  inicio: [280, 360],
  corais: [
    [80, 120],
    [280, 80],
    [480, 120],
  ],
  lado: 80,
  duracao: 7,
} as const

const centro = ([x, y]: readonly [number, number]) =>
  [x + RECIFE_PYTHON.lado / 2, y + RECIFE_PYTHON.lado / 2] as const
/** Onde clicar para acertar a bolha no começo e em cada coral. */
export const CLIQUES = {
  inicio: centro(RECIFE_PYTHON.inicio),
  corais: RECIFE_PYTHON.corais.map(centro),
  agua: [40, 300] as const,
}

const PARTES = {
  clique: {
    inicial: `def on_mouse_down(pos):
    pass`,
    gabarito: `def on_mouse_down(pos):
    global plantadas
    if jogando and bolha.collidepoint(pos):
        plantadas = plantadas + 1
        sortear_coral()`,
  },
  sorteio: {
    inicial: `def sortear_coral():
    pass`,
    gabarito: `def sortear_coral():
    numero = random.randint(1, 3)
    if numero == 1:
        bolha.topleft = (80, 120)
    elif numero == 2:
        bolha.topleft = (280, 80)
    else:
        bolha.topleft = (480, 120)`,
  },
  relogio: {
    inicial: `def update(dt):
    pass`,
    gabarito: `def update(dt):
    global tempo, jogando
    if jogando:
        tempo = tempo - dt
        if tempo <= 0:
            tempo = 0
            jogando = False`,
  },
  recomecar: {
    inicial: `def on_key_down(key):
    pass`,
    gabarito: `def on_key_down(key):
    global plantadas, tempo, jogando
    if key == keys.R:
        plantadas = 0
        tempo = DURACAO
        jogando = True
        bolha.topleft = (280, 360)`,
  },
} as const
type Parte = keyof typeof PARTES

/** Programas errados que o executor precisa recusar, cada um trocando uma parte do gabarito. */
export const ERROS_DO_RECIFE_PYTHON = {
  'conta-qualquer-clique': {
    parte: 'clique',
    quebra: ['acertar'],
    codigo: `def on_mouse_down(pos):
    global plantadas
    if jogando:
        plantadas = plantadas + 1
        sortear_coral()`,
  },
  'bolha-nao-muda-de-lugar': {
    parte: 'sorteio',
    quebra: ['sortear'],
    codigo: `def sortear_coral():
    bolha.topleft = (280, 360)`,
  },
  'relogio-parado': {
    parte: 'relogio',
    quebra: ['relogio'],
    codigo: `def update(dt):
    pass`,
  },
  'rodada-sem-fim': {
    parte: 'relogio',
    quebra: ['fim'],
    codigo: `def update(dt):
    global tempo
    tempo = tempo - dt`,
  },
  'r-sem-voltar-a-bolha': {
    parte: 'recomecar',
    quebra: ['recomecar'],
    codigo: `def on_key_down(key):
    global plantadas, tempo, jogando
    if key == keys.R:
        plantadas = 0
        tempo = DURACAO
        jogando = True`,
  },
} as const satisfies Record<string, { parte: Parte; quebra: readonly string[]; codigo: string }>
export type ErroDoRecifePython = keyof typeof ERROS_DO_RECIFE_PYTHON
export type VersaoDoRecifePython = 'inicial' | 'gabarito' | ErroDoRecifePython

function trecho(parte: Parte, versao: VersaoDoRecifePython): string {
  if (versao === 'inicial' || versao === 'gabarito') return PARTES[parte][versao]
  const erro = ERROS_DO_RECIFE_PYTHON[versao]
  return erro.parte === parte ? erro.codigo : PARTES[parte].gabarito
}

/** O `main.py` que a pessoa lê e completa. */
export function codigoDoRecife(versao: VersaoDoRecifePython): string {
  return `import random

WIDTH = 640
HEIGHT = 480
TITLE = "Bolhas da lagoa"

DURACAO = ${RECIFE_PYTHON.duracao}
bolha = Rect((280, 360), (80, 80))
plantadas = 0
tempo = DURACAO
jogando = True


${trecho('sorteio', versao)}


${trecho('clique', versao)}


${trecho('relogio', versao)}


${trecho('recomecar', versao)}


def draw():
    screen.fill((18, 72, 110))
    screen.draw.filled_rect(Rect((0, 440), (640, 40)), (214, 190, 140))
    screen.draw.filled_circle((120, 160), 52, (232, 120, 120))
    screen.draw.filled_circle((320, 120), 52, (240, 160, 96))
    screen.draw.filled_circle((520, 160), 52, (196, 120, 200))
    screen.draw.filled_circle(bolha.center, 40, (170, 220, 245))
    screen.draw.circle(bolha.center, 40, (255, 255, 255))
    screen.draw.filled_circle(bolha.center, 12, (120, 210, 150))
    screen.draw.text("Mudas plantadas: " + str(plantadas), (20, 16), fontsize=32)
    screen.draw.text("Tempo: " + str(int(tempo)), (500, 16), fontsize=32)
    if not jogando:
        screen.draw.text("A maré virou. Aperte R para recomeçar.", center=(320, 280), fontsize=36)
`
}

export function montarProjetoPython(versao: VersaoDoRecifePython) {
  return projetoPythonClassico({
    id: 'recife-mira-python',
    nome: 'Bolhas da lagoa',
    fonte: codigoDoRecife(versao),
    extensao: 'python-pgzero',
  })
}

/** Os cenários negativos da prova no executor real (o gabarito e o inicial vêm do manifesto). */
export function CENARIOS_DO_RECIFE() {
  return (Object.keys(ERROS_DO_RECIFE_PYTHON) as ErroDoRecifePython[]).map((erro) => ({
    nome: erro,
    projeto: montarProjetoPython(erro),
    ids: ERROS_DO_RECIFE_PYTHON[erro].quebra,
    passa: false,
  }))
}
