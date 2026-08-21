/**
 * Quais controles um projeto pede — respondido ANTES de o jogo rodar.
 *
 * A página pública de jogar recebe o `Project` inteiro, então dá para montar o
 * console já com os botões certos no primeiro quadro, sem piscar e sem esperar o
 * jogo responder.
 *
 * ⭐ **Uma tecla sintética aciona TODAS as camadas de ação.** O Jogo 2D converte
 * tecla em ação (`z`/`Space`→pular, `x`/`Shift`→correr, `Enter`→começar,
 * `Escape`→pausar) e o Avançado faz o mesmo com as dez dele; o 3D lê
 * `event.code` e o núcleo lê os dois. Por isso este módulo devolve TECLA, e não
 * um protocolo novo: mandar `key` e `code` corretos cobre as seis extensões.
 *
 * ⚠️ **Conservador de propósito.** As casas A e B e o direcional valem SEMPRE, com
 * o que o pad já mandava antes deste lote (espaço e Enter). Um jogo que este
 * módulo não entenda continua exatamente jogável como era — o que se ganha aqui
 * é X, Y e a tira, que hoje simplesmente não existem.
 */
import type { ProjectFiles } from '../core/project'

export type ControlSlot = 'A' | 'B' | 'X' | 'Y'
export type StripSlot = 'select' | 'start'
export type ControlDirection = 'up' | 'down' | 'left' | 'right'
export type InternalPadMode = 'auto' | 'always'

export interface ControlBinding {
  /**
   * O que a criança está fazendo. Vai no `aria-label`, NUNCA na face do botão —
   * a face carrega a letra, como no Super Nintendo.
   */
  label: string
  /** `KeyboardEvent.key` */
  key: string
  /** `KeyboardEvent.code` */
  code: string
}

export interface ProjectControls {
  /** O direcional manda estas teclas por direção (a seta sempre; WASD quando o jogo lê). */
  directions: Record<ControlDirection, ControlBinding[]>
  /** O diamante. `null` = o jogo não usa: botão apagado, inerte e fora do Tab. */
  face: Record<ControlSlot, ControlBinding | null>
  /** As duas pílulas da tira. */
  strip: Record<StripSlot, ControlBinding | null>
  /** Modo exato do pad que o jogo desenha; `null` quando ele não o habilita. */
  ownPadMode: InternalPadMode | null
  /** Nada foi deduzido (código cru, IR ausente): valem só os padrões seguros. */
  fallback: boolean
}

/**
 * A tabela ÚNICA de tecla. `key` e `code` juntos porque os runtimes divergem: o
 * 3D lê `event.code` CRU (um botão que mandasse `code: 'w'` seria um botão morto
 * com cara de certo), o Avançado lê `event.key` minúsculo e o Jogo 2D aceita os
 * dois. Nada aqui pode ser escrito à mão noutro lugar.
 */
const TECLAS = {
  up: { key: 'ArrowUp', code: 'ArrowUp' },
  down: { key: 'ArrowDown', code: 'ArrowDown' },
  left: { key: 'ArrowLeft', code: 'ArrowLeft' },
  right: { key: 'ArrowRight', code: 'ArrowRight' },
  w: { key: 'w', code: 'KeyW' },
  a: { key: 'a', code: 'KeyA' },
  s: { key: 's', code: 'KeyS' },
  d: { key: 'd', code: 'KeyD' },
  space: { key: ' ', code: 'Space' },
  enter: { key: 'Enter', code: 'Enter' },
  shift: { key: 'Shift', code: 'ShiftLeft' },
  f: { key: 'f', code: 'KeyF' },
  x: { key: 'x', code: 'KeyX' },
  z: { key: 'z', code: 'KeyZ' },
  escape: { key: 'Escape', code: 'Escape' },
  backspace: { key: 'Backspace', code: 'Backspace' },
} as const satisfies Record<string, { key: string; code: string }>

type TeclaId = keyof typeof TECLAS

function liga(label: string, tecla: TeclaId): ControlBinding {
  return { label, key: TECLAS[tecla].key, code: TECLAS[tecla].code }
}

const ROTULO_DA_DIRECAO: Record<ControlDirection, string> = {
  up: 'Para cima',
  down: 'Para baixo',
  left: 'Para a esquerda',
  right: 'Para a direita',
}

/** A direção que cada tecla de letra representa (o jogo aceita as duas grafias). */
const ALIAS_DE_DIRECAO: Partial<Record<TeclaId, ControlDirection>> = {
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right',
}

