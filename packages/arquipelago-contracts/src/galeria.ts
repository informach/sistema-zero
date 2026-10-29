import { z } from 'zod'
import type { ObjetoDaCasa } from './objetos'

/**
 * A galeria (fase1-13, 29/10/2026): a aparência pronta de cada objeto da casa, comprada com moedas
 * Zappy. A função do objeto já vale no projeto azul; a galeria só compra o visual.
 *
 * Hoje há uma aparência por objeto, e ela é o modelo do Blender que o jogo já tem
 * (`arquipelago/src/assets/objetos/<objeto>.glb`). O catálogo já recebe variações (outras cores e
 * estilos do mesmo objeto): cada uma é uma entrada nova com id próprio e o `modelo` dela.
 */

/** O modelo que a aparência mostra. `objeto` = o modelo do próprio objeto (`<objeto>.glb`). */
export const MODELOS_DA_GALERIA = ['objeto'] as const
export type ModeloDaGaleria = (typeof MODELOS_DA_GALERIA)[number]

/**
 * Faixa de preço. O piso é o prêmio de um desafio principal (20 moedas); o teto é metade do teto
 * semanal de moedas do jogo (150): comprar pede algumas tarefas, nunca uma semana inteira
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
 * `POST /arquipelago/galeria/compras`: comprar uma aparência. A `chave` é do pedido: repetir com a
 * mesma chave (ou comprar de novo o que já é dela) nunca cobra duas vezes. Responde a galeria do
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
