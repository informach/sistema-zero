import { BASE_TREES } from '../../../packages/studio/src/components/code/pro-templates/base'
import type { Project } from '../../../packages/studio/src/core/project'
import { buildProProject, type ProjectTree } from '../../../packages/studio/src/core/proProject'

/**
 * C02 (30/10/2026): o Jardim das Nuvens na linguagem do Gênio, JavaScript Pro em arquivos. O
 * modelo (`src/regras.ts`) fica separado da apresentação (`src/main.ts`: a tela, o clique, as
 * teclas e o desenho, prontos). Desde as lacunas de 01/11/2026 os critérios são próprios, e não a
 * lista da missão do posto (A Base da Lua pede ocupação, saldo, produção, devolução ao retirar e
 * salvar e abrir): essas regras vêm prontas no modelo, e a pessoa completa as do jardim do céu,
 * no mesmo conceito (grade, custo, produção, modelo e apresentação): `vizinhas` (quantas plantas
 * em volta de uma célula, dentro da grade), `colher` com o bônus das plantas juntas, `expandir` (a
 * grade ganha uma coluna, com custo e sem mudar o jardim recebido) e, no extra, `plantasPorTipo`.
 * O modelo é feito de funções puras exportadas: os objetivos chamam essas funções com casos
 * pequenos e conferem a tela uma vez. Modelo Pro `vanilla-vite` (Vite + TypeScript).
 */

export const MODELO_PRO = 'vanilla-vite' as const
/** A grade da tela: 4 linhas e 6 colunas de 80 pontos (cabem até 8), começando com 10 moedas. */
export const NUVENS_PRO = { linhas: 4, colunas: 6, maxColunas: 8, lado: 80, moedas: 10 } as const

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
export const CUSTO_DA_COLUNA = 4

export function novoJardim(linhas: number, colunas: number, moedas: number): Jardim {
  const grade: Celula[][] = []
  for (let linha = 0; linha < linhas; linha++) {
    const fileira: Celula[] = []
    for (let coluna = 0; coluna < colunas; coluna++) fileira.push(null)
    grade.push(fileira)
  }
  return { linhas, colunas, grade, moedas }
}

export function podeConstruir(
  jardim: Jardim,
  linha: number,
  coluna: number,
  tipo: Planta,
): boolean {
  const dentro = linha >= 0 && linha < jardim.linhas && coluna >= 0 && coluna < jardim.colunas
  if (!dentro) return false
  if (jardim.grade[linha][coluna] !== null) return false
  return jardim.moedas >= CUSTO[tipo]
}

export function construir(
  jardim: Jardim,
  linha: number,
  coluna: number,
  tipo: Planta,
): Jardim {
  if (!podeConstruir(jardim, linha, coluna, tipo)) return jardim
  const grade = jardim.grade.map((fileira) => [...fileira])
  grade[linha][coluna] = tipo
  return { ...jardim, grade, moedas: jardim.moedas - CUSTO[tipo] }
}

export function salvar(jardim: Jardim): string {
  return JSON.stringify(jardim)
}

