import { z } from 'zod'
import type { ObjetoDaCasa } from './objetos'

/**
 * A galeria (fase1-13, 29/10/2026): a aparência pronta de cada objeto da casa, comprada com moedas
 * Zappy. A função do objeto já vale no projeto azul; a galeria só compra o visual.
 *
 * Cada objeto tem três aparências (B8, 31/10/2026): a clássica, que é o modelo do Blender que o
 * jogo já tinha (`arquipelago/src/assets/objetos/<objeto>.glb`), a retrô (formas arredondadas, nas
 * cores da paleta "Doces" do Pinta, a da Faísca) e a moderna (linhas retas, uma cor forte e madeira
 * clara), com a mesma caixa e os mesmos nós de função. Cada uma é uma entrada com id próprio e o
 * `modelo` dela; o preço é o da clássica.
 */

/**
 * O modelo que a aparência mostra. `objeto` = o modelo do próprio objeto (`<objeto>.glb`); `retro`
 * e `moderna` = `<objeto>-retro.glb` e `<objeto>-moderna.glb`.
 */
export const MODELOS_DA_GALERIA = ['objeto', 'retro', 'moderna'] as const
export type ModeloDaGaleria = (typeof MODELOS_DA_GALERIA)[number]

/**
 * Faixa de preço. O piso é o prêmio de um desafio principal (20 moedas); o teto é 75, abaixo do teto
 * semanal de moedas do jogo (100): comprar pede algumas tarefas, nunca uma semana inteira
 * (balanceamento em `docs/arquipelago-regras.md`, seção 9).
 */
export const PRECO_MINIMO_DA_GALERIA = 20
export const PRECO_MAXIMO_DA_GALERIA = 75

/** Os ids da galeria. Estáveis: estão nos salvamentos e no banco do serviço; nunca renomear. */
export const IDS_DA_GALERIA = [
  'geladeira-classica',
  'forno-classico',
  'aquario-classico',
  'lareira-classica',
  'banda-classica',
  'fliperama-classico',
  'museu-classico',
  'casinha-classica',
  'planta-interior-classica',
  // As versões retrô e moderna (B8, 31/10/2026), na mesma ordem dos objetos.
  'geladeira-retro',
  'geladeira-moderna',
  'forno-retro',
  'forno-moderno',
  'aquario-retro',
  'aquario-moderno',
  'lareira-retro',
  'lareira-moderna',
  'banda-retro',
  'banda-moderna',
  'fliperama-retro',
  'fliperama-moderno',
  'museu-retro',
  'museu-moderno',
  'casinha-retro',
  'casinha-moderna',
  'planta-interior-retro',
  'planta-interior-moderna',
] as const
export type IdDaGaleria = (typeof IDS_DA_GALERIA)[number]

export interface AparenciaDaGaleria {
  id: IdDaGaleria
  objeto: ObjetoDaCasa
  /** O nome que a criança lê no cartão. */
  nome: string
  /** Em moedas Zappy. */
  preco: number
  modelo: ModeloDaGaleria
}

