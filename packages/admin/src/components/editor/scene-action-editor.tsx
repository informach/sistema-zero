'use client'

import {
  decimal,
  isSceneAction,
  MAP_TILES,
  SCENE_LIMITS,
  SCENE_PORTS,
  SCRIPT_LIMITS,
  type SceneAction,
  type SceneId,
  type ScenePort,
  sceneAreaPercent,
  sceneFrameRate,
} from '@sistemazero/core/learning/scene'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'

/** O nome de cada fio da bancada, na língua do professor. */
const PORTAS: Record<ScenePort, string> = {
  draw: 'Desenho',
  gravity: 'Gravidade',
  sound: 'Som do salto',
  timer: 'Intervalo de criação',
  cleanup: 'Limpeza dos cactos',
  condition: 'Condição do jogo',
  touch: 'Controle por toque',
  restart: 'Recomeço',
  limit: 'Limite de velocidade',
  life: 'Vida na batida',
  loop: 'Laço sobre o grupo',
  camera: 'Câmera que segue',
  aim: 'Mira no alvo',
  even: 'Correção da diagonal',
  recycle: 'Reciclagem do nascedouro',
  // Lote 5 do Raio-X (G5): o nome da chave da bancada da `enemy-type`.
  copy: 'Copiar a ficha ao nascer',
}

