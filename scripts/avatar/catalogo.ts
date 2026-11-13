/**
 * O catálogo do avatar como REGISTRO da migração: o que a plataforma já tem, de onde cada peça
 * veio, e a comparação com o que a arte tem hoje.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AvatarCatalog, AvatarRules } from '../../packages/core/src/avatar/types'
import type { Arte, ItemDaArte, RegrasDaArte } from './arte'

const RAIZ = resolve(import.meta.dirname, '../..')
/**
 * O catálogo é um módulo TypeScript (o core não importa JSON) com o objeto em formato JSON depois
 * do `=`, para ler e escrever sem executar nada. Fica fora do Biome (`biome.json`), como os outros
 * arquivos gerados.
 */
export const ARQUIVO_DO_CATALOGO = resolve(RAIZ, 'packages/core/src/avatar/catalog.generated.ts')
export const REPOSITORIO_DA_ARTE = 'informach/artes-3d'
const CABECALHO = `// Gerado por \`bun run avatar:migrar\` (scripts/avatar). Não edite à mão o que vem da arte;
// preço, faixa e marca de menina ou menino de uma peça já migrada podem ser corrigidos aqui.
import type { AvatarCatalog } from './types'

export const AVATAR_CATALOG: AvatarCatalog = `

/** Os clipes do pack que o configurador usa (parado e as poses da Cabine de fotos). */
export const CLIPES_DO_CONFIGURADOR = [
  'parado_relaxado',
  'parado_olhando',
  'soco',
  'chute',
  'defender_com_as_maos',
  'pulo_no_ar',
  'correr_frente',
  'pose_a',
] as const

export function catalogoVazio(): AvatarCatalog {
  return {
    version: 1,
    source: { repo: REPOSITORIO_DA_ARTE, ref: '', commit: '', syncedAt: '', rulesBlob: '' },
    base: { skeleton: { file: '', blob: '', clips: [] }, textures: {} },
    parts: {},
    sets: {},
    rules: {
      slots: [],
      groups: {},
      setDisables: [],
      incompatible: {},
      earsByBody: {},
      draw: { steps: [], excluded: [] },
      faces: {},
      expressions: {},
      festas: {},
      default: {},
    },
  }
}

export function lerCatalogo(): AvatarCatalog {
  if (!existsSync(ARQUIVO_DO_CATALOGO)) return catalogoVazio()
  const texto = readFileSync(ARQUIVO_DO_CATALOGO, 'utf8')
  const inicio = texto.indexOf('AvatarCatalog = ')
  if (inicio < 0) throw new Error(`${ARQUIVO_DO_CATALOGO} não tem o objeto do catálogo.`)
  return JSON.parse(texto.slice(inicio + 'AvatarCatalog = '.length)) as AvatarCatalog
}

/** Chaves em ordem, para o arquivo mudar só onde o conteúdo mudou. */
function ordenado<T>(mapa: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(mapa).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}

export function gravarCatalogo(catalogo: AvatarCatalog): void {
  const arrumado: AvatarCatalog = {
    ...catalogo,
    base: { ...catalogo.base, textures: ordenado(catalogo.base.textures) },
    parts: ordenado(catalogo.parts),
    sets: ordenado(catalogo.sets),
  }
  writeFileSync(
    ARQUIVO_DO_CATALOGO,
    `${CABECALHO}${JSON.stringify(arrumado, null, 2)}
`,
  )
}

/** As regras do pack, do jeito da arte para o jeito do catálogo. */
export function regrasDoCatalogo(regras: RegrasDaArte): AvatarRules {
  const incompatible: Record<string, Set<string>> = {}
  const ligar = (a: string, b: string) => {
    incompatible[a] ??= new Set()
    incompatible[a].add(b)
  }
  for (const [peca, outras] of Object.entries(regras.nao_combina?.pares ?? {})) {
    for (const outra of outras) {
      ligar(peca, outra)
      ligar(outra, peca)
    }
  }
  const festas: AvatarRules['festas'] = {}
  for (const [id, festa] of Object.entries(regras.festas ?? {})) {
    if (typeof festa === 'string') continue
    festas[id] = { label: festa.rotulo, prize: festa.premio, themed: festa.pecas_do_tema }
  }
  return {
    slots: regras.slots.map((s) => ({
      id: s.slot,
      label: s.rotulo,
      required: s.obrigatorio,
      groups: s.grupos,
    })),
    groups: Object.fromEntries(
      Object.entries(regras.grupos).map(([id, g]) => [id, { label: g.rotulo, parts: g.pecas }]),
    ),
    setDisables: regras.exclusoes.fantasia_desliga,
    incompatible: ordenado(
      Object.fromEntries(Object.entries(incompatible).map(([id, set]) => [id, [...set].sort()])),
    ),
    earsByBody: regras.orelhas_por_corpo,
    draw: {
      steps: regras.sorteio.passos.map((p) => ({
        group: p.grupo,
        probability: p.probabilidade,
        compatible: p.compativeis,
        ...(p.libera ? { unlocks: p.libera, unlockChance: p.chance_libera ?? 1 } : {}),
        ...(p.libera_se_nao_ligado ? { unlocksUnlessOn: p.libera_se_nao_ligado } : {}),
      })),
      excluded: regras.fora_do_sorteio ?? [],
    },
    faces: regras.rostos.conjuntos,
    expressions: Object.fromEntries(
      Object.entries(regras.rostos.expressoes).map(([id, e]) => [id, e.rotulo]),
    ),
    festas,
    default: regras.padrao.pecas,
  }
}

export interface Comparacao {
  /** Na arte e ainda não migradas. */
  novas: ItemDaArte[]
  /** Migradas, mas o arquivo da arte é outro desde então. */
  mudaram: ItemDaArte[]
  /** Migradas e fora da arte hoje (ainda não marcadas como aposentadas). */
  sairam: string[]
  iguais: number
  esqueletoMudou: boolean
  regrasMudaram: boolean
}

export function comparar(arte: Arte, catalogo: AvatarCatalog): Comparacao {
  const naArte = arte.pecas()
  const ids = new Set(naArte.map((p) => p.id))
  const novas: ItemDaArte[] = []
  const mudaram: ItemDaArte[] = []
  let iguais = 0
  for (const item of naArte) {
    const entrada = catalogo.parts[item.id]
    if (!entrada) novas.push(item)
    else if (
      entrada.origin.blob !== arte.blob(`${item.pasta}/${item.arquivo}`) ||
      entrada.origin.thumbBlob !== arte.blob(`${item.pasta}/${item.miniatura}`)
    )
      mudaram.push(item)
    else iguais += 1
  }
  const esqueleto = arte.esqueleto()
  return {
    novas,
    mudaram,
    sairam: Object.entries(catalogo.parts)
      .filter(([id, p]) => !ids.has(id) && !p.retired)
      .map(([id]) => id),
    iguais,
    esqueletoMudou: catalogo.base.skeleton.blob !== arte.blob(`esqueleto/${esqueleto.arquivo}`),
    regrasMudaram: catalogo.source.rulesBlob !== arte.blob('regras.json'),
  }
}
