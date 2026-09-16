/**
 * O NÚCLEO do Iniciante 2D, redesenhado no lote 5 do Raio-X (16/09/2026): as RÉGUAS de nove cenas
 * (`hold-vs-press`, `group-loop`, `enemy-type`, `camera`, `contact`, `cooldown`, `aim`, `diagonal`,
 * `tilemap`) que o motor, a faixa e o palco precisam dizer do mesmo jeito.
 *
 * ⚠️ Puro e sem estado, como o `atelie.ts`: nada aqui lê o `SceneState`, para o validador do
 * `state.ts` usar estes números sem ciclo de importação. Os gestos (o que muda o estado) moram no
 * fim do `engine.ts`; os desenhos, no `scene-core-stages.tsx` do member-shell.
 */

/* ── `hold-vs-press`: uma tecla, duas raquetes ─────────────────────────────────────────────── */

/**
 * A pista das duas raquetes: 14 lugares de 30 em 30, a partir do 40 (o último é o 430).
 *
 * ⚠️⚠️ A raquete que passa do último lugar VOLTA ao primeiro, como o Dino do `draw-loop` (lote 5, G1).
 * Presa no fim, segurar de novo não movia mais nada, e a meta "segurando, a de baixo não parou de
 * andar" ficava impossível para quem já tinha segurado duas vezes. Quem conta o caminho é o número de
 * PASSOS desde que a tecla afundou (`pressSteps`/`holdSteps`), e não a posição.
 */
export const HOLD_LANE = { start: 40, step: 30, places: 14 } as const

/** O lugar da pista mais perto de `x`. ⚠️ Um retrato antigo tinha raquetes de 10 em 10 até 440. */
export function holdLaneSnap(x: number): number {
  const { start, step, places } = HOLD_LANE
  const lugar = Math.max(0, Math.round((x - start) / step)) % places
  return start + lugar * step
}

/** O próximo lugar da pista: depois do 430 vem o 40 (o resto da divisão dá a volta). */
export function holdLaneNext(x: number): number {
  return holdLaneSnap(holdLaneSnap(x) + HOLD_LANE.step)
}

/** Segurando por tantos quadros a de baixo "não parou de andar" (0,75 s a 4 por segundo). */
export const HOLD_RUNNING_STEPS = 3
/** Uma segurada de pelo menos 1 s (4 quadros): a que mostra a de cima com um passo só. */
export const HOLD_LONG_STEPS = 4
/** Um TOQUE rápido: soltou antes de a de baixo andar mais de um passo. */
export const HOLD_TAP_STEPS = 1

/* ── `group-loop`: medir cada cacto ────────────────────────────────────────────────────────── */

/**
 * As distâncias de PARTIDA dos três cactos: parecidas de propósito (118, 112 e 125), para o olho
 * não resolver sozinho. O do meio é o mais perto, como sempre foi na cena.
 */
export const HUNT_BASE = [118, 112, 125] as const
/**
 * Como cada cacto ANDA com o relógio: vai e volta em volta da distância de partida, cada um no seu
 * ritmo. ⚠️ Medido num simulador antes de escolher: com estes números o mais perto troca de dono a
 * cada 2,5 s no máximo, então "com o laço, a escolha mudou sozinha" nunca fica esperando à toa.
 * Aproximar até a torre e reaparecer longe deixava esperas de mais de 10 s.
 *
 * ⚠️⚠️ Os SINAIS e os ritmos mudaram nos consertos do review da onda B do lote 5 (16/09/2026). Com
 * `[-20, 16, -26]` e `[4, 5, 3]`, no caminho natural (medir com o relógio parado, escolher o 2º, ligar
 * o laço) o 1º e o 2º se cruzavam em 0,12 s: o anel pulava da escolha CERTA no primeiro quadro, a meta
 * caía e a cena congelava, sem a criança ver os números andando. Hoje, da fase 0, o 2º se APROXIMA e os
 * outros dois se afastam: ele segue o mais perto por 1,6 s, e a primeira troca vem depois. Conferido no
 * simulador com a régua de `HUNT_LOOP_SEEN_TICKS`: ligando o laço em QUALQUER quadro dos 12 s do vaivém,
 * a troca que conta chega em até 2,5 s (o pedido diz "por 3 segundos"), e duas trocas nunca ficam a
 * menos de 0,6 s uma da outra (o anel não pisca).
 */
