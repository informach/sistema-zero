import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { z } from 'zod'
import { FonteDaCompilacaoSchema } from './compilar/fonte'
import { LicencaDaBibliotecaSchema } from './compilar/licencas'
import { LIMITES_DA_EXPORTACAO } from './compilar/limites'
import type { PreparoDeExportacao } from './compilar/preparo-exportacao'
import { referenciasDaCenaParaCompilacao } from './compilar/referencias'
import {
  type CenaCompilada,
  FontesDaCenaCompiladaSchema,
  lerCenaCompilada,
  MAX_BYTES_DO_MANIFESTO,
} from './compilar/schema'
import { ArquivoCompiladoSchema, DigestCompiladoSchema } from './compilar/schema-arquivos'
import { digestDosBytes } from './v2/glb'

export { MAX_BYTES_DO_MANIFESTO } from './compilar/schema'

/** Alvos de execução do jogo, nunca espaços de autoria fornecidos pelo cliente. */
export const PERFIS_DE_ILHA = [
  'sua-ilha',
  'bosque',
  'vila-doce',
  'recife',
  'pico',
  'vale-dos-dinos',
  'nuvens',
] as const
export const MIME_DO_MANIFESTO = 'application/vnd.sistemazero.cena-compilada+json' as const
export const PerfilDePublicacaoSchema = z
  .object({
    tipo: z.literal('arquipelago-v2'),
    ilha: z.enum(PERFIS_DE_ILHA),
  })
  .strict()
export const PedidoDePublicacaoSchema = z
  .object({
    operacaoId: z.uuid(),
    perfil: PerfilDePublicacaoSchema,
    versaoEsperada: z.number().int().min(0).max(2147483646),
    fonte: FonteDaCompilacaoSchema.extend({ digest: DigestCompiladoSchema }),
    manifesto: z
      .object({
        digest: DigestCompiladoSchema,
        bytes: z.number().int().positive().max(MAX_BYTES_DO_MANIFESTO),
      })
      .strict(),
  })
  .strict()

export type PerfilDePublicacao = z.infer<typeof PerfilDePublicacaoSchema>
export type PedidoDePublicacao = z.infer<typeof PedidoDePublicacaoSchema>
export const PublicacaoParaOJogoSchema = z
  .object({
    id: z.uuid(),
    perfil: PerfilDePublicacaoSchema,
    versao: z.number().int().positive().max(2147483647),
    fonte: PedidoDePublicacaoSchema.shape.fonte,
    manifesto: PedidoDePublicacaoSchema.shape.manifesto,
  })
  .strict()
export type PublicacaoParaOJogo = z.infer<typeof PublicacaoParaOJogoSchema>
export const ResultadoDaPublicacaoSchema = z
  .object({ publicacao: PublicacaoParaOJogoSchema, repetido: z.boolean() })
  .strict()
export type ResultadoDaPublicacao = z.infer<typeof ResultadoDaPublicacaoSchema>
export function lerResultadoDaPublicacao(
  pedido: PedidoDePublicacao,
  entrada: unknown,
): ResultadoDaPublicacao {
  const resultado = ResultadoDaPublicacaoSchema.parse(entrada),
    p = resultado.publicacao
  if (
    p.versao !== pedido.versaoEsperada + 1 ||
    canonicalJson(p.perfil) !== canonicalJson(pedido.perfil) ||
    canonicalJson(p.fonte) !== canonicalJson(pedido.fonte) ||
    canonicalJson(p.manifesto) !== canonicalJson(pedido.manifesto)
  )
    throw Error('A publicação respondeu com outra revisão, versão ou destino.')
  return resultado
}
export const PreparacaoDePublicacaoSchema = z
  .object({
    espacoId: z.uuid(),
    pedido: PedidoDePublicacaoSchema,
    publicacao: PublicacaoParaOJogoSchema.nullable(),
  })
  .strict()
