import { BASE_TREES } from '../../../packages/studio/src/components/code/pro-templates/base'
import type { Project } from '../../../packages/studio/src/core/project'
import { buildProProject, type ProjectTree } from '../../../packages/studio/src/core/proProject'

/**
 * C02 (30/10/2026): o Jardim das Nuvens na linguagem do Gênio, JavaScript Pro em arquivos. O
 * modelo (`src/regras.ts`: grade, ocupação, custo, produção, guardar e reabrir) fica separado da
 * apresentação (`src/main.ts`: a tela, o clique e o desenho, prontos). O modelo é feito de funções
 * puras exportadas: os objetivos chamam essas funções com casos pequenos e conferem a tela uma vez.
 * Modelo Pro `vanilla-vite` (Vite + TypeScript).
 */

export const MODELO_PRO = 'vanilla-vite' as const
/** A grade da tela: 4 linhas e 6 colunas de 80 pontos, começando com 10 moedas. */
export const NUVENS_PRO = { linhas: 4, colunas: 6, lado: 80, moedas: 10 } as const

const APOIO_DAS_REGRAS = `export type Planta = 'flor' | 'arvore'
export type Celula = Planta | null

export interface Jardim {
  linhas: number
  colunas: number
  grade: Celula[][]
  moedas: number
}

export const CUSTO: Record<Planta, number> = { flor: 3, arvore: 5 }
export const PRODUCAO: Record<Planta, number> = { flor: 1, arvore: 2 }

export function novoJardim(linhas: number, colunas: number, moedas: number): Jardim {
  const grade: Celula[][] = []
  for (let linha = 0; linha < linhas; linha++) {
    const fileira: Celula[] = []
    for (let coluna = 0; coluna < colunas; coluna++) fileira.push(null)
    grade.push(fileira)
  }
  return { linhas, colunas, grade, moedas }
}

export function reabrir(jardim: Jardim): Jardim {
  return carregar(salvar(jardim))
}
`

const PARTES = {
  podeConstruir: {
    inicial: `export function podeConstruir(
  jardim: Jardim,
  linha: number,
  coluna: number,
  tipo: Planta,
): boolean {
  return true
}`,
    gabarito: `export function podeConstruir(
  jardim: Jardim,
  linha: number,
  coluna: number,
  tipo: Planta,
): boolean {
  const dentro = linha >= 0 && linha < jardim.linhas && coluna >= 0 && coluna < jardim.colunas
  if (!dentro) return false
  if (jardim.grade[linha][coluna] !== null) return false
  return jardim.moedas >= CUSTO[tipo]
}`,
  },
  construir: {
    inicial: `export function construir(
  jardim: Jardim,
  linha: number,
  coluna: number,
  tipo: Planta,
): Jardim {
  return jardim
}`,
    gabarito: `export function construir(
  jardim: Jardim,
  linha: number,
  coluna: number,
  tipo: Planta,
): Jardim {
  if (!podeConstruir(jardim, linha, coluna, tipo)) return jardim
  const grade = jardim.grade.map((fileira) => [...fileira])
  grade[linha][coluna] = tipo
  return { ...jardim, grade, moedas: jardim.moedas - CUSTO[tipo] }
}`,
  },
  colher: {
    inicial: `export function colher(jardim: Jardim): Jardim {
  return jardim
}`,
    gabarito: `export function colher(jardim: Jardim): Jardim {
  let ganho = 0
  for (const fileira of jardim.grade)
    for (const celula of fileira) if (celula !== null) ganho += PRODUCAO[celula]
  return { ...jardim, moedas: jardim.moedas + ganho }
}`,
  },
  guardar: {
    inicial: `export function salvar(jardim: Jardim): string {
  return ''
}

export function carregar(texto: string): Jardim {
  return novoJardim(1, 1, 0)
}`,
    gabarito: `export function salvar(jardim: Jardim): string {
  return JSON.stringify({
    versao: 1,
    linhas: jardim.linhas,
    colunas: jardim.colunas,
    grade: jardim.grade,
    moedas: jardim.moedas,
  })
}

export function carregar(texto: string): Jardim {
  const dados = JSON.parse(texto)
  return {
    linhas: dados.linhas,
    colunas: dados.colunas,
    grade: dados.grade,
    moedas: dados.moedas,
  }
}`,
  },
  remover: {
    inicial: `export function remover(jardim: Jardim, linha: number, coluna: number): Jardim {
  return jardim
}`,
    gabarito: `export function remover(jardim: Jardim, linha: number, coluna: number): Jardim {
  const planta = jardim.grade[linha]?.[coluna]
  if (!planta) return jardim
  const grade = jardim.grade.map((fileira) => [...fileira])
  grade[linha][coluna] = null
  return { ...jardim, grade, moedas: jardim.moedas + Math.floor(CUSTO[planta] / 2) }
}`,
  },
} as const
type Parte = keyof typeof PARTES