const TODAS: { label: string; value: SceneAction }[] = [
  { label: 'Criar o Dino', value: { type: 'create' } },
  ...SCENE_PORTS.flatMap((port) =>
    [true, false].map((enabled) => ({
      label: `${enabled ? 'Ligar' : 'Desligar'} ${PORTAS[port]}`,
      value: { type: 'connect' as const, port, enabled },
    })),
  ),
  { label: 'Dino na frente', value: { type: 'layer', front: true } },
  { label: 'Floresta na frente', value: { type: 'layer', front: false } },
  { label: 'Pular por toque', value: { type: 'jump', input: 'tap' } },
  { label: 'Pular por tecla', value: { type: 'jump', input: 'key' } },
  { label: 'Mudar impulso', value: { type: 'impulse', force: 9 } },
  { label: 'Observar a cena', value: { type: 'advance', seconds: 1 } },
  { label: 'Mover o obstáculo', value: { type: 'move', distance: 60 } },
  { label: 'Mudar área de colisão', value: { type: 'resize', width: 60 } },
  { label: 'Iniciar por toque', value: { type: 'start', input: 'tap' } },
  { label: 'Iniciar por tecla', value: { type: 'start', input: 'key' } },
  { label: 'Provocar colisão', value: { type: 'collide' } },
  { label: 'Voltar à tela inicial', value: { type: 'home' } },
  { label: 'Recomeçar o jogo', value: { type: 'restart' } },
  { label: 'Avançar o relógio', value: { type: 'clock' } },
  { label: 'Restaurar a cena', value: { type: 'reset' } },
  // O núcleo do Iniciante 2D (15/09/2026).
  { label: 'Mudar a velocidade', value: { type: 'velocity', vx: 5, vy: 0 } },
  { label: 'Apertar uma vez', value: { type: 'press' } },
  { label: 'Segurar a tecla', value: { type: 'hold', on: true } },
  { label: 'Soltar a tecla', value: { type: 'hold', on: false } },
  { label: 'Guardar um número', value: { type: 'store', value: 10 } },
  { label: 'Somar no número', value: { type: 'change', by: 5 } },
  { label: 'Mostrar na tela', value: { type: 'show', on: true } },
  { label: 'Parar de mostrar', value: { type: 'show', on: false } },
  { label: 'Olhar um do grupo', value: { type: 'look', id: 1 } },
  { label: 'Escolher um do grupo', value: { type: 'choose', id: 2 } },
  { label: 'Mudar a velocidade da ficha', value: { type: 'define', field: 'speed', value: 7 } },
  { label: 'Mudar a vida da ficha', value: { type: 'define', field: 'life', value: 3 } },
  { label: 'Fazer nascer mais um', value: { type: 'spawnOne' } },
  { label: 'Levar o herói pelo mundo', value: { type: 'walk', x: 700 } },
  // ⚠️ Lote 5 do Raio-X (G5): o padrão é ENCOSTADOS (0). Na `contact` o encosto é a distância 0 dos
  // desenhos, e com 20 o primeiro passo do roteiro deixava de mostrar a batida que ele promete.
  { label: 'Mudar a distância entre os dois', value: { type: 'approach', distance: 0 } },
  { label: 'Perguntar se está encostando', value: { type: 'mode', kind: 'ask' } },
  { label: 'Esperar o acontecimento da batida', value: { type: 'mode', kind: 'event' } },
  { label: 'Atirar', value: { type: 'shoot' } },
  { label: 'Mudar a recarga', value: { type: 'recharge', seconds: 1 } },
  { label: 'Mover o alvo da mira', value: { type: 'target', x: 120, y: 220 } },
  { label: 'Apertar as setas', value: { type: 'direction', x: 1, y: 1 } },
  // Lote 5 do Raio-X (G5): o gesto da `diagonal`, com o nome do botão da bancada.
  { label: 'Andar 1 segundo', value: { type: 'stride' } },
  // ⚠️ Uma opção por LETRA: com uma só, o professor conseguia pintar mas nunca apagar nem pôr
  // a moeda, e a cena inteira é sobre a letra decidir o que aparece.
  ...MAP_TILES.map((tile) => ({
    label: `Escrever "${tile}" no mapa`,
    value: { type: 'paint-tile' as const, row: 3, col: 4, tile },
  })),
  // As duas cenas de 14/09/2026. O endereço vai com os números da Aula 1 (x 110, y 150) e a
  // frase da descrição é a canônica do roteiro — o professor edita as duas no próprio passo.
  { label: 'Levar o Dino a um endereço', value: { type: 'place', x: 110, y: 150 } },
  {
    label: 'Escrever a descrição',
    value: {
      type: 'describe',
      text: 'Corra com o dino e pule os cactos apertando espaço',
    },
  },
  { label: 'Ouvir a tela', value: { type: 'listen' } },
  { label: 'Mudar o tamanho da tela', value: { type: 'stage', width: 480, height: 270 } },
  { label: 'Mostrar a borda', value: { type: 'border', visible: true } },
  { label: 'Esconder a borda', value: { type: 'border', visible: false } },
  // ⚠️ Os nomes da bancada do lote 5 ("Desenhar o Dino: só no começo / a cada quadro", "Limpar a
  // tela antes"): o professor lê no roteiro o mesmo que a criança lê no botão.
  { label: 'Desenhar o Dino a cada quadro', value: { type: 'loop', on: true } },
  { label: 'Desenhar o Dino só no começo', value: { type: 'loop', on: false } },
  { label: 'Ligar Limpar a tela antes', value: { type: 'erase', on: true } },
  { label: 'Desligar Limpar a tela antes', value: { type: 'erase', on: false } },
  { label: 'Mudar intervalo', value: { type: 'interval', seconds: 1 } },
  {
    label: 'Sortear posição',
    value: { type: 'sample', kind: 'position', unit: 0.5, guided: false },
  },
  {
    label: 'Sortear velocidade',
    value: { type: 'sample', kind: 'velocity', unit: 0.5, guided: false },
  },
  // As seis cenas do lote 4. Os valores de fábrica são os do roteiro de cada uma: o passo
  // grande do fantasma, a lupa que revela a borda, o pedaço 1 da folha.
  // ⚠️ Lote 5 do Raio-X (G4): o ateliê com os nomes do Pinta. O `paint` de colunas e o `mirror` com
  // linha do eixo continuam legais (roteiros antigos), mas saíram da lista: o Pinta não tem eixo móvel.
  { label: 'Mostrar o quadro 1', value: { type: 'frame', index: 1 } },
  { label: 'Mostrar o quadro 2', value: { type: 'frame', index: 2 } },
  { label: 'Ligar a prévia', value: { type: 'play', on: true } },
  { label: 'Parar a prévia', value: { type: 'play', on: false } },
  { label: 'Mudar a velocidade da prévia', value: { type: 'rate', perSecond: 8 } },
  { label: 'Ligar o fantasma', value: { type: 'onion', on: true } },
  { label: 'Desligar o fantasma', value: { type: 'onion', on: false } },
  { label: 'Mudar o tamanho do fogo 2', value: { type: 'shift', offset: 20 } },
  { label: 'Desligar o espelho', value: { type: 'mirror-mode', mode: 'off' } },
  { label: 'Ligar o Espelho lado a lado', value: { type: 'mirror-mode', mode: 'x' } },
  { label: 'Ligar o espelho de cima e de baixo', value: { type: 'mirror-mode', mode: 'y' } },
  // ⚠️ Os dois espelhos são duas chaves no Pinta (consertos do review da onda B do lote 5): com as duas
  // ligadas, cada traço deixa três cópias.
  { label: 'Ligar os dois espelhos', value: { type: 'mirror-mode', mode: 'xy' } },
  { label: 'Pintar a asa', value: { type: 'trace', piece: 'asa' } },
  { label: 'Pintar a ponta', value: { type: 'trace', piece: 'ponta' } },
  { label: 'Pintar a cabine', value: { type: 'trace', piece: 'cabine' } },
  { label: 'Pintar um quadradinho', value: { type: 'dot', x: 3, y: 10 } },
  { label: 'Apagar o papel', value: { type: 'clear-paper' } },
  { label: 'Aproximar as duas pedras', value: { type: 'inspect', kind: 'pixel', zoom: 4 } },
  { label: 'Mostrar a folha inteira no jogo (64)', value: { type: 'crop', width: 64 } },
  { label: 'Recortar a folha em 16', value: { type: 'crop', width: 16 } },
  { label: 'Recortar a folha em 32', value: { type: 'crop', width: 32 } },
  { label: 'Levar o recorte a um quadro', value: { type: 'cut', cell: 2 } },
  { label: 'Mudar o tamanho no jogo', value: { type: 'sprite', size: 54 } },
  // O motor, o 3D e o ateliê (15/09/2026). Os valores de fábrica são os do roteiro de cada uma.
  { label: 'Pôr o 1º a mirar', value: { type: 'brain', id: 1, state: 'mirar' } },
  { label: 'Pôr o 1º a atirar', value: { type: 'brain', id: 1, state: 'atirar' } },
  { label: 'Pôr o 1º a recarregar', value: { type: 'brain', id: 1, state: 'recarregar' } },
  { label: 'Pôr o 1º parado', value: { type: 'brain', id: 1, state: 'parado' } },
  { label: 'Contar quadros', value: { type: 'count', kind: 'frames' } },
  { label: 'Contar segundos', value: { type: 'count', kind: 'seconds' } },
  { label: 'Mudar o raio do primeiro', value: { type: 'radius', which: 'a', value: 30 } },
  { label: 'Mudar o raio do segundo', value: { type: 'radius', which: 'b', value: 30 } },
  // ⚠️ z NEGATIVO é o fundo (lote 5 do Raio-X, como o kit Desvie do Jogo 3D): o valor de fábrica leva o
  // cubo para o fundo, que é o que o roteiro do modelo mostra primeiro.
  { label: 'Levar o objeto no espaço', value: { type: 'place3d', x: 0, y: 0, z: -80 } },
  { label: 'Girar a câmera (ou o modelo)', value: { type: 'orbit', yaw: 1, pitch: 1 } },
  // ⚠️ Os nomes da bancada (consertos do review da onda B do lote 5, G6).
  { label: 'Voltar para onde a câmera começou', value: { type: 'recenter' } },
  { label: 'Ligar o raio-X do modelo', value: { type: 'wireframe', on: true } },
  { label: 'Desligar o raio-X do modelo', value: { type: 'wireframe', on: false } },
  // Lote 5 do Raio-X (G6): os nomes da bancada nova ("A pele", "O estado mora"). ⚠️ "A pele" desde os
  // consertos do review da onda B: "Ver os pontos" respondia a previsão da `mesh`.
  { label: 'A pele: inteira', value: { type: 'see-points', level: 'nada' } },
  { label: 'A pele: transparente', value: { type: 'see-points', level: 'metade' } },
  { label: 'A pele: sem pele', value: { type: 'see-points', level: 'tudo' } },
  { label: 'O estado mora: em cada torre', value: { type: 'brain-scope', shared: false } },
  { label: 'O estado mora: no jogo', value: { type: 'brain-scope', shared: true } },
  { label: 'Apontar a mira', value: { type: 'point', x: 300, y: 110 } },
  { label: 'Pintar o miolo', value: { type: 'ink', part: 'fill', on: true } },
  { label: 'Tirar a cor do miolo', value: { type: 'ink', part: 'fill', on: false } },
  { label: 'Desenhar o contorno', value: { type: 'ink', part: 'stroke', on: true } },
  { label: 'Tirar o contorno', value: { type: 'ink', part: 'stroke', on: false } },
  { label: 'Trazer a luz da esquerda', value: { type: 'light', side: 'left' } },
  { label: 'Trazer a luz da direita', value: { type: 'light', side: 'right' } },
  { label: 'Ligar a sombra', value: { type: 'shade', on: true } },
  { label: 'Desligar a sombra', value: { type: 'shade', on: false } },
]