/** Tipos de IR que carregam uma TECLA, em qualquer extensão. */
const TIPOS_DE_TECLA = new Set([
  'g2d:keyDown',
  'g2d:onKey',
  'gk:keyDown',
  'gk:keyPressed',
  'gk:setPauseKey',
  'g3d:keyDown',
  'g3d:keyPressed',
  'g3k:keyDown',
  'g3k:keyPressed',
  'w3d:keyDown',
])

/** Tipos de IR que carregam uma AÇÃO semântica. */
const TIPOS_DE_ACAO = new Set([
  'g2d:actionDown',
  'g2d:actionPressed',
  'g2d:onActionPressed',
  'gk:actionDown',
  'gk:actionPressed',
  'gk:actionReleased',
])

/**
 * De qualquer grafia para o id da tabela. As extensões falam dialetos: o Jogo 2D
 * manda `'ArrowRight'`/`'a'`/`'Space'`, o 3D manda `'KeyA'`/`'ShiftLeft'` e o
 * Avançado manda minúsculo.
 */
function idDaTecla(bruto: unknown): TeclaId | null {
  if (typeof bruto !== 'string' || !bruto) return null
  const valor = bruto === ' ' ? 'Space' : bruto
  const casaDireta = Object.keys(TECLAS).find((id) => id === valor) as TeclaId | undefined
  if (casaDireta) return casaDireta
  const semPrefixo = /^Key[A-Za-z]$/.test(valor) ? valor.slice(3) : valor
  const minusculo = semPrefixo.toLowerCase()
  if (minusculo === 'space' || minusculo === ' ') return 'space'
  if (minusculo === 'enter') return 'enter'
  if (minusculo === 'escape' || minusculo === 'esc') return 'escape'
  if (minusculo === 'backspace') return 'backspace'
  if (minusculo.startsWith('shift')) return 'shift'
  if (minusculo === 'arrowup') return 'up'
  if (minusculo === 'arrowdown') return 'down'
  if (minusculo === 'arrowleft') return 'left'
  if (minusculo === 'arrowright') return 'right'
  return minusculo in TECLAS ? (minusculo as TeclaId) : null
}

interface Achados {
  teclas: Set<TeclaId>
  acoes: Set<string>
  padProprio: InternalPadMode | null
  /** Viu alguma coisa de entrada? É o que separa "não usa" de "não deu para ler". */
  leu: boolean
}

/**
 * ⚠️ Pilha explícita e `WeakSet`, não recursão: a IR de um exemplo grande passa de
 * 30 mil nós. Mesmo molde do resolvedor de fonte (`gameUiFonts/resolve.ts`), e
 * pelo mesmo motivo.
 *
 * ⚠️ Varre por FORMA, não por lista de chaves de corpo: a união da IR tem mais de
 * 900 membros e os corpos moram em chaves diferentes (`body`, `then`, `DO`…).
 * Procurar `type` em todo objeto aninhado é o que sobrevive a bloco novo.
 */
function varrer(raiz: unknown): Achados {
  const achados: Achados = {
    teclas: new Set(),
    acoes: new Set(),
    padProprio: null,
    leu: false,
  }
  const vistos = new WeakSet<object>()
  const pilha: unknown[] = [raiz]
  while (pilha.length) {
    const atual = pilha.pop()
    if (!atual || typeof atual !== 'object') continue
    if (vistos.has(atual)) continue
    vistos.add(atual)
    if (Array.isArray(atual)) {
      for (const item of atual) pilha.push(item)
      continue
    }
    const node = atual as Record<string, unknown>
    const tipo = typeof node.type === 'string' ? node.type : ''
    if (tipo && TIPOS_DE_TECLA.has(tipo)) {
      const id = idDaTecla(node.key) ?? idDaTecla(node.code)
      if (id) {
        achados.teclas.add(id)
        achados.leu = true
      }
    }
    if (tipo && TIPOS_DE_ACAO.has(tipo) && typeof node.action === 'string') {
      achados.acoes.add(node.action)
      achados.leu = true
    }
    if (tipo === 'g2d:enableClassicControls') {
      achados.leu = true
      if (node.mode === 'auto' || node.mode === 'always') achados.padProprio = node.mode
      else if (node.mode === 'off') achados.padProprio = null
    }
    for (const filho of Object.values(node)) pilha.push(filho)
  }
  return achados
}

/**
 * Rede para quando a IR não está disponível: snapshot antigo do Mural, projeto
 * ainda hidratando, jogo escrito no modo Código. O `script.js` é o artefato que
 * de fato RODA e sempre existe.
 */