export const HUNT_SWING = { amplitude: [20, -16, 26], period: [3, 3, 4] } as const
/**
 * Quantos quadros (1 s a 10 por segundo) o laço precisa estar ligado para uma troca contar como "a
 * escolha mudou sozinha". ⚠️ Uma troca logo depois de ligar lia como "liguei o laço e ele trocou a
 * minha escolha certa", e não como o laço seguindo o mais perto com o tempo.
 */
export const HUNT_LOOP_SEEN_TICKS = 10

/** As três distâncias depois de `ticks` quadros do relógio da cena (inteiras: é o número da régua). */
export function huntDistances(ticks: number, fps: number): number[] {
  const t = ticks / fps
  return HUNT_BASE.map((base, i) =>
    Math.round(
      base +
        (HUNT_SWING.amplitude[i] ?? 0) * Math.sin((2 * Math.PI * t) / (HUNT_SWING.period[i] ?? 1)),
    ),
  )
}

/* ── `enemy-type`: a ficha e os cactos que andam ───────────────────────────────────────────── */

/**
 * A pista dos cactos da ficha, em unidades da tela de 480: nasce em 430 (um de cada vez, 60 à
 * esquerda de quem já está ali), anda para a esquerda e reaparece à direita depois de sair.
 */
export const ENEMY_LANE = { spawnX: 430, gap: 60, min: 20, exitX: -30, returnX: 510 } as const
/** Quantos cactos cabem na pista. Mais que isso vira uma parede, e a ficha deixa de ser lida. */
export const ENEMY_MAX_CACTI = 8
/** Quanto um cacto anda num quadro com esta velocidade: a velocidade 3 são 60 por segundo. */
export const enemyStep = (speed: number, fps: number) => (speed * 20) / fps
/** Um cacto dentro da tela de 480. */
export const enemyOnScreen = (x: number) => x >= 0 && x <= 480

/* ── `camera`: o mundo maior que a tela ─────────────────────────────────────────────────────── */

/** O mundo e a tela do jogo. */
export const CAMERA_WORLD = { width: 1200, screen: 480 } as const
/**
 * Os MARCOS do mundo, desenhados na tela grande e no mapa de baixo. ⚠️ Sem eles, com a câmera
 * seguindo, a tela mostrava o Dino no meio de um fundo liso em qualquer lugar do mundo: o Dino em 600
 * e o Dino em 900 davam o mesmo quadro, e "a janela anda" só existia no mapa pequeno.
 */
export const CAMERA_LANDMARKS: readonly { kind: 'arvore' | 'pedra' | 'bandeira'; x: number }[] = [
  { kind: 'arvore', x: 150 },
  { kind: 'arvore', x: 420 },
  { kind: 'pedra', x: 610 },
  { kind: 'arvore', x: 820 },
  { kind: 'bandeira', x: 1100 },
]
/** Um passo do botão "Andar": 40 no mundo. */
export const CAMERA_WALK_STEP = 40
/**
 * Até onde o "Andar" leva o Dino: um passo antes do fim do mundo (consertos do review da onda B do
 * lote 5). ⚠️ Em 1200 o Dino ficava cortado pela metade na borda da tela e a bolinha dele saía do
 * mapa. O motor continua aceitando 1200 (`SCENE_LIMITS.worldX`): uma sessão antiga lá abre.
 */
export const CAMERA_WALK_MAX = CAMERA_WORLD.width - CAMERA_WALK_STEP
/** Onde a tela começa no mundo: parada em 0, ou com o Dino no meio (presa nas pontas do mundo). */
export function cameraWindow(heroX: number, follow: boolean): number {
  if (!follow) return 0
  const { width, screen } = CAMERA_WORLD
  return Math.max(0, Math.min(width - screen, heroX - screen / 2))
}

/* ── `contact`: duas regras, a mesma batida ─────────────────────────────────────────────────── */

