/**
 * Propõe o preço das peças Morada pela régua do avatar (decisão da dona, 14/11/2026) e grava
 * `packages/core/src/morada/prices.generated.ts`.
 *
 * ⚠️ Editorial: o que já está no arquivo é PRESERVADO (preço conferido ou ajustado à mão). Só a
 * peça nova recebe proposta, marcada `review`. `--tudo` refaz as propostas das peças ainda em
 * `review` (nunca as conferidas).
 *
 * A régua:
 * - construção é sempre grátis (fica fora do arquivo; `moradaPrice` responde);
 * - troféus e a estante de troféus são por conquista (fora do arquivo);
 * - as peças da casa inicial (a cama e a cadeira) e os canteiros da horta (o jogo os põe) são grátis;
 * - cada categoria de móvel tem jeito grátis: as peças mais simples (menos triângulos), 5% da
 *   categoria e no mínimo duas;
 * - gatos e cachorros: 300 (o preço do bichinho do quarto antigo);
 * - o resto, pelo tamanho dentro da categoria (o terço menor, o do meio e o maior), nas três
 *   faixas de preço da categoria, tiradas do quarto antigo (sofá 80, beliche 120, estante 70,
 *   guarda-roupa 110, luminária 50 a 70, planta 30 a 130, mesa gamer 150…).
 *
 * Uso: `bun scripts/morada/propor-precos.ts [--tudo]`
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MORADA_CATALOG } from '../../packages/core/src/morada/catalog.generated'
import { MORADA_PRICES } from '../../packages/core/src/morada/prices.generated'
import {
  type MoradaBand,
  type MoradaPrice,
  moradaPrice,
} from '../../packages/core/src/morada/pricing'
import type { MoradaPiece } from '../../packages/core/src/morada/types'

/** As três faixas (o terço menor, o do meio, o maior) de cada categoria de móvel. */
export const FAIXAS_DA_CATEGORIA: Record<string, readonly [number, number, number]> = {
  armarios: [70, 90, 110],
  banheiro: [40, 60, 80],
  brinquedos: [30, 50, 70],
  cadeiras: [40, 60, 90],
  camas: [70, 90, 120],
  comida: [30, 40, 50],
  cozinha_eletros: [40, 70, 100],
  cozinha_moveis: [50, 70, 90],
  criados: [40, 50, 60],
  escola: [40, 60, 80],
  escritorio: [50, 70, 90],
  estantes: [50, 70, 90],
  fazenda: [40, 60, 90],
  halloween: [40, 60, 80],
  jogos: [70, 100, 150],
  lareiras: [90, 120, 150],
  livros: [30, 40, 50],
  luminarias: [50, 60, 70],
  mesas: [50, 70, 110],
  natal: [40, 60, 80],
  objetos: [30, 50, 70],
  plantas: [30, 50, 80],
  pufes: [40, 50, 60],
  quadros: [40, 50, 60],
  racks_tv: [60, 80, 100],
  sapateiras: [40, 50, 60],
  saude: [30, 50, 70],
  sofas: [60, 80, 100],
  tapetes: [40, 60, 80],
}
const FAIXA_PADRAO = [40, 60, 80] as const
/** O bichinho de estimação (gato ou cachorro), como o `pet-gato`/`pet-cachorro` do quarto antigo. */
export const PRECO_DO_BICHINHO = 300
/** As peças da casa inicial (`createMoradaHouse`): toda criança começa com elas. */
export const DA_CASA_INICIAL = [
  'moveis/camas/cama_solteiro_classica_azul',
  'moveis/cadeiras/cadeira_escritorio_rosa_pacote',
] as const
/**
 * As grátis escolhidas à mão nas categorias de que um quarto mais precisa (revisão crítica de
 * 14/11/2026): a régua automática pegava interruptor, letreiro de cassino e divisória. Nas outras
 * categorias vale a régua automática.
 */
export const GRATIS_ESCOLHIDAS: Record<string, readonly string[]> = {
  sofas: ['moveis/sofas/poltrona_listrada_verde', 'moveis/sofas/sofa_curvo_rosa_pacote'],
  luminarias: ['moveis/luminarias/abajur_classico', 'moveis/luminarias/luminaria_chao_cupula'],
  quadros: [
    'moveis/quadros/poster_foguete',
    'moveis/quadros/poster_dinossauro',
    'moveis/quadros/desenho_crianca_casa',
    'moveis/quadros/tela_pintura_paisagem',
  ],
  plantas: ['moveis/plantas/planta_mini_suculenta', 'moveis/plantas/planta_florzinha_pacote'],
  tapetes: ['moveis/tapetes/tapete_redondo_pessego', 'moveis/tapetes/tapete_listrado_laranja'],
  estantes: [
    'moveis/estantes/prateleira_parede_simples_branca',
    'moveis/estantes/estante_modular_cubo',
  ],
  armarios: [
    'moveis/armarios/bau_brinquedos_azul',
    'moveis/armarios/armario_alto_estreito_madeira',
  ],
  racks_tv: [
    'moveis/racks_tv/tv_antiga_amarela_antena',
    'moveis/racks_tv/rack_nichos_abertos_madeira',
  ],
  jogos: ['moveis/jogos/quebra_cabeca_montado', 'moveis/jogos/jogo_memoria_cartas'],
  banheiro: [
    'moveis/banheiro/espelho_retangular_rosa',
    'moveis/banheiro/copo_escovas_verde',
    'moveis/banheiro/toalha_dobrada_laranja',
    'moveis/banheiro/saboneteira_sabonete_roxa',
  ],
}
/** Quantas peças grátis por categoria: 5%, no mínimo duas. */
export const gratisNaCategoria = (n: number) => Math.max(2, Math.ceil(n * 0.05))