/**
 * Os campos que distinguem uma ação das IRMÃS do mesmo tipo — as que aparecem como opções
 * separadas na lista (`Ligar`/`Desligar`, `speed`/`life`, `ask`/`event`).
 */
const DISTINGUE: Partial<Record<SceneAction['type'], readonly string[]>> = {
  connect: ['port', 'enabled'],
  border: ['visible'],
  layer: ['front'],
  jump: ['input'],
  start: ['input'],
  sample: ['kind'],
  // ⚠️ Sem `inspect: ['kind']` desde o lote 5 (G4): a lupa vale para as DUAS pedras, e um roteiro
  // antigo com a pedra de vetor ainda precisa casar com a única opção da lista.
  'mirror-mode': ['mode'],
  trace: ['piece'],
  crop: ['width'],
  mode: ['kind'],
  count: ['kind'],
  frame: ['index'],
  define: ['field'],
  brain: ['state'],
  radius: ['which'],
  light: ['side'],
  ink: ['part', 'on'],
  'paint-tile': ['tile'],
  loop: ['on'],
  erase: ['on'],
  hold: ['on'],
  show: ['on'],
  play: ['on'],
  onion: ['on'],
  mirror: ['on'],
  wireframe: ['on'],
  'see-points': ['level'],
  'brain-scope': ['shared'],
  shade: ['on'],
}

