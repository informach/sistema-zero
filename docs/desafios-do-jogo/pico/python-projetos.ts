import { projetoPythonClassico } from '../ambiente-python'

/**
 * C02 (30/10/2026): a Fase de plataforma do Pico na linguagem do Mestre, Python com Pygame Zero.
 * Desde a revisão de 31/10/2026 (A45) o tema é da ilha: o Floco sobe a montanha, um trecho da
 * trilha por fase. As fases são DADOS (listas de linhas de texto, uma letra por célula de 40
 * pontos), lidas por `ler_fase`, e a queda é resolvida por `pousar`, as duas prontas. Desde as
 * lacunas de 01/11/2026 os critérios são próprios, e não a lista da missão do posto (a Entrega
 * pelos Telhados pede pousar, fase vinda de dados e saída só com a encomenda): aqui a pessoa
 * completa `contar` (quantos flocos a fase tem, com laços sobre os dados), `escorregar` (o atrito
 * do gelo, uma função que recebe informações) e `trecho_completo` (o trecho só termina com todos
 * os flocos); no extra, `melhor` (o menor tempo de uma lista). Mesmo repertório do posto:
 * funções, parâmetros, listas, fase como dados e depuração com casos pequenos. Sem classes.
 */

const FASE_1 = [
  '................',
  '................',
  '................',
  '..............S.',
  '...........#####',
  '.........*......',
  '......####......',
  '.*..............',
  '####............',
  '................',
  '.J..*...........',
  '################',
]
const FASE_2 = [
  '................',
  '..S.............',
  '#####...........',
  '..........*.....',
  '.......####.....',
  '................',
  '............####',
  '..........*.....',
  '......#####.....',
  '................',
  '.J..............',
  '################',
]
/** Quantos flocos (`*`) a fase 1 tem: o jogo conta com `contar`. */
export const FLOCOS_DA_FASE_1 = FASE_1.join('')
  .split('')
  .filter((c) => c === '*').length

const fase = (linhas: readonly string[]) =>
  `    [\n${linhas.map((linha) => `        "${linha}",`).join('\n')}\n    ],`

const PARTES = {
  contar: {
    inicial: `def contar(linhas, letra):
    return 0`,
    gabarito: `def contar(linhas, letra):
    total = 0
    for texto in linhas:
        for celula in texto:
            if celula == letra:
                total = total + 1
    return total`,
  },
  escorregar: {
    inicial: `def escorregar(vx, no_gelo):
    return vx`,
    gabarito: `def escorregar(vx, no_gelo):
    if not no_gelo:
        return 0
    if vx > 0:
        return vx - 1
    if vx < 0:
        return vx + 1
    return 0`,
  },
  trecho: {
    inicial: `def trecho_completo(pegos, total):
    return False`,
    gabarito: `def trecho_completo(pegos, total):
    return pegos >= total`,
  },
  melhor: {
    inicial: `def melhor(tempos):
    return 0`,
    gabarito: `def melhor(tempos):
    menor = tempos[0]
    for tempo in tempos:
        if tempo < menor:
            menor = tempo
    return menor`,
  },
} as const
type Parte = keyof typeof PARTES

/** Programas errados que o executor precisa recusar, cada um trocando uma parte do gabarito. */
export const ERROS_DO_PICO_PYTHON = {
  'conta-so-a-primeira-linha': {
    parte: 'contar',
    quebra: ['contar', 'flocos-da-fase'],
    codigo: `def contar(linhas, letra):
    total = 0
    for celula in linhas[0]:
        if celula == letra:
            total = total + 1
    return total`,
  },
  'para-de-uma-vez': {
    parte: 'escorregar',
    quebra: ['escorregar'],
    codigo: `def escorregar(vx, no_gelo):
    return 0`,
  },
  'escorrega-fora-do-gelo': {
    parte: 'escorregar',
    quebra: ['escorregar'],
    codigo: `def escorregar(vx, no_gelo):
    if vx > 0:
        return vx - 1
    if vx < 0:
        return vx + 1
    return 0`,
  },
  'basta-um-floco': {
    parte: 'trecho',
    quebra: ['trecho'],
    codigo: `def trecho_completo(pegos, total):
    return pegos >= 1`,
  },
} as const satisfies Record<string, { parte: Parte; quebra: readonly string[]; codigo: string }>
export type ErroDoPicoPython = keyof typeof ERROS_DO_PICO_PYTHON
export type VersaoDoPicoPython = 'inicial' | 'gabarito' | ErroDoPicoPython

function trecho(parte: Parte, versao: VersaoDoPicoPython): string {
  if (versao === 'inicial' || versao === 'gabarito') return PARTES[parte][versao]
  const erro = ERROS_DO_PICO_PYTHON[versao]
  return erro.parte === parte ? erro.codigo : PARTES[parte].gabarito
}