/** Os corações de cada pista. ⚠️ Eram 6 quadradinhos, que esvaziavam em 1,5 s a 4 por segundo. */
export const CONTACT_HEARTS = 10
/**
 * A distância entre os DESENHOS: o cacto encosta no Dino quando ela chega a 0.
 *
 * ⚠️⚠️ Era `distance <= 40` sobre os centros deslocados, e o círculo vermelho de "encostado" flutuava
 * sobre um vão vazio entre os dois (em 45, o mesmo vão já não era encosto). Hoje o palco põe o cacto
 * a `CONTACT_DRAWINGS + distância` do Dino, e 40 é onde a cabeça do Dino encontra o braço do cacto.
 */
export const CONTACT_DRAWINGS = 40
export const contactTouching = (distance: number) => distance <= 0
/** Numa encostada, tantos quadros mostram as duas regras lado a lado (0,75 s a 4 por segundo). */
export const CONTACT_SEEN_FRAMES = 3

/* ── `cooldown`: tiros que voam ─────────────────────────────────────────────────────────────── */

/**
 * O tiro anda 100 por segundo a partir da boca da arma, e sai da tela em 440 (4,4 s). ⚠️ Devagar de
 * propósito: com 2 s de recarga o primeiro tiro ainda está à vista quando o segundo sai (200 de vão).
 * ⚠️⚠️ Era 150 (2,9 s na tela) até os consertos do review da onda B do lote 5: quem seguia o pedido de
 * `spaced` ao pé da letra (esperar "Pronto para atirar", ler e só então apertar, ~2 s) via UM tiro só
 * no palco, e a meta não caía.
 */
export const COOLDOWN_SHOT = { speed: 100, end: 440, glued: 20, max: 12 } as const
/**
 * Por quanto tempo o aperto recusado aparece ("✕ não saiu" no palco e "Não saiu: recarregando" ao lado
 * do botão). ⚠️ Era meio segundo, na boca da arma, longe do botão: sumia antes de a criança olhar.
 */
export const COOLDOWN_REFUSED_SECONDS = 1

/**
 * A recarga como a criança fala, e como o Estúdio conta: o bloco "fazer no máximo uma vez a cada
 * … quadros" é em QUADROS (60 por segundo), e a cena é em segundos.
 */
export function rechargeWords(seconds: number): string {
  if (seconds <= 0) return 'nenhuma'
  const inteiros = Math.floor(seconds)
  const meio = seconds - inteiros >= 0.5
  if (inteiros === 0) return 'meio segundo'
  const base = inteiros === 1 ? '1 segundo' : `${inteiros} segundos`
  return meio ? `${base} e meio` : base
}
export const rechargeFrames = (seconds: number) => Math.round(seconds * 60)

/* ── `aim`: a seta e o tiro ──────────────────────────────────────────────────────────────────── */

/**
 * O atirador no MEIO da tela de 480 × 270. ⚠️ Estava encostado na esquerda, e "o alvo atrás do
 * Dino" (a pergunta extra) virava o alvo desenhado em cima do corpo dele, com a seta sumindo.
 */
export const AIM_ORIGIN = { x: 240, y: 135 } as const
/** O tiro anda 300 por segundo, e acerta quando passa a 18 do centro do alvo. */
export const AIM_SHOT = { speed: 300, hit: 18 } as const
/**
 * A folga do alvo até a borda da tela do jogo, no arrasto e nos deslizantes (consertos do review da
 * onda B do lote 5). ⚠️ Com y 0 o alvo ficava metade fora da tela, e o estouro do acerto também. Só a
 * BANCADA e o palco respeitam: o motor segue aceitando de 0 a 480 (sessões e casos de antes).
 */
export const AIM_TARGET_MARGIN = 20

/** A menor distância entre o centro do alvo e o trecho que o tiro andou num quadro. */
export function aimDistanceToPath(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const comprimento = dx * dx + dy * dy
  const t =
    comprimento === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / comprimento))
  return Math.hypot(ax + t * dx - px, ay + t * dy - py)
}

/* ── `diagonal`: andar 1 segundo ─────────────────────────────────────────────────────────────── */

/** Andando reto, o Dino anda 60 em 1 segundo: é o raio do círculo desenhado. */
export const DIAGONAL_REACH = 60