/**
 * A identidade da ação no `<select>`: o tipo mais o que a distingue das irmãs.
 *
 * ⚠️⚠️ Duas opções com a mesma identidade é defeito de verdade e silencioso: o `value` do
 * `<select>` deixa de escolher uma delas — clicar em "Desligar a sombra" selecionava "Ligar a
 * sombra" — e o React avisa só no console, onde ninguém olha durante a autoria.
 *
 * ⚠️ Por isso a régua virou uma TABELA em vez de uma escada de ternários: a escada tinha
 * esquecido `define`, `mode`, `hold` e `show`, e cada par novo de irmãs esquecia de novo. Campo
 * que não distingue nada fica de fora — o tipo sozinho já é identidade.
 */
const identidade = (a: SceneAction) =>
  [a.type, ...(DISTINGUE[a.type] ?? []).map((c) => String((a as Record<string, unknown>)[c]))].join(
    ':',
  )

/** Segundos como o professor lê: vírgula no decimal e no máximo três casas. */
const segundos = (n: number) => `${decimal(Number(n.toFixed(3)))} s`

/**
 * O aviso de um tempo que não cai em QUADRO INTEIRO do relógio da cena, ou `null`.
 *
 * ⚠️⚠️ Review do lote 4 do Raio-X (16/09/2026): o motor conta QUADROS no ritmo de cada cena
 * (`sceneFrameRate`), e o editor aceitava qualquer tempo de 0,001 s em diante. "Observar a cena
 * 0,5 s" numa etapa da `pool` (um quadro por segundo) não mostra nada, e a sobra só aparece na
 * etapa seguinte; no CASO a sobra é zerada ao abrir a cena, e o tempo some. ⚠️ Avisa e não recusa:
 * o roteiro continua válido, e só quem escreveu sabe se o resto do quadro na etapa seguinte é o que
 * queria. Hoje nenhum conteúdo tem isso (o review conferiu os 70 roteiros e os casos).
 */
export function avisoDoTempo(scene: SceneId, tempo: number, noCaso: boolean): string | null {
  const fps = sceneFrameRate(scene)
  if (fps === null || !Number.isFinite(tempo) || tempo <= 0) return null
  const quadros = tempo * fps
  const inteiros = Math.floor(quadros + 1e-6)
  if (Math.abs(quadros - inteiros) <= 1e-6) return null
  const umQuadro = segundos(1 / fps)
  if (inteiros === 0)
    return noCaso
      ? `Nesta cena um quadro dura ${umQuadro}: ${segundos(tempo)} não muda nada no caso. Use pelo menos ${umQuadro}.`
      : `Nesta cena um quadro dura ${umQuadro}: ${segundos(tempo)} não mostra nada nesta etapa. Use pelo menos ${umQuadro}.`
  const opcoes = `${segundos(inteiros / fps)} ou ${segundos((inteiros + 1) / fps)}`
  return noCaso
    ? `Nesta cena um quadro dura ${umQuadro}: ${segundos(tempo)} anda ${inteiros} ${inteiros === 1 ? 'quadro' : 'quadros'} e o resto se perde ao abrir a cena. Use ${opcoes}.`
    : `Nesta cena um quadro dura ${umQuadro}: ${segundos(tempo)} mostra ${inteiros} ${inteiros === 1 ? 'quadro' : 'quadros'}, e o resto fica para a ação seguinte. Use ${opcoes}.`
}

/**
 * ⚠️⚠️ Os nomes POR CENA e as ações LEGADAS que a bancada não oferece (consertos do review da onda A do
 * lote 5, B7). Os rótulos acima são globais, e três cenas redesenhadas ficaram com nomes de outra coisa:
 * na `acceleration` o "Sortear velocidade" é o "Passar 5 segundos" da criança, e o "Avançar o relógio"
 * (`clock`) anda a base SEM nascer cacto (um roteiro com ele nunca mostra `old-speed`); na `restart`,
 * "Mover o obstáculo" e "Provocar colisão" terminam a partida sem cacto na pista. As escondidas
 * continuam LEGAIS (conteúdo antigo abre), e um passo que já as usa mostra "· ação antiga".
 * A chave é a `identidade` da ação.
 */