export function faixaDoPreco(preco: number): MoradaBand {
  return preco <= 60 ? 'comum' : preco <= 110 ? 'especial' : 'raro'
}

const volume = (p: MoradaPiece) => p.size[0] * p.size[1] * p.size[2]
/** O canteiro de plantar (a mesma régua do jogo, `isPlantingPiece`). */
export const eCanteiro = (p: MoradaPiece) =>
  /canteiro|talhao/.test(p.id) || p.tags.includes('plantar')

/** A proposta da régua para todas as peças que entram no arquivo (móveis e bichinhos). */
export function proporPrecos(pieces: readonly MoradaPiece[]): Record<string, MoradaPrice> {
  const propostas: Record<string, MoradaPrice> = {}
  const porCategoria = new Map<string, MoradaPiece[]>()
  for (const p of pieces) {
    if (p.kind === 'construction' || moradaPrice(p.id).tier === 'trophy') continue
    // Os canteiros da horta: o jogo os põe na casa pelo progresso da horta (as 24 parcelas).
    if (eCanteiro(p)) {
      propostas[p.id] = { tier: 'free', price: 0, review: true }
      continue
    }
    if (p.kind === 'pet') {
      propostas[p.id] = {
        tier: 'coins',
        price: PRECO_DO_BICHINHO,
        band: 'raro',
        review: true,
      }
      continue
    }
    const lista: MoradaPiece[] = porCategoria.get(p.category) ?? []
    lista.push(p)
    porCategoria.set(p.category, lista)
  }
  for (const [categoria, lista] of porCategoria) {
    // As grátis são peças de verdade da categoria (nem o pedacinho, nem a maior): entre o quarto e
    // os três quartos do tamanho, as mais simples (menos triângulos).
    const porTamanho = [...lista].sort((a, b) => volume(a) - volume(b))
    const meio = porTamanho.slice(
      Math.floor(porTamanho.length / 4),
      Math.max(Math.ceil((porTamanho.length * 3) / 4), Math.floor(porTamanho.length / 4) + 1),
    )
    const escolhidas = GRATIS_ESCOLHIDAS[categoria]?.filter((id) => lista.some((p) => p.id === id))
    const gratis = new Set(
      escolhidas?.length
        ? escolhidas
        : meio
            .sort((a, b) => a.triangles - b.triangles || a.id.localeCompare(b.id))
            .slice(0, gratisNaCategoria(lista.length))
            .map((p) => p.id),
    )
    for (const id of DA_CASA_INICIAL) gratis.add(id)
    const faixas = FAIXAS_DA_CATEGORIA[categoria] ?? FAIXA_PADRAO
    const pagas = lista
      .filter((p) => !gratis.has(p.id))
      .sort((a, b) => volume(a) - volume(b) || a.id.localeCompare(b.id))
    for (const p of lista)
      if (gratis.has(p.id)) propostas[p.id] = { tier: 'free', price: 0, review: true }
    pagas.forEach((p, i) => {
      const terco = Math.min(2, Math.floor((i * 3) / Math.max(1, pagas.length)))
      const price = faixas[terco] ?? FAIXA_PADRAO[1]
      propostas[p.id] = { tier: 'coins', price, band: faixaDoPreco(price), review: true }
    })
  }
  return propostas
}

function gravar(precos: Record<string, MoradaPrice>): void {
  // No formato do Biome (aspas simples, chaves sem aspas): o arquivo não muda ao formatar.
  const valor = (p: MoradaPrice) =>
    `{ ${Object.entries(p)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`)
      .join(', ')} }`
  const linhas = Object.keys(precos)
    .sort()
    .map((id) => `  '${id}': ${valor(precos[id] as MoradaPrice)},`)
  const arquivo = `// Gerado por scripts/morada/propor-precos.ts e conferido à mão. Editorial: o gerador preserva.
import type { MoradaPrice } from './pricing'

export const MORADA_PRICES: Record<string, MoradaPrice> = {
${linhas.join('\n')}
}
`
  const caminho = resolve(import.meta.dirname, '../../packages/core/src/morada/prices.generated.ts')
  writeFileSync(caminho, arquivo)
  // O arquivo é editado à mão também: sai já no formato do Biome (as linhas longas quebram).
  Bun.spawnSync(['bunx', 'biome', 'format', '--write', caminho], { stdout: 'ignore' })
}

if (import.meta.main) {
  const tudo = process.argv.includes('--tudo')
  const propostas = proporPrecos(Object.values(MORADA_CATALOG.pieces))
  const precos: Record<string, MoradaPrice> = {}
  let novas = 0
  for (const [id, proposta] of Object.entries(propostas)) {
    const antes = MORADA_PRICES[id]
    const refazer = !antes || (tudo && antes.review)
    if (refazer && !antes) novas += 1
    precos[id] = refazer ? proposta : antes
  }
  gravar(precos)
  const todas = Object.values(precos)
  const pagas = todas.filter((p) => p.tier === 'coins')
  console.log(
    `${todas.length} peças com preço: ${pagas.length} pagas, ${todas.length - pagas.length} grátis; ${novas} novas propostas (review).`,
  )
}