/** Projetos errados que o executor precisa recusar, cada um trocando uma parte do gabarito. */
export const ERROS_DAS_NUVENS_PRO = {
  'constroi-por-cima': {
    parte: 'podeConstruir',
    quebra: ['ocupacao'],
    codigo: `export function podeConstruir(
  jardim: Jardim,
  linha: number,
  coluna: number,
  tipo: Planta,
): boolean {
  const dentro = linha >= 0 && linha < jardim.linhas && coluna >= 0 && coluna < jardim.colunas
  return dentro && jardim.moedas >= CUSTO[tipo]
}`,
  },
  'constroi-sem-moedas': {
    parte: 'construir',
    quebra: ['custo'],
    codigo: `export function construir(
  jardim: Jardim,
  linha: number,
  coluna: number,
  tipo: Planta,
): Jardim {
  if (jardim.grade[linha][coluna] !== null) return jardim
  const grade = jardim.grade.map((fileira) => [...fileira])
  grade[linha][coluna] = tipo
  return { ...jardim, grade, moedas: jardim.moedas - CUSTO[tipo] }
}`,
  },
  'colhe-uma-de-cada': {
    parte: 'colher',
    quebra: ['producao'],
    codigo: `export function colher(jardim: Jardim): Jardim {
  let ganho = 0
  for (const fileira of jardim.grade) for (const celula of fileira) if (celula !== null) ganho += 1
  return { ...jardim, moedas: jardim.moedas + ganho }
}`,
  },
  'guarda-sem-moedas': {
    parte: 'guardar',
    quebra: ['guardar'],
    codigo: `export function salvar(jardim: Jardim): string {
  return JSON.stringify({ linhas: jardim.linhas, colunas: jardim.colunas, grade: jardim.grade })
}

export function carregar(texto: string): Jardim {
  const dados = JSON.parse(texto)
  return { linhas: dados.linhas, colunas: dados.colunas, grade: dados.grade, moedas: 0 }
}`,
  },
  'remove-sem-devolver': {
    parte: 'remover',
    quebra: ['remover'],
    codigo: `export function remover(jardim: Jardim, linha: number, coluna: number): Jardim {
  const grade = jardim.grade.map((fileira) => [...fileira])
  grade[linha][coluna] = null
  return { ...jardim, grade }
}`,
  },
} as const satisfies Record<string, { parte: Parte; quebra: readonly string[]; codigo: string }>
export type ErroDasNuvensPro = keyof typeof ERROS_DAS_NUVENS_PRO
export type VersaoDasNuvensPro = 'inicial' | 'gabarito' | ErroDasNuvensPro

function trecho(parte: Parte, versao: VersaoDasNuvensPro): string {
  if (versao === 'inicial' || versao === 'gabarito') return PARTES[parte][versao]
  const erro = ERROS_DAS_NUVENS_PRO[versao]
  return erro.parte === parte ? erro.codigo : PARTES[parte].gabarito
}

/** `src/regras.ts`: o modelo do jardim, que a pessoa completa. */
export function regrasDasNuvens(versao: VersaoDasNuvensPro): string {
  return [
    APOIO_DAS_REGRAS,
    ...(['podeConstruir', 'construir', 'colher', 'guardar', 'remover'] as const).map((parte) =>
      trecho(parte, versao),
    ),
  ].join('\n')
}

