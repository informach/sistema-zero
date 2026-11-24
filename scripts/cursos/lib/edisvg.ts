/**
 * Monta um projeto do ediSVG (`.edisvg`) para a animação de um módulo, com as artes vetoriais do
 * próprio curso, usando o CÓDIGO DO EDISVG (informach-apps/apps/edisvg): o importador de SVG
 * (`inspectSvgImport`, com o DOMParser do jsdom) e a validação/normalização do projeto
 * (`parseProject` + `serializeProject`). Nada é desenhado à mão no formato: cada arte entra como o
 * ediSVG a importaria pelo menu "Importar SVG".
 *
 * O resultado é determinístico (mesma receita → mesmo arquivo, byte a byte): os IDs que o
 * importador sorteia são trocados por IDs derivados do nome da camada.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const RAIZ = resolve(import.meta.dir, '../../..')
/** A pasta do app ediSVG; por padrão, o informach-apps ao lado do sistema-zero. */
export const EDISVG_APP = resolve(
  process.env.EDISVG_APP ?? join(RAIZ, '../informach-apps/apps/edisvg'),
)

type No = {
  id: string
  name: string
  tag: string
  attrs?: Record<string, string>
  transform?: Record<string, number>
  visible?: boolean
  children?: No[]
  [k: string]: unknown
}
type Quadro = [quadro: number, valor: number, curva?: Curva]
export type Curva = 'linear' | 'segura' | 'suave' | 'entra' | 'sai' | 'mola'
export type Propriedade = 'x' | 'y' | 'rotation' | 'sx' | 'sy' | 'opacity' | 'skewX'

const CURVAS: Record<Curva, unknown> = {
  linear: 'linear',
  segura: 'hold',
  suave: { kind: 'cubic-bezier', points: [0.42, 0, 0.58, 1] },
  entra: { kind: 'cubic-bezier', points: [0.42, 0, 1, 1] },
  sai: { kind: 'cubic-bezier', points: [0, 0, 0.58, 1] },
  mola: { kind: 'elastic', amplitude: 1, period: 0.35 },
}

let ferramentas: Promise<{
  importar: (svg: string) => { scene: { viewBox: number[]; nodes: No[] } | null; report: unknown }
  parseProject: (p: unknown) => unknown
  serializeProject: (p: unknown) => string
}> | null = null

/** Carrega o importador e o validador do ediSVG (uma vez). */
function carregar() {
  ferramentas ??= (async () => {
    if (!existsSync(join(EDISVG_APP, 'src/shared/project.ts')))
      throw new Error(
        `ediSVG não encontrado em ${EDISVG_APP}. Clone o informach-apps ao lado do sistema-zero (ou defina EDISVG_APP) e rode pnpm install nele.`,
      )
    const pnpm = resolve(EDISVG_APP, '../../node_modules/.pnpm')
    const jsdom = readdirSync(pnpm).find((d) => /^jsdom@/.test(d))
    if (!jsdom) throw new Error(`jsdom não encontrado em ${pnpm} (pnpm install no informach-apps)`)
    const url = (p: string) => pathToFileURL(p).href
    const { JSDOM } = await import(url(join(pnpm, jsdom, 'node_modules/jsdom/lib/api.js')))
    const { inspectSvgImport } = await import(
      url(join(EDISVG_APP, 'src/renderer/src/svgImport.js'))
    )
    const { parseProject } = await import(url(join(EDISVG_APP, 'src/shared/project.ts')))
    const { serializeProject } = await import(url(join(EDISVG_APP, 'src/shared/projectPolicy.ts')))
    const Parser = new JSDOM('').window.DOMParser
    return {
      importar: (svg: string) => inspectSvgImport(svg, Parser),
      parseProject,
      serializeProject,
    }
  })()
  return ferramentas
}

const slug = (texto: string) =>
  texto
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** As artes SVG de um projeto do Estúdio (`.szproject.json`), pelo nome do recurso. */
export function artesDoProjeto(arquivo: string): Record<string, string> {
  const projeto = JSON.parse(readFileSync(resolve(RAIZ, arquivo), 'utf8')) as {
    assets?: { name: string; dataUrl?: string }[]
  }
  const artes: Record<string, string> = {}
  for (const a of projeto.assets ?? []) {
    const m = a.dataUrl?.match(/^data:image\/svg\+xml(;base64)?,(.*)$/s)
    if (!m) continue
    artes[a.name] = m[1] ? Buffer.from(m[2]!, 'base64').toString('utf8') : decodeURIComponent(m[2]!)
  }
  return artes
}

export interface Camada {
  /** Posição, na prancheta, do ponto `ancora` da arte. */
  x: number
  y: number
  escala?: number
  /** Ponto da arte (coordenadas do viewBox do SVG) que fica em x,y; é também o pivô de giro e
   *  escala. Padrão: o centro da base da arte. */
  ancora?: [number, number]
  opacidade?: number
}

/**
 * Uma cena de uma prancheta e um clipe em loop. As camadas entram na ordem de desenho (a
 * primeira fica atrás). As trilhas usam valores ABSOLUTOS da propriedade (o ediSVG troca o valor
 * da camada pelo da trilha): x/y são deslocamentos a partir da posição da camada, sx/sy escalas
 * relativas, opacity de 0 a 100.
 */