export type PreparacaoDePublicacao = z.infer<typeof PreparacaoDePublicacaoSchema>
export function conferirPreparacaoDePublicacao(
  pedido: PedidoDePublicacao,
  entrada: unknown,
): PreparacaoDePublicacao {
  const preparo = PreparacaoDePublicacaoSchema.parse(entrada)
  if (canonicalJson(preparo.pedido) !== canonicalJson(pedido))
    throw Error('O preparo da publicação pertence a outra revisão.')
  if (preparo.publicacao)
    lerResultadoDaPublicacao(pedido, { publicacao: preparo.publicacao, repetido: true })
  return preparo
}
export const ReferenciaDeArquivoPublicadoSchema = z
  .object({ publicacaoId: z.uuid(), digest: DigestCompiladoSchema })
  .strict()
export type MimeDaPublicacao = typeof MIME_DO_MANIFESTO | CenaCompilada['arquivos'][number]['mime']
export interface RecursoDaPublicacao {
  digest: string
  bytes: number
  mime: MimeDaPublicacao
  papel: 'manifesto' | 'recurso'
}
const RecursoCompiladoSchema = z
  .object({
    digest: DigestCompiladoSchema,
    bytes: ArquivoCompiladoSchema.shape.bytes,
    mime: ArquivoCompiladoSchema.shape.mime,
    papel: z.literal('recurso'),
  })
  .strict()
const RecursoDoManifestoSchema = z
  .object({
    digest: DigestCompiladoSchema,
    bytes: z.number().int().positive().max(MAX_BYTES_DO_MANIFESTO),
    mime: z.literal(MIME_DO_MANIFESTO),
    papel: z.literal('manifesto'),
  })
  .strict()
export const RecursoDaPublicacaoSchema = z.union([RecursoCompiladoSchema, RecursoDoManifestoSchema])
/** Um lote de reserva: só recursos compilados, nunca o manifesto, sem repetir. */
export const RecursosAReservarSchema = z
  .array(RecursoCompiladoSchema)
  .min(1)
  .max(50)
  .refine((r) => new Set(r.map((x) => x.digest)).size === r.length, 'Há recurso repetido.')

/**
 * O que o servidor de dados precisa do manifesto: o inventário e a procedência. Quem lê o manifesto
 * no armazenamento e confere o hash é o BFF (o mesmo que afirma cada arquivo enviado); o manifesto
 * inteiro (até 16 MiB) não atravessa o gateway.
 */
export const ResumoDaPublicacaoSchema = z
  .object({
    recursos: z
      .array(RecursoDaPublicacaoSchema)
      .min(1)
      .max(LIMITES_DA_EXPORTACAO.arquivos + 1),
    fontes: FontesDaCenaCompiladaSchema,
    licencas: z.array(LicencaDaBibliotecaSchema).max(8192),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (new Set(r.recursos.map((x) => x.digest)).size !== r.recursos.length)
      ctx.addIssue({ code: 'custom', message: 'O inventário repete um arquivo.' })
    if (r.recursos.filter((x) => x.papel === 'manifesto').length !== 1)
      ctx.addIssue({ code: 'custom', message: 'O inventário precisa de um manifesto só.' })
  })
export type ResumoDaPublicacao = z.infer<typeof ResumoDaPublicacaoSchema>
/** Teto do corpo que leva o resumo (inventário de 8.193 arquivos + procedência), com folga. */
export const MAX_BYTES_DO_RESUMO_DE_PUBLICACAO = 4 * 1024 * 1024

/** Confere o resumo contra o pedido: o manifesto do inventário é exatamente o pedido. */
export function lerResumoDaPublicacao(
  pedido: PedidoDePublicacao,
  entrada: unknown,
): ResumoDaPublicacao {
  const resumo = ResumoDaPublicacaoSchema.parse(entrada)
  const manifesto = resumo.recursos.find((r) => r.papel === 'manifesto')!
  if (manifesto.digest !== pedido.manifesto.digest || manifesto.bytes !== pedido.manifesto.bytes)
    throw Error('O manifesto do inventário não é o do pedido de publicação.')
  return resumo
}

