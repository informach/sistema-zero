import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import { createEmptyProject, type Project } from '../../../packages/studio/src/core/project'
import {
  GENERATED_JS_HEADER,
  generateProjectFiles,
} from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import {
  hasBlockingParseDiagnostics,
  parseProjectFilesFromParts,
} from '../../../packages/studio/src/parsers/project'

/**
 * C02 (30/10/2026): o desafio do Vale na linguagem do Arquiteto, JavaScript em texto. O projeto é
 * o clássico na Ponte (`mode: 'bridge'`): a pessoa escreve o código e a Ponte o lê de volta para
 * blocos. A fonte aqui é o código; IR, blocos e arquivos saem do próprio Estúdio (parser da
 * Ponte, gerador e Blockly), então o projeto é exatamente o que a Ponte guardaria.
 */

/** Medidas do jogo: o caminho, a torre e a onda. Não são exigências dos objetivos. */
export const VALE_TEXTO = {
  largura: 640,
  altura: 480,
  torre: { x: 340, y: 230, alcance: 130 },
  velocidade: 2,
} as const

/** O que a pessoa completa (gabarito) e o que o inicial traz no lugar. */
const PARTES = {
  criarOnda: {
    inicial: `function criarOnda(numero) {
  return []
}`,
    gabarito: `function criarOnda(numero) {
  const lista = []
  for (let i = 0; i < numero + 2; i++) {
    lista.push({ x: -20 - 50 * i, y: 120, ponto: 1, vida: 2, andou: 0 })
  }
  return lista
}`,
  },
  dentroDoAlcance: {
    inicial: `function dentroDoAlcance(t, cinza) {
  return false
}`,
    gabarito: `function dentroDoAlcance(t, cinza) {
  return Math.hypot(t.x - cinza.x, t.y - cinza.y) <= t.alcance
}`,
  },
  escolherAlvo: {
    inicial: `function escolherAlvo(t, lista) {
  return null
}`,
    gabarito: `function escolherAlvo(t, lista) {
  let melhor = null
  for (const cinza of lista) {
    if (dentroDoAlcance(t, cinza) && (melhor === null || cinza.andou > melhor.andou)) {
      melhor = cinza
    }
  }
  return melhor
}`,
  },
  recomecar: {
    inicial: '',
    gabarito: `
  if (evento.key === 'r') {
    cinzas = []
    onda = 0
    protegidos = 0
    vidas = 3
  }`,
  },
} as const
type Parte = keyof typeof PARTES

/** Os projetos errados que o executor real precisa recusar (cada um troca uma parte). */
export const ERROS_DO_VALE = {
  'onda-fixa': [
    'criarOnda',
    `function criarOnda(numero) {
  const lista = []
  for (let i = 0; i < 3; i++) {
    lista.push({ x: -20 - 50 * i, y: 120, ponto: 1, vida: 2, andou: 0 })
  }
  return lista
}`,
  ],
  'alcance-sem-a-borda': [
    'dentroDoAlcance',
    `function dentroDoAlcance(t, cinza) {
  return Math.hypot(t.x - cinza.x, t.y - cinza.y) < t.alcance
}`,
  ],
  'alcance-so-em-x': [
    'dentroDoAlcance',
    `function dentroDoAlcance(t, cinza) {
  return Math.abs(t.x - cinza.x) <= t.alcance
}`,
  ],
  'primeira-da-lista': [
    'escolherAlvo',
    `function escolherAlvo(t, lista) {
  for (const cinza of lista) {
    if (dentroDoAlcance(t, cinza)) {
      return cinza
    }
  }
  return null
}`,
  ],
  'ignora-o-alcance': [
    'escolherAlvo',
    `function escolherAlvo(t, lista) {
  let melhor = null
  for (const cinza of lista) {
    if (melhor === null || cinza.andou > melhor.andou) {
      melhor = cinza
    }
  }
  return melhor
}`,
  ],
  'r-sem-zerar-a-onda': [
    'recomecar',
    `
  if (evento.key === 'r') {
    cinzas = []
    protegidos = 0
    vidas = 3
  }`,
  ],
} as const satisfies Record<string, readonly [Parte, string]>
export type ErroDoVale = keyof typeof ERROS_DO_VALE
export type VersaoDoVale = 'inicial' | 'gabarito' | ErroDoVale

function trecho(parte: Parte, versao: VersaoDoVale): string {
  if (versao === 'inicial' || versao === 'gabarito') return PARTES[parte][versao]
  const [alvo, codigo] = ERROS_DO_VALE[versao]
  return alvo === parte ? codigo : PARTES[parte].gabarito
}