export class Cena {
  private readonly nos: No[] = []
  private readonly pendentes: { id: string; nome: string; svg: string; camada: Camada }[] = []
  private readonly trilhas: {
    id: string
    targetId: string
    property: Propriedade
    keys: unknown[]
  }[] = []
  private readonly usados = new Set<string>()

  constructor(
    readonly opcoes: {
      /** Nome do arquivo (sem .edisvg), em minúsculas e hífens. */
      chave: string
      /** Título do clipe (aparece como texto alternativo da animação). */
      titulo: string
      largura: number
      altura: number
      /** Onde a prancheta começa no eixo y (para cortar o vazio de cima sem mudar as posições). */
      topo?: number
      fps?: number
      quadros: number
    },
  ) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(opcoes.chave))
      throw new Error(`Chave inválida: ${opcoes.chave}`)
  }

  private novoId(nome: string) {
    const base = `node-${slug(nome) || 'camada'}`
    let id = base
    for (let n = 2; this.usados.has(id); n++) id = `${base}-${n}`
    this.usados.add(id)
    return id
  }

  /** Uma arte SVG do curso, importada como o ediSVG importaria, dentro de um grupo com o nome dado. */
  svg(nome: string, svg: string, camada: Camada): string {
    const id = this.novoId(nome)
    this.pendentes.push({ id, nome, svg, camada })
    this.nos.push({ id, name: nome, tag: 'g' })
    return id
  }

  /** Uma forma simples (path, ellipse, circle, rect...) com atributos SVG (todos em texto). */
  forma(
    nome: string,
    tag: 'path' | 'ellipse' | 'circle' | 'rect' | 'polygon',
    attrs: Record<string, string | number>,
    pivo: [number, number],
    opacidade = 100,
  ): string {
    const id = this.novoId(nome)
    this.nos.push({
      id,
      name: nome,
      tag,
      attrs: Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, String(v)])),
      transform: {
        x: 0,
        y: 0,
        rotation: 0,
        sx: 1,
        sy: 1,
        px: pivo[0],
        py: pivo[1],
        opacity: opacidade,
      },
    })
    return id
  }

  /** Uma trilha do clipe. Para o loop emendar, o último quadro deve repetir o valor do primeiro. */
  trilha(alvo: string, propriedade: Propriedade, quadros: Quadro[]): void {
    const n = this.trilhas.length + 1
    let anterior = -1
    for (const [q] of quadros) {
      if (q <= anterior || q > this.opcoes.quadros)
        throw new Error(`Trilha ${alvo}.${propriedade}: quadros fora de ordem ou além do fim`)
      anterior = q
    }
    this.trilhas.push({
      id: `track-${n}`,
      targetId: alvo,
      property: propriedade,
      keys: quadros.map(([frame, value, curva = 'suave'], k) => ({
        id: `key-${n}-${k + 1}`,
        frame,
        value,
        easing: CURVAS[curva],
      })),
    })
  }

  /** O texto do `.edisvg`, já normalizado e validado pelo próprio ediSVG. */
  async projeto(): Promise<string> {
    const { importar, parseProject, serializeProject } = await carregar()
    for (const p of this.pendentes) {
      const r = importar(p.svg)
      if (!r.scene)
        throw new Error(`A arte "${p.nome}" não importa no ediSVG: ${JSON.stringify(r.report)}`)
      const [vx, vy, vw, vh] = r.scene.viewBox as [number, number, number, number]
      const s = p.camada.escala ?? 1
      const [ax, ay] = p.camada.ancora ?? [vx + vw / 2, vy + vh]
      // IDs determinísticos: <grupo>-1, <grupo>-2... na ordem do desenho, com as referências
      // internas (recortes, máscaras) trocadas junto.
      const troca = new Map<string, string>()
      let k = 0
      const renomear = (nos: No[]) => {
        for (const no of nos) {
          troca.set(no.id, `${p.id}-${++k}`)
          renomear(no.children ?? [])
        }
      }
      renomear(r.scene.nodes)
      const filhos = JSON.parse(JSON.stringify(r.scene.nodes), (_chave, v) =>
        typeof v === 'string' && troca.has(v) ? troca.get(v) : v,
      ) as No[]
      const grupo = this.nos.find((n) => n.id === p.id)!
      Object.assign(grupo, {
        attrs: { transform: `matrix(${s} 0 0 ${s} ${p.camada.x - s * ax} ${p.camada.y - s * ay})` },
        transform: {
          x: 0,
          y: 0,
          rotation: 0,
          sx: 1,
          sy: 1,
          px: p.camada.x,
          py: p.camada.y,
          opacity: p.camada.opacidade ?? 100,
        },
        children: filhos,
      })
    }
    const { chave, titulo, largura, altura, topo = 0, fps = 30, quadros } = this.opcoes
    const projeto = parseProject({
      version: 27,
      id: `project-${chave}`,
      name: titulo,
      animation: 'Parado',
      transforms: {},
      keys: [],
      artboards: [
        {
          id: `artboard-${chave}`,
          name: titulo,
          scene: { viewBox: [0, topo, largura, altura], nodes: this.nos },
        },
      ],
      defaultArtboardId: `artboard-${chave}`,
      motion: {
        version: 2,
        animations: [
          {
            id: `anim-${chave}`,
            name: titulo,
            fps,
            frames: quadros,
            mode: 'loop',
            tracks: this.trilhas,
          },
        ],
      },
    })
    return `${serializeProject(projeto)}\n`
  }
}
