import { z } from 'zod'
import { RelevoSchema } from '../documento'
import {
  DefinicaoDeConjuntoSchema,
  LIMITES_CONJUNTOS,
  MontagemDeConjuntoSchema,
} from './conjuntos-schema'
import {
  AguaSchema,
  CamadaSchema,
  CaminhoSchema,
  type COLISOES,
  GrupoSchema,
  IdentificadorDeCenarioSchema,
  InstanciaSchema,
  LIMITES_CENARIO_V2,
  MarcadorSchema,
  ModeloDoCenarioSchema,
  type PropriedadesSchema,
  TexturaDoCenarioSchema,
  type TransformacaoSchema,
} from './entidades-schema'
import { FormaDeCenarioSchema } from './formas'
import { BaseDeTerrenoSchema } from './terreno'

export * from './entidades-schema'

/**
 * Documento v2: genérico, para o cenário de qualquer jogo.
 *
 * O que muda em relação ao v1:
 * - a base é uma união (`plano` ou `perfil`); nenhum jogo é pressuposto;
 * - os modelos vêm de bibliotecas e ficam fixados por digest na tabela `modelos`;
 * - a escala é por eixo;
 * - o que pertencia ao Arquipélago (ator, placa, colisões próprias) virou propriedade
 *   personalizada, interpretada pelo perfil do jogo.
 *
 * Campos novos entram sempre como opcionais, para o formato crescer sem trocar de versão.
 */
const id = IdentificadorDeCenarioSchema

export const BaseSchema = z.discriminatedUnion('tipo', [
  BaseDeTerrenoSchema,
  z
    .object({
      tipo: z.literal('plano'),
      largura: z.number().finite().min(8).max(8192),
      comprimento: z.number().finite().min(8).max(8192),
    })
    .strict(),
  /** Relevo calculado por um jogo. Só para abrir cenários v1 até a conversão em terreno. */
  z
    .object({
      tipo: z.literal('perfil'),
      perfil: id,
      versao: z.string().min(1).max(80),
      carimbos: z.array(RelevoSchema).max(4096),
    })
    .strict(),
])

export const IluminacaoSchema = z.object({ hora: z.number().finite().min(0).max(24) }).strict()

export const DocumentoDeCenarioSchema = z
  .object({
    formato: z.literal('molda-cenario'),
    versao: z.literal(2),
    id,
    nome: z.string().min(1).max(120),
    unidade: z.literal('metro'),
    eixoVertical: z.literal('y'),
    base: BaseSchema,
    modelos: z.array(ModeloDoCenarioSchema).max(LIMITES_CENARIO_V2.modelos),
    texturas: z.array(TexturaDoCenarioSchema).min(1).max(256).optional(),
    formas: z.array(FormaDeCenarioSchema).min(1).max(2000).optional(),
    grupos: z.array(GrupoSchema).max(LIMITES_CENARIO_V2.objetos),
    camadas: z.array(CamadaSchema).min(1).max(128).optional(),
    instancias: z.array(InstanciaSchema).max(LIMITES_CENARIO_V2.objetos),
    definicoesConjuntos: z
      .array(DefinicaoDeConjuntoSchema)
      .min(1)
      .max(LIMITES_CONJUNTOS.definicoes)
      .optional(),
    montagens: z.array(MontagemDeConjuntoSchema).min(1).max(LIMITES_CONJUNTOS.montagens).optional(),
    caminhos: z.array(CaminhoSchema).max(2000),
    aguas: z.array(AguaSchema).max(256),
    marcadores: z.array(MarcadorSchema).max(4096),
    iluminacao: IluminacaoSchema,
  })
  .strict()

export type DocumentoDeCenario = z.infer<typeof DocumentoDeCenarioSchema>
export type InstanciaDeCenario = z.infer<typeof InstanciaSchema>
export type GrupoDeCenario = z.infer<typeof GrupoSchema>
export type CamadaDeCenario = z.infer<typeof CamadaSchema>
export type CaminhoDeCenario = z.infer<typeof CaminhoSchema>
export type AguaDeCenario = z.infer<typeof AguaSchema>
export type MarcadorDeCenario = z.infer<typeof MarcadorSchema>
export type ModeloDoCenario = z.infer<typeof ModeloDoCenarioSchema>
export type TexturaDoCenario = z.infer<typeof TexturaDoCenarioSchema>
export type BaseDeCenario = z.infer<typeof BaseSchema>
export type Transformacao = z.infer<typeof TransformacaoSchema>
export type Propriedades = z.infer<typeof PropriedadesSchema>
export type Colisao = (typeof COLISOES)[number]

/** Identidade de leitura, independente da ordem das chaves recebidas do JSONB. Não é um hash de arquivo. */
export function chaveDaBase(b: BaseDeCenario): string {
  if (b.tipo === 'plano') return JSON.stringify([b.tipo, b.largura, b.comprimento])
  if (b.tipo === 'perfil')
    return JSON.stringify([
      b.tipo,
      b.perfil,
      b.versao,
      b.carimbos.map((c) => [c.id, c.tipo, c.centro.x, c.centro.z, c.raio, c.valor, c.intensidade]),
    ])
  return JSON.stringify([
    b.tipo,
    b.origem.x,
    b.origem.z,
    b.passo,
    b.colunas,
    b.linhas,
    b.min,
    b.max,
    b.fundo,
    [...b.pecas]
      .sort((a, c) => a.linha - c.linha || a.coluna - c.coluna)
      .map((p) => [p.coluna, p.linha, p.digest]),
    (b.recortes ?? []).map((p) => p.map((v) => [v.x, v.z])),
    b.solo
      ? [
          b.solo.camadas.map((c) => [
            c.id,
            c.nome,
            c.cor,
            c.textura?.id ?? null,
            c.textura?.repeticaoMetros ?? null,
          ]),
          [...b.solo.pecas]
            .sort((a, c) => a.linha - c.linha || a.coluna - c.coluna)
            .map((p) => [p.coluna, p.linha, p.digest]),
        ]
      : null,
    [...(b.buracos ?? [])]
      .sort((a, c) => a.linha - c.linha || a.coluna - c.coluna)
      .map((p) => [p.coluna, p.linha, p.digest]),
  ])
}

/** Cenário vazio sobre um chão plano: o ponto de partida de qualquer jogo. */
export function criarDocumentoVazio(id: string, nome: string): DocumentoDeCenario {
  return {
    formato: 'molda-cenario',
    versao: 2,
    id,
    nome,
    unidade: 'metro',
    eixoVertical: 'y',
    base: { tipo: 'plano', largura: 256, comprimento: 256 },
    modelos: [],
    grupos: [],
    instancias: [],
    caminhos: [],
    aguas: [],
    marcadores: [],
    iluminacao: { hora: 12 },
  }
}