const POR_CENA: Partial<
  Record<SceneId, { rotulos?: Record<string, string>; esconder?: readonly SceneAction['type'][] }>
> = {
  acceleration: { rotulos: { 'sample:velocity': 'Passar 5 segundos' }, esconder: ['clock'] },
  restart: { rotulos: { 'start:tap': 'Tocar na tela' }, esconder: ['move', 'collide'] },
  hitbox: { rotulos: { resize: 'Mudar o tamanho da área do Dino' } },
}

/** As ações que ESTA cena aceita. A legalidade é do domínio, não de uma lista daqui. */
export function sceneActionChoices(scene: SceneId) {
  const cena = POR_CENA[scene]
  return TODAS.filter(
    (a) => isSceneAction(a.value, scene) && !cena?.esconder?.includes(a.value.type),
  ).map((a) => {
    const rotulo = cena?.rotulos?.[identidade(a.value)]
    return rotulo ? { ...a, label: rotulo } : a
  })
}

/** O nome de uma ação LEGADA (legal na cena, fora da lista dela), para o passo que já a usa. */
export function rotuloDaAcaoAntiga(action: SceneAction, scene: SceneId): string {
  if (!isSceneAction(action, scene)) return 'Ação incompatível · revisar'
  const antiga = TODAS.find((c) => identidade(c.value) === identidade(action))
  return antiga ? `${antiga.label} · ação antiga` : 'Ação incompatível · revisar'
}

/**
 * O número que acompanha algumas ações, com a faixa vinda do domínio.
 *
 * ⚠️ Os limites NÃO são reescritos aqui. Já houve três cópias desta regra (motor, editor e
 * DTO) e elas divergiram: o `interval` do servidor não tinha teto e o do editor ia de 0,5 a 2.
 * Um campo que aceita o que o servidor recusa é uma aula que não salva, sem dizer por quê.
 */
/** Um campo numérico do editor. `inteiro: false` só nos que o domínio aceita com vírgula. */
interface CampoNumerico {
  label: string
  field: string
  min: number
  max: number
  value: number
  inteiro?: boolean
}

