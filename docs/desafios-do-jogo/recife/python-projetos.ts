import { projetoPythonClassico } from '../ambiente-python'

/**
 * C02 (30/10/2026): a Mira de bolhas na linguagem do Explorador, Python com Pygame Zero. Desde a
 * revisão de 31/10/2026 (A45) o tema é da própria ilha: na lagoa do Recife, a Maré solta bolhas
 * com mudas de coral. Desde as lacunas de 01/11/2026 os critérios também são próprios, e não a
 * lista da missão do posto (o Resgate dos Vagalumes pede clique no alvo, clique fora, nova
 * posição, tempo, fim e reinício): aqui a muda vai para o coral de onde a bolha subiu (estado por
 * coral), a bolha que ninguém clica estoura e conta como perdida (tempo de cada bolha) e a maré
 * vira com três perdidas (fim por falhas, não por tempo). Mesmo repertório do posto: leitura,
 * nomes, valores, indentação, eventos, clique, estado, sorteio e tempo. Sem listas e sem classes.
 * O sorteio usa uma semente fixa (a lagoa começa sempre igual), para o executor saber de onde cada
 * bolha sobe: com a semente 7, a primeira sobe do coral 2, depois do 1, depois do 2.
 */

/** Medidas do jogo. A bolha começa na areia e os corais ficam no alto. */
export const RECIFE_PYTHON = {
  inicio: [280, 360],
  corais: [
    [80, 120],
    [280, 80],
    [480, 120],
  ],
  lado: 80,
  /** Quanto tempo (s) a bolha espera um clique antes de estourar. */
  vida: 2,
  semente: 7,
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
    global mudas1, mudas2, mudas3
    if jogando and bolha.collidepoint(pos):
        if coral == 1:
            mudas1 = mudas1 + 1
        elif coral == 2:
            mudas2 = mudas2 + 1
        elif coral == 3:
            mudas3 = mudas3 + 1
        sortear_coral()`,
  },
  relogio: {
    inicial: `def update(dt):
    pass`,
    gabarito: `def update(dt):
    global vida, perdidas, jogando
    if jogando and coral > 0:
        vida = vida - dt
        if vida <= 0:
            perdidas = perdidas + 1
            if perdidas >= 3:
                jogando = False
            else:
                sortear_coral()`,
  },
  recomecar: {
    inicial: `def on_key_down(key):
    pass`,
    gabarito: `def on_key_down(key):
    global coral, mudas1, mudas2, mudas3, perdidas, jogando
    if key == keys.R:
        coral = 0
        mudas1 = 0
        mudas2 = 0
        mudas3 = 0
        perdidas = 0
        jogando = True
        bolha.topleft = (280, 360)`,
  },
} as const
type Parte = keyof typeof PARTES

/** Programas errados que o executor precisa recusar, cada um trocando uma parte do gabarito. */
export const ERROS_DO_RECIFE_PYTHON = {
  'muda-sempre-no-primeiro': {
    parte: 'clique',
    quebra: ['plantar', 'coral-certo'],
    codigo: `def on_mouse_down(pos):
    global mudas1
    if jogando and bolha.collidepoint(pos):
        if coral > 0:
            mudas1 = mudas1 + 1
        sortear_coral()`,
  },
  'bolha-nao-estoura': {
    parte: 'relogio',
    quebra: ['estoura', 'fim'],
    codigo: `def update(dt):
    pass`,
  },
  'mare-nao-vira': {
    parte: 'relogio',
    quebra: ['fim'],
    codigo: `def update(dt):
    global vida, perdidas
    if jogando and coral > 0:
        vida = vida - dt
        if vida <= 0:
            perdidas = perdidas + 1
            sortear_coral()`,
  },
  'r-nao-zera': {
    parte: 'recomecar',
    quebra: ['recomecar'],
    codigo: `def on_key_down(key):
    global jogando
    if key == keys.R:
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

# A lagoa começa sempre do mesmo jeito.
random.seed(${RECIFE_PYTHON.semente})

VIDA = ${RECIFE_PYTHON.vida}
bolha = Rect((280, 360), (80, 80))
coral = 0
mudas1 = 0
mudas2 = 0
mudas3 = 0
perdidas = 0
vida = VIDA
jogando = True


def sortear_coral():
    global coral, vida
    coral = random.randint(1, 3)
    vida = VIDA
    if coral == 1:
        bolha.topleft = (80, 120)
    elif coral == 2:
        bolha.topleft = (280, 80)
    else:
        bolha.topleft = (480, 120)


${trecho('clique', versao)}


${trecho('relogio', versao)}


${trecho('recomecar', versao)}


def draw():
    screen.fill((18, 72, 110))
    screen.draw.filled_rect(Rect((0, 440), (640, 40)), (214, 190, 140))
    screen.draw.filled_circle((120, 160), 52, (232, 120, 120))
    screen.draw.filled_circle((320, 120), 52, (240, 160, 96))
    screen.draw.filled_circle((520, 160), 52, (196, 120, 200))
    screen.draw.text(str(mudas1), center=(120, 230), fontsize=32)
    screen.draw.text(str(mudas2), center=(320, 190), fontsize=32)
    screen.draw.text(str(mudas3), center=(520, 230), fontsize=32)
    screen.draw.filled_circle(bolha.center, 40, (170, 220, 245))
    screen.draw.circle(bolha.center, 40, (255, 255, 255))
    screen.draw.filled_circle(bolha.center, 12, (120, 210, 150))
    screen.draw.text("Perdidas: " + str(perdidas), (470, 16), fontsize=32)
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