/** O `main.py` que a pessoa lê e completa. */
export function codigoDoPico(versao: VersaoDoPicoPython): string {
  return `WIDTH = 640
HEIGHT = 480
TITLE = "A subida do Floco"

LADO = 40
GRAVIDADE = 0.5
PULO = -12
PASSO = 4

FASES = [
${[fase(FASE_1), fase(FASE_2)].join('\n')}
]


def ler_fase(linhas, letra):
    achados = []
    for linha, texto in enumerate(linhas):
        for coluna, celula in enumerate(texto):
            if celula == letra:
                achados.append([coluna, linha])
    return achados


def pousar(pe_antes, pe_depois, vy, topo):
    if vy > 0 and pe_antes <= topo and pe_depois >= topo:
        return [topo, 0]
    return [pe_depois, vy]


${trecho('contar', versao)}


${trecho('escorregar', versao)}


${trecho('trecho', versao)}


${trecho('melhor', versao)}


def montar(numero):
    global plataformas, flocos, saida, pegos, total, vy, vx, no_chao, tempo
    linhas = FASES[numero]
    plataformas = []
    for coluna, linha in ler_fase(linhas, "#"):
        plataformas.append(Rect((coluna * LADO, linha * LADO), (LADO, LADO)))
    flocos = ler_fase(linhas, "*")
    total = contar(linhas, "*")
    pegos = 0
    saidas = ler_fase(linhas, "S")
    saida = saidas[0] if saidas else [15, 10]
    inicio = ler_fase(linhas, "J")
    comeco = inicio[0] if inicio else [1, 10]
    floco.topleft = (comeco[0] * LADO + 8, comeco[1] * LADO + 8)
    vy = 0
    vx = 0
    no_chao = False
    tempo = 0


floco = Rect((48, 408), (24, 32))
fase_atual = 0
venceu = False
plataformas = []
flocos = []
saida = [15, 10]
pegos = 0
total = 0
vy = 0
vx = 0
no_chao = False
tempo = 0
tempos = []
montar(fase_atual)


def celula(rect):
    return [int(rect.centerx // LADO), int(rect.centery // LADO)]


def update():
    global vy, vx, no_chao, pegos, fase_atual, venceu, tempo
    if venceu:
        return
    tempo = tempo + 1 / 60
    if keyboard.left:
        vx = -PASSO
    elif keyboard.right:
        vx = PASSO
    else:
        vx = escorregar(vx, no_chao)
    floco.x = floco.x + vx
    for plataforma in plataformas:
        if floco.colliderect(plataforma):
            if floco.centerx < plataforma.centerx:
                floco.right = plataforma.left
            else:
                floco.left = plataforma.right
    floco.x = max(0, min(WIDTH - floco.width, floco.x))
    if keyboard.space and no_chao:
        vy = PULO
    vy = vy + GRAVIDADE
    pe_antes = floco.bottom
    pe_depois = pe_antes + vy
    no_chao = False
    for plataforma in plataformas:
        if floco.right > plataforma.left and floco.left < plataforma.right:
            pe, nova_vy = pousar(pe_antes, pe_depois, vy, plataforma.top)
            if nova_vy == 0 and vy > 0:
                pe_depois = pe
                no_chao = True
    vy = 0 if no_chao else vy
    floco.bottom = int(pe_depois)
    if floco.bottom > HEIGHT:
        montar(fase_atual)
    if celula(floco) in flocos:
        flocos.remove(celula(floco))
        pegos = pegos + 1
    if celula(floco) == saida and trecho_completo(pegos, total):
        tempos.append(int(tempo))
        if fase_atual + 1 >= len(FASES):
            venceu = True
        else:
            fase_atual = fase_atual + 1
            montar(fase_atual)


def draw():
    screen.fill((200, 226, 245))
    for plataforma in plataformas:
        screen.draw.filled_rect(plataforma, (236, 244, 250))
        screen.draw.rect(plataforma, (120, 160, 190))
    for coluna, linha in flocos:
        screen.draw.filled_circle((coluna * LADO + 20, linha * LADO + 20), 9, (255, 255, 255))
        screen.draw.circle((coluna * LADO + 20, linha * LADO + 20), 9, (110, 160, 210))
    screen.draw.filled_rect(Rect((saida[0] * LADO + 8, saida[1] * LADO), (24, 40)), (150, 100, 60))
    screen.draw.filled_rect(floco, (245, 250, 255))
    screen.draw.rect(floco, (60, 90, 140))
    screen.draw.text("Trecho " + str(fase_atual + 1) + " de " + str(len(FASES)), (16, 12), fontsize=30)
    screen.draw.text("Flocos: " + str(pegos) + " de " + str(total), (420, 12), fontsize=30)
    if venceu:
        screen.draw.text("O Floco chegou ao cume.", center=(320, 220), fontsize=44)
        screen.draw.text("Melhor trecho: " + str(melhor(tempos)) + " s", center=(320, 270), fontsize=32)
`
}

export function montarProjetoPython(versao: VersaoDoPicoPython) {
  return projetoPythonClassico({
    id: 'pico-fases-python',
    nome: 'A subida do Floco',
    fonte: codigoDoPico(versao),
    extensao: 'python-pgzero',
  })
}

/** Os cenários negativos da prova no executor real (o gabarito e o inicial vêm do manifesto). */
export function CENARIOS_DO_PICO() {
  return (Object.keys(ERROS_DO_PICO_PYTHON) as ErroDoPicoPython[]).map((erro) => ({
    nome: erro,
    projeto: montarProjetoPython(erro),
    ids: ERROS_DO_PICO_PYTHON[erro].quebra,
    passa: false,
  }))
}