export function campoNumerico(action: SceneAction, stepNumber = 1): CampoNumerico | null {
  const L = SCENE_LIMITS
  if (action.type === 'advance')
    return {
      label: 'Tempo em segundos',
      field: 'seconds' as const,
      // ⚠️ O roteiro tem teto próprio (10s por etapa, para uma etapa não virar um filme); no
      // CASO vale a régua da cena (30s). Passar o do roteiro nos dois restringia em silêncio.
      ...(stepNumber > 0 ? L.scriptAdvance : L.advance),
      inteiro: false,
      value: action.seconds,
    }
  if (action.type === 'interval')
    return {
      label: 'Tempo em segundos',
      field: 'seconds' as const,
      ...L.interval,
      inteiro: false,
      value: action.seconds,
    }
  if (action.type === 'impulse')
    return { label: 'Força do impulso', field: 'force' as const, ...L.impulse, value: action.force }
  if (action.type === 'move')
    return { label: 'Distância', field: 'distance' as const, ...L.move, value: action.distance }
  if (action.type === 'resize')
    return {
      // ⚠️ A bancada da `hitbox` fala em PORCENTAGEM (consertos do review da onda A do lote 5, B7): o
      // motor guarda a largura, e o rótulo diz as duas coisas para o professor casar com a criança.
      label: `Largura da área (${sceneAreaPercent(action.width)}% do Dino)`,
      field: 'width' as const,
      ...L.resize,
      value: action.width,
    }
  if (action.type === 'sample')
    return {
      label: 'Posição no sorteio (0 a 1)',
      field: 'unit' as const,
      ...L.sample,
      inteiro: false,
      value: action.unit,
    }
  if (action.type === 'rate')
    return {
      label: 'Velocidade (quadros por segundo)',
      field: 'perSecond' as const,
      ...L.rate,
      value: action.perSecond,
    }
  if (action.type === 'shift')
    return {
      label: 'Tamanho do fogo 2 (4 por quadradinho)',
      field: 'offset' as const,
      ...L.shift,
      value: action.offset,
    }
  if (action.type === 'paint')
    return { label: 'Coluna do traço', field: 'column' as const, ...L.column, value: action.column }
  if (action.type === 'cut')
    return { label: 'Quadro do recorte', field: 'cell' as const, ...L.cell, value: action.cell }
  if (action.type === 'sprite')
    return { label: 'Tamanho no jogo', field: 'size' as const, ...L.sprite, value: action.size }
  /* ── O núcleo, o motor e o 3D ─────────────────────────────────────────────────────────────
     ⚠️⚠️ Ação com número e SEM campo aqui é uma ação que o professor escolhe e não consegue
     ajustar: ela fica cravada no valor de fábrica da lista, para sempre, naquele bloco. Foi
     o que aconteceu com dezessete tipos de uma vez — e em `camera-3d`, `circle-collision` e
     `axis-z` o valor de fábrica é o PRÓPRIO estado inicial, então a única ação autorável era
     um gesto que não muda nada. O `setup` (o caso) ficou inútil nessas cenas. */
  if (action.type === 'store')
    return {
      label: 'Número guardado',
      field: 'value' as const,
      ...L.boxValue,
      value: action.value,
    }
  if (action.type === 'change')
    return { label: 'Quanto somar', field: 'by' as const, ...L.boxChange, value: action.by }
  if (action.type === 'look')
    return { label: 'Qual do grupo', field: 'id' as const, ...L.targetId, value: action.id }
  if (action.type === 'choose')
    return { label: 'Qual escolher', field: 'id' as const, ...L.targetId, value: action.id }
  if (action.type === 'define')
    return {
      label: action.field === 'speed' ? 'Velocidade da ficha' : 'Vida da ficha',
      field: 'value' as const,
      ...(action.field === 'speed' ? L.typeSpeed : L.typeLife),
      value: action.value,
    }
  if (action.type === 'walk')
    return { label: 'Lugar no mundo', field: 'x' as const, ...L.worldX, value: action.x }
  if (action.type === 'approach')
    return {
      label: 'Distância de quem bate',
      field: 'distance' as const,
      ...L.approach,
      value: action.distance,
    }
  if (action.type === 'recharge')
    return {
      label: 'Tempo de recarga',
      field: 'seconds' as const,
      ...L.recharge,
      inteiro: false,
      value: action.seconds,
    }
  if (action.type === 'brain')
    return { label: 'Qual dos três', field: 'id' as const, ...L.brainId, value: action.id }
  if (action.type === 'radius')
    return {
      label: action.which === 'a' ? 'Raio do primeiro' : 'Raio do segundo',
      field: 'value' as const,
      ...L.radius,
      value: action.value,
    }
  // ⚠️ O `place` tem DOIS números, e não é mais o único: `mirror` (interruptor + eixo),
  // `inspect` (qual pedra + lupa), `velocity`, `target`, `direction`, `point`, `orbit`,
  // `place3d` e `paint-tile` também misturam números com outro campo. Quem monta o campo
  // numérico devolve UM só, então todos esses são tratados no `camposDoEndereco`.
  return null
}

/**
 * Os GRUPOS de números de uma ação: o endereço do sprite, o tamanho da tela, os três eixos do
 * espaço. Quem tem um número só passa pelo `campoNumerico`.
 *
 * ⚠️ Recebe a `scene` porque uma mesma ação pode ter campos diferentes por cena — é o caso do
 * `orbit`, cuja altura só existe em `camera-3d`.
 */
