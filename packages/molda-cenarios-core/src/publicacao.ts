import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { z } from 'zod'
import { FonteDaCompilacaoSchema } from './compilar/fonte'
import { type CenaCompilada, lerCenaCompilada, MAX_BYTES_DO_MANIFESTO } from './compilar/schema'
import { DigestCompiladoSchema } from './compilar/schema-arquivos'
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
    fonte: FonteDaCompilacaoSchema.extend({ cenario: z.uuid(), digest: DigestCompiladoSchema }),
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
export type MimeDaPublicacao = typeof MIME_DO_MANIFESTO | CenaCompilada['arquivos'][number]['mime']
export interface RecursoDaPublicacao {
  digest: string
  bytes: number
  mime: MimeDaPublicacao
  papel: 'manifesto' | 'recurso'
}
export interface SnapshotDePublicacao {
  pedido: PedidoDePublicacao
  cena: CenaCompilada
  recursos: readonly RecursoDaPublicacao[]
  digestDaOperacao: string
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
    digestDaOperacao: await sha256Hex(canonicalJson(pedido)),
  }
}