const CHAMADA_DE_TECLA = /\.(?:keyDown|keyPressed)\(\s*['"]([A-Za-z0-9]+)['"]/g
const CHAMADA_DE_ACAO = /\.action(?:Down|Pressed|Released)\(\s*['"]([a-zA-Z]+)['"]/g
const CHAMADA_DE_PAD = /\.enableClassicControls\(\s*['"](auto|always|off)['"]/g

function varrerCodigo(codigo: unknown, achados: Achados): void {
  if (typeof codigo !== 'string' || !codigo) return
  CHAMADA_DE_TECLA.lastIndex = 0
  for (;;) {
    const casou = CHAMADA_DE_TECLA.exec(codigo)
    if (!casou) break
    const id = idDaTecla(casou[1])
    if (id) {
      achados.teclas.add(id)
      achados.leu = true
    }
  }
  CHAMADA_DE_ACAO.lastIndex = 0
  for (;;) {
    const casou = CHAMADA_DE_ACAO.exec(codigo)
    if (!casou?.[1]) break
    achados.acoes.add(casou[1])
    achados.leu = true
  }
  CHAMADA_DE_PAD.lastIndex = 0
  for (;;) {
    const casou = CHAMADA_DE_PAD.exec(codigo)
    if (!casou) break
    achados.padProprio = casou[1] === 'auto' || casou[1] === 'always' ? casou[1] : null
    achados.leu = true
  }
}

/** Ações que significam "correr / agir" nas duas extensões que têm camada semântica. */
const ACOES_DE_AGIR = new Set(['action', 'correr', 'agir'])
const ACOES_DE_PAUSA = new Set(['pause', 'pausar'])
const ACOES_DE_SELECIONAR = new Set(['select', 'voltar'])

export interface ProjectComControles {
  ir?: unknown
  files?: Pick<ProjectFiles, 'script.js'> | ProjectFiles | undefined
}

/** O mapa padrão: exatamente o que o pad já mandava antes deste lote. */
export function defaultProjectControls(): ProjectControls {
  return {
    directions: {
      up: [liga(ROTULO_DA_DIRECAO.up, 'up')],
      down: [liga(ROTULO_DA_DIRECAO.down, 'down')],
      left: [liga(ROTULO_DA_DIRECAO.left, 'left')],
      right: [liga(ROTULO_DA_DIRECAO.right, 'right')],
    },
    face: {
      A: liga('Pular', 'space'),
      B: liga('Começar', 'enter'),
      X: null,
      Y: null,
    },
    strip: { select: null, start: liga('Começar', 'enter') },
    ownPadMode: null,
    fallback: true,
  }
}

/**
 * Os controles que este projeto pede.
 *
 * ⚠️ O direcional manda a SETA sempre, e nunca só WASD: todo helper de movimento
 * das extensões lê as duas grafias (o 3D faz `keys.KeyA || keys.ArrowLeft`, o
 * Jogo 2D manda `ArrowLeft` e `a` para a mesma direção). WASD entra JUNTO da
 * seta só quando a criança usou o bloco de tecla explícito — que é o caso que o
 * pad de hoje deixa sem resposta.
 */
export function describeProjectControls(
  projeto: ProjectComControles | null | undefined,
): ProjectControls {
  const controles = defaultProjectControls()
  if (!projeto) return controles

  const achados = varrer(projeto.ir)
  const arquivos = projeto.files as { 'script.js'?: unknown } | undefined
  if (!achados.leu) varrerCodigo(arquivos?.['script.js'], achados)
  if (!achados.leu) return controles

  controles.fallback = false
  controles.ownPadMode = achados.padProprio

  for (const tecla of achados.teclas) {
    const direcao = ALIAS_DE_DIRECAO[tecla]
    if (direcao) controles.directions[direcao].push(liga(ROTULO_DA_DIRECAO[direcao], tecla))
  }

  if (achados.teclas.has('z')) controles.face.A = liga('Pular', 'z')

  const agir = achados.teclas.has('shift') || achados.teclas.has('x')
  const temAgir = agir || [...achados.acoes].some((acao) => ACOES_DE_AGIR.has(acao))
  if (temAgir) controles.face.X = liga('Correr ou agir', achados.teclas.has('x') ? 'x' : 'shift')

  if (achados.teclas.has('f')) controles.face.Y = liga('Soltar fogo', 'f')

  if ([...achados.acoes].some((acao) => ACOES_DE_SELECIONAR.has(acao))) {
    controles.strip.select = liga('Selecionar', 'backspace')
  }
  if (achados.teclas.has('escape') || [...achados.acoes].some((acao) => ACOES_DE_PAUSA.has(acao))) {
    controles.strip.start = liga('Pausar', 'escape')
  }

  return controles
}