export function camposDoEndereco(action: SceneAction, scene: SceneId) {
  // ⚠️ Até a MAIOR tela de um caso (lote 5 do Raio-X): o Desafio abre em 800 × 480, com "Mudar o
  // tamanho da tela" ANTES. O motor prende o endereço na tela do caso.
  if (action.type === 'place')
    return [
      { label: 'x', field: 'x' as const, ...SCENE_LIMITS.addressX, value: action.x },
      { label: 'y', field: 'y' as const, ...SCENE_LIMITS.addressY, value: action.y },
    ]
  // ⚠️ O eixo do espelho e a lupa entram AQUI, e não no campo numérico solto, porque cada um
  // viaja junto de um interruptor (`on`, `kind`): separá-los deixaria a ação meio escolhida.
  if (action.type === 'mirror')
    return [
      {
        label: 'linha do eixo',
        field: 'line' as const,
        ...SCENE_LIMITS.mirrorLine,
        value: action.line,
      },
    ]
  if (action.type === 'inspect')
    return [
      { label: 'aproximar', field: 'zoom' as const, ...SCENE_LIMITS.zoom, value: action.zoom },
    ]
  // O quadradinho tocado na grade 16 × 16 do espelho (lote 5, G4).
  if (action.type === 'dot')
    return [
      { label: 'coluna (0 a 15)', field: 'x' as const, ...SCENE_LIMITS.paperCell, value: action.x },
      { label: 'linha (0 a 15)', field: 'y' as const, ...SCENE_LIMITS.paperCell, value: action.y },
    ]
  if (action.type === 'stage')
    return [
      {
        label: 'largura',
        field: 'width' as const,
        ...SCENE_LIMITS.stageWidth,
        value: action.width,
      },
      {
        label: 'altura',
        field: 'height' as const,
        ...SCENE_LIMITS.stageHeight,
        value: action.height,
      },
    ]
  if (action.type === 'velocity')
    return [
      { label: 'para o lado', field: 'vx' as const, ...SCENE_LIMITS.velocity, value: action.vx },
      { label: 'para baixo', field: 'vy' as const, ...SCENE_LIMITS.velocity, value: action.vy },
    ]
  if (action.type === 'target')
    return [
      { label: 'x do alvo', field: 'x' as const, ...SCENE_LIMITS.aimX, value: action.x },
      { label: 'y do alvo', field: 'y' as const, ...SCENE_LIMITS.aimY, value: action.y },
    ]
  // ⚠️ A ÚNICA exceção à regra "os limites vêm de `SCENE_LIMITS`": o `direction` não tem
  // entrada lá (o `isSceneAction` escreve o −1..1 à mão, porque é a forma da ação e não uma
  // faixa ajustável). Se um dia virar entrada, esta linha vai junto.
  if (action.type === 'direction')
    return [
      { label: 'seta horizontal (−1 a 1)', field: 'x' as const, min: -1, max: 1, value: action.x },
      { label: 'seta vertical (−1 a 1)', field: 'y' as const, min: -1, max: 1, value: action.y },
    ]
  if (action.type === 'point')
    return [
      { label: 'x da mira', field: 'x' as const, ...SCENE_LIMITS.pointX, value: action.x },
      { label: 'y da mira', field: 'y' as const, ...SCENE_LIMITS.pointY, value: action.y },
    ]
  // ⚠️ No `mesh` a altura fica travada no meio (lá quem gira é o MODELO, não uma câmera), então
  // o campo dela não aparece: um campo que o domínio recusa é pior que campo nenhum.
  if (action.type === 'orbit')
    return [
      { label: 'volta da câmera', field: 'yaw' as const, ...SCENE_LIMITS.yaw, value: action.yaw },
      ...(action.pitch === 1 && scene === 'mesh'
        ? []
        : [
            {
              label: 'altura da câmera',
              field: 'pitch' as const,
              ...SCENE_LIMITS.pitch,
              value: action.pitch,
            },
          ]),
    ]
  if (action.type === 'place3d')
    return [
      { label: 'x (lados)', field: 'x' as const, ...SCENE_LIMITS.spaceX, value: action.x },
      { label: 'y (para cima)', field: 'y' as const, ...SCENE_LIMITS.spaceY, value: action.y },
      // ⚠️ Lote 5 do Raio-X: o fundo é o z NEGATIVO.
      {
        label: 'z (negativo é o fundo)',
        field: 'z' as const,
        ...SCENE_LIMITS.spaceZ,
        value: action.z,
      },
    ]
  if (action.type === 'paint-tile')
    return [
      { label: 'linha', field: 'row' as const, ...SCENE_LIMITS.mapRow, value: action.row },
      { label: 'casa', field: 'col' as const, ...SCENE_LIMITS.mapCol, value: action.col },
    ]
  return null
}

/**
 * O editor de ações serve DOIS donos: o passo do roteiro e o caso da atividade.
 *
 * ⚠️⚠️ As réguas deles são diferentes, e reusar a do roteiro no caso prendia o professor:
 * (a) um PASSO precisa de pelo menos uma ação, um CASO não — o `aplicar` do editor do caso até
 * sabe apagar o setup quando a lista esvazia, mas a UI nunca deixava chegar a zero, e quem
 * adicionasse uma ação por engano ficava com ela para sempre naquele bloco; (b) o teto do
 * roteiro é 16 e o do caso é 8, então da nona em diante o editor deixava adicionar e a
 * publicação recusava; (c) `Restaurar a cena` é legal em toda cena e por isso aparecia na lista
 * do caso, onde o domínio a recusa — com a mensagem apontando para o lugar errado.
 */
/**
 * O número que o campo pode gravar: dentro da faixa, inteiro quando o domínio pede, e nunca o
 * zero que o `change` recusa (ele existe para SOMAR alguma coisa).
 */
function numeroNaFaixa(
  bruto: string,
  campo: { min: number; max: number; inteiro?: boolean; value: number },
): number {
  const n = Number(bruto)
  if (!Number.isFinite(n)) return campo.value
  const preso = Math.max(campo.min, Math.min(campo.max, n))
  const inteiro = campo.inteiro === false ? preso : Math.round(preso)
  return inteiro === 0 && campo.min < 0 && campo.max > 0 ? campo.value : inteiro
}