/** `src/main.ts`: a apresentação pronta (a tela, o clique, os botões e o desenho). */
export const MAIN_DAS_NUVENS = `import './style.css'
import {
  carregar,
  colher,
  construir,
  novoJardim,
  type Planta,
  remover,
  salvar,
} from './regras'

const LADO = ${NUVENS_PRO.lado}
const CHAVE = 'jardim-das-nuvens'

export const jogo: { jardim: ReturnType<typeof novoJardim>; planta: Planta } = {
  jardim: novoJardim(${NUVENS_PRO.linhas}, ${NUVENS_PRO.colunas}, ${NUVENS_PRO.moedas}),
  planta: 'flor',
}

const tela = document.getElementById('jardim') as HTMLCanvasElement
const ctx = tela.getContext('2d') as CanvasRenderingContext2D
const placar = document.getElementById('placar') as HTMLElement

function desenhar() {
  ctx.fillStyle = '#eef6ff'
  ctx.fillRect(0, 0, tela.width, tela.height)
  jogo.jardim.grade.forEach((fileira, linha) =>
    fileira.forEach((celula, coluna) => {
      const x = coluna * LADO
      const y = linha * LADO
      ctx.fillStyle = (linha + coluna) % 2 === 0 ? '#ffffff' : '#f3f8ff'
      ctx.fillRect(x + 2, y + 2, LADO - 4, LADO - 4)
      if (celula === 'flor') {
        ctx.fillStyle = '#f2a0c4'
        ctx.beginPath()
        ctx.arc(x + LADO / 2, y + LADO / 2, 16, 0, Math.PI * 2)
        ctx.fill()
      }
      if (celula === 'arvore') {
        ctx.fillStyle = '#6fbf8f'
        ctx.beginPath()
        ctx.arc(x + LADO / 2, y + LADO / 2 - 6, 24, 0, Math.PI * 2)
        ctx.fill()
      }
    }),
  )
  placar.textContent = 'Moedas: ' + jogo.jardim.moedas + '   Plantando: ' + jogo.planta
}

tela.addEventListener('click', (evento) => {
  const caixa = tela.getBoundingClientRect()
  const coluna = Math.floor((evento.clientX - caixa.left) / LADO)
  const linha = Math.floor((evento.clientY - caixa.top) / LADO)
  if (evento.shiftKey) jogo.jardim = remover(jogo.jardim, linha, coluna)
  else jogo.jardim = construir(jogo.jardim, linha, coluna, jogo.planta)
  desenhar()
})

document.addEventListener('keydown', (evento) => {
  if (evento.key === '1') jogo.planta = 'flor'
  if (evento.key === '2') jogo.planta = 'arvore'
  if (evento.key === 'c') jogo.jardim = colher(jogo.jardim)
  if (evento.key === 's') localStorage.setItem(CHAVE, salvar(jogo.jardim))
  if (evento.key === 'r') {
    const guardado = localStorage.getItem(CHAVE)
    if (guardado) jogo.jardim = carregar(guardado)
  }
  desenhar()
})

desenhar()
`

const INDEX = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Jardim das Nuvens</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <canvas id="jardim" width="${NUVENS_PRO.colunas * NUVENS_PRO.lado}" height="${NUVENS_PRO.linhas * NUVENS_PRO.lado}"></canvas>
    <p id="placar"></p>
    <p>Clique para plantar. 1 flor, 2 árvore, C colhe, S guarda, R reabre. Shift e clique tira a planta.</p>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`
const ESTILO = `body { margin: 0; font-family: system-ui; background: #dceefc; }
canvas { display: block; }
p { margin: 8px 12px; }
`

/** O projeto Pro (árvore do modelo `vanilla-vite` com os arquivos do jardim). */
export function montarProjetoPro(versao: VersaoDasNuvensPro): Project {
  const base = BASE_TREES[MODELO_PRO]
  if (!base) throw new Error('Modelo Pro ausente.')
  const tree: ProjectTree = {
    ...base,
    'index.html': { kind: 'file', content: INDEX },
    'src/main.ts': { kind: 'file', content: MAIN_DAS_NUVENS },
    'src/regras.ts': { kind: 'file', content: regrasDasNuvens(versao) },
    'src/style.css': { kind: 'file', content: ESTILO },
  }
  const projeto = buildProProject('nuvens-jardim-pro', 'Jardim das Nuvens', tree, 'dev', MODELO_PRO)
  return { ...projeto, createdAt: 0, updatedAt: 0 }
}

/** Os cenários negativos da prova no executor real (o gabarito e o inicial vêm do manifesto). */
export function CENARIOS_DAS_NUVENS() {
  return (Object.keys(ERROS_DAS_NUVENS_PRO) as ErroDasNuvensPro[]).map((erro) => ({
    nome: erro,
    projeto: montarProjetoPro(erro),
    ids: ERROS_DAS_NUVENS_PRO[erro].quebra,
    passa: false,
  }))
}