export type DiagonalWalkKind = 'reto' | 'diagonal' | 'corrigida'

/**
 * Onde o Dino para depois de andar 1 segundo com estas setas, a partir do começo.
 *
 * ⚠️ Sem correção cada seta dá o passo inteiro, e juntas elas somam: 60 para o lado e 60 para baixo
 * dão 84,85 de caminho (quase uma vez e meia o reto, e não o dobro). Com a correção cada eixo anda
 * 60 dividido pela raiz de 2, e o caminho volta a ter 60, como no bloco "Mover sprite … em 4
 * direções com setas" do Estúdio.
 */
export function diagonalStride(
  dx: number,
  dy: number,
  even: boolean,
): { x: number; y: number; distance: number; kind: DiagonalWalkKind } | null {
  if (dx === 0 && dy === 0) return null
  const diagonal = dx !== 0 && dy !== 0
  const eixo = diagonal && even ? DIAGONAL_REACH / Math.SQRT2 : DIAGONAL_REACH
  // ⚠️ A distância sai dos números INTEIROS da conta, antes de arredondar x e y: com 42,43 nos dois
  // eixos a correção dava 60,01, e "anda o mesmo que o reto" mentia por um centésimo.
  return {
    x: Number((dx * eixo).toFixed(2)),
    y: Number((dy * eixo).toFixed(2)),
    distance: Number(Math.hypot(dx * eixo, dy * eixo).toFixed(2)),
    kind: !diagonal ? 'reto' : even ? 'corrigida' : 'diagonal',
  }
}

/* ── `tilemap`: o mapa escrito ───────────────────────────────────────────────────────────────── */

/** A coluna onde o Dino cai: ele para no primeiro bloco que encontra, de cima para baixo. */
export const TILEMAP_DINO_COLUMN = 2

/** A linha do bloco em que o Dino pousa, ou `null` quando a coluna dele não tem chão. */
export function tilemapLanding(rows: readonly string[]): number | null {
  const linha = rows.findIndex((r) => r[TILEMAP_DINO_COLUMN] === '#')
  return linha < 0 ? null : linha
}

/**
 * Uma linha do MEIO com três moedas seguidas: o "...ooo...." da previsão. ⚠️ A última linha é o
 * chão, e moeda no chão não é a pergunta ("três moedas no ar" contra "no chão").
 */
export function tilemapCoinRow(rows: readonly string[]): number | null {
  const linha = rows.findIndex((r, i) => i < rows.length - 1 && r.includes('ooo'))
  return linha < 0 ? null : linha
}

/**
 * A marca de uma peça escrita pela criança numa CASA: `#3:4` é um bloco na linha 3, casa 4.
 *
 * ⚠️⚠️ Consertos do review da onda B do lote 5: a marca era só da LINHA (`#3`) e nunca saía. Escrever
 * `#` na linha 4, apagar com `.` e escrever `#` na linha 2 fechava "a mesma peça em duas linhas" com um
 * bloco só no mapa. Hoje a marca é da casa e sai quando a casa recebe outra letra. Uma marca antiga
 * (`#3`, sem a casa) continua lida: vale enquanto a linha dela ainda tiver aquela peça.
 */
export const tilemapMark = (tile: string, row: number, col: number) => `${tile}${row}:${col}`
/** O formato das marcas: o de agora (`#3:4`) e o de antes (`#3`). */
export const TILEMAP_MARK = /^[#o][0-5](?::\d)?$/
/** No máximo uma marca por casa: seis linhas de dez casas. */
export const TILEMAP_MARKS_MAX = 60

/** As linhas em que a peça `tile` escrita pela criança AINDA está no mapa. */
export function tilemapMarkedRows(
  rows: readonly string[],
  marks: readonly string[],
  tile: string,
): number[] {
  const linhas = new Set<number>()
  for (const marca of marks) {
    if (marca[0] !== tile) continue
    const row = Number(marca[1])
    const [, casa] = marca.split(':')
    const viva = casa === undefined ? rows[row]?.includes(tile) : rows[row]?.[Number(casa)] === tile
    if (viva) linhas.add(row)
  }
  return [...linhas].sort((a, b) => a - b)
}