export function SceneActionEditor({
  scene,
  value,
  onChange,
  stepNumber,
  minimo = 1,
  maximo = SCRIPT_LIMITS.actions,
  semReset = false,
}: {
  scene: SceneId
  value: readonly SceneAction[]
  onChange: (actions: SceneAction[]) => void
  /** O número da etapa do roteiro, para o leitor de tela. `0` = é o caso, não uma etapa. */
  stepNumber: number
  minimo?: number
  maximo?: number
  /** O caso não aceita `reset`: ele voltaria para o próprio caso, em laço. */
  semReset?: boolean
}) {
  const choices = sceneActionChoices(scene).filter((c) => !semReset || c.value.type !== 'reset')
  const replace = (index: number, action: SceneAction) =>
    onChange(value.map((a, i) => (i === index ? action : a)))
  return (
    <div className="space-y-3">
      {value.map((action, index) => {
        const numero = campoNumerico(action, stepNumber)
        const endereco = camposDoEndereco(action, scene)
        return (
          // As ações têm identidade POSICIONAL no contrato do roteiro; todo campo é controlado.
          // biome-ignore lint/suspicious/noArrayIndexKey: o roteiro compartilhado não tem id de ação.
          <div key={index} className="space-y-2 rounded-lg bg-muted/40 p-3">
            <Select
              aria-label={
                stepNumber > 0
                  ? `Ação ${index + 1} da etapa ${stepNumber}`
                  : `Ação ${index + 1} do caso desta atividade`
              }
              value={identidade(action)}
              onChange={(e) => {
                const next = choices.find((c) => identidade(c.value) === e.target.value)
                if (next) replace(index, { ...next.value })
              }}
            >
              {choices.map((choice) => (
                <option key={identidade(choice.value)} value={identidade(choice.value)}>
                  {choice.label}
                </option>
              ))}
              {!choices.some((c) => identidade(c.value) === identidade(action)) && (
                <option value={identidade(action)}>{rotuloDaAcaoAntiga(action, scene)}</option>
              )}
            </Select>
            {numero && (
              <label className="block space-y-1 text-xs">
                {numero.label}
                {/* ⚠️ Arredonda e respeita a faixa, como o `camposDoEndereco` já fazia. O domínio
                    exige INTEIRO em quase todas essas ações, e o campo aceitava 2,5; limpar o
                    campo dava 0, que o `change` recusa. O bloco ficava recusado na publicação
                    com o recado genérico, apontando para a cena em vez de para o número. */}
                <Input
                  type="number"
                  min={numero.min}
                  max={numero.max}
                  step={numero.inteiro === false ? 'any' : 1}
                  value={numero.value}
                  onChange={(e) =>
                    replace(index, {
                      ...action,
                      [numero.field]: numeroNaFaixa(e.target.value, numero),
                    } as SceneAction)
                  }
                />
              </label>
            )}
            {action.type === 'advance' && avisoDoTempo(scene, action.seconds, stepNumber === 0) && (
              <p className="text-xs text-amber-700" role="status">
                {avisoDoTempo(scene, action.seconds, stepNumber === 0)}
              </p>
            )}
            {endereco && (
              <div className="grid grid-cols-2 gap-2">
                {endereco.map((campo) => (
                  <label key={campo.field} className="block space-y-1 text-xs">
                    {campo.label}
                    <Input
                      type="number"
                      min={campo.min}
                      max={campo.max}
                      step={1}
                      value={campo.value}
                      onChange={(e) =>
                        replace(index, {
                          ...action,
                          [campo.field]: Math.round(Number(e.target.value)),
                        } as SceneAction)
                      }
                    />
                  </label>
                ))}
              </div>
            )}
            {action.type === 'describe' && (
              <label className="block space-y-1 text-xs">
                Descrição que a etapa escreve
                <Input
                  maxLength={SCENE_LIMITS.describe.max}
                  value={action.text}
                  onChange={(e) => replace(index, { ...action, text: e.target.value })}
                />
              </label>
            )}
            {action.type === 'sample' && (
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={action.guided}
                  onChange={(e) => replace(index, { ...action, guided: e.target.checked })}
                />
                Sorteio guiado
              </label>
            )}
            <div className="flex flex-wrap gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={index === 0}
                onClick={() => {
                  const next = [...value]
                  ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
                  onChange(next)
                }}
              >
                Subir ação
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={index === value.length - 1}
                onClick={() => {
                  const next = [...value]
                  ;[next[index], next[index + 1]] = [next[index + 1]!, next[index]!]
                  onChange(next)
                }}
              >
                Descer ação
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={value.length <= minimo}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                Remover ação
              </Button>
            </div>
          </div>
        )
      })}
      <Button
        variant="outline"
        size="sm"
        disabled={value.length >= maximo}
        onClick={() => {
          if (choices[0]) onChange([...value, { ...choices[0].value }])
        }}
      >
        Adicionar ação
      </Button>
    </div>
  )
}