export function resumirPublicacao(snapshot: SnapshotDePublicacao): ResumoDaPublicacao {
  return ResumoDaPublicacaoSchema.parse({
    recursos: snapshot.recursos,
    fontes: snapshot.cena.fontes,
    licencas: snapshot.cena.licencas,
  })
}
export interface SnapshotDePublicacao {
  pedido: PedidoDePublicacao
  cena: CenaCompilada
  recursos: readonly RecursoDaPublicacao[]
  digestDaOperacao: string
}

export async function digestDoPedidoDePublicacao(entrada: unknown): Promise<string> {
  const pedido = PedidoDePublicacaoSchema.parse(entrada)
  return sha256Hex(canonicalJson(pedido))
}

/** Aliases podem mudar ao resolver conjuntos; a procedência e as licenças precisam permanecer. */
export function conferirProcedenciaDaPublicacao(
  cena: Pick<CenaCompilada, 'fontes' | 'licencas'>,
  preparo: PreparoDeExportacao,
): void {
  const refs = referenciasDaCenaParaCompilacao(preparo.documento)
  const chaves = <T>(itens: readonly T[], chave: (item: T) => unknown) =>
    [...new Set(itens.map((item) => canonicalJson(chave(item))))].sort()
  const modelo = (m: { biblioteca: string; modelo: string; digest: string }) => [
    m.biblioteca,
    m.modelo,
    m.digest,
  ]
  const textura = (t: { biblioteca: string; textura: string; digest: string }) => [
    t.biblioteca,
    t.textura,
    t.digest,
  ]
  const conjunto = (c: { id: string; biblioteca: string; conjunto: string; revisao: number }) => [
    c.id,
    c.biblioteca,
    c.conjunto,
    c.revisao,
  ]
  const pares = [
    [chaves(cena.fontes.modelos, modelo), chaves(refs.modelos, modelo)],
    [chaves(cena.fontes.texturas, textura), chaves(refs.texturas, textura)],
    [chaves(cena.fontes.conjuntos, conjunto), chaves(refs.conjuntos, conjunto)],
    [chaves(cena.licencas, (c) => c), chaves(preparo.contexto.bibliotecas, (c) => c)],
  ]
  if (pares.some(([a, b]) => canonicalJson(a) !== canonicalJson(b)))
    throw Error('A procedência e as licenças do pacote não correspondem à fonte autorizada')
}

/** Valida identidade/inventário. O conteúdo de cada recurso ainda exige o validador do motor. */
export async function criarSnapshotDePublicacao(
  entrada: unknown,
  manifesto: Uint8Array,
): Promise<SnapshotDePublicacao> {
  const pedido = PedidoDePublicacaoSchema.parse(entrada)
  if (manifesto.byteLength !== pedido.manifesto.bytes)
    throw Error('O tamanho do manifesto não corresponde ao pedido de publicação.')
  const bytes = manifesto.slice()
  if ((await digestDosBytes(bytes)) !== pedido.manifesto.digest)
    throw Error('O hash do manifesto não corresponde ao pedido de publicação.')
  let texto: string
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw Error('O manifesto precisa conter UTF-8 válido.')
  }
  const cena = lerCenaCompilada(texto)
  if (canonicalJson(cena.fonte) !== canonicalJson(pedido.fonte))
    throw Error('A fonte do manifesto não corresponde à revisão pedida para publicação.')
  const recursos = new Map<string, RecursoDaPublicacao>()
  recursos.set(pedido.manifesto.digest, {
    ...pedido.manifesto,
    mime: MIME_DO_MANIFESTO,
    papel: 'manifesto',
  })
  for (const arquivo of cena.arquivos) {
    const anterior = recursos.get(arquivo.digest)
    if (anterior && (anterior.bytes !== arquivo.bytes || anterior.mime !== arquivo.mime))
      throw Error('O manifesto declara metadados incompatíveis para o mesmo conteúdo.')
    recursos.set(arquivo.digest, {
      digest: arquivo.digest,
      bytes: arquivo.bytes,
      mime: arquivo.mime,
      papel: 'recurso',
    })
  }
  return {
    pedido,
    cena,
    recursos: [...recursos.values()],
    digestDaOperacao: await digestDoPedidoDePublicacao(pedido),
  }
}