/** O código da pessoa, como ela o escreveria na Ponte. */
export function codigoDoVale(versao: VersaoDoVale): string {
  const { torre, velocidade } = VALE_TEXTO
  return `const tela = document.getElementById('tela')
const ctx = tela.getContext('2d')
const caminho = [
  { x: -20, y: 120 },
  { x: 260, y: 120 },
  { x: 260, y: 340 },
  { x: 660, y: 340 },
]
const torre = { x: ${torre.x}, y: ${torre.y}, alcance: ${torre.alcance} }
const VELOCIDADE = ${velocidade}
let cinzas = []
let onda = 0
let protegidos = 0
let vidas = 3
let recarga = 0

${trecho('criarOnda', versao)}

function quantasNaOnda(numero) {
  return criarOnda(numero).length
}

${trecho('dentroDoAlcance', versao)}

${trecho('escolherAlvo', versao)}

function andar(cinza) {
  const alvo = caminho[cinza.ponto]
  const dx = alvo.x - cinza.x
  const dy = alvo.y - cinza.y
  const falta = Math.hypot(dx, dy)
  if (falta <= VELOCIDADE) {
    cinza.x = alvo.x
    cinza.y = alvo.y
    cinza.ponto = cinza.ponto + 1
  } else {
    cinza.x = cinza.x + (dx / falta) * VELOCIDADE
    cinza.y = cinza.y + (dy / falta) * VELOCIDADE
  }
  cinza.andou = cinza.andou + VELOCIDADE
}

function atualizar() {
  for (const cinza of cinzas) {
    andar(cinza)
  }
  recarga = recarga - 1
  const alvo = escolherAlvo(torre, cinzas)
  if (alvo !== null && recarga <= 0) {
    alvo.vida = alvo.vida - 1
    recarga = 20
  }
  const restantes = []
  for (const cinza of cinzas) {
    if (cinza.vida <= 0) {
      protegidos = protegidos + 1
    } else if (cinza.ponto >= caminho.length) {
      vidas = vidas - 1
    } else {
      restantes.push(cinza)
    }
  }
  cinzas = restantes
}

function desenhar() {
  ctx.fillStyle = '#d9ecd0'
  ctx.fillRect(0, 0, 640, 480)
  ctx.strokeStyle = '#b59b78'
  ctx.lineWidth = 28
  ctx.beginPath()
  ctx.moveTo(caminho[0].x, caminho[0].y)
  for (const ponto of caminho) {
    ctx.lineTo(ponto.x, ponto.y)
  }
  ctx.stroke()
  ctx.fillStyle = 'rgba(69, 139, 114, 0.18)'
  ctx.beginPath()
  ctx.arc(torre.x, torre.y, torre.alcance, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#316459'
  ctx.fillRect(torre.x - 16, torre.y - 30, 32, 60)
  ctx.fillStyle = '#aa754b'
  ctx.fillRect(600, 316, 40, 48)
  for (const cinza of cinzas) {
    ctx.fillStyle = cinza.vida > 1 ? '#8b9699' : '#c4cbcc'
    ctx.beginPath()
    ctx.arc(cinza.x, cinza.y, 16, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#233e40'
  ctx.font = '18px sans-serif'
  ctx.fillText('Onda ' + onda + '   Protegidos ' + protegidos + '   Ninhos ' + vidas, 16, 30)
  ctx.fillText('Enter chama a próxima onda', 16, 460)
}

document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter' && cinzas.length === 0) {
    onda = onda + 1
    cinzas = criarOnda(onda)
  }${trecho('recomecar', versao)}
})

function quadro() {
  atualizar()
  desenhar()
  requestAnimationFrame(quadro)
}
quadro()
`
}

/** O projeto clássico na Ponte, com IR, blocos e arquivos gerados pelo Estúdio. */
export function montarProjetoTexto(versao: VersaoDoVale): Project {
  const lido = parseProjectFilesFromParts({
    html: [{ type: 'canvas', id: 'tela', width: 640, height: 480 }],
    cssSource: '',
    jsSource: codigoDoVale(versao),
  })
  if (hasBlockingParseDiagnostics(lido.diagnostics))
    throw new Error(`A Ponte não lê o código do Vale (${versao}).`)
  const ir = assignStableIdsToIR(lido.ir, 'vale_texto')
  const name = 'Guardião dos ninhos'
  return {
    ...createEmptyProject('vale-texto', name),
    programmingLanguage: 'javascript',
    mode: 'bridge',
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    // Com o cabeçalho que o Estúdio grava: a Ponte reconhece o código como o gerado do IR.
    files: generateProjectFiles({ ir, projectName: name, jsHeader: GENERATED_JS_HEADER }),
    assets: [],
    installedExtensions: [],
  }
}