export function carregar(texto: string): Jardim {
  return JSON.parse(texto) as Jardim
}
`

const PARTES = {
  vizinhas: {
    inicial: `export function vizinhas(jardim: Jardim, linha: number, coluna: number): number {
  return 0
}`,
    gabarito: `export function vizinhas(jardim: Jardim, linha: number, coluna: number): number {
  const lados = [
    [linha - 1, coluna],
    [linha + 1, coluna],
    [linha, coluna - 1],
    [linha, coluna + 1],
  ]
  let total = 0
  for (const [l, c] of lados) {
    const dentro = l >= 0 && l < jardim.linhas && c >= 0 && c < jardim.colunas
    if (dentro && jardim.grade[l][c] !== null) total += 1
  }
  return total
}`,
  },
  colher: {
    inicial: `export function colher(jardim: Jardim): Jardim {
  return jardim
}`,
    gabarito: `export function colher(jardim: Jardim): Jardim {
  let ganho = 0
  jardim.grade.forEach((fileira, linha) =>
    fileira.forEach((celula, coluna) => {
      if (celula === null) return
      ganho += PRODUCAO[celula]
      if (vizinhas(jardim, linha, coluna) > 0) ganho += 1
    }),
  )
  return { ...jardim, moedas: jardim.moedas + ganho }
}`,
  },
  expandir: {
    inicial: `export function expandir(jardim: Jardim): Jardim {
  return jardim
}`,
    gabarito: `export function expandir(jardim: Jardim): Jardim {
  if (jardim.moedas < CUSTO_DA_COLUNA) return jardim
  const grade = jardim.grade.map((fileira) => [...fileira, null])
  return {
    ...jardim,
    colunas: jardim.colunas + 1,
    grade,
    moedas: jardim.moedas - CUSTO_DA_COLUNA,
  }
}`,
  },
  porTipo: {
    inicial: `export function plantasPorTipo(jardim: Jardim): Record<Planta, number> {
  return { flor: 0, arvore: 0 }
}`,
    gabarito: `export function plantasPorTipo(jardim: Jardim): Record<Planta, number> {
  const contagem: Record<Planta, number> = { flor: 0, arvore: 0 }
  for (const fileira of jardim.grade)
    for (const celula of fileira) if (celula !== null) contagem[celula] += 1
  return contagem
}`,
  },
} as const
type Parte = keyof typeof PARTES

/** Projetos errados que o executor precisa recusar, cada um trocando uma parte do gabarito. */
export const ERROS_DAS_NUVENS_PRO = {
  'conta-as-diagonais': {
    parte: 'vizinhas',
    quebra: ['vizinhas', 'producao'],
    codigo: `export function vizinhas(jardim: Jardim, linha: number, coluna: number): number {
  let total = 0
  for (let l = linha - 1; l <= linha + 1; l++)
    for (let c = coluna - 1; c <= coluna + 1; c++) {
      if (l === linha && c === coluna) continue
      const dentro = l >= 0 && l < jardim.linhas && c >= 0 && c < jardim.colunas
      if (dentro && jardim.grade[l][c] !== null) total += 1
    }
  return total
}`,
  },
  'colhe-sem-bonus': {
    parte: 'colher',
    quebra: ['producao'],
    codigo: `export function colher(jardim: Jardim): Jardim {
  let ganho = 0
  for (const fileira of jardim.grade)
    for (const celula of fileira) if (celula !== null) ganho += PRODUCAO[celula]
  return { ...jardim, moedas: jardim.moedas + ganho }
}`,
  },
  'expande-sem-pagar': {
    parte: 'expandir',
    quebra: ['expandir'],
    codigo: `export function expandir(jardim: Jardim): Jardim {
  const grade = jardim.grade.map((fileira) => [...fileira, null])
  return { ...jardim, colunas: jardim.colunas + 1, grade }
}`,
  },
  'expande-sem-saldo': {
    parte: 'expandir',
    quebra: ['expandir'],
    codigo: `export function expandir(jardim: Jardim): Jardim {
  const grade = jardim.grade.map((fileira) => [...fileira, null])
  return {
    ...jardim,
    colunas: jardim.colunas + 1,
    grade,
    moedas: jardim.moedas - CUSTO_DA_COLUNA,
  }
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
    ...(['vizinhas', 'colher', 'expandir', 'porTipo'] as const).map((parte) =>
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
  expandir,
  novoJardim,
  type Planta,
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
  jogo.jardim = construir(jogo.jardim, linha, coluna, jogo.planta)
  desenhar()
})

document.addEventListener('keydown', (evento) => {
  if (evento.key === '1') jogo.planta = 'flor'
  if (evento.key === '2') jogo.planta = 'arvore'
  if (evento.key === 'c') jogo.jardim = colher(jogo.jardim)
  if (evento.key === 'e' && jogo.jardim.colunas < ${NUVENS_PRO.maxColunas}) jogo.jardim = expandir(jogo.jardim)
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
    <canvas id="jardim" width="${NUVENS_PRO.maxColunas * NUVENS_PRO.lado}" height="${NUVENS_PRO.linhas * NUVENS_PRO.lado}"></canvas>
    <p id="placar"></p>
    <p>Clique para plantar. 1 flor, 2 árvore, C colhe, E aumenta o jardim, S guarda, R reabre.</p>
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