/** O catálogo, na ordem do jogo (a mesma de `OBJETOS_DA_CASA`). */
export const GALERIA: Readonly<Record<IdDaGaleria, AparenciaDaGaleria>> = {
  'geladeira-classica': {
    id: 'geladeira-classica',
    objeto: 'geladeira',
    nome: 'Geladeira clássica',
    preco: 60,
    modelo: 'objeto',
  },
  'forno-classico': {
    id: 'forno-classico',
    objeto: 'forno',
    nome: 'Forno clássico',
    preco: 50,
    modelo: 'objeto',
  },
  'aquario-classico': {
    id: 'aquario-classico',
    objeto: 'aquario',
    nome: 'Aquário do recife',
    preco: 70,
    modelo: 'objeto',
  },
  'lareira-classica': {
    id: 'lareira-classica',
    objeto: 'lareira',
    nome: 'Lareira de pedra',
    preco: 60,
    modelo: 'objeto',
  },
  'banda-classica': {
    id: 'banda-classica',
    objeto: 'banda',
    nome: 'Instrumentos da banda',
    preco: 70,
    modelo: 'objeto',
  },
  'fliperama-classico': {
    id: 'fliperama-classico',
    objeto: 'fliperama',
    nome: 'Fliperama clássico',
    preco: 70,
    modelo: 'objeto',
  },
  'museu-classico': {
    id: 'museu-classico',
    objeto: 'museu',
    nome: 'Museu dos fósseis',
    preco: 70,
    modelo: 'objeto',
  },
  'casinha-classica': {
    id: 'casinha-classica',
    objeto: 'casinha',
    nome: 'Casinha de madeira',
    preco: 40,
    modelo: 'objeto',
  },
  'planta-interior-classica': {
    id: 'planta-interior-classica',
    objeto: 'planta-interior',
    nome: 'Planta no vaso',
    preco: 30,
    modelo: 'objeto',
  },
  'geladeira-retro': {
    id: 'geladeira-retro',
    objeto: 'geladeira',
    nome: 'Geladeira retrô',
    preco: 60,
    modelo: 'retro',
  },
  'geladeira-moderna': {
    id: 'geladeira-moderna',
    objeto: 'geladeira',
    nome: 'Geladeira moderna',
    preco: 60,
    modelo: 'moderna',
  },
  'forno-retro': {
    id: 'forno-retro',
    objeto: 'forno',
    nome: 'Forno retrô',
    preco: 50,
    modelo: 'retro',
  },
  'forno-moderno': {
    id: 'forno-moderno',
    objeto: 'forno',
    nome: 'Forno moderno',
    preco: 50,
    modelo: 'moderna',
  },
  'aquario-retro': {
    id: 'aquario-retro',
    objeto: 'aquario',
    nome: 'Aquário retrô',
    preco: 70,
    modelo: 'retro',
  },
  'aquario-moderno': {
    id: 'aquario-moderno',
    objeto: 'aquario',
    nome: 'Aquário moderno',
    preco: 70,
    modelo: 'moderna',
  },
  'lareira-retro': {
    id: 'lareira-retro',
    objeto: 'lareira',
    nome: 'Lareira retrô',
    preco: 60,
    modelo: 'retro',
  },
  'lareira-moderna': {
    id: 'lareira-moderna',
    objeto: 'lareira',
    nome: 'Lareira moderna',
    preco: 60,
    modelo: 'moderna',
  },
  'banda-retro': {
    id: 'banda-retro',
    objeto: 'banda',
    nome: 'Instrumentos retrô',
    preco: 70,
    modelo: 'retro',
  },
  'banda-moderna': {
    id: 'banda-moderna',
    objeto: 'banda',
    nome: 'Instrumentos modernos',
    preco: 70,
    modelo: 'moderna',
  },
  'fliperama-retro': {
    id: 'fliperama-retro',
    objeto: 'fliperama',
    nome: 'Fliperama retrô',
    preco: 70,
    modelo: 'retro',
  },
  'fliperama-moderno': {
    id: 'fliperama-moderno',
    objeto: 'fliperama',
    nome: 'Fliperama moderno',
    preco: 70,
    modelo: 'moderna',
  },
  'museu-retro': {
    id: 'museu-retro',
    objeto: 'museu',
    nome: 'Museu retrô',
    preco: 70,
    modelo: 'retro',
  },
  'museu-moderno': {
    id: 'museu-moderno',
    objeto: 'museu',
    nome: 'Museu moderno',
    preco: 70,
    modelo: 'moderna',
  },
  'casinha-retro': {
    id: 'casinha-retro',
    objeto: 'casinha',
    nome: 'Casinha retrô',
    preco: 40,
    modelo: 'retro',
  },
  'casinha-moderna': {
    id: 'casinha-moderna',
    objeto: 'casinha',
    nome: 'Casinha moderna',
    preco: 40,
    modelo: 'moderna',
  },
  'planta-interior-retro': {
    id: 'planta-interior-retro',
    objeto: 'planta-interior',
    nome: 'Planta no vaso retrô',
    preco: 30,
    modelo: 'retro',
  },
  'planta-interior-moderna': {
    id: 'planta-interior-moderna',
    objeto: 'planta-interior',
    nome: 'Planta no vaso moderna',
    preco: 30,
    modelo: 'moderna',
  },
}

/** A aparência da galeria com este id, ou `undefined` (id desconhecido, de versão futura). */
export function aparenciaDaGaleria(id: string): AparenciaDaGaleria | undefined {
  return Object.hasOwn(GALERIA, id) ? GALERIA[id as IdDaGaleria] : undefined
}

/** As aparências da galeria de um objeto, da mais barata para a mais cara. */
export function galeriaDoObjeto(objeto: ObjetoDaCasa): AparenciaDaGaleria[] {
  return Object.values(GALERIA)
    .filter((a) => a.objeto === objeto)
    .sort((a, b) => a.preco - b.preco)
}

/** `GET /arquipelago/galeria`: o que ela já comprou e o saldo de moedas. */
export const GaleriaDoJogadorSchema = z.strictObject({
  /** As aparências da galeria já pagas (nunca se cobra de novo). */
  possuidas: z.array(z.enum(IDS_DA_GALERIA)).max(IDS_DA_GALERIA.length),
  /** Moedas Zappy agora; `null` quando o saldo não pôde ser lido (o cartão não promete nada). */
  saldo: z.number().int().min(0).nullable(),
  /** A equipe compra sem gastar (como na loja do quarto). */
  ilimitado: z.boolean(),
})
export type GaleriaDoJogador = z.infer<typeof GaleriaDoJogadorSchema>

/**
 * `POST /arquipelago/galeria/compras`: comprar uma aparência. A `chave` identifica o pedido no
 * cliente; a idempotência no Members é por perfil, público e item, mesmo com outra chave. Responde a galeria do
 * jogador atualizada. Saldo curto: 409 `SALDO_INSUFICIENTE` com `preco` e `saldo` junto do erro.
 */
export const CompraNaGaleriaSchema = z.strictObject({
  aparencia: z.enum(IDS_DA_GALERIA),
  chave: z.uuid(),
})
export type CompraNaGaleria = z.infer<typeof CompraNaGaleriaSchema>

/** Os detalhes do 409 `SALDO_INSUFICIENTE` (`saldo` é `null` quando não pôde ser lido). */
export const SaldoInsuficienteSchema = z.strictObject({
  preco: z.number().int().positive(),
  saldo: z.number().int().min(0).nullable(),
})
export type SaldoInsuficiente = z.infer<typeof SaldoInsuficienteSchema>
