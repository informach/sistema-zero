import { projetoPythonClassico } from '../ambiente-python'

/**
 * C02 (30/10/2026): a Fase de plataforma do Pico na linguagem do Mestre, Python com Pygame Zero.
 * Desde a revisão de 31/10/2026 (A45) o tema é da ilha, e não da missão do posto: o Floco sobe a
 * montanha, um trecho da trilha por fase, e precisa do cristal de cada trecho para seguir.
 * As fases são DADOS (listas de linhas de texto, uma letra por célula de 40 pontos) e o jogo
 * pronto anda, pula, cai e troca de fase usando quatro funções que a pessoa completa: ler a fase,
 * resolver a queda num eixo, decidir a próxima fase e, no extra, acrescentar uma terceira fase.
 * Repertório do posto: funções, parâmetros, listas, fase como dados, colisão por eixo e depuração
 * com casos pequenos. Sem classes e sem herança.
 */

const FASE_1 = [
  '................',
  '................',
  '................',
  '..............S.',
  '...........#####',
  '................',
  '......####......',
  '.C..............',
  '####............',
  '................',
  '.J..............',
  '################',
]
const FASE_2 = [
  '................',
  '..S.............',
  '#####...........',
  '................',
  '.......####.....',
  '................',
  '............####',
  '..........C.....',
  '......#####.....',
  '................',
  '.J..............',
  '################',
]
const FASE_3 = [
  '................',
  '......S.........',
  '.....####.......',
  '................',
  '####............',
  '................',
  '.....####.......',
  '............C...',
  '..........####..',
  '................',
  '.J..............',
  '################',
]
/** Quantas plataformas (`#`) a fase 1 tem: o jogo monta exatamente essas. */
export const PLATAFORMAS_DA_FASE_1 = FASE_1.join('')
  .split('')
  .filter((c) => c === '#').length

const fase = (linhas: readonly string[]) =>
  `    [\n${linhas.map((linha) => `        "${linha}",`).join('\n')}\n    ],`

const PARTES = {
  ler: {
    inicial: `def ler_fase(linhas, letra):
    return []`,
    gabarito: `def ler_fase(linhas, letra):
    achados = []
    for linha, texto in enumerate(linhas):
        for coluna, celula in enumerate(texto):
            if celula == letra:
                achados.append([coluna, linha])
    return achados`,
  },
  pousar: {
    inicial: `def pousar(pe_antes, pe_depois, vy, topo):
    return [pe_depois, vy]`,
    gabarito: `def pousar(pe_antes, pe_depois, vy, topo):
    if vy > 0 and pe_antes <= topo and pe_depois >= topo:
        return [topo, 0]
    return [pe_depois, vy]`,
  },
  proxima: {
    inicial: `def proxima_fase(numero, tem_cristal, na_saida):
    return numero`,
    gabarito: `def proxima_fase(numero, tem_cristal, na_saida):
    if tem_cristal and na_saida:
        return numero + 1
    return numero`,
  },
  fases: {
    inicial: [fase(FASE_1), fase(FASE_2)].join('\n'),
    gabarito: [fase(FASE_1), fase(FASE_2), fase(FASE_3)].join('\n'),
  },
} as const
type Parte = keyof typeof PARTES

/** Programas errados que o executor precisa recusar, cada um trocando uma parte do gabarito. */
export const ERROS_DO_PICO_PYTHON = {
  'linha-e-coluna-trocadas': {
    parte: 'ler',
    quebra: ['ler'],
    codigo: `def ler_fase(linhas, letra):
    achados = []
    for linha, texto in enumerate(linhas):
        for coluna, celula in enumerate(texto):
            if celula == letra:
                achados.append([linha, coluna])
    return achados`,
  },
  'pousa-por-baixo': {
    parte: 'pousar',
    quebra: ['pousar'],
    codigo: `def pousar(pe_antes, pe_depois, vy, topo):
    if vy > 0 and pe_depois >= topo:
        return [topo, 0]
    return [pe_depois, vy]`,
  },
  'pousa-ao-subir': {
    parte: 'pousar',
    quebra: ['pousar'],
    codigo: `def pousar(pe_antes, pe_depois, vy, topo):
    if min(pe_antes, pe_depois) <= topo <= max(pe_antes, pe_depois):
        return [topo, 0]
    return [pe_depois, vy]`,
  },
  'saida-sem-cristal': {
    parte: 'proxima',
    quebra: ['proxima'],
    codigo: `def proxima_fase(numero, tem_cristal, na_saida):
    if na_saida:
        return numero + 1
    return numero`,
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
${trecho('fases', versao)}
]


${trecho('ler', versao)}


${trecho('pousar', versao)}


${trecho('proxima', versao)}


def montar(numero):
    global plataformas, cristais, saida, tem_cristal, vy, no_chao
    linhas = FASES[numero]
    plataformas = []
    for coluna, linha in ler_fase(linhas, "#"):
        plataformas.append(Rect((coluna * LADO, linha * LADO), (LADO, LADO)))
    cristais = ler_fase(linhas, "C")
    saidas = ler_fase(linhas, "S")
    saida = saidas[0] if saidas else [15, 10]
    inicio = ler_fase(linhas, "J")
    comeco = inicio[0] if inicio else [1, 10]
    floco.topleft = (comeco[0] * LADO + 8, comeco[1] * LADO + 8)
    tem_cristal = False
    vy = 0
    no_chao = False


floco = Rect((48, 408), (24, 32))
fase_atual = 0
venceu = False
plataformas = []
cristais = []
saida = [15, 10]
tem_cristal = False
vy = 0
no_chao = False
total_de_fases = len(FASES)
montar(fase_atual)
total_de_plataformas = len(plataformas)


def celula(rect):
    return [int(rect.centerx // LADO), int(rect.centery // LADO)]


def update():
    global vy, no_chao, tem_cristal, fase_atual, venceu
    if venceu:
        return
    if keyboard.left:
        floco.x = floco.x - PASSO
    if keyboard.right:
        floco.x = floco.x + PASSO
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
    if celula(floco) in cristais:
        tem_cristal = True
    if celula(floco) == saida:
        nova = proxima_fase(fase_atual, tem_cristal, True)
        if nova != fase_atual:
            if nova >= len(FASES):
                venceu = True
            else:
                fase_atual = nova
                montar(fase_atual)


def draw():
    screen.fill((200, 226, 245))
    for plataforma in plataformas:
        screen.draw.filled_rect(plataforma, (236, 244, 250))
        screen.draw.rect(plataforma, (120, 160, 190))
    if not tem_cristal:
        for coluna, linha in cristais:
            screen.draw.filled_circle((coluna * LADO + 20, linha * LADO + 20), 10, (110, 200, 255))
    screen.draw.filled_rect(Rect((saida[0] * LADO + 8, saida[1] * LADO), (24, 40)), (150, 100, 60))
    screen.draw.filled_rect(floco, (245, 250, 255))
    screen.draw.rect(floco, (60, 90, 140))
    screen.draw.text("Trecho " + str(fase_atual + 1) + " de " + str(len(FASES)), (16, 12), fontsize=30)
    if venceu:
        screen.draw.text("O Floco chegou ao cume.", center=(320, 240), fontsize=44)
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
